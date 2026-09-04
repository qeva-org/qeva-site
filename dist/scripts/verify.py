#!/usr/bin/env python3
"""Deep offline verification for a QEVA 0.4 release tree."""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
OBJECTS = ROOT / "archive" / "objects"
REF = re.compile(r"^qeva:1:([a-z0-9][a-z0-9._-]*)@([1-9][0-9]*)$")
SCHEMA = json.loads((ROOT / "protocol" / "qeva-object.schema.json").read_text(encoding="utf-8"))
ERRORS: list[str] = []


def fail(message: str) -> None:
    ERRORS.append(message)


def canonical(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def exact(record: dict) -> str:
    return f"{record['id']}@{record['revision']}"


def typename(value) -> str:
    if value is None:
        return "null"
    if isinstance(value, bool):
        return "boolean"
    if isinstance(value, dict):
        return "object"
    if isinstance(value, list):
        return "array"
    if isinstance(value, str):
        return "string"
    if isinstance(value, int):
        return "integer"
    return "number" if isinstance(value, float) else type(value).__name__


def validate_schema(value, schema: dict, where: str) -> None:
    allowed = schema.get("type")
    if allowed:
        types = [allowed] if isinstance(allowed, str) else allowed
        if typename(value) not in types:
            fail(f"{where}: expected {types}, got {typename(value)}")
            return
    if "const" in schema and value != schema["const"]:
        fail(f"{where}: expected constant {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        fail(f"{where}: value {value!r} outside enum")
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            fail(f"{where}: string too short")
        if schema.get("pattern") and not re.fullmatch(schema["pattern"], value):
            fail(f"{where}: does not match {schema['pattern']}")
    if isinstance(value, int) and value < schema.get("minimum", value):
        fail(f"{where}: below minimum")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            fail(f"{where}: too few items")
        if schema.get("uniqueItems"):
            encoded = [json.dumps(item, sort_keys=True) for item in value]
            if len(encoded) != len(set(encoded)):
                fail(f"{where}: duplicate items")
        for index, item in enumerate(value):
            validate_schema(item, schema.get("items", {}), f"{where}[{index}]")
    if isinstance(value, dict):
        required = set(schema.get("required", []))
        missing = required - value.keys()
        if missing:
            fail(f"{where}: missing keys {sorted(missing)}")
        properties = schema.get("properties", {})
        if schema.get("additionalProperties") is False:
            extra = value.keys() - properties.keys()
            if extra:
                fail(f"{where}: unexpected keys {sorted(extra)}")
        for key, item in value.items():
            subschema = properties.get(key)
            if subschema:
                validate_schema(item, subschema, f"{where}.{key}")
            elif isinstance(schema.get("additionalProperties"), dict):
                validate_schema(item, schema["additionalProperties"], f"{where}.{key}")


def load_records():
    records = []
    for path in sorted(OBJECTS.glob("*.json")):
        try:
            record = json.loads(path.read_text(encoding="utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as exc:
            fail(f"{path.relative_to(ROOT)}: unreadable JSON: {exc}")
            continue
        validate_schema(record, SCHEMA, path.name)
        expected_name = f"{record.get('id', '').split(':')[-1]}.r{record.get('revision')}.json"
        if path.name != expected_name:
            fail(f"{path.name}: expected filename {expected_name}")
        records.append((path, record))
    return records


def verify_records(records):
    by_ref, by_slug = {}, defaultdict(list)
    for path, record in records:
        ref = exact(record)
        if ref in by_ref:
            fail(f"duplicate exact reference {ref}")
        by_ref[ref] = (path, record)
        by_slug[record["id"].split(":")[-1]].append((path, record))
    ref_fields = []
    for path, record in records:
        refs = [("dependency", value) for value in record["dependencies"]]
        refs += [("relation", value["target"]) for value in record["relations"]]
        refs += [("assumption", value["ref"]) for value in record["assumptions"] if value["ref"]]
        if record["context"]["framework_ref"]:
            refs.append(("framework", record["context"]["framework_ref"]))
        if record["supersedes"]:
            refs.append(("supersedes", record["supersedes"]))
        for kind, ref in refs:
            ref_fields.append(ref)
            if ref not in by_ref:
                fail(f"{path.name}: missing {kind} reference {ref}")
        artifact = record["verification"]["artifact"]
        if artifact and not (ROOT / artifact).is_file():
            fail(f"{path.name}: missing verification artifact {artifact}")
    for slug, items in by_slug.items():
        items.sort(key=lambda pair: pair[1]["revision"])
        revisions = [record["revision"] for _, record in items]
        if revisions != list(range(1, revisions[-1] + 1)):
            fail(f"{slug}: non-contiguous revisions {revisions}")
        for index, (_, record) in enumerate(items):
            expected = None if index == 0 else exact(items[index - 1][1])
            if record["supersedes"] != expected:
                fail(f"{exact(record)}: supersedes should be {expected!r}")

    visiting, visited = set(), set()
    def visit(ref: str, trail: list[str]):
        if ref in visiting:
            fail("logical dependency cycle: " + " -> ".join(trail + [ref]))
            return
        if ref in visited or ref not in by_ref:
            return
        visiting.add(ref)
        for dep in by_ref[ref][1]["dependencies"]:
            visit(dep, trail + [ref])
        visiting.remove(ref)
        visited.add(ref)
    for ref in by_ref:
        visit(ref, [])
    latest = {slug: max(items, key=lambda pair: pair[1]["revision"]) for slug, items in by_slug.items()}
    for slug, (_, record) in latest.items():
        for field in ("plain", "exact", "example", "caveat"):
            if not isinstance(record["content"].get(field), str) or not record["content"][field].strip():
                fail(f"{slug}: current record lacks a nonempty {field} layer")
    return by_ref, by_slug, latest


def verify_legacy():
    legacy = ROOT / "legacy" / "v0.3" / "archive" / "objects"
    for old in sorted(legacy.glob("*.json")):
        current = OBJECTS / old.name
        if not current.is_file() or current.read_bytes() != old.read_bytes():
            fail(f"legacy byte mismatch: {old.name}")


def verify_exports(records, latest):
    all_expected = b"".join(canonical(record) for _, record in sorted(records, key=lambda pair: exact(pair[1])))
    current_expected = b"".join(canonical(record) for _, record in sorted(latest.values(), key=lambda pair: exact(pair[1])))
    for name, expected in (("all.jsonl", all_expected), ("current.jsonl", current_expected)):
        path = ROOT / "archive" / name
        if not path.is_file() or path.read_bytes() != expected:
            fail(f"archive/{name}: does not match canonical records")
    rows = json.loads((ROOT / "archive" / "index.json").read_text(encoding="utf-8"))
    if len(rows) != len(records) or {row["ref"] for row in rows} != {exact(r) for _, r in records}:
        fail("archive/index.json: revision index mismatch")
    current_rows = json.loads((ROOT / "archive" / "current.json").read_text(encoding="utf-8"))
    if {row["ref"] for row in current_rows} != {exact(r) for _, r in latest.values()}:
        fail("archive/current.json: current index mismatch")


def verify_qualifications(by_ref):
    schema_path = ROOT / "protocol" / "qualification.schema.json"
    schema = json.loads(schema_path.read_text(encoding="utf-8"))
    rows, exacts = [], set()
    for path in sorted((ROOT / "archive" / "qualifications").glob("*.json")):
        item = json.loads(path.read_text(encoding="utf-8"))
        validate_schema(item, schema, path.name)
        ref = f"{item['id']}@{item['revision']}"
        if ref in exacts:
            fail(f"duplicate qualification {ref}")
        exacts.add(ref)
        if item["subject"] not in by_ref:
            fail(f"{path.name}: unknown qualification subject {item['subject']}")
        if item["artifact"] and not (ROOT / item["artifact"]).is_file():
            fail(f"{path.name}: missing qualification artifact {item['artifact']}")
        if item["supersedes"] and item["supersedes"] not in exacts:
            fail(f"{path.name}: unknown earlier qualification {item['supersedes']}")
        rows.append(item)
    expected = b"".join(canonical(item) for item in sorted(rows, key=lambda value: (value["id"], value["revision"])))
    index = ROOT / "archive" / "qualifications" / "index.jsonl"
    if not index.is_file() or index.read_bytes() != expected:
        fail("archive/qualifications/index.jsonl: canonical assertion stream mismatch")
    return rows


def verify_atlases(by_ref, latest):
    logical = json.loads((ROOT / "atlas" / "logical.json").read_text(encoding="utf-8"))
    concepts = logical["concepts"]
    if {item["id"] for item in concepts} != set(latest):
        fail("atlas/logical.json: does not contain every and only current object")
    expected_edges = {(REF.fullmatch(dep).group(1), concept["id"]) for concept in concepts for dep in concept["dependencies"] if REF.fullmatch(dep)}
    found_edges = {(edge["source"], edge["target"]) for edge in logical["edges"]}
    if expected_edges != found_edges:
        fail("atlas/logical.json: dependency edges drift from concepts")
    sources = json.loads((ROOT / "corpus" / "source-registry.json").read_text(encoding="utf-8"))
    source_ids = {item["id"] for item in sources["sources"]}
    history = json.loads((ROOT / "atlas" / "history.json").read_text(encoding="utf-8"))
    for item in history["milestones"]:
        for ref in item["qeva"]:
            if ref not in by_ref:
                fail(f"history milestone {item['title']!r}: missing QEVA ref {ref}")
        for source in item["source_refs"]:
            if source not in source_ids:
                fail(f"history milestone {item['title']!r}: missing source {source}")
    for dataset in ("fields.json", "frontiers.json"):
        value = json.loads((ROOT / "atlas" / dataset).read_text(encoding="utf-8"))
        key = "fields" if dataset.startswith("fields") else "frontiers"
        for item in value[key]:
            refs = item.get("qeva", [])
            refs = [refs] if isinstance(refs, str) else refs
            for ref in refs:
                if not ref.startswith("qeva:"):
                    record = latest.get(ref)
                    ref = exact(record[1]) if record else ref
                if ref not in by_ref:
                    fail(f"atlas/{dataset}: missing QEVA ref {ref}")


def verify_browser_data(latest, qualifications):
    source = (ROOT / "assets" / "qeva-data.js").read_text(encoding="utf-8")
    prefix, suffix = "window.QEVA_DATA=", ";\n"
    if not source.startswith(prefix) or not source.endswith(suffix):
        fail("assets/qeva-data.js: invalid deterministic wrapper")
        return
    data = json.loads(source[len(prefix):-len(suffix)])
    if {item["id"] for item in data["objects"]} != set(latest):
        fail("assets/qeva-data.js: object payload drift")
    release = json.loads((ROOT / "RELEASE.json").read_text(encoding="utf-8"))
    if data["release"] != release:
        fail("assets/qeva-data.js: release metadata drift")
    if release["current_objects"] != len(latest):
        fail("RELEASE.json: current object count drift")
    if release["all_revisions"] != len(list(OBJECTS.glob("*.json"))):
        fail("RELEASE.json: revision count drift")
    if release["qualification_assertions"] != len(qualifications):
        fail("RELEASE.json: qualification count drift")
    release_schema = json.loads((ROOT / "protocol" / "release-envelope.schema.json").read_text(encoding="utf-8"))
    validate_schema(release, release_schema, "RELEASE.json")


def at_path(term, path):
    for index in path:
        if not isinstance(term, list) or index >= len(term):
            raise ValueError("invalid certificate path")
        term = term[index]
    return term


def replace_path(term, path, replacement):
    if not path:
        return replacement
    clone = json.loads(json.dumps(term))
    parent = clone
    for index in path[:-1]:
        parent = parent[index]
    parent[path[-1]] = replacement
    return clone


def verify_certificate():
    path = ROOT / "certificates" / "peano-kernel-0" / "one-plus-one.json"
    cert = json.loads(path.read_text(encoding="utf-8"))
    term = cert["start"]
    for step in cert["steps"]:
        target = at_path(term, step["path"])
        if step["rule"] == "add-successor" and isinstance(target, list) and len(target) == 3 and target[0] == "add" and isinstance(target[2], list) and target[2][0] == "S":
            replacement = ["S", ["add", target[1], target[2][1]]]
        elif step["rule"] == "add-zero" and isinstance(target, list) and len(target) == 3 and target[0] == "add" and target[2] == "0":
            replacement = target[1]
        else:
            fail(f"certificate: rule {step['rule']} does not match term at {step['path']}")
            return
        term = replace_path(term, step["path"], replacement)
    if term != cert["expected"]:
        fail(f"certificate: expected {cert['expected']!r}, got {term!r}")


def verify_digest_file(base: Path, manifest: Path, expected_files: set[str] | None = None):
    algorithm = "sha512" if "sha512" in manifest.name else "sha256"
    listed = set()
    for number, line in enumerate(manifest.read_text(encoding="utf-8").splitlines(), 1):
        match = re.fullmatch(r"([0-9a-f]+)  (.+)", line)
        if not match:
            fail(f"{manifest.relative_to(ROOT)}:{number}: invalid manifest row")
            continue
        expected, rel = match.groups()
        listed.add(rel)
        path = base / rel
        if not path.is_file():
            fail(f"{manifest.relative_to(ROOT)}: missing {rel}")
        elif hashlib.new(algorithm, path.read_bytes()).hexdigest() != expected:
            fail(f"{manifest.relative_to(ROOT)}: digest mismatch {rel}")
    if expected_files is not None and listed != expected_files:
        fail(f"{manifest.relative_to(ROOT)}: file set mismatch")


def verify_manifests():
    expected = {path.relative_to(ROOT).as_posix() for path in ROOT.rglob("*") if path.is_file() and path.relative_to(ROOT).as_posix() not in {"MANIFEST.sha256", "MANIFEST.sha512"} and "__pycache__" not in path.parts}
    verify_digest_file(ROOT, ROOT / "MANIFEST.sha256", expected)
    verify_digest_file(ROOT, ROOT / "MANIFEST.sha512", expected)
    bag = ROOT / "snapshot" / "QEVA-BAG"
    payload = {path.relative_to(bag).as_posix() for path in (bag / "data").rglob("*") if path.is_file()}
    verify_digest_file(bag, bag / "manifest-sha256.txt", payload)
    verify_digest_file(bag, bag / "manifest-sha512.txt", payload)
    for name in ("tagmanifest-sha256.txt", "tagmanifest-sha512.txt"):
        verify_digest_file(bag, bag / name)


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.links: list[tuple[str, str]] = []
        self.ids: list[str] = []
        self.has_title = False
        self.has_viewport = False
        self.has_description = False
        self.lang = None
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag == "html":
            self.lang = values.get("lang")
        if tag == "title":
            self.has_title = True
        if tag == "meta" and values.get("name") == "viewport":
            self.has_viewport = True
        if tag == "meta" and values.get("name") == "description":
            self.has_description = True
        if values.get("id"):
            self.ids.append(values["id"])
        for attr in ("href", "src"):
            if values.get(attr):
                self.links.append((f"{tag}.{attr}", values[attr]))


def local_target(page: Path, value: str) -> Path | None:
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or value.startswith(("mailto:", "tel:", "data:", "javascript:", "#")):
        return None
    raw = unquote(parsed.path)
    target = (ROOT / raw.lstrip("/")) if raw.startswith("/") else (page.parent / raw)
    if raw.endswith("/") or target.is_dir():
        target = target / "index.html"
    return target.resolve()


def verify_html():
    html_files = sorted(path for path in ROOT.rglob("*.html") if "legacy" not in path.parts)
    for path in html_files:
        parser = PageParser()
        try:
            parser.feed(path.read_text(encoding="utf-8"))
        except Exception as exc:
            fail(f"{path.relative_to(ROOT)}: HTML parse error {exc}")
            continue
        rel = path.relative_to(ROOT)
        if not (parser.has_title and parser.has_viewport and parser.has_description and parser.lang == "en"):
            fail(f"{rel}: missing title, description, viewport, or lang=en")
        if len(parser.ids) != len(set(parser.ids)):
            fail(f"{rel}: duplicate element IDs")
        for attr, value in parser.links:
            target = local_target(path, value)
            if target is not None and not target.is_file():
                fail(f"{rel}: broken {attr}={value!r}")
            if attr in {"script.src", "link.href", "img.src"} and urlsplit(value).scheme:
                fail(f"{rel}: external runtime dependency {value}")
    if not html_files:
        fail("no HTML files found")


def verify_source_and_syntax():
    for path in sorted((ROOT / "protocol").glob("*.schema.json")) + sorted((ROOT / "corpus" / "schemas").glob("*.schema.json")):
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if value.get("$schema") != "https://json-schema.org/draft/2020-12/schema" or not value.get("$id"):
                fail(f"{path.relative_to(ROOT)}: missing draft or stable schema id")
        except json.JSONDecodeError as exc:
            fail(f"{path.relative_to(ROOT)}: schema JSON error {exc}")
    for path in sorted((ROOT / "scripts").glob("*.py")):
        try:
            compile(path.read_text(encoding="utf-8"), str(path), "exec")
        except SyntaxError as exc:
            fail(f"{path.relative_to(ROOT)}: Python syntax {exc}")
    for path in sorted((ROOT / "assets").glob("*.js")):
        if path.name == "qeva-data.js":
            continue
        text = path.read_text(encoding="utf-8")
        if "http://" in text or "https://" in text:
            fail(f"{path.relative_to(ROOT)}: unexpected network URL")
    for _, record in load_records():
        if record["revision"] > 1 and "QEVA Protocol 0.1" in json.dumps(record):
            fail(f"{exact(record)}: stale protocol label")


def main() -> None:
    records = load_records()
    by_ref, _, latest = verify_records(records)
    verify_legacy()
    verify_exports(records, latest)
    qualifications = verify_qualifications(by_ref)
    verify_atlases(by_ref, latest)
    verify_browser_data(latest, qualifications)
    verify_certificate()
    verify_html()
    verify_source_and_syntax()
    verify_manifests()
    if ERRORS:
        print(f"QEVA verification FAILED ({len(ERRORS)} issues)", file=sys.stderr)
        for error in ERRORS:
            print("- " + error, file=sys.stderr)
        raise SystemExit(1)
    metadata = json.loads((ROOT / "RELEASE.json").read_text(encoding="utf-8"))
    pages = sum(1 for path in ROOT.rglob("*.html") if "legacy" not in path.parts)
    print(f"QEVA {metadata['release']}: {len(latest)} current objects; {len(records)} exact revisions; {pages} HTML pages")
    print("schema · exact closure · revision chains · acyclic dependencies · legacy bytes PASS")
    print("exports · atlases · history sources · browser data · proof replay PASS")
    print("local links · offline runtime · SHA-256/SHA-512 · BagIt PASS")


if __name__ == "__main__":
    main()
