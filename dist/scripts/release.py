#!/usr/bin/env python3
"""Regenerate QEVA projections, experiment indexes, snapshots, and manifests.

Canonical object, experiment, analyzer, and qualification revisions are inputs.
This script never edits those immutable inputs.
"""
from __future__ import annotations

import hashlib
import html
import json
import math
import re
import shutil
import sys
import zipfile
from collections import defaultdict
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

SCRIPT = Path(__file__).resolve()
PROJECT = SCRIPT.parents[1]
ROOT = SCRIPT.parents[1]
sys.dont_write_bytecode = True
sys.path.insert(0, str(PROJECT))

from seed_data import (  # noqa: E402
    FIELDS, FRONTIERS, HISTORY, OLD_LANES, RELEASE, RELEASE_DATE, SOURCES, SPECS,
)

OBJECTS = ROOT / "archive" / "objects"
QUALIFICATIONS = ROOT / "archive" / "qualifications"
ARCHIVE = ROOT / "archive"
EXPERIMENTS = ROOT / "experiments" / "records"
ANALYZERS = ROOT / "analyzers" / "manifests"
REF_RE = re.compile(r"^(qeva:1:([a-z0-9][a-z0-9._-]*))@([1-9][0-9]*)$")
EXPERIMENT_RE = re.compile(r"^(qeva-experiment:1:([a-z0-9][a-z0-9._-]*))@([1-9][0-9]*)$")

RELATION_KINDS = {
    "addresses": "conceptually-explains", "affects": "conceptually-explains",
    "appears-in": "often-studied-with", "builds": "definition-uses",
    "can-be": "conceptually-explains", "can-enable": "conceptually-explains",
    "candidate-lens": "hypothesized-connection", "classified-by": "conceptually-explains",
    "classifies": "conceptually-explains", "component-of-some-definitions": "conceptually-explains",
    "constructed-by": "definition-uses", "contrasts": "analogous-to",
    "contrasts-with": "analogous-to", "distinguishes": "conceptually-explains",
    "example-specialization": "specializes", "filtered-by": "conceptually-explains",
    "generates-problem": "conceptually-explains", "induces": "derives",
    "instance-of": "specializes", "interacts-with": "often-studied-with",
    "motivates": "conceptually-explains", "open-related-lens": "hypothesized-connection",
    "opposes": "analogous-to", "paired-with": "often-studied-with",
    "related-to": "often-studied-with", "representation-related": "analogous-to",
    "special-case": "specializes", "structural": "conceptually-explains",
    "supports": "conceptually-explains", "used-in": "often-studied-with",
    "uses": "definition-uses",
}

CORRIDOR_LABS = {
    "distinction": "modular-equivalence", "identity": "modular-equivalence",
    "relation": "finite-map-cycles", "grouping": "modular-equivalence",
    "equivalence": "modular-equivalence", "order": "local-global-search",
    "composition": "finite-map-cycles", "symmetry": "modular-equivalence",
    "invariant": "finite-map-cycles",
    "parity": "collatz-orbit", "sequence": "logistic-sensitivity",
    "recurrence": "logistic-sensitivity", "periodicity": "finite-map-cycles",
    "nonlinearity": "logistic-sensitivity",
    "fixed-point": "finite-map-cycles", "stability": "logistic-sensitivity",
    "sensitivity": "logistic-sensitivity", "attractor": "finite-map-cycles",
    "coarse-graining": "coarse-grained-signal", "hierarchy": "coarse-grained-signal",
    "optimization": "local-global-search", "local-global": "local-global-search",
    "exploration-exploitation": "local-global-search", "collatz-map": "collatz-orbit",
    "collatz-conjecture": "collatz-orbit", "signal-noise": "coarse-grained-signal",
}

PUBLIC_EXCLUDED_PREFIXES = (
    "corpus/runs/", "corpus/private/", "corpus/quarantine/", "runtime/",
)

SNAPSHOT_INCLUDE = (
    "RELEASE.json", "README.md", "BAG-RECOVERY.txt", "ARCHITECTURE.md", "CONSTITUTION.md",
    "ROADMAP.md", "SOURCE_POLICY.md", "CONTRIBUTING.md", "seed_data.py",
    "archive", "protocol", "experiments", "analyzers", "certificates",
    "atlas", "corpus/README.md", "corpus/schemas", "corpus/source-registry.json",
    "harvester", "LICENSES", "legacy",
    "docs/QEVA_MASTER_TODO_v2_DIGITAL_CIVILIZATION.md",
    "assets/mechanism-engine.js", "scripts/verify.py", "scripts/verify_canonical.py",
    "scripts/publish_v05.py",
    "scripts/test_engine.mjs", "scripts/test_harvester.py", "scripts/harvest.py", "tests",
)


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def write_json(path: Path, value) -> None:
    write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def strict_json_loads(text: str):
    def pairs(items):
        value = {}
        for key, item in items:
            if key in value:
                raise ValueError(f"duplicate JSON object name {key!r}")
            value[key] = item
        return value

    def constant(value: str):
        raise ValueError(f"non-finite JSON number {value}")

    return json.loads(text, object_pairs_hook=pairs, parse_constant=constant)


def _ecmascript_number(value: float) -> str:
    """Serialize a finite float in the RFC 8785 / ECMAScript JSON form."""
    if not math.isfinite(value):
        raise ValueError("non-finite numbers are forbidden in canonical JSON")
    if value == 0:
        return "0"
    negative = value < 0
    magnitude = -value if negative else value
    shortest = repr(magnitude).lower()
    if 1e-6 <= magnitude < 1e21:
        if "e" in shortest:
            coefficient, exponent_text = shortest.split("e")
            exponent = int(exponent_text)
            digits = coefficient.replace(".", "")
            decimal_at = (coefficient.index(".") if "." in coefficient else len(coefficient)) + exponent
            if decimal_at <= 0:
                shortest = "0." + "0" * (-decimal_at) + digits
            elif decimal_at >= len(digits):
                shortest = digits + "0" * (decimal_at - len(digits))
            else:
                shortest = digits[:decimal_at] + "." + digits[decimal_at:]
        if "." in shortest:
            shortest = shortest.rstrip("0").rstrip(".")
    else:
        if "e" not in shortest:
            shortest = format(magnitude, ".15e")
        coefficient, exponent_text = shortest.split("e")
        coefficient = coefficient.rstrip("0").rstrip(".")
        exponent = int(exponent_text)
        shortest = f"{coefficient}e{'+' if exponent >= 0 else ''}{exponent}"
    return ("-" if negative else "") + shortest


def _canonical_text(value) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, str):
        if any(0xD800 <= ord(char) <= 0xDFFF for char in value):
            raise ValueError("lone Unicode surrogates are forbidden in canonical JSON")
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, int):
        if abs(value) > 9007199254740991:
            raise ValueError("integers outside the I-JSON safe range are forbidden")
        return str(value)
    if isinstance(value, float):
        if value.is_integer() and abs(value) > 9007199254740991:
            raise ValueError("integer-valued binary64 numbers outside the I-JSON safe range are forbidden")
        return _ecmascript_number(value)
    if isinstance(value, list):
        return "[" + ",".join(_canonical_text(item) for item in value) + "]"
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise TypeError("canonical JSON object keys must be strings")
        if any(any(0xD800 <= ord(char) <= 0xDFFF for char in key) for key in value):
            raise ValueError("lone Unicode surrogates are forbidden in canonical JSON object names")
        # RFC 8785 follows ECMAScript property ordering: UTF-16 code units.
        keys = sorted(value, key=lambda key: key.encode("utf-16-be", "strict"))
        return "{" + ",".join(f"{_canonical_text(key)}:{_canonical_text(value[key])}" for key in keys) + "}"
    raise TypeError(f"unsupported canonical JSON value: {type(value).__name__}")


def canonical(value) -> bytes:
    return (_canonical_text(value) + "\n").encode("utf-8")


def digest(data: bytes, algorithm: str = "sha256") -> str:
    return hashlib.new(algorithm, data).hexdigest()


def exact(record: dict) -> str:
    return f"{record['id']}@{record['revision']}"


def slug_for(record: dict) -> str:
    return record["id"].split(":")[-1]


def slug_for_experiment(record: dict) -> str:
    return record["id"].split(":")[-1]


def load_records():
    records = []
    for path in sorted(OBJECTS.glob("*.json")):
        records.append((path, strict_json_loads(path.read_text(encoding="utf-8"))))
    if not records:
        raise SystemExit("release: no archive objects")
    return records


def load_json_records(directory: Path):
    rows = []
    for path in sorted(directory.glob("*.json")):
        rows.append((path, strict_json_loads(path.read_text(encoding="utf-8"))))
    if not rows:
        raise SystemExit(f"release: no records in {directory.relative_to(ROOT)}")
    return rows


def preflight_snapshot_sources() -> None:
    missing = [rel for rel in SNAPSHOT_INCLUDE if not (ROOT / rel).exists()]
    if missing:
        raise SystemExit("release: snapshot sources missing before build: " + ", ".join(missing))


def current_revision_records(records, namespace: str):
    """Validate immutable revision chains and return exactly one latest record per id."""
    pattern = re.compile(rf"^{re.escape(namespace)}:1:[a-z0-9][a-z0-9._-]*$")
    grouped = defaultdict(list)
    seen_refs = set()
    for path, record in records:
        record_id = record.get("id")
        revision = record.get("revision")
        if not isinstance(record_id, str) or not pattern.fullmatch(record_id):
            raise SystemExit(f"release: invalid {namespace} id in {path.relative_to(ROOT)}")
        if not isinstance(revision, int) or isinstance(revision, bool) or revision < 1 or revision > 1_000_000:
            raise SystemExit(f"release: invalid revision in {path.relative_to(ROOT)}")
        slug = record_id.rsplit(":", 1)[-1]
        if path.name != f"{slug}.r{revision}.json":
            raise SystemExit(f"release: filename does not match exact revision: {path.relative_to(ROOT)}")
        ref = f"{record_id}@{revision}"
        if ref in seen_refs:
            raise SystemExit(f"release: duplicate exact revision {ref}")
        seen_refs.add(ref)
        grouped[record_id].append((path, record))
    current = []
    for record_id, items in sorted(grouped.items()):
        items.sort(key=lambda item: item[1]["revision"])
        revisions = [item[1]["revision"] for item in items]
        if any(record["revision"] != expected for expected, (_, record) in enumerate(items, start=1)):
            raise SystemExit(f"release: non-contiguous revision chain for {record_id}: {revisions}")
        for index, (_, record) in enumerate(items):
            expected = None if index == 0 else f"{record_id}@{index}"
            if record.get("supersedes") != expected:
                raise SystemExit(f"release: invalid supersedes link for {record_id}@{index + 1}")
        current.append(items[-1])
    return current


def latest_records(records):
    latest = {}
    for path, record in records:
        slug = slug_for(record)
        if slug not in latest or record["revision"] > latest[slug][1]["revision"]:
            latest[slug] = (path, record)
    return latest


def page(title: str, description: str, body: str, prefix: str, current: str = "", scripts=()) -> str:
    nav = [
        ("explore", "Explore", ""), ("lab", "Lab", "lab/"),
        ("history", "History", "history/"), ("search", "Search", "search/"),
    ]
    links = "".join(
        f'<a href="{prefix}{href}"' + (' aria-current="page"' if key == current else '') + f'>{label}</a>'
        for key, label, href in nav
    )
    script_tags = "".join(f'<script src="{prefix}{src}"></script>' for src in scripts)
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'none'"><meta name="description" content="{html.escape(description, quote=True)}"><title>{html.escape(title)}</title><link rel="icon" href="{prefix}assets/qeva-logo.png" type="image/png"><link rel="stylesheet" href="{prefix}assets/site.css"></head>
<body><a class="skip" href="#main">Skip to content</a><header class="mast shell"><a class="brand" href="{prefix}" aria-label="QEVA home"><img src="{prefix}assets/qeva-logo.png" width="34" height="34" alt=""><span>QEVA</span></a><nav aria-label="Primary">{links}</nav></header><main id="main">{body}</main><footer class="footer shell"><div><strong>QEVA</strong><span>Definitions, experiments, and sources.</span></div><nav aria-label="Project"><a href="{prefix}map/">Map</a><a href="{prefix}archive/">Archive</a><a href="{prefix}protocol/">Protocol</a><a href="{prefix}about/">About</a></nav></footer>{script_tags}</body></html>'''


def ref_link(ref: str, prefix: str, titles: dict) -> str:
    match = REF_RE.fullmatch(ref)
    if not match:
        return html.escape(ref)
    slug, revision = match.group(2), match.group(3)
    label = titles.get(slug, slug.replace("-", " "))
    return f'<a href="{prefix}objects/{slug}/r{revision}/">{html.escape(label)} <code>@{revision}</code></a>'


def dependency_kind(record: dict) -> str:
    # The legacy dependency array does not encode proof role. Preserve it as a
    # scoped use candidate; a qualification may later promote an individual
    # edge to formally-requires or proof-uses.
    return "definition-uses"


def normalized_relation_kind(kind: str) -> str:
    if kind in {
        "formally-requires", "definition-uses", "proof-uses", "derives", "equivalent-to",
        "isomorphic-to", "generalizes", "specializes", "contradicts", "refutes",
        "conceptually-explains", "pedagogical-prerequisite", "historically-influenced",
        "independently-discovered", "analogous-to", "often-studied-with",
        "computationally-suggests", "hypothesized-connection", "implemented-by",
        "instantiated-by-experiment",
    }:
        return kind
    if kind in RELATION_KINDS:
        return RELATION_KINDS[kind]
    raise ValueError(f"unmapped legacy relation kind: {kind}")


def object_body(record: dict, path: Path, records_by_slug: dict, used_by: dict,
                history_by_ref: dict, experiment_by_slug: dict, prefix: str,
                revision_view: bool) -> str:
    slug = slug_for(record)
    titles = {k: v[-1][1]["title"] for k, v in records_by_slug.items()}
    dependencies = record["dependencies"]
    dep_kind = dependency_kind(record)
    dependency_html = "".join(
        f'<li><span>{dep_kind} · candidate migration</span>{ref_link(ref, prefix, titles)}</li>' for ref in dependencies
    ) or "<li>Declared framework boundary: no migrated prerequisite candidate in this revision.</li>"
    relation_html = "".join(
        f'<li><span>{html.escape(normalized_relation_kind(rel["kind"]))} · candidate migration</span>{ref_link(rel["target"], prefix, titles)}' +
        (f'<small>{html.escape(rel["note"])}</small>' if rel.get("note") else '') + "</li>"
        for rel in record["relations"]
    ) or "<li>No additional migrated relation candidate appears in this revision.</li>"
    used_html = "".join(f"<li>{ref_link(ref, prefix, titles)}</li>" for ref in used_by.get(exact(record), [])) or "<li>No current object directly depends on this exact revision.</li>"
    assumptions = "".join(
        f'<li>{html.escape(a["text"])}' + (f' · {ref_link(a["ref"], prefix, titles)}' if a.get("ref") else '') + "</li>"
        for a in record["assumptions"]
    ) or "<li>No assumptions declared.</li>"
    revisions = records_by_slug[slug]
    revision_html = "".join(
        f'<a class="revision-chip" href="{prefix}objects/{slug}/r{item[1]["revision"]}/"' +
        (' aria-current="page"' if revision_view and item[1]["revision"] == record["revision"] else '') +
        (f' aria-label="revision {item[1]["revision"]}, current revision"' if item == revisions[-1] else '') +
        f'>r{item[1]["revision"]}{" · current" if item == revisions[-1] else ""}</a>' for item in revisions
    )
    artifact = record["verification"].get("artifact")
    artifact_html = f'<p><a href="{prefix}{html.escape(artifact)}">Open verification artifact</a></p>' if artifact else ""
    caveat = record["content"].get("caveat") or "No caveat recorded in this revision."
    example = record["content"].get("example") or "No example recorded in this revision."
    canonical_link = f'{prefix}archive/objects/{path.name}'
    status_class = "checked" if record["verification"]["level"] == "machine-checked" else "editorial"
    banner = '<p class="revision-note">You are viewing a historical revision. The stable object page points to the current revision.</p>' if revision_view and record != revisions[-1][1] else ""
    lab_slug = CORRIDOR_LABS.get(slug)
    lab_action = f'<a class="button" href="{prefix}lab/?experiment={html.escape(lab_slug, quote=True)}">Run a related experiment</a>' if lab_slug and lab_slug in experiment_by_slug else ''
    actions = f'''<div class="object-actions">{lab_action}<a class="button ghost" href="{prefix}map/?focus={html.escape(slug, quote=True)}">Trace this concept</a><a class="button ghost" href="{prefix}search/?q={html.escape(record['title'], quote=True)}">Search connections</a></div>'''
    history_rows = history_by_ref.get(exact(record), [])
    history_html = "".join(
        f'<li><a href="{prefix}history/?q={html.escape(item["title"], quote=True)}">{html.escape(item["date"])} · {html.escape(item["title"])}</a></li>'
        for item in history_rows[:6]
    ) or "<li>No source-grounded historical assertion is linked to this exact revision yet.</li>"
    qualification_note = "This is a release summary, not an independent qualification assertion." if record["verification"]["level"] == "editorial" else "See the linked artifact and append-only qualification stream."
    return f'''<div class="shell object-shell"><nav class="crumb" aria-label="Breadcrumb"><a href="{prefix}archive/">Archive</a><span>/</span><a href="{prefix}objects/{slug}/">{html.escape(record["title"])}</a><span>/ r{record["revision"]}</span></nav>{banner}
<header class="object-head"><p class="kicker">{html.escape(record["kind"].upper())} · {html.escape(exact(record))}</p><h1>{html.escape(record["title"])}</h1><p class="object-summary">{html.escape(record["summary"])}</p><div class="status-row"><span class="status {status_class}">{html.escape(record["verification"]["level"])}</span><span>{' · '.join(map(html.escape, record['domains']))}</span></div>{actions}</header>
<div class="object-grid"><article class="object-main">
<section><p class="level-label">PLAIN</p><h2>The idea</h2><p class="large-copy">{html.escape(record["content"]["plain"])}</p></section>
<section class="formal"><p class="level-label">EXACT</p><h2>The compact statement</h2><p>{html.escape(record["content"]["exact"])}</p></section>
<section><div class="split"><div><h2 class="level-label">Example</h2><p>{html.escape(example)}</p></div><div><h2 class="level-label">Boundary / caveat</h2><p>{html.escape(caveat)}</p></div></div></section>
<section><h2 class="level-label">Assumptions</h2><ul class="clean-list">{assumptions}</ul></section>
<section><h2 class="level-label">Historical links</h2><ul class="clean-list">{history_html}</ul></section>
<section><h2 class="level-label">Provenance</h2><p>{html.escape(record["provenance"]["source_note"] or "No source note.")}</p><p class="micro">Created {html.escape(record["provenance"]["created"])} · {html.escape(record["provenance"]["creator"])} · {html.escape(record["provenance"]["license"])}</p></section>
</article><aside class="object-side" aria-label="Object structure"><section><h2 class="level-label">Context</h2><p>{html.escape(record["context"]["framework"] or "Context-specific")}</p>{ref_link(record["context"]["framework_ref"], prefix, titles) if record["context"].get("framework_ref") else '<span class="micro">This revision names a textual framework boundary but does not pin a framework object.</span>'}</section><section><h2 class="level-label">Prerequisite candidates</h2><p class="micro">Migrated from legacy dependency fields; not yet a qualified proof-role assertion.</p><ul class="relation-list">{dependency_html}</ul></section><section><h2 class="level-label">Current uses</h2><ul class="link-list">{used_html}</ul></section><section><h2 class="level-label">Additional relation candidates</h2><ul class="relation-list">{relation_html}</ul></section><section><h2 class="level-label">Evidence state</h2><p>{html.escape(record["verification"]["method"])}</p><p class="micro">{html.escape(qualification_note)}</p>{artifact_html}</section><section><h2 class="level-label">Revisions and data</h2><div class="revision-row">{revision_html}</div><p><a href="{canonical_link}">Canonical JSON</a></p></section></aside></div></div>'''


def render_objects(records, latest, history, experiments):
    records_by_slug = defaultdict(list)
    for item in records:
        records_by_slug[slug_for(item[1])].append(item)
    for items in records_by_slug.values():
        items.sort(key=lambda item: item[1]["revision"])
    used_by = defaultdict(list)
    for _, record in latest.values():
        for dep in record["dependencies"]:
            used_by[dep].append(exact(record))
    history_by_ref = defaultdict(list)
    for item in history["milestones"]:
        for ref in item["qeva"]:
            history_by_ref[ref].append(item)
    experiment_by_slug = {slug_for_experiment(record): record for _, record in experiments}
    for slug, items in records_by_slug.items():
        current_path, current = items[-1]
        stable_body = object_body(current, current_path, records_by_slug, used_by, history_by_ref, experiment_by_slug, "../../", False)
        write_text(ROOT / "objects" / slug / "index.html", page(f"{current['title']} — QEVA", current["summary"], stable_body, "../../"))
        for path, record in items:
            rev_body = object_body(record, path, records_by_slug, used_by, history_by_ref, experiment_by_slug, "../../../", True)
            write_text(ROOT / "objects" / slug / f"r{record['revision']}" / "index.html", page(f"{record['title']} r{record['revision']} — QEVA", record["summary"], rev_body, "../../../"))
    return records_by_slug, used_by


def relation_record(source: str, target: str, layer: str, kind: str, basis: str,
                    context: str | None = None, status: str = "asserted") -> dict:
    direction = "symmetric" if kind in {"equivalent-to", "isomorphic-to", "analogous-to", "often-studied-with"} else "directed"
    body = {
        "relation_version": "0.2", "source": source, "target": target,
        "layer": layer, "kind": kind, "direction": direction,
        "context": context, "basis": basis, "status": status,
        "asserted_by": "QEVA 0.5 relation migration", "asserted": RELEASE_DATE,
    }
    return {"id": "qeva-relation:sha256:" + digest(canonical(body)), **body}


def build_atlas(records, latest, used_by, experiments):
    specs = {spec["slug"]: spec for spec in SPECS}
    by_ref = {exact(record): record for _, record in records}
    concepts = []
    for slug, (path, record) in sorted(latest.items(), key=lambda item: item[1][1]["title"].casefold()):
        if slug in specs:
            lane, stage, question = specs[slug]["lane"], specs[slug]["stage"], specs[slug]["question"]
        else:
            lane, stage = OLD_LANES[slug]
            question = record["summary"]
        concepts.append({
            "id": slug, "title": record["title"], "kind": record["kind"], "lane": lane,
            "stage": stage, "qeva": exact(record), "plain": record["content"]["plain"],
            "question": question, "dependencies": record["dependencies"],
            "used_by": sorted(used_by.get(exact(record), [])),
            "verification": record["verification"]["level"],
        })
    edges, relations = [], []
    for concept in concepts:
        for dep in concept["dependencies"]:
            match = REF_RE.fullmatch(dep)
            if match:
                source_record = latest[concept["id"]][1]
                kind = dependency_kind(source_record)
                relations.append(relation_record(
                    exact(source_record), dep, "logical", kind,
                    "Candidate migration from the exact dependency array of the source object; the legacy field did not encode formal proof role.",
                    source_record["context"].get("framework"),
                    status="candidate",
                ))
                edges.append({
                    "source": concept["id"], "target": match.group(2),
                    "relation": kind, "strength": "candidate",
                    "layout_from": match.group(2), "layout_to": concept["id"],
                })
        source_record = latest[concept["id"]][1]
        for raw in source_record["relations"]:
            kind = normalized_relation_kind(raw["kind"])
            layer = "logical" if kind in {"definition-uses", "proof-uses", "derives", "equivalent-to", "isomorphic-to", "generalizes", "specializes", "contradicts", "refutes"} else "pedagogical"
            relations.append(relation_record(
                exact(source_record), raw["target"], layer, kind,
                (raw.get("note") or "No explanatory note was supplied.") + f" Candidate vocabulary migration from legacy kind {raw['kind']!r}.",
                source_record["context"].get("framework"),
                status="candidate",
            ))
    for _, experiment in experiments:
        experiment_ref = f"{experiment['id']}@{experiment['revision']}"
        for object_ref in experiment["related_objects"]:
            if object_ref not in by_ref:
                raise SystemExit(f"experiment {experiment_ref} references missing object {object_ref}")
            relations.append(relation_record(
                object_ref, experiment_ref, "computational", "instantiated-by-experiment",
                "The experiment declares this exact mathematical object as part of its interpretation.",
                experiment["family"],
            ))
    relations.sort(key=lambda item: item["id"])
    write_text(ROOT / "atlas" / "relations.jsonl", b"".join(canonical(item) for item in relations).decode("utf-8"))
    atlas = {"release": RELEASE, "scope": "current exact revisions; legacy logical edges remain visibly candidate until qualified", "concepts": concepts, "edges": edges}
    write_json(ROOT / "atlas" / "logical.json", atlas)
    write_json(ROOT / "atlas" / "fields.json", {"release": RELEASE, "scope": "high-level navigational field map; not an ontology of unique roots", "fields": FIELDS})
    write_json(ROOT / "atlas" / "frontiers.json", {"release": RELEASE, "scope": "illustrative open-problem index, not a complete ranking", "frontiers": FRONTIERS})
    return atlas, relations


def build_history(latest):
    out = []
    for year, date, branch, region, title, people, note, qeva_slugs, source_refs in HISTORY:
        qeva_refs = []
        for slug in qeva_slugs:
            if slug not in latest:
                raise SystemExit(f"history references unknown QEVA object: {slug}")
            qeva_refs.append(exact(latest[slug][1]))
        out.append({"year": year, "date": date, "branch": branch, "region": region, "title": title, "people": people, "note": note, "qeva": qeva_refs, "source_refs": source_refs, "confidence": "orientation-level"})
    history = {"release": RELEASE, "scope": "global orientation seed; historical relations are not logical dependencies", "milestones": out}
    write_json(ROOT / "atlas" / "history.json", history)
    return history


def render_history_page(history, latest):
    events = []
    for item in history["milestones"]:
        qeva_links = []
        for ref in item["qeva"]:
            match = REF_RE.fullmatch(ref)
            if match:
                slug = match.group(2)
                qeva_links.append(f'<a href="../objects/{slug}/">{html.escape(latest[slug][1]["title"])}</a>')
        source_links = [f'<a href="../sources/#source-{html.escape(source)}">{html.escape(source)}</a>' for source in item["source_refs"]]
        searchable = " ".join([item["date"], item["branch"], item["region"], item["title"], item["people"], item["note"]]).lower()
        events.append(f'''<article class="event" data-event data-branch="{html.escape(item['branch'])}" data-search="{html.escape(searchable, quote=True)}"><time>{html.escape(item['date'])}</time><p class="event-meta">{html.escape(item['branch'])} · {html.escape(item['region'])}</p><h2>{html.escape(item['title'])}</h2><p><strong>{html.escape(item['people'])}</strong></p><p>{html.escape(item['note'])}</p><p class="event-links">Map: {' · '.join(qeva_links) if qeva_links else 'not yet linked'}<br>Orientation sources: {' · '.join(source_links)}</p></article>''')
    body = f'''<div class="page-head shell"><p class="kicker">HISTORICAL ANCESTRY · ORIENTATION SEED</p><h1>Mathematics through time</h1><p>This incomplete timeline keeps historical influence separate from logical dependence. Dates can be approximate, attribution can be disputed, and named people never stand in for whole traditions.</p></div><section class="shell"><div class="history-tools"><label>Search history<input id="history-q" type="search" placeholder="calculus, India, logic, proof…"></label></div><fieldset id="branch-controls" class="branch-controls"><legend>Filter by branch</legend></fieldset><p class="micro">The bars count events represented here. They do not measure how much mathematics a culture or field produced.</p><div id="growth" class="growth" aria-label="Visible release events by branch"></div><div class="timeline" id="timeline">{''.join(events)}</div></section><section class="download-band"><div class="shell"><div><p class="kicker">SEPARATE DATA LAYER</p><h2>History can be rebuilt without this page.</h2></div><div class="download-links"><a href="../atlas/history.json">Timeline JSON</a><a href="../corpus/source-registry.json">Source registry</a></div></div></section>'''
    write_text(ROOT / "history" / "index.html", page("Mathematics through time — QEVA", "Explore QEVA's global seed timeline of mathematical works, traditions, discoveries, corrections, and formalizations.", body, "../", "history", ("assets/qeva-data.js", "assets/history.js")))


def render_map_page(atlas):
    order = ["meta", "logic", "types", "sets", "number", "structure", "algebra", "analysis", "discrete", "computation", "probability", "information", "dynamics", "frontier", "categories"]
    by_lane = defaultdict(list)
    for concept in atlas["concepts"]:
        by_lane[concept["lane"]].append(concept)
    lane_html = []
    for lane in sorted(by_lane, key=lambda value: (order.index(value) if value in order else 99, value)):
        nodes = sorted(by_lane[lane], key=lambda value: (value["stage"], value["title"].casefold()))
        links = "".join(f'<a class="map-node" href="../objects/{html.escape(item["id"])}/" data-node="{html.escape(item["id"])}" data-kind="{html.escape(item["kind"])}" data-lane="{html.escape(item["lane"])}">{html.escape(item["title"])}</a>' for item in nodes)
        lane_html.append(f'<section class="lane-group" data-lane-group="{html.escape(lane)}"><h2>{html.escape(lane)}</h2><div class="lane-nodes">{links}</div></section>')
    field_html = "".join(f'<article class="field-card"><p class="kicker">{html.escape(item.get("parent") or "root field")}</p><h3>{html.escape(item["title"])}</h3><p>{html.escape(item["question"])}</p><small>bridges → {html.escape(" · ".join(item["bridges"]))}</small></article>' for item in FIELDS)
    frontier_html = "".join(f'<article class="field-card"><p class="kicker">{html.escape(item["status"])} · since {html.escape(str(item["since"]))}</p><h3>{html.escape(item["title"])}</h3><p>{html.escape(item["question"])}</p><small>{html.escape(item["domain"])}</small></article>' for item in FRONTIERS)
    first = next((item for item in atlas["concepts"] if item["id"] == "distinction"), atlas["concepts"][0])
    body = f'''<div class="page-head shell"><p class="kicker">LOGICAL ANCESTRY · TYPED CANDIDATE EDGES</p><h1>Trace what an idea may use</h1><p>Choose a concept to inspect migrated prerequisite candidates and direct uses. These legacy edges remain candidates—not asserted proof dependencies—until an exact qualification promotes them. Logical, pedagogical, computational, and historical relations stay separate.</p></div><section class="shell" aria-labelledby="atlas-title"><h2 id="atlas-title" class="visually-hidden">Logical concept atlas</h2><div class="map-tools"><label>Search<input id="map-q" type="search" placeholder="recurrence, identity, proof…"></label><label>Lane<select id="map-lane"><option value="">All lanes</option></select></label><p id="map-count" aria-live="polite">{len(atlas['concepts'])} objects</p></div><p id="map-empty" class="notice hidden" role="status">No concepts match these filters.</p><div class="atlas-shell"><div id="lane-rail" class="lane-rail">{''.join(lane_html)}</div><aside id="map-detail" class="map-detail" aria-live="polite"><p class="kicker">{html.escape(first['lane'])} · {html.escape(first['kind'])}</p><h2>{html.escape(first['title'])}</h2><p>{html.escape(first['plain'])}</p><p><a class="button" href="../objects/{html.escape(first['id'])}/">Open concept</a></p></aside></div></section><section class="home-section shell"><div class="section-lead"><p class="kicker">FIELD INDEX</p><div><h2>Branches are navigation, not walls</h2><p>Broad fields orient readers; bridges show why one structure can belong to several areas.</p></div></div><div id="field-grid" class="field-grid">{field_html}</div></section><section class="home-section shell"><div class="section-lead"><p class="kicker">OPEN QUESTIONS</p><div><h2>Unresolved is a first-class state</h2><p>This is an illustrative index, not a ranking of importance or likely progress.</p></div></div><div id="frontier-grid" class="field-grid">{frontier_html}</div></section>'''
    write_text(ROOT / "map" / "index.html", page("Logical map — QEVA", "Trace typed, exact-revision prerequisites across QEVA's current mathematical seed.", body, "../", "", ("assets/qeva-data.js", "assets/map.js")))


def render_search_page(atlas, history, experiments):
    concepts = "".join(f'<li><a href="../objects/{html.escape(item["id"])}/"><strong>{html.escape(item["title"])}</strong><span>{html.escape(item["plain"])}</span></a></li>' for item in sorted(atlas["concepts"], key=lambda value: value["title"].casefold()))
    experiment_items = "".join(f'<li><a href="../lab/?experiment={html.escape(slug_for_experiment(item))}"><strong>{html.escape(item["title"])}</strong><span>{html.escape(item["summary"])}</span></a></li>' for _, item in sorted(experiments, key=lambda pair: pair[1]["title"].casefold()))
    history_items = "".join(f'<li><a href="../history/?q={html.escape(item["title"], quote=True)}"><strong>{html.escape(item["title"])}</strong><span>{html.escape(item["date"])} · {html.escape(item["branch"])} · {html.escape(item["region"])}</span></a></li>' for item in history["milestones"])
    body = f'''<div class="page-head shell"><p class="kicker">OFFLINE INDEX</p><h1>Search mathematics</h1><p>Search current concept revisions, formulas, experiments, and historical events in this release. Superseded exact revisions remain browsable in the archive. The index runs locally and sends no query anywhere.</p></div><section class="shell search-workspace"><form id="search-form" role="search"><label for="search-q">Search current revisions</label><div class="search-input-row"><input id="search-q" name="q" type="search" placeholder="try x_(n+1), equivalence, proof, India…" autocomplete="off"><select id="search-kind" aria-label="Result type"><option value="">Everything</option><option value="concept">Concepts</option><option value="experiment">Experiments</option><option value="history">History</option></select><button type="submit">Search</button></div></form><p id="search-count" role="status" aria-live="polite">Browse the complete current-revision index below.</p><ol id="search-results" class="unified-results"></ol><div id="search-fallback" class="search-fallback"><section><h2>Concepts</h2><ul>{concepts}</ul></section><section><h2>Experiments</h2><ul>{experiment_items}</ul></section><section><h2>History</h2><ul>{history_items}</ul></section></div></section>'''
    write_text(ROOT / "search" / "index.html", page("Search — QEVA", "Search QEVA concepts, exact statements, formulas, experiments, and mathematical history offline.", body, "../", "search", ("assets/qeva-data.js", "assets/search.js")))


def build_archive_exports(records, latest):
    rows = []
    for path, record in records:
        data = canonical(record)
        slug = slug_for(record)
        rows.append({
            "ref": exact(record), "id": record["id"], "revision": record["revision"],
            "current": latest[slug][1]["revision"] == record["revision"], "kind": record["kind"],
            "title": record["title"], "summary": record["summary"], "domains": record["domains"],
            "verification": record["verification"]["level"], "path": f"objects/{path.name}",
            "sha256": digest(data, "sha256"), "sha512": digest(data, "sha512"),
        })
    rows.sort(key=lambda row: row["ref"])
    write_json(ARCHIVE / "index.json", rows)
    current_rows = [row for row in rows if row["current"]]
    write_json(ARCHIVE / "current.json", current_rows)
    with (ARCHIVE / "all.jsonl").open("wb") as handle:
        for _, record in sorted(records, key=lambda item: exact(item[1])):
            handle.write(canonical(record))
    with (ARCHIVE / "current.jsonl").open("wb") as handle:
        for _, record in sorted(latest.values(), key=lambda item: exact(item[1])):
            handle.write(canonical(record))
    catalog = ["ref\tcurrent\tkind\ttitle\tdomains\tverification\tpath"]
    for row in rows:
        values = [row["ref"], "yes" if row["current"] else "no", row["kind"], row["title"], ",".join(row["domains"]), row["verification"], row["path"]]
        catalog.append("\t".join(str(value).replace("\t", " ").replace("\n", " ") for value in values))
    write_text(ARCHIVE / "CATALOG.tsv", "\n".join(catalog) + "\n")
    return rows, current_rows


def build_qualification_export():
    assertions = []
    for path in sorted(QUALIFICATIONS.glob("*.json")):
        assertions.append(strict_json_loads(path.read_text(encoding="utf-8")))
    with (QUALIFICATIONS / "index.jsonl").open("wb") as handle:
        for assertion in sorted(assertions, key=lambda value: (value["id"], value["revision"])):
            handle.write(canonical(assertion))
    return assertions


def build_experiment_exports(experiments, current_experiments, analyzers, current_analyzers):
    current_experiment_refs = {exact(record) for _, record in current_experiments}
    rows = []
    for path, record in experiments:
        ref = f"{record['id']}@{record['revision']}"
        rows.append({
            "ref": ref, "id": record["id"], "revision": record["revision"],
            "current": ref in current_experiment_refs,
            "title": record["title"], "summary": record["summary"], "family": record["family"],
            "path": f"records/{path.name}", "canonical_sha256": digest(canonical(record)),
            "artifact_sha256": digest(path.read_bytes()),
            "engine": record["executable"]["engine_version"],
        })
    rows.sort(key=lambda item: item["ref"])
    write_json(ROOT / "experiments" / "index.json", rows)
    write_text(ROOT / "experiments" / "all.jsonl", b"".join(
        canonical(record) for _, record in sorted(experiments, key=lambda item: f"{item[1]['id']}@{item[1]['revision']}")
    ).decode("utf-8"))
    write_text(ROOT / "experiments" / "current.jsonl", b"".join(
        canonical(record) for _, record in sorted(current_experiments, key=lambda item: f"{item[1]['id']}@{item[1]['revision']}")
    ).decode("utf-8"))
    current_analyzer_refs = {exact(record) for _, record in current_analyzers}
    analyzer_rows = []
    for path, record in analyzers:
        ref = f"{record['id']}@{record['revision']}"
        analyzer_rows.append({
            "ref": ref, "current": ref in current_analyzer_refs, "title": record["title"],
            "purpose": record["purpose"], "path": f"manifests/{path.name}",
            "canonical_sha256": digest(canonical(record)),
            "artifact_sha256": digest(path.read_bytes()),
        })
    analyzer_rows.sort(key=lambda item: item["ref"])
    write_json(ROOT / "analyzers" / "index.json", analyzer_rows)
    write_text(ROOT / "analyzers" / "all.jsonl", b"".join(
        canonical(record) for _, record in sorted(analyzers, key=lambda item: f"{item[1]['id']}@{item[1]['revision']}")
    ).decode("utf-8"))
    write_text(ROOT / "analyzers" / "current.jsonl", b"".join(
        canonical(record) for _, record in sorted(current_analyzers, key=lambda item: f"{item[1]['id']}@{item[1]['revision']}")
    ).decode("utf-8"))
    payload = {
        "release": RELEASE,
        "experiments": [record for _, record in sorted(current_experiments, key=lambda item: item[1]["title"].casefold())],
        "experiment_index": rows,
        "analyzers": [record for _, record in sorted(current_analyzers, key=lambda item: item[1]["title"].casefold())],
    }
    write_text(ROOT / "assets" / "experiment-data.js", "window.QEVA_EXPERIMENTS=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")
    return [row for row in rows if row["current"]], [row for row in analyzer_rows if row["current"]]


def render_archive(latest, atlas):
    by_slug = {concept["id"]: concept for concept in atlas["concepts"]}
    cards = []
    for slug, (_, record) in sorted(latest.items(), key=lambda item: item[1][1]["title"].casefold()):
        concept = by_slug[slug]
        searchable = " ".join([record["title"], record["summary"], record["kind"], concept["lane"], *record["domains"], record["verification"]["level"]]).lower()
        cards.append(f'''<article class="archive-row" data-record="{html.escape(searchable, quote=True)}" data-lane="{html.escape(concept['lane'])}" data-kind="{html.escape(record['kind'])}" data-status="{html.escape(record['verification']['level'])}"><a href="../objects/{slug}/"><span class="archive-title">{html.escape(record['title'])}</span><span>{html.escape(record['summary'])}</span><span class="archive-meta">{html.escape(concept['lane'])} · {html.escape(record['kind'])} · {html.escape(record['verification']['level'])} · r{record['revision']}</span></a></article>''')
    lanes = sorted({concept["lane"] for concept in atlas["concepts"]})
    lane_options = "".join(f'<option value="{html.escape(lane)}">{html.escape(lane)}</option>' for lane in lanes)
    body = f'''<div class="shell page-head"><p class="kicker">CURRENT LOGICAL ARCHIVE</p><h1>Every idea exposes its load-bearing parts.</h1><p>Search the current revision of {len(latest)} objects. Each page separates intuition, exact statement, assumptions, dependencies, verification, provenance, and history.</p></div><section class="archive-tools shell" aria-label="Archive filters"><label><span>Search</span><input id="archive-q" type="search" placeholder="prime, proof, symmetry, entropy…" autocomplete="off"></label><label><span>Lane</span><select id="archive-lane"><option value="">All lanes</option>{lane_options}</select></label><p id="archive-count" aria-live="polite">{len(latest)} objects</p></section><div class="archive-list shell" id="archive-list">{''.join(cards)}</div><section class="download-band"><div class="shell"><div><p class="kicker">TAKE THE WHOLE THING</p><h2>The archive does not require this website.</h2></div><div class="download-links"><a href="current.jsonl">Current JSONL</a><a href="all.jsonl">All revisions</a><a href="CATALOG.tsv">TSV catalog</a><a href="index.json">JSON index</a></div></div></section>'''
    write_text(ARCHIVE / "index.html", page("QEVA Archive", "Search QEVA's explicit, revisioned mathematical objects.", body, "../", "archive", ("assets/archive.js",)))


def build_release_metadata(records, latest, history, qualifications, experiment_rows, analyzer_rows, relations):
    verification_counts = defaultdict(int)
    for _, record in latest.values():
        verification_counts[record["verification"]["level"]] += 1
    legacy_zip = ROOT / "legacy" / "qeva-site-v0.4-source.zip"
    earlier_zip = ROOT / "legacy" / "qeva-site-v0.3-world-map.zip"
    metadata = {
        "release": RELEASE, "released": RELEASE_DATE,
        "title": "Audited mathematical instrument",
        "protocol": "QEVA Object 0.2; Experiment 0.1; Run 0.1; Observation 0.1; Typed Relation 0.2; Release Envelope 0.5",
        "current_objects": len(latest), "all_revisions": len(records),
        "qualification_assertions": len(qualifications),
        "history_milestones": len(history["milestones"]), "field_nodes": len(FIELDS),
        "current_experiments": len(experiment_rows), "analyzers": len(analyzer_rows),
        "typed_relations": len(relations),
        "verification": dict(sorted(verification_counts.items())),
        "claims": {
            "complete_map_of_mathematics": False,
            "internet_scrape_bundled": False,
            "production_harvester": False,
            "bounded_harvester_prototype": True,
            "mechanism_engine": True,
            "mathematical_diff": True,
            "observer_switch": True,
            "parameter_sweep": True,
            "conjecture_attack": True,
            "accounts_groups_agents": False,
            "browser_local_workspace": True,
            "replayable_local_analysis_exports": True,
            "offline_runtime_dependencies": 0,
        },
        "legacy": {
            "release": "0.4.0", "zip_path": "legacy/qeva-site-v0.4-source.zip",
            "zip_sha256": digest(legacy_zip.read_bytes()) if legacy_zip.exists() else None,
            "known_issue": "The supplied 0.4 outer ZIP omitted manifest-listed dotfiles and does not self-verify after extraction.",
            "earlier_release": {
                "release": "0.3", "zip_path": "legacy/qeva-site-v0.3-world-map.zip",
                "zip_sha256": digest(earlier_zip.read_bytes()) if earlier_zip.exists() else None,
            },
        },
    }
    write_json(ROOT / "RELEASE.json", metadata)
    return metadata


def build_browser_data(metadata, atlas, history, latest, experiments):
    compact_objects = []
    for concept in atlas["concepts"]:
        record = latest[concept["id"]][1]
        compact_objects.append({
            "id": concept["id"], "ref": concept["qeva"], "title": concept["title"],
            "kind": concept["kind"], "lane": concept["lane"], "stage": concept["stage"],
            "plain": concept["plain"], "question": concept["question"],
            "dependencies": concept["dependencies"], "used_by": concept["used_by"],
            "verification": concept["verification"], "domains": record["domains"],
            "exact": record["content"]["exact"], "example": record["content"]["example"],
            "aliases": record.get("legacy_ids", []),
        })
    payload = {"release": metadata, "objects": compact_objects, "experiments": [{"id": slug_for_experiment(record), "ref": f"{record['id']}@{record['revision']}", "title": record["title"], "summary": record["summary"], "family": record["family"], "formulae": [operation.get("formula", "") for operation in record["operations"]], "related_objects": record["related_objects"]} for _, record in experiments], "fields": FIELDS, "frontiers": FRONTIERS, "history": history["milestones"], "sources": SOURCES}
    write_text(ROOT / "assets" / "qeva-data.js", "window.QEVA_DATA=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")


def build_source_registry():
    write_json(ROOT / "corpus" / "source-registry.json", {"release": RELEASE, "retrieval_rule": "Re-check current terms and rights at each run.", "sources": SOURCES})


def make_offline_links_explicit() -> None:
    """Make internal HTML navigation work when index.html is opened via file://."""
    pattern = re.compile(r"(\bhref=)([\"'])(.*?)(\2)", re.IGNORECASE)

    def replace(match: re.Match) -> str:
        url = match.group(3)
        if not url or url.startswith(("#", "/", "//")) or re.match(r"^[a-z][a-z0-9+.-]*:", url, re.IGNORECASE):
            return match.group(0)
        parts = re.match(r"^([^?#]*)(.*)$", url)
        if not parts:
            return match.group(0)
        path, suffix = parts.groups()
        if not path.endswith("/"):
            return match.group(0)
        explicit = path + "index.html" + suffix
        return f"{match.group(1)}{match.group(2)}{explicit}{match.group(4)}"

    for path in sorted(ROOT.rglob("*.html")):
        relative = path.relative_to(ROOT)
        if "legacy" in relative.parts or relative.parts[:2] == ("snapshot", "QEVA-BAG"):
            continue
        source = path.read_text(encoding="utf-8")
        rewritten = pattern.sub(replace, source)
        if rewritten != source:
            write_text(path, rewritten)


def build_snapshot(metadata):
    bag = ROOT / "snapshot" / "QEVA-BAG"
    temporary = ROOT / "snapshot" / ".QEVA-BAG.build"
    if temporary.exists():
        shutil.rmtree(temporary)
    payload = temporary / "data"
    payload.mkdir(parents=True)
    for rel in SNAPSHOT_INCLUDE:
        source = ROOT / rel
        if not source.exists():
            raise SystemExit(f"snapshot source missing: {rel}")
        target = payload / rel
        if source.is_dir():
            shutil.copytree(source, target, ignore=shutil.ignore_patterns("runs", "private", "quarantine", "__pycache__", "*.pyc", "*.html"))
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
    write_text(temporary / "bagit.txt", "BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n")
    write_text(temporary / "bag-info.txt", f"Source-Organization: QEVA\nBagging-Date: {RELEASE_DATE}\nExternal-Identifier: QEVA-{RELEASE}\nPayload-Oxum: {sum(p.stat().st_size for p in payload.rglob('*') if p.is_file())}.{sum(1 for p in payload.rglob('*') if p.is_file())}\n")
    payload_files = sorted(p for p in payload.rglob("*") if p.is_file())
    for algorithm in ("sha256", "sha512"):
        lines = [f"{digest(path.read_bytes(), algorithm)}  {path.relative_to(temporary).as_posix()}" for path in payload_files]
        write_text(temporary / f"manifest-{algorithm}.txt", "\n".join(lines) + "\n")
    tag_files = sorted(
        [temporary / "bagit.txt", temporary / "bag-info.txt", temporary / "manifest-sha256.txt", temporary / "manifest-sha512.txt"],
        key=lambda path: path.relative_to(temporary).as_posix(),
    )
    for algorithm in ("sha256", "sha512"):
        tag_lines = [f"{digest(path.read_bytes(), algorithm)}  {path.relative_to(temporary).as_posix()}" for path in tag_files]
        write_text(temporary / f"tagmanifest-{algorithm}.txt", "\n".join(tag_lines) + "\n")
    if bag.exists():
        shutil.rmtree(bag)
    temporary.rename(bag)
    bag_archive = ROOT / "snapshot" / f"QEVA-BAG-{RELEASE}.zip"
    bag_archive_temporary = ROOT / "snapshot" / f".QEVA-BAG-{RELEASE}.zip.build"
    bag_archive_temporary.unlink(missing_ok=True)
    with zipfile.ZipFile(bag_archive_temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        archive.comment = f"QEVA {RELEASE} data-and-engine BagIt snapshot".encode("ascii")
        directories = {Path("QEVA-BAG")}
        bag_files = sorted(path for path in bag.rglob("*") if path.is_file())
        for path in bag_files:
            member = Path("QEVA-BAG") / path.relative_to(bag)
            directories.update(member.parents)
        directories.discard(Path("."))
        for directory in sorted(directories, key=lambda value: value.as_posix().encode("utf-8")):
            info = zipfile.ZipInfo(directory.as_posix() + "/", (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = (0o040755 << 16)
            archive.writestr(info, b"")
        for path in bag_files:
            member = (Path("QEVA-BAG") / path.relative_to(bag)).as_posix()
            info = zipfile.ZipInfo(member, (1980, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.compress_type = zipfile.ZIP_DEFLATED
            executable = path.read_bytes().startswith(b"#!") and path.suffix in {".py", ".mjs", ".sh"}
            info.external_attr = ((0o100755 if executable else 0o100644) << 16)
            archive.writestr(info, path.read_bytes())
    bag_archive_temporary.replace(bag_archive)
    print_core = [
        "QEVA PRINT CORE 0.5", "===================", "",
        "QEVA is a map and executable instrument for explicit mathematical objects, experiments, evidence, history, and open questions.",
        "The domain and website are replaceable. Preserve exact revisions, provenance, manifests, and the right to fork.", "",
        f"Release: {metadata['release']}", f"Current objects: {metadata['current_objects']}", f"Current experiments: {metadata['current_experiments']}",
        "Start with protocol/CORE.txt, archive/current.jsonl, and experiments/current.jsonl.", "",
        "Five permanent separations:",
        "1. syntax is not semantics", "2. derivation is not truth without a model", "3. citation is not logical dependence",
        "4. simulation is not proof", "5. public access is not redistribution permission", "",
    ]
    for path, record in sorted(latest_records(load_records()).values(), key=lambda item: item[1]["title"].casefold()):
        print_core.extend([exact(record), record["title"], record["content"]["plain"], ""])
    write_text(ROOT / "snapshot" / "PRINT-CORE.txt", "\n".join(print_core) + "\n")


def write_manifests():
    excluded = {"MANIFEST.sha256", "MANIFEST.sha512"}
    files = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel_path = path.relative_to(ROOT)
        rel = rel_path.as_posix()
        if rel in excluded or "__pycache__" in rel_path.parts or path.suffix == ".pyc" or rel.startswith(PUBLIC_EXCLUDED_PREFIXES):
            continue
        files.append((rel, path))
    files.sort()
    for algorithm in ("sha256", "sha512"):
        lines = [f"{digest(path.read_bytes(), algorithm)}  {rel}" for rel, path in files]
        write_text(ROOT / f"MANIFEST.{algorithm}", "\n".join(lines) + "\n")


def build_sitemap():
    urls = []
    for path in sorted(ROOT.rglob("*.html")):
        if "legacy" in path.parts or path.name == "404.html":
            continue
        rel = path.relative_to(ROOT).as_posix()
        location = "" if rel == "index.html" else rel.removesuffix("index.html")
        url = xml_escape("https://qeva.org/" + location)
        urls.append(f"  <url><loc>{url}</loc><lastmod>{RELEASE_DATE}</lastmod></url>")
    document = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n"
    write_text(ROOT / "sitemap.xml", document)


def main():
    preflight_snapshot_sources()
    records = load_records()
    latest = latest_records(records)
    experiments = load_json_records(EXPERIMENTS)
    analyzers = load_json_records(ANALYZERS)
    current_experiments = current_revision_records(experiments, "qeva-experiment")
    current_analyzers = current_revision_records(analyzers, "qeva-analyzer")
    rows, current_rows = build_archive_exports(records, latest)
    qualifications = build_qualification_export()
    history = build_history(latest)
    experiment_rows, analyzer_rows = build_experiment_exports(experiments, current_experiments, analyzers, current_analyzers)
    records_by_slug, used_by = render_objects(records, latest, history, current_experiments)
    atlas, relations = build_atlas(records, latest, used_by, current_experiments)
    render_history_page(history, latest)
    build_source_registry()
    metadata = build_release_metadata(records, latest, history, qualifications, experiment_rows, analyzer_rows, relations)
    build_browser_data(metadata, atlas, history, latest, current_experiments)
    render_archive(latest, atlas)
    render_map_page(atlas)
    render_search_page(atlas, history, current_experiments)
    make_offline_links_explicit()
    build_snapshot(metadata)
    build_sitemap()
    write_manifests()
    print(f"release: {len(latest)} current objects; {len(rows)} exact revisions; {len(current_experiments)} current experiments; {len(relations)} typed relations; manifests rebuilt")


if __name__ == "__main__":
    main()
