#!/usr/bin/env python3
"""QEVA Harvester 0.2: bounded, rights-gated, provenance-preserving acquisition.

This reference implementation is intentionally small. It preserves raw
responses, keeps provider assertions instead of overwriting disagreements,
and emits only unreviewed candidates whose source assertion explicitly
permits copied-text extraction. It is not a bulk crawler.
"""
from __future__ import annotations

import argparse
import datetime as dt
import email.utils
import hashlib
import html
import json
import os
import re
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterable

VERSION = "0.2"
DEFAULT_AGENT = "QEVA-Harvester/0.2 (+https://qeva.org/sources/)"
DEFAULT_MAX_RESPONSE_BYTES = 16 * 1024 * 1024
MAX_CONFIGURED_RESPONSE_BYTES = 64 * 1024 * 1024
MAX_AUTOMATIC_RETRY_DELAY_SECONDS = 30
SPACE = re.compile(r"\s+")
TAG = re.compile(r"<[^>]+>")
HEX64 = re.compile(r"[0-9a-f]{64}")
WORK_ID = re.compile(r"qeva-work:sha256:[0-9a-f]{64}")
ASSERTION_ID = re.compile(r"qeva-source-assertion:sha256:[0-9a-f]{64}")
UTC_SECOND = re.compile(r"[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z")
RIGHTS_CLASSES = {"metadata-only", "open-license", "public-domain", "restricted", "unknown"}
COPYABLE_RIGHTS = {"open-license", "public-domain"}


class HarvestError(RuntimeError):
    """Base class for failures that must stop the current acquisition."""


class IntegrityError(HarvestError):
    """Stored or normalized bytes violate a declared integrity invariant."""


class RawBlobMismatch(IntegrityError):
    """A digest-named raw blob contains bytes with a different digest."""


class ResponseTooLarge(HarvestError):
    """A response exceeded the configured byte ceiling."""


class RetryDelayExceeded(HarvestError):
    """A provider asked the bounded reference client to pause for an operator."""


class RightsError(IntegrityError):
    """A rights assertion is missing or internally inconsistent."""


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def compact(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def strict_json_loads(text: str):
    def pairs(items):
        value = {}
        for key, item in items:
            if key in value:
                raise IntegrityError(f"duplicate JSON object name {key!r}")
            value[key] = item
        return value

    def constant(value: str):
        raise IntegrityError(f"non-finite JSON number {value}")

    return json.loads(text, object_pairs_hook=pairs, parse_constant=constant)


def digest_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def digest_file(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def _sync_directory(path: Path) -> None:
    try:
        descriptor = os.open(path, os.O_RDONLY)
    except OSError:
        return
    try:
        os.fsync(descriptor)
    except OSError:
        pass
    finally:
        os.close(descriptor)


def atomic_write(path: Path, value: bytes) -> None:
    """Write and replace in one filesystem transaction in the target directory."""
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    temporary = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(value)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
        _sync_directory(path.parent)
    finally:
        if temporary.exists():
            temporary.unlink()


def atomic_append_jsonl(path: Path, value) -> None:
    previous = path.read_bytes() if path.exists() else b""
    if previous and not previous.endswith(b"\n"):
        raise IntegrityError(f"refusing to append to truncated JSONL: {path}")
    atomic_write(path, previous + compact(value))


def clean(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, list):
        value = " ".join(str(item) for item in value)
    text = SPACE.sub(" ", html.unescape(TAG.sub(" ", str(value)))).strip()
    return text or None


def first(value):
    return value[0] if isinstance(value, list) and value else value


def iso_from_parts(parts) -> str | None:
    try:
        values = parts.get("date-parts", [[]])[0]
        if not values:
            return None
        year = int(values[0])
        month = int(values[1]) if len(values) > 1 else 1
        day = int(values[2]) if len(values) > 2 else 1
        return f"{year:04d}-{month:02d}-{day:02d}"
    except (AttributeError, TypeError, ValueError, IndexError):
        return None


def normalize_doi(value: str | None) -> str | None:
    if not value:
        return None
    normalized = value.strip()
    normalized = re.sub(r"^https?://(?:dx\.)?doi\.org/", "", normalized, flags=re.I)
    normalized = re.sub(r"^doi:\s*", "", normalized, flags=re.I)
    normalized = normalized.strip().lower()
    return normalized or None


def normalize_url(value: str | None) -> str | None:
    if not value:
        return None
    value = value.strip()
    try:
        parts = urllib.parse.urlsplit(value)
    except ValueError:
        return value
    if not parts.scheme or not parts.netloc:
        return value
    hostname = (parts.hostname or "").lower()
    port = parts.port
    default_port = (parts.scheme.lower() == "http" and port == 80) or (parts.scheme.lower() == "https" and port == 443)
    authority = hostname if not port or default_port else f"{hostname}:{port}"
    return urllib.parse.urlunsplit((parts.scheme.lower(), authority, parts.path or "/", parts.query, ""))


def normalize_identifiers(identifiers: dict) -> dict[str, str]:
    output = {}
    for key, value in identifiers.items():
        if value is None or str(value).strip() == "":
            continue
        text = str(value).strip()
        if key == "doi":
            text = normalize_doi(text) or ""
        elif key == "url":
            text = normalize_url(text) or ""
        if text:
            output[key] = text
    return output


def identity_basis(provider: str, provider_id: str | None, identifiers: dict) -> str:
    if identifiers.get("doi"):
        return "doi:" + identifiers["doi"]
    if identifiers.get("arxiv"):
        return "arxiv:" + identifiers["arxiv"].lower()
    if identifiers.get("url"):
        return "url:" + identifiers["url"]
    if provider_id:
        return f"provider:{provider}:{provider_id}"
    raise IntegrityError("a source assertion needs a DOI, arXiv ID, URL, or provider ID")


def qeva_work_id(basis: str) -> str:
    return "qeva-work:sha256:" + hashlib.sha256(basis.encode("utf-8")).hexdigest()


def rights(
    basis: str = "No item-level source-text license established by this adapter.",
    klass: str = "metadata-only",
    full_text_mirroring: bool = False,
    text_extraction: bool = False,
) -> dict:
    result = {
        "class": klass,
        "basis": basis,
        "full_text_mirroring": full_text_mirroring,
        "text_extraction": text_extraction,
    }
    validate_rights(result)
    return result


def validate_rights(value: dict) -> None:
    expected = {"class", "basis", "full_text_mirroring", "text_extraction"}
    if not isinstance(value, dict) or set(value) != expected:
        raise RightsError(f"rights must contain exactly {sorted(expected)}")
    if value["class"] not in RIGHTS_CLASSES:
        raise RightsError(f"unknown rights class: {value['class']!r}")
    if not isinstance(value["basis"], str) or not value["basis"].strip():
        raise RightsError("rights basis must be nonempty")
    for field in ("full_text_mirroring", "text_extraction"):
        if not isinstance(value[field], bool):
            raise RightsError(f"rights.{field} must be boolean")
        if value[field] and value["class"] not in COPYABLE_RIGHTS:
            raise RightsError(f"rights.{field}=true requires open-license or public-domain")


def _assertion_digest(assertion: dict) -> str:
    unsigned = {key: value for key, value in assertion.items() if key != "id"}
    return "qeva-source-assertion:sha256:" + digest_bytes(compact(unsigned))


def _merged_identifiers(assertions: list[dict]) -> dict[str, list[str]]:
    values: dict[str, set[str]] = {}
    for assertion in assertions:
        for key, value in assertion["identifiers"].items():
            values.setdefault(key, set()).add(value)
    return {key: sorted(items) for key, items in sorted(values.items())}


def validate_work(item: dict) -> None:
    required = {"corpus_version", "id", "identity_basis", "identifiers", "assertions"}
    if not isinstance(item, dict) or set(item) != required:
        raise IntegrityError(f"normalized work must contain exactly {sorted(required)}")
    if item["corpus_version"] != VERSION:
        raise IntegrityError(f"unsupported corpus version: {item['corpus_version']!r}")
    if not isinstance(item["identity_basis"], str) or not item["identity_basis"]:
        raise IntegrityError("identity_basis must be nonempty")
    if not isinstance(item["id"], str) or item["id"] != qeva_work_id(item["identity_basis"]) or not WORK_ID.fullmatch(item["id"]):
        raise IntegrityError("work ID does not match its identity basis")
    if not isinstance(item["identifiers"], dict):
        raise IntegrityError("work identifiers must be an object")
    for key, values in item["identifiers"].items():
        if not isinstance(key, str) or not key or not isinstance(values, list) or not values:
            raise IntegrityError("work identifier values must be nonempty arrays")
        if any(not isinstance(value, str) or not value for value in values) or len(values) != len(set(values)):
            raise IntegrityError("work identifier arrays must contain unique nonempty strings")
    if not isinstance(item["assertions"], list) or not item["assertions"]:
        raise IntegrityError("normalized work needs at least one source assertion")
    seen = set()
    required_assertion = {
        "id", "provider", "provider_id", "title", "authors", "identifiers", "dates",
        "retrieved", "raw_sha256", "source_locator", "rights",
    }
    optional_assertion = {"abstract", "subjects", "provider_data"}
    for assertion in item["assertions"]:
        if not isinstance(assertion, dict):
            raise IntegrityError("source assertion must be an object")
        keys = set(assertion)
        if not required_assertion <= keys or keys - required_assertion - optional_assertion:
            raise IntegrityError("source assertion has missing or unexpected fields")
        if not isinstance(assertion["id"], str) or not ASSERTION_ID.fullmatch(assertion["id"]):
            raise IntegrityError("source assertion ID is invalid")
        if not isinstance(assertion["provider"], str) or not assertion["provider"]:
            raise IntegrityError("source assertion provider must be nonempty")
        if assertion["provider_id"] is not None and not isinstance(assertion["provider_id"], str):
            raise IntegrityError("source assertion provider_id must be string or null")
        if assertion["title"] is not None and not isinstance(assertion["title"], str):
            raise IntegrityError("source assertion title must be string or null")
        if not isinstance(assertion["authors"], list) or any(not isinstance(author, str) or not author for author in assertion["authors"]):
            raise IntegrityError("source assertion authors must be nonempty strings")
        if not isinstance(assertion["identifiers"], dict) or any(
            not isinstance(key, str) or not key or not isinstance(value, str) or not value
            for key, value in assertion["identifiers"].items()
        ):
            raise IntegrityError("source assertion identifiers must be string pairs")
        if not isinstance(assertion["dates"], dict) or any(
            not isinstance(key, str) or not key or not isinstance(value, str) or not value
            for key, value in assertion["dates"].items()
        ):
            raise IntegrityError("source assertion dates must be string pairs")
        if not isinstance(assertion["retrieved"], str) or not UTC_SECOND.fullmatch(assertion["retrieved"]):
            raise IntegrityError("source assertion retrieved timestamp must be UTC to the second")
        if not isinstance(assertion["raw_sha256"], str) or not HEX64.fullmatch(assertion["raw_sha256"]):
            raise IntegrityError("source assertion raw_sha256 is invalid")
        locator = assertion["source_locator"]
        if not isinstance(locator, dict) or set(locator) != {"kind", "value"} or not all(isinstance(locator[k], str) and locator[k] for k in locator):
            raise IntegrityError("source locator must contain nonempty kind and value")
        validate_rights(assertion["rights"])
        if "abstract" in assertion and (not isinstance(assertion["abstract"], str) or not assertion["abstract"]):
            raise IntegrityError("source assertion abstract must be a nonempty string")
        if assertion.get("abstract") and not assertion["rights"]["text_extraction"]:
            raise RightsError("source text cannot be stored in the extractable corpus without explicit permission")
        if "subjects" in assertion and (
            not isinstance(assertion["subjects"], list)
            or any(not isinstance(subject, str) or not subject for subject in assertion["subjects"])
            or len(assertion["subjects"]) != len(set(assertion["subjects"]))
        ):
            raise IntegrityError("source assertion subjects must be unique nonempty strings")
        if "provider_data" in assertion and not isinstance(assertion["provider_data"], dict):
            raise IntegrityError("source assertion provider_data must be an object")
        if assertion["id"] != _assertion_digest(assertion):
            raise IntegrityError("source assertion ID does not match its content")
        if assertion["id"] in seen:
            raise IntegrityError("duplicate source assertion ID")
        seen.add(assertion["id"])
    if item["identifiers"] != _merged_identifiers(item["assertions"]):
        raise IntegrityError("work identifiers do not equal the union of source assertions")


def work(
    provider: str,
    provider_id: str | None,
    title: str | None,
    authors: list[str],
    identifiers: dict,
    dates: dict,
    event: dict,
    *,
    source_locator: dict | None = None,
    abstract: str | None = None,
    subjects: list[str] | None = None,
    rights_value: dict | None = None,
    extra: dict | None = None,
) -> dict:
    item_rights = rights_value or rights()
    validate_rights(item_rights)
    normalized_ids = normalize_identifiers(identifiers)
    basis = identity_basis(provider, provider_id, normalized_ids)
    provider_data = dict(extra or {})
    assertion = {
        "provider": provider,
        "provider_id": provider_id,
        "title": clean(title),
        "authors": [name for name in (clean(name) for name in authors) if name],
        "identifiers": normalized_ids,
        "dates": {key: value for key, value in dates.items() if value},
        "retrieved": event["retrieved"],
        "raw_sha256": event["sha256"],
        "source_locator": source_locator or {"kind": "response", "value": "$"},
        "rights": item_rights,
    }
    if abstract:
        if item_rights["text_extraction"]:
            assertion["abstract"] = clean(abstract)
        else:
            provider_data["abstract_omitted_for_rights"] = True
    if subjects:
        assertion["subjects"] = sorted({value for value in (clean(x) for x in subjects) if value})
    if provider_data:
        assertion["provider_data"] = provider_data
    assertion["id"] = _assertion_digest(assertion)
    item = {
        "corpus_version": VERSION,
        "id": qeva_work_id(basis),
        "identity_basis": basis,
        "identifiers": _merged_identifiers([assertion]),
        "assertions": [assertion],
    }
    validate_work(item)
    return item


class Store:
    def __init__(
        self,
        root: Path,
        provider: str,
        deterministic: bool = False,
        max_response_bytes: int = DEFAULT_MAX_RESPONSE_BYTES,
    ):
        if not 1 <= max_response_bytes <= MAX_CONFIGURED_RESPONSE_BYTES:
            raise ValueError(f"max_response_bytes must be between 1 and {MAX_CONFIGURED_RESPONSE_BYTES}")
        self.root = root
        self.provider = provider
        self.deterministic = deterministic
        self.max_response_bytes = max_response_bytes
        self.root.mkdir(parents=True, exist_ok=True)

    def _quarantine_mismatch(self, raw: Path, expected: str, actual: str) -> Path:
        quarantine = self.root / "quarantine"
        quarantine.mkdir(parents=True, exist_ok=True)
        target = quarantine / f"{raw.name}.expected-{expected}.actual-{actual}.corrupt"
        if target.exists():
            if digest_file(target) != actual:
                raise IntegrityError(f"quarantine collision at {target}")
            raw.unlink()
        else:
            os.replace(raw, target)
        _sync_directory(raw.parent)
        _sync_directory(quarantine)
        return target

    def record(self, url: str, body: bytes, status: int, media_type: str | None, retrieved: str | None = None) -> dict:
        if len(body) > self.max_response_bytes:
            raise ResponseTooLarge(f"response has {len(body)} bytes; limit is {self.max_response_bytes}")
        digest = digest_bytes(body)
        suffix = ".xml" if media_type and "xml" in media_type else ".json" if media_type and "json" in media_type else ".bin"
        raw = self.root / "raw" / f"{digest}{suffix}"
        raw.parent.mkdir(parents=True, exist_ok=True)
        if raw.exists():
            if raw.is_symlink() or not raw.is_file():
                raise IntegrityError(f"raw path is not a regular file: {raw}")
            actual = digest_file(raw)
            if actual != digest:
                quarantined = self._quarantine_mismatch(raw, digest, actual)
                raise RawBlobMismatch(f"raw blob mismatch quarantined at {quarantined}")
        else:
            atomic_write(raw, body)
            actual = digest_file(raw)
            if actual != digest:
                quarantined = self._quarantine_mismatch(raw, digest, actual)
                raise RawBlobMismatch(f"new raw blob failed verification and was quarantined at {quarantined}")
        base_event = {
            "event_version": VERSION,
            "provider": self.provider,
            "request_url": url,
            "retrieved": retrieved or ("2000-01-01T00:00:00Z" if self.deterministic else now()),
            "http_status": status,
            "media_type": media_type,
            "byte_length": len(body),
            "max_response_bytes": self.max_response_bytes,
            "sha256": digest,
            "storage_path": raw.relative_to(self.root).as_posix(),
        }
        event = dict(base_event)
        event["id"] = "qeva-retrieval:sha256:" + digest_bytes(compact(base_event))
        ledger = self.root / "ledger.jsonl"
        if ledger.exists():
            if ledger.is_symlink() or not ledger.is_file():
                raise IntegrityError(f"ledger path is not a regular file: {ledger}")
            for number, line in enumerate(ledger.read_text(encoding="utf-8").splitlines(), start=1):
                if not line.strip():
                    continue
                prior = strict_json_loads(line)
                if not isinstance(prior, dict) or not isinstance(prior.get("id"), str):
                    raise IntegrityError(f"invalid retrieval event at ledger line {number}")
                if prior["id"] == event["id"]:
                    if prior != event:
                        raise IntegrityError("retrieval event ID collision")
                    return event
        atomic_append_jsonl(ledger, event)
        return event

    def write_works(self, works: Iterable[dict]) -> int:
        path = self.root / "normalized.jsonl"
        existing: dict[str, dict] = {}
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    item = strict_json_loads(line)
                    validate_work(item)
                    existing[item["id"]] = item
        for item in works:
            validate_work(item)
            previous = existing.get(item["id"])
            if previous is None:
                existing[item["id"]] = item
                continue
            if previous["identity_basis"] != item["identity_basis"]:
                raise IntegrityError("work ID collision across different identity bases")
            assertions = {entry["id"]: entry for entry in previous["assertions"]}
            for assertion in item["assertions"]:
                prior_assertion = assertions.get(assertion["id"])
                if prior_assertion is not None and prior_assertion != assertion:
                    raise IntegrityError("source assertion ID collision")
                assertions[assertion["id"]] = assertion
            merged_assertions = [assertions[key] for key in sorted(assertions)]
            merged = {
                "corpus_version": VERSION,
                "id": item["id"],
                "identity_basis": item["identity_basis"],
                "identifiers": _merged_identifiers(merged_assertions),
                "assertions": merged_assertions,
            }
            validate_work(merged)
            existing[item["id"]] = merged
        normalized = b"".join(compact(existing[key]) for key in sorted(existing))
        atomic_write(path, normalized)
        assertion_count = sum(len(item["assertions"]) for item in existing.values())
        checkpoint = {
            "harvester_version": VERSION,
            "provider": self.provider,
            "updated": "2000-01-01T00:00:00Z" if self.deterministic else now(),
            "unique_works": len(existing),
            "source_assertions": assertion_count,
        }
        atomic_write(self.root / "checkpoint.json", compact(checkpoint))
        return len(existing)


def read_bounded(response, limit: int) -> bytes:
    length = response.headers.get("Content-Length") if getattr(response, "headers", None) else None
    if length:
        try:
            if int(length) > limit:
                raise ResponseTooLarge(f"declared response length {length} exceeds limit {limit}")
        except ValueError:
            pass
    body = response.read(limit + 1)
    if len(body) > limit:
        raise ResponseTooLarge(f"response exceeds limit {limit}")
    return body


def request(url: str, store: Store, *, attempts: int = 5, timeout: int = 45, agent: str = DEFAULT_AGENT) -> tuple[bytes, dict]:
    for attempt in range(attempts):
        req = urllib.request.Request(url, headers={"User-Agent": agent, "Accept-Encoding": "identity"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = read_bounded(response, store.max_response_bytes)
                event = store.record(url, body, response.status, response.headers.get_content_type())
                return body, event
        except urllib.error.HTTPError as exc:
            body = read_bounded(exc, store.max_response_bytes)
            store.record(url, body, exc.code, exc.headers.get_content_type())
            if exc.code not in (429, 500, 502, 503, 504) or attempt + 1 == attempts:
                raise
            retry = exc.headers.get("Retry-After")
            if retry and retry.isdigit():
                delay = int(retry)
            elif retry:
                try:
                    delay = max(0, int((email.utils.parsedate_to_datetime(retry) - dt.datetime.now(dt.timezone.utc)).total_seconds()))
                except (TypeError, ValueError):
                    delay = 2 ** attempt
            else:
                delay = 2 ** attempt
        except (urllib.error.URLError, TimeoutError):
            if attempt + 1 == attempts:
                raise
            delay = 2 ** attempt
        if delay > MAX_AUTOMATIC_RETRY_DELAY_SECONDS:
            raise RetryDelayExceeded(
                f"provider requested a {delay}s retry delay; stopping instead of retrying before that limit"
            )
        time.sleep(delay)
    raise RuntimeError("unreachable")


def fetch_openalex(query: str, limit: int, store: Store, mailto: str | None) -> list[dict]:
    output, cursor = [], "*"
    while len(output) < limit and cursor:
        params = {"search": query, "per-page": min(200, limit - len(output)), "cursor": cursor}
        if mailto:
            params["mailto"] = mailto
        url = "https://api.openalex.org/works?" + urllib.parse.urlencode(params)
        body, event = request(url, store)
        payload = strict_json_loads(body)
        results = payload.get("results", [])
        for index, item in enumerate(results):
            ids = item.get("ids") or {}
            authors = [((entry.get("author") or {}).get("display_name")) for entry in item.get("authorships", [])]
            doi = normalize_doi(ids.get("doi"))
            output.append(work(
                "openalex", item.get("id"), item.get("display_name"), authors,
                {"doi": doi, "openalex": item.get("id"), "url": (item.get("primary_location") or {}).get("landing_page_url")},
                {"publication": item.get("publication_date")}, event,
                source_locator={"kind": "json-pointer", "value": f"/results/{index}"},
                subjects=[topic.get("display_name") for topic in item.get("topics", [])],
                extra={"cited_by_count": item.get("cited_by_count"), "type": item.get("type")},
            ))
        cursor = (payload.get("meta") or {}).get("next_cursor")
        if not results:
            break
    return output[:limit]


def fetch_crossref(query: str, limit: int, store: Store, mailto: str | None) -> list[dict]:
    output, cursor = [], "*"
    agent = DEFAULT_AGENT if not mailto else f"QEVA-Harvester/0.2 (mailto:{mailto}; https://qeva.org/sources/)"
    while len(output) < limit and cursor:
        params = {"query": query, "rows": min(1000, limit - len(output)), "cursor": cursor}
        if mailto:
            params["mailto"] = mailto
        url = "https://api.crossref.org/works?" + urllib.parse.urlencode(params)
        body, event = request(url, store, agent=agent)
        message = strict_json_loads(body).get("message", {})
        items = message.get("items", [])
        for index, item in enumerate(items):
            authors = [" ".join(filter(None, (author.get("given"), author.get("family")))) for author in item.get("author", [])]
            doi = normalize_doi(item.get("DOI"))
            license_urls = [entry.get("URL") for entry in item.get("license", []) if entry.get("URL")]
            item_rights = rights("Crossref bibliographic metadata harvested; no item-level source-text reuse was established.")
            output.append(work(
                "crossref", doi, first(item.get("title")), authors,
                {"doi": doi, "url": item.get("URL")},
                {"published": iso_from_parts(item.get("published") or {}), "created": iso_from_parts(item.get("created") or {})},
                event,
                source_locator={"kind": "json-pointer", "value": f"/message/items/{index}"},
                abstract=None,
                subjects=item.get("subject", []),
                rights_value=item_rights,
                extra={
                    "type": item.get("type"),
                    "licenses_signaled": license_urls,
                    "references_count": item.get("references-count"),
                    "abstract_signaled_but_omitted": bool(item.get("abstract")),
                },
            ))
        cursor = message.get("next-cursor")
        if not items:
            break
    return output[:limit]


def atom_text(entry, name: str, ns: dict) -> str | None:
    node = entry.find(name, ns)
    return clean(node.text) if node is not None else None


def split_arxiv_expression(value: str) -> tuple[str, str | None]:
    match = re.fullmatch(r"(.+?)(v[1-9][0-9]*)?", value)
    if not match:
        return value, None
    return match.group(1), match.group(2)


def fetch_arxiv(query: str, limit: int, store: Store, _mailto: str | None) -> list[dict]:
    output, start = [], 0
    ns = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
    while len(output) < limit:
        size = min(100, limit - len(output))
        params = {"search_query": query, "start": start, "max_results": size, "sortBy": "submittedDate", "sortOrder": "descending"}
        url = "https://export.arxiv.org/api/query?" + urllib.parse.urlencode(params)
        body, event = request(url, store)
        root = ET.fromstring(body)
        entries = root.findall("a:entry", ns)
        for index, entry in enumerate(entries):
            url_id = atom_text(entry, "a:id", ns)
            expression = (url_id or "").rsplit("/", 1)[-1]
            arxiv_id, version = split_arxiv_expression(expression)
            authors = [atom_text(author, "a:name", ns) or "" for author in entry.findall("a:author", ns)]
            doi = normalize_doi(atom_text(entry, "arxiv:doi", ns))
            license_node = entry.find("arxiv:license", ns)
            license_url = license_node.attrib.get("href") if license_node is not None else None
            output.append(work(
                "arxiv", expression, atom_text(entry, "a:title", ns), authors,
                {"arxiv": arxiv_id, "arxiv_expression": expression, "arxiv_version": version, "doi": doi, "url": url_id},
                {"published": atom_text(entry, "a:published", ns), "updated": atom_text(entry, "a:updated", ns)},
                event,
                source_locator={"kind": "xpath-index", "value": f"/feed/entry[{index + 1}]"},
                abstract=atom_text(entry, "a:summary", ns),
                subjects=[node.attrib.get("term", "") for node in entry.findall("a:category", ns)],
                rights_value=rights("arXiv metadata harvested; no submission-specific source-text license was qualified by this adapter."),
                extra={"license_signaled": license_url, "abstract_signaled": atom_text(entry, "a:summary", ns) is not None},
            ))
        if len(entries) < size:
            break
        start += len(entries)
        if len(output) < limit:
            time.sleep(3)
    return output[:limit]


def fetch_commoncrawl(query: str, limit: int, store: Store, _mailto: str | None) -> list[dict]:
    coll_url = "https://index.commoncrawl.org/collinfo.json"
    coll_body, _ = request(coll_url, store)
    collections = strict_json_loads(coll_body)
    if not collections:
        return []
    collection = collections[0]
    params = {"url": query, "output": "json", "filter": "status:200", "pageSize": min(limit, 1000)}
    url = collection["cdx-api"] + "?" + urllib.parse.urlencode(params)
    body, event = request(url, store)
    output = []
    for line_number, line in enumerate(body.decode("utf-8", "replace").splitlines(), 1):
        if not line.strip():
            continue
        item = strict_json_loads(line)
        target = item.get("url")
        output.append(work(
            "commoncrawl", item.get("digest"), target, [], {"url": target},
            {"crawl_timestamp": item.get("timestamp")}, event,
            source_locator={"kind": "jsonl-line", "value": str(line_number)},
            rights_value=rights("A crawl-index record is discovery metadata; crawling does not grant source-text reuse rights."),
            extra={
                "crawl": collection.get("id"), "warc_filename": item.get("filename"),
                "warc_offset": item.get("offset"), "warc_length": item.get("length"),
                "mime": item.get("mime"), "language": item.get("languages"),
            },
        ))
        if len(output) >= limit:
            break
    return output


FETCHERS = {"openalex": fetch_openalex, "crossref": fetch_crossref, "arxiv": fetch_arxiv, "commoncrawl": fetch_commoncrawl}


def demo(store: Store) -> int:
    payload = {
        "source": "QEVA deterministic demo fixture",
        "results": [
            {
                "id": "demo:1", "title": "A note on recurrence", "authors": ["Ada Example"], "year": "2024",
                "doi": "10.0000/qeva.demo.1",
                "abstract": "Definition: A recurrence specifies later terms from earlier data. Theorem: Every finite orbit is eventually periodic.",
            },
            {
                "id": "demo:2", "title": "Parity and invariant arguments", "authors": ["Emmy Example"], "year": "2025",
                "abstract": "We conjecture that the parity invariant determines the reachable component. Question: does the converse hold?",
            },
        ],
    }
    url = "fixture://qeva/harvester-v2"
    event = store.record(url, compact(payload), 200, "application/json", "2000-01-01T00:00:00Z")
    works = []
    for index, item in enumerate(payload["results"]):
        works.append(work(
            "demo", item["id"], item["title"], item["authors"],
            {"doi": item.get("doi"), "url": url + "#" + item["id"]}, {"published": item["year"]}, event,
            source_locator={"kind": "json-pointer", "value": f"/results/{index}"},
            abstract=item["abstract"],
            rights_value=rights("Original CC0 QEVA test fixture.", "open-license", True, True),
        ))
    return store.write_works(works)


LABELS = [
    ("definition", re.compile(r"\b(?:definition|we define)\b[\s.:—-]*", re.I)),
    ("theorem", re.compile(r"\b(?:theorem|proposition|lemma)\b[\s.:—-]*", re.I)),
    ("conjecture", re.compile(r"\b(?:conjecture|we conjecture)\b[\s.:—-]*", re.I)),
    ("counterexample", re.compile(r"\bcounterexample\b[\s.:—-]*", re.I)),
    ("open-question", re.compile(r"\b(?:open question|question)\b[\s.:—-]*", re.I)),
]


def sentences(text: str) -> list[str]:
    return [part.strip() for part in re.split(r"(?<=[.!?])\s+|\n+", clean(text) or "") if 20 <= len(part.strip()) <= 1000]


def extract(input_path: Path, output_path: Path) -> int:
    candidates = {}
    with input_path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            item = strict_json_loads(line)
            validate_work(item)
            for assertion in item["assertions"]:
                if not assertion["rights"]["text_extraction"]:
                    continue
                for field in ("title", "abstract"):
                    for sentence_index, sentence in enumerate(sentences(assertion.get(field) or "")):
                        kind = next((name for name, pattern in LABELS if pattern.search(sentence)), None)
                        if not kind:
                            continue
                        key = "|".join((assertion["id"], field, str(sentence_index), kind, sentence))
                        candidate_id = "qeva-candidate:sha256:" + hashlib.sha256(key.encode("utf-8")).hexdigest()
                        candidates[candidate_id] = {
                            "candidate_version": VERSION,
                            "id": candidate_id,
                            "work_id": item["id"],
                            "source_assertion_id": assertion["id"],
                            "raw_sha256": assertion["raw_sha256"],
                            "kind": kind,
                            "text": sentence,
                            "locator": {
                                "normalized_jsonl_line": line_number,
                                "source": assertion["source_locator"],
                                "field": field,
                                "sentence": sentence_index,
                            },
                            "method": "QEVA Harvester 0.2 explicit-label sentence heuristic",
                            "rights_class": assertion["rights"]["class"],
                            "status": "unreviewed-candidate",
                        }
    atomic_write(output_path, b"".join(compact(candidates[key]) for key in sorted(candidates)))
    return len(candidates)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    sub = root.add_subparsers(dest="command", required=True)
    demo_command = sub.add_parser("demo", help="run an offline deterministic fixture")
    demo_command.add_argument("--out", type=Path, required=True)
    demo_command.add_argument("--max-response-bytes", type=int, default=DEFAULT_MAX_RESPONSE_BYTES)
    fetch_command = sub.add_parser("fetch", help="run a bounded live metadata query")
    fetch_command.add_argument("provider", choices=sorted(FETCHERS))
    fetch_command.add_argument("query")
    fetch_command.add_argument("--limit", type=int, default=100)
    fetch_command.add_argument("--out", type=Path, required=True)
    fetch_command.add_argument("--mailto")
    fetch_command.add_argument("--max-response-bytes", type=int, default=DEFAULT_MAX_RESPONSE_BYTES)
    extract_command = sub.add_parser("extract", help="extract rights-permitted, explicitly labelled candidates")
    extract_command.add_argument("input", type=Path)
    extract_command.add_argument("--out", type=Path, required=True)
    return root


def main() -> None:
    args = parser().parse_args()
    try:
        if args.command == "demo":
            total = demo(Store(args.out, "demo", deterministic=True, max_response_bytes=args.max_response_bytes))
            print(f"demo: {total} normalized works; raw response and provider assertions preserved in {args.out}")
            return
        if args.command == "extract":
            total = extract(args.input, args.out)
            print(f"extract: {total} rights-permitted unreviewed candidates -> {args.out}")
            return
        if not 1 <= args.limit <= 10000:
            raise HarvestError("--limit must be between 1 and 10000")
        store = Store(args.out, args.provider, max_response_bytes=args.max_response_bytes)
        works = FETCHERS[args.provider](args.query, args.limit, store, args.mailto)
        total = store.write_works(works)
        print(f"fetch: received {len(works)} assertions; {total} reconciled works in {args.out / 'normalized.jsonl'}")
    except (HarvestError, urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ET.ParseError, json.JSONDecodeError, ValueError) as exc:
        raise SystemExit(f"harvest stopped safely: {exc}") from exc


if __name__ == "__main__":
    main()
