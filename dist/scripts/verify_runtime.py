#!/usr/bin/env python3
"""Tier B: verify QEVA's rendered, offline public runtime.

Checks every non-legacy page, local link and fragment, runtime dependency, source
syntax, browser-data projection, no-JavaScript map/search fallbacks, and the
deterministic Mechanism Engine fixture suite.
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import subprocess
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit


NETWORK_SCHEMES = {"http", "https", "ws", "wss", "ftp"}
RESOURCE_ATTRS = {
    ("script", "src"), ("link", "href"), ("img", "src"), ("img", "srcset"),
    ("source", "src"), ("source", "srcset"), ("video", "src"),
    ("video", "poster"), ("audio", "src"), ("iframe", "src"),
    ("object", "data"), ("embed", "src"), ("track", "src"),
}


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: list[str] = []
        self.links: list[tuple[str, str, str, dict[str, str]]] = []
        self.anchors: list[str] = []
        self.lang: str | None = None
        self.title_depth = 0
        self.title_text: list[str] = []
        self.has_viewport = False
        self.has_description = False
        self.csp: str | None = None
        self.has_main = False
        self.has_skip = False
        self.base_elements = 0
        self.inline_scripts = 0
        self.inline_handlers = 0
        self._script_without_src = False
        self.visible_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = {key: value or "" for key, value in attrs}
        self.inline_handlers += sum(1 for key, value in attrs if key.lower().startswith("on") and value)
        if tag == "html":
            self.lang = values.get("lang")
        if tag == "title":
            self.title_depth += 1
        if tag == "meta" and values.get("name", "").lower() == "viewport":
            self.has_viewport = True
        if tag == "meta" and values.get("name", "").lower() == "description" and values.get("content", "").strip():
            self.has_description = True
        if tag == "meta" and values.get("http-equiv", "").lower() == "content-security-policy":
            self.csp = values.get("content")
        if tag == "main" and values.get("id") == "main":
            self.has_main = True
        if tag == "a" and values.get("href") == "#main":
            self.has_skip = True
        if tag == "base":
            self.base_elements += 1
        if values.get("id"):
            self.ids.append(values["id"])
        if tag == "a" and values.get("href"):
            self.anchors.append(values["href"])
        for attr in ("href", "src", "srcset", "poster", "data"):
            if values.get(attr):
                self.links.append((tag, attr, values[attr], values))
        if tag == "script" and not values.get("src"):
            self._script_without_src = True

    def handle_endtag(self, tag: str) -> None:
        if tag == "title" and self.title_depth:
            self.title_depth -= 1
        if tag == "script" and self._script_without_src:
            self.inline_scripts += 1
            self._script_without_src = False

    def handle_data(self, data: str) -> None:
        self.visible_text.append(data)
        if self.title_depth:
            self.title_text.append(data)


class Audit:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.errors: list[str] = []
        self.pages: dict[Path, PageParser] = {}

    def fail(self, message: str) -> None:
        self.errors.append(message)

    def rel(self, path: Path) -> str:
        try:
            return path.relative_to(self.root).as_posix()
        except ValueError:
            return str(path)

    def load_json(self, path: Path) -> object | None:
        if not path.is_file():
            self.fail(f"{self.rel(path)}: missing JSON file")
            return None
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            self.fail(f"{self.rel(path)}: unreadable JSON: {exc}")
            return None


def is_nonruntime_copy(path: Path, root: Path) -> bool:
    try:
        parts = path.relative_to(root).parts
        return "legacy" in parts or parts[:2] == ("snapshot", "QEVA-BAG")
    except ValueError:
        return False


def parse_pages(audit: Audit) -> None:
    html_files = sorted(path for path in audit.root.rglob("*.html") if not is_nonruntime_copy(path, audit.root))
    if not html_files:
        audit.fail("release contains no non-legacy HTML pages")
        return
    for path in html_files:
        parser = PageParser()
        try:
            parser.feed(path.read_text(encoding="utf-8"))
            parser.close()
        except (OSError, UnicodeDecodeError, Exception) as exc:
            audit.fail(f"{audit.rel(path)}: HTML parse failure: {exc}")
            continue
        audit.pages[path.resolve()] = parser
        title = "".join(parser.title_text).strip()
        if parser.lang != "en":
            audit.fail(f"{audit.rel(path)}: html lang must be 'en'")
        if not title:
            audit.fail(f"{audit.rel(path)}: missing nonempty title")
        if not parser.has_viewport or not parser.has_description:
            audit.fail(f"{audit.rel(path)}: missing viewport or nonempty description metadata")
        if not parser.has_main:
            audit.fail(f"{audit.rel(path)}: missing <main id=\"main\">")
        if path.name != "404.html" and not parser.has_skip:
            audit.fail(f"{audit.rel(path)}: missing keyboard skip link to #main")
        if len(parser.ids) != len(set(parser.ids)):
            audit.fail(f"{audit.rel(path)}: duplicate element IDs")
        if parser.base_elements:
            audit.fail(f"{audit.rel(path)}: <base> is forbidden because it makes link resolution ambient")
        if parser.inline_scripts:
            audit.fail(f"{audit.rel(path)}: inline scripts are forbidden by the offline runtime CSP")
        if parser.inline_handlers:
            audit.fail(f"{audit.rel(path)}: inline event-handler attributes are forbidden")
        csp = (parser.csp or "").lower()
        required_csp = ("default-src 'self'", "object-src 'none'", "base-uri 'none'")
        script_policy_is_local_or_disabled = (
            "script-src 'self'" in csp or "script-src 'none'" in csp
        )
        if not all(token in csp for token in required_csp) or not script_policy_is_local_or_disabled:
            audit.fail(f"{audit.rel(path)}: missing restrictive self-contained Content-Security-Policy")
        if re.search(r"(?:https?|wss?|ws):|(?:^|\s)\*(?:\s|;|$)", csp):
            audit.fail(f"{audit.rel(path)}: Content-Security-Policy authorizes a remote or wildcard origin")


def split_srcset(value: str) -> list[str]:
    return [part.strip().split()[0] for part in value.split(",") if part.strip()]


def resolve_local(audit: Audit, page: Path, value: str) -> tuple[Path | None, str | None]:
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc:
        return None, unquote(parsed.fragment) or None
    raw = unquote(parsed.path)
    if "\x00" in raw or "\\" in raw:
        audit.fail(f"{audit.rel(page)}: unsafe local URL {value!r}")
        return None, None
    target = audit.root / raw.lstrip("/") if raw.startswith("/") else page.parent / raw
    try:
        resolved = target.resolve()
        resolved.relative_to(audit.root)
    except (OSError, ValueError):
        audit.fail(f"{audit.rel(page)}: local URL escapes release root: {value!r}")
        return None, None
    if raw and (raw.endswith("/") or resolved.is_dir()):
        audit.fail(f"{audit.rel(page)}: directory-style local URL is not portable under file://: {value!r}")
    if not raw or raw.endswith("/") or resolved.is_dir():
        resolved = (resolved / "index.html").resolve()
    return resolved, unquote(parsed.fragment) or None


def verify_links_and_dependencies(audit: Audit) -> None:
    for page, parser in audit.pages.items():
        for tag, attr, raw_value, attrs in parser.links:
            values = split_srcset(raw_value) if attr == "srcset" else [raw_value]
            for value in values:
                parsed = urlsplit(value)
                is_resource = (tag, attr) in RESOURCE_ATTRS
                if is_resource and (parsed.scheme.lower() in NETWORK_SCHEMES or parsed.netloc):
                    audit.fail(f"{audit.rel(page)}: external runtime dependency {tag}.{attr}={value!r}")
                    continue
                if parsed.scheme:
                    if parsed.scheme.lower() == "javascript":
                        audit.fail(f"{audit.rel(page)}: javascript: URL is forbidden in {tag}.{attr}")
                        continue
                    if is_resource and not (parsed.scheme == "data" and tag == "img"):
                        audit.fail(f"{audit.rel(page)}: unsupported runtime URI scheme in {tag}.{attr}={value!r}")
                    continue
                target, fragment = resolve_local(audit, page, value)
                if target is None:
                    continue
                if not target.is_file():
                    audit.fail(f"{audit.rel(page)}: broken {tag}.{attr}={value!r}")
                    continue
                if fragment and target.suffix.lower() in {".html", ".htm"}:
                    target_parser = audit.pages.get(target.resolve())
                    if target_parser is None:
                        audit.fail(f"{audit.rel(page)}: fragment target is outside parsed public pages: {value!r}")
                    elif fragment not in set(target_parser.ids):
                        audit.fail(f"{audit.rel(page)}: missing fragment #{fragment} in {audit.rel(target)}")

    for css in sorted((audit.root / "assets").glob("*.css")):
        try:
            source = css.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            audit.fail(f"{audit.rel(css)}: unreadable CSS: {exc}")
            continue
        clean = re.sub(r"/\*.*?\*/", "", source, flags=re.S)
        for match in re.finditer(r"@import\s+(?:url\(\s*)?(['\"])(.*?)\1\s*\)?", clean, re.I):
            value = match.group(2).strip()
            parsed = urlsplit(value)
            if parsed.scheme.lower() in NETWORK_SCHEMES or parsed.netloc:
                audit.fail(f"{audit.rel(css)}: external CSS import {value!r}")
            elif not parsed.scheme and parsed.path:
                target = (css.parent / unquote(parsed.path)).resolve()
                try:
                    target.relative_to(audit.root)
                except ValueError:
                    audit.fail(f"{audit.rel(css)}: CSS import escapes release root {value!r}")
                else:
                    if not target.is_file():
                        audit.fail(f"{audit.rel(css)}: missing CSS import {value!r}")
        for match in re.finditer(r"url\(\s*(['\"]?)(.*?)\1\s*\)", clean, re.I):
            value = match.group(2).strip()
            parsed = urlsplit(value)
            if parsed.scheme.lower() in NETWORK_SCHEMES or parsed.netloc:
                audit.fail(f"{audit.rel(css)}: external CSS resource {value!r}")
            elif not parsed.scheme and parsed.path:
                target = (css.parent / unquote(parsed.path)).resolve()
                try:
                    target.relative_to(audit.root)
                except ValueError:
                    audit.fail(f"{audit.rel(css)}: CSS resource escapes release root {value!r}")
                else:
                    if not target.is_file():
                        audit.fail(f"{audit.rel(css)}: missing CSS resource {value!r}")

    network_api = re.compile(r"\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(")
    remote_import = re.compile(r"\b(?:import\s*(?:\(|[^;]*?from\s*)|require\s*\()\s*['\"](?:https?:)?//", re.S)
    for script in sorted((audit.root / "assets").glob("*.js")):
        try:
            source = script.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as exc:
            audit.fail(f"{audit.rel(script)}: unreadable JavaScript: {exc}")
            continue
        # Generated wrappers are parsed as JSON by verify_browser_data. Their inert
        # strings may legitimately describe URLs or words such as "fetch"/"import".
        if script.name in {"qeva-data.js", "experiment-data.js"}:
            continue
        if network_api.search(source) or remote_import.search(source):
            audit.fail(f"{audit.rel(script)}: network-capable runtime code is forbidden in the mathematical core")


def parse_wrapped_json(audit: Audit, path: Path, prefix: str) -> dict | None:
    if not path.is_file():
        audit.fail(f"{audit.rel(path)}: missing browser data wrapper")
        return None
    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        audit.fail(f"{audit.rel(path)}: unreadable browser data wrapper: {exc}")
        return None
    if not source.startswith(prefix) or not source.endswith(";\n"):
        audit.fail(f"{audit.rel(path)}: invalid deterministic data wrapper")
        return None
    try:
        value = json.loads(source[len(prefix):-2])
    except json.JSONDecodeError as exc:
        audit.fail(f"{audit.rel(path)}: invalid wrapped JSON: {exc}")
        return None
    if not isinstance(value, dict):
        audit.fail(f"{audit.rel(path)}: wrapped value must be an object")
        return None
    return value


def verify_browser_data(audit: Audit) -> None:
    release = audit.load_json(audit.root / "RELEASE.json")
    logical = audit.load_json(audit.root / "atlas" / "logical.json")
    experiment_index = audit.load_json(audit.root / "experiments" / "index.json")
    data = parse_wrapped_json(audit, audit.root / "assets" / "qeva-data.js", "window.QEVA_DATA=")
    experiments = parse_wrapped_json(audit, audit.root / "assets" / "experiment-data.js", "window.QEVA_EXPERIMENTS=")
    if data is not None and isinstance(release, dict) and data.get("release") != release:
        audit.fail("assets/qeva-data.js: release envelope drift")
    if experiments is not None and isinstance(release, dict) and experiments.get("release") != release.get("release"):
        audit.fail("assets/experiment-data.js: release identifier drift")
    if data is not None and isinstance(logical, dict):
        expected = {item.get("qeva") for item in logical.get("concepts", []) if isinstance(item, dict)}
        actual = {item.get("ref") for item in data.get("objects", []) if isinstance(item, dict)}
        if actual != expected or len(data.get("objects", [])) != len(expected):
            audit.fail("assets/qeva-data.js: mathematical object projection drift")
    if isinstance(experiment_index, list):
        expected = {
            item.get("ref") for item in experiment_index
            if isinstance(item, dict) and item.get("current") is True
        }
        for wrapper_name, wrapper in (("qeva-data.js", data), ("experiment-data.js", experiments)):
            if wrapper is None:
                continue
            actual = {item.get("ref") or f"{item.get('id')}@{item.get('revision')}" for item in wrapper.get("experiments", []) if isinstance(item, dict)}
            if actual != expected or len(wrapper.get("experiments", [])) != len(expected):
                audit.fail(f"assets/{wrapper_name}: experiment projection drift")


def href_object_slug(value: str) -> str | None:
    path = unquote(urlsplit(value).path)
    match = re.search(r"(?:^|/)objects/([a-z0-9][a-z0-9._-]*)(?:/index\.html|/)?$", path)
    return match.group(1) if match else None


def verify_no_js_fallbacks(audit: Audit) -> None:
    logical = audit.load_json(audit.root / "atlas" / "logical.json")
    history = audit.load_json(audit.root / "atlas" / "history.json")
    experiment_index = audit.load_json(audit.root / "experiments" / "index.json")
    if not isinstance(logical, dict) or not isinstance(history, dict) or not isinstance(experiment_index, list):
        return
    expected_objects = {item.get("id") for item in logical.get("concepts", []) if isinstance(item, dict)}
    expected_experiments = {
        item.get("id", "").split(":")[-1]
        for item in experiment_index
        if isinstance(item, dict) and item.get("current") is True and isinstance(item.get("id"), str)
    }
    map_path = (audit.root / "map" / "index.html").resolve()
    search_path = (audit.root / "search" / "index.html").resolve()
    map_page = audit.pages.get(map_path)
    search_page = audit.pages.get(search_path)
    if map_page is None:
        audit.fail("map/index.html: missing no-JavaScript map page")
    else:
        linked = {slug for value in map_page.anchors if (slug := href_object_slug(value))}
        missing = sorted(expected_objects - linked)
        if missing:
            audit.fail(f"map/index.html: no-JavaScript fallback omits {len(missing)} objects: {missing[:8]}")
    if search_page is None:
        audit.fail("search/index.html: missing no-JavaScript search page")
    else:
        if "search-fallback" not in set(search_page.ids):
            audit.fail("search/index.html: missing persistent search-fallback region")
        linked_objects = {slug for value in search_page.anchors if (slug := href_object_slug(value))}
        missing_objects = sorted(expected_objects - linked_objects)
        if missing_objects:
            audit.fail(f"search/index.html: no-JavaScript fallback omits {len(missing_objects)} objects: {missing_objects[:8]}")
        linked_experiments: set[str] = set()
        for value in search_page.anchors:
            parsed = urlsplit(value)
            route = unquote(parsed.path).rstrip("/")
            if route.endswith("/index.html"):
                route = route[:-len("/index.html")]
            if route.endswith("/lab") or route == "lab":
                linked_experiments.update(parse_qs(parsed.query).get("experiment", []))
        missing_experiments = sorted(expected_experiments - linked_experiments)
        if missing_experiments:
            audit.fail(f"search/index.html: no-JavaScript fallback omits experiments {missing_experiments}")
        fallback_text = " ".join(" ".join(search_page.visible_text).split()).casefold()
        missing_history = sorted(
            milestone.get("title", "") for milestone in history.get("milestones", [])
            if isinstance(milestone, dict) and milestone.get("title") and milestone["title"].casefold() not in fallback_text
        )
        if missing_history:
            audit.fail(f"search/index.html: no-JavaScript fallback omits {len(missing_history)} historical events: {missing_history[:6]}")


def verify_routes(audit: Audit) -> None:
    object_dir = audit.root / "archive" / "objects"
    for record_path in sorted(object_dir.glob("*.json")):
        try:
            record = json.loads(record_path.read_text(encoding="utf-8"))
            slug, revision = record["id"].split(":")[-1], record["revision"]
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, KeyError) as exc:
            audit.fail(f"{audit.rel(record_path)}: cannot derive public route: {exc}")
            continue
        stable = audit.root / "objects" / slug / "index.html"
        exact = audit.root / "objects" / slug / f"r{revision}" / "index.html"
        if not stable.is_file():
            audit.fail(f"objects/{slug}/: missing stable object route")
        if not exact.is_file():
            audit.fail(f"objects/{slug}/r{revision}/: missing exact revision route")
    for required in ("index.html", "lab/index.html", "history/index.html", "search/index.html", "map/index.html"):
        if not (audit.root / required).is_file():
            audit.fail(f"{required}: required public route is missing")


def verify_source_syntax(audit: Audit) -> None:
    node = shutil.which("node")
    if node is None:
        audit.fail("Node.js is required to syntax-check and replay the shipped JavaScript engine")
        return
    scripts = sorted((audit.root / "assets").glob("*.js")) + sorted((audit.root / "scripts").glob("*.mjs"))
    for path in scripts:
        try:
            result = subprocess.run([node, "--check", str(path)], capture_output=True, text=True, timeout=30)
        except subprocess.TimeoutExpired:
            audit.fail(f"{audit.rel(path)}: JavaScript syntax check exceeded 30 seconds")
            continue
        if result.returncode:
            detail = (result.stderr or result.stdout).strip().splitlines()[-1:]
            audit.fail(f"{audit.rel(path)}: JavaScript syntax check failed: {' '.join(detail)}")
    for path in sorted((audit.root / "scripts").glob("*.py")):
        try:
            compile(path.read_text(encoding="utf-8"), str(path), "exec")
        except (OSError, UnicodeDecodeError, SyntaxError) as exc:
            audit.fail(f"{audit.rel(path)}: Python source check failed: {exc}")


def verify_engine_fixtures(audit: Audit) -> None:
    node = shutil.which("node")
    script = audit.root / "scripts" / "test_engine.mjs"
    fixture = audit.root / "tests" / "fixtures" / "engine-fixtures.json"
    if node is None or not script.is_file() or not fixture.is_file():
        if node is not None and not script.is_file():
            audit.fail("scripts/test_engine.mjs: missing engine replay harness")
        if node is not None and not fixture.is_file():
            audit.fail("tests/fixtures/engine-fixtures.json: missing deterministic fixture set")
        return
    try:
        result = subprocess.run(
            [node, str(script), str(fixture)], cwd=audit.root,
            capture_output=True, text=True, timeout=60,
        )
    except subprocess.TimeoutExpired:
        audit.fail("Mechanism Engine fixtures exceeded 60 seconds")
        return
    if result.returncode:
        detail = (result.stderr or result.stdout).strip()
        audit.fail("Mechanism Engine fixtures failed" + (f": {detail}" if detail else ""))


def run(root: Path, quiet: bool = False) -> int:
    audit = Audit(root)
    parse_pages(audit)
    verify_links_and_dependencies(audit)
    verify_routes(audit)
    verify_browser_data(audit)
    verify_no_js_fallbacks(audit)
    verify_source_syntax(audit)
    verify_engine_fixtures(audit)
    if audit.errors:
        print(f"Tier B / runtime FAILED ({len(audit.errors)} issues)", file=sys.stderr)
        for error in audit.errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    if not quiet:
        print(f"Tier B / runtime PASS — {len(audit.pages)} pages, links and fragments closed, offline dependencies and deterministic fixtures verified")
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1], help="QEVA dist root")
    parser.add_argument("--quiet", action="store_true")
    args = parser.parse_args()
    raise SystemExit(run(args.root, args.quiet))


if __name__ == "__main__":
    main()
