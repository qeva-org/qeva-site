#!/usr/bin/env python3
"""Build the deterministic, self-contained QEVA project ZIP."""
from __future__ import annotations

import argparse
import hashlib
import os
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath


PROJECT = Path(__file__).resolve().parents[1]
PREFIX = PurePosixPath(".")
FIXED_TIME = (1980, 1, 1, 0, 0, 0)
ROOT_FILES = (
    Path(".gitignore"),
    Path(".openai/hosting.json"),
    Path("README.md"),
    Path("vercel.json"),
    Path("scripts/package_release.py"),
)
FORBIDDEN_PARTS = {
    ".git", "__pycache__", ".pytest_cache", ".mypy_cache", ".qeva-bag.build",
    "private", "quarantine", "runtime", "runs", ".aws", ".ssh",
}
FORBIDDEN_NAMES = {".DS_Store", "Thumbs.db"}


def validate_relative(path: Path) -> None:
    if "\\" in path.as_posix():
        raise SystemExit(f"unsafe package path: {path}")
    pure = PurePosixPath(path.as_posix())
    if pure.is_absolute() or any(part in {"", ".", ".."} for part in pure.parts):
        raise SystemExit(f"unsafe package path: {path}")
    if any(":" in part or any(ord(char) < 32 for char in part) for part in pure.parts):
        raise SystemExit(f"unsafe package path: {path}")
    if any(part.casefold() in FORBIDDEN_PARTS for part in pure.parts):
        raise SystemExit(f"forbidden package path: {path}")
    if path.name in FORBIDDEN_NAMES or path.suffix in {".pyc", ".pyo"}:
        raise SystemExit(f"forbidden package file: {path}")
    lower = path.name.casefold()
    if lower == ".env" or (lower.startswith(".env.") and lower != ".env.example") or lower in {"credentials.json", "credentials", "id_rsa", "id_ed25519"} or path.suffix.casefold() in {".pem", ".key", ".sqlite", ".db"}:
        raise SystemExit(f"private credential/database path: {path}")


def collect() -> list[Path]:
    paths = list(ROOT_FILES)
    dist = PROJECT / "dist"
    if not dist.is_dir():
        raise SystemExit("missing dist/")
    paths.extend(path.relative_to(PROJECT) for path in dist.rglob("*") if path.is_file())
    for folder in ("scripts", "docs", "branding", ".github"):
        directory = PROJECT / folder
        if directory.exists():
            paths.extend(path.relative_to(PROJECT) for path in directory.rglob("*") if path.is_file())
    unique = sorted(set(paths), key=lambda path: path.as_posix().encode("utf-8"))
    for relative in unique:
        validate_relative(relative)
        source = PROJECT / relative
        if source.is_symlink() or any(parent.is_symlink() for parent in source.parents if parent != PROJECT.parent) or not source.is_file():
            raise SystemExit(f"package input is not a regular file: {relative}")
    return unique


def verify() -> None:
    environment = os.environ.copy()
    environment["PYTHONDONTWRITEBYTECODE"] = "1"
    result = subprocess.run(
        [sys.executable, "-B", "scripts/check_project.py"],
        cwd=PROJECT,
        env=environment,
        check=False,
    )
    if result.returncode:
        raise SystemExit("release verification failed; ZIP was not built")


def entry(name: str, *, directory: bool, executable: bool = False) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(name + ("/" if directory else ""), FIXED_TIME)
    info.create_system = 3
    info.compress_type = zipfile.ZIP_DEFLATED
    mode = 0o755 if directory or executable else 0o644
    info.external_attr = (mode | (0o040000 if directory else 0o100000)) << 16
    info.flag_bits |= 0x800
    return info


def build(output: Path) -> str:
    if output.suffix.casefold() != ".zip":
        raise SystemExit("release package destination must end in .zip")
    if output == PROJECT or output.is_relative_to(PROJECT):
        raise SystemExit("release package destination must be outside the project tree")
    verify()
    files = collect()
    directories = {PREFIX}
    for relative in files:
        member = PREFIX / PurePosixPath(relative.as_posix())
        directories.update(member.parents)
    directories.discard(PurePosixPath("."))
    output.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=output.name + ".", suffix=".tmp", dir=output.parent)
    os.close(descriptor)
    temporary = Path(temporary_name)
    try:
        with zipfile.ZipFile(temporary, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
            archive.comment = b"QEVA 0.5.1 deterministic project release"
            for directory in sorted(directories, key=lambda path: path.as_posix().encode("utf-8")):
                archive.writestr(entry(directory.as_posix(), directory=True), b"")
            for relative in files:
                source = PROJECT / relative
                data = source.read_bytes()
                executable = data.startswith(b"#!") and relative.suffix in {".py", ".mjs", ".sh"}
                name = (PREFIX / PurePosixPath(relative.as_posix())).as_posix()
                archive.writestr(entry(name, directory=False, executable=executable), data)
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)
    return hashlib.sha256(output.read_bytes()).hexdigest()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", type=Path, help="destination .zip path")
    args = parser.parse_args()
    digest = build(args.output.resolve())
    print(f"{digest}  {args.output.name}")


if __name__ == "__main__":
    main()
