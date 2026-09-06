#!/usr/bin/env python3
"""Run QEVA's independent Canonical, Runtime, and Preservation verification tiers.

Exit codes identify the failing domain so packaging failures cannot masquerade as
mathematical failures: 10 = Tier A, 20 = Tier B, 30 = Tier C.
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path


TIERS = {
    "a": ("Canonical integrity", "verify_canonical.py", 10),
    "b": ("Product/runtime", "verify_runtime.py", 20),
    "c": ("Preservation release", "verify_preservation.py", 30),
}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--tier",
        choices=("all", "a", "b", "c"),
        default="all",
        help="verification tier to run (default: all in release-gate order)",
    )
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="QEVA dist root")
    parser.add_argument("--quiet", action="store_true", help="print only failures and the final result")
    args = parser.parse_args()
    root = args.root.resolve()
    scripts = root / "scripts"
    selected = ("a", "b", "c") if args.tier == "all" else (args.tier,)
    for key in selected:
        title, filename, failure_code = TIERS[key]
        verifier = scripts / filename
        if not verifier.is_file():
            print(f"Tier {key.upper()} / {title} FAILED: missing scripts/{filename}", file=sys.stderr)
            raise SystemExit(failure_code)
        if not args.quiet:
            print(f"== Tier {key.upper()} / {title} ==")
        command = [sys.executable, str(verifier), "--root", str(root)]
        if args.quiet:
            command.append("--quiet")
        result = subprocess.run(command, cwd=root)
        if result.returncode:
            print(f"QEVA verification stopped at Tier {key.upper()} / {title}", file=sys.stderr)
            raise SystemExit(failure_code)
    release_path = root / "RELEASE.json"
    summary = "QEVA release"
    if release_path.is_file():
        try:
            metadata = json.loads(release_path.read_text(encoding="utf-8"))
            summary = (
                f"QEVA {metadata.get('release', 'unknown')} — "
                f"{metadata.get('current_objects', '?')} objects, "
                f"{metadata.get('current_experiments', '?')} experiments, "
                f"{metadata.get('typed_relations', '?')} typed relations"
            )
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            pass
    print(f"{summary}: requested verification tiers PASS")


if __name__ == "__main__":
    main()
