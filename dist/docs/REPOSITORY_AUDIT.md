# Baseline audit and implementation plan — 0.4

## Inspected before implementation

The supplied QEVA_CURRENT_FULL.zip contains 76 files (362,236 uncompressed
bytes). ZIP entry separators are Windows backslashes; extraction normalized
paths, not file contents. The complete original path/size/SHA-256 inventory
is retained in `snapshot/releases/0.3/INVENTORY.json`. Both original manifests
are retained there too, relative to the **original** release root.

All source HTML, CSS, JavaScript, Python, JSON objects, atlas/history metadata,
protocol, licenses, recovery notes and other documentation were inspected.
Derived archive HTML was compared with its generator; JSONL, index references,
all original local links and both manifests passed the original verifier.
The two browser data wrappers match their JSON sources (history wraps the
`milestones` array). All original JavaScript passed Node syntax checking.

## Architecture found

- A dependency-free static 0.3 presentation over protocol 0.2.
- 32 exact-revision archive records, all carrying an editorial verification
  label, not formal proof artifacts. Old 0.1 references in some provenance
  and terminology records are historical bytes, not silently corrected.
- 25 positioned Atlas nodes and 22 editorial/navigational edges; not all 32
  archive concepts have map nodes. 30 historical milestones are another layer.
- Python stdlib release/verify tools regenerate the archive view and exports.
- White/black, system typography, generous space, thin rules, square controls,
  monochrome graph/canvas views. No frameworks or remote runtime dependencies.
- Three independent sandbox demonstrations: logistic recurrence,
  coarse-graining, and seeded exploratory optimization.

## Important absence

There is **no guided-learning prototype, Learn directory, account system,
team implementation or onboarding module** in this supplied ZIP. The brief's
reference to a current prototype cannot be audited against absent files.
This release is built against the uploaded source, not an assumed earlier ZIP.

## Weaknesses

1. The entrance asks people to read before acting. No reusable activity,
   prerequisite, mastery or learner persistence contract exists.
2. Existing Atlas edges are not safe to repurpose as learning prerequisites.
3. Search-based archive links use slugs that do not necessarily match displayed
   wording, and archive articles lack exact revision anchors.
4. Coarse-graining passes scalar arrays to a pair-based path renderer;
   canvas coordinates become NaN. Repair without redesigning other demos.
5. Experiments lack portable specifications, run journals, import/export and
   explicit draft/fork semantics. Existing logistic comparison silently clamps
   the second start at a boundary; declare the actual pair instead.
6. The map's filtered nodes remain keyboard focusable; selected-node stroke
   attributes lose to CSS; the fallback list is grouped rather than complete.
7. Verification checks local files but not HTML fragment targets, all JSON,
   activity references, learning DAGs, runtime behavior or generated wrappers.
8. Python cache files must not enter fixity manifests merely because release
   helpers are imported. Use a shared, documented exclusion rule.

## Decisions / planned sequence

1. Preserve all 32 archive object files byte-for-byte; retain original manifests.
2. Add independently versioned learning profiles, activities and routes, each
   pinned to exact source records. Pedagogical edges remain a separate DAG.
3. Implement a pure engine, a renderer registry, bounded deterministic kernels,
   local learner storage and a service-unavailable adapter as separate modules.
4. Author two overlapping routes with shared activities and kernels: dynamics
   toward chaos terminology, and integer recurrence toward evidence/proof.
5. Replace only the homepage entrance; integrate Learn, Map, Archive, and a
   portable sandbox workshop. Preserve unrelated working areas and identity.
6. Add JSON schemas, open-format documentation, authoring and migration rules,
   static no-JavaScript lesson pages, future account/team contracts and a
   contribution lifecycle that cannot auto-promote popularity into knowledge.
7. Validate with pure-engine tests, browser journeys, malformed imports,
   offline/file/subpath use, no-JavaScript reading, storage failures, local
   references, deterministic builds, and both complete fixity manifests.

Native HTTP/file navigation was blocked in the test browser. Rendered checks therefore
used an embedded DOM harness, not native origin/storage acceptance. See
`docs/VALIDATION.md` for the exact tested scope and remaining deployment checks.

This is a tested small reference implementation and a versioned expansion
boundary, not a claim to have operated a million-node service.
