# Validation record — QEVA 0.4.0

Release validation performed 2026-09-09 against the supplied `QEVA_CURRENT_FULL.zip`. No account backend, identity provider, remote library, hosted database or external mathematics service was used by the site.

## Passed

- Original archive fixity: all 32 source record files retain their pre-edit SHA-256 bytes. Historical original manifests/inventory retained separately.
- Pure behavior: **98 Node tests**, zero failures. All 24 activities accept their declared answers and reject empty responses. Tests include all six states, missing prerequisites/cycles, strongest prerequisite threshold, complete overlapping routes, invalid inputs, unknown revisions, conflicting imports, failed-attempt retention, exact BigInt arithmetic beyond safe binary64 integers, bounded-run scope, tampered journals, fork lineage, unavailable services and injected storage failures.
- Reference mathematics: seven independently stated small arithmetic vectors, not vectors generated from the implementation under test. These do not constitute a proof of a universal dynamical claim.
- Schemas: all five new Draft 2020-12 schemas validate; **43 source/example documents** checked, including the complete teaching catalog, four portable lab specimens and two learner specimens. Date-time checks enabled. Graph and interpreter constraints are checked separately.
- Rendered interaction: **157 embedded DOM checks**, zero failures. All 24 activity renderers were submitted through actual form controls with failing and passing responses. All 11 concept rubrics completed. Tests cover formal disclosure, resume routing, local notebook serialization/deduplicating import, Map status and keyboard selection, filter focus exclusion, exact archive links, mixed-kernel lab journals, inconclusive budget stops, full JSON serialization/import, tamper rejection, specification sharing, forks, no fake authentication, unknown goal/fragment fallback, and storage-failure warnings.
- Responsive rendering: homepage, Learn, laboratory, Map and Community at widths **375, 768 and 1440 pixels**, no document-level horizontal overflow or duplicate rendered IDs in those views. Desktop/mobile screenshots inspected. Static editions for all 11 profiles retain all 24 activities and formal excerpts without application scripts.
- JavaScript syntax: every shipped `.js` file checked with Node; Python source parsed; all JSON files parsed without duplicate keys/non-JSON constants.
- Local portability/fixity: all HTML links, image/script/style paths, exact fragment targets and generated mirrors checked; both complete SHA-256/SHA-512 manifests validated. Generated exports are deterministic across consecutive rebuilds. Exact counts are printed by `python scripts/verify.py` for this release.

## Repairs discovered during validation

The original coarse-graining demonstration sent scalars to a coordinate-pair renderer. It now supplies pairs, and the plotted signal renders. Archive anchors now pin exact revisions rather than relying on ambiguous search text. Map selection/focus and filtered-node tab order are explicit. Two inherited homepage layout defects were repaired: pipeline list grid text wrapping into the narrow counter column, and long preformatted map labels widening narrow screens. The mobile entrance places the activity before secondary route options.

## Testing limits — not claimed as passed

The available Chromium executable blocks HTTP and file navigation by administrator policy. Consequently, rendered testing used the **embedded harness** described in `tests/README.md`: real page/CSS/scripts and DOM events, with injected location/history and storage. Native browser navigation, real origin-local storage durability/quotas, file/subdirectory deployment, browser download prompts, clipboard permissions and true cross-tab races were **not end-to-end validated** here. Static URL/path integrity and JSON serialization/import were checked independently; the native acceptance script is included for deployment testing.

No Firefox/Safari/mobile-device run, screen-reader audit, external security audit, mathematical peer review, real learner study, load test at millions of concepts, real account/team service or archive promotion workflow has been completed. Do not interpret the tests as those claims. New teaching remains explicitly draft-for-mathematical-review. Local mastery remains a published activity-rubric state, not a credential, and archive verification remains unchanged.

## Reproduction

Run `python scripts/release.py`, `python scripts/verify.py`, `node --test tests/engine.test.js`, optional `python tests/schema_test.py`, then the browser command in `tests/README.md`. No test depends on a live QEVA account. Save output outside this release tree. Rebuild root manifests after any intentional source/documentation change and before creating a distributable ZIP.
