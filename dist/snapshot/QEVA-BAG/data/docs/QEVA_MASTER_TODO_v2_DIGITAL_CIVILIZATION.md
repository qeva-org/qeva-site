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

- [ ] Homepage contains only: `Explore`, `Lab`, `History`, `Search`, account access.
- [ ] Remove release numbers, crawler status, manifests, constitution, preservation rhetoric, roadmap, and internal ambition from the main UI.
- [ ] Use neutral, monotone language.
- [ ] No motivational slogans, dramatic claims, or developer notes in canonical mathematical pages.
- [ ] Mathematics remains usable without login.
- [ ] Account features become visible only when the user creates, saves, joins, collaborates, or publishes.
- [ ] Every public concept page has a direct action: `explore`, `run`, `change`, `compare`, or `build`.

## P0.2 First user experience

- [ ] Visitor selects a mechanism or rule.
- [ ] QEVA shows one concrete example.
- [ ] Visitor changes one assumption/parameter.
- [ ] QEVA immediately shows what changed.
- [ ] Visitor can expand to exact definitions, dependencies, proofs, history, and known related systems.
- [ ] Visitor can fork the object into the Lab without creating an account.
- [ ] Saving/publishing the fork requests an account.

---

# P1 — Universal mathematical sandbox / Mechanism Engine

This remains the strongest near-term product.

## P1.1 Canonical Experiment object

- [ ] state space
- [ ] objects/entities
- [ ] relations
- [ ] operations/update rule
- [ ] parameters
- [ ] initial/boundary conditions
- [ ] observer/coarse-graining
- [ ] randomness source and seed
- [ ] run bounds
- [ ] analyzer versions
- [ ] outputs
- [ ] provenance
- [ ] parent/fork relation
- [ ] exact executable representation where possible
- [ ] content-addressed immutable revision

## P1.2 Compositional construction

Users must be able to construct systems rather than only run curated demos.

- [ ] choose/define state space
- [ ] choose/define operations
- [ ] compose operations
- [ ] define recurrence/update rule
- [ ] define constraints
- [ ] define observer/coarse-graining
- [ ] define stopping conditions
- [ ] perturb parameters or assumptions
- [ ] compare two systems
- [ ] fork any public experiment
- [ ] import/export experiment definitions

## P1.3 Automatic analyzers

Where mathematically meaningful, test or estimate:

- [ ] fixed points
- [ ] finite/eventual periods
- [ ] conserved quantities
- [ ] candidate invariants
- [ ] symmetry / broken symmetry
- [ ] chirality / orientation distinctions
- [ ] sensitivity to initial conditions
- [ ] perturbation growth
- [ ] attractors
- [ ] basins
- [ ] bifurcations
- [ ] graph components/cycles/connectivity
- [ ] local/global optima
- [ ] entropy/information summaries under explicit definitions
- [ ] coarse-grained effective dynamics
- [ ] scale dependence
- [ ] hierarchy / repeated macrostructure
- [ ] counterexample search
- [ ] equivalence/isomorphism candidates
- [ ] numerical/experimental evidence strength

Never label finite computation or heuristic search as proof.

## P1.4 Sandbox families

- [ ] sequences
- [ ] recurrences
- [ ] finite-state systems
- [ ] Boolean networks
- [ ] graph dynamics
- [ ] cellular automata
- [ ] 1D/2D dynamical maps
- [ ] 2D tilings
- [ ] 3D tilings/tessellations
- [ ] substitution systems
- [ ] symmetry/chirality systems
- [ ] geometry constructions
- [ ] discrete ↔ continuous approximations
- [ ] optimization landscapes
- [ ] stochastic processes
- [ ] coarse-graining/multiscale systems
- [ ] combinatorial generation
- [ ] symbolic algebra experiments
- [ ] simple formal logic systems

## P1.5 High-value sandbox modes

- [ ] **Mathematical Diff:** smallest changed assumption causing different behavior.
- [ ] **Observer Switch:** same system, different distinguishability/coarse-graining.
- [ ] **Conjecture Attack:** bounded adversarial/counterexample search.
- [ ] **Parameter Sweep:** locate transitions and structural regimes.
- [ ] **Invariant Search:** search candidate conserved or repeating structure.
- [ ] **Rule Search:** search a family of simple rules for rare/nontrivial behavior.
- [ ] **Representation Switch:** recurrence ↔ closed form ↔ graph ↔ automaton where known.
- [ ] **Scale Switch:** microscopic ↔ mesoscopic ↔ macroscopic description.

---

# P2 — Mathematical world map

## P2.1 Typed relation graph

Never collapse these into one generic edge:

- [ ] formally-requires
- [ ] definition-uses
- [ ] proof-uses
- [ ] derives
- [ ] equivalent-to
- [ ] isomorphic-to
- [ ] generalizes
- [ ] specializes
- [ ] contradicts/refutes
- [ ] conceptually-explains
- [ ] pedagogical-prerequisite
- [ ] historically-influenced
- [ ] independently-discovered
- [ ] analogous-to
- [ ] often-studied-with
- [ ] computationally-suggests
- [ ] hypothesized-connection
- [ ] implemented-by
- [ ] instantiated-by-experiment

## P2.2 Multi-resolution concept pages

- [ ] plain statement
- [ ] concrete example
- [ ] interactive example
- [ ] exact formulation
- [ ] assumptions/context
- [ ] definitions used
- [ ] alternative formulations
- [ ] typed dependencies
- [ ] consequences
- [ ] proofs / verification state
- [ ] related experiments
- [ ] historical development
- [ ] primary sources
- [ ] open questions
- [ ] known counterexamples/limitations
- [ ] machine-readable representation

## P2.3 Seed corridor to perfect

- [ ] distinction
- [ ] identity/equality
- [ ] relation
- [ ] grouping/partition
- [ ] equivalence
- [ ] order
- [ ] composition
- [ ] symmetry
- [ ] chirality/orientation
- [ ] invariance
- [ ] parity/modular structure
- [ ] sequence
- [ ] iteration
- [ ] recurrence
- [ ] periodicity
- [ ] quasiperiodicity
- [ ] nonlinearity
- [ ] fixed point
- [ ] stability
- [ ] sensitivity/error amplification
- [ ] attractor/basin
- [ ] coarse-graining
- [ ] hierarchy/effective dynamics
- [ ] optimization/exploration

Interpretations such as “discrete = maximal information” and “coarse-graining = intelligence” remain explicit hypotheses/lenses unless a precise theorem and assumptions are given.

---

# P3 — Artifact civilization: users create more than posts

The core social unit is a **durable artifact**, not a post.

## P3.1 First-class artifact types

- [ ] Experiment
- [ ] Mathematical object/system
- [ ] Conjecture
- [ ] Claim
- [ ] Proof
- [ ] Counterexample
- [ ] Dataset
- [ ] Visualization
- [ ] Notebook
- [ ] Collection/map
- [ ] Lesson/path
- [ ] Challenge/open problem
- [ ] Tool
- [ ] Analyzer
- [ ] AI agent
- [ ] Workflow
- [ ] Project
- [ ] Historical/source annotation
- [ ] Translation
- [ ] Reproduction
- [ ] Negative result / failed approach

Every artifact has provenance, revisions, fork ancestry, ownership/stewardship, visibility, license, and export.

## P3.2 Artifact lifecycle

`draft → private/shared → public → reproduced → reviewed → qualified → superseded/refuted`

- [ ] immutable revision history
- [ ] branch/fork/merge
- [ ] explicit provenance
- [ ] citation between artifacts
- [ ] dependency pinning
- [ ] reproducibility metadata
- [ ] archival export
- [ ] deletion policy that separates account privacy from already-published public scholarly provenance

---

# P4 — Human identity and personal workspace

Accounts are mandatory for the civilization layer but never mandatory for reading mathematics.

- [ ] stable user identity
- [ ] profile
- [ ] personal workspace
- [ ] saved experiments
- [ ] notebooks
- [ ] collections
- [ ] private drafts
- [ ] public artifacts
- [ ] contribution/provenance history
- [ ] forks and reproductions
- [ ] followed projects/groups/artifacts
- [ ] notifications
- [ ] export all user-created artifacts
- [ ] account recovery
- [ ] privacy controls
- [ ] pseudonymous participation where legally/practically possible
- [ ] no hidden score that controls mathematical truth

---

# P5 — Groups, recursive organizations, bonds, and alliances

This is not merely a chat/community feature. It is a higher-order organizational graph.

## P5.1 Groups

- [ ] create/join/invite
- [ ] roles and permissions
- [ ] shared workspace
- [ ] shared artifacts
- [ ] shared experiment libraries
- [ ] group challenges
- [ ] group AI/tool registry
- [ ] project boards
- [ ] public/private groups
- [ ] group provenance on joint work
- [ ] group constitution/rules where desired

## P5.2 Recursive organizations

- [ ] groups can contain subgroups
- [ ] groups can form federations/alliances
- [ ] alliances can have shared projects
- [ ] alliances can have typed bonds
- [ ] organizations can split/fork/merge
- [ ] organizational ancestry is preserved
- [ ] membership/role changes are event-sourced where feasible

Possible bond types:

- [ ] collaboration
- [ ] shared challenge
- [ ] shared infrastructure
- [ ] mentorship
- [ ] formal partnership
- [ ] temporary coalition
- [ ] knowledge exchange

Do not force every relationship into “friend/follow.”

## P5.3 Governance boundary

- [ ] social votes may rank attention, never truth
- [ ] groups cannot vote a theorem true
- [ ] mathematical qualification has explicit evidence/proof pathways
- [ ] moderation actions have auditable provenance
- [ ] appeals exist
- [ ] organizations cannot erase public provenance of already-published artifacts
- [ ] no single popularity metric

---

# P6 — AI-native QEVA

AI is not a chatbot bolted onto the site. It is a capability layer integrated with every artifact and workspace.

## P6.1 AI principles

- [ ] model-provider agnostic
- [ ] AI output is never canonical truth by default
- [ ] every AI-generated artifact records model/tool/version and relevant inputs
- [ ] user can inspect what an agent changed
- [ ] canonical math promotion requires explicit qualification
- [ ] AI memory belongs to a user/workspace and is exportable
- [ ] no hidden AI action silently mutates public mathematical records

## P6.2 Personal adaptive AI

- [ ] adapt explanation depth without changing mathematical content
- [ ] infer prerequisite gaps from user interactions only with clear privacy controls
- [ ] generate examples
- [ ] generate counterexamples/candidate tests
- [ ] translate notation
- [ ] connect a concept to the user's existing map
- [ ] suggest relevant sandbox experiments
- [ ] summarize a project's unresolved questions
- [ ] help reproduce another user's artifact
- [ ] compare alternative formulations

## P6.3 Artifact AI

Every artifact can optionally have an AI workspace:

- [ ] explain
- [ ] critique
- [ ] search related QEVA objects
- [ ] run analyzers
- [ ] propose tests
- [ ] search for counterexamples
- [ ] propose formalizations
- [ ] generate visualizations
- [ ] annotate dependencies
- [ ] detect likely duplicates
- [ ] create draft relations for human review

## P6.4 Group AI

- [ ] group knowledge assistant
- [ ] shared research memory
- [ ] project summarizer
- [ ] open-task detector
- [ ] literature/source scout
- [ ] experiment coordinator
- [ ] reproducibility checker
- [ ] agent permissions controlled by group roles

## P6.5 User-created AI agents

Users may create and share specialized agents.

Canonical `Agent` record:

- [ ] owner/steward
- [ ] instructions/specification
- [ ] model/provider requirements
- [ ] tools/capabilities
- [ ] allowed data
- [ ] network permissions
- [ ] compute/budget constraints
- [ ] version
- [ ] dependencies
- [ ] evaluation results
- [ ] license
- [ ] provenance
- [ ] safety/permission manifest

Agent capabilities should be explicit:

- [ ] read public graph
- [ ] read private workspace
- [ ] run sandbox
- [ ] invoke approved tools
- [ ] write drafts
- [ ] propose graph edges
- [ ] create experiments
- [ ] publish only when explicitly authorized
- [ ] external network access only when explicitly granted

Human accounts and AI-agent identities must be distinct.

## P6.6 AI evaluation

- [ ] benchmark mathematical factuality
- [ ] benchmark proof-status calibration
- [ ] benchmark counterexample generation
- [ ] benchmark extraction
- [ ] benchmark tool use
- [ ] benchmark reproducibility
- [ ] retain known failure cases
- [ ] compare models without hard-coding QEVA to one vendor

---

# P7 — User-created tools and executable ecosystem

QEVA should let users extend QEVA.

## P7.1 Tool registry

First-class types:

- [ ] analyzer
- [ ] simulator
- [ ] renderer
- [ ] importer
- [ ] exporter
- [ ] theorem-prover bridge
- [ ] search strategy
- [ ] transformation
- [ ] data connector
- [ ] educational interaction
- [ ] AI workflow

Every tool needs:

- [ ] manifest
- [ ] version
- [ ] author/provenance
- [ ] license
- [ ] deterministic dependencies where possible
- [ ] input/output schema
- [ ] permissions
- [ ] resource limits
- [ ] test fixtures
- [ ] compatibility declaration

## P7.2 Safe execution

User code is hostile by default.

- [ ] sandbox untrusted code
- [ ] no arbitrary filesystem access
- [ ] no arbitrary network by default
- [ ] explicit capability grants
- [ ] CPU/memory/time limits
- [ ] dependency pinning
- [ ] deterministic/reproducible mode
- [ ] isolate secrets
- [ ] scan uploaded packages
- [ ] abuse/rate controls

WASM/isolated containers are candidates; do not select implementation prematurely.

## P7.3 Extensible analyzer protocol

A user-created analyzer should be able to accept a canonical Experiment and return typed observations/candidates without modifying canonical truth.

- [ ] standard analyzer API
- [ ] observation schema
- [ ] evidence attachment
- [ ] confidence/calibration
- [ ] reproducibility record
- [ ] analyzer version pinning
- [ ] comparison between analyzers

---

# P8 — Search, discovery, learning, and adaptive navigation

## P8.1 Unified search

Search over:

- [ ] concepts
- [ ] formulas
- [ ] theorems
- [ ] proofs
- [ ] open problems
- [ ] works
- [ ] people
- [ ] experiments
- [ ] tools
- [ ] agents
- [ ] users/groups where public
- [ ] historical events
- [ ] datasets
- [ ] challenges

Capabilities:

- [ ] formula-aware search
- [ ] synonym search
- [ ] notation-aware search
- [ ] multilingual search
- [ ] prerequisite search
- [ ] equivalent-formulation search
- [ ] “same mechanism elsewhere”
- [ ] “experiments instantiating this”
- [ ] “open problems downstream”
- [ ] “historical development”

## P8.2 Learning paths

Brilliant-like pedagogy without reducing QEVA to a course platform.

- [ ] adaptive first-principles paths
- [ ] interactive checks
- [ ] direct transition from lesson to sandbox
- [ ] concept mastery inferred cautiously
- [ ] multiple explanation paths
- [ ] learner may inspect full formal object at any time
- [ ] user can author/share paths
- [ ] groups can curate paths
- [ ] AI can adapt sequence but not alter canonical definitions

---

# P9 — Achievement, reputation, and coordination without Goodhart collapse

Do not build engagement-score civilization.

## P9.1 Durable contribution records

Recognize:

- [ ] reproduced experiment
- [ ] verified counterexample
- [ ] accepted proof/formalization
- [ ] useful analyzer/tool
- [ ] source reconciliation
- [ ] historical correction
- [ ] duplicate resolution
- [ ] reusable visualization
- [ ] translation
- [ ] benchmark contribution
- [ ] resolved open task

## P9.2 Reputation must be multidimensional

Do not create one scalar “QEVA score.”

Possible independent dimensions:

- [ ] proof reliability
- [ ] reproducibility
- [ ] source quality
- [ ] tool reliability
- [ ] explanation usefulness
- [ ] moderation trust
- [ ] historical research quality

All should be transparent and contestable.

Never claim “first discovery in history” from a QEVA timestamp; only “first recorded on QEVA” until independently established.

---

# P10 — Historical world map

## P10.1 Separate graphs permanently

`logical ancestry ≠ historical influence ≠ pedagogical prerequisite`

## P10.2 Historical nodes

- [ ] people
- [ ] works
- [ ] manuscripts
- [ ] concepts
- [ ] theorems
- [ ] methods
- [ ] tools
- [ ] institutions
- [ ] traditions
- [ ] fields
- [ ] formalizations
- [ ] independent rediscoveries

## P10.3 Historical uncertainty

- [ ] uncertain date intervals
- [ ] disputed attribution
- [ ] parallel traditions
- [ ] multilingual names/scripts
- [ ] explicit source provenance
- [ ] never imply completeness of lost history

## P10.4 Visualization

- [ ] zoomable time × branch graph
- [ ] filter by field/concept/person/work
- [ ] show logical vs historical edges distinctly
- [ ] compare field growth using multiple measures
- [ ] never use paper count as “progress”
- [ ] derived “promising/stuck” views must expose the metric vector

---

# P11 — Harvester and external knowledge bridge

The harvester feeds QEVA; it is not the public identity.

## P11.1 Acquisition

- [ ] OpenAlex bulk snapshot
- [ ] Crossref bulk data
- [ ] arXiv OAI-PMH metadata
- [ ] arXiv source/PDF where rights permit
- [ ] OEIS bulk data
- [ ] zbMATH Open
- [ ] Wikidata dumps
- [ ] Mathlib declaration/import/proof graph
- [ ] Internet Archive targeted historical material
- [ ] Common Crawl URL-index discovery, then selective WARC/WET retrieval

## P11.2 Storage stages

- [ ] raw immutable bytes
- [ ] normalized source records
- [ ] reconciled identities
- [ ] parsed documents
- [ ] extracted candidate math objects
- [ ] qualified QEVA objects

Start with object storage + Parquet + DuckDB/PostgreSQL. Add distributed systems only after measured bottlenecks.

## P11.3 Parsing priority

`TeX/XML > structured HTML > PDF layout/text > OCR`

- [ ] theorem/definition/proof/equation segmentation
- [ ] LaTeX/MathML preservation
- [ ] PDF → structured representation
- [ ] OCR only for scans
- [ ] exact source locator for every extracted claim

## P11.4 Mathematical extraction

- [ ] definitions
- [ ] theorem/lemma/proposition statements
- [ ] assumptions
- [ ] notation scope
- [ ] equations
- [ ] proofs
- [ ] conjectures
- [ ] counterexamples
- [ ] open questions
- [ ] methods
- [ ] explicit confidence
- [ ] no automatic promotion to truth

## P11.5 Entity resolution

Exact IDs first:

- [ ] DOI
- [ ] arXiv
- [ ] ISBN
- [ ] OEIS
- [ ] zbMATH
- [ ] Wikidata
- [ ] ORCID
- [ ] Mathlib declaration + commit

Then candidate matching:

- [ ] title
- [ ] authors
- [ ] dates
- [ ] references
- [ ] equations
- [ ] semantic similarity
- [ ] notation normalization
- [ ] human review for ambiguous merges

## P11.6 Production execution

- [ ] resumable jobs
- [ ] checkpoints
- [ ] retries/backoff
- [ ] rights ledger
- [ ] parser/version ledger
- [ ] object storage
- [ ] persistent database/index
- [ ] job queue
- [ ] workers
- [ ] dead-letter queue
- [ ] metrics
- [ ] 10k pilot
- [ ] 100k pilot
- [ ] 1M corpus
- [ ] scale only after quality benchmarks

---

# P12 — Extraction and AI quality benchmarks

A larger corpus is not progress if QEVA cannot reliably structure it.

- [ ] hand-labelled benchmark corpus
- [ ] theorem segmentation precision/recall
- [ ] definition segmentation
- [ ] equation extraction
- [ ] proof segmentation
- [ ] citation reconciliation
- [ ] identity matching
- [ ] duplicate theorem detection
- [ ] relation extraction
- [ ] historical entity matching
- [ ] multilingual benchmark
- [ ] AI explanation correctness
- [ ] AI proof-status calibration
- [ ] AI sandbox-agent reliability
- [ ] publish known failure sets

---

# P13 — Verifier redesign

## Tier A — canonical integrity: every commit

- [ ] schemas
- [ ] IDs/revisions
- [ ] typed references
- [ ] canonical exports
- [ ] proof certificates when claimed
- [ ] no missing verification artifact when claimed

## Tier B — product/runtime: before deploy

- [ ] homepage/routes
- [ ] local links
- [ ] JS/Python syntax
- [ ] sandbox fixtures
- [ ] authentication smoke tests when introduced
- [ ] tool execution isolation tests
- [ ] no accidental network dependency for offline mathematical core

## Tier C — preservation release

- [ ] full manifests
- [ ] canonical-core manifest
- [ ] BagIt/recovery package
- [ ] mirror/recovery test
- [ ] legacy-byte promise only when explicitly made

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

- [ ] live service can fail without destroying public mathematics
- [ ] regular static/export snapshots
- [ ] user artifact export
- [ ] model-provider independence
- [ ] authentication-provider independence where practical
- [ ] database migrations documented
- [ ] no proprietary service is required to interpret permanent exports
- [ ] public mathematical pages remain renderable without AI

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

- [ ] a social feed with mathematics attached
- [ ] an AI chatbot with a math skin
- [ ] an engagement-optimized gamification product
- [ ] a giant scraped corpus with no structural extraction
- [ ] a static encyclopedia
- [ ] a collection of disconnected interactive demos
- [ ] one founder's ontology presented as mathematical truth
- [ ] a platform where popularity controls epistemic status
- [ ] a closed ecosystem tied to one AI vendor
- [ ] a tool marketplace executing arbitrary unsafe code
- [ ] a civilization layer whose account database is more important than its public knowledge
- [ ] a project whose grand vision text is more developed than its usable mathematical machinery

---

# P17 — Immediate execution order

Do not build the entire civilization before proving one strong loop.

## Phase 1 — Public mathematical instrument

1. [ ] Clean public UI to `Explore / Lab / History / Search`.
2. [ ] Remove backend/version/ambition language from frontend.
3. [ ] Specify canonical Experiment schema.
4. [ ] Convert existing demos to the shared Experiment model.
5. [ ] Build Mathematical Diff, Observer Switch, Parameter Sweep, and Conjecture Attack.
6. [ ] Build first automatic analyzers.
7. [ ] Replace generic logical edges with typed relations.
8. [ ] Perfect one seed corridor from distinction through recurrence/coarse-graining.

## Phase 2 — Minimal living civilization

9. [ ] Add accounts.
10. [ ] Add personal workspaces and artifact save/fork/publish.
11. [ ] Add first-class artifact graph.
12. [ ] Add groups with shared workspaces.
13. [ ] Add typed group bonds/alliances.
14. [ ] Add contribution provenance and multidimensional reputation.
15. [ ] Add discussion/coordination only around artifacts/projects, not a global engagement feed.

## Phase 3 — AI-native creation

16. [ ] Define Agent manifest and capability model.
17. [ ] Add personal adaptive AI over QEVA objects.
18. [ ] Add artifact AI workspaces.
19. [ ] Add group AI.
20. [ ] Add user-created agents.
21. [ ] Add tool registry and safe execution sandbox.
22. [ ] Add evaluation/benchmark framework for agents and tools.

## Phase 4 — External world ingestion

23. [ ] Redesign verifier into Canonical / Runtime / Preservation tiers.
24. [ ] Run 10k-work harvester pilot.
25. [ ] OpenAlex snapshot importer.
26. [ ] arXiv metadata/source pipeline.
27. [ ] Crossref bulk importer.
28. [ ] TeX-first mathematical extraction.
29. [ ] PDF fallback.
30. [ ] extraction benchmark before scaling.
31. [ ] OEIS/Wikidata/Mathlib/zbMATH/Internet Archive.
32. [ ] Common Crawl discovery after structured-source pipeline works.
33. [ ] 100k → 1M corpus only after extraction quality is measured.

## Phase 5 — Historical and civilizational scaling

34. [ ] Source-grounded historical graph.
35. [ ] time × branch visualization.
36. [ ] recursive organizations and alliance projects.
37. [ ] public AI/tool ecosystems.
38. [ ] scalable queues/storage/compute only when measured load requires them.
39. [ ] static public snapshots and mirror protocol for all durable public artifacts.
40. [ ] continuous migration/reconstruction drills.

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
