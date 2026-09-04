#!/usr/bin/env python3
"""Build QEVA 0.4 canonical logical records without changing legacy bytes."""
from __future__ import annotations

import copy
import json
import re
import shutil
import sys
from pathlib import Path

SCRIPT = Path(__file__).resolve()
PROJECT = SCRIPT.parents[2]
DIST = SCRIPT.parents[1]
sys.path.insert(0, str(PROJECT))

from seed_data import RELEASE_DATE, SPECS, UPGRADE_CAVEATS, UPGRADE_DEPS, UPGRADE_FRAMEWORK  # noqa: E402

LEGACY_OBJECTS = DIST / "legacy" / "v0.3" / "archive" / "objects"
OBJECTS = DIST / "archive" / "objects"
REF_RE = re.compile(r"^(qeva:1:([a-z0-9][a-z0-9._-]*))@([1-9][0-9]*)$")


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")


def new_object(spec: dict) -> dict:
    verification = {
        "level": "editorial",
        "method": "QEVA seed formulation reviewed for internal mathematical coherence; no external formal proof is claimed.",
        "artifact": None,
    }
    if spec["slug"] == "one-plus-one":
        verification = {
            "level": "machine-checked",
            "method": "Replayed by scripts/verify.py against the two rewrite rules declared by QEVA Peano Kernel 0.",
            "artifact": "certificates/peano-kernel-0/one-plus-one.json",
        }
    assumptions = [{"text": text, "ref": None} for text in spec["assumptions"]]
    if not assumptions:
        assumptions = [{"text": f"The declared {spec['framework']} context is fixed.", "ref": None}]
    return {
        "qeva_version": "0.2",
        "id": f"qeva:1:{spec['slug']}",
        "revision": 1,
        "kind": spec["kind"],
        "title": spec["title"],
        "summary": spec["plain"],
        "domains": spec["domains"],
        "context": {
            "framework": spec["framework"],
            "framework_ref": None,
            "note": "This node belongs to one explicit foundational presentation; alternate foundations may encode it differently.",
        },
        "assumptions": assumptions,
        "content": {
            "plain": spec["plain"],
            "exact": spec["exact"],
            "example": spec["example"],
            "caveat": spec["caveat"],
        },
        "dependencies": spec["deps"],
        "relations": [],
        "verification": verification,
        "provenance": {
            "created": RELEASE_DATE,
            "creator": "QEVA foundation seed",
            "license": "CC0-1.0",
            "source_note": "Original QEVA orientation record. It is a compact map entry, not a substitute for a textbook or primary source.",
        },
        "supersedes": None,
        "legacy_ids": [],
    }


def upgraded_ref(value: str, old_slugs: set[str]) -> str:
    match = REF_RE.fullmatch(value)
    if not match:
        return value
    slug = match.group(2)
    revision = int(match.group(3))
    if slug in old_slugs and revision == 1:
        return f"qeva:1:{slug}@2"
    return value


def upgrade(old: dict, old_slugs: set[str]) -> dict:
    value = copy.deepcopy(old)
    slug = value["id"].split(":")[-1]
    value["revision"] = 2
    value["supersedes"] = f"{value['id']}@1"
    value["dependencies"] = sorted(set(
        [upgraded_ref(ref, old_slugs) for ref in value["dependencies"]]
        + [f"qeva:1:{dep}@1" for dep in UPGRADE_DEPS[slug] if dep not in old_slugs]
        + [f"qeva:1:{dep}@2" for dep in UPGRADE_DEPS[slug] if dep in old_slugs]
    ))
    for relation in value["relations"]:
        relation["target"] = upgraded_ref(relation["target"], old_slugs)
    for assumption in value["assumptions"]:
        if assumption["ref"]:
            assumption["ref"] = upgraded_ref(assumption["ref"], old_slugs)
        for target in old_slugs:
            assumption["text"] = assumption["text"].replace(f"qeva:1:{target}@1", f"qeva:1:{target}@2")
    framework_slug = UPGRADE_FRAMEWORK[slug]
    framework_revision = 2 if framework_slug in old_slugs else 1
    value["context"]["framework_ref"] = f"qeva:1:{framework_slug}@{framework_revision}"
    value["context"]["note"] = "Revision 2 exposes a QEVA foundation dependency instead of stopping only at a textual framework label."
    for key in ("plain", "exact", "example", "caveat"):
        if value["content"].get(key):
            value["content"][key] = value["content"][key].replace("QEVA Protocol 0.1", "QEVA Protocol 0.2")
    if not value["content"].get("caveat"):
        value["content"]["caveat"] = UPGRADE_CAVEATS.get(slug, "This compact orientation record applies only within its declared framework and assumptions.")
    value["verification"] = {
        "level": "editorial",
        "method": "Revision migration checked for exact-reference closure and editorial mathematical coherence; no external formal proof artifact is claimed.",
        "artifact": None,
    }
    value["provenance"] = {
        "created": RELEASE_DATE,
        "creator": "QEVA foundation migration",
        "license": "CC0-1.0",
        "source_note": "Supersedes the preserved release-0.3 seed revision by connecting its previously textual framework boundary to the QEVA foundation switchboard.",
    }
    return value


def main() -> None:
    if not LEGACY_OBJECTS.is_dir():
        raise SystemExit(f"missing immutable legacy object directory: {LEGACY_OBJECTS}")
    OBJECTS.mkdir(parents=True, exist_ok=True)
    for path in OBJECTS.glob("*.json"):
        path.unlink()

    legacy_paths = sorted(LEGACY_OBJECTS.glob("*.json"))
    old_records = []
    for source in legacy_paths:
        target = OBJECTS / source.name
        shutil.copyfile(source, target)
        if target.read_bytes() != source.read_bytes():
            raise SystemExit(f"legacy byte preservation failed: {source.name}")
        old_records.append(json.loads(source.read_text(encoding="utf-8")))

    old_slugs = {record["id"].split(":")[-1] for record in old_records}
    new_slugs = {spec["slug"] for spec in SPECS}
    overlap = old_slugs & new_slugs
    if overlap:
        raise SystemExit(f"new seed reuses existing ids: {sorted(overlap)}")

    for spec in SPECS:
        write_json(OBJECTS / f"{spec['slug']}.r1.json", new_object(spec))
    for old in old_records:
        slug = old["id"].split(":")[-1]
        write_json(OBJECTS / f"{slug}.r2.json", upgrade(old, old_slugs))

    certificate = {
        "kernel": "QEVA-Peano-Kernel-0",
        "claim_ref": "qeva:1:one-plus-one@1",
        "rules": {
            "add-zero": "add(a, 0) -> a",
            "add-successor": "add(a, S(b)) -> S(add(a, b))",
        },
        "start": ["add", ["S", "0"], ["S", "0"]],
        "steps": [
            {"rule": "add-successor", "path": []},
            {"rule": "add-zero", "path": [1]},
        ],
        "expected": ["S", ["S", "0"]],
    }
    write_json(DIST / "certificates" / "peano-kernel-0" / "one-plus-one.json", certificate)
    print(f"seed: preserved {len(old_records)} legacy revisions; wrote {len(old_records)} upgrades and {len(SPECS)} new objects")


if __name__ == "__main__":
    main()
