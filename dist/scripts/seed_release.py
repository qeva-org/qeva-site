#!/usr/bin/env python3
"""Compatibility guard for the immutable QEVA 0.4 logical archive.

The former seed command deleted and regenerated canonical revisions.  That is
incompatible with exact, append-only identifiers.  This replacement performs
only a byte-level audit of the 0.4 baseline and never writes archive data.

Use ``publish_v05.py`` to append the reviewed 0.5 revisions.  Once a revision
path exists, publication refuses to replace it with different bytes.
"""
from __future__ import annotations

import hashlib
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "legacy" / "repository-layout-v0.4" / "dist-MANIFEST.sha256"
BASELINE_MANIFEST_SHA256 = "c9cbaf8a9d63180cee44c316117beae98437f00c8fde462d5ab13d52d8f1213b"
ROW = re.compile(r"^([0-9a-f]{64})  (.+)$")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def baseline_rows() -> dict[str, str]:
    if not BASELINE.is_file():
        raise SystemExit(f"missing immutable baseline manifest: {BASELINE}")
    if sha256(BASELINE) != BASELINE_MANIFEST_SHA256:
        raise SystemExit("immutable v0.4 baseline manifest digest mismatch")
    rows: dict[str, str] = {}
    for number, line in enumerate(BASELINE.read_text(encoding="utf-8").splitlines(), 1):
        match = ROW.fullmatch(line)
        if not match:
            raise SystemExit(f"invalid baseline manifest row {number}")
        digest, relative = match.groups()
        if relative.startswith("archive/objects/") and relative.count("/") == 2:
            rows[relative] = digest
    if len(rows) != 148:
        raise SystemExit(f"expected 148 immutable v0.4 object revisions, found {len(rows)}")
    return rows


def verify_baseline() -> int:
    rows = baseline_rows()
    failures: list[str] = []
    for relative, expected in sorted(rows.items()):
        path = ROOT / relative
        if not path.is_file():
            failures.append(f"missing {relative}")
        elif sha256(path) != expected:
            failures.append(f"byte mismatch {relative}")
    if failures:
        raise SystemExit("immutable v0.4 archive audit failed:\n- " + "\n- ".join(failures))
    return len(rows)


def main() -> None:
    count = verify_baseline()
    print(f"append-only guard: {count} v0.4 object revisions match their immutable baseline")
    print("append-only guard: no files modified; use scripts/publish_v05.py for new revisions")


if __name__ == "__main__":
    main()
