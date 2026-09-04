# QEVA — Mathematical World Map

**See the machinery beneath the fields.**

QEVA is a first-principles mathematics platform whose long-term goal is to make the global structure of mathematics inspectable, executable, historically traceable, and continuously extensible.

The website is not the durable object. The durable object is the coupled graph:

```text
logical graph:     assumptions → definitions → mechanisms → results → frontiers
historical graph:  works → people → claims → citations → corrections → branches
```

These graphs must never be conflated.

## Primary user

Anyone, at any age, who is willing to reason carefully but is blocked by the compressed conventions of mathematical literature.

QEVA should let that person quickly build a mental map of recurring machinery such as:

- distinction and equivalence
- grouping and classification
- symmetry and chirality
- parity and prime structure
- discreteness and continuity
- sequence and recurrence
- periodicity and quasiperiodicity
- nonlinearity, sensitivity, stability, and attractors
- coarse-graining, hierarchy, and task-relative signal/noise
- optimization, local/global structure, and exploration/exploitation
- open frontiers such as Collatz dynamics, with speculation clearly separated from theorem

## What problem it solves

Mathematics is split across papers, books, notation systems, fields, historical terminology, theorem provers, databases, and tacit prerequisite chains. Search engines return documents. QEVA should return **structure**.

A visitor should be able to ask:

- What are the smallest assumptions behind this statement?
- What mechanism appears here and where else does it reappear?
- Are these two formulations equivalent or only analogous?
- What information was discarded by this abstraction?
- Which parameter change creates a qualitative transition?
- When did humans discover this branch, and through which works?
- Which parts are proved, conjectural, refuted, empirical, or merely explanatory?
- Where is the frontier growing or stuck?

## Release 0.3 contents

```text
/
├── index.html                  public first-principles entrance
├── map/                        interactive logical machinery map
├── sandbox/                    dependency-free executable experiments
├── history/                    seed historical branch timeline
├── sources/                    global corpus / ingestion architecture
├── atlas/                      machine-readable map + history datasets
├── corpus/                     source registry and corpus data model
├── archive/                    immutable QEVA concept records
├── protocol/                   object protocol and compact recovery spec
├── preservation/               preservation threat model
├── institution/                stewardship constitution
├── snapshot/                   bootstrap recovery text
├── scripts/                    release, verify, metadata adapters
├── MANIFEST.sha256
└── MANIFEST.sha512
```

No npm, React, build framework, database, account system, analytics service, webfont, or runtime package dependency is required.

## Sandbox

Release 0.3 includes three deliberately small experiments:

1. logistic recurrence — compare nearby initial states as `r` changes;
2. coarse-graining — trade fine detail for macrostructure;
3. multi-peak optimization — compare local ascent with controlled exploration.

The simulations are explanatory instruments, not proofs.

## Global literature map

The long-term corpus should ingest structured metadata and legally reusable content from sources such as OpenAlex, Crossref, arXiv, zbMATH Open, OEIS, Wikidata/Wikimedia, and public-domain libraries.

The ingestion policy is conservative:

- prefer APIs/dumps/OAI feeds over brittle HTML scraping;
- obey robots directives, rate limits, terms, copyright, and licenses;
- preserve provenance even when full text cannot be mirrored;
- never treat publication or citation count as mathematical truth;
- machine-extracted claims remain candidates until qualified.

Reference metadata adapters:

```bash
python3 scripts/ingest_metadata.py openalex "dynamical systems" --limit 20
python3 scripts/ingest_metadata.py crossref "prime number theorem" --limit 20 --mailto you@example.org
python3 scripts/ingest_metadata.py arxiv "cat:math.DS" --limit 20
```

## Verify the release

```bash
python3 scripts/release.py
python3 scripts/verify.py
```

## Preservation principle

A million-year promise cannot be made by freezing one website. Longevity comes from transparent formats, independent mirrors, periodic migration, self-description, provenance, replaceable software, and the right to reconstruct/fork the archive.

## Logo provenance

The historical `qeva-logo.png` referenced by the pre-refoundation site was not available to this build. The repository retains the available minimal Q mark and explicitly records the missing historical asset rather than fabricating provenance.

## License

- code: MIT
- QEVA-created protocol/site/seed archive: CC0-1.0
- imported third-party corpus material retains its own source license; QEVA must never overwrite that provenance with CC0.
