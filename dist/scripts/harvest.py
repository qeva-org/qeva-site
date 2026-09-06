#!/usr/bin/env python3
"""Compatibility entry point for the rights-aware QEVA Harvester 0.2."""
from pathlib import Path
import runpy


if __name__ == "__main__":
    target = Path(__file__).resolve().parents[1] / "harvester" / "harvest.py"
    runpy.run_path(str(target), run_name="__main__")
