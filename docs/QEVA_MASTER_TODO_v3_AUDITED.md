# QEVA Master TODO v3 — audited implementation and complete vision register

**Audit date:** 2026-09-07. **Input:** `qeva-site-v0.5-vercel-general.zip`. **Patch:** `0.5.1-audited`.

This is an execution plan, not a claim that the proposed platform exists. The input ZIP was inspected locally. Provider accounts, a production deployment, a live multi-user service, and a production crawl were not operated during this audit.

## 1. Product and scope that must not be lost

QEVA is a shared environment for learning, constructing, running, discussing, preserving, and extending mathematical and computational systems. People may also use those systems to create tools, agents, games, visual artifacts, educational material, and new forms of collaboration. Mathematics is its foundation, not a requirement that every human interaction be a theorem.

The intended long-term system includes the mathematical sandbox; logical and historical maps; literature acquisition; learning paths; persistent artifacts; human accounts; groups, subgroups, bonds and alliances; user-created tools and AI agents; collective creation; consent-based observation of organizational evolution; and public knowledge that remains recoverable if the live service fails.

**Initial user problem:** “I can describe a rule, but cannot easily run it, inspect the evidence, modify it, retain the result, and collaborate without rebuilding the machinery.”

**First end-to-end release:** create a finite system → run and inspect it → save a reproducible artifact → another person imports/forks/reproduces it → a group compares alternatives → an authorized agent proposes a tested modification. This is a release sequence, not a reduction of the wider vision.

Learning, playful creation, conversation, and organization are legitimate uses. The earlier “artifact, not post” principle means preserve reusable work and avoid engagement-driven truth judgments; it must not prohibit ordinary discussion or user-invented activities.

## 2. Status vocabulary and evidence rule

- **PASS / bounded:** implemented and tested for the explicitly supported scope. It does not imply arbitrary mathematics or production scalability.
- **PARTIAL:** some working implementation exists, but the requested capability is broader.
- **SCHEMA ONLY:** fields or specifications exist; the corresponding service or lifecycle does not.
- **OPEN:** no working implementation was found in the supplied repo.
- **POLICY / GATE:** a design constraint or release acceptance requirement, not a feature to count as shipped.

A JSON field is not a backend. A declared source is not an importer. A citation is not a logical dependency. A digest (a content fingerprint) is not proof of authorship, mathematical truth, novelty, or safe execution. A finite test is not a general theorem. An aggregate result must show the aggregate's stopping condition rather than that of one underlying run.

### Audited baseline

| Component | Actual v0.5 evidence | Remaining boundary |
|---|---|---|
| Repository | 821 files; all readable; input ZIP CRC passes | Much volume is generated pages/snapshots, not independent implemented capabilities |
| Canonical archive | 116 current objects, 159 exact revisions, 2 qualification assertions | 115 current records editorial; 1 machine-checked in a small specified rewrite system |
| Assumptions | 123 assumption entries; 18 exact references | 105 textual/unresolved references; not first-principles closure |
| Relations | 366 typed records | 340 candidates; 26 asserted experiment-instantiation relations; not a verified map of all mathematical dependence |
| Lab | 6 kernels, 7 analyzers, 5 analysis modes, 124 engine cases | No general compositional builder, arbitrary user tool execution, or theorem synthesis |
| History | 37 orientation milestones and 25 field nodes | Not comprehensive historical coverage or a reconstructed influence graph |
| Harvester | 4 bounded adapters and offline fixtures | No production corpus, bulk-source machinery, parsing/reconciliation stack, or distributed ingest |
| Identity / collaboration | Artifact/agent schema groundwork and documentation | No real accounts, groups, bonds, alliances, agents, or collaborative service |
| Verification | All 3 existing tiers pass on v0.5 | Outer packager omitted `vercel.json`; verifier success did not catch that contract |

### Changes actually delivered in 0.5.1

- [x] **FIX-01** Include `vercel.json` in reproducible root-level ZIP packaging; test outer deployment paths without changing the valid `dist/` architecture.
- [x] **FIX-02** Restore the exact historical logo asset from the older uploaded repo, retain it outside the deployment directory, and use a smaller PNG rendition on the site.
- [x] **FIX-03** Make sweep/attack status describe their own scope, sample cap and stopping reason; label the sweep metric rather than “family metric.”
- [x] **FIX-04** Disable inactive mode fieldsets so hidden required inputs do not obstruct other modes.
- [x] **FIX-05** Add versioned local run envelopes with replayable analysis settings; accept bare experiments and exported runs; reject altered run/analysis payloads.
- [x] **FIX-06** Support older local exports: replay the single run, explicitly leave unreconstructible attached legacy analysis unverified, and retain its original payload for re-export.
- [x] **FIX-07** Add a bounded browser-local shelf with names, notes, save/load/delete and storage-failure handling. This is not an account, shared workspace, cloud backup, or synchronization service.
- [x] **FIX-08** Add strict JSON size/depth/duplicate-name/nonfinite-number checks and regression tests.
- [x] **FIX-09** Replace conspicuous lab development rhetoric with neutral controls; restore the original logo across generated and maintained pages.
- [x] **FIX-10** Remove unsupported direct chirality→finite-map and quasiperiodicity→logistic lab shortcuts without deleting the concepts or experiments.
- [x] **FIX-11** Preserve year/month/day precision in Crossref date normalization instead of inventing missing date components.
- [x] **FIX-12** Limit OpenAlex requests to the documented current 100-record page maximum. This is a configuration correction, not a live-provider integration test.
- [x] **FIX-13** Add outer-project checks, credential/private-path guards, local-record tests and a pinned, read-only CI workflow. The workflow has not been executed on the user's GitHub account.
- [x] **FIX-14** Retain all original file paths, mathematical revisions, experiment/analyzer revisions, qualification assertions, legacy archives, engine bytes and bound canonical checker bytes. Generated representations/manifests are regenerated, not mistaken for immutable source.

## 3. Dependency-ordered release gates

These replace the old arbitrary percentage allocation and the old assumption that all social/AI work must wait until a vast mathematical corpus exists. Each gate has a real user journey and a measurable exit test. Do not silently drop later gates to make the first release appear complete.

| Gate | Deliverable | Exit test | Depends on |
|---|---|---|---|
| G0: trustworthy instrument | The patched static site, honest outcomes, recoverable local artifacts | A bounded sweep, failed import and resource stop never display a misleading success; archive and outer-package tests pass | Current patch |
| G1: reusable creation | Shared experiment contract, finite-system builder, durable artifact packages and independent replay | A novice defines a new finite rule and another browser reproduces it from the exported artifact without author-only data | G0 |
| G2: first shared project | Real accounts, private/public artifact ownership, two-user group workspace, revisions and access checks | Two separate users collaborate, fork and revoke access; a third user cannot read private data; export/restore is exercised | G1 and security/operating decisions |
| G3: bounded AI collaborator | One agent can inspect a permitted project, run approved tools, propose drafts with evidence | Prompt-injected source material cannot grant permissions; quotas, approval, rejection, rollback and attribution are tested | G1, G2, capability and execution boundaries |
| G4: extensible world | User-created tools, reproducible agent manifests, groups with typed bonds and joint projects | A tool from one user runs against another compatible artifact under limited permissions; two groups form and dissolve a scoped bond without accidental access inheritance | G2, G3 |
| G5: connected knowledge | Benchmark-driven source import, typed mathematical links, useful historical slices | Source-grounded extraction/identity precision measured on held-out examples; corrected citations propagate without rewriting old evidence | G1; may proceed in parallel with G2–G4 |
| G6: sustained platform | Independent custody, live operations, recovery, organization evolution and broader sandbox families | Export a public subset and restore it independently; private data is absent; version/provider migration and cost controls are tested | G2–G5 |

A gate is not satisfied by a screenshot, a button without a service, or a schema without behavior. “Instant understanding” is a learning objective to evaluate, not a claim to publish.

## 4. Execution tracks and acceptance criteria

### T01 — Public experience, learning and precise language

- [ ] **T01.1 / G1** Run a first-use study with actual target users, including novices. Measure time to first meaningful run, ability to describe one changed assumption, and ability to distinguish evidence from proof. Do not infer demand from site traffic alone.
- [ ] **T01.2 / G1** Keep Explore / Lab / History / Search with account access when real accounts exist. Move roadmap, versions, backend status and grand ambition to repository/secondary documentation. Keep scientific uncertainty, numerical warnings and proof status visible where relevant.
- [ ] **T01.3 / G1** Write one complete learning corridor: distinctions and equality → partitions/equivalence → composition/symmetry/invariance → iteration/recurrence → finite cycles → sensitivity and stability → observation/coarse-graining. Mark pedagogical connections as pedagogical, not formal derivations.
- [ ] **T01.4 / G1** Each corridor node contains a plain explanation, concrete worked example, exact formulation, declared assumptions, runnable instance, limitation and source. Provide optional notation explanations and keyboard-operable alternatives to plots.
- [ ] **T01.5 / G2** Support user-authored lessons, examples, collections and alternative conceptual maps. Learners can enter the sandbox from a lesson and turn a result into an artifact.
- [ ] **T01.6 / G3** Personalization is opt-in and inspectable; users can disable/reset it, select another explanation and distinguish personalized text from canonical content. Do not infer a person's intelligence from activity traces.
- [ ] **T01.7 / G1–G6** Test small screens, keyboard-only use, screen readers, mathematical reading order, status announcements, reduced motion, accessible tables, high zoom, localization and non-Latin notation. Current responsive screenshots are not a full accessibility audit.
- [ ] **T01.8 / G1** Reconcile the neutral tone across generated object pages, search, history and legacy navigation. Preserve older canonical wording through a reviewed new revision where needed rather than rewriting immutable source records.

### T02 — Experiment semantics and compositional construction

- [ ] **T02.1 / G1** Define an executable intermediate representation (a small structured rule language), initially for bounded finite systems. A displayed rule and its executed semantics must be the same object, not independent prose and a fixed hidden kernel.
- [ ] **T02.2 / G1** Provide both direct transition-table editing and a typed rule/block builder. Support composition, explicit state domains, parameters, initial/boundary conditions, observations and stopping conditions. Reject ill-typed or out-of-domain expressions before running.
- [ ] **T02.3 / G1** Separate system definition, experiment configuration, execution environment, run, observation, conjecture and proof. Evidence must refer to exact versions of the appropriate objects.
- [ ] **T02.4 / G1** Define actual behavior for metadata such as `timeout_ms`. Current wall-clock timeout is descriptive, not enforced. Add worker-based interruption (a background execution context the UI can stop), progress, cancel, operation/memory quotas and deterministic finite stopping reasons.
- [ ] **T02.5 / G1** Keep exact integer/rational and finite computations distinct from floating-point approximations. Test rounding, overflow, underflow, NaN, infinity, branch cuts and cross-runtime behavior. Do not promise bit-identical transcendental results across arbitrary browsers.
- [ ] **T02.6 / G1** Specify analyzer input/output contracts and applicable families. A numerical sensitivity estimate, finite cycle proof and symbolic invariant proof have different scopes and certificates.
- [ ] **T02.7 / G1** Preserve full analysis inputs, observations, errors and resource limits. Support run-envelope migration, notes export/import, workspace bulk export/import, multi-tab conflicts, damaged-record recovery and backup. Current notes are browser-local and need explicit export support.
- [ ] **T02.8 / G1** Implement custom seeded random processes, user-controlled observer partitions and full-state versus observed-state comparisons. Inferred effective dynamics must show whether closure is exact or approximate.
- [ ] **T02.9 / G1–G4** Representation Switch: record conditions and explicit conversion witnesses for recurrence/formula/graph/automaton/geometry views. Do not merge objects just because a few outputs coincide.

### T03 — Analysis that addresses hard, realistic pain points

- [ ] **T03.1 / G1** Explain sensitivity: rule changes versus initial-state perturbation versus floating-point noise. A recurrence need not amplify errors; amplification need not establish mathematical chaos.
- [ ] **T03.2 / G1** Observer Switch should compare lost/preserved distinctions under a specified task. A coarser trace appearing regular is not proof of intelligence or a closed macro-law.
- [ ] **T03.3 / G1–G4** Extend Diff from bounded structural differences to tested explanatory differences; searching for the *smallest sufficient assumption change* requires an explicit search space, ordering and certificate, not just JSON comparison.
- [ ] **T03.4 / G1** Conjecture Attack accepts a precise finite predicate and scope, finds a minimal witness where feasible, and records tested/excluded/unexplored cases. Keep Collatz finite-horizon failures distinct from counterexamples to the unbounded conjecture.
- [ ] **T03.5 / G4** Add invariant/symmetry/equivalence candidate search with search grammar, budget, witness and independent checking. Label unsuccessful bounded search inconclusive.
- [ ] **T03.6 / G4** Preserve negative results and unsuccessful approaches with conditions. They are reusable only when another user can identify the same tested region, not when “did not work” is an unexplained sentence.
- [ ] **T03.7 / G4** Benchmark rule-to-behavior analysis, observer comparisons and representation conversion against independently implemented small examples. Record regressions and false-positive rates.

### T04 — Sandbox expansion without a fictitious universal solver

Each family needs a state/operation contract, exactness boundary, bounded engine, export example, independent fixtures, useful visualization and at least one cross-family connection before it counts as supported.

- [ ] **T04.1** Finite graphs, graph dynamics, Boolean networks, cellular automata and substitution systems. Distinguish synchronous/asynchronous updates and graph topology from temporal dynamics.
- [ ] **T04.2** Sequences, linear/nonlinear recurrences, generating functions and verified closed-form transformations. “Closed form” depends on the permitted expression language.
- [ ] **T04.3** Symmetry, chirality and geometric transformations, including the exact allowed transformation group. A reflection is not an allowed rotation by default.
- [ ] **T04.4** 2D tilings: user-defined geometry, legal placements, boundary/overlap checking, orientation/reflection options, patches, periodicity evidence, substitution certificates and archive/name lookup. A finite patch is not proof of plane tileability or aperiodicity.
- [ ] **T04.5** 3D tessellations and geometric constructions: robust predicates, tolerances, mesh validity, exact coordinate options, spatial indexing and resource limits. Do not treat a renderer's plausible picture as a geometric proof.
- [ ] **T04.6** Continuous models, numerical integration and discrete approximations with convergence/stability/error controls. Arbitrary discretization is not “maximal information.”
- [ ] **T04.7** Analytic continuation: domains, singularities, branch choices, continuation paths and examples with exact known answers; flag approximate visual evidence and path-dependent branches.
- [ ] **T04.8** Stochastic models, optimization, exploration/exploitation, local/global structure and calibration. Show the task, objective, budget and uncertainty rather than a universal optimality claim.
- [ ] **T04.9** Multiscale systems, task-dependent information summaries, aggregation and approximate effective laws. Preserve disagreements among observers.
- [ ] **T04.10** Formal logic, proof-system bridges, combinatorial generation, symbolic algebra and user-invented mathematical games/tools. User freedom to introduce new artifact/family types passes through versioned contracts, not arbitrary privileged server code.

### T05 — Durable artifacts and collaboration substrate

- [ ] **T05.1 / G1** Make experiments, tools, agents, notebooks, maps, visualizations, datasets, lessons, workflows, challenges, claims, proofs, counterexamples and negative results first-class artifact kinds. Preserve an extension mechanism for user-created kinds.
- [ ] **T05.2 / G1–G2** Stable logical identity is separate from an immutable content revision, the owner/steward, an alias, a rendering and the permission policy. Pin dependencies; record fork, merge, reproduction and supersession explicitly.
- [ ] **T05.3 / G2** Factor lifecycle into separate dimensions: visibility, review/qualification, reproducibility, archival state and moderation. “Private,” “refuted,” and “reproduced” are not mutually exclusive stages in one enum.
- [ ] **T05.4 / G2** Implement drafts, autosave, synchronization, branching, reviewed merges, conflicts, citations, attachments, export/import and failed-run records. Test offline edits and conflicting two-user edits rather than last-write-wins data loss.
- [ ] **T05.5 / G2** Distinguish mathematical identity/identity candidates, duplicate documents, identical file bytes and similar explanations. Record merge rationale, aliases, reversible decisions and attribution; preserve independent rediscovery.
- [ ] **T05.6 / G2** Public artifacts need an explicit license; group stewardship does not automatically transfer copyright. Deletion/access revocation and private personal data require a separate policy from immutable public mathematical history.
- [ ] **T05.7 / G3** Human–AI work should end in inspectable artifacts, not only chat transcripts. Preserve relevant inputs, tool calls, outputs, checks and human approvals; avoid mandatory retention of private chats, secrets or unnecessary personal data.

### T06 — Accounts and personal agency

- [ ] **T06.1 / G2** Implement real registration/sign-in, sessions, recovery, optional pseudonyms, secure account settings, export and deletion workflows. Authentication establishes an account, not human expertise or mathematical truth.
- [ ] **T06.2 / G2** Enforce authorization on every backend read/write/job/export. Test another-user access, group removal, link sharing, expired invites and account recovery; hiding a button is not an access control.
- [ ] **T06.3 / G2** Personal workspace: artifacts, drafts, notes, collections, activity/provenance, saved views, owned/stewarded agents/tools and memberships. Reading and anonymous bounded exploration remain available without an account.
- [ ] **T06.4 / G2** Notifications, subscriptions, blocking, reporting and account security settings must be controllable. No hidden global intelligence or truth score.
- [ ] **T06.5 / G2** Decide age/jurisdiction scope and assess applicable privacy/child-safety requirements before opening accounts to all ages. Provide age-appropriate defaults, moderation and contact controls; obtain qualified legal review for the actual service and regions.

### T07 — Groups, bonds, alliances and organizational evolution

- [ ] **T07.1 / G2** Real shared groups: roles, invitations, consent to membership, projects, artifacts, discussions, tasks and shared tool/agent libraries.
- [ ] **T07.2 / G4** Define membership, containment, bond, alliance, federation and project participation as different relationship types. A social graph may have cycles; a containment hierarchy needs an explicit cycle policy. Do not force them into one tree.
- [ ] **T07.3 / G4** Each bond records parties, purpose, authority, shared resources, scope, consent, start/end, review and revocation. A mentorship link must not grant access to all of another group's private data.
- [ ] **T07.4 / G4** Support subgroup creation, temporary coalitions, shared challenges, jointly maintained artifacts, splitting/forking/merging groups, succession and organizational history. Permissions cannot be inherited indefinitely across alliance chains.
- [ ] **T07.5 / G4** Coordinate shared compute and shared agents with budgets and accountable human stewards. A group's vote may authorize a budget/project decision; it cannot prove a theorem.
- [ ] **T07.6 / G4–G6** Let users build their own practices, games and institutions within platform rules. Avoid encoding the founder's favorite social hierarchy as the only permitted form of collaboration.
- [ ] **T07.7 / G6** Organizational dynamics may become an opt-in study/sandbox with aggregate measures and consent. No covert experiments on users, automatic “intelligence” rankings or publication of private relationship graphs.

### T08 — QEVA-specific AI, agents and user tools

- [ ] **T08.1 / G3** Define a provider-independent Agent artifact: purpose/instructions, model requirements, tool and data capabilities, budgets, dependency versions, steward, tests, license and provenance. Configuring a model is not training or owning a new model; represent these separately.
- [ ] **T08.2 / G3** First useful agent: read an explicitly shared finite-system project, propose a modified experiment, run an approved analyzer, cite exact results and produce an unreviewed draft. No autonomous access to unrelated private work.
- [ ] **T08.3 / G3** Personal, artifact and group AI: adaptive explanation, prerequisite help, notation translation, source search, experiment assistance, critique, project memory and candidate formalization. Users can inspect, correct, export and forget memory.
- [ ] **T08.4 / G3** Treat harvested pages, user files, tool outputs and model messages as untrusted data. Prompt injection (instructions embedded in data) must not grant access, spend money, publish artifacts or alter canonical mathematics.
- [ ] **T08.5 / G3** All consequential actions pass through explicit capabilities (narrow permissions), network allowlists, budget limits and approval where appropriate. Keep secrets server-side; distinguish agent identity from the accountable human/group and record delegation/revocation.
- [ ] **T08.6 / G3** Enforce call/time/token/compute limits, loop detection, cancellation, retries, job idempotence (a repeated request does not duplicate its effects), audit logs and emergency disable. Infinite agent collaboration is not a free resource.
- [ ] **T08.7 / G3–G4** Evaluate grounded explanations, evidence/proof calibration, tool validity, counterexamples, permissions, reproducibility, extraction and adversarial inputs on held-out fixtures. Model confidence is not independently checked evidence.
- [ ] **T08.8 / G4** User-created analyzers, simulators, renderers, importers, exporters, generators, transformations, proof bridges and workflows: typed input/output, pinned dependencies, tests, license, permissions, compatibility and owner/steward record.
- [ ] **T08.9 / G4** Isolate untrusted code with a tested execution boundary, filesystem/network denial by default, CPU/memory limits, controlled dependencies and output validation. A Web Worker prevents UI blocking but is not by itself an arbitrary-code security boundary.
- [ ] **T08.10 / G4** Tool discovery, review, signing/identity, deprecation, vulnerabilities, revocation, backwards compatibility and reproducible packages. Never trust a tool because an alliance is popular.
- [ ] **T08.11 / G4–G6** Allow users to share/fork agents and compose tools while testing combined permissions and budgets. Replaceable providers and exportable specifications reduce lock-in; they do not guarantee a retired model's exact behavior can be recreated.

### T09 — Logical atlas, qualification and research navigation

- [ ] **T09.1 / G1** Distinguish formal proof dependencies, definition use, conceptual explanation, pedagogical prerequisite, analogy, historical influence, citation and experimental instantiation. Each edge has source, scope, reviewer/qualification and revision.
- [ ] **T09.2 / G1–G5** Review the 340 migrated candidate relations rather than promoting them because their schema validates. Link the 105 currently textual assumptions where justified; otherwise preserve the unresolved boundary.
- [ ] **T09.3 / G5** Add proof-system/model context, exact proof/checker artifacts, trust assumptions and counterexample witnesses. Do not claim every editorial fact must await machine formalization; do state its review level accurately.
- [ ] **T09.4 / G1** Review mathematical subtleties without editing immutable records in place: regularity in quasiperiodic representations, finite-prefix period conventions, actual induction steps, and framework/version prose in mathematical definitions. New revisions need evidence and migration links.
- [ ] **T09.5 / G5** Build a zoomable graph with selectable edge semantics, aggregation, local detail and time lenses. One flattened diagram cannot be both a logical foundation tree and a historical influence map.
- [ ] **T09.6 / G5** Formula/notation-aware, multilingual search; multiple equivalent explanations; cross-field mechanisms; theory→experiment links; known/failed/open approach maps. Similarity search proposes relations, not equivalence proofs.
- [ ] **T09.7 / G5** Show coverage and uncertainty, not “all mathematics” or “truth completed.” A user may explore competing foundations/ontologies and different observer-dependent equivalences.
- [ ] **T09.8 / G5** “Promising,” “stuck,” “beautiful” and “fundamental” are transparent lenses. Show chosen metrics, source coverage and uncertainty; neither paper counts nor a single centrality score establish scientific importance.

### T10 — Historical development and scholarly sources

- [ ] **T10.1 / G5** Record works, people, traditions, methods, concepts, theorems, institutions, tools, discoveries and formalizations as distinct node types. Preserve multiple names/languages and external identifiers.
- [ ] **T10.2 / G5** Source-grounded dates with precision/intervals, disputed attribution, independent discoveries, translations and corrections. A bibliographic publication date is not automatically the date a concept was invented.
- [ ] **T10.3 / G5** Time × branching/influence visualization, connected to but not conflated with logical dependency. Select one rigorous historical slice first, with a coverage statement.
- [ ] **T10.4 / G5–G6** Represent incomplete/lost records and underrepresented traditions. Do not label absence from a harvested Western/English-language corpus as absence from mathematical history.
- [ ] **T10.5 / G5** Track progress/branching with separately defined measures and human interpretation. Attribution, conceptual equivalence and historical causation need different evidence.

### T11 — Harvester: the exact missing architecture

The immediate target is a small rights-aware, benchmarked pipeline serving actual QEVA experiments and concepts—not an undifferentiated internet mirror.

**Execution boundary:** bounded adapters can be developed and tested in a local environment. Continuous execution, storage, provider credentials/terms, cloud access and budgets require an operator-controlled deployment. No such infrastructure is included or operated in this ZIP.

- [ ] **T11.1 / G5** Keep raw operational data outside the public deployment tree. Produce a separately reviewed public projection (an export containing only approved fields/files). Raw API responses can contain restricted abstracts even when normalized text is omitted.
- [ ] **T11.2 / G5** Replace whole-file JSONL rewrites and repeated full scans with a transactionally safe ledger/database and streamed batches. Current rename operations protect individual file writes, not concurrent workers or multi-file commits.
- [ ] **T11.3 / G5** Persist provider cursor, source release/checksum, partition, byte/record position, request parameters, retry state and deletion/correction state. Current `checkpoint.json` counts do not provide true incremental cursor resumption.
- [ ] **T11.4 / G5** Idempotent source assertions, stable external-ID aliases, DOI/arXiv reconciliation and reversible merge decisions. A newly supplied DOI must not split a previously known arXiv work into a second identity.
- [ ] **T11.5 / G5** Stream large input; explicit response/storage budgets, parser limits, archive path traversal and decompression defenses; retries with backoff; dead-letter records (failed jobs retained for diagnosis); operator metrics and cost accounting.
- [ ] **T11.6 / G5** Source contracts identify metadata/full-text distinction, license/attribution, credentials, endpoints, rate limits, update/deletion behavior and allowed public fields. Verify current provider terms when implementing each adapter.

| Missing capability | Implementation contract | Acceptance before “supported” |
|---|---|---|
| OpenAlex bulk | Pin snapshot partitions; stream filter and normalized works/authors/topics/citation identifiers; checkpoint partitions | Restart midway without duplicates; validate sample against source; count accepted/rejected records |
| Crossref bulk | Stream compressed dump; preserve partial dates, references, relations and per-field rights | Never invent dates; no restricted abstracts silently published; DOI aliases reconcile |
| arXiv bulk metadata/source | Metadata resumption plus versioned source/PDF acquisition with per-item rights and safe archive extraction | Re-run/update/deletion tests; source and PDF not confused with metadata; correct version identity |
| OEIS | Licensed sequence import, identifiers, attribution, formulas/recurrences and mappings | License-compatible public export; distinguish data available in a bulk file from fields requiring other permitted access |
| zbMATH Open | Terms-aware mathematics-specific identifier/classification/work adapter | Document coverage and permitted fields; reconcile without losing source assertions |
| Wikidata | Stream selected entities/labels/claims with references and multilingual names | Preserve statement qualifiers/uncertainty; never treat it as a theorem prover |
| Mathlib graph | Pinned source/toolchain; distinguish imports, declarations, types and actual proof dependencies | Declaration references resolve at the pinned commit; reproducible extraction; licenses retained |
| Internet Archive | Targeted item/file metadata and rights-aware historical document selection | Source locator/date uncertainty preserved; no bulk assumption of permission |
| Common Crawl | Pin crawl/index; identify candidates; fetch selected archived records, not merely index hits | Validate offsets/content types; filter rights and malformed/duplicate pages; bounded cost |
| TeX parsing | Safe source normalization, macros, notation scopes, theorem/proof/equation environments | No unrestricted TeX compilation; exact source locations; fixtures with custom macros/includes |
| PDF parsing | Text/layout/structure with source coordinates and reading order | Equation/column/order benchmark; scans routed separately; never infer proof structure from keywords alone |
| Equation extraction | Preserve original representation plus normalized candidate form | Bound variables, domains, assumptions and display context retained |
| Proof extraction | Distinguish proof text, proof outline, reference, omitted proof and checkable certificate | Located source span and qualification; parsing prose is not verifying it |
| Citation reconciliation | Exact IDs first; metadata candidates and review for ambiguity | Corrections, versions and preprint/journal relationships not silently collapsed |
| Math entity resolution / theorem deduplication | Assumption-aware candidates with explicit equivalence rationale | No automatic merge solely from embeddings or matching finite outputs |
| Synonyms / multilingual extraction | Alias and notation scopes, language-tagged names/text and benchmarked translation | Homonyms and false friends remain separable; original source retained |
| Persistent database/index | Transactional source ledger, object store and read/search projections | Backup/restore and crash consistency tests; public/private separation |
| Queues/workers | Lease/ack/retry/idempotence, budgets and observable backlogs | Crash/restart/repeated delivery does not lose or duplicate source facts; distributed deployment only after measured need |

- [ ] **T11.7 / G5** Run a small corpus pilot connected to actual finite dynamics/recurrence/tiling questions. Establish labels and held-out precision/recall before expanding from 10k to 100k or 1M records. These are proposed milestones, not downloaded corpus counts.
- [ ] **T11.8 / G5** Corpus discovery → candidate extraction → typed relations → review/check → public knowledge are separate states. Keep rejected hypotheses and provenance; do not publish hallucinated extracted theorems.
- [ ] **T11.9 / G5** Benchmark source segmentation, equations, references, identity matching, extraction, proof-status calibration and multilingual performance. “Regex finds theorem” is not the measurement target.

### T12 — Social trust, achievement, safety and governance

- [ ] **T12.1 / G2** Contribution records reward reproduction, explanations, verified counterexamples/proofs, reliable tools, source correction, translation, moderation and reusable creative work; do not equate attention with truth.
- [ ] **T12.2 / G2–G4** Credit includes coauthors, agent assistance, sources, prior forks and uncertainty about priority. “First on QEVA” is not “first in history.”
- [ ] **T12.3 / G2** Moderation/report/appeal workflows, abuse and spam limits, impersonation protections and privacy-aware logs. Alliances must not use membership or reputation to overwrite mathematical status.
- [ ] **T12.4 / G4** Any reputation system is transparent, task-specific, contestable and resistant to coordinated self-endorsement. Start with observable contribution records before numeric reputation.
- [ ] **T12.5 / G4** Constitution/stewardship and group governance must explain who can authorize changes, budgets, emergency actions, departures and succession. Preserve disagreements rather than force one canonical social worldview.
- [ ] **T12.6 / G2–G6** Public scholarly provenance, account data, private projects and organization membership have different retention/erasure/export policies. Immutability must not turn into compulsory permanent publication of personal data.

### T13 — Live service and long-term custody

- [ ] **T13.1 / G2** Separate static public read/export from authenticated APIs, private storage, jobs and secrets. The current dependency-free site need not become a zero-dependency live backend.
- [ ] **T13.2 / G2** Choose and document a minimal backend/auth/storage/jobs design with isolation, migrations, backups, local development and clear operator ownership. Do not add distributed infrastructure merely to match a diagram.
- [ ] **T13.3 / G2–G6** Account/compute quotas, billing or funding model, storage growth, failure monitoring, incident response, rollback and release migration. User-created agents must have someone accountable for their resource consumption.
- [ ] **T13.4 / G6** Public archival export covers qualified mathematics and elected public artifacts, source metadata, tools/specifications and provenance; private data/secrets are excluded and tested. Archived executable results may remain interpretable even when re-execution becomes impossible.
- [ ] **T13.5 / G6** Independent mirrors, custody diversity, offsite recovery and succession agreements. A local ZIP or BagIt package is not an independent mirror or institution.
- [ ] **T13.6 / G6** Self-describing formats, hash migration, open schemas, versioned migration tools, printed/analog bootstrap specifications and tested restore procedures. Physical snapshots are a future custody program, not a shipped hardware claim.
- [ ] **T13.7 / G6** Preserve model/tool/environment metadata and non-AI renderings. No particular cloud, domain, model, database or foundation is required to interpret the public knowledge export.
- [ ] **T13.8 / G0–G6** Keep canonical, runtime and preservation checks separate, but add outer deployment, browser interactions, authorization, jobs, tool isolation and migrations as their implementations arrive. Do not waive mathematical or credential failures as packaging noise.

## 5. Decisions that require explicit ownership

The first implementation should record decisions, not silently make permanent institutional commitments.

| Decision | Recommended initial boundary | Revisit trigger |
|---|---|---|
| Initial shared creation family | Finite-state rules, parameterized recurrences and explicit observers | A reusable contract and independent examples justify another family |
| Account/publication boundary | Anonymous read/run; accounts for durable cross-device save, sharing and membership | Abuse, privacy and collaboration evidence |
| Agent publication | Draft/proposal by default; human approval for public or consequential actions | Evaluated, scoped automation with revocation and budgets |
| Group ownership | Separate legal authorship, artifact stewardship and workspace access | Real joint projects and departures |
| Recursive organizations | Typed relationships with explicit cycle and permission rules | Tested alliance workflows, not a need for ornamental hierarchy |
| Social activity | Enable discussion/play/organization, but retain reusable artifacts and no popularity-based truth | User research, moderation evidence |
| Custom tools | Built-in bounded contracts before isolated untrusted execution | Threat model, resource limits and tool lifecycle tests pass |
| Foundation ontology | Multiple formal systems and alternative pedagogical maps | Evidence-based cross-system translations |
| Preservation vs deletion | Immutable elected public knowledge; minimized/revocable private personal state | Jurisdiction and rights review |
| Timeline/novelty | Evidence-backed recorded history, scoped uncertainty | New sources/attribution disputes |
| Cost model | Explicit operator budget and per-user/per-agent limits | Measured usage and funding |

## 6. Coverage and preservation contract

The following appendix reproduces the previous v2 plan in its original organization, with **all 560 checklist items assigned stable IDs**, implementation status, and an execution-track reference. All prose, listed pain points, unresolved questions, organization/AI ambitions and side goals are retained. The old percentages and “Immediate execution order” are retained as historical proposals; the release gates above supersede them.

`todo-traceability.json` is the machine-readable counterpart. It records every original checklist item's exact source text, line, section, status, mapped track and evidence note. The original v2 Markdown is retained unchanged in the repository. “OPEN” is not a deletion. “PARTIAL” is not completion. Acceptance must be checked at the scope promised in the task.

---

# Appendix — v2 vision and task register, preserved with audit annotations

# QEVA Master TODO v2 — Living Mathematical Digital Civilization

## 0. Product definition

QEVA is **not only a mathematics archive, sandbox, social network, or AI application**.

It is a persistent digital environment in which humans and AI systems can:

1. understand mathematical machinery from first principles;
2. construct and simulate formal systems;
3. create tools, visualizations, proofs, conjectures, datasets, explanations, and experiments;
4. preserve every artifact with provenance and reproducibility;
5. collaborate through users, groups, and recursively higher-order organizations;
6. build and share AI agents and computational tools;
7. connect new work to the global logical and historical map of mathematics;
8. let the environment evolve without allowing popularity or AI output to redefine mathematical truth.

### Core loop

`explore → build → run → analyze → collaborate → publish → verify → fork → connect → preserve → evolve`

### Long-lived architectural invariant

Keep these layers distinct even when one interface connects them:

1. **Canonical mathematics** — definitions, formal systems, theorems, conjectures, proofs, counterexamples, typed relations.
2. **Experiments and computation** — executable systems, simulations, computational observations.
3. **Artifacts and provenance** — notebooks, tools, agents, visualizations, datasets, lessons, challenges, projects.
4. **Historical/literature graph** — works, people, dates, citations, traditions, institutions, provenance.
5. **Human identity and organizations** — users, groups, subgroups, alliances, institutions.
6. **AI/agent layer** — assistants, analyzers, user-created agents, group agents, tool-using workflows.
7. **Live social state** — collaboration, discussion, membership, permissions, coordination.
8. **Preservation layer** — immutable exports, manifests, mirrors, snapshots, succession.

A mutation in layers 5–7 must never silently change truth status in layer 1.

---

# P0 — Define one compelling public product

## P0.1 Public selling point

QEVA should immediately answer:

> **What structure follows from this rule, assumption, transformation, or observation?**

The first visit must make this concrete in under 30 seconds.

- [ ] **V2-0001 · PARTIAL · T01** — Homepage contains only: `Explore`, `Lab`, `History`, `Search`, account access.
- [ ] **V2-0002 · PARTIAL · T01** — Remove release numbers, crawler status, manifests, constitution, preservation rhetoric, roadmap, and internal ambition from the main UI.
- [ ] **V2-0003 · PARTIAL · T01** — Use neutral, monotone language.
- [ ] **V2-0004 · PARTIAL · T01** — No motivational slogans, dramatic claims, or developer notes in canonical mathematical pages.
- [ ] **V2-0005 · PARTIAL · T01** — Mathematics remains usable without login.
- [ ] **V2-0006 · PARTIAL · T01** — Account features become visible only when the user creates, saves, joins, collaborates, or publishes.
- [ ] **V2-0007 · PARTIAL · T01** — Every public concept page has a direct action: `explore`, `run`, `change`, `compare`, or `build`.

## P0.2 First user experience

- [ ] **V2-0008 · PARTIAL · T01** — Visitor selects a mechanism or rule.
- [ ] **V2-0009 · PARTIAL · T01** — QEVA shows one concrete example.
- [ ] **V2-0010 · PARTIAL · T01** — Visitor changes one assumption/parameter.
- [ ] **V2-0011 · PARTIAL · T01** — QEVA immediately shows what changed.
- [ ] **V2-0012 · PARTIAL · T01** — Visitor can expand to exact definitions, dependencies, proofs, history, and known related systems.
- [ ] **V2-0013 · PARTIAL · T01** — Visitor can fork the object into the Lab without creating an account.
- [ ] **V2-0014 · PARTIAL · T01** — Saving/publishing the fork requests an account.

---

# P1 — Universal mathematical sandbox / Mechanism Engine

This remains the strongest near-term product.

## P1.1 Canonical Experiment object

- [ ] **V2-0015 · PARTIAL · T02 / T03 / T04** — state space
- [ ] **V2-0016 · PARTIAL · T02 / T03 / T04** — objects/entities
- [ ] **V2-0017 · PARTIAL · T02 / T03 / T04** — relations
- [ ] **V2-0018 · PARTIAL · T02 / T03 / T04** — operations/update rule
- [ ] **V2-0019 · PARTIAL · T02 / T03 / T04** — parameters
- [ ] **V2-0020 · PARTIAL · T02 / T03 / T04** — initial/boundary conditions
- [ ] **V2-0021 · PARTIAL · T02 / T03 / T04** — observer/coarse-graining
- [ ] **V2-0022 · PARTIAL · T02 / T03 / T04** — randomness source and seed
- [ ] **V2-0023 · PARTIAL · T02 / T03 / T04** — run bounds
- [ ] **V2-0024 · PARTIAL · T02 / T03 / T04** — analyzer versions
- [ ] **V2-0025 · PARTIAL · T02 / T03 / T04** — outputs
- [ ] **V2-0026 · PARTIAL · T02 / T03 / T04** — provenance
- [ ] **V2-0027 · PARTIAL · T02 / T03 / T04** — parent/fork relation
- [ ] **V2-0028 · PARTIAL · T02 / T03 / T04** — exact executable representation where possible
- [ ] **V2-0029 · PARTIAL · T02 / T03 / T04** — content-addressed immutable revision

## P1.2 Compositional construction

Users must be able to construct systems rather than only run curated demos.

- [ ] **V2-0030 · PARTIAL · T02 / T03 / T04** — choose/define state space
- [ ] **V2-0031 · PARTIAL · T02 / T03 / T04** — choose/define operations
- [ ] **V2-0032 · PARTIAL · T02 / T03 / T04** — compose operations
- [ ] **V2-0033 · PARTIAL · T02 / T03 / T04** — define recurrence/update rule
- [ ] **V2-0034 · PARTIAL · T02 / T03 / T04** — define constraints
- [ ] **V2-0035 · PARTIAL · T02 / T03 / T04** — define observer/coarse-graining
- [ ] **V2-0036 · PARTIAL · T02 / T03 / T04** — define stopping conditions
- [ ] **V2-0037 · PARTIAL · T02 / T03 / T04** — perturb parameters or assumptions
- [ ] **V2-0038 · PARTIAL · T02 / T03 / T04** — compare two systems
- [ ] **V2-0039 · PARTIAL · T02 / T03 / T04** — fork any public experiment
- [ ] **V2-0040 · PARTIAL · T02 / T03 / T04** — import/export experiment definitions

## P1.3 Automatic analyzers

Where mathematically meaningful, test or estimate:

- [ ] **V2-0041 · PARTIAL · T02 / T03 / T04** — fixed points
- [ ] **V2-0042 · PARTIAL · T02 / T03 / T04** — finite/eventual periods
- [ ] **V2-0043 · PARTIAL · T02 / T03 / T04** — conserved quantities
- [ ] **V2-0044 · PARTIAL · T02 / T03 / T04** — candidate invariants
- [ ] **V2-0045 · OPEN · T02 / T03 / T04** — symmetry / broken symmetry
- [ ] **V2-0046 · OPEN · T02 / T03 / T04** — chirality / orientation distinctions
- [ ] **V2-0047 · PARTIAL · T02 / T03 / T04** — sensitivity to initial conditions
- [ ] **V2-0048 · PARTIAL · T02 / T03 / T04** — perturbation growth
- [ ] **V2-0049 · PARTIAL · T02 / T03 / T04** — attractors
- [ ] **V2-0050 · PARTIAL · T02 / T03 / T04** — basins
- [ ] **V2-0051 · PARTIAL · T02 / T03 / T04** — bifurcations
- [ ] **V2-0052 · OPEN · T02 / T03 / T04** — graph components/cycles/connectivity
- [ ] **V2-0053 · PARTIAL · T02 / T03 / T04** — local/global optima
- [ ] **V2-0054 · OPEN · T02 / T03 / T04** — entropy/information summaries under explicit definitions
- [ ] **V2-0055 · PARTIAL · T02 / T03 / T04** — coarse-grained effective dynamics
- [ ] **V2-0056 · PARTIAL · T02 / T03 / T04** — scale dependence
- [ ] **V2-0057 · PARTIAL · T02 / T03 / T04** — hierarchy / repeated macrostructure
- [ ] **V2-0058 · PARTIAL · T02 / T03 / T04** — counterexample search
- [ ] **V2-0059 · OPEN · T02 / T03 / T04** — equivalence/isomorphism candidates
- [ ] **V2-0060 · PARTIAL · T02 / T03 / T04** — numerical/experimental evidence strength

Never label finite computation or heuristic search as proof.

## P1.4 Sandbox families

- [ ] **V2-0061 · PARTIAL · T02 / T03 / T04** — sequences
- [ ] **V2-0062 · PARTIAL · T02 / T03 / T04** — recurrences
- [ ] **V2-0063 · PARTIAL · T02 / T03 / T04** — finite-state systems
- [ ] **V2-0064 · OPEN · T02 / T03 / T04** — Boolean networks
- [ ] **V2-0065 · OPEN · T02 / T03 / T04** — graph dynamics
- [ ] **V2-0066 · OPEN · T02 / T03 / T04** — cellular automata
- [ ] **V2-0067 · PARTIAL · T02 / T03 / T04** — 1D/2D dynamical maps
- [ ] **V2-0068 · OPEN · T02 / T03 / T04** — 2D tilings
- [ ] **V2-0069 · OPEN · T02 / T03 / T04** — 3D tilings/tessellations
- [ ] **V2-0070 · OPEN · T02 / T03 / T04** — substitution systems
- [ ] **V2-0071 · OPEN · T02 / T03 / T04** — symmetry/chirality systems
- [ ] **V2-0072 · OPEN · T02 / T03 / T04** — geometry constructions
- [ ] **V2-0073 · OPEN · T02 / T03 / T04** — discrete ↔ continuous approximations
- [ ] **V2-0074 · PARTIAL · T02 / T03 / T04** — optimization landscapes
- [ ] **V2-0075 · OPEN · T02 / T03 / T04** — stochastic processes
- [ ] **V2-0076 · PARTIAL · T02 / T03 / T04** — coarse-graining/multiscale systems
- [ ] **V2-0077 · OPEN · T02 / T03 / T04** — combinatorial generation
- [ ] **V2-0078 · OPEN · T02 / T03 / T04** — symbolic algebra experiments
- [ ] **V2-0079 · OPEN · T02 / T03 / T04** — simple formal logic systems

## P1.5 High-value sandbox modes

- [ ] **V2-0080 · PARTIAL · T02 / T03 / T04** — **Mathematical Diff:** smallest changed assumption causing different behavior.
- [ ] **V2-0081 · PARTIAL · T02 / T03 / T04** — **Observer Switch:** same system, different distinguishability/coarse-graining.
- [ ] **V2-0082 · PARTIAL · T02 / T03 / T04** — **Conjecture Attack:** bounded adversarial/counterexample search.
- [ ] **V2-0083 · PARTIAL · T02 / T03 / T04** — **Parameter Sweep:** locate transitions and structural regimes.
- [ ] **V2-0084 · OPEN · T02 / T03 / T04** — **Invariant Search:** search candidate conserved or repeating structure.
- [ ] **V2-0085 · OPEN · T02 / T03 / T04** — **Rule Search:** search a family of simple rules for rare/nontrivial behavior.
- [ ] **V2-0086 · OPEN · T02 / T03 / T04** — **Representation Switch:** recurrence ↔ closed form ↔ graph ↔ automaton where known.
- [ ] **V2-0087 · OPEN · T02 / T03 / T04** — **Scale Switch:** microscopic ↔ mesoscopic ↔ macroscopic description.

---

# P2 — Mathematical world map

## P2.1 Typed relation graph

Never collapse these into one generic edge:

- [ ] **V2-0088 · PARTIAL · T09** — formally-requires
- [ ] **V2-0089 · PARTIAL · T09** — definition-uses
- [ ] **V2-0090 · PARTIAL · T09** — proof-uses
- [ ] **V2-0091 · PARTIAL · T09** — derives
- [ ] **V2-0092 · PARTIAL · T09** — equivalent-to
- [ ] **V2-0093 · PARTIAL · T09** — isomorphic-to
- [ ] **V2-0094 · PARTIAL · T09** — generalizes
- [ ] **V2-0095 · PARTIAL · T09** — specializes
- [ ] **V2-0096 · PARTIAL · T09** — contradicts/refutes
- [ ] **V2-0097 · PARTIAL · T09** — conceptually-explains
- [ ] **V2-0098 · PARTIAL · T09** — pedagogical-prerequisite
- [ ] **V2-0099 · PARTIAL · T09** — historically-influenced
- [ ] **V2-0100 · PARTIAL · T09** — independently-discovered
- [ ] **V2-0101 · PARTIAL · T09** — analogous-to
- [ ] **V2-0102 · PARTIAL · T09** — often-studied-with
- [ ] **V2-0103 · PARTIAL · T09** — computationally-suggests
- [ ] **V2-0104 · PARTIAL · T09** — hypothesized-connection
- [ ] **V2-0105 · PARTIAL · T09** — implemented-by
- [ ] **V2-0106 · PARTIAL · T09** — instantiated-by-experiment

## P2.2 Multi-resolution concept pages

- [ ] **V2-0107 · PARTIAL · T09** — plain statement
- [ ] **V2-0108 · PARTIAL · T09** — concrete example
- [ ] **V2-0109 · PARTIAL · T09** — interactive example
- [ ] **V2-0110 · PARTIAL · T09** — exact formulation
- [ ] **V2-0111 · PARTIAL · T09** — assumptions/context
- [ ] **V2-0112 · PARTIAL · T09** — definitions used
- [ ] **V2-0113 · PARTIAL · T09** — alternative formulations
- [ ] **V2-0114 · PARTIAL · T09** — typed dependencies
- [ ] **V2-0115 · PARTIAL · T09** — consequences
- [ ] **V2-0116 · PARTIAL · T09** — proofs / verification state
- [ ] **V2-0117 · PARTIAL · T09** — related experiments
- [ ] **V2-0118 · PARTIAL · T09** — historical development
- [ ] **V2-0119 · PARTIAL · T09** — primary sources
- [ ] **V2-0120 · PARTIAL · T09** — open questions
- [ ] **V2-0121 · PARTIAL · T09** — known counterexamples/limitations
- [ ] **V2-0122 · PARTIAL · T09** — machine-readable representation

## P2.3 Seed corridor to perfect

- [ ] **V2-0123 · PARTIAL · T09** — distinction
- [ ] **V2-0124 · PARTIAL · T09** — identity/equality
- [ ] **V2-0125 · PARTIAL · T09** — relation
- [ ] **V2-0126 · PARTIAL · T09** — grouping/partition
- [ ] **V2-0127 · PARTIAL · T09** — equivalence
- [ ] **V2-0128 · PARTIAL · T09** — order
- [ ] **V2-0129 · PARTIAL · T09** — composition
- [ ] **V2-0130 · PARTIAL · T09** — symmetry
- [ ] **V2-0131 · PARTIAL · T09** — chirality/orientation
- [ ] **V2-0132 · PARTIAL · T09** — invariance
- [ ] **V2-0133 · PARTIAL · T09** — parity/modular structure
- [ ] **V2-0134 · PARTIAL · T09** — sequence
- [ ] **V2-0135 · PARTIAL · T09** — iteration
- [ ] **V2-0136 · PARTIAL · T09** — recurrence
- [ ] **V2-0137 · PARTIAL · T09** — periodicity
- [ ] **V2-0138 · PARTIAL · T09** — quasiperiodicity
- [ ] **V2-0139 · PARTIAL · T09** — nonlinearity
- [ ] **V2-0140 · PARTIAL · T09** — fixed point
- [ ] **V2-0141 · PARTIAL · T09** — stability
- [ ] **V2-0142 · PARTIAL · T09** — sensitivity/error amplification
- [ ] **V2-0143 · PARTIAL · T09** — attractor/basin
- [ ] **V2-0144 · PARTIAL · T09** — coarse-graining
- [ ] **V2-0145 · PARTIAL · T09** — hierarchy/effective dynamics
- [ ] **V2-0146 · PARTIAL · T09** — optimization/exploration

Interpretations such as “discrete = maximal information” and “coarse-graining = intelligence” remain explicit hypotheses/lenses unless a precise theorem and assumptions are given.

---

# P3 — Artifact civilization: users create more than posts

The core social unit is a **durable artifact**, not a post.

## P3.1 First-class artifact types

- [ ] **V2-0147 · PARTIAL · T05** — Experiment
- [ ] **V2-0148 · SCHEMA ONLY · T05** — Mathematical object/system
- [ ] **V2-0149 · SCHEMA ONLY · T05** — Conjecture
- [ ] **V2-0150 · SCHEMA ONLY · T05** — Claim
- [ ] **V2-0151 · SCHEMA ONLY · T05** — Proof
- [ ] **V2-0152 · SCHEMA ONLY · T05** — Counterexample
- [ ] **V2-0153 · SCHEMA ONLY · T05** — Dataset
- [ ] **V2-0154 · SCHEMA ONLY · T05** — Visualization
- [ ] **V2-0155 · SCHEMA ONLY · T05** — Notebook
- [ ] **V2-0156 · SCHEMA ONLY · T05** — Collection/map
- [ ] **V2-0157 · SCHEMA ONLY · T05** — Lesson/path
- [ ] **V2-0158 · SCHEMA ONLY · T05** — Challenge/open problem
- [ ] **V2-0159 · SCHEMA ONLY · T05** — Tool
- [ ] **V2-0160 · SCHEMA ONLY · T05** — Analyzer
- [ ] **V2-0161 · SCHEMA ONLY · T05** — AI agent
- [ ] **V2-0162 · SCHEMA ONLY · T05** — Workflow
- [ ] **V2-0163 · SCHEMA ONLY · T05** — Project
- [ ] **V2-0164 · SCHEMA ONLY · T05** — Historical/source annotation
- [ ] **V2-0165 · SCHEMA ONLY · T05** — Translation
- [ ] **V2-0166 · SCHEMA ONLY · T05** — Reproduction
- [ ] **V2-0167 · SCHEMA ONLY · T05** — Negative result / failed approach

Every artifact has provenance, revisions, fork ancestry, ownership/stewardship, visibility, license, and export.

## P3.2 Artifact lifecycle

`draft → private/shared → public → reproduced → reviewed → qualified → superseded/refuted`

- [ ] **V2-0168 · PARTIAL · T05** — immutable revision history
- [ ] **V2-0169 · PARTIAL · T05** — branch/fork/merge
- [ ] **V2-0170 · SCHEMA ONLY · T05** — explicit provenance
- [ ] **V2-0171 · SCHEMA ONLY · T05** — citation between artifacts
- [ ] **V2-0172 · PARTIAL · T05** — dependency pinning
- [ ] **V2-0173 · PARTIAL · T05** — reproducibility metadata
- [ ] **V2-0174 · PARTIAL · T05** — archival export
- [ ] **V2-0175 · SCHEMA ONLY · T05** — deletion policy that separates account privacy from already-published public scholarly provenance

---

# P4 — Human identity and personal workspace

Accounts are mandatory for the civilization layer but never mandatory for reading mathematics.

- [ ] **V2-0176 · OPEN · T06** — stable user identity
- [ ] **V2-0177 · OPEN · T06** — profile
- [ ] **V2-0178 · PARTIAL · T06** — personal workspace
- [ ] **V2-0179 · PARTIAL · T06** — saved experiments
- [ ] **V2-0180 · PARTIAL · T06** — notebooks
- [ ] **V2-0181 · OPEN · T06** — collections
- [ ] **V2-0182 · PARTIAL · T06** — private drafts
- [ ] **V2-0183 · OPEN · T06** — public artifacts
- [ ] **V2-0184 · OPEN · T06** — contribution/provenance history
- [ ] **V2-0185 · OPEN · T06** — forks and reproductions
- [ ] **V2-0186 · OPEN · T06** — followed projects/groups/artifacts
- [ ] **V2-0187 · OPEN · T06** — notifications
- [ ] **V2-0188 · PARTIAL · T06** — export all user-created artifacts
- [ ] **V2-0189 · OPEN · T06** — account recovery
- [ ] **V2-0190 · OPEN · T06** — privacy controls
- [ ] **V2-0191 · OPEN · T06** — pseudonymous participation where legally/practically possible
- [ ] **V2-0192 · OPEN · T06** — no hidden score that controls mathematical truth

---

# P5 — Groups, recursive organizations, bonds, and alliances

This is not merely a chat/community feature. It is a higher-order organizational graph.

## P5.1 Groups

- [ ] **V2-0193 · OPEN · T07** — create/join/invite
- [ ] **V2-0194 · OPEN · T07** — roles and permissions
- [ ] **V2-0195 · OPEN · T07** — shared workspace
- [ ] **V2-0196 · OPEN · T07** — shared artifacts
- [ ] **V2-0197 · OPEN · T07** — shared experiment libraries
- [ ] **V2-0198 · OPEN · T07** — group challenges
- [ ] **V2-0199 · OPEN · T07** — group AI/tool registry
- [ ] **V2-0200 · OPEN · T07** — project boards
- [ ] **V2-0201 · OPEN · T07** — public/private groups
- [ ] **V2-0202 · OPEN · T07** — group provenance on joint work
- [ ] **V2-0203 · OPEN · T07** — group constitution/rules where desired

## P5.2 Recursive organizations

- [ ] **V2-0204 · OPEN · T07** — groups can contain subgroups
- [ ] **V2-0205 · OPEN · T07** — groups can form federations/alliances
- [ ] **V2-0206 · OPEN · T07** — alliances can have shared projects
- [ ] **V2-0207 · OPEN · T07** — alliances can have typed bonds
- [ ] **V2-0208 · OPEN · T07** — organizations can split/fork/merge
- [ ] **V2-0209 · OPEN · T07** — organizational ancestry is preserved
- [ ] **V2-0210 · OPEN · T07** — membership/role changes are event-sourced where feasible

Possible bond types:

- [ ] **V2-0211 · OPEN · T07** — collaboration
- [ ] **V2-0212 · OPEN · T07** — shared challenge
- [ ] **V2-0213 · OPEN · T07** — shared infrastructure
- [ ] **V2-0214 · OPEN · T07** — mentorship
- [ ] **V2-0215 · OPEN · T07** — formal partnership
- [ ] **V2-0216 · OPEN · T07** — temporary coalition
- [ ] **V2-0217 · OPEN · T07** — knowledge exchange

Do not force every relationship into “friend/follow.”

## P5.3 Governance boundary

- [ ] **V2-0218 · OPEN · T07** — social votes may rank attention, never truth
- [ ] **V2-0219 · OPEN · T07** — groups cannot vote a theorem true
- [ ] **V2-0220 · OPEN · T07** — mathematical qualification has explicit evidence/proof pathways
- [ ] **V2-0221 · OPEN · T07** — moderation actions have auditable provenance
- [ ] **V2-0222 · OPEN · T07** — appeals exist
- [ ] **V2-0223 · OPEN · T07** — organizations cannot erase public provenance of already-published artifacts
- [ ] **V2-0224 · OPEN · T07** — no single popularity metric

---

# P6 — AI-native QEVA

AI is not a chatbot bolted onto the site. It is a capability layer integrated with every artifact and workspace.

## P6.1 AI principles

- [ ] **V2-0225 · OPEN · T08** — model-provider agnostic
- [ ] **V2-0226 · OPEN · T08** — AI output is never canonical truth by default
- [ ] **V2-0227 · OPEN · T08** — every AI-generated artifact records model/tool/version and relevant inputs
- [ ] **V2-0228 · OPEN · T08** — user can inspect what an agent changed
- [ ] **V2-0229 · OPEN · T08** — canonical math promotion requires explicit qualification
- [ ] **V2-0230 · OPEN · T08** — AI memory belongs to a user/workspace and is exportable
- [ ] **V2-0231 · OPEN · T08** — no hidden AI action silently mutates public mathematical records

## P6.2 Personal adaptive AI

- [ ] **V2-0232 · OPEN · T08** — adapt explanation depth without changing mathematical content
- [ ] **V2-0233 · OPEN · T08** — infer prerequisite gaps from user interactions only with clear privacy controls
- [ ] **V2-0234 · OPEN · T08** — generate examples
- [ ] **V2-0235 · OPEN · T08** — generate counterexamples/candidate tests
- [ ] **V2-0236 · OPEN · T08** — translate notation
- [ ] **V2-0237 · OPEN · T08** — connect a concept to the user's existing map
- [ ] **V2-0238 · OPEN · T08** — suggest relevant sandbox experiments
- [ ] **V2-0239 · OPEN · T08** — summarize a project's unresolved questions
- [ ] **V2-0240 · OPEN · T08** — help reproduce another user's artifact
- [ ] **V2-0241 · OPEN · T08** — compare alternative formulations

## P6.3 Artifact AI

Every artifact can optionally have an AI workspace:

- [ ] **V2-0242 · OPEN · T08** — explain
- [ ] **V2-0243 · OPEN · T08** — critique
- [ ] **V2-0244 · OPEN · T08** — search related QEVA objects
- [ ] **V2-0245 · OPEN · T08** — run analyzers
- [ ] **V2-0246 · OPEN · T08** — propose tests
- [ ] **V2-0247 · OPEN · T08** — search for counterexamples
- [ ] **V2-0248 · OPEN · T08** — propose formalizations
- [ ] **V2-0249 · OPEN · T08** — generate visualizations
- [ ] **V2-0250 · OPEN · T08** — annotate dependencies
- [ ] **V2-0251 · OPEN · T08** — detect likely duplicates
- [ ] **V2-0252 · OPEN · T08** — create draft relations for human review

## P6.4 Group AI

- [ ] **V2-0253 · OPEN · T08** — group knowledge assistant
- [ ] **V2-0254 · OPEN · T08** — shared research memory
- [ ] **V2-0255 · OPEN · T08** — project summarizer
- [ ] **V2-0256 · OPEN · T08** — open-task detector
- [ ] **V2-0257 · OPEN · T08** — literature/source scout
- [ ] **V2-0258 · OPEN · T08** — experiment coordinator
- [ ] **V2-0259 · OPEN · T08** — reproducibility checker
- [ ] **V2-0260 · OPEN · T08** — agent permissions controlled by group roles

## P6.5 User-created AI agents

Users may create and share specialized agents.

Canonical `Agent` record:

- [ ] **V2-0261 · OPEN · T08** — owner/steward
- [ ] **V2-0262 · OPEN · T08** — instructions/specification
- [ ] **V2-0263 · OPEN · T08** — model/provider requirements
- [ ] **V2-0264 · OPEN · T08** — tools/capabilities
- [ ] **V2-0265 · OPEN · T08** — allowed data
- [ ] **V2-0266 · OPEN · T08** — network permissions
- [ ] **V2-0267 · OPEN · T08** — compute/budget constraints
- [ ] **V2-0268 · OPEN · T08** — version
- [ ] **V2-0269 · OPEN · T08** — dependencies
- [ ] **V2-0270 · OPEN · T08** — evaluation results
- [ ] **V2-0271 · OPEN · T08** — license
- [ ] **V2-0272 · OPEN · T08** — provenance
- [ ] **V2-0273 · OPEN · T08** — safety/permission manifest

Agent capabilities should be explicit:

- [ ] **V2-0274 · OPEN · T08** — read public graph
- [ ] **V2-0275 · OPEN · T08** — read private workspace
- [ ] **V2-0276 · OPEN · T08** — run sandbox
- [ ] **V2-0277 · OPEN · T08** — invoke approved tools
- [ ] **V2-0278 · OPEN · T08** — write drafts
- [ ] **V2-0279 · OPEN · T08** — propose graph edges
- [ ] **V2-0280 · OPEN · T08** — create experiments
- [ ] **V2-0281 · OPEN · T08** — publish only when explicitly authorized
- [ ] **V2-0282 · OPEN · T08** — external network access only when explicitly granted

Human accounts and AI-agent identities must be distinct.

## P6.6 AI evaluation

- [ ] **V2-0283 · OPEN · T08** — benchmark mathematical factuality
- [ ] **V2-0284 · OPEN · T08** — benchmark proof-status calibration
- [ ] **V2-0285 · OPEN · T08** — benchmark counterexample generation
- [ ] **V2-0286 · OPEN · T08** — benchmark extraction
- [ ] **V2-0287 · OPEN · T08** — benchmark tool use
- [ ] **V2-0288 · OPEN · T08** — benchmark reproducibility
- [ ] **V2-0289 · OPEN · T08** — retain known failure cases
- [ ] **V2-0290 · OPEN · T08** — compare models without hard-coding QEVA to one vendor

---

# P7 — User-created tools and executable ecosystem

QEVA should let users extend QEVA.

## P7.1 Tool registry

First-class types:

- [ ] **V2-0291 · OPEN · T08** — analyzer
- [ ] **V2-0292 · OPEN · T08** — simulator
- [ ] **V2-0293 · OPEN · T08** — renderer
- [ ] **V2-0294 · OPEN · T08** — importer
- [ ] **V2-0295 · OPEN · T08** — exporter
- [ ] **V2-0296 · OPEN · T08** — theorem-prover bridge
- [ ] **V2-0297 · OPEN · T08** — search strategy
- [ ] **V2-0298 · OPEN · T08** — transformation
- [ ] **V2-0299 · OPEN · T08** — data connector
- [ ] **V2-0300 · OPEN · T08** — educational interaction
- [ ] **V2-0301 · OPEN · T08** — AI workflow

Every tool needs:

- [ ] **V2-0302 · OPEN · T08** — manifest
- [ ] **V2-0303 · OPEN · T08** — version
- [ ] **V2-0304 · OPEN · T08** — author/provenance
- [ ] **V2-0305 · OPEN · T08** — license
- [ ] **V2-0306 · OPEN · T08** — deterministic dependencies where possible
- [ ] **V2-0307 · OPEN · T08** — input/output schema
- [ ] **V2-0308 · OPEN · T08** — permissions
- [ ] **V2-0309 · OPEN · T08** — resource limits
- [ ] **V2-0310 · OPEN · T08** — test fixtures
- [ ] **V2-0311 · OPEN · T08** — compatibility declaration

## P7.2 Safe execution

User code is hostile by default.

- [ ] **V2-0312 · OPEN · T08** — sandbox untrusted code
- [ ] **V2-0313 · OPEN · T08** — no arbitrary filesystem access
- [ ] **V2-0314 · OPEN · T08** — no arbitrary network by default
- [ ] **V2-0315 · OPEN · T08** — explicit capability grants
- [ ] **V2-0316 · OPEN · T08** — CPU/memory/time limits
- [ ] **V2-0317 · OPEN · T08** — dependency pinning
- [ ] **V2-0318 · OPEN · T08** — deterministic/reproducible mode
- [ ] **V2-0319 · OPEN · T08** — isolate secrets
- [ ] **V2-0320 · OPEN · T08** — scan uploaded packages
- [ ] **V2-0321 · OPEN · T08** — abuse/rate controls

WASM/isolated containers are candidates; do not select implementation prematurely.

## P7.3 Extensible analyzer protocol

A user-created analyzer should be able to accept a canonical Experiment and return typed observations/candidates without modifying canonical truth.

- [ ] **V2-0322 · OPEN · T08** — standard analyzer API
- [ ] **V2-0323 · OPEN · T08** — observation schema
- [ ] **V2-0324 · OPEN · T08** — evidence attachment
- [ ] **V2-0325 · OPEN · T08** — confidence/calibration
- [ ] **V2-0326 · OPEN · T08** — reproducibility record
- [ ] **V2-0327 · OPEN · T08** — analyzer version pinning
- [ ] **V2-0328 · OPEN · T08** — comparison between analyzers

---

# P8 — Search, discovery, learning, and adaptive navigation

## P8.1 Unified search

Search over:

- [ ] **V2-0329 · PARTIAL · T01 / T09** — concepts
- [ ] **V2-0330 · PARTIAL · T01 / T09** — formulas
- [ ] **V2-0331 · PARTIAL · T01 / T09** — theorems
- [ ] **V2-0332 · PARTIAL · T01 / T09** — proofs
- [ ] **V2-0333 · PARTIAL · T01 / T09** — open problems
- [ ] **V2-0334 · PARTIAL · T01 / T09** — works
- [ ] **V2-0335 · PARTIAL · T01 / T09** — people
- [ ] **V2-0336 · PARTIAL · T01 / T09** — experiments
- [ ] **V2-0337 · PARTIAL · T01 / T09** — tools
- [ ] **V2-0338 · PARTIAL · T01 / T09** — agents
- [ ] **V2-0339 · PARTIAL · T01 / T09** — users/groups where public
- [ ] **V2-0340 · PARTIAL · T01 / T09** — historical events
- [ ] **V2-0341 · PARTIAL · T01 / T09** — datasets
- [ ] **V2-0342 · PARTIAL · T01 / T09** — challenges

Capabilities:

- [ ] **V2-0343 · PARTIAL · T01 / T09** — formula-aware search
- [ ] **V2-0344 · PARTIAL · T01 / T09** — synonym search
- [ ] **V2-0345 · PARTIAL · T01 / T09** — notation-aware search
- [ ] **V2-0346 · PARTIAL · T01 / T09** — multilingual search
- [ ] **V2-0347 · PARTIAL · T01 / T09** — prerequisite search
- [ ] **V2-0348 · PARTIAL · T01 / T09** — equivalent-formulation search
- [ ] **V2-0349 · PARTIAL · T01 / T09** — “same mechanism elsewhere”
- [ ] **V2-0350 · PARTIAL · T01 / T09** — “experiments instantiating this”
- [ ] **V2-0351 · PARTIAL · T01 / T09** — “open problems downstream”
- [ ] **V2-0352 · PARTIAL · T01 / T09** — “historical development”

## P8.2 Learning paths

Brilliant-like pedagogy without reducing QEVA to a course platform.

- [ ] **V2-0353 · OPEN · T01 / T09** — adaptive first-principles paths
- [ ] **V2-0354 · OPEN · T01 / T09** — interactive checks
- [ ] **V2-0355 · OPEN · T01 / T09** — direct transition from lesson to sandbox
- [ ] **V2-0356 · OPEN · T01 / T09** — concept mastery inferred cautiously
- [ ] **V2-0357 · OPEN · T01 / T09** — multiple explanation paths
- [ ] **V2-0358 · OPEN · T01 / T09** — learner may inspect full formal object at any time
- [ ] **V2-0359 · OPEN · T01 / T09** — user can author/share paths
- [ ] **V2-0360 · OPEN · T01 / T09** — groups can curate paths
- [ ] **V2-0361 · OPEN · T01 / T09** — AI can adapt sequence but not alter canonical definitions

---

# P9 — Achievement, reputation, and coordination without Goodhart collapse

Do not build engagement-score civilization.

## P9.1 Durable contribution records

Recognize:

- [ ] **V2-0362 · OPEN · T12** — reproduced experiment
- [ ] **V2-0363 · OPEN · T12** — verified counterexample
- [ ] **V2-0364 · OPEN · T12** — accepted proof/formalization
- [ ] **V2-0365 · OPEN · T12** — useful analyzer/tool
- [ ] **V2-0366 · OPEN · T12** — source reconciliation
- [ ] **V2-0367 · OPEN · T12** — historical correction
- [ ] **V2-0368 · OPEN · T12** — duplicate resolution
- [ ] **V2-0369 · OPEN · T12** — reusable visualization
- [ ] **V2-0370 · OPEN · T12** — translation
- [ ] **V2-0371 · OPEN · T12** — benchmark contribution
- [ ] **V2-0372 · OPEN · T12** — resolved open task

## P9.2 Reputation must be multidimensional

Do not create one scalar “QEVA score.”

Possible independent dimensions:

- [ ] **V2-0373 · OPEN · T12** — proof reliability
- [ ] **V2-0374 · OPEN · T12** — reproducibility
- [ ] **V2-0375 · OPEN · T12** — source quality
- [ ] **V2-0376 · OPEN · T12** — tool reliability
- [ ] **V2-0377 · OPEN · T12** — explanation usefulness
- [ ] **V2-0378 · OPEN · T12** — moderation trust
- [ ] **V2-0379 · OPEN · T12** — historical research quality

All should be transparent and contestable.

Never claim “first discovery in history” from a QEVA timestamp; only “first recorded on QEVA” until independently established.

---

# P10 — Historical world map

## P10.1 Separate graphs permanently

`logical ancestry ≠ historical influence ≠ pedagogical prerequisite`

## P10.2 Historical nodes

- [ ] **V2-0380 · PARTIAL · T10** — people
- [ ] **V2-0381 · PARTIAL · T10** — works
- [ ] **V2-0382 · PARTIAL · T10** — manuscripts
- [ ] **V2-0383 · PARTIAL · T10** — concepts
- [ ] **V2-0384 · PARTIAL · T10** — theorems
- [ ] **V2-0385 · PARTIAL · T10** — methods
- [ ] **V2-0386 · PARTIAL · T10** — tools
- [ ] **V2-0387 · PARTIAL · T10** — institutions
- [ ] **V2-0388 · PARTIAL · T10** — traditions
- [ ] **V2-0389 · PARTIAL · T10** — fields
- [ ] **V2-0390 · PARTIAL · T10** — formalizations
- [ ] **V2-0391 · PARTIAL · T10** — independent rediscoveries

## P10.3 Historical uncertainty

- [ ] **V2-0392 · PARTIAL · T10** — uncertain date intervals
- [ ] **V2-0393 · PARTIAL · T10** — disputed attribution
- [ ] **V2-0394 · PARTIAL · T10** — parallel traditions
- [ ] **V2-0395 · PARTIAL · T10** — multilingual names/scripts
- [ ] **V2-0396 · PARTIAL · T10** — explicit source provenance
- [ ] **V2-0397 · PARTIAL · T10** — never imply completeness of lost history

## P10.4 Visualization

- [ ] **V2-0398 · PARTIAL · T10** — zoomable time × branch graph
- [ ] **V2-0399 · PARTIAL · T10** — filter by field/concept/person/work
- [ ] **V2-0400 · PARTIAL · T10** — show logical vs historical edges distinctly
- [ ] **V2-0401 · PARTIAL · T10** — compare field growth using multiple measures
- [ ] **V2-0402 · PARTIAL · T10** — never use paper count as “progress”
- [ ] **V2-0403 · PARTIAL · T10** — derived “promising/stuck” views must expose the metric vector

---

# P11 — Harvester and external knowledge bridge

The harvester feeds QEVA; it is not the public identity.

## P11.1 Acquisition

- [ ] **V2-0404 · OPEN · T11** — OpenAlex bulk snapshot
- [ ] **V2-0405 · OPEN · T11** — Crossref bulk data
- [ ] **V2-0406 · OPEN · T11** — arXiv OAI-PMH metadata
- [ ] **V2-0407 · OPEN · T11** — arXiv source/PDF where rights permit
- [ ] **V2-0408 · OPEN · T11** — OEIS bulk data
- [ ] **V2-0409 · OPEN · T11** — zbMATH Open
- [ ] **V2-0410 · OPEN · T11** — Wikidata dumps
- [ ] **V2-0411 · OPEN · T11** — Mathlib declaration/import/proof graph
- [ ] **V2-0412 · OPEN · T11** — Internet Archive targeted historical material
- [ ] **V2-0413 · PARTIAL · T11** — Common Crawl URL-index discovery, then selective WARC/WET retrieval

## P11.2 Storage stages

- [ ] **V2-0414 · PARTIAL · T11** — raw immutable bytes
- [ ] **V2-0415 · PARTIAL · T11** — normalized source records
- [ ] **V2-0416 · PARTIAL · T11** — reconciled identities
- [ ] **V2-0417 · PARTIAL · T11** — parsed documents
- [ ] **V2-0418 · PARTIAL · T11** — extracted candidate math objects
- [ ] **V2-0419 · PARTIAL · T11** — qualified QEVA objects

Start with object storage + Parquet + DuckDB/PostgreSQL. Add distributed systems only after measured bottlenecks.

## P11.3 Parsing priority

`TeX/XML > structured HTML > PDF layout/text > OCR`

- [ ] **V2-0420 · OPEN · T11** — theorem/definition/proof/equation segmentation
- [ ] **V2-0421 · PARTIAL · T11** — LaTeX/MathML preservation
- [ ] **V2-0422 · OPEN · T11** — PDF → structured representation
- [ ] **V2-0423 · OPEN · T11** — OCR only for scans
- [ ] **V2-0424 · PARTIAL · T11** — exact source locator for every extracted claim

## P11.4 Mathematical extraction

- [ ] **V2-0425 · PARTIAL · T11** — definitions
- [ ] **V2-0426 · PARTIAL · T11** — theorem/lemma/proposition statements
- [ ] **V2-0427 · PARTIAL · T11** — assumptions
- [ ] **V2-0428 · PARTIAL · T11** — notation scope
- [ ] **V2-0429 · PARTIAL · T11** — equations
- [ ] **V2-0430 · PARTIAL · T11** — proofs
- [ ] **V2-0431 · PARTIAL · T11** — conjectures
- [ ] **V2-0432 · PARTIAL · T11** — counterexamples
- [ ] **V2-0433 · PARTIAL · T11** — open questions
- [ ] **V2-0434 · PARTIAL · T11** — methods
- [ ] **V2-0435 · PARTIAL · T11** — explicit confidence
- [ ] **V2-0436 · PARTIAL · T11** — no automatic promotion to truth

## P11.5 Entity resolution

Exact IDs first:

- [ ] **V2-0437 · PARTIAL · T11** — DOI
- [ ] **V2-0438 · PARTIAL · T11** — arXiv
- [ ] **V2-0439 · PARTIAL · T11** — ISBN
- [ ] **V2-0440 · OPEN · T11** — OEIS
- [ ] **V2-0441 · OPEN · T11** — zbMATH
- [ ] **V2-0442 · OPEN · T11** — Wikidata
- [ ] **V2-0443 · PARTIAL · T11** — ORCID
- [ ] **V2-0444 · OPEN · T11** — Mathlib declaration + commit

Then candidate matching:

- [ ] **V2-0445 · PARTIAL · T11** — title
- [ ] **V2-0446 · PARTIAL · T11** — authors
- [ ] **V2-0447 · PARTIAL · T11** — dates
- [ ] **V2-0448 · PARTIAL · T11** — references
- [ ] **V2-0449 · PARTIAL · T11** — equations
- [ ] **V2-0450 · PARTIAL · T11** — semantic similarity
- [ ] **V2-0451 · PARTIAL · T11** — notation normalization
- [ ] **V2-0452 · PARTIAL · T11** — human review for ambiguous merges

## P11.6 Production execution

- [ ] **V2-0453 · PARTIAL · T11** — resumable jobs
- [ ] **V2-0454 · PARTIAL · T11** — checkpoints
- [ ] **V2-0455 · PARTIAL · T11** — retries/backoff
- [ ] **V2-0456 · PARTIAL · T11** — rights ledger
- [ ] **V2-0457 · PARTIAL · T11** — parser/version ledger
- [ ] **V2-0458 · PARTIAL · T11** — object storage
- [ ] **V2-0459 · PARTIAL · T11** — persistent database/index
- [ ] **V2-0460 · OPEN · T11** — job queue
- [ ] **V2-0461 · OPEN · T11** — workers
- [ ] **V2-0462 · OPEN · T11** — dead-letter queue
- [ ] **V2-0463 · PARTIAL · T11** — metrics
- [ ] **V2-0464 · OPEN · T11** — 10k pilot
- [ ] **V2-0465 · OPEN · T11** — 100k pilot
- [ ] **V2-0466 · OPEN · T11** — 1M corpus
- [ ] **V2-0467 · PARTIAL · T11** — scale only after quality benchmarks

---

# P12 — Extraction and AI quality benchmarks

A larger corpus is not progress if QEVA cannot reliably structure it.

- [ ] **V2-0468 · OPEN · T11 / T08** — hand-labelled benchmark corpus
- [ ] **V2-0469 · OPEN · T11 / T08** — theorem segmentation precision/recall
- [ ] **V2-0470 · OPEN · T11 / T08** — definition segmentation
- [ ] **V2-0471 · OPEN · T11 / T08** — equation extraction
- [ ] **V2-0472 · OPEN · T11 / T08** — proof segmentation
- [ ] **V2-0473 · OPEN · T11 / T08** — citation reconciliation
- [ ] **V2-0474 · OPEN · T11 / T08** — identity matching
- [ ] **V2-0475 · OPEN · T11 / T08** — duplicate theorem detection
- [ ] **V2-0476 · OPEN · T11 / T08** — relation extraction
- [ ] **V2-0477 · OPEN · T11 / T08** — historical entity matching
- [ ] **V2-0478 · OPEN · T11 / T08** — multilingual benchmark
- [ ] **V2-0479 · OPEN · T11 / T08** — AI explanation correctness
- [ ] **V2-0480 · OPEN · T11 / T08** — AI proof-status calibration
- [ ] **V2-0481 · OPEN · T11 / T08** — AI sandbox-agent reliability
- [ ] **V2-0482 · OPEN · T11 / T08** — publish known failure sets

---

# P13 — Verifier redesign

## Tier A — canonical integrity: every commit

- [ ] **V2-0483 · PASS / bounded · T13** — schemas
- [ ] **V2-0484 · PASS / bounded · T13** — IDs/revisions
- [ ] **V2-0485 · PASS / bounded · T13** — typed references
- [ ] **V2-0486 · PASS / bounded · T13** — canonical exports
- [ ] **V2-0487 · PASS / bounded · T13** — proof certificates when claimed
- [ ] **V2-0488 · PASS / bounded · T13** — no missing verification artifact when claimed

## Tier B — product/runtime: before deploy

- [ ] **V2-0489 · PASS / bounded · T13** — homepage/routes
- [ ] **V2-0490 · PASS / bounded · T13** — local links
- [ ] **V2-0491 · PASS / bounded · T13** — JS/Python syntax
- [ ] **V2-0492 · PASS / bounded · T13** — sandbox fixtures
- [ ] **V2-0493 · OPEN · T13** — authentication smoke tests when introduced
- [ ] **V2-0494 · OPEN · T13** — tool execution isolation tests
- [ ] **V2-0495 · PASS / bounded · T13** — no accidental network dependency for offline mathematical core

## Tier C — preservation release

- [ ] **V2-0496 · PASS / bounded · T13** — full manifests
- [ ] **V2-0497 · PASS / bounded · T13** — canonical-core manifest
- [ ] **V2-0498 · PASS / bounded · T13** — BagIt/recovery package
- [ ] **V2-0499 · OPEN · T13** — mirror/recovery test
- [ ] **V2-0500 · PASS / bounded · T13** — legacy-byte promise only when explicitly made

Packaging failures must not masquerade as mathematical failures.

---

# P14 — Durability: split the living system from the permanent core

A living civilization introduces databases, authentication, AI providers, queues, and executable code. Those are less durable than static mathematics.

Therefore QEVA must have two interoperable forms:

## Live QEVA

- accounts
- groups
- alliances
- AI agents
- notifications
- private workspaces
- jobs
- compute
- dynamic collaboration

## Permanent QEVA export

- canonical mathematical graph
- public artifact revisions
- public provenance
- experiments
- tools/specifications
- historical graph
- source metadata
- organization/public contribution history where appropriate
- open schemas
- reconstruction documentation

- [ ] **V2-0501 · PARTIAL · T13** — live service can fail without destroying public mathematics
- [ ] **V2-0502 · PARTIAL · T13** — regular static/export snapshots
- [ ] **V2-0503 · PARTIAL · T13** — user artifact export
- [ ] **V2-0504 · PARTIAL · T13** — model-provider independence
- [ ] **V2-0505 · PARTIAL · T13** — authentication-provider independence where practical
- [ ] **V2-0506 · PARTIAL · T13** — database migrations documented
- [ ] **V2-0507 · PARTIAL · T13** — no proprietary service is required to interpret permanent exports
- [ ] **V2-0508 · PARTIAL · T13** — public mathematical pages remain renderable without AI

---

# P15 — Hard pain points QEVA should solve

Ranked by value and fit:

1. **Rule → behavior opacity** — what does a simple rule actually produce?
2. **Same machinery hidden across fields** — expose repeated structural mechanisms.
3. **Assumption opacity** — what exactly must already exist for this claim?
4. **Static mathematics** — change assumptions and see consequences.
5. **Representation fragmentation** — same object expressed as recurrence, formula, graph, automaton, geometry, etc.
6. **Observer dependence** — change coarse-graining/measurement and compare emergent behavior.
7. **Unrecorded exploration** — preserve failures, forks, experiments, counterexamples.
8. **Open-problem entry barrier** — expose known approaches and exact unresolved bottlenecks.
9. **Tool fragmentation** — simulations, proof tools, notebooks, visualizers, and datasets live in incompatible silos.
10. **Collaboration fragmentation** — research objects are scattered across chats, repos, papers, notebooks, and private files.
11. **AI fragmentation** — personal AI work disappears into isolated chats instead of becoming reproducible artifacts/tools.
12. **Learning ↔ research discontinuity** — educational systems end before genuine exploration begins.
13. **Historical fragmentation** — logical ancestry and actual historical development are disconnected.
14. **Discovery overload** — papers accumulate faster than people can reconstruct the underlying machinery.
15. **Negative-result loss** — failed approaches are repeatedly rediscovered.
16. **No shared computational substrate for mathematics** — users cannot easily define a system and invoke a common library of analyzers.
17. **No durable provenance for human+AI co-creation** — it becomes unclear what was generated, checked, reproduced, or verified.
18. **Difficulty forming adaptive research organizations** — groups cannot easily share evolving mathematical tools, agents, maps, and experiments.

---

# P16 — Explicit anti-goals / failure modes

QEVA fails if it becomes:

- [ ] **V2-0509 · POLICY / GATE · T12** — a social feed with mathematics attached
- [ ] **V2-0510 · POLICY / GATE · T12** — an AI chatbot with a math skin
- [ ] **V2-0511 · POLICY / GATE · T12** — an engagement-optimized gamification product
- [ ] **V2-0512 · POLICY / GATE · T12** — a giant scraped corpus with no structural extraction
- [ ] **V2-0513 · POLICY / GATE · T12** — a static encyclopedia
- [ ] **V2-0514 · POLICY / GATE · T12** — a collection of disconnected interactive demos
- [ ] **V2-0515 · POLICY / GATE · T12** — one founder's ontology presented as mathematical truth
- [ ] **V2-0516 · POLICY / GATE · T12** — a platform where popularity controls epistemic status
- [ ] **V2-0517 · POLICY / GATE · T12** — a closed ecosystem tied to one AI vendor
- [ ] **V2-0518 · POLICY / GATE · T12** — a tool marketplace executing arbitrary unsafe code
- [ ] **V2-0519 · POLICY / GATE · T12** — a civilization layer whose account database is more important than its public knowledge
- [ ] **V2-0520 · POLICY / GATE · T12** — a project whose grand vision text is more developed than its usable mathematical machinery

---

# P17 — Immediate execution order

Do not build the entire civilization before proving one strong loop.

## Phase 1 — Public mathematical instrument

1. [ ] **V2-0521 · PARTIAL · G0–G6** — Clean public UI to `Explore / Lab / History / Search`.
2. [ ] **V2-0522 · PARTIAL · G0–G6** — Remove backend/version/ambition language from frontend.
3. [ ] **V2-0523 · PARTIAL · G0–G6** — Specify canonical Experiment schema.
4. [ ] **V2-0524 · PARTIAL · G0–G6** — Convert existing demos to the shared Experiment model.
5. [ ] **V2-0525 · PARTIAL · G0–G6** — Build Mathematical Diff, Observer Switch, Parameter Sweep, and Conjecture Attack.
6. [ ] **V2-0526 · PARTIAL · G0–G6** — Build first automatic analyzers.
7. [ ] **V2-0527 · PARTIAL · G0–G6** — Replace generic logical edges with typed relations.
8. [ ] **V2-0528 · PARTIAL · G0–G6** — Perfect one seed corridor from distinction through recurrence/coarse-graining.

## Phase 2 — Minimal living civilization

9. [ ] **V2-0529 · PARTIAL · G0–G6** — Add accounts.
10. [ ] **V2-0530 · PARTIAL · G0–G6** — Add personal workspaces and artifact save/fork/publish.
11. [ ] **V2-0531 · PARTIAL · G0–G6** — Add first-class artifact graph.
12. [ ] **V2-0532 · PARTIAL · G0–G6** — Add groups with shared workspaces.
13. [ ] **V2-0533 · PARTIAL · G0–G6** — Add typed group bonds/alliances.
14. [ ] **V2-0534 · PARTIAL · G0–G6** — Add contribution provenance and multidimensional reputation.
15. [ ] **V2-0535 · PARTIAL · G0–G6** — Add discussion/coordination only around artifacts/projects, not a global engagement feed.

## Phase 3 — AI-native creation

16. [ ] **V2-0536 · PARTIAL · G0–G6** — Define Agent manifest and capability model.
17. [ ] **V2-0537 · PARTIAL · G0–G6** — Add personal adaptive AI over QEVA objects.
18. [ ] **V2-0538 · PARTIAL · G0–G6** — Add artifact AI workspaces.
19. [ ] **V2-0539 · PARTIAL · G0–G6** — Add group AI.
20. [ ] **V2-0540 · PARTIAL · G0–G6** — Add user-created agents.
21. [ ] **V2-0541 · PARTIAL · G0–G6** — Add tool registry and safe execution sandbox.
22. [ ] **V2-0542 · PARTIAL · G0–G6** — Add evaluation/benchmark framework for agents and tools.

## Phase 4 — External world ingestion

23. [ ] **V2-0543 · PARTIAL · G0–G6** — Redesign verifier into Canonical / Runtime / Preservation tiers.
24. [ ] **V2-0544 · PARTIAL · G0–G6** — Run 10k-work harvester pilot.
25. [ ] **V2-0545 · PARTIAL · G0–G6** — OpenAlex snapshot importer.
26. [ ] **V2-0546 · PARTIAL · G0–G6** — arXiv metadata/source pipeline.
27. [ ] **V2-0547 · PARTIAL · G0–G6** — Crossref bulk importer.
28. [ ] **V2-0548 · PARTIAL · G0–G6** — TeX-first mathematical extraction.
29. [ ] **V2-0549 · PARTIAL · G0–G6** — PDF fallback.
30. [ ] **V2-0550 · PARTIAL · G0–G6** — extraction benchmark before scaling.
31. [ ] **V2-0551 · PARTIAL · G0–G6** — OEIS/Wikidata/Mathlib/zbMATH/Internet Archive.
32. [ ] **V2-0552 · PARTIAL · G0–G6** — Common Crawl discovery after structured-source pipeline works.
33. [ ] **V2-0553 · PARTIAL · G0–G6** — 100k → 1M corpus only after extraction quality is measured.

## Phase 5 — Historical and civilizational scaling

34. [ ] **V2-0554 · PARTIAL · G0–G6** — Source-grounded historical graph.
35. [ ] **V2-0555 · PARTIAL · G0–G6** — time × branch visualization.
36. [ ] **V2-0556 · PARTIAL · G0–G6** — recursive organizations and alliance projects.
37. [ ] **V2-0557 · PARTIAL · G0–G6** — public AI/tool ecosystems.
38. [ ] **V2-0558 · PARTIAL · G0–G6** — scalable queues/storage/compute only when measured load requires them.
39. [ ] **V2-0559 · PARTIAL · G0–G6** — static public snapshots and mirror protocol for all durable public artifacts.
40. [ ] **V2-0560 · PARTIAL · G0–G6** — continuous migration/reconstruction drills.

---

# P18 — Critical unresolved design decisions

These must be answered explicitly before the relevant subsystem is frozen.

1. What exact object types can a user create?
2. Can a group own an artifact, or only steward it?
3. Can an AI agent publish autonomously, or only produce drafts/proposals?
4. What permissions can an agent receive?
5. Which tools may access the network?
6. What execution substrate will safely run user code?
7. How is compute allocated and rate-limited?
8. Can organizations recursively contain organizations without a fixed depth?
9. What semantics distinguish a bond, alliance, federation, project, and membership?
10. What public actions are immutable provenance events?
11. What may a user delete for privacy?
12. What is the merge process when two mathematical objects are judged equivalent?
13. What evidence qualifies computational observations for promotion?
14. Who can modify canonical explanatory relations?
15. How are disputes represented rather than erased?
16. How are AI-generated mathematical claims labelled forever?
17. How are model/tool versions preserved when providers disappear?
18. Can QEVA be fully browsed if all AI providers are offline?
19. Which part of a personalized interface is canonical and which is user-specific?
20. How much of the civilization's social history should enter permanent public snapshots?

---

## Current priority allocation

Directional only:

- **35%** Universal sandbox / Mechanism Engine
- **20%** artifact + account + group civilization layer
- **15%** AI/agent/tool ecosystem
- **10%** mathematical world map
- **8%** harvesting/extraction
- **5%** historical graph
- **4%** search/learning
- **3%** preservation/verifier/protocol

The earlier TODO underweighted the civilization and AI layers. The new allocation treats mathematics as the substrate, the sandbox as the engine, artifacts as the durable units of creation, humans/groups/alliances as the organizational dynamics, and AI/tools as extensible capabilities.
