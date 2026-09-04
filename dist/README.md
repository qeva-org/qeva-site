# QEVA 0.4 — Foundation Switchboard + Harvester v1

QEVA is an open, revisioned map of mathematical ideas, their explicit assumptions and dependencies, their historical development, the literature that discusses them, and the questions that remain open.

This release is a serious seed, not a claim to contain all mathematics. It contains 116 current knowledge objects, 148 exact revisions, individual durable object pages, a logical dependency atlas, a separate global history seed, an executable sandbox, a metadata-first harvester, canonical exports, a tiny proof certificate, preservation artifacts, and an institutional constitution draft.

## Start here

Open `index.html` in any modern browser. No build, server, package manager, analytics, webfont, database, or network connection is required.

To rebuild all generated pages and manifests:

```sh
python3 scripts/seed_release.py
python3 scripts/release.py
python3 scripts/verify.py
```

To prove the harvester locally without network access:

```sh
python3 scripts/test_harvester.py
```

## Durable architecture

```text
QEVA = protocol + open archive + independent mirrors
     + physical snapshots + bounded institution
```

- `protocol/` defines the record grammar and recovery semantics.
- `ARCHITECTURE.md` defines the four graph layers and their admission boundaries.
- `archive/objects/` contains immutable canonical revisions.
- `archive/qualifications/` contains append-only, independently attributable checks and outcomes.
- `objects/` contains stable human-readable pages generated from those records.
- `atlas/` keeps logical ancestry, historical ancestry, fields, and frontiers separate.
- `corpus/` defines the literature and retrieval layer.
- `scripts/harvest.py` performs bounded metadata acquisition with a raw-response ledger.
- `snapshot/` contains a BagIt subset, print core, and mirror procedure.
- `legacy/v0.3/` preserves the complete preceding release; its 32 record files remain byte-identical.

## Non-negotiable distinctions

1. Syntax is not semantics.
2. Derivation is not model-independent truth.
3. Citation is not logical dependence.
4. Simulation is not proof.
5. Internet access is not redistribution permission.
6. Extraction is not qualification.
7. A canonical branch is not a monopoly on continuation.

## Licensing

Original QEVA records and prose are released under CC0 1.0. Reference software is MIT licensed. Imported material keeps its own rights and provenance; nothing becomes CC0 merely by entering the corpus. See `SOURCE_POLICY.md` and `LICENSES/`.

## Release boundary

QEVA 0.4 has not scraped the whole internet and does not claim completeness. The included harvester proves the acquisition contract on bounded API/index queries. Planet-scale ingestion requires provider snapshots, storage, recurring rights review, deduplication, field experts, and independent infrastructure described in `ROADMAP.md`.
