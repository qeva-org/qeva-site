# QEVA 0.5 — Mechanism Engine Alpha

QEVA is an open, revisioned map of mathematical objects, executable mechanisms,
evidence, history, literature, and unresolved questions. It aims toward a map of
mathematics; this release is a small, inspectable seed and does not claim
completeness, universal foundations, or a bundled scrape of the internet.

This release contains 116 current objects across 159 immutable revisions, six
bounded experiments, seven versioned analyzers, an offline Explore–Lab loop,
typed-but-candidate migrated relations, a separate history, and a rights-aware
harvester prototype. It also preserves the supplied v0.4 ZIP byte-for-byte.

## Open the site

Open `index.html` directly, or serve `dist/` as the web root. The enclosing
project's `.openai/hosting.json` already points hosting at `dist/`. No package
manager, framework, database, analytics, webfont, or network request is needed.

## Rebuild and verify

Run these commands from `dist/`:

```sh
python3 -B scripts/seed_release.py
python3 -B scripts/publish_v05.py --check
python3 -B scripts/release.py
python3 -B scripts/verify.py
python3 -B scripts/verify_runtime.py
python3 -B scripts/verify_preservation.py
node scripts/test_engine.mjs
python3 -B scripts/test_harvester.py
```

`seed_release.py` is now a read-only baseline guard. `publish_v05.py` is the
idempotent append-only publisher for the eleven corrective v0.5 revisions and
the strongly bound `one-plus-one` qualification.

Those commands apply to the complete outer release. The data-only
`snapshot/QEVA-BAG/data/` payload intentionally omits presentation routes and
must not run `release.py` or the Runtime/Preservation tiers. Its supported
recovery checks are `python3 -B scripts/verify.py --tier a` and
`node scripts/test_engine.mjs`; see `BAG-RECOVERY.txt` inside the bag.

## What is canonical

- `archive/objects/`: immutable mathematical revisions.
- `archive/qualifications/`: append-only claims about checks and outcomes.
- `experiments/records/`: immutable, bounded executable records.
- `analyzers/manifests/`: exact analyzer contracts.
- `protocol/`: schemas, canonicalization, numeric, and evidence semantics.
- `corpus/`: source, retrieval, rights, and extraction records.

Pages, maps, indexes, plots, and search are replaceable projections. The
BagIt-style snapshot is deliberately data-and-engine only; it preserves no
partial interface and does not claim to regenerate the v0.5 presentation.

## Durable architecture

```text
QEVA = protocol + open archive + many mirrors
     + physical snapshots + bounded institution
```

The archive keeps four separations structural: logical ancestry, historical
ancestry, source/citation provenance, and editorial or formal qualification.
A citation is not a proof dependency; a simulation is not a proof; an
extractor is not a truth oracle; web access is not redistribution permission.

## Harvester

The active implementation is `harvester/harvest.py`; `scripts/harvest.py` is a
compatibility entry point. It performs bounded acquisition, stores retrieval
events and raw fixity, fails closed on rights, preserves upstream assertions,
and quarantines fixity conflicts. It is not a web-scale crawler.

## Licensing and boundary

Original QEVA records and prose are CC0 1.0; reference software is MIT.
Imported material keeps its own rights and provenance. See `SOURCE_POLICY.md`
and `LICENSES/`. Planet-scale ingestion, independent mirrors, signed release
witnesses, formal-library bridges, and institutional succession remain roadmap
work—not accomplished claims.
