#!/usr/bin/env python3
"""Offline reproducibility and contract test for QEVA Harvester v1."""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).resolve()
HARVEST = SCRIPT.with_name("harvest.py")


def run(*args: str) -> str:
    result = subprocess.run([sys.executable, str(HARVEST), *args], check=True, text=True, capture_output=True)
    return result.stdout.strip()


def jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    with tempfile.TemporaryDirectory(prefix="qeva-harvester-") as temporary:
        root = Path(temporary)
        left, right = root / "left", root / "right"
        run("demo", "--out", str(left))
        run("demo", "--out", str(right))
        for name in ("normalized.jsonl", "checkpoint.json"):
            assert (left / name).read_bytes() == (right / name).read_bytes(), f"non-deterministic {name}"
        assert len(list((left / "raw").glob("*"))) == 1
        events = jsonl(left / "ledger.jsonl")
        works = jsonl(left / "normalized.jsonl")
        assert len(events) == 1 and len(works) == 2
        raw = left / events[0]["storage_path"]
        assert hashlib.sha256(raw.read_bytes()).hexdigest() == events[0]["sha256"]
        assert len({item["id"] for item in works}) == 2
        assert all(item["status"] == "unreviewed-candidate" for item in [])

        candidates = left / "candidates.jsonl"
        run("extract", str(left / "normalized.jsonl"), "--out", str(candidates))
        extracted = jsonl(candidates)
        assert len(extracted) == 4, f"expected 4 explicit-label candidates, got {len(extracted)}"
        assert {item["kind"] for item in extracted} == {"definition", "theorem", "conjecture", "open-question"}
        assert all(item["status"] == "unreviewed-candidate" for item in extracted)
        assert all(item["work_id"] in {work["id"] for work in works} for item in extracted)

        # A second acquisition into the same run records retrieval again but
        # does not duplicate normalized works.
        run("demo", "--out", str(left))
        assert len(jsonl(left / "ledger.jsonl")) == 2
        assert len(jsonl(left / "normalized.jsonl")) == 2
    print("harvester: deterministic demo, raw fixity, deduplication, checkpoint, and candidate boundary PASS")


if __name__ == "__main__":
    main()
