#!/usr/bin/env python3
"""Tier A: verify QEVA's canonical mathematical and experiment records.

This verifier intentionally uses only the Python standard library.  It checks the
small JSON-Schema subset used by QEVA, exact-reference closure, immutable revision
chains, typed-relation projections, content-address bindings, and proof artifacts.
It does not verify rendered pages or packaging; those belong to Tiers B and C.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path, PurePosixPath
from typing import Any, Iterable


OBJECT_REF = re.compile(r"^(qeva:1:([a-z0-9][a-z0-9._-]*))@([1-9][0-9]*)$")
EXPERIMENT_REF = re.compile(r"^(qeva-experiment:1:([a-z0-9][a-z0-9._-]*))@([1-9][0-9]*)$")
ANALYZER_REF = re.compile(r"^(qeva-analyzer:1:([a-z0-9][a-z0-9._-]*))@([1-9][0-9]*)$")
QUALIFICATION_REF = re.compile(r"^(qeva-qualification:1:[a-z0-9][a-z0-9._:-]*)@([1-9][0-9]*)$")

TYPED_KINDS = {
    "formally-requires", "definition-uses", "proof-uses", "derives",
    "equivalent-to", "isomorphic-to", "generalizes", "specializes",
    "contradicts", "refutes", "conceptually-explains",
    "pedagogical-prerequisite", "historically-influenced",
    "independently-discovered", "analogous-to", "often-studied-with",
    "computationally-suggests", "hypothesized-connection", "implemented-by",
    "instantiated-by-experiment",
}
SYMMETRIC_KINDS = {"equivalent-to", "isomorphic-to", "analogous-to", "often-studied-with"}
LOGICAL_KINDS = {
    "formally-requires", "definition-uses", "proof-uses", "derives",
    "equivalent-to", "isomorphic-to", "generalizes", "specializes",
    "contradicts", "refutes",
}
HISTORICAL_KINDS = {"historically-influenced", "independently-discovered"}
COMPUTATIONAL_KINDS = {"computationally-suggests", "implemented-by", "instantiated-by-experiment"}
PEDAGOGICAL_KINDS = {
    "conceptually-explains", "pedagogical-prerequisite", "analogous-to",
    "often-studied-with", "hypothesized-connection",
}

LEGACY_RELATION_KINDS = {
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


IJSON_MAX_INTEGER = 9007199254740991


def _ecmascript_number(value: float) -> str:
    """Serialize a finite float in QEVA's RFC-8785-compatible profile."""
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


def _canonical_text(value: Any) -> str:
    if value is None:
        return "null"
    if value is True:
        return "true"
    if value is False:
        return "false"
    if isinstance(value, str):
        if any(0xD800 <= ord(character) <= 0xDFFF for character in value):
            raise ValueError("lone Unicode surrogates are forbidden in canonical JSON")
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    if isinstance(value, int):
        if abs(value) > IJSON_MAX_INTEGER:
            raise ValueError("integers outside the I-JSON safe range are forbidden")
        return str(value)
    if isinstance(value, float):
        if value.is_integer() and abs(value) > IJSON_MAX_INTEGER:
            raise ValueError("integer-valued binary64 numbers outside the I-JSON safe range are forbidden")
        return _ecmascript_number(value)
    if isinstance(value, list):
        return "[" + ",".join(_canonical_text(item) for item in value) + "]"
    if isinstance(value, dict):
        if not all(isinstance(key, str) for key in value):
            raise TypeError("canonical JSON object keys must be strings")
        if any(any(0xD800 <= ord(character) <= 0xDFFF for character in key) for key in value):
            raise ValueError("lone Unicode surrogates are forbidden in canonical JSON object names")
        keys = sorted(value, key=lambda key: key.encode("utf-16-be", "strict"))
        return "{" + ",".join(f"{_canonical_text(key)}:{_canonical_text(value[key])}" for key in keys) + "}"
    raise TypeError(f"unsupported canonical JSON value: {type(value).__name__}")


def canonical(value: Any) -> bytes:
    """QEVA canonical JSON profile: UTF-8, ECMAScript ordering/numbers, one LF."""
    return (_canonical_text(value) + "\n").encode("utf-8")


def reject_constant(token: str) -> None:
    raise ValueError(f"non-finite JSON token {token!r} is forbidden")


def strict_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    value: dict[str, Any] = {}
    for key, item in pairs:
        if key in value:
            raise ValueError(f"duplicate JSON object name {key!r}")
        value[key] = item
    return value


def digest(data: bytes, algorithm: str = "sha256") -> str:
    return hashlib.new(algorithm, data).hexdigest()


def json_type(value: Any) -> str:
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
    if isinstance(value, float):
        return "integer" if math.isfinite(value) and value.is_integer() else "number"
    return type(value).__name__


class Audit:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.errors: list[str] = []
        self.counts: dict[str, int] = {}

    def fail(self, message: str) -> None:
        self.errors.append(message)

    def rel(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return str(path)

    def load_json(self, path: Path, *, required: bool = True) -> Any | None:
        if not path.is_file():
            if required:
                self.fail(f"{self.rel(path)}: missing JSON file")
            return None
        try:
            value = json.loads(
                path.read_text(encoding="utf-8"),
                parse_constant=reject_constant,
                object_pairs_hook=strict_object,
            )
            canonical(value)  # Reject values outside QEVA's interoperable canonical profile.
            return value
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, TypeError, ValueError) as exc:
            self.fail(f"{self.rel(path)}: unreadable JSON: {exc}")
            return None

    def safe_file(self, value: str, where: str) -> Path | None:
        if not isinstance(value, str) or not value or "\\" in value or "\x00" in value:
            self.fail(f"{where}: unsafe or empty relative path")
            return None
        pure = PurePosixPath(value)
        if pure.is_absolute() or any(part in {"", ".", ".."} for part in pure.parts):
            self.fail(f"{where}: unsafe relative path {value!r}")
            return None
        candidate = self.root.joinpath(*pure.parts)
        try:
            candidate.resolve().relative_to(self.root)
        except (OSError, ValueError):
            self.fail(f"{where}: path escapes release root: {value!r}")
            return None
        if not candidate.is_file():
            self.fail(f"{where}: missing file {value!r}")
            return None
        return candidate


def validate_schema(
    audit: Audit,
    value: Any,
    schema: dict[str, Any],
    where: str,
    root_schema: dict[str, Any] | None = None,
) -> None:
    """Validate the deliberately small schema vocabulary used in this release."""
    root_schema = root_schema or schema
    reference = schema.get("$ref")
    if reference:
        if not isinstance(reference, str) or not reference.startswith("#/"):
            audit.fail(f"{where}: only local JSON-Schema references are supported, got {reference!r}")
        else:
            target: Any = root_schema
            try:
                for token in reference[2:].split("/"):
                    token = token.replace("~1", "/").replace("~0", "~")
                    target = target[token]
            except (KeyError, TypeError):
                audit.fail(f"{where}: unresolved schema reference {reference!r}")
            else:
                if isinstance(target, dict):
                    validate_schema(audit, value, target, where, root_schema)
                else:
                    audit.fail(f"{where}: schema reference {reference!r} is not an object")
    alternatives = schema.get("oneOf")
    if isinstance(alternatives, list):
        matches = 0
        for alternative in alternatives:
            if not isinstance(alternative, dict):
                continue
            probe = Audit(audit.root)
            validate_schema(probe, value, alternative, where, root_schema)
            if not probe.errors:
                matches += 1
        if matches != 1:
            audit.fail(f"{where}: oneOf requires exactly one matching branch; found {matches}")
    allowed = schema.get("type")
    if allowed is not None:
        types = [allowed] if isinstance(allowed, str) else allowed
        actual = json_type(value)
        # JSON Schema considers an integer a number too.
        if actual not in types and not (actual == "integer" and "number" in types):
            audit.fail(f"{where}: expected {types}, got {actual}")
            return
    if "const" in schema and value != schema["const"]:
        audit.fail(f"{where}: expected constant {schema['const']!r}")
    if "enum" in schema and value not in schema["enum"]:
        audit.fail(f"{where}: value {value!r} is outside the declared enum")
    if isinstance(value, str):
        if len(value) < schema.get("minLength", 0):
            audit.fail(f"{where}: string is shorter than minLength")
        if "maxLength" in schema and len(value) > schema["maxLength"]:
            audit.fail(f"{where}: string is longer than maxLength")
        pattern = schema.get("pattern")
        if pattern and re.fullmatch(pattern, value) is None:
            audit.fail(f"{where}: value does not match {pattern!r}")
        if schema.get("format") == "date":
            try:
                parsed = date.fromisoformat(value)
            except ValueError:
                audit.fail(f"{where}: value is not an RFC 3339 full-date")
            else:
                if len(value) != 10 or parsed.isoformat() != value:
                    audit.fail(f"{where}: value is not a canonical RFC 3339 full-date")
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        if "minimum" in schema and value < schema["minimum"]:
            audit.fail(f"{where}: value is below minimum {schema['minimum']}")
        if "maximum" in schema and value > schema["maximum"]:
            audit.fail(f"{where}: value exceeds maximum {schema['maximum']}")
    if isinstance(value, list):
        if len(value) < schema.get("minItems", 0):
            audit.fail(f"{where}: too few items")
        if "maxItems" in schema and len(value) > schema["maxItems"]:
            audit.fail(f"{where}: too many items")
        if schema.get("uniqueItems"):
            encoded = [canonical(item) for item in value]
            if len(encoded) != len(set(encoded)):
                audit.fail(f"{where}: duplicate items violate uniqueItems")
        item_schema = schema.get("items")
        if isinstance(item_schema, dict):
            for index, item in enumerate(value):
                validate_schema(audit, item, item_schema, f"{where}[{index}]", root_schema)
    if isinstance(value, dict):
        required = set(schema.get("required", []))
        missing = sorted(required - value.keys())
        if missing:
            audit.fail(f"{where}: missing keys {missing}")
        properties = schema.get("properties", {})
        extra_rule = schema.get("additionalProperties", True)
        if extra_rule is False:
            extra = sorted(value.keys() - properties.keys())
            if extra:
                audit.fail(f"{where}: unexpected keys {extra}")
        for key, item in value.items():
            subschema = properties.get(key)
            if isinstance(subschema, dict):
                validate_schema(audit, item, subschema, f"{where}.{key}", root_schema)
            elif isinstance(extra_rule, dict):
                validate_schema(audit, item, extra_rule, f"{where}.{key}", root_schema)
    for subschema in schema.get("allOf", []):
        if isinstance(subschema, dict):
            validate_schema(audit, value, subschema, where, root_schema)
    condition = schema.get("if")
    if isinstance(condition, dict):
        probe = Audit(audit.root)
        validate_schema(probe, value, condition, where, root_schema)
        branch = schema.get("then") if not probe.errors else schema.get("else")
        if isinstance(branch, dict):
            validate_schema(audit, value, branch, where, root_schema)


def load_schema(audit: Audit, name: str) -> dict[str, Any]:
    path = audit.root / "protocol" / name
    value = audit.load_json(path)
    if not isinstance(value, dict):
        return {}
    if value.get("$schema") != "https://json-schema.org/draft/2020-12/schema" or not value.get("$id"):
        audit.fail(f"protocol/{name}: missing draft-2020-12 declaration or stable $id")
    return value


def verify_schema_inventory(audit: Audit) -> None:
    """Strict-parse every published schema and resolve its local references."""
    locations = [audit.root / "protocol", audit.root / "corpus" / "schemas"]
    paths = sorted(path for location in locations if location.is_dir() for path in location.glob("*.json"))
    required = {
        audit.root / "protocol" / name for name in (
            "qeva-object.schema.json", "experiment.schema.json", "analyzer.schema.json",
            "observation.schema.json", "run.schema.json", "qualification.schema.json",
            "relation.schema.json", "release-envelope.schema.json",
        )
    }
    for missing in sorted(required - set(paths)):
        audit.fail(f"{audit.rel(missing)}: required published schema is missing")
    schemas: dict[Path, dict[str, Any]] = {}
    identifiers: dict[str, Path] = {}
    for path in paths:
        value = audit.load_json(path)
        if not isinstance(value, dict):
            continue
        schemas[path.resolve()] = value
        identifier = value.get("$id")
        if value.get("$schema") != "https://json-schema.org/draft/2020-12/schema" or not isinstance(identifier, str) or not identifier:
            audit.fail(f"{audit.rel(path)}: missing draft-2020-12 declaration or stable $id")
        elif identifier in identifiers:
            audit.fail(f"{audit.rel(path)}: duplicate schema $id also used by {audit.rel(identifiers[identifier])}")
        else:
            identifiers[identifier] = path

    def pointer(document: Any, fragment: str, where: str) -> None:
        if not fragment:
            return
        if not fragment.startswith("/"):
            audit.fail(f"{where}: unsupported schema fragment #{fragment}")
            return
        target = document
        try:
            for token in fragment[1:].split("/"):
                token = token.replace("~1", "/").replace("~0", "~")
                target = target[int(token)] if isinstance(target, list) else target[token]
        except (KeyError, IndexError, TypeError, ValueError):
            audit.fail(f"{where}: unresolved schema fragment #{fragment}")

    def inspect(node: Any, source: Path, document: dict[str, Any], trail: str) -> None:
        if isinstance(node, dict):
            reference = node.get("$ref")
            if reference is not None:
                if not isinstance(reference, str) or not reference:
                    audit.fail(f"{trail}: $ref must be a non-empty string")
                else:
                    filename, marker, fragment = reference.partition("#")
                    if not filename:
                        pointer(document, fragment if marker else "", trail)
                    elif re.match(r"^[a-z][a-z0-9+.-]*:", filename, re.IGNORECASE):
                        audit.fail(f"{trail}: external $ref is not recoverable inside this release: {reference!r}")
                    else:
                        candidate = (source.parent / filename).resolve()
                        try:
                            candidate.relative_to(audit.root)
                        except ValueError:
                            audit.fail(f"{trail}: $ref escapes the release: {reference!r}")
                        else:
                            target = schemas.get(candidate)
                            if target is None:
                                audit.fail(f"{trail}: unresolved schema file {reference!r}")
                            else:
                                pointer(target, fragment if marker else "", trail)
            for key, value in node.items():
                inspect(value, source, document, f"{trail}.{key}")
        elif isinstance(node, list):
            for index, value in enumerate(node):
                inspect(value, source, document, f"{trail}[{index}]")

    for path, document in schemas.items():
        inspect(document, path, document, audit.rel(path))
    audit.counts["schemas"] = len(schemas)


def load_directory(audit: Audit, directory: Path, schema: dict[str, Any], label: str) -> list[tuple[Path, dict[str, Any]]]:
    if not directory.is_dir():
        audit.fail(f"{audit.rel(directory)}: missing {label} directory")
        return []
    rows: list[tuple[Path, dict[str, Any]]] = []
    for path in sorted(directory.glob("*.json")):
        value = audit.load_json(path)
        if isinstance(value, dict):
            validate_schema(audit, value, schema, audit.rel(path), schema)
            rows.append((path, value))
    if not rows:
        audit.fail(f"{audit.rel(directory)}: no {label} records")
    return rows


def exact(record: dict[str, Any]) -> str:
    return f"{record['id']}@{record['revision']}"


def check_revision_series(
    audit: Audit,
    rows: Iterable[tuple[Path, dict[str, Any]]],
    reference_pattern: re.Pattern[str],
    label: str,
) -> tuple[dict[str, tuple[Path, dict[str, Any]]], dict[str, tuple[Path, dict[str, Any]]]]:
    by_exact: dict[str, tuple[Path, dict[str, Any]]] = {}
    by_id: dict[str, list[tuple[Path, dict[str, Any]]]] = defaultdict(list)
    for path, record in rows:
        if not isinstance(record.get("id"), str) or not isinstance(record.get("revision"), int):
            continue
        ref = exact(record)
        if reference_pattern.fullmatch(ref) is None:
            audit.fail(f"{audit.rel(path)}: invalid exact {label} reference {ref!r}")
            continue
        if ref in by_exact:
            audit.fail(f"{audit.rel(path)}: duplicate exact reference {ref}")
        by_exact[ref] = (path, record)
        by_id[record["id"]].append((path, record))
        slug = record["id"].split(":")[-1]
        expected_name = f"{slug}.r{record['revision']}.json"
        if path.name != expected_name:
            audit.fail(f"{audit.rel(path)}: expected filename {expected_name}")
    latest: dict[str, tuple[Path, dict[str, Any]]] = {}
    for identifier, items in by_id.items():
        items.sort(key=lambda item: item[1]["revision"])
        revisions = [item[1]["revision"] for item in items]
        expected_revisions = list(range(1, revisions[-1] + 1))
        if revisions != expected_revisions:
            audit.fail(f"{identifier}: non-contiguous revisions {revisions}; expected {expected_revisions}")
        for index, (_, record) in enumerate(items):
            expected_previous = None if index == 0 else exact(items[index - 1][1])
            if record.get("supersedes") != expected_previous:
                audit.fail(f"{exact(record)}: supersedes must be {expected_previous!r}")
        latest[identifier] = items[-1]
    return by_exact, latest


def check_jsonl(audit: Audit, path: Path, expected: bytes, label: str) -> None:
    if not path.is_file():
        audit.fail(f"{audit.rel(path)}: missing {label}")
    elif path.read_bytes() != expected:
        audit.fail(f"{audit.rel(path)}: does not reproduce canonical records")


def verify_object_exports(
    audit: Audit,
    rows: list[tuple[Path, dict[str, Any]]],
    latest: dict[str, tuple[Path, dict[str, Any]]],
) -> None:
    archive = audit.root / "archive"
    ordered = sorted(rows, key=lambda item: exact(item[1]))
    current = sorted(latest.values(), key=lambda item: exact(item[1]))
    check_jsonl(audit, archive / "all.jsonl", b"".join(canonical(record) for _, record in ordered), "all-revision stream")
    check_jsonl(audit, archive / "current.jsonl", b"".join(canonical(record) for _, record in current), "current stream")

    index = audit.load_json(archive / "index.json")
    current_index = audit.load_json(archive / "current.json")
    expected_refs = {exact(record) for _, record in rows}
    current_refs = {exact(record) for _, record in latest.values()}
    if not isinstance(index, list):
        return
    actual_refs = {item.get("ref") for item in index if isinstance(item, dict)}
    if actual_refs != expected_refs or len(index) != len(rows):
        audit.fail("archive/index.json: exact revision set or cardinality mismatch")
    for item in index:
        if not isinstance(item, dict) or item.get("ref") not in expected_refs:
            continue
        record_path, record = next(pair for pair in rows if exact(pair[1]) == item["ref"])
        data = canonical(record)
        if item.get("sha256") != digest(data) or item.get("sha512") != digest(data, "sha512"):
            audit.fail(f"archive/index.json: digest binding mismatch for {item['ref']}")
        expected_path = f"objects/{record_path.name}"
        if item.get("path") != expected_path:
            audit.fail(f"archive/index.json: bad path for {item['ref']}")
        if bool(item.get("current")) != (item["ref"] in current_refs):
            audit.fail(f"archive/index.json: bad current flag for {item['ref']}")
    if isinstance(current_index, list):
        refs = {item.get("ref") for item in current_index if isinstance(item, dict)}
        if refs != current_refs or len(current_index) != len(current_refs):
            audit.fail("archive/current.json: current exact-reference set mismatch")

    catalog = archive / "CATALOG.tsv"
    expected_lines = ["ref\tcurrent\tkind\ttitle\tdomains\tverification\tpath"]
    by_ref = {exact(record): (path, record) for path, record in rows}
    for ref in sorted(by_ref):
        path, record = by_ref[ref]
        fields = [
            ref, "yes" if ref in current_refs else "no", record["kind"], record["title"],
            ",".join(record["domains"]), record["verification"]["level"], f"objects/{path.name}",
        ]
        expected_lines.append("\t".join(str(value).replace("\t", " ").replace("\n", " ") for value in fields))
    expected = ("\n".join(expected_lines) + "\n").encode("utf-8")
    if not catalog.is_file() or catalog.read_bytes() != expected:
        audit.fail("archive/CATALOG.tsv: does not reproduce canonical object records")


def verify_objects(audit: Audit) -> tuple[
    list[tuple[Path, dict[str, Any]]],
    dict[str, tuple[Path, dict[str, Any]]],
    dict[str, tuple[Path, dict[str, Any]]],
]:
    schema = load_schema(audit, "qeva-object.schema.json")
    rows = load_directory(audit, audit.root / "archive" / "objects", schema, "mathematical object")
    by_exact, latest = check_revision_series(audit, rows, OBJECT_REF, "object")
    graph: dict[str, list[str]] = defaultdict(list)
    for path, record in rows:
        if "id" not in record or "revision" not in record:
            continue
        ref = exact(record)
        references: list[tuple[str, Any]] = []
        references.extend(("dependency", dep) for dep in record.get("dependencies", []))
        references.extend(("relation", relation.get("target")) for relation in record.get("relations", []) if isinstance(relation, dict))
        references.extend(("assumption", item.get("ref")) for item in record.get("assumptions", []) if isinstance(item, dict) and item.get("ref"))
        context = record.get("context", {})
        if isinstance(context, dict) and context.get("framework_ref"):
            references.append(("framework", context["framework_ref"]))
        if record.get("supersedes"):
            references.append(("supersedes", record["supersedes"]))
        for kind, target in references:
            if target not in by_exact:
                audit.fail(f"{audit.rel(path)}: missing exact {kind} reference {target!r}")
        graph[ref] = [dep for dep in record.get("dependencies", []) if dep in by_exact]
        artifact = record.get("verification", {}).get("artifact")
        if artifact:
            audit.safe_file(artifact, f"{audit.rel(path)} verification.artifact")
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(ref: str, trail: list[str]) -> None:
        if ref in visiting:
            audit.fail("logical dependency cycle: " + " -> ".join(trail + [ref]))
            return
        if ref in visited:
            return
        visiting.add(ref)
        for target in graph.get(ref, []):
            visit(target, trail + [ref])
        visiting.remove(ref)
        visited.add(ref)

    for ref in graph:
        visit(ref, [])
    for _, record in latest.values():
        content = record.get("content", {})
        for field in ("plain", "exact", "example", "caveat"):
            if not isinstance(content.get(field), str) or not content[field].strip():
                audit.fail(f"{exact(record)}: current revision lacks a nonempty {field} layer")
    verify_object_exports(audit, rows, latest)
    audit.counts["objects"] = len(latest)
    audit.counts["object_revisions"] = len(rows)
    return rows, by_exact, latest


def verify_analyzers(audit: Audit) -> tuple[dict[str, tuple[Path, dict[str, Any]]], dict[str, tuple[Path, dict[str, Any]]]]:
    schema = load_schema(audit, "analyzer.schema.json")
    rows = load_directory(audit, audit.root / "analyzers" / "manifests", schema, "analyzer")
    by_exact, latest = check_revision_series(audit, rows, ANALYZER_REF, "analyzer")
    for path, record in rows:
        for fixture in record.get("tests", []):
            audit.safe_file(fixture, f"{audit.rel(path)} tests")
    ordered = sorted(rows, key=lambda item: exact(item[1]))
    current = sorted(latest.values(), key=lambda item: exact(item[1]))
    check_jsonl(
        audit,
        audit.root / "analyzers" / "all.jsonl",
        b"".join(canonical(record) for _, record in ordered),
        "all-revision analyzer stream",
    )
    check_jsonl(
        audit,
        audit.root / "analyzers" / "current.jsonl",
        b"".join(canonical(record) for _, record in current),
        "current analyzer stream",
    )
    index = audit.load_json(audit.root / "analyzers" / "index.json")
    if isinstance(index, list):
        refs = {item.get("ref") for item in index if isinstance(item, dict)}
        if refs != set(by_exact) or len(index) != len(by_exact):
            audit.fail("analyzers/index.json: analyzer revision set mismatch")
        for item in index:
            if not isinstance(item, dict) or item.get("ref") not in by_exact:
                continue
            path, record = by_exact[item["ref"]]
            if (
                item.get("path") != f"manifests/{path.name}"
                or item.get("canonical_sha256") != digest(canonical(record))
                or item.get("artifact_sha256") != digest(path.read_bytes())
                or bool(item.get("current")) != (item["ref"] in {exact(value) for _, value in latest.values()})
            ):
                audit.fail(f"analyzers/index.json: path, digest, or current binding mismatch for {item['ref']}")
    audit.counts["analyzers"] = len(latest)
    return by_exact, latest


def verify_experiments(
    audit: Audit,
    object_refs: set[str],
    analyzer_refs: dict[str, tuple[Path, dict[str, Any]]],
) -> tuple[dict[str, tuple[Path, dict[str, Any]]], dict[str, tuple[Path, dict[str, Any]]]]:
    schema = load_schema(audit, "experiment.schema.json")
    rows = load_directory(audit, audit.root / "experiments" / "records", schema, "experiment")
    by_exact, latest = check_revision_series(audit, rows, EXPERIMENT_REF, "experiment")
    engine_path = audit.root / "assets" / "mechanism-engine.js"
    engine_artifact_sha256 = digest(engine_path.read_bytes()) if engine_path.is_file() else None
    if engine_artifact_sha256 is None:
        audit.fail("assets/mechanism-engine.js: missing executable engine artifact")
    for path, record in rows:
        for ref in record.get("related_objects", []):
            if ref not in object_refs:
                audit.fail(f"{audit.rel(path)}: missing related mathematical object {ref}")
        for ref in record.get("analyzers", []):
            if ref not in analyzer_refs:
                audit.fail(f"{audit.rel(path)}: missing analyzer manifest {ref}")
            else:
                manifest = analyzer_refs[ref][1]
                if record.get("family") not in manifest.get("accepts", []):
                    audit.fail(f"{audit.rel(path)}: analyzer {ref} does not declare family {record.get('family')!r}")
                implementation = manifest.get("implementation", {})
                if isinstance(implementation, dict) and implementation.get("engine") == record.get("executable", {}).get("engine") and implementation.get("engine_version") != record.get("executable", {}).get("engine_version"):
                    audit.fail(f"{audit.rel(path)}: analyzer {ref} and experiment pin different engine versions")
        parent = record.get("provenance", {}).get("parent")
        if parent and parent not in by_exact:
            audit.fail(f"{audit.rel(path)}: public fork parent is not preserved: {parent}")
        if record.get("stewardship", {}).get("visibility") != "public":
            audit.fail(f"{audit.rel(path)}: non-public experiment appears in the public canonical archive")
        if record.get("executable", {}).get("artifact_sha256") != engine_artifact_sha256:
            audit.fail(f"{audit.rel(path)}: executable.artifact_sha256 does not bind the deployed engine bytes")
    ordered = sorted(rows, key=lambda item: exact(item[1]))
    current = sorted(latest.values(), key=lambda item: exact(item[1]))
    check_jsonl(
        audit,
        audit.root / "experiments" / "all.jsonl",
        b"".join(canonical(record) for _, record in ordered),
        "all-revision experiment stream",
    )
    check_jsonl(
        audit,
        audit.root / "experiments" / "current.jsonl",
        b"".join(canonical(record) for _, record in current),
        "current experiment stream",
    )
    index = audit.load_json(audit.root / "experiments" / "index.json")
    if isinstance(index, list):
        refs = {item.get("ref") for item in index if isinstance(item, dict)}
        if refs != set(by_exact) or len(index) != len(by_exact):
            audit.fail("experiments/index.json: experiment revision set mismatch")
        for item in index:
            if not isinstance(item, dict) or item.get("ref") not in by_exact:
                continue
            path, record = by_exact[item["ref"]]
            if (
                item.get("path") != f"records/{path.name}"
                or item.get("canonical_sha256") != digest(canonical(record))
                or item.get("artifact_sha256") != digest(path.read_bytes())
                or bool(item.get("current")) != (item["ref"] in {exact(value) for _, value in latest.values()})
            ):
                audit.fail(f"experiments/index.json: path, digest, or current binding mismatch for {item['ref']}")
    audit.counts["experiments"] = len(latest)
    audit.counts["experiment_revisions"] = len(rows)
    return by_exact, latest


def verify_qualifications(
    audit: Audit,
    object_refs: dict[str, tuple[Path, dict[str, Any]]],
) -> tuple[list[dict[str, Any]], dict[str, list[dict[str, Any]]]]:
    schema = load_schema(audit, "qualification.schema.json")
    rows = load_directory(audit, audit.root / "archive" / "qualifications", schema, "qualification")
    by_exact: dict[str, dict[str, Any]] = {}
    by_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
    by_subject: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for path, record in rows:
        if not isinstance(record.get("id"), str) or not isinstance(record.get("revision"), int):
            continue
        ref = exact(record)
        if QUALIFICATION_REF.fullmatch(ref) is None:
            audit.fail(f"{audit.rel(path)}: invalid exact qualification reference {ref}")
        if ref in by_exact:
            audit.fail(f"{audit.rel(path)}: duplicate qualification {ref}")
        by_exact[ref] = record
        by_id[record["id"]].append(record)
        subject = record.get("subject")
        if subject not in object_refs:
            audit.fail(f"{audit.rel(path)}: unknown exact subject {subject!r}")
        else:
            by_subject[subject].append(record)
        if record.get("artifact"):
            audit.safe_file(record["artifact"], f"{audit.rel(path)} artifact")
    for identifier, items in by_id.items():
        items.sort(key=lambda item: item["revision"])
        revisions = [item["revision"] for item in items]
        if revisions != list(range(1, revisions[-1] + 1)):
            audit.fail(f"{identifier}: non-contiguous qualification revisions {revisions}")
        for index, record in enumerate(items):
            expected = None if index == 0 else exact(items[index - 1])
            if record.get("supersedes") != expected:
                audit.fail(f"{exact(record)}: supersedes must be {expected!r}")
    values = [record for _, record in rows]
    expected_stream = b"".join(canonical(item) for item in sorted(values, key=lambda value: (value["id"], value["revision"])))
    check_jsonl(audit, audit.root / "archive" / "qualifications" / "index.jsonl", expected_stream, "qualification assertion stream")
    audit.counts["qualifications"] = len(values)
    return values, by_subject


def at_path(term: Any, path: list[int]) -> Any:
    for index in path:
        if not isinstance(term, list) or not isinstance(index, int) or index < 0 or index >= len(term):
            raise ValueError("certificate path does not identify a term")
        term = term[index]
    return term


def replace_path(term: Any, path: list[int], replacement: Any) -> Any:
    if not path:
        return replacement
    clone = json.loads(json.dumps(term))
    parent = clone
    for index in path[:-1]:
        parent = parent[index]
    parent[path[-1]] = replacement
    return clone


def match_term(pattern: Any, term: Any, bindings: dict[str, Any]) -> bool:
    if isinstance(pattern, str) and pattern.startswith("?"):
        if pattern in bindings:
            return bindings[pattern] == term
        bindings[pattern] = term
        return True
    if isinstance(pattern, list):
        return isinstance(term, list) and len(pattern) == len(term) and all(
            match_term(left, right, bindings) for left, right in zip(pattern, term)
        )
    return pattern == term


def instantiate_term(template: Any, bindings: dict[str, Any]) -> Any:
    if isinstance(template, str) and template.startswith("?"):
        if template not in bindings:
            raise ValueError(f"unbound metavariable {template}")
        return json.loads(json.dumps(bindings[template]))
    if isinstance(template, list):
        return [instantiate_term(item, bindings) for item in template]
    return template


def dotted_value(value: Any, field: str) -> Any:
    current = value
    for part in field.split("."):
        if not isinstance(current, dict) or part not in current:
            raise KeyError(field)
        current = current[part]
    return current


def replay_legacy_peano(audit: Audit, path: Path, cert: dict[str, Any], subject: str) -> None:
    if cert.get("claim_ref") != subject:
        audit.fail(f"{audit.rel(path)}: claim_ref does not bind to {subject}")
    rules = cert.get("rules")
    if not isinstance(rules, dict) or set(rules) != {"add-zero", "add-successor"}:
        audit.fail(f"{audit.rel(path)}: trusted legacy rule declaration mismatch")
        return
    term = cert.get("start")
    steps = cert.get("steps")
    if not isinstance(steps, list):
        audit.fail(f"{audit.rel(path)}: steps must be an array")
        return
    try:
        for number, step in enumerate(steps, 1):
            if not isinstance(step, dict) or not isinstance(step.get("path"), list):
                raise ValueError(f"step {number} is malformed")
            target = at_path(term, step["path"])
            if step.get("rule") == "add-successor" and isinstance(target, list) and len(target) == 3 and target[0] == "add" and isinstance(target[2], list) and len(target[2]) == 2 and target[2][0] == "S":
                replacement = ["S", ["add", target[1], target[2][1]]]
            elif step.get("rule") == "add-zero" and isinstance(target, list) and len(target) == 3 and target[0] == "add" and target[2] == "0":
                replacement = target[1]
            else:
                raise ValueError(f"step {number} rule {step.get('rule')!r} does not match its target")
            term = replace_path(term, step["path"], replacement)
    except (IndexError, KeyError, TypeError, ValueError) as exc:
        audit.fail(f"{audit.rel(path)}: legacy proof replay failed: {exc}")
        return
    if term != cert.get("expected"):
        audit.fail(f"{audit.rel(path)}: legacy proof replay result does not equal expected term")


def replay_bound_certificate(
    audit: Audit,
    path: Path,
    cert: dict[str, Any],
    subject: str,
    record: dict[str, Any],
    object_refs: dict[str, tuple[Path, dict[str, Any]]],
) -> None:
    if cert.get("certificate_version") != "0.2" or cert.get("kernel", {}).get("id") != "QEVA-Peano-Rewrite-Kernel" or cert.get("kernel", {}).get("version") != "1":
        audit.fail(f"{audit.rel(path)}: unsupported bound certificate/kernel; no independent replay was performed")
        return
    if cert.get("subject_ref") != subject:
        audit.fail(f"{audit.rel(path)}: subject_ref does not bind to {subject}")
    subject_hash = digest(canonical(record))
    statement = record.get("content", {}).get("exact")
    statement_hash = hashlib.sha256(statement.encode("utf-8")).hexdigest() if isinstance(statement, str) else None
    if cert.get("subject_canonical_sha256") != subject_hash:
        audit.fail(f"{audit.rel(path)}: canonical subject digest mismatch")
    if cert.get("subject_statement") != statement or cert.get("subject_statement_sha256") != statement_hash:
        audit.fail(f"{audit.rel(path)}: exact-statement binding mismatch")
    bound_dependencies: set[str] = set()
    for binding in cert.get("dependency_bindings", []):
        if not isinstance(binding, dict) or binding.get("ref") not in object_refs:
            audit.fail(f"{audit.rel(path)}: missing dependency binding {binding!r}")
            continue
        dep_ref = binding["ref"]
        if dep_ref in bound_dependencies:
            audit.fail(f"{audit.rel(path)}: duplicate dependency binding for {dep_ref}")
        bound_dependencies.add(dep_ref)
        dep_record = object_refs[dep_ref][1]
        if binding.get("canonical_sha256") != digest(canonical(dep_record)):
            audit.fail(f"{audit.rel(path)}: dependency digest mismatch for {dep_ref}")
    missing_bindings = set(record.get("dependencies", [])) - bound_dependencies
    if missing_bindings:
        audit.fail(f"{audit.rel(path)}: certificate omits direct dependency bindings {sorted(missing_bindings)}")
    kernel = cert.get("kernel", {})
    rules = {}
    for rule in kernel.get("rules", []):
        if not isinstance(rule, dict) or not isinstance(rule.get("id"), str) or "pattern" not in rule or "replacement" not in rule:
            audit.fail(f"{audit.rel(path)}: malformed structured rewrite rule")
            return
        if rule["id"] in rules:
            audit.fail(f"{audit.rel(path)}: duplicate structured rewrite rule {rule['id']}")
            return
        rules[rule["id"]] = rule
    expected_rules = {
        "add-zero": {"pattern": ["add", "?a", "0"], "replacement": "?a"},
        "add-successor": {
            "pattern": ["add", "?a", ["S", "?b"]],
            "replacement": ["S", ["add", "?a", "?b"]],
        },
    }
    if set(rules) != set(expected_rules) or any(
        rules[name].get("pattern") != value["pattern"] or rules[name].get("replacement") != value["replacement"]
        for name, value in expected_rules.items()
    ):
        audit.fail(f"{audit.rel(path)}: QEVA-Peano-Rewrite-Kernel@1 rule set does not match the verifier's pinned semantics")
        return
    claim = cert.get("claim", {})
    if claim.get("relation") != "normalizes-to" or "lhs" not in claim or "rhs" not in claim:
        audit.fail(f"{audit.rel(path)}: malformed normalization claim")
        return
    term = claim["lhs"]
    try:
        for number, step in enumerate(cert.get("derivation", []), 1):
            if not isinstance(step, dict) or not isinstance(step.get("path"), list) or step.get("rule") not in rules:
                raise ValueError(f"step {number} is malformed or cites an unknown rule")
            if step.get("before") != term:
                raise ValueError(f"step {number} before-term does not equal the preceding result")
            target = at_path(term, step["path"])
            rule = rules[step["rule"]]
            bindings: dict[str, Any] = {}
            if not match_term(rule["pattern"], target, bindings):
                raise ValueError(f"step {number} rule does not match the term at its path")
            replacement = instantiate_term(rule["replacement"], bindings)
            term = replace_path(term, step["path"], replacement)
            if step.get("after") != term:
                raise ValueError(f"step {number} declared after-term does not equal the replayed result")
    except (IndexError, KeyError, TypeError, ValueError) as exc:
        audit.fail(f"{audit.rel(path)}: bound proof replay failed: {exc}")
        return
    result = cert.get("result", {})
    if term != claim["rhs"] or result.get("normal_form") != term or result.get("outcome") != "pass":
        audit.fail(f"{audit.rel(path)}: replayed normal form, claim RHS, and declared result do not agree")


def replay_certificate(
    audit: Audit,
    path: Path,
    subject: str,
    record: dict[str, Any],
    qualification: dict[str, Any],
    object_refs: dict[str, tuple[Path, dict[str, Any]]],
) -> None:
    cert = audit.load_json(path)
    if not isinstance(cert, dict):
        return
    if cert.get("kernel") == "QEVA-Peano-Kernel-0":
        replay_legacy_peano(audit, path, cert, subject)
    else:
        certificate_schema = load_schema(audit, "proof-certificate.schema.json")
        validate_schema(audit, cert, certificate_schema, audit.rel(path), certificate_schema)
        replay_bound_certificate(audit, path, cert, subject, record, object_refs)
    if qualification.get("qualification_version") == "0.2":
        subject_hash = digest(canonical(record))
        if qualification.get("subject_sha256") != subject_hash:
            audit.fail(f"{exact(qualification)}: subject_sha256 does not bind {subject}")
        scope = qualification.get("scope", {})
        try:
            scoped_value = dotted_value(record, scope.get("field", ""))
        except KeyError:
            audit.fail(f"{exact(qualification)}: scope field does not exist on subject")
        else:
            if not isinstance(scoped_value, str) or scope.get("statement_sha256") != hashlib.sha256(scoped_value.encode("utf-8")).hexdigest():
                audit.fail(f"{exact(qualification)}: scoped statement digest mismatch")
        if qualification.get("artifact_sha256") != digest(path.read_bytes()):
            audit.fail(f"{exact(qualification)}: artifact_sha256 does not bind artifact bytes")
        environment = qualification.get("environment", {})
        checker = environment.get("checker") if isinstance(environment, dict) else None
        checker_hash = environment.get("checker_sha256") if isinstance(environment, dict) else None
        if not isinstance(checker, str) or not checker or not isinstance(checker_hash, str):
            audit.fail(f"{exact(qualification)}: v0.2 proof qualification must bind checker path and checker_sha256")
        else:
            checker_path = audit.safe_file(checker, f"{exact(qualification)} checker")
            if checker_path is None or digest(checker_path.read_bytes()) != checker_hash:
                audit.fail(f"{exact(qualification)}: checker_sha256 does not bind checker bytes")


def verify_proof_bindings(
    audit: Audit,
    object_refs: dict[str, tuple[Path, dict[str, Any]]],
    qualifications: dict[str, list[dict[str, Any]]],
) -> None:
    claimed = {"formal-proof", "machine-checked"}
    for ref, (record_path, record) in object_refs.items():
        verification = record.get("verification", {})
        if verification.get("level") not in claimed:
            continue
        artifact = verification.get("artifact")
        if not artifact:
            audit.fail(f"{ref}: {verification.get('level')} claim has no verification artifact")
            continue
        supporting = [
            item for item in qualifications.get(ref, [])
            if item.get("outcome") == "pass"
            and item.get("artifact") == artifact
            and item.get("dimension") in {"formal-derivation", "machine-replay"}
        ]
        if not supporting:
            audit.fail(f"{ref}: claimed proof status lacks a passing, artifact-bound qualification")
            continue
        path = audit.safe_file(artifact, f"{audit.rel(record_path)} proof artifact")
        if path is not None:
            for qualification in supporting:
                replay_certificate(audit, path, ref, record, qualification, object_refs)


def normalized_relation_kind(raw: str) -> str:
    if raw in TYPED_KINDS:
        return raw
    return LEGACY_RELATION_KINDS.get(raw, "")


def expected_relation_layer(kind: str) -> str | None:
    if kind in LOGICAL_KINDS:
        return "logical"
    if kind in HISTORICAL_KINDS:
        return "historical"
    if kind in PEDAGOGICAL_KINDS:
        return "pedagogical"
    if kind in COMPUTATIONAL_KINDS:
        return "computational"
    return None


def verify_relations(
    audit: Audit,
    object_refs: dict[str, tuple[Path, dict[str, Any]]],
    current_objects: dict[str, tuple[Path, dict[str, Any]]],
    experiment_refs: dict[str, tuple[Path, dict[str, Any]]],
    analyzer_refs: dict[str, tuple[Path, dict[str, Any]]],
) -> list[dict[str, Any]]:
    schema = load_schema(audit, "relation.schema.json")
    path = audit.root / "atlas" / "relations.jsonl"
    if not path.is_file():
        audit.fail("atlas/relations.jsonl: missing typed relation stream")
        return []
    rows: list[dict[str, Any]] = []
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError) as exc:
        audit.fail(f"atlas/relations.jsonl: unreadable: {exc}")
        return []
    for number, line in enumerate(lines, 1):
        if not line.strip():
            audit.fail(f"atlas/relations.jsonl:{number}: blank lines are not canonical records")
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            audit.fail(f"atlas/relations.jsonl:{number}: invalid JSON: {exc}")
            continue
        if not isinstance(row, dict):
            audit.fail(f"atlas/relations.jsonl:{number}: relation must be an object")
            continue
        validate_schema(audit, row, schema, f"atlas/relations.jsonl:{number}", schema)
        rows.append(row)
    expected_bytes = b"".join(canonical(row) for row in sorted(rows, key=lambda item: item.get("id", "")))
    if path.read_bytes() != expected_bytes:
        audit.fail("atlas/relations.jsonl: records are not canonical and sorted by content ID")
    ids: set[str] = set()
    known_endpoints = set(object_refs) | set(experiment_refs) | set(analyzer_refs)
    keys: set[tuple[str, str, str, str]] = set()
    for row in rows:
        relation_id = row.get("id")
        if relation_id in ids:
            audit.fail(f"atlas/relations.jsonl: duplicate relation ID {relation_id}")
        ids.add(relation_id)
        body = {key: value for key, value in row.items() if key != "id"}
        expected_id = "qeva-relation:sha256:" + digest(canonical(body))
        if relation_id != expected_id:
            audit.fail(f"{relation_id}: content-address does not bind relation body")
        source, target, kind, layer = row.get("source"), row.get("target"), row.get("kind"), row.get("layer")
        if source not in known_endpoints:
            audit.fail(f"{relation_id}: unknown exact source endpoint {source!r}")
        if target not in known_endpoints:
            audit.fail(f"{relation_id}: unknown exact target endpoint {target!r}")
        if kind not in TYPED_KINDS:
            audit.fail(f"{relation_id}: untyped relation kind {kind!r}")
        expected_direction = "symmetric" if kind in SYMMETRIC_KINDS else "directed"
        if row.get("direction") != expected_direction:
            audit.fail(f"{relation_id}: {kind} must use direction={expected_direction}")
        forced_layer = expected_relation_layer(kind)
        if forced_layer and layer != forced_layer:
            audit.fail(f"{relation_id}: {kind} belongs to layer={forced_layer}, not {layer}")
        keys.add((source, target, kind, layer))

    for _, record in current_objects.values():
        source = exact(record)
        # The legacy dependency array never encoded proof role.  Preserve every
        # migrated edge as a candidate definition-use until a qualification
        # promotes an individual edge; kind alone cannot justify formal force.
        dependency_kind = "definition-uses"
        for target in record.get("dependencies", []):
            if (source, target, dependency_kind, "logical") not in keys:
                audit.fail(f"typed relation stream omits dependency {source} --{dependency_kind}--> {target}")
        for relation in record.get("relations", []):
            kind = normalized_relation_kind(relation.get("kind", ""))
            if not kind:
                audit.fail(f"{source}: unmapped legacy relation kind {relation.get('kind')!r}")
                continue
            layer = expected_relation_layer(kind) or "pedagogical"
            if (source, relation.get("target"), kind, layer) not in keys:
                audit.fail(f"typed relation stream omits normalized edge {source} --{kind}--> {relation.get('target')}")
    for _, experiment in experiment_refs.values():
        experiment_ref = exact(experiment)
        for object_ref in experiment.get("related_objects", []):
            if (object_ref, experiment_ref, "instantiated-by-experiment", "computational") not in keys:
                audit.fail(f"typed relation stream omits experiment binding {object_ref} -> {experiment_ref}")

    atlas = audit.load_json(audit.root / "atlas" / "logical.json")
    if isinstance(atlas, dict):
        concepts = atlas.get("concepts", [])
        expected_current_refs = {exact(record) for _, record in current_objects.values()}
        actual_current_refs = {item.get("qeva") for item in concepts if isinstance(item, dict)}
        if actual_current_refs != expected_current_refs or len(concepts) != len(current_objects):
            audit.fail("atlas/logical.json: concept projection is not exactly the current object set")
        expected_projected_edges: set[tuple[str, str, str]] = set()
        for _, record in current_objects.values():
            source_slug = OBJECT_REF.fullmatch(exact(record)).group(2)
            for dependency in record.get("dependencies", []):
                match = OBJECT_REF.fullmatch(dependency)
                if match:
                    expected_projected_edges.add((source_slug, match.group(2), "definition-uses"))
        projected_edges = atlas.get("edges", [])
        actual_projected_edges = {
            (edge.get("source"), edge.get("target"), edge.get("relation"))
            for edge in projected_edges if isinstance(edge, dict)
        }
        if actual_projected_edges != expected_projected_edges or len(projected_edges) != len(expected_projected_edges):
            audit.fail("atlas/logical.json: dependency-edge projection is incomplete, excessive, or duplicated")
        for edge in projected_edges:
            if not isinstance(edge, dict):
                audit.fail("atlas/logical.json: malformed projected edge")
                continue
            if edge.get("relation") not in TYPED_KINDS or edge.get("relation") == "depends-on":
                audit.fail(f"atlas/logical.json: generic or unknown projected relation {edge.get('relation')!r}")
            source_ref = next((ref for ref in expected_current_refs if OBJECT_REF.fullmatch(ref).group(2) == edge.get("source")), None)
            matching_exact_edge = any(
                source == source_ref
                and kind == edge.get("relation")
                and layer == "logical"
                and OBJECT_REF.fullmatch(target) is not None
                and OBJECT_REF.fullmatch(target).group(2) == edge.get("target")
                for source, target, kind, layer in keys
            )
            if source_ref is None or not matching_exact_edge:
                audit.fail(f"atlas/logical.json: projected edge lacks a typed exact-revision relation: {edge}")
    audit.counts["relations"] = len(rows)
    return rows


def verify_history_refs(audit: Audit, object_refs: set[str]) -> None:
    registry = audit.load_json(audit.root / "corpus" / "source-registry.json")
    source_ids = set()
    if isinstance(registry, dict):
        source_ids = {item.get("id") for item in registry.get("sources", []) if isinstance(item, dict)}
    history = audit.load_json(audit.root / "atlas" / "history.json")
    if not isinstance(history, dict):
        return
    milestones = history.get("milestones", [])
    audit.counts["history_milestones"] = len(milestones) if isinstance(milestones, list) else 0
    for milestone in milestones:
        if not isinstance(milestone, dict):
            audit.fail("atlas/history.json: malformed milestone")
            continue
        label = milestone.get("title", "untitled milestone")
        for ref in milestone.get("qeva", []):
            if ref not in object_refs:
                audit.fail(f"atlas/history.json {label!r}: missing exact QEVA reference {ref}")
        for ref in milestone.get("source_refs", []):
            if ref not in source_ids:
                audit.fail(f"atlas/history.json {label!r}: missing source-registry reference {ref}")
    fields = audit.load_json(audit.root / "atlas" / "fields.json")
    if isinstance(fields, dict):
        rows = fields.get("fields", [])
        audit.counts["field_nodes"] = len(rows) if isinstance(rows, list) else 0
        field_ids = {item.get("id") for item in rows if isinstance(item, dict)}
        for item in rows:
            if not isinstance(item, dict):
                audit.fail("atlas/fields.json: malformed field node")
                continue
            parent = item.get("parent")
            if parent is not None and parent not in field_ids:
                audit.fail(f"atlas/fields.json: field {item.get('id')!r} has unknown parent {parent!r}")
    frontiers = audit.load_json(audit.root / "atlas" / "frontiers.json")
    object_slugs = {OBJECT_REF.fullmatch(ref).group(2) for ref in object_refs if OBJECT_REF.fullmatch(ref)}
    if isinstance(frontiers, dict):
        for item in frontiers.get("frontiers", []):
            if not isinstance(item, dict) or item.get("qeva") not in object_slugs:
                audit.fail(f"atlas/frontiers.json: missing current QEVA object for {item!r}")


def verify_release_envelope(audit: Audit) -> None:
    schema = load_schema(audit, "release-envelope.schema.json")
    release = audit.load_json(audit.root / "RELEASE.json")
    if not isinstance(release, dict):
        return
    validate_schema(audit, release, schema, "RELEASE.json", schema)
    expected = {
        "current_objects": audit.counts.get("objects"),
        "all_revisions": audit.counts.get("object_revisions"),
        "qualification_assertions": audit.counts.get("qualifications"),
        "current_experiments": audit.counts.get("experiments"),
        "analyzers": audit.counts.get("analyzers"),
        "typed_relations": audit.counts.get("relations"),
        "history_milestones": audit.counts.get("history_milestones"),
        "field_nodes": audit.counts.get("field_nodes"),
    }
    for field, count in expected.items():
        if count is not None and release.get(field) != count:
            audit.fail(f"RELEASE.json: {field}={release.get(field)!r}, expected {count}")
    claims = release.get("claims", {})
    if isinstance(claims, dict):
        for forbidden in ("complete_map_of_mathematics", "internet_scrape_bundled", "production_harvester", "accounts_groups_agents"):
            if claims.get(forbidden) is True:
                audit.fail(f"RELEASE.json: unsupported capability claim {forbidden}=true")
        if claims.get("offline_runtime_dependencies") != 0:
            audit.fail("RELEASE.json: offline_runtime_dependencies must be exactly zero")


def run(root: Path, quiet: bool = False) -> int:
    audit = Audit(root)
    verify_schema_inventory(audit)
    _, object_refs, current_objects = verify_objects(audit)
    analyzer_refs, current_analyzers = verify_analyzers(audit)
    experiment_refs, current_experiments = verify_experiments(audit, set(object_refs), analyzer_refs)
    _, qualifications = verify_qualifications(audit, object_refs)
    verify_proof_bindings(audit, object_refs, qualifications)
    verify_relations(audit, object_refs, current_objects, experiment_refs, analyzer_refs)
    verify_history_refs(audit, set(object_refs))
    verify_release_envelope(audit)
    if audit.errors:
        print(f"Tier A / canonical FAILED ({len(audit.errors)} issues)", file=sys.stderr)
        for error in audit.errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    if not quiet:
        print(
            "Tier A / canonical PASS — "
            f"{audit.counts.get('objects', 0)} current objects, "
            f"{audit.counts.get('experiments', 0)} current experiments, "
            f"{audit.counts.get('relations', 0)} typed relations, proof bindings replayed"
        )
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="QEVA dist root")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    raise SystemExit(run(args.root, args.quiet))


if __name__ == "__main__":
    main()
