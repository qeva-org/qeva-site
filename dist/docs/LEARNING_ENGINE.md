# Learning Engine 1 — authoring and evidence

## Independent records

A learning concept has `schema_version`, `id`, `revision`, `concept_ref`, `title`, `difficulty`, `prerequisites`, `related`, `explanation`, `activities`, `mastery` and `provenance`. See `protocol/learning-concept.schema.json` and the 11 complete specimens under `learning/concepts/`.

`concept_ref` pins a permanent archive revision. Each prerequisite contains an exact learning profile `ref`, a `minimum_state` (`understood` or `mastered`) and an instructional `reason`. The graph must be acyclic. `related` contains exact archive references, not implicit unlocks. The formal excerpt's `source_ref` must match the profile's archive reference and its `text` must equal that archive revision's `content.exact`.

The explanation layer follows intuition → manipulation → pattern → mechanism → vocabulary → notation → formal statement → proof scope → dependencies → frontier. The proof field distinguishes a worked example from a scope boundary. It may supply a proof of an example, but never implies the whole concept or a numerical observation has been formally verified.

## Five reusable activity types

| Type | Declarative configuration | Assessment |
| --- | --- | --- |
| number | expected value, tolerance, display tokens | finite decimal input within declared tolerance; blank is not zero |
| choice | option IDs/text, correct ID | exact declared answer ID |
| classification | label IDs, items and expected label per item | every supplied classification must match |
| order | named proof steps and correct ID sequence | exact sequence; accessible up/down controls, no drag-only interaction |
| experiment | pinned kernel, initial parameters, editable parameters, minimum runs, parameter to vary, interpretation options | every run rerun; fixed parameters unchanged; required comparisons present; correct scope interpretation |

An activity record declares its exact owning learning profile and source references. The renderer registry switches on type, never on a concept slug. The first homepage question is `sequence-next@1`, also used within Learn. Activity answer keys are public; this is a learning instrument, not secure assessment.

## Routes derive from the graph

A route declares metadata and an exact goal, not a hard-coded mission array. `Catalog.path(goal)` resolves the prerequisite closure in deterministic topological order; cycles and missing references fail closed. `plan(goal, learner)` derives states and returns the next unmet connection, respecting the strongest declared prerequisite threshold.

Two shipped routes overlap through sequence and recurrence. The dynamics route includes fixed point, stability, nonlinearity, sensitivity and chaos. The evidence route includes parity, Collatz map, periodicity and the seed Collatz conjecture. They demonstrate reuse, not an exhaustive curriculum or a new proof of either frontier topic. A learner can also select any profiled concept as a goal.

## Learner state

Stored schema: `qeva-learner/1`. Fields: `discoveries` (exact learning refs), `attempts` (unique ID, exact activity ref, ISO timestamp, response), `preferences` (guided/formal mode and goal slug). No saved numerical score, authoritative mastery flag, account ID or verification field.

States are derived, in this order:

1. `locked`: at least one declared prerequisite is below its threshold.
2. `available`: prerequisites satisfied, no discovery or response evidence.
3. `discovered`: explicitly encountered, no response evidence.
4. `learning`: at least one response exists, core understanding rubric incomplete.
5. `understood`: all `mastery.understood` activities have at least one passing response.
6. `mastered`: understanding rubric plus all `mastery.mastered` transfer checks are satisfied.

Failed later attempts do not erase previous passing evidence; this release has no spaced-review/forgetting model. Attempts made before a prerequisite is satisfied are retained and count once that prerequisite is satisfied. Reading a page marks discovery, not understanding. Clicking Continue or drawing a graph never grants mastery.

Local imports union unique discoveries and events by ID, preserve unknown revisions, reject conflicting payloads under the same event ID and recheck known responses. Preferences from the imported notebook win. A local record is editable self-report, not trusted service evidence. Two tabs are best-effort merged, not a distributed CRDT or transactional database. Export before an explicit reset. Corrupt stored bytes have a raw export path.

## Add content

Copy an appropriately typed JSON source, allocate a new stable ID/revision, pin archive sources, write intuition and scoped examples, choose explicit prerequisites and reasons, provide understanding and transfer requirements, and validate against the matching JSON Schema. Add a route only when a new goal warrants editorial guidance. Rebuild with `python scripts/release.py`; run preservation and behavioral tests. Inspect the static edition and the keyboard/mobile UI, then request mathematical/editorial review before moving the draft overlay into a reviewed learning release.

Never rewrite a published exact revision. An old response only applies to its exact activity revision. Migration must preserve old evidence, declare any equivalence and require fresh evidence when the question or rubric changed. The current bundle has one active revision per logical profile; multiple-revision delivery and explicit current-entry resolution are reserved for the next catalog adapter.

## Compatibility limits

Format limits: 10,000 discovered refs, 2,000 attempt events, 32,768 serialized characters per response; browser notebook import also limits the file to 1 MiB. A local experiment activity retains at most 12 comparison runs. These bounds are deliberate safeguards, not global account quotas. The schemas validate structure; graph closure, source equality, arithmetic ranges and response re-evaluation are additional semantic checks.
