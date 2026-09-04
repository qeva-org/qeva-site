#!/usr/bin/env python3
"""Regenerate QEVA indexes, human views, atlas data, snapshots, and manifests."""
from __future__ import annotations

import hashlib
import html
import json
import re
import shutil
import sys
from collections import defaultdict
from pathlib import Path
from xml.sax.saxutils import escape as xml_escape

SCRIPT = Path(__file__).resolve()
PROJECT = SCRIPT.parents[1]
ROOT = SCRIPT.parents[1]
sys.path.insert(0, str(PROJECT))

from seed_data import (  # noqa: E402
    FIELDS, FRONTIERS, HISTORY, OLD_LANES, RELEASE, RELEASE_DATE, SOURCES, SPECS,
)

OBJECTS = ROOT / "archive" / "objects"
QUALIFICATIONS = ROOT / "archive" / "qualifications"
ARCHIVE = ROOT / "archive"
REF_RE = re.compile(r"^(qeva:1:([a-z0-9][a-z0-9._-]*))@([1-9][0-9]*)$")


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8", newline="\n")


def write_json(path: Path, value) -> None:
    write_text(path, json.dumps(value, ensure_ascii=False, indent=2) + "\n")


def canonical(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def digest(data: bytes, algorithm: str = "sha256") -> str:
    return hashlib.new(algorithm, data).hexdigest()


def exact(record: dict) -> str:
    return f"{record['id']}@{record['revision']}"


def slug_for(record: dict) -> str:
    return record["id"].split(":")[-1]


def load_records():
    records = []
    for path in sorted(OBJECTS.glob("*.json")):
        records.append((path, json.loads(path.read_text(encoding="utf-8"))))
    if not records:
        raise SystemExit("release: no archive objects")
    return records


def latest_records(records):
    latest = {}
    for path, record in records:
        slug = slug_for(record)
        if slug not in latest or record["revision"] > latest[slug][1]["revision"]:
            latest[slug] = (path, record)
    return latest


def page(title: str, description: str, body: str, prefix: str, current: str = "", scripts=()) -> str:
    nav = [
        ("map", "Map", "map/"), ("foundations", "Foundations", "foundations/"),
        ("history", "History", "history/"), ("archive", "Archive", "archive/"),
        ("sandbox", "Sandbox", "sandbox/"), ("sources", "Harvester", "sources/"),
    ]
    links = "".join(
        f'<a href="{prefix}{href}"' + (' aria-current="page"' if key == current else '') + f'>{label}</a>'
        for key, label, href in nav
    )
    script_tags = "".join(f'<script src="{prefix}{src}"></script>' for src in scripts)
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="{html.escape(description, quote=True)}"><title>{html.escape(title)}</title><link rel="icon" href="{prefix}assets/q.svg" type="image/svg+xml"><link rel="stylesheet" href="{prefix}assets/site.css"></head>
<body><a class="skip" href="#main">Skip to content</a><header class="mast shell"><a class="brand" href="{prefix}" aria-label="QEVA home"><img src="{prefix}assets/q.svg" width="34" height="34" alt=""><span>QEVA</span><small>0.4</small></a><nav aria-label="Primary">{links}</nav></header><main id="main">{body}</main><footer class="footer shell"><div><strong>QEVA</strong><span>Protocol · archive · mirrors · snapshots · institution</span></div><nav aria-label="Project"><a href="{prefix}protocol/">Protocol</a><a href="{prefix}preservation/">Preservation</a><a href="{prefix}institution/">Institution</a><a href="{prefix}README.md">README</a></nav></footer>{script_tags}</body></html>'''


def ref_link(ref: str, prefix: str, titles: dict) -> str:
    match = REF_RE.fullmatch(ref)
    if not match:
        return html.escape(ref)
    slug, revision = match.group(2), match.group(3)
    label = titles.get(slug, slug.replace("-", " "))
    return f'<a href="{prefix}objects/{slug}/r{revision}/">{html.escape(label)} <code>@{revision}</code></a>'


def object_body(record: dict, path: Path, records_by_slug: dict, used_by: dict, prefix: str, revision_view: bool) -> str:
    slug = slug_for(record)
    titles = {k: v[-1][1]["title"] for k, v in records_by_slug.items()}
    dependencies = record["dependencies"]
    dependency_html = "".join(f"<li>{ref_link(ref, prefix, titles)}</li>" for ref in dependencies) or "<li>Declared boundary: no QEVA dependency</li>"
    relation_html = "".join(
        f'<li><span>{html.escape(rel["kind"])}</span>{ref_link(rel["target"], prefix, titles)}' +
        (f'<small>{html.escape(rel["note"])}</small>' if rel.get("note") else '') + "</li>"
        for rel in record["relations"]
    ) or "<li>No typed relations declared in this revision.</li>"
    used_html = "".join(f"<li>{ref_link(ref, prefix, titles)}</li>" for ref in used_by.get(exact(record), [])) or "<li>No current object directly depends on this exact revision.</li>"
    assumptions = "".join(
        f'<li>{html.escape(a["text"])}' + (f' · {ref_link(a["ref"], prefix, titles)}' if a.get("ref") else '') + "</li>"
        for a in record["assumptions"]
    ) or "<li>No assumptions declared.</li>"
    revisions = records_by_slug[slug]
    revision_html = "".join(
        f'<a class="revision-chip" href="{prefix}objects/{slug}/r{item[1]["revision"]}/"' +
        (' aria-current="page"' if item[1]["revision"] == record["revision"] else '') +
        f'>r{item[1]["revision"]}</a>' for item in revisions
    )
    artifact = record["verification"].get("artifact")
    artifact_html = f'<p><a href="{prefix}{html.escape(artifact)}">Open verification artifact</a></p>' if artifact else ""
    caveat = record["content"].get("caveat") or "No caveat recorded in this revision."
    example = record["content"].get("example") or "No example recorded in this revision."
    canonical_link = f'{prefix}archive/objects/{path.name}'
    status_class = "checked" if record["verification"]["level"] == "machine-checked" else "editorial"
    banner = '<p class="revision-note">You are viewing a historical revision. The stable object page points to the current revision.</p>' if revision_view and record != revisions[-1][1] else ""
    return f'''<div class="shell object-shell"><nav class="crumb" aria-label="Breadcrumb"><a href="{prefix}archive/">Archive</a><span>/</span><a href="{prefix}objects/{slug}/">{html.escape(record["title"])}</a><span>/ r{record["revision"]}</span></nav>{banner}
<header class="object-head"><p class="kicker">{html.escape(record["kind"].upper())} · {html.escape(exact(record))}</p><h1>{html.escape(record["title"])}</h1><p class="object-summary">{html.escape(record["summary"])}</p><div class="status-row"><span class="status {status_class}">{html.escape(record["verification"]["level"])}</span><span>{' · '.join(map(html.escape, record['domains']))}</span></div></header>
<div class="object-grid"><article class="object-main">
<section><p class="level-label">PLAIN</p><h2>The idea</h2><p class="large-copy">{html.escape(record["content"]["plain"])}</p></section>
<section class="formal"><p class="level-label">EXACT</p><h2>The compact statement</h2><p>{html.escape(record["content"]["exact"])}</p></section>
<section><div class="split"><div><p class="level-label">EXAMPLE</p><p>{html.escape(example)}</p></div><div><p class="level-label">BOUNDARY / CAVEAT</p><p>{html.escape(caveat)}</p></div></div></section>
<section><p class="level-label">ASSUMPTIONS</p><ul class="clean-list">{assumptions}</ul></section>
<section><p class="level-label">PROVENANCE</p><p>{html.escape(record["provenance"]["source_note"] or "No source note.")}</p><p class="micro">Created {html.escape(record["provenance"]["created"])} · {html.escape(record["provenance"]["creator"])} · {html.escape(record["provenance"]["license"])}</p></section>
</article><aside class="object-side"><section><p class="level-label">CONTEXT</p><p>{html.escape(record["context"]["framework"] or "Context-specific")}</p>{ref_link(record["context"]["framework_ref"], prefix, titles) if record["context"].get("framework_ref") else '<span class="micro">No framework object pinned.</span>'}</section><section><p class="level-label">DEPENDS ON</p><ul class="link-list">{dependency_html}</ul></section><section><p class="level-label">CURRENT USES</p><ul class="link-list">{used_html}</ul></section><section><p class="level-label">TYPED RELATIONS</p><ul class="relation-list">{relation_html}</ul></section><section><p class="level-label">VERIFICATION</p><p>{html.escape(record["verification"]["method"])}</p>{artifact_html}</section><section><p class="level-label">REVISIONS</p><div class="revision-row">{revision_html}</div><p><a href="{canonical_link}">Canonical JSON</a></p></section></aside></div></div>'''


def render_objects(records, latest):
    records_by_slug = defaultdict(list)
    for item in records:
        records_by_slug[slug_for(item[1])].append(item)
    for items in records_by_slug.values():
        items.sort(key=lambda item: item[1]["revision"])
    used_by = defaultdict(list)
    for _, record in latest.values():
        for dep in record["dependencies"]:
            used_by[dep].append(exact(record))
    for slug, items in records_by_slug.items():
        current_path, current = items[-1]
        stable_body = object_body(current, current_path, records_by_slug, used_by, "../../", False)
        write_text(ROOT / "objects" / slug / "index.html", page(f"{current['title']} — QEVA", current["summary"], stable_body, "../../", "archive"))
        for path, record in items:
            rev_body = object_body(record, path, records_by_slug, used_by, "../../../", True)
            write_text(ROOT / "objects" / slug / f"r{record['revision']}" / "index.html", page(f"{record['title']} r{record['revision']} — QEVA", record["summary"], rev_body, "../../../", "archive"))
    return records_by_slug, used_by


def build_atlas(latest, used_by):
    specs = {spec["slug"]: spec for spec in SPECS}
    concepts = []
    for slug, (path, record) in sorted(latest.items(), key=lambda item: item[1][1]["title"].casefold()):
        if slug in specs:
            lane, stage, question = specs[slug]["lane"], specs[slug]["stage"], specs[slug]["question"]
        else:
            lane, stage = OLD_LANES[slug]
            question = record["summary"]
        concepts.append({
            "id": slug, "title": record["title"], "kind": record["kind"], "lane": lane,
            "stage": stage, "qeva": exact(record), "plain": record["content"]["plain"],
            "question": question, "dependencies": record["dependencies"],
            "used_by": sorted(used_by.get(exact(record), [])),
            "verification": record["verification"]["level"],
        })
    edges = []
    for concept in concepts:
        for dep in concept["dependencies"]:
            match = REF_RE.fullmatch(dep)
            if match:
                edges.append({"source": match.group(2), "target": concept["id"], "relation": "depends-on", "strength": "logical"})
    atlas = {"release": RELEASE, "scope": "current exact revisions; logical dependency only", "concepts": concepts, "edges": edges}
    write_json(ROOT / "atlas" / "logical.json", atlas)
    write_json(ROOT / "atlas" / "fields.json", {"release": RELEASE, "scope": "high-level navigational field map; not an ontology of unique roots", "fields": FIELDS})
    write_json(ROOT / "atlas" / "frontiers.json", {"release": RELEASE, "scope": "illustrative open-problem index, not a complete ranking", "frontiers": FRONTIERS})
    return atlas


def build_history(latest):
    out = []
    for year, date, branch, region, title, people, note, qeva_slugs, source_refs in HISTORY:
        qeva_refs = []
        for slug in qeva_slugs:
            if slug not in latest:
                raise SystemExit(f"history references unknown QEVA object: {slug}")
            qeva_refs.append(exact(latest[slug][1]))
        out.append({"year": year, "date": date, "branch": branch, "region": region, "title": title, "people": people, "note": note, "qeva": qeva_refs, "source_refs": source_refs, "confidence": "orientation-level"})
    history = {"release": RELEASE, "scope": "global orientation seed; historical relations are not logical dependencies", "milestones": out}
    write_json(ROOT / "atlas" / "history.json", history)
    return history


def render_history_page(history, latest):
    events = []
    for item in history["milestones"]:
        qeva_links = []
        for ref in item["qeva"]:
            match = REF_RE.fullmatch(ref)
            if match:
                slug = match.group(2)
                qeva_links.append(f'<a href="../objects/{slug}/">{html.escape(latest[slug][1]["title"])}</a>')
        source_links = [f'<a href="../sources/#source-{html.escape(source)}">{html.escape(source)}</a>' for source in item["source_refs"]]
        searchable = " ".join([item["date"], item["branch"], item["region"], item["title"], item["people"], item["note"]]).lower()
        events.append(f'''<article class="event" data-event data-branch="{html.escape(item['branch'])}" data-search="{html.escape(searchable, quote=True)}"><time>{html.escape(item['date'])}</time><p class="event-meta">{html.escape(item['branch'])} · {html.escape(item['region'])}</p><h2>{html.escape(item['title'])}</h2><p><strong>{html.escape(item['people'])}</strong></p><p>{html.escape(item['note'])}</p><p class="event-links">Map: {' · '.join(qeva_links) if qeva_links else 'not yet linked'}<br>Orientation sources: {' · '.join(source_links)}</p></article>''')
    body = f'''<div class="page-head shell"><p class="kicker">HISTORICAL ANCESTRY · GLOBAL ORIENTATION SEED</p><h1>Watch the branches grow—and cross.</h1><p>This timeline records an intentionally global but still incomplete seed. Dates can be approximate; priority can be disputed; one named person never stands in for an entire tradition. Historical links never become proof dependencies automatically.</p></div><section class="shell"><div class="history-tools"><label>Search history<input id="history-q" type="search" placeholder="calculus, India, logic, proof…"></label></div><div id="branch-controls" class="branch-controls" aria-label="Filter by branch"></div><p class="micro">The bars below count events represented in this release. They do not measure how much mathematics a culture or field produced.</p><div id="growth" class="growth" aria-label="Visible release events by branch"></div><div class="timeline" id="timeline">{''.join(events)}</div></section><section class="download-band"><div class="shell"><div><p class="kicker">SEPARATE DATA LAYER</p><h2>History can be rebuilt without this page.</h2></div><div class="download-links"><a href="../atlas/history.json">Timeline JSON</a><a href="../corpus/source-registry.json">Source registry</a></div></div></section>'''
    write_text(ROOT / "history" / "index.html", page("Mathematics through time — QEVA", "Explore QEVA's global seed timeline of mathematical works, traditions, discoveries, corrections, and formalizations.", body, "../", "history", ("assets/qeva-data.js", "assets/history.js")))


def build_archive_exports(records, latest):
    rows = []
    for path, record in records:
        data = canonical(record)
        slug = slug_for(record)
        rows.append({
            "ref": exact(record), "id": record["id"], "revision": record["revision"],
            "current": latest[slug][1]["revision"] == record["revision"], "kind": record["kind"],
            "title": record["title"], "summary": record["summary"], "domains": record["domains"],
            "verification": record["verification"]["level"], "path": f"objects/{path.name}",
            "sha256": digest(data, "sha256"), "sha512": digest(data, "sha512"),
        })
    rows.sort(key=lambda row: row["ref"])
    write_json(ARCHIVE / "index.json", rows)
    current_rows = [row for row in rows if row["current"]]
    write_json(ARCHIVE / "current.json", current_rows)
    with (ARCHIVE / "all.jsonl").open("wb") as handle:
        for _, record in sorted(records, key=lambda item: exact(item[1])):
            handle.write(canonical(record))
    with (ARCHIVE / "current.jsonl").open("wb") as handle:
        for _, record in sorted(latest.values(), key=lambda item: exact(item[1])):
            handle.write(canonical(record))
    catalog = ["ref\tcurrent\tkind\ttitle\tdomains\tverification\tpath"]
    for row in rows:
        values = [row["ref"], "yes" if row["current"] else "no", row["kind"], row["title"], ",".join(row["domains"]), row["verification"], row["path"]]
        catalog.append("\t".join(str(value).replace("\t", " ").replace("\n", " ") for value in values))
    write_text(ARCHIVE / "CATALOG.tsv", "\n".join(catalog) + "\n")
    return rows, current_rows


def build_qualification_export():
    assertions = []
    for path in sorted(QUALIFICATIONS.glob("*.json")):
        assertions.append(json.loads(path.read_text(encoding="utf-8")))
    with (QUALIFICATIONS / "index.jsonl").open("wb") as handle:
        for assertion in sorted(assertions, key=lambda value: (value["id"], value["revision"])):
            handle.write(canonical(assertion))
    return assertions


def render_archive(latest, atlas):
    by_slug = {concept["id"]: concept for concept in atlas["concepts"]}
    cards = []
    for slug, (_, record) in sorted(latest.items(), key=lambda item: item[1][1]["title"].casefold()):
        concept = by_slug[slug]
        searchable = " ".join([record["title"], record["summary"], record["kind"], concept["lane"], *record["domains"], record["verification"]["level"]]).lower()
        cards.append(f'''<article class="archive-row" data-record="{html.escape(searchable, quote=True)}" data-lane="{html.escape(concept['lane'])}" data-kind="{html.escape(record['kind'])}" data-status="{html.escape(record['verification']['level'])}"><a href="../objects/{slug}/"><span class="archive-title">{html.escape(record['title'])}</span><span>{html.escape(record['summary'])}</span><span class="archive-meta">{html.escape(concept['lane'])} · {html.escape(record['kind'])} · {html.escape(record['verification']['level'])} · r{record['revision']}</span></a></article>''')
    lanes = sorted({concept["lane"] for concept in atlas["concepts"]})
    lane_options = "".join(f'<option value="{html.escape(lane)}">{html.escape(lane)}</option>' for lane in lanes)
    body = f'''<div class="shell page-head"><p class="kicker">CURRENT LOGICAL ARCHIVE</p><h1>Every idea exposes its load-bearing parts.</h1><p>Search the current revision of {len(latest)} objects. Each page separates intuition, exact statement, assumptions, dependencies, verification, provenance, and history.</p></div><section class="archive-tools shell" aria-label="Archive filters"><label><span>Search</span><input id="archive-q" type="search" placeholder="prime, proof, symmetry, entropy…" autocomplete="off"></label><label><span>Lane</span><select id="archive-lane"><option value="">All lanes</option>{lane_options}</select></label><p id="archive-count" aria-live="polite">{len(latest)} objects</p></section><div class="archive-list shell" id="archive-list">{''.join(cards)}</div><section class="download-band"><div class="shell"><div><p class="kicker">TAKE THE WHOLE THING</p><h2>The archive does not require this website.</h2></div><div class="download-links"><a href="current.jsonl">Current JSONL</a><a href="all.jsonl">All revisions</a><a href="CATALOG.tsv">TSV catalog</a><a href="index.json">JSON index</a></div></div></section>'''
    write_text(ARCHIVE / "index.html", page("QEVA Archive", "Search QEVA's explicit, revisioned mathematical objects.", body, "../", "archive", ("assets/archive.js",)))


def build_release_metadata(records, latest, history, qualifications):
    verification_counts = defaultdict(int)
    for _, record in latest.values():
        verification_counts[record["verification"]["level"]] += 1
    legacy_zip = ROOT / "legacy" / "qeva-site-v0.3-world-map.zip"
    metadata = {
        "release": RELEASE, "released": RELEASE_DATE,
        "title": "Foundation Switchboard + Harvester v1",
        "protocol": "QEVA Object 0.2; Release Envelope 0.4",
        "current_objects": len(latest), "all_revisions": len(records),
        "qualification_assertions": len(qualifications),
        "history_milestones": len(history["milestones"]), "field_nodes": len(FIELDS),
        "verification": dict(sorted(verification_counts.items())),
        "claims": {
            "complete_map_of_mathematics": False,
            "internet_scrape_bundled": False,
            "harvester_implemented": True,
            "offline_runtime_dependencies": 0,
        },
        "legacy": {
            "release": "0.3", "zip_path": "legacy/qeva-site-v0.3-world-map.zip",
            "zip_sha256": digest(legacy_zip.read_bytes()) if legacy_zip.exists() else None,
        },
    }
    write_json(ROOT / "RELEASE.json", metadata)
    return metadata


def build_browser_data(metadata, atlas, history, latest):
    compact_objects = []
    for concept in atlas["concepts"]:
        record = latest[concept["id"]][1]
        compact_objects.append({
            "id": concept["id"], "ref": concept["qeva"], "title": concept["title"],
            "kind": concept["kind"], "lane": concept["lane"], "stage": concept["stage"],
            "plain": concept["plain"], "question": concept["question"],
            "dependencies": concept["dependencies"], "used_by": concept["used_by"],
            "verification": concept["verification"], "domains": record["domains"],
        })
    payload = {"release": metadata, "objects": compact_objects, "fields": FIELDS, "frontiers": FRONTIERS, "history": history["milestones"], "sources": SOURCES}
    write_text(ROOT / "assets" / "qeva-data.js", "window.QEVA_DATA=" + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n")


def build_source_registry():
    write_json(ROOT / "corpus" / "source-registry.json", {"release": RELEASE, "retrieval_rule": "Re-check current terms and rights at each run.", "sources": SOURCES})


def build_snapshot(metadata):
    bag = ROOT / "snapshot" / "QEVA-BAG"
    if bag.exists():
        shutil.rmtree(bag)
    payload = bag / "data"
    (payload / "archive").mkdir(parents=True, exist_ok=True)
    (payload / "protocol").mkdir(parents=True, exist_ok=True)
    shutil.copy2(ARCHIVE / "current.jsonl", payload / "archive" / "current.jsonl")
    shutil.copy2(ARCHIVE / "CATALOG.tsv", payload / "archive" / "CATALOG.tsv")
    shutil.copy2(QUALIFICATIONS / "index.jsonl", payload / "archive" / "qualifications.jsonl")
    shutil.copy2(ROOT / "protocol" / "CORE.txt", payload / "protocol" / "CORE.txt")
    shutil.copy2(ROOT / "protocol" / "qeva-object.schema.json", payload / "protocol" / "qeva-object.schema.json")
    shutil.copy2(ROOT / "protocol" / "qualification.schema.json", payload / "protocol" / "qualification.schema.json")
    shutil.copy2(ROOT / "RELEASE.json", payload / "RELEASE.json")
    write_text(bag / "bagit.txt", "BagIt-Version: 1.0\nTag-File-Character-Encoding: UTF-8\n")
    write_text(bag / "bag-info.txt", f"Source-Organization: QEVA\nBagging-Date: {RELEASE_DATE}\nExternal-Identifier: QEVA-{RELEASE}\nPayload-Oxum: {sum(p.stat().st_size for p in payload.rglob('*') if p.is_file())}.{sum(1 for p in payload.rglob('*') if p.is_file())}\n")
    payload_files = sorted(p for p in payload.rglob("*") if p.is_file())
    for algorithm in ("sha256", "sha512"):
        lines = [f"{digest(path.read_bytes(), algorithm)}  {path.relative_to(bag).as_posix()}" for path in payload_files]
        write_text(bag / f"manifest-{algorithm}.txt", "\n".join(lines) + "\n")
        tags = [bag / "bagit.txt", bag / "bag-info.txt", bag / f"manifest-{algorithm}.txt"]
        tag_lines = [f"{digest(path.read_bytes(), algorithm)}  {path.relative_to(bag).as_posix()}" for path in tags]
        write_text(bag / f"tagmanifest-{algorithm}.txt", "\n".join(tag_lines) + "\n")
    print_core = [
        "QEVA PRINT CORE 0.4", "===================", "",
        "QEVA is a map of mathematical statements, definitions, frameworks, proofs, history, and open questions.",
        "The domain and website are replaceable. Preserve exact revisions, provenance, manifests, and the right to fork.", "",
        f"Release: {metadata['release']}", f"Current objects: {metadata['current_objects']}",
        "Start with protocol/CORE.txt and archive/current.jsonl.", "",
        "Five permanent separations:",
        "1. syntax is not semantics", "2. derivation is not truth without a model", "3. citation is not logical dependence",
        "4. simulation is not proof", "5. public access is not redistribution permission", "",
    ]
    for path, record in sorted(latest_records(load_records()).values(), key=lambda item: item[1]["title"].casefold()):
        print_core.extend([exact(record), record["title"], record["content"]["plain"], ""])
    write_text(ROOT / "snapshot" / "PRINT-CORE.txt", "\n".join(print_core) + "\n")


def write_manifests():
    excluded = {"MANIFEST.sha256", "MANIFEST.sha512"}
    files = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        rel_path = path.relative_to(ROOT)
        rel = rel_path.as_posix()
        if rel in excluded or "__pycache__" in rel_path.parts or path.suffix == ".pyc":
            continue
        files.append((rel, path))
    files.sort()
    for algorithm in ("sha256", "sha512"):
        lines = [f"{digest(path.read_bytes(), algorithm)}  {rel}" for rel, path in files]
        write_text(ROOT / f"MANIFEST.{algorithm}", "\n".join(lines) + "\n")


def build_sitemap():
    urls = []
    for path in sorted(ROOT.rglob("*.html")):
        if "legacy" in path.parts:
            continue
        rel = path.relative_to(ROOT).as_posix()
        location = "" if rel == "index.html" else rel.removesuffix("index.html")
        url = xml_escape("https://qeva.org/" + location)
        urls.append(f"  <url><loc>{url}</loc><lastmod>{RELEASE_DATE}</lastmod></url>")
    document = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + "\n".join(urls) + "\n</urlset>\n"
    write_text(ROOT / "sitemap.xml", document)


def main():
    records = load_records()
    latest = latest_records(records)
    rows, current_rows = build_archive_exports(records, latest)
    qualifications = build_qualification_export()
    records_by_slug, used_by = render_objects(records, latest)
    atlas = build_atlas(latest, used_by)
    history = build_history(latest)
    render_history_page(history, latest)
    build_source_registry()
    metadata = build_release_metadata(records, latest, history, qualifications)
    build_browser_data(metadata, atlas, history, latest)
    render_archive(latest, atlas)
    build_snapshot(metadata)
    build_sitemap()
    write_manifests()
    print(f"release: {len(latest)} current objects; {len(rows)} exact revisions; {len(history['milestones'])} milestones; manifests rebuilt")


if __name__ == "__main__":
    main()
