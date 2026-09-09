# Test the learning foundation

The shipped website has no package/runtime dependency. These are development tools only. Run all commands from the release root.

## Preservation and syntax

```sh
python scripts/release.py
python scripts/verify.py
node --test tests/engine.test.js
```

`verify.py` uses only the Python standard library. It validates the original Protocol 0.2 records and reference closure, exact canonical exports/digests, JSON syntax including duplicate keys/nonfinite constants, unchanged original archive bytes, teaching references and DAGs, formal excerpts, bundle/index/data-mirror equality, unique HTML IDs, local paths and fragments, and both complete fixity manifests. It deliberately does not claim that structural validation proves the mathematics.

`engine.test.js` uses Node built-ins only. Its 98 cases cover all 24 activities with positive and negative responses, state transitions, dependency thresholds, revision/merge boundaries, independent arithmetic vectors, re-executed sandbox journals, failure retention, service-unavailable behavior, and injected local-storage faults. Storage harnesses are not real browser quota or concurrency certification.

Check each shipped JavaScript file with `node --check <path>`. This is a development check; do not make reading the archive depend on Node. Python imports/cache directories, `.git`, `.pytest_cache`, `node_modules`, `.pyc` and `.pyo` are outside release fixity coverage and must not be packaged as release artifacts.

## Optional schema checks

Install `jsonschema` in your development environment, then:

```sh
python tests/schema_test.py
```

This validates all five new Draft 2020-12 schemas, 37 teaching source documents, four portable lab specimens, and two in-memory learner specimens, with date/time checking. Semantic constraints (DAG closure, exact formal source equality, numeric domain and reproduced runs) are separately checked; JSON Schema alone does not establish them.

## Optional rendered acceptance

Install Playwright, Beautiful Soup and a supported Chromium test browser in your development environment. Run a local static server in another terminal, then:

```sh
python tests/browser_test.py --base http://localhost:8000/ --browser /path/to/chromium --output ../qeva-browser-results
```

On Windows, replace the executable path with your test browser's installed path. The test uses only local site data. Do not put test output/screenshots inside the release root after generating manifests.

For environments whose browser policy blocks all URL navigation:

```sh
python tests/browser_test.py --embedded --browser /path/to/chromium --output ../qeva-browser-results
```

**Embedded mode is not native end-to-end testing.** It parses the actual page, inlines its actual CSS/images, evaluates its actual scripts in a DOM with injected `location`/`history` and a controllable storage adapter, then drives real form controls and rendering. The source files are not rewritten for testing. It exercises all 24 activities, progress/Map integration, exported JSON serialization/import, tamper rejection, sandbox fork/share behavior, no-script static content and 375/768/1440-pixel layouts. It substitutes export capture for browser downloads. Native HTTP navigation, origin-local persistence, download prompts, clipboard permissions and multi-tab timing need acceptance testing outside this constrained mode.

The release's recorded 157 rendered checks were run in **embedded mode**, because the available browser blocks navigation. The full native mode is provided for the next acceptance run, not reported as passed. Firefox/Safari, real assistive technology, native private-mode quotas, cross-origin changes and real user usability remain untested.

## Reproducibility

Rebuild twice without source changes and compare complete manifests. The generated release has no build timestamp. Keep original `archive/objects/*.json` bytes unchanged; new knowledge is a new revision, not an in-place edit. The original manifest evidence is under `snapshot/releases/0.3/` and names the original root—not that subdirectory.
