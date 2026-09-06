# QEVA v0.5 → v0.5.1: implementation audit and gap analysis

**Date:** 2026-09-07. **Baseline:** the actual uploaded `qeva-site-v0.5-vercel-general.zip`.

Input SHA-256: `ddca3e9f18ee8976e28c62029172a543ea85fe56c76f43dab9ed393fef24b46b`.

This report distinguishes source-derived findings, tests executed locally, new design recommendations, and externally checked provider documentation. It does not certify every editorial mathematical claim, every browser, live Vercel deployment, an operational service, or a complete historical corpus.

## Executive judgment

v0.5 is materially better than the earlier site: it implements a common bounded experiment/run contract, six executable kernels, seven analyzers, five analysis modes, typed candidate relations, explicit evidence boundaries and three verification tiers. It is still an early local mathematical instrument—not the shared, AI-extensible digital environment in the user's plan.

The principal deficiency is not a shortage of more HTML pages. There is no shared artifact service connecting people, organizations, agents and user-created tools. The finite engine is also not yet a general construction language. Adding those capabilities requires clear semantics, persistence, permission enforcement and an execution boundary, not only more schema fields.

The immediately useful product remains: define a system, run it, understand the evidence, change it, retain/fork it and reproduce it with another person. The broader vision includes learning, play, invention, social organization and user-defined activities. “Artifacts rather than engagement metrics” should not be interpreted as prohibiting conversations or restricting all creativity to approved mathematical lessons.

## 1. Audit coverage

The input ZIP contains **1,157 entries, 821 regular files and 12,422,071 uncompressed bytes**. ZIP integrity passes. Every regular file was enumerated and read for the inventory; JSON/JSONL, Python syntax, links, source contracts, embedded ZIPs and existing verifiers were inspected. Current engine, Lab, release/packaging, harvester, schemas and renderers received functional/source review. Generated and snapshot duplicates were distinguished from independent functionality.

There are **570 distinct content hashes**, not 821 independent pieces of functionality. The inventory classifies 99 current source/data files, 289 current public HTML files plus one historical HTML file, 159 mathematical revisions, 257 generated snapshot/copy files, and other retained/index files. All 116 current mathematical records were inspected as editorial material; that is not an independently formalized proof audit of all of mathematics.

Independent JSON Schema validation checked **538 records**: 159 mathematical revisions, 6 experiments, 7 analyzers and 366 relations. The original verifier and independent checks agree on the recorded counts.

### Verified input results—not inherited from prior answers

```
python3 -B scripts/verify.py        PASS: canonical, runtime, preservation
node scripts/test_engine.mjs       PASS: 124 engine fixture cases
python3 -B scripts/test_harvester.py PASS: bounded offline harvester tests
```

The previous “14 manifest failures” diagnosis does **not** apply to this v0.5 ZIP. It passes its own three tiers. Those checks are useful and should remain. Passing them does not test every surrounding deployment/product contract.

The existing `dist/` layout is also not intrinsically wrong. The supplied `vercel.json` correctly declares `dist` as its static output. The defect is that the outer release packager did not include that configuration in a newly built ZIP. Flattening the repository again would address the wrong boundary.

## 2. Severity and scope

“High” below includes major delivery gaps against the agreed vision. A missing future account service is not presented as an exploitable vulnerability in the currently static site. “Future gate” identifies controls required before enabling a new risk, rather than claiming that risk is already exposed.

| ID | Priority | Source evidence | Finding | Patch / remaining work |
|---|---|---|---|---|
| A01 | High | `scripts/package_release.py: ROOT_FILES` | `vercel.json` is in the uploaded project but absent from the packager whitelist. A fresh generated ZIP loses the deployment contract. | Fixed: include config, retain valid dist layout, root-level ZIP and outer contract test. |
| A02 | High | `dist/assets/lab.js: runAnalysis` | Final status was derived from one base run even for an aggregate sweep or attack. A requested 20-sample finite-state sweep produced 8 samples but displayed COMPLETE. | Fixed: scope-specific badge, stop reason, requested/effective counts and partial-run indication. |
| A03 | Medium | `lab.js: activateMode` and hidden required fieldsets | Inactive fieldsets were hidden but not disabled. Invalid hidden inputs could obstruct form validation when changing modes. | Fixed and exercised in DOM checks. |
| A04 | High | `lab.js: exportRun/importExperiment` | The site's own exported run envelope was rejected by its bare-experiment importer. Aggregate inputs were not fully retained for replay. | Fixed: local export 0.2 stores analysis options; replay validates both run and analysis; legacy single-run replay is qualified. |
| A05 | High product gap | `lab.js`, no storage/backend | Refresh loses local work; no account or shared artifact persistence. | Added bounded browser-local shelf only. Cloud workspaces, notes export, multi-tab conflicts, synchronization and collaboration remain open. |
| A06 | Medium | old strict JSON parser | File byte cap existed but no explicit nesting cap; error reporting could be excessively long. | Fixed: separately tested strict parser, depth/size limits, duplicate/nonfinite rejection and shorter validation errors. |
| A07 | Medium | home/Lab/template text | Some public copy advertises implementation posture or uses rhetorical headings instead of neutral mathematical controls. | Cleaned prominent home/Lab copy. Comprehensive concept wording review remains; mathematical uncertainty must not be hidden. |
| A08 | Medium | `release.py: CORRIDOR_LABS` | Chirality and quasiperiodicity linked directly to experiments that do not demonstrate them. | Removed those shortcuts, not the records. Proper family-specific examples remain open. |
| A09 | High mathematical scope | `archive/objects`, `archive/qualifications` | 115/116 current objects editorial; only one checked result in a tiny specified rewrite system. This is not foundation closure or broad formal verification. | Retain honest labels; review and extend, not automatically distrust all editorial math or advertise a truth engine. |
| A10 | High mathematical scope | 123 assumption entries | 105 have no exact internal reference; only 18 are linked. | Record unresolved boundaries; add source-grounded references where justified. |
| A11 | High map scope | `atlas/relations.jsonl` | 340 candidate relations and 26 asserted experiment instantiations; typed storage is not a verified dependency map. | Preserve candidate status; separate formal, pedagogical, analogical and historical qualification. |
| A12 | High creation gap | `mechanism-engine.js: KERNELS` | Six bounded kernels, not a general rule-construction language. Metadata can describe operations while execution still follows a fixed selected kernel. | Define executable semantics and a compositional finite-system builder; keep unknown code inert. |
| A13 | High execution gap | engine hard limits and `protocol/NUMERIC-SEMANTICS.md` | Runs execute synchronously on the UI thread. `timeout_ms` is declared, not a wall-clock interruption mechanism; the current protocol admits this. | Worker/cancel/progress and tested limits before heavier or user-provided computation. |
| A14 | Medium numeric boundary | numerical kernels / semantics | Floating-point evidence and transcendental values may be runtime-dependent; traces/finite tests do not establish general attractors or chaos. | Retain exactness boundaries; add tolerance-aware cross-runtime tests without reclassifying approximations as proof. |
| A15 | High family gap | six experiment records | No general Boolean-network, CA, 2D/3D tiling, analytic continuation, custom geometry or user proof/tool execution engine. | Retained in T04; add families through contracts and independent fixtures, not cosmetic tabs. |
| A16 | High civilization gap | no backend/auth/database/jobs | No real accounts, groups, subgroups, bonds, alliances, collaboration or shared project ownership. Artifact/agent schemas do not implement services. | First two-user project gate, then scoped organizational relationships. |
| A17 | High AI gap | no provider client/agent execution | No QEVA-native or user-created AI service, group memory, tool creation or evaluation infrastructure. | A bounded, permissioned draft-producing agent is the first AI gate; no placeholder AI claims added. |
| A18 | Future security gate | planned agents/tools | Untrusted source instructions, user code, shared secrets, recursive tool calls, network access and runaway costs require explicit boundaries. | Define permissions, isolation, quotas, approvals, revocation and adversarial tests before execution. |
| A19 | High privacy/governance gap | account/social systems absent | Immutable public scholarly records and revocable private personal state cannot use one retention/visibility policy. | Separate ownership/stewardship/privacy/qualification; review age/jurisdiction requirements before all-age accounts. |
| A20 | High historical gap | `atlas/history.json` / `fields.json` | 37 orientation milestones/25 fields, not a complete historical influence graph or branch-growth analysis. | Source-backed historical slices, uncertainty, multilingual names and separate date/influence/logic relations. |
| A21 | High harvester gap | `harvester/harvest.py: FETCHERS` | Four bounded API/index adapters; no bulk source importers, sustained corpus or full extraction stack. | Complete contracts and benchmarked pilot in TODO; no scraping falsely reported as performed. |
| A22 | High scaling defect | `atomic_append_jsonl`, ledger reads, `write_works` | Whole-file rewrites/full rescans and no transactional multi-worker coordination. Atomic rename alone is not concurrency control. | Transactional ledger, streaming batches, leases and measured scaling; current prototype single-writer only. |
| A23 | High resumption gap | `checkpoint.json`, fetch loops | Checkpoint counts are not saved provider cursors/partition offsets. | Persist true cursor/source-version state; restart/update/deletion and idempotence tests. |
| A24 | High provenance risk | `iso_from_parts` | Year-only sources became January 1; month-only sources acquired day 1. False precision can contaminate a history map. | Fixed: partial ISO date retained; invalid calendars rejected; 10 regression cases. |
| A25 | Medium API compatibility | OpenAlex fetcher | Original `per-page` cap 200 exceeds the current official documented maximum 100. | Corrected to 100; no live API request or credentials were used for this test. |
| A26 | High identity gap | `identity_basis` | Adding DOI information to a formerly arXiv-keyed work may create another identity. Citation counts are not reconciled reference edges. | Stable external aliases, source assertions, explicit reversible reconciliation. |
| A27 | High source/publication risk | raw retrieval store | Normalized abstract omission does not remove restricted text from saved raw API payloads. An operator could accidentally put raw/private data in the served tree. | Stronger package/private-path guards and documentation. True ingestion/public-export separation remains a gate. No shipped secret leak is asserted. |
| A28 | High extraction gap | label-pattern candidate extraction | Extracts a small set of labelled sentences, not robust TeX/PDF/equation/proof structure, theorem identity or proof validity. | Parsing/notation/source-span benchmarks and separate candidate-review promotion pipeline. |
| A29 | Medium packaging hygiene | root `.gitignore` and package guards | Broad `.env.*`, credential/database variants were not covered by the old outer project guard. | Added explicit filename/path rejection and tests; not represented as a complete secret scanner. |
| A30 | Medium verification gap | tests focus engine/data | Passing schemas and fixtures did not exercise import/export UI, hidden controls, aggregate badges, local saving or outer config. | Added local-record, DOM and outer-project tests; live deployment/browser-network/security testing still separate. |
| A31 | High long-term gap | snapshot/mirror docs | A valid local snapshot is not independent custody, an institution, funding or million-year survival. | Preserve data/runtime separation; test actual restore/migration and arrange independent custody later. |
| A32 | Medium artifact state design | artifact/lifecycle specifications | Visibility, review, reproducibility, moderation and archival state risk being flattened into one status ladder. | Separate dimensions before shared publication/permissions. |
| A33 | High product-learning gap | no user research evidence | A reusable local engine is progress, but demand, comprehension, collaboration and useful return use have not been demonstrated. | Task-based novice/creator tests and a two-person artifact loop, not page-count or account-count goals. |
| A34 | Medium discovery/search gap | current text search/maps | No formula-aware/multilingual equivalence discovery, general graph zoom, open-problem approach map or measured field-frontier assessment. | Keep separate searchable objects, typed graph views and validated domain slices. |

## 3. Mathematical interpretation audit

The current records correctly preserve several important distinctions: recurrence does not imply chaos; a changed observation can hide structure; numerical evidence is not a theorem; different frameworks can use different assumptions; Collatz is not declared simply chaotic. These should be preserved.

Specific items require mathematical/editorial follow-up:

1. **Quasiperiodicity:** the torus representation needs its regularity conditions made explicit. An arbitrary observation function along an orbit is too broad to stand in for the usual regular quasiperiodic class. This is a review task, not an immutable-record edit in this patch.
2. **Finite periodicity:** a finite-prefix overlap criterion can become vacuous for shifts outside the available data. Specify finite-word periods, observed repeats and infinite periodic sequences separately.
3. **Induction pedagogy:** a worked induction should show base case, induction hypothesis and step; “fix n” does not expose that reasoning to a novice.
4. **Foundation closure:** prose frameworks such as ordinary integers remain boundary assumptions until linked and qualified; not everything is derived from distinction merely because the navigation suggests a corridor.
5. **Proof/kernel scope:** a two-step rewrite certificate is meaningful for its declared kernel and statement. It does not turn the entire archive into formally verified mathematics.
6. **Representation identity:** mathematical equivalence depends on domain, assumptions, observations and admissible transformations. Similar pictures, matching finite traces or embeddings do not prove equivalence.
7. **Editorial text:** references to protocol versions or “QEVA should” inside mathematical definitions should move into proper metadata through a reviewed revision, not vanish silently.

No canonical mathematical revision, experiment/analyzer revision or bound engine/checker was edited to make the audit appear more favorable.

## 4. What the patch adds, and what it deliberately does not claim

### Restored identity

The actual historical image exists in the older uploaded `qeva-site-main (2).zip`, member `qeva-site-main/qeva-logo.png`. It is a 4096×4096 PNG, not the generic monochrome Q used in v0.5.

The exact original is retained as `branding/qeva-logo-original.png` (SHA-256 `fb8386e4a413a6bf33d41373f673708480bc737ac13fbfa33cd97386f5168d1f`). The site uses a resized 256×256 PNG. No replacement logo was generated. Previous generic SVGs remain; branding is not silently relicensed as CC0.

### Portable, reproducible local work

The Lab accepts bare experiment records and local run exports. New exports include the inputs required to replay each of the five modes. Imported run bytes and attached analysis must match actual replay; a changed analysis is rejected. Older exports retain their original content but a legacy aggregate without enough inputs is explicitly left unverified. A mismatch can reflect changed computation/runtime or altered data; it is not automatically a claim of malicious tampering.

The local shelf supports up to 30 entries and an aggregate stored-size limit, labels, notes, reload, removal and explicit failure messages. Storage is device/browser-profile local, unencrypted and subject to clearing. It does not create identities, synchronization or backup. Notes export, bundle migration and concurrent-tab conflict handling remain open tasks.

### Deployment and testing

The existing `dist/` layout and root `vercel.json` are retained. The packager now writes direct repository-root paths and preserves required configuration. Outer checks guard the deployment contract, credential-like paths and date precision. A pinned read-only GitHub workflow is included but was not run in the user's account.

Source code for the mathematical engine and the canonical proof checker is byte-identical to v0.5, so existing exact artifact bindings remain valid. Generated HTML, snapshots and manifests are rebuilt. Existing versioned archive ZIPs remain as historical files.

### Not implemented by this patch

Real accounts; shared artifacts; public publishing; user/group permissions; organization bonds or alliances; chat/discussion services; agent/provider integration; user-authored tool execution; heavy computation workers; true wall-clock cancellation; production harvesting; source corpus ingestion; mathematical extraction/reconciliation; comprehensive historical mapping; generalized tiling/geometry/logic engines; funding, legal review or independent mirrors.

## 5. Test boundaries and reproducibility

Run from repository root:

```sh
python3 -B dist/scripts/release.py
python3 -B scripts/check_project.py
python3 -B scripts/package_release.py ../qeva-a.zip
python3 -B scripts/package_release.py ../qeva-b.zip
cmp ../qeva-a.zip ../qeva-b.zip
python3 -m zipfile -t ../qeva-a.zip
```

The existing 124 engine cases and all three original verification tiers remain. New local-record tests cover **96 assertions across 30 mode envelopes**, including strict JSON, all five modes for all six experiment families, aggregate replay, tampering, legacy records, local persistence, quota failure and corrupted storage. Outer checks also exercise required packaging paths, forbidden credential paths and 10 date-precision examples.

### Browser testing limitation

The managed Chromium installation blocks all navigations, including localhost and file URLs, through administrative policy. That policy was not modified. UI behavior was tested by mounting the actual HTML/CSS/JS in an in-memory DOM using Playwright; script/CSP/resource loading was omitted only in the test harness. Storage was simulated for those DOM tests. These tests exercise controls, rendering, imports and save/restore, but **do not validate deployed CSP, HTTP browser loading, native download permissions, durable native browser storage, or actual Vercel settings**.

Node-based storage tests independently use injected storage adapters, including blocked/quota/corrupt cases. Local HTTP routes can be checked separately with a standard HTTP client; that is not a substitute for a real deployed-browser smoke test. No remote provider API, account system, AI call, cloud job or production site was exercised.

Responsive checks covered representative primary pages at 1440 px and 390 px without detected horizontal overflow. This is not a comprehensive visual, accessibility, assistive-technology or browser compatibility certification.

The saved JSON evidence and original-path ledger are in `docs/audit/`. Audit evidence records scope, not an assertion that every possible behavior has been tested.

## 6. Revised implementation trajectory

Keep the sandbox as the entry point, but stop treating accounts, organizations, AI and creator tools as optional decoration. Their persistence/identity/permission interfaces must inform the artifact contract now. Conversely, adding empty account/group/agent buttons is not progress toward a working civilization.

The next major release should join **a usable finite-system builder, portable artifacts and an actual two-user shared project**. A permissioned agent and one user-created analyzer should then exercise the same contracts. This creates a testable path from learning to creation to collaboration without requiring internet-scale harvesting first.

The logical/historical map and harvesting work remain preserved in the plan. They should connect to specific existing experiments/concepts, with measured extraction quality and source coverage. The user's long-term objective is not abandoned by sequencing; it becomes auditable through gates and acceptance criteria.

The updated TODO retains **all 560 v2 checklist items**, its narrative, pain points and unresolved decisions. They receive stable identifiers/statuses and explicit execution-track mappings. The old percentages and order are preserved as historical proposals, not treated as measured staffing economics or binding architecture.

## 7. External checks used in this audit

External facts were checked against primary documentation on 2026-09-07. They are distinct from local source findings.

- Vercel, *Static Configuration with vercel.json*: project-root configuration and `outputDirectory`/build overrides. https://vercel.com/docs/project-configuration/vercel-json
- OpenAlex, *Authentication*: current basic/keyed API behavior and documented `per_page` maximum 100 (page updated 2026-08-19). https://help.openalex.org/api/authentication/
- OWASP, *AI Agent Security Cheat Sheet*: risk framing for future permissioned tools, resource limits and untrusted-input handling. https://cheatsheetseries.owasp.org/cheatsheets/AI_Agent_Security_Cheat_Sheet.html
- MDN, *Using Web Workers*: execution isolation from the UI and worker termination; this does not establish a complete untrusted-code security sandbox. https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
- GitHub, `actions/checkout` v4.2.2: the included workflow pins commit `11bd71901bbe5b1630ceea73d27597364c9af683`; it is a deliberate fixed dependency, not a claim to select the latest release. https://github.com/actions/checkout/releases/tag/v4.2.2

Source rights, privacy obligations and all-age accounts require review for the actual regions/providers/deployment before launch. This audit does not supply a blanket license to republish the internet or a legal compliance certification.

## 8. Final source preservation result

The patch retains all **821 original file paths**.
**496 files are byte-identical** and **325 original paths have intentional changes**, chiefly generated HTML/current snapshot projections/manifests plus the edited presentation, harvester and packaging sources.
All **188 protected original files**—mathematical/experiment/analyzer revisions, qualification/certificate sources, exact engine/checker and retained legacy/archive ZIPs—are byte-identical.

The exact before/after SHA-256 values for every original path are recorded in `audit/original-path-changes.json`. This is more precise than a claim that “nothing important was lost” without a file ledger.

Final DOM checks also exercise all **30 experiment-family × analysis-mode export/import round trips**, with no reported JavaScript errors. The hidden-required-field regression is checked by the fieldset's actual disabled property. All **12 local HTTP-client routes/assets** returned 200; these include the homepage, Lab, map, history, search, about, the logo, the records module and key JSON/object routes. The same browser/deployment limitations stated above still apply.

Independent post-patch validation repeats all 538 schema checks with no parse/schema errors. `audit/upgraded-independent.json` is an inventory snapshot taken before a final audit report was copied into the tree, so its file count is not the final ZIP member count.
