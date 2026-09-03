#!/usr/bin/env python3
"""Regenerate QEVA archive exports and integrity manifest using only Python stdlib."""
from __future__ import annotations
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "archive"
OBJECTS = ARCHIVE / "objects"

REQUIRED = {
    "qeva_version", "id", "revision", "type", "title", "summary", "status",
    "context", "assumptions", "content", "dependencies", "relations",
    "verification", "provenance",
}

def load_records():
    records=[]
    seen=set()
    for path in sorted(OBJECTS.glob("*.json")):
        obj=json.loads(path.read_text(encoding="utf-8"))
        missing=REQUIRED-set(obj)
        if missing:
            raise SystemExit(f"{path}: missing fields: {sorted(missing)}")
        key=(obj["id"],obj["revision"])
        if key in seen:
            raise SystemExit(f"duplicate record revision: {key}")
        seen.add(key)
        records.append((path,obj))
    return records

def canonical_bytes(obj):
    return (json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")

def main():
    records=load_records()
    index=[]
    for path,obj in records:
        index.append({
            "id":obj["id"], "revision":obj["revision"], "type":obj["type"],
            "title":obj["title"], "summary":obj["summary"], "status":obj["status"],
            "domain":obj["context"]["domain"], "path":str(path.relative_to(ARCHIVE)),
        })
    index.sort(key=lambda x:(x["id"],x["revision"]))
    (ARCHIVE/"index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    with (ARCHIVE/"qeva.jsonl").open("wb") as out:
        for _,obj in sorted(records,key=lambda pair:(pair[1]["id"],pair[1]["revision"])):
            out.write(canonical_bytes(obj))

    targets=[ARCHIVE/"index.json",ARCHIVE/"qeva.jsonl",ROOT/"protocol"/"qeva-object.schema.json"]
    targets += [p for p,_ in records]
    lines=[]
    for path in sorted(targets,key=lambda p:str(p.relative_to(ROOT))):
        digest=hashlib.sha256(path.read_bytes()).hexdigest()
        lines.append(f"{digest}  {path.relative_to(ROOT).as_posix()}")
    (ARCHIVE/"MANIFEST.sha256").write_text("\n".join(lines)+"\n",encoding="ascii")
    print(f"release: {len(records)} records; wrote index.json, qeva.jsonl, MANIFEST.sha256")

if __name__ == "__main__":
    main()
