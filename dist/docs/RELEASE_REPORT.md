# QEVA 0.4.0 — release report

## 1. Existing architecture

The supplied 76-file repository was a static 0.3 site with Protocol 0.2, 32 exact-revision archive objects, a 25-node editorial Atlas, 30 historical milestones, three sandbox demonstrations, and stdlib release/fixity scripts. No Learn directory or guided-learning prototype was present. All 32 original archive object files remain byte-for-byte unchanged.

## 2. Architectural decisions

Learning is a separately versioned editorial overlay, not a rewrite of mathematical knowledge. Archive dependencies, Atlas relations and pedagogical prerequisites remain distinct. Pure assessment, bounded computation, rendering, local persistence, portable lab validation and future service capabilities have separate modules. Static reading editions are shipped, not dependent on running a build.

## 3. Implemented experience

The homepage begins with a declared-rule prediction using the shared activity renderer. Learn has 11 profiles, 24 activities, five reusable activity types and two overlapping, prerequisite-derived routes. Expert disclosure and exact archive bypass remain open. The Map has a separate local-learning layer. The notebook records attempts and failures. The portable laboratory supports declared parameters, preserved run journals, local drafts, full JSON export/import, compact specification sharing and forks. Original History/Atlas/archive data are retained.

## 4. Learning Engine schema

Independent profile, activity and route schemas live in `protocol/`. A profile pins `concept_ref`, learning prerequisites with thresholds/reasons, layered explanations, activity refs, understanding/transfer rubrics and provenance. Activities switch on `number`, `choice`, `classification`, `order` or `experiment`; their data contain no executable lesson code. A route names a goal, and the engine derives its missing prerequisite closure. Formal excerpts match exact archive source text. New teaching is draft-for-mathematical-review.

## 5. Learner-state model

`qeva-learner/1` stores exact discovery refs, immutable-ID response events and display/goal preferences. States are derived: locked → available → discovered → learning → understood → mastered. Imports recheck known responses, retain unknown revisions without credit, reject conflicting IDs and preserve failures. Locked guidance never blocks reading or experimentation. Mastery is a local published rubric, not certification or verification of the mathematics.

## 6. Sandbox model

`qeva-sandbox/1` contains identity/revision, exact kernel, parameters, concept links, an unreviewed claim declaration, provenance/parent and run evidence. Three bounded interpreters cover affine, paired logistic and exact-integer Collatz recurrence. Each run freezes its own interpreter and arithmetic; imports re-execute journal results. A budget stop remains inconclusive. Full JSON contains the journal; a compact URL fragment contains only the specification and declaration. Neither is server publication or archive admission.

## 7. Account/team boundary

An explicit unavailable-service page, null adapter and versioned service contract reserve real identity, synchronization, collections, teams/roles, shared labs, expeditions, discussions, reviews and contributions. No fake login, membership or authenticated creator is generated. Community state remains replaceable. Candidate → verification → release → archive requires a separate admission authority; popularity and member roles have no mathematical authority.

## 8. Intentionally unimplemented

Real accounts, hosted publishing, cloud synchronization, teams, live collaboration, moderation, formal proof checking, arbitrary user-code execution, automated archive admission, global reputation and million-node delivery. These are documented boundaries, not nonfunctional buttons masquerading as implementations. New teaching has not received independent mathematical review.

## 9. Recommended next release

0.5 should first review the teaching and test real learners, finish native cross-browser/accessibility/deployment acceptance, add explicit revision-aware catalog delivery and large-graph budgets, and improve transactional local storage. Introduce real opt-in private identity/progress/draft synchronization only after authorization, export/deletion and backend-loss tests. Public teams and publishing follow moderation and untrusted-content isolation.

## 10. Validation

98 Node behavioral tests; five new schemas and 43 schema-validated source/example documents; every JavaScript file syntax checked; all Python sources parsed; all JSON parsed; unchanged original record hashes; exact-reference/DAG closure; source-mirror equality; all local HTML paths and fragments; complete SHA-256/SHA-512 manifests; identical consecutive release builds. The final verifier prints exact repository counts.

157 rendered interaction checks passed in an **embedded Chromium DOM harness**, including all 24 activity submissions, all 11 local rubric states, portable imports/tamper rejection, no-service behavior and 375/768/1440-pixel layouts. Native HTTP/file navigation was blocked by the environment's browser policy. Native navigation/storage/download/clipboard acceptance, Firefox/Safari, real screen readers, mathematical peer review and large-scale performance are not claimed as tested. See `VALIDATION.md` and `../tests/README.md`.
