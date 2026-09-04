# QEVA corpus layer 0.1

The corpus layer maps documents and retrieval events. It does **not** decide mathematical truth.

## Files and contracts

- `schemas/retrieval-event.schema.json`: one preserved network response.
- `schemas/work.schema.json`: one normalized bibliographic/web work.
- `schemas/candidate.schema.json`: one unreviewed extraction with a source locator.
- `schemas/edge.schema.json`: a typed relation whose layer is explicit.
- `source-registry.json`: provider strategy and rights cautions for this release.

## Reference run

```sh
python3 scripts/harvest.py demo --out corpus/demo-run
python3 scripts/harvest.py extract corpus/demo-run/normalized.jsonl \
  --out corpus/demo-run/candidates.jsonl
```

The run directory contains:

```text
raw/<sha256>.<type>   preserved response bytes
ledger.jsonl          request/retrieval evidence
normalized.jsonl      deterministic, identifier-deduplicated works
checkpoint.json       provider/run progress summary
candidates.jsonl      optional; always unreviewed
```

Re-running into the same directory merges works deterministically by stable identity. It does not erase the retrieval ledger. For large production sources, use provider snapshots and record snapshot version/hashes rather than routing the corpus through the small API adapters.

## Promotion boundary

Candidate extraction is allowed to be noisy. Admission to the logical archive is not. A promoted record needs an original or lawfully reusable formulation, declared assumptions/framework, exact dependency review, provenance, and an honest verification level.
