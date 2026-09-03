#!/usr/bin/env python3
"""Verify QEVA release integrity and basic record consistency using only Python stdlib."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
ARCHIVE=ROOT/"archive"
MANIFEST=ARCHIVE/"MANIFEST.sha256"


def fail(message):
    raise SystemExit("verify: FAIL: "+message)


def verify_manifest():
    for lineno,line in enumerate(MANIFEST.read_text(encoding="ascii").splitlines(),1):
        if not line.strip(): continue
        try: expected,rel=line.split("  ",1)
        except ValueError: fail(f"manifest line {lineno} is malformed")
        path=ROOT/rel
        if not path.is_file(): fail(f"missing {rel}")
        actual=hashlib.sha256(path.read_bytes()).hexdigest()
        if actual!=expected: fail(f"digest mismatch: {rel}")


def verify_records():
    records=[]
    keys=set()
    ids=set()
    for path in sorted((ARCHIVE/"objects").glob("*.json")):
        try: obj=json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc: fail(f"invalid JSON {path.name}: {exc}")
        if obj.get("qeva_version")!="0.1": fail(f"unsupported protocol in {path.name}")
        key=(obj.get("id"),obj.get("revision"))
        if key in keys: fail(f"duplicate id/revision {key}")
        keys.add(key); ids.add(obj.get("id")); records.append(obj)
        if obj.get("provenance",{}).get("license")!="CC0-1.0": fail(f"unexpected archive license in {path.name}")
    for obj in records:
        for dep in obj.get("dependencies",[]):
            if dep.startswith("qeva:") and dep not in ids:
                fail(f"unresolved dependency {dep} from {obj['id']}")
    jsonl=[json.loads(line) for line in (ARCHIVE/"qeva.jsonl").read_text(encoding="utf-8").splitlines() if line.strip()]
    if len(jsonl)!=len(records): fail("qeva.jsonl record count differs from objects/")
    index=json.loads((ARCHIVE/"index.json").read_text(encoding="utf-8"))
    if len(index)!=len(records): fail("index.json record count differs from objects/")
    return len(records)


def main():
    verify_manifest()
    count=verify_records()
    print(f"verify: OK: {count} records; manifest and basic consistency valid")

if __name__=="__main__":
    main()
