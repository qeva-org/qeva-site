#!/usr/bin/env python3
"""Tier C: verify QEVA release fixity, BagIt recovery, and export hygiene."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import zipfile
from html.parser import HTMLParser
from pathlib import Path, PurePosixPath
from urllib.parse import unquote, urlsplit


ROOT_MANIFESTS = {"MANIFEST.sha256", "MANIFEST.sha512"}
PUBLIC_EXCLUDED_PREFIXES = ("corpus/runs/", "corpus/private/", "corpus/quarantine/", "runtime/")
BAG_TAG_FILES = {"bagit.txt", "bag-info.txt", "manifest-sha256.txt", "manifest-sha512.txt"}
BAG_TAG_MANIFESTS = {"tagmanifest-sha256.txt", "tagmanifest-sha512.txt"}
FORBIDDEN_COMPONENTS = {
    "__pycache__", ".git", ".pytest_cache", ".mypy_cache", ".qeva-bag.build",
    "private", "secret", "secrets", "quarantine", "runtime", "runs", ".aws", ".ssh",
}
FORBIDDEN_NAMES = {
    ".env", ".env.local", ".env.production", "credentials.json", "secrets.json",
    "id_rsa", "id_ed25519", "service-account.json", "private-data.json",
}
SENTINEL_MARKERS = (
    b"QEVA_" + b"PRIVATE_SENTINEL",
    b"QEVA_" + b"SECRET_SENTINEL",
    b"QEVA_" + b"DO_NOT_EXPORT",
    b"-----BEGIN " + b"PRIVATE KEY-----",
    b"-----BEGIN RSA " + b"PRIVATE KEY-----",
    b"-----BEGIN OPENSSH " + b"PRIVATE KEY-----",
)
AWS_KEY = re.compile(rb"(?<![A-Z0-9])AKIA[A-Z0-9]{16}(?![A-Z0-9])")
BEARER = re.compile(rb"Authorization\s*:\s*Bearer\s+[A-Za-z0-9._~+/-]{20,}", re.I)


class Audit:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.errors: list[str] = []

    def fail(self, message: str) -> None:
        self.errors.append(message)

    def rel(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return str(path)


def digest(path: Path, algorithm: str) -> str:
    value = hashlib.new(algorithm)
    with path.open("rb") as handle:
        while chunk := handle.read(1024 * 1024):
            value.update(chunk)
    return value.hexdigest()


def safe_relpath(audit: Audit, base: Path, raw: str, where: str) -> Path | None:
    if not raw or "\\" in raw or ":" in raw or any(ord(character) < 32 for character in raw):
        audit.fail(f"{where}: unsafe manifest path {raw!r}")
        return None
    pure = PurePosixPath(raw)
    if pure.is_absolute() or any(part in {"", ".", ".."} for part in pure.parts):
        audit.fail(f"{where}: unsafe manifest path {raw!r}")
        return None
    candidate = base.joinpath(*pure.parts)
    try:
        candidate.resolve().relative_to(base.resolve())
    except (OSError, ValueError):
        audit.fail(f"{where}: manifest path escapes its base: {raw!r}")
        return None
    return candidate


def parse_manifest(audit: Audit, base: Path, manifest: Path, algorithm: str) -> dict[str, str]:
    label = audit.rel(manifest)
    if not manifest.is_file():
        audit.fail(f"{label}: missing {algorithm} manifest")
        return {}
    expected_length = hashlib.new(algorithm).digest_size * 2
    rows: dict[str, str] = {}
    try:
        raw = manifest.read_bytes()
        text = raw.decode("utf-8")
        lines = text.splitlines()
    except (OSError, UnicodeDecodeError) as exc:
        audit.fail(f"{label}: unreadable manifest: {exc}")
        return {}
    if raw and (not raw.endswith(b"\n") or b"\r" in raw):
        audit.fail(f"{label}: manifest must use LF line endings and end with LF")
    if not lines:
        audit.fail(f"{label}: empty manifest")
    for number, line in enumerate(lines, 1):
        match = re.fullmatch(r"([0-9a-f]+)  (.+)", line)
        if not match:
            audit.fail(f"{label}:{number}: expected '<lowercase digest><two spaces><path>'")
            continue
        expected, relative = match.groups()
        if len(expected) != expected_length:
            audit.fail(f"{label}:{number}: wrong {algorithm} digest length")
            continue
        if relative in rows:
            audit.fail(f"{label}:{number}: duplicate path {relative!r}")
            continue
        target = safe_relpath(audit, base, relative, f"{label}:{number}")
        rows[relative] = expected
        if target is None:
            continue
        if target.is_symlink():
            audit.fail(f"{label}:{number}: symlink targets are forbidden: {relative}")
        elif not target.is_file():
            audit.fail(f"{label}:{number}: missing regular file {relative}")
        elif digest(target, algorithm) != expected:
            audit.fail(f"{label}:{number}: digest mismatch for {relative}")
    if list(rows) != sorted(rows):
        audit.fail(f"{label}: paths are not in canonical code-point order")
    return rows


def verify_no_symlinks_and_private_paths(audit: Audit) -> list[Path]:
    files: list[Path] = []
    for directory, dirnames, filenames in os.walk(audit.root, followlinks=False):
        base = Path(directory)
        for name in list(dirnames):
            path = base / name
            relative = path.relative_to(audit.root)
            prune = False
            if path.is_symlink():
                audit.fail(f"{relative.as_posix()}: symlinks are forbidden in preservation releases")
                prune = True
            folded_parts = {part.casefold() for part in relative.parts}
            if folded_parts & FORBIDDEN_COMPONENTS:
                audit.fail(f"{relative.as_posix()}: forbidden private/runtime/cache path component")
                prune = True
            if name.casefold() in FORBIDDEN_NAMES or path.suffix.casefold() in {".pyc", ".pyo"}:
                audit.fail(f"{relative.as_posix()}: forbidden credential/cache filename")
                prune = True
            if prune:
                dirnames.remove(name)
        for name in filenames:
            path = base / name
            relative = path.relative_to(audit.root)
            if path.is_symlink():
                audit.fail(f"{relative.as_posix()}: symlinks are forbidden in preservation releases")
            folded_parts = {part.casefold() for part in relative.parts}
            if folded_parts & FORBIDDEN_COMPONENTS:
                audit.fail(f"{relative.as_posix()}: forbidden private/runtime/cache path component")
            if name.casefold() in FORBIDDEN_NAMES or path.suffix.casefold() in {".pyc", ".pyo"}:
                audit.fail(f"{relative.as_posix()}: forbidden credential/cache filename")
            if path.is_file() and not path.is_symlink():
                files.append(path)
    return files


def stream_has_private_sentinel(handle: object) -> bool:
    """Scan a binary stream with overlap so sentinels cannot straddle chunks."""
    tail = b""
    while True:
        chunk = handle.read(1024 * 1024)
        if not chunk:
            return False
        window = tail + chunk
        if any(marker in window for marker in SENTINEL_MARKERS) or AWS_KEY.search(window) or BEARER.search(window):
            return True
        tail = window[-512:]


def verify_private_sentinels(audit: Audit, files: list[Path]) -> None:
    for path in files:
        try:
            with path.open("rb") as handle:
                forbidden = stream_has_private_sentinel(handle)
        except OSError as exc:
            audit.fail(f"{audit.rel(path)}: cannot read during sentinel scan: {exc}")
            continue
        if forbidden:
            audit.fail(f"{audit.rel(path)}: forbidden private/credential sentinel detected")


def verify_embedded_zip_paths(audit: Audit) -> None:
    for archive in sorted((audit.root / "legacy").glob("*.zip")):
        try:
            with zipfile.ZipFile(archive) as handle:
                for info in handle.infolist():
                    name = info.filename
                    pure = PurePosixPath(name)
                    if (
                        "\\" in name or ":" in name or any(ord(character) < 32 for character in name)
                        or pure.is_absolute() or any(part in {"", ".", ".."} for part in pure.parts)
                    ):
                        audit.fail(f"{audit.rel(archive)}: unsafe embedded ZIP member {name!r}")
                    mode = (info.external_attr >> 16) & 0xFFFF
                    if stat.S_ISLNK(mode):
                        audit.fail(f"{audit.rel(archive)}: embedded ZIP symlink {name!r}")
                    folded = {part.casefold() for part in pure.parts}
                    if folded & {"private", "quarantine", "runtime", "__pycache__"} or pure.name.casefold() in FORBIDDEN_NAMES:
                        audit.fail(f"{audit.rel(archive)}: forbidden embedded ZIP path {name!r}")
                    if not info.is_dir():
                        if info.flag_bits & 1:
                            audit.fail(f"{audit.rel(archive)}: encrypted embedded ZIP member cannot be audited: {name!r}")
                        elif info.file_size > 256 * 1024 * 1024:
                            audit.fail(f"{audit.rel(archive)}: embedded ZIP member exceeds the 256 MiB audit bound: {name!r}")
                        else:
                            with handle.open(info) as member:
                                if stream_has_private_sentinel(member):
                                    audit.fail(f"{audit.rel(archive)}: forbidden sentinel inside embedded ZIP member {name!r}")
        except (OSError, RuntimeError, zipfile.BadZipFile) as exc:
            audit.fail(f"{audit.rel(archive)}: unreadable embedded release ZIP: {exc}")


def verify_root_manifests(audit: Audit, files: list[Path]) -> None:
    expected = set()
    for path in files:
        relative = path.relative_to(audit.root).as_posix()
        if relative in ROOT_MANIFESTS:
            continue
        if "__pycache__" in path.relative_to(audit.root).parts or path.suffix == ".pyc":
            continue
        if relative.startswith(PUBLIC_EXCLUDED_PREFIXES):
            continue
        expected.add(relative)
    sha256 = parse_manifest(audit, audit.root, audit.root / "MANIFEST.sha256", "sha256")
    sha512 = parse_manifest(audit, audit.root, audit.root / "MANIFEST.sha512", "sha512")
    if set(sha256) != expected:
        missing, extra = sorted(expected - set(sha256)), sorted(set(sha256) - expected)
        audit.fail(f"MANIFEST.sha256: full release file set mismatch; missing={missing[:8]}, extra={extra[:8]}")
    if set(sha512) != expected:
        missing, extra = sorted(expected - set(sha512)), sorted(set(sha512) - expected)
        audit.fail(f"MANIFEST.sha512: full release file set mismatch; missing={missing[:8]}, extra={extra[:8]}")
    if set(sha256) != set(sha512):
        audit.fail("root SHA-256 and SHA-512 manifests enumerate different paths")


def parse_bag_info(audit: Audit, path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.is_file():
        audit.fail(f"{audit.rel(path)}: missing bag-info.txt")
        return values
    try:
        raw = path.read_bytes()
        text = raw.decode("utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        audit.fail(f"{audit.rel(path)}: unreadable bag-info.txt: {exc}")
        return values
    if raw and (not raw.endswith(b"\n") or b"\r" in raw):
        audit.fail(f"{audit.rel(path)}: must use LF line endings and end with LF")
    for number, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        if ": " not in line:
            audit.fail(f"{audit.rel(path)}:{number}: malformed BagIt tag")
            continue
        key, value = line.split(": ", 1)
        if key in values:
            audit.fail(f"{audit.rel(path)}:{number}: duplicate BagIt tag {key}")
        values[key] = value
    return values


class BagLinkParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.links: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        for attribute in ("href", "src"):
            if values.get(attribute):
                self.links.append(values[attribute] or "")


def verify_bag_html_is_self_contained(audit: Audit, data: Path) -> None:
    """If rendered HTML is carried in the recovery bag, it must not be broken."""
    for page in sorted(data.rglob("*.html")):
        if "legacy" in page.relative_to(data).parts:
            continue
        parser = BagLinkParser()
        try:
            parser.feed(page.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, Exception) as exc:
            audit.fail(f"snapshot/QEVA-BAG/data/{page.relative_to(data).as_posix()}: unreadable HTML: {exc}")
            continue
        for value in parser.links:
            parsed = urlsplit(value)
            if parsed.scheme or parsed.netloc:
                continue
            raw = unquote(parsed.path)
            if "\\" in raw or "\x00" in raw:
                audit.fail(f"snapshot/QEVA-BAG/data/{page.relative_to(data).as_posix()}: unsafe link {value!r}")
                continue
            target = data / raw.lstrip("/") if raw.startswith("/") else page.parent / raw
            try:
                target = target.resolve()
                target.relative_to(data.resolve())
            except (OSError, ValueError):
                audit.fail(f"snapshot/QEVA-BAG/data/{page.relative_to(data).as_posix()}: link escapes bag {value!r}")
                continue
            if not raw or raw.endswith("/") or target.is_dir():
                target /= "index.html"
            if not target.is_file():
                audit.fail(f"snapshot/QEVA-BAG/data/{page.relative_to(data).as_posix()}: broken carried HTML link {value!r}")


def verify_bag(audit: Audit) -> Path | None:
    bag = audit.root / "snapshot" / "QEVA-BAG"
    data = bag / "data"
    if not data.is_dir():
        audit.fail("snapshot/QEVA-BAG/data: missing BagIt payload")
        return None
    bagit = bag / "bagit.txt"
    expected_bagit = b"BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n"
    if not bagit.is_file() or bagit.read_bytes() != expected_bagit:
        audit.fail("snapshot/QEVA-BAG/bagit.txt: unsupported or non-canonical BagIt declaration")
    info = parse_bag_info(audit, bag / "bag-info.txt")
    for field in ("Source-Organization", "Bagging-Date", "External-Identifier", "Payload-Oxum"):
        if not info.get(field):
            audit.fail(f"snapshot/QEVA-BAG/bag-info.txt: missing {field}")
    release_path = audit.root / "RELEASE.json"
    try:
        release = json.loads(release_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
        audit.fail(f"RELEASE.json: unreadable for BagIt binding: {exc}")
        release = {}
    if info.get("External-Identifier") != f"QEVA-{release.get('release')}":
        audit.fail("snapshot/QEVA-BAG/bag-info.txt: External-Identifier does not bind RELEASE.json")
    payload_files = sorted(path for path in data.rglob("*") if path.is_file() and not path.is_symlink())
    payload_paths = {path.relative_to(bag).as_posix() for path in payload_files}
    payload_bytes = sum(path.stat().st_size for path in payload_files)
    if info.get("Payload-Oxum") != f"{payload_bytes}.{len(payload_files)}":
        audit.fail("snapshot/QEVA-BAG/bag-info.txt: Payload-Oxum does not match payload")

    payload_sha256 = parse_manifest(audit, bag, bag / "manifest-sha256.txt", "sha256")
    payload_sha512 = parse_manifest(audit, bag, bag / "manifest-sha512.txt", "sha512")
    if set(payload_sha256) != payload_paths:
        audit.fail("snapshot/QEVA-BAG/manifest-sha256.txt: payload file set is incomplete or excessive")
    if set(payload_sha512) != payload_paths:
        audit.fail("snapshot/QEVA-BAG/manifest-sha512.txt: payload file set is incomplete or excessive")

    tag_sha256 = parse_manifest(audit, bag, bag / "tagmanifest-sha256.txt", "sha256")
    tag_sha512 = parse_manifest(audit, bag, bag / "tagmanifest-sha512.txt", "sha512")
    if set(tag_sha256) != BAG_TAG_FILES:
        audit.fail("snapshot/QEVA-BAG/tagmanifest-sha256.txt: must bind the complete four-file BagIt tag set")
    if set(tag_sha512) != BAG_TAG_FILES:
        audit.fail("snapshot/QEVA-BAG/tagmanifest-sha512.txt: must bind the complete four-file BagIt tag set")
    bag_root_files = {path.name for path in bag.iterdir() if path.is_file()}
    expected_root_files = BAG_TAG_FILES | BAG_TAG_MANIFESTS
    if bag_root_files != expected_root_files:
        audit.fail(f"snapshot/QEVA-BAG: unexpected or missing root tag files: {sorted(bag_root_files ^ expected_root_files)}")
    bag_root_directories = {path.name for path in bag.iterdir() if path.is_dir()}
    if bag_root_directories != {"data"}:
        audit.fail(f"snapshot/QEVA-BAG: unexpected or missing root directories: {sorted(bag_root_directories ^ {'data'})}")

    required_payload = {
        "RELEASE.json", "README.md", "BAG-RECOVERY.txt", "protocol/CORE.txt", "protocol/qeva-object.schema.json",
        "protocol/experiment.schema.json", "protocol/analyzer.schema.json",
        "protocol/observation.schema.json", "protocol/proof-certificate.schema.json",
        "protocol/relation.schema.json", "protocol/qualification.schema.json",
        "protocol/release-envelope.schema.json",
        "archive/all.jsonl", "archive/current.jsonl", "archive/index.json", "archive/current.json",
        "archive/CATALOG.tsv", "archive/qualifications/index.jsonl",
        "experiments/all.jsonl", "experiments/current.jsonl", "experiments/index.json",
        "analyzers/all.jsonl", "analyzers/current.jsonl", "analyzers/index.json",
        "atlas/logical.json", "atlas/history.json", "atlas/fields.json",
        "atlas/frontiers.json", "atlas/relations.jsonl",
        "corpus/source-registry.json", "assets/mechanism-engine.js",
        "harvester/harvest.py", "scripts/verify.py", "scripts/verify_canonical.py", "scripts/publish_v05.py",
        "scripts/test_engine.mjs", "scripts/test_harvester.py",
        "tests/fixtures/engine-fixtures.json",
    }
    relative_payload = {path.relative_to(data).as_posix() for path in payload_files}
    missing_required = sorted(required_payload - relative_payload)
    if missing_required:
        audit.fail(f"snapshot/QEVA-BAG/data: recovery payload omits required files {missing_required}")
    for prefix in ("archive/objects/", "experiments/records/", "analyzers/manifests/", "certificates/", "LICENSES/"):
        if not any(relative.startswith(prefix) for relative in relative_payload):
            audit.fail(f"snapshot/QEVA-BAG/data: recovery payload has no files under {prefix}")

    # The bag is a byte-preserving subset, not a separately generated interpretation.
    for payload_path in payload_files:
        relative = payload_path.relative_to(data)
        source = audit.root / relative
        if not source.is_file():
            audit.fail(f"snapshot/QEVA-BAG/data/{relative.as_posix()}: source release file is missing")
        elif payload_path.read_bytes() != source.read_bytes():
            audit.fail(f"snapshot/QEVA-BAG/data/{relative.as_posix()}: differs from source release byte-for-byte")
    verify_bag_html_is_self_contained(audit, data)
    return data


def verify_recovery(audit: Audit, data: Path | None) -> None:
    if data is None:
        return
    python = sys.executable
    tier_runner = data / "scripts" / "verify.py"
    if tier_runner.is_file():
        try:
            result = subprocess.run(
                [python, "-B", str(tier_runner), "--tier", "a", "--root", str(data), "--quiet"],
                cwd=data, capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            audit.fail("BagIt recovery Tier A replay exceeded 60 seconds")
        else:
            if result.returncode:
                detail = (result.stderr or result.stdout).strip()
                audit.fail("BagIt recovery Tier A replay failed" + (f": {detail}" if detail else ""))
    node = shutil.which("node")
    engine_test = data / "scripts" / "test_engine.mjs"
    fixture = data / "tests" / "fixtures" / "engine-fixtures.json"
    if node is None:
        audit.fail("Node.js is required for the declared engine recovery drill")
    elif engine_test.is_file() and fixture.is_file():
        try:
            result = subprocess.run(
                [node, str(engine_test), str(fixture)],
                cwd=data, capture_output=True, text=True, timeout=60,
            )
        except subprocess.TimeoutExpired:
            audit.fail("BagIt recovery engine replay exceeded 60 seconds")
        else:
            if result.returncode:
                detail = (result.stderr or result.stdout).strip()
                audit.fail("BagIt recovery engine replay failed" + (f": {detail}" if detail else ""))


def verify_bag_archive(audit: Audit) -> None:
    """Prove the downloadable ZIP is the canonical Bag tree and can recover it."""
    try:
        release = json.loads((audit.root / "RELEASE.json").read_text(encoding="utf-8"))["release"]
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, KeyError, TypeError) as exc:
        audit.fail(f"RELEASE.json: cannot locate downloadable BagIt ZIP: {exc}")
        return
    archive_path = audit.root / "snapshot" / f"QEVA-BAG-{release}.zip"
    bag = audit.root / "snapshot" / "QEVA-BAG"
    if not archive_path.is_file() or not bag.is_dir():
        audit.fail(f"snapshot/QEVA-BAG-{release}.zip: missing archive or reference Bag tree")
        return

    expected_files = {
        (PurePosixPath("QEVA-BAG") / PurePosixPath(path.relative_to(bag).as_posix())).as_posix(): path
        for path in bag.rglob("*") if path.is_file() and not path.is_symlink()
    }
    expected_dirs = {"QEVA-BAG/"} | {
        (PurePosixPath("QEVA-BAG") / PurePosixPath(path.relative_to(bag).as_posix())).as_posix() + "/"
        for path in bag.rglob("*") if path.is_dir() and not path.is_symlink()
    }
    expected_names = set(expected_files) | expected_dirs
    expected_order = sorted(expected_dirs, key=lambda name: name.encode("utf-8")) + sorted(
        expected_files, key=lambda name: name.encode("utf-8")
    )
    errors_before = len(audit.errors)
    try:
        with zipfile.ZipFile(archive_path) as archive:
            expected_comment = f"QEVA {release} data-and-engine BagIt snapshot".encode("ascii")
            if archive.comment != expected_comment:
                audit.fail(f"{audit.rel(archive_path)}: non-canonical archive comment")
            infos = archive.infolist()
            names = [info.filename for info in infos]
            if len(names) != len(set(names)):
                audit.fail(f"{audit.rel(archive_path)}: duplicate member names")
            if names != expected_order:
                audit.fail(f"{audit.rel(archive_path)}: members are not in canonical directory-then-file order")
            seen: dict[str, zipfile.ZipInfo] = {}
            for info in infos:
                name = info.filename
                is_dir = info.is_dir()
                body = name[:-1] if is_dir else name
                pure = PurePosixPath(body)
                canonical_name = pure.as_posix() + ("/" if is_dir else "")
                if (
                    not body or "\\" in name or ":" in name
                    or any(ord(character) < 32 for character in name)
                    or pure.is_absolute()
                    or any(part in {"", ".", ".."} for part in pure.parts)
                    or name != canonical_name
                ):
                    audit.fail(f"{audit.rel(archive_path)}: unsafe/non-canonical member {name!r}")
                if info.flag_bits & 1:
                    audit.fail(f"{audit.rel(archive_path)}: encrypted member {name!r}")
                mode = (info.external_attr >> 16) & 0xFFFF
                if stat.S_ISLNK(mode):
                    audit.fail(f"{audit.rel(archive_path)}: symlink member {name!r}")
                expected_mode = 0o040755 if is_dir else (
                    0o100755 if name in expected_files
                    and expected_files[name].suffix in {".py", ".mjs", ".sh"}
                    and expected_files[name].read_bytes().startswith(b"#!")
                    else 0o100644
                )
                if mode != expected_mode:
                    audit.fail(f"{audit.rel(archive_path)}: non-canonical mode {mode:#07o} for {name!r}")
                if info.date_time != (1980, 1, 1, 0, 0, 0):
                    audit.fail(f"{audit.rel(archive_path)}: non-normalized timestamp for {name!r}")
                if info.create_system != 3 or info.compress_type != zipfile.ZIP_DEFLATED:
                    audit.fail(f"{audit.rel(archive_path)}: non-canonical ZIP platform/compression for {name!r}")
                if info.extra or info.comment:
                    audit.fail(f"{audit.rel(archive_path)}: non-canonical per-member metadata for {name!r}")
                if is_dir and info.file_size != 0:
                    audit.fail(f"{audit.rel(archive_path)}: directory member has data: {name!r}")
                seen.setdefault(name, info)

            if set(names) != expected_names:
                missing = sorted(expected_names - set(names))
                extra = sorted(set(names) - expected_names)
                audit.fail(f"{audit.rel(archive_path)}: Bag tree mismatch; missing={missing[:8]}, extra={extra[:8]}")

            for name, source in expected_files.items():
                info = seen.get(name)
                if info is None:
                    continue
                if info.file_size != source.stat().st_size:
                    audit.fail(f"{audit.rel(archive_path)}: size mismatch for {name!r}")
                    continue
                with archive.open(info) as zipped, source.open("rb") as original:
                    while True:
                        actual = zipped.read(1024 * 1024)
                        expected = original.read(1024 * 1024)
                        if actual != expected:
                            audit.fail(f"{audit.rel(archive_path)}: byte mismatch for {name!r}")
                            break
                        if not actual:
                            break

            # Extraction is allowed only after every path, type, tree, and byte
            # check above has succeeded.
            if len(audit.errors) == errors_before:
                with tempfile.TemporaryDirectory(prefix="qeva-bag-recovery-") as temporary:
                    recovered_root = Path(temporary)
                    snapshot = recovered_root / "snapshot"
                    snapshot.mkdir()
                    archive.extractall(snapshot)
                    recovered_bag = snapshot / "QEVA-BAG"
                    shutil.copytree(recovered_bag / "data", recovered_root, dirs_exist_ok=True)
                    recovery_audit = Audit(recovered_root)
                    recovered_data = verify_bag(recovery_audit)
                    verify_recovery(recovery_audit, recovered_data)
                    for error in recovery_audit.errors:
                        audit.fail(f"downloadable BagIt ZIP recovery: {error}")
    except (OSError, RuntimeError, zipfile.BadZipFile, EOFError) as exc:
        audit.fail(f"{audit.rel(archive_path)}: unreadable/corrupt downloadable BagIt ZIP: {exc}")


def verify_recovery_documents(audit: Audit) -> None:
    for relative in ("snapshot/MIRRORING.txt", "snapshot/PRINT-CORE.txt", "protocol/CORE.txt"):
        path = audit.root / relative
        if not path.is_file() or path.stat().st_size < 128:
            audit.fail(f"{relative}: missing or implausibly short recovery document")


def run(root: Path, quiet: bool = False) -> int:
    audit = Audit(root)
    files = verify_no_symlinks_and_private_paths(audit)
    verify_private_sentinels(audit, files)
    verify_embedded_zip_paths(audit)
    verify_root_manifests(audit, files)
    data = verify_bag(audit)
    verify_bag_archive(audit)
    verify_recovery_documents(audit)
    verify_recovery(audit, data)
    if audit.errors:
        print(f"Tier C / preservation FAILED ({len(audit.errors)} issues)", file=sys.stderr)
        for error in audit.errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    if not quiet:
        print("Tier C / preservation PASS — path safety, no symlinks/private sentinels, dual manifests, complete BagIt tags, and clean-room recovery verified")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="QEVA dist root")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    raise SystemExit(run(args.root, args.quiet))


if __name__ == "__main__":
    main()
