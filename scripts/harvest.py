#!/usr/bin/env python3
"""QEVA Harvester v1: bounded, resumable, metadata-first acquisition.

The harvester deliberately does not promote harvested text to mathematical
truth.  It preserves raw responses, writes a retrieval ledger, normalizes
works, and emits only *unreviewed* extraction candidates.

Only Python's standard library is required.
"""
from __future__ import annotations

import argparse
import datetime as dt
import email.utils
import hashlib
import html
import json
import re
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Iterable

VERSION = "0.1"
DEFAULT_AGENT = "QEVA-Harvester/0.1 (+https://qeva.org/sources/)"
SPACE = re.compile(r"\s+")
TAG = re.compile(r"<[^>]+>")


def now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def compact(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def append_jsonl(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("ab") as handle:
        handle.write(compact(value))


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


def stable_work_id(identifiers: dict, title: str | None, year: str | None, authors: list[str]) -> str:
    if identifiers.get("doi"):
        key = "doi:" + identifiers["doi"].lower()
    elif identifiers.get("arxiv"):
        key = "arxiv:" + identifiers["arxiv"].lower()
    elif identifiers.get("url"):
        key = "url:" + identifiers["url"]
    else:
        normalized = SPACE.sub(" ", (title or "untitled").casefold()).strip()
        key = "fallback:" + "|".join((normalized, year or "", (authors[0].casefold() if authors else "")))
    return "qeva-work:sha256:" + hashlib.sha256(key.encode("utf-8")).hexdigest()


def rights(basis: str = "No item-level full-text license established by this adapter.", klass: str = "metadata-only", full_text_mirroring: bool = False) -> dict:
    return {"class": klass, "basis": basis, "full_text_mirroring": full_text_mirroring}


class Store:
    def __init__(self, root: Path, provider: str, deterministic: bool = False):
        self.root = root
        self.provider = provider
        self.deterministic = deterministic
        self.root.mkdir(parents=True, exist_ok=True)

    def record(self, url: str, body: bytes, status: int, media_type: str | None, retrieved: str | None = None) -> dict:
        digest = hashlib.sha256(body).hexdigest()
        suffix = ".xml" if media_type and "xml" in media_type else ".json"
        raw = self.root / "raw" / f"{digest}{suffix}"
        raw.parent.mkdir(parents=True, exist_ok=True)
        if not raw.exists():
            raw.write_bytes(body)
        event = {
            "event_version": "0.1", "provider": self.provider, "request_url": url,
            "retrieved": retrieved or ("2000-01-01T00:00:00Z" if self.deterministic else now()),
            "http_status": status, "media_type": media_type, "byte_length": len(body),
            "sha256": digest, "storage_path": raw.relative_to(self.root).as_posix(),
        }
        append_jsonl(self.root / "ledger.jsonl", event)
        return event

    def write_works(self, works: Iterable[dict]) -> int:
        path = self.root / "normalized.jsonl"
        existing: dict[str, dict] = {}
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    item = json.loads(line)
                    existing[item["id"]] = item
        for item in works:
            existing[item["id"]] = item
        with path.open("wb") as handle:
            for key in sorted(existing):
                handle.write(compact(existing[key]))
        checkpoint = {"harvester_version": VERSION, "provider": self.provider,
                      "updated": "2000-01-01T00:00:00Z" if self.deterministic else now(),
                      "unique_works": len(existing)}
        (self.root / "checkpoint.json").write_bytes(compact(checkpoint))
        return len(existing)


def request(url: str, store: Store, *, attempts: int = 5, timeout: int = 45, agent: str = DEFAULT_AGENT) -> tuple[bytes, dict]:
    for attempt in range(attempts):
        req = urllib.request.Request(url, headers={"User-Agent": agent, "Accept-Encoding": "identity"})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                body = response.read()
                event = store.record(url, body, response.status, response.headers.get_content_type())
                return body, event
        except urllib.error.HTTPError as exc:
            body = exc.read()
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
        time.sleep(min(delay, 30))
    raise RuntimeError("unreachable")


def work(provider: str, provider_id: str | None, title: str | None, authors: list[str], identifiers: dict,
         dates: dict, event: dict, *, abstract: str | None = None, subjects: list[str] | None = None,
         rights_value: dict | None = None, extra: dict | None = None) -> dict:
    year = next((str(value)[:4] for value in dates.values() if value), None)
    item = {
        "corpus_version": "0.1", "id": stable_work_id(identifiers, title, year, authors),
        "provider": provider, "provider_id": provider_id, "title": clean(title),
        "authors": [name for name in (clean(name) for name in authors) if name],
        "identifiers": {key: value for key, value in identifiers.items() if value},
        "dates": {key: value for key, value in dates.items() if value},
        "retrieved": event["retrieved"], "raw_sha256": event["sha256"],
        "rights": rights_value or rights(),
    }
    if abstract:
        item["abstract"] = clean(abstract)
    if subjects:
        item["subjects"] = sorted({value for value in (clean(x) for x in subjects) if value})
    if extra:
        item.update(extra)
    return item


def fetch_openalex(query: str, limit: int, store: Store, mailto: str | None) -> list[dict]:
    output, cursor = [], "*"
    while len(output) < limit and cursor:
        params = {"search": query, "per-page": min(200, limit - len(output)), "cursor": cursor}
        if mailto:
            params["mailto"] = mailto
        url = "https://api.openalex.org/works?" + urllib.parse.urlencode(params)
        body, event = request(url, store)
        payload = json.loads(body)
        for item in payload.get("results", []):
            ids = item.get("ids") or {}
            authors = [((entry.get("author") or {}).get("display_name")) for entry in item.get("authorships", [])]
            doi = (ids.get("doi") or "").removeprefix("https://doi.org/") or None
            output.append(work("openalex", item.get("id"), item.get("display_name"), authors,
                               {"doi": doi, "openalex": item.get("id"), "url": (item.get("primary_location") or {}).get("landing_page_url")},
                               {"publication": item.get("publication_date")}, event,
                               abstract=None, subjects=[topic.get("display_name") for topic in item.get("topics", [])],
                               extra={"cited_by_count": item.get("cited_by_count"), "type": item.get("type")}))
        cursor = (payload.get("meta") or {}).get("next_cursor")
        if not payload.get("results"):
            break
    return output[:limit]


def fetch_crossref(query: str, limit: int, store: Store, mailto: str | None) -> list[dict]:
    output, cursor = [], "*"
    agent = DEFAULT_AGENT if not mailto else f"QEVA-Harvester/0.1 (mailto:{mailto}; https://qeva.org/sources/)"
    while len(output) < limit and cursor:
        params = {"query": query, "rows": min(1000, limit - len(output)), "cursor": cursor}
        if mailto:
            params["mailto"] = mailto
        url = "https://api.crossref.org/works?" + urllib.parse.urlencode(params)
        body, event = request(url, store, agent=agent)
        message = json.loads(body).get("message", {})
        for item in message.get("items", []):
            authors = [" ".join(filter(None, (a.get("given"), a.get("family")))) for a in item.get("author", [])]
            doi = item.get("DOI")
            license_urls = [entry.get("URL") for entry in item.get("license", []) if entry.get("URL")]
            item_rights = rights("Crossref metadata harvested; full text and any abstract require item-level rights review.")
            output.append(work("crossref", doi, first(item.get("title")), authors,
                               {"doi": doi, "url": item.get("URL")},
                               {"published": iso_from_parts(item.get("published") or {}), "created": iso_from_parts(item.get("created") or {})},
                               event, abstract=item.get("abstract"), subjects=item.get("subject", []), rights_value=item_rights,
                               extra={"type": item.get("type"), "licenses_signaled": license_urls, "references_count": item.get("references-count")}))
        cursor = message.get("next-cursor")
        if not message.get("items"):
            break
    return output[:limit]


def atom_text(entry, name: str, ns: dict) -> str | None:
    node = entry.find(name, ns)
    return clean(node.text) if node is not None else None


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
        for entry in entries:
            url_id = atom_text(entry, "a:id", ns)
            arxiv_id = (url_id or "").rsplit("/", 1)[-1]
            arxiv_id = re.sub(r"v\d+$", "", arxiv_id)
            authors = [atom_text(author, "a:name", ns) or "" for author in entry.findall("a:author", ns)]
            doi = atom_text(entry, "arxiv:doi", ns)
            license_url = None
            license_node = entry.find("arxiv:license", ns)
            if license_node is not None:
                license_url = license_node.attrib.get("href")
            output.append(work("arxiv", arxiv_id, atom_text(entry, "a:title", ns), authors,
                               {"arxiv": arxiv_id, "doi": doi, "url": url_id},
                               {"published": atom_text(entry, "a:published", ns), "updated": atom_text(entry, "a:updated", ns)},
                               event, abstract=atom_text(entry, "a:summary", ns),
                               subjects=[node.attrib.get("term", "") for node in entry.findall("a:category", ns)],
                               rights_value=rights("arXiv metadata harvested; the submission license must be checked before mirroring article files."),
                               extra={"license_signaled": license_url}))
        if len(entries) < size:
            break
        start += len(entries)
        time.sleep(3)
    return output[:limit]


def fetch_commoncrawl(query: str, limit: int, store: Store, _mailto: str | None) -> list[dict]:
    coll_url = "https://index.commoncrawl.org/collinfo.json"
    coll_body, _ = request(coll_url, store)
    collections = json.loads(coll_body)
    if not collections:
        return []
    index = collections[0]["cdx-api"]
    params = {"url": query, "output": "json", "filter": "status:200", "pageSize": min(limit, 1000)}
    url = index + "?" + urllib.parse.urlencode(params)
    body, event = request(url, store)
    output = []
    for line in body.decode("utf-8", "replace").splitlines():
        if not line.strip():
            continue
        item = json.loads(line)
        target = item.get("url")
        output.append(work("commoncrawl", item.get("digest"), target, [], {"url": target},
                           {"crawl_timestamp": item.get("timestamp")}, event,
                           rights_value=rights("A crawl-index record is discovery metadata; crawling does not grant redistribution rights."),
                           extra={"crawl": collections[0].get("id"), "warc_filename": item.get("filename"),
                                  "warc_offset": item.get("offset"), "warc_length": item.get("length"),
                                  "mime": item.get("mime"), "language": item.get("languages")}))
        if len(output) >= limit:
            break
    return output


FETCHERS = {"openalex": fetch_openalex, "crossref": fetch_crossref, "arxiv": fetch_arxiv, "commoncrawl": fetch_commoncrawl}


def demo(store: Store) -> int:
    payload = {
        "source": "QEVA deterministic demo fixture", "results": [
            {"id": "demo:1", "title": "A note on recurrence", "authors": ["Ada Example"], "year": "2024",
             "doi": "10.0000/qeva.demo.1", "abstract": "Definition: A recurrence specifies later terms from earlier data. Theorem: Every finite orbit is eventually periodic."},
            {"id": "demo:2", "title": "Parity and invariant arguments", "authors": ["Emmy Example"], "year": "2025",
             "abstract": "We conjecture that the parity invariant determines the reachable component. Question: does the converse hold?"},
        ]}
    url = "fixture://qeva/harvester-v1"
    event = store.record(url, compact(payload), 200, "application/json", "2000-01-01T00:00:00Z")
    works = []
    for item in payload["results"]:
        works.append(work("demo", item["id"], item["title"], item["authors"],
                          {"doi": item.get("doi"), "url": url + "#" + item["id"]}, {"published": item["year"]},
                          event, abstract=item["abstract"], rights_value=rights("Original CC0 QEVA test fixture.", "open-license", True)))
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
    for line_no, line in enumerate(input_path.read_text(encoding="utf-8").splitlines(), 1):
        if not line.strip():
            continue
        item = json.loads(line)
        for field in ("title", "abstract"):
            for sentence_index, sentence in enumerate(sentences(item.get(field) or "")):
                kind = next((name for name, pattern in LABELS if pattern.search(sentence)), None)
                if not kind:
                    continue
                key = "|".join((item["id"], field, str(sentence_index), kind, sentence))
                cid = "qeva-candidate:sha256:" + hashlib.sha256(key.encode("utf-8")).hexdigest()
                candidates[cid] = {
                    "candidate_version": "0.1", "id": cid, "work_id": item["id"], "kind": kind,
                    "text": sentence, "locator": {"jsonl_line": line_no, "field": field, "sentence": sentence_index},
                    "method": "QEVA Harvester v1 explicit-label sentence heuristic",
                    "status": "unreviewed-candidate",
                }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("wb") as handle:
        for cid in sorted(candidates):
            handle.write(compact(candidates[cid]))
    return len(candidates)


def parser() -> argparse.ArgumentParser:
    root = argparse.ArgumentParser(description=__doc__)
    sub = root.add_subparsers(dest="command", required=True)
    demo_cmd = sub.add_parser("demo", help="run an offline deterministic fixture")
    demo_cmd.add_argument("--out", type=Path, required=True)
    fetch_cmd = sub.add_parser("fetch", help="run a bounded live metadata query")
    fetch_cmd.add_argument("provider", choices=sorted(FETCHERS))
    fetch_cmd.add_argument("query")
    fetch_cmd.add_argument("--limit", type=int, default=100)
    fetch_cmd.add_argument("--out", type=Path, required=True)
    fetch_cmd.add_argument("--mailto")
    extract_cmd = sub.add_parser("extract", help="extract explicitly labelled, unreviewed candidates")
    extract_cmd.add_argument("input", type=Path)
    extract_cmd.add_argument("--out", type=Path, required=True)
    return root


def main() -> None:
    args = parser().parse_args()
    if args.command == "demo":
        total = demo(Store(args.out, "demo", deterministic=True))
        print(f"demo: {total} normalized works; raw response and ledger preserved in {args.out}")
        return
    if args.command == "extract":
        total = extract(args.input, args.out)
        print(f"extract: {total} unreviewed candidates -> {args.out}")
        return
    if not 1 <= args.limit <= 10000:
        raise SystemExit("--limit must be between 1 and 10000")
    store = Store(args.out, args.provider)
    try:
        works = FETCHERS[args.provider](args.query, args.limit, store, args.mailto)
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ET.ParseError, json.JSONDecodeError) as exc:
        raise SystemExit(f"harvest failed after bounded retries: {exc}") from exc
    total = store.write_works(works)
    print(f"fetch: received {len(works)} works; {total} unique works in {args.out / 'normalized.jsonl'}")


if __name__ == "__main__":
    main()
