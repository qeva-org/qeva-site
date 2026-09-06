#!/usr/bin/env python3
"""Offline integrity, rights, and reproducibility tests for QEVA Harvester 0.2."""
from __future__ import annotations

import hashlib
import importlib.util
import io
import json
import subprocess
import sys
import tempfile
from email.message import Message
from pathlib import Path
from urllib.error import HTTPError

sys.dont_write_bytecode = True

SCRIPT = Path(__file__).resolve()
HARVEST = SCRIPT.parents[1] / "harvester" / "harvest.py"


def command(*args: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, "-B", str(HARVEST), *args],
        check=check,
        text=True,
        capture_output=True,
    )


def jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def load_harvester():
    specification = importlib.util.spec_from_file_location("qeva_harvester", HARVEST)
    assert specification and specification.loader
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


def expect(exception, action) -> None:
    try:
        action()
    except exception:
        return
    raise AssertionError(f"expected {exception.__name__}")


def test_determinism_and_candidate_boundary(root: Path, harvester) -> None:
    left, right = root / "left", root / "right"
    command("demo", "--out", str(left))
    command("demo", "--out", str(right))
    for name in ("normalized.jsonl", "checkpoint.json", "ledger.jsonl"):
        assert (left / name).read_bytes() == (right / name).read_bytes(), f"non-deterministic {name}"

    raw_files = list((left / "raw").glob("*"))
    events = jsonl(left / "ledger.jsonl")
    works = jsonl(left / "normalized.jsonl")
    assert len(raw_files) == 1
    assert len(events) == 1 and len(works) == 2
    raw = left / events[0]["storage_path"]
    assert hashlib.sha256(raw.read_bytes()).hexdigest() == events[0]["sha256"]
    assert all(work["corpus_version"] == "0.2" for work in works)
    assert sum(len(work["assertions"]) for work in works) == 2
    assert all(assertion["rights"]["text_extraction"] for work in works for assertion in work["assertions"])

    candidates = left / "candidates.jsonl"
    command("extract", str(left / "normalized.jsonl"), "--out", str(candidates))
    extracted = jsonl(candidates)
    assert len(extracted) == 4, f"expected 4 explicit-label candidates, got {len(extracted)}"
    assert {item["kind"] for item in extracted} == {"definition", "theorem", "conjecture", "open-question"}
    assert all(item["status"] == "unreviewed-candidate" for item in extracted)
    assert all(item["rights_class"] == "open-license" for item in extracted)
    assert all(item["source_assertion_id"].startswith("qeva-source-assertion:sha256:") for item in extracted)
    assert all(item["raw_sha256"] == events[0]["sha256"] for item in extracted)

    original_normalized = (left / "normalized.jsonl").read_bytes()
    original_ledger = (left / "ledger.jsonl").read_bytes()
    command("demo", "--out", str(left))
    assert len(jsonl(left / "ledger.jsonl")) == 1
    assert (left / "ledger.jsonl").read_bytes() == original_ledger
    assert (left / "normalized.jsonl").read_bytes() == original_normalized
    assert not list(left.rglob("*.tmp"))


def test_raw_fixity_and_bounds(root: Path, harvester) -> None:
    corrupt_run = root / "corrupt-run"
    command("demo", "--out", str(corrupt_run))
    event = jsonl(corrupt_run / "ledger.jsonl")[0]
    raw = corrupt_run / event["storage_path"]
    raw.write_bytes(b"corrupted-existing-blob")
    failed = command("demo", "--out", str(corrupt_run), check=False)
    assert failed.returncode != 0
    assert "mismatch quarantined" in failed.stderr
    quarantined = list((corrupt_run / "quarantine").glob("*.corrupt"))
    assert len(quarantined) == 1
    assert quarantined[0].read_bytes() == b"corrupted-existing-blob"
    assert len(jsonl(corrupt_run / "ledger.jsonl")) == 1, "failed fixity check must not create a retrieval event"

    bounded = harvester.Store(root / "bounded", "fixture", deterministic=True, max_response_bytes=4)
    expect(
        harvester.ResponseTooLarge,
        lambda: bounded.record("fixture://oversize", b"12345", 200, "application/json"),
    )
    assert not (root / "bounded" / "ledger.jsonl").exists()


def test_rights_enforcement(root: Path, harvester) -> None:
    expect(
        harvester.RightsError,
        lambda: harvester.rights("not redistributable", "restricted", True, False),
    )
    expect(
        harvester.RightsError,
        lambda: harvester.rights("not extractable", "metadata-only", False, True),
    )
    expect(
        harvester.RightsError,
        lambda: harvester.rights("", "open-license", True, True),
    )

    store = harvester.Store(root / "rights-run", "fixture", deterministic=True)
    open_event = store.record("fixture://open", b"open", 200, "application/json")
    restricted_event = store.record("fixture://restricted", b"restricted", 200, "application/json")
    open_work = harvester.work(
        "fixture", "open", "Theorem: Open extraction is permitted.", [], {"url": "https://example.test/open"}, {}, open_event,
        source_locator={"kind": "json-pointer", "value": "/open"},
        abstract="Definition: This source sentence may be copied.",
        rights_value=harvester.rights("CC0 fixture", "open-license", True, True),
    )
    restricted_work = harvester.work(
        "fixture", "restricted", "Theorem: RESTRICTED_SENTINEL must remain private.", [],
        {"url": "https://example.test/restricted"}, {}, restricted_event,
        source_locator={"kind": "json-pointer", "value": "/restricted"},
        abstract="Definition: RESTRICTED_SENTINEL source wording.",
        rights_value=harvester.rights("No source-text permission", "restricted", False, False),
    )
    store.write_works([open_work, restricted_work])
    restricted_assertion = restricted_work["assertions"][0]
    assert "abstract" not in restricted_assertion
    assert restricted_assertion["provider_data"]["abstract_omitted_for_rights"] is True

    output = root / "rights-run" / "candidates.jsonl"
    count = harvester.extract(root / "rights-run" / "normalized.jsonl", output)
    text = output.read_text(encoding="utf-8")
    assert count == 2
    assert "RESTRICTED_SENTINEL" not in text
    assert all(item["rights_class"] == "open-license" for item in jsonl(output))


def test_provider_assertion_merge(root: Path, harvester) -> None:
    store = harvester.Store(root / "merge-run", "fixture", deterministic=True)
    event_a = store.record("fixture://openalex", b"openalex", 200, "application/json")
    event_b = store.record("fixture://crossref", b"crossref", 200, "application/json")
    left = harvester.work(
        "openalex", "W1", "Provider title A", ["Ada A"],
        {"doi": "https://doi.org/10.1234/QEVA.TEST", "url": "https://example.test/a"},
        {"published": "2020-01-01"}, event_a,
        source_locator={"kind": "json-pointer", "value": "/results/0"},
    )
    right = harvester.work(
        "crossref", "10.1234/qeva.test", "Conflicting provider title B", ["Bertrand B"],
        {"doi": "doi:10.1234/qeva.test", "url": "https://example.test/b"},
        {"published": "2021-01-01"}, event_b,
        source_locator={"kind": "json-pointer", "value": "/message/items/0"},
    )
    assert left["id"] == right["id"]
    assert store.write_works([left, right]) == 1
    merged = jsonl(root / "merge-run" / "normalized.jsonl")
    assert len(merged) == 1
    assert len(merged[0]["assertions"]) == 2
    assert {entry["provider"] for entry in merged[0]["assertions"]} == {"openalex", "crossref"}
    assert {entry["title"] for entry in merged[0]["assertions"]} == {"Provider title A", "Conflicting provider title B"}
    assert merged[0]["identifiers"]["doi"] == ["10.1234/qeva.test"]


def test_crossref_abstract_omission(root: Path, harvester) -> None:
    store = harvester.Store(root / "crossref-run", "crossref", deterministic=True)
    payload = {
        "message": {
            "items": [{
                "DOI": "10.5555/example",
                "title": ["A result"],
                "author": [{"given": "Noether", "family": "Example"}],
                "abstract": "<jats:p>Theorem: copyrighted expression.</jats:p>",
                "subject": ["Mathematics"],
            }],
            "next-cursor": None,
        }
    }
    body = harvester.compact(payload)
    original_request = harvester.request

    def fixture_request(url, target_store, **_kwargs):
        return body, target_store.record(url, body, 200, "application/json", "2000-01-01T00:00:00Z")

    harvester.request = fixture_request
    try:
        works = harvester.fetch_crossref("fixture", 1, store, None)
    finally:
        harvester.request = original_request
    assertion = works[0]["assertions"][0]
    assert "abstract" not in assertion
    assert assertion["provider_data"]["abstract_signaled_but_omitted"] is True
    assert assertion["rights"]["text_extraction"] is False


def test_arxiv_version_preservation(root: Path, harvester) -> None:
    store = harvester.Store(root / "arxiv-run", "arxiv", deterministic=True)
    body = b'''<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:arxiv="http://arxiv.org/schemas/atom">
  <entry>
    <id>https://arxiv.org/abs/2401.01234v7</id>
    <updated>2026-01-02T00:00:00Z</updated>
    <published>2024-01-01T00:00:00Z</published>
    <title>A versioned result</title>
    <summary>Theorem: this is an abstract.</summary>
    <author><name>Ada Example</name></author>
    <category term="math.LO" />
  </entry>
</feed>
'''
    original_request = harvester.request

    def fixture_request(url, target_store, **_kwargs):
        return body, target_store.record(url, body, 200, "application/atom+xml", "2000-01-01T00:00:00Z")

    harvester.request = fixture_request
    try:
        works = harvester.fetch_arxiv("fixture", 2, store, None)
    finally:
        harvester.request = original_request
    assertion = works[0]["assertions"][0]
    assert assertion["provider_id"] == "2401.01234v7"
    assert assertion["identifiers"]["arxiv"] == "2401.01234"
    assert assertion["identifiers"]["arxiv_expression"] == "2401.01234v7"
    assert assertion["identifiers"]["arxiv_version"] == "v7"
    assert works[0]["identity_basis"] == "arxiv:2401.01234"
    assert "abstract" not in assertion


def test_retry_after_fail_closed(root: Path, harvester) -> None:
    store = harvester.Store(root / "retry-run", "fixture", deterministic=True)
    headers = Message()
    headers["Content-Type"] = "application/json"
    headers["Retry-After"] = "3600"
    failure = HTTPError("https://example.test/rate-limit", 429, "rate limited", headers, io.BytesIO(b"{}"))
    original_urlopen = harvester.urllib.request.urlopen
    original_sleep = harvester.time.sleep
    slept = []

    def reject(*_args, **_kwargs):
        raise failure

    harvester.urllib.request.urlopen = reject
    harvester.time.sleep = lambda seconds: slept.append(seconds)
    try:
        expect(
            harvester.RetryDelayExceeded,
            lambda: harvester.request("https://example.test/rate-limit", store, attempts=2),
        )
    finally:
        harvester.urllib.request.urlopen = original_urlopen
        harvester.time.sleep = original_sleep
    assert slept == [], "the harvester must never retry before a provider's declared delay"


def main() -> None:
    assert HARVEST.is_file(), f"missing harvester implementation: {HARVEST}"
    harvester = load_harvester()
    with tempfile.TemporaryDirectory(prefix="qeva-harvester-0.2-") as temporary:
        root = Path(temporary)
        test_determinism_and_candidate_boundary(root, harvester)
        test_raw_fixity_and_bounds(root, harvester)
        test_rights_enforcement(root, harvester)
        test_provider_assertion_merge(root, harvester)
        test_crossref_abstract_omission(root, harvester)
        test_arxiv_version_preservation(root, harvester)
        test_retry_after_fail_closed(root, harvester)
    print(
        "harvester 0.2: deterministic output · atomic files · bounded bytes · raw quarantine · "
        "provider assertion preservation · rights-gated extraction · Retry-After fail-closed · Crossref omission · arXiv versions PASS"
    )


if __name__ == "__main__":
    main()
