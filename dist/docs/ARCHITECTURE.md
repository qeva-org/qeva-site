# Architecture — QEVA 0.4.0

## 1. Separate three meanings of connection

An archive dependency is part of a mathematical record. An Atlas edge is an editorial/navigational relation. A learning prerequisite is an instructional choice with a required local state and a reason. Never infer one from another. The Map provides an explicit layer selector; its learning layer is built from the same prerequisites as Learn.

Knowledge IDs remain `qeva:1:<slug>@<revision>`. Teaching IDs occupy separate namespaces: `qeva:learning:<slug>@<revision>`, `qeva:activity:<slug>@<revision>`, and `qeva:route:<slug>@<revision>`. Kernels use `qeva:kernel:<slug>@<revision>`. Personal document IDs are `lab:<opaque-id>` and have no authority to mint archive records. Exact references are identity; URL slugs are navigation conveniences, not verification references.

## 2. Source → deterministic release → optional interaction

Independent UTF-8 JSON source records feed `scripts/learning_release.py`. It emits a source-hashed index, a classic browser-script bundle and complete static learning editions. The shipped release opens without running a build. The classic bundle avoids fetch/module-origin restrictions for copied files. Full HTML remains the readable fallback when JavaScript, storage or service infrastructure disappears.

The site release number (0.4.0), archive protocol (0.2), learning formats (/1), kernel revisions (@1) and learner data version (/1) are independent. A CSS change does not alter mathematical identity; a changed exercise answer requires a new activity revision. No timestamps are generated during rebuilding, so repeated release generation is byte-stable.

## 3. Runtime responsibilities

`kernels.js` is pure bounded mathematics. `learning-engine.js` resolves prerequisites, assesses declarative activities and derives states without DOM/storage. `local-state.js` owns local evidence and import/merge. `activities.js` is a type-to-renderer registry; no concept-specific lesson scripts. `learning-ui.js` supplies safe text rendering, parameter controls and accessible data-backed plots. `learn.js`, `map.js`, `workshop.js` and `notebook.js` compose those pieces. `sandbox-model.js` validates portable journals and re-executes stored runs. `services.js` is an explicitly unavailable adapter.

All submitted answers, including failures, become local evidence. Imported pass labels are forbidden; known responses are rechecked against exact activity revisions. This is reproducibility of a local rubric, not anti-cheating, identity assurance, external assessment or theorem verification. An answer key is deliberately readable in the static edition.

## 4. Progressive disclosure

The entry page invites a specific numerical prediction before notation. Learn exposes manipulation and activities before mechanism, terms, notation and formal scope. Expert mode exposes formal material immediately and every page links to the exact archive record. A locked guided state never prevents reading or experimentation. It only reports an unmet instructional prerequisite. Transfer tasks are distinct from core understanding checks.

## 5. Preservation and trust

The 32 original JSON record files are not rewritten. Their original checksums and the complete original file inventory are retained under `snapshot/releases/0.3/`. Current root manifests cover the entire upgraded release, including that historical evidence, but exclude the two root manifests themselves and documented development caches.

A checksum identifies bytes, not truth, authorship or authenticity. There is no signing system in this release. Formal excerpts in teaching overlays are compared with their pinned archive sources. New prose and exercises are marked draft-for-mathematical-review. A claim label in a lab has no effect on archive verification.

## 6. Growth without conflating architecture with scale

An individual profile/experiment is portable; a bundle is only a delivery artifact. A later catalog adapter can return a goal's prerequisite closure from sharded indexes while keeping exact record identities, the activity registry, static exports and learner evidence contracts. Ship explicit bundle entry refs if multiple revisions coexist, retain historical definitions, and migrate navigation aliases deliberately. Current recursion, full-bundle loading and repeated local assessment are suited to this small release, not millions of simultaneous nodes or attempts.

Next scale work: revision-aware catalog resolver, on-demand closures, bounded iterative graph traversal, verified digest indexes, cached assessments keyed by exact activity revision, storage adapters, performance budgets and representative large-DAG tests. Do not replace this source-of-truth model with database-only content.

## 7. Security and graceful degradation

No `eval`, arbitrary expression execution, plugin code in JSON, remote dependency, API key, telemetry or network write. Imported prose is rendered using DOM text content; parameter keys and numerical domains are allowlisted. Format, depth and size limits bound local work. File imports fail closed and leave source bytes available for investigation. Unknown kernel/format revisions are rejected rather than reinterpreted; unknown learner activity revisions are retained but do not contribute progress.

Origin-local storage is not encrypted, authenticated, transactional across competing tabs or guaranteed durable. Sequential merges and conflicting-ID/stale-draft checks reduce accidental loss, but cannot replace an eventual transactional service. Export JSON before clearing browser data, changing origins, reaching limits or handling important evidence. Read-blocked/corrupt storage is not silently overwritten; write failures switch to an explicitly disclosed memory-only mode. No service is contacted.
