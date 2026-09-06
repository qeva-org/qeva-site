# QEVA corpus integrity boundary 0.2

The corpus layer maps source retrievals and provider assertions. It does not
decide mathematical truth, and it never treats two providers agreeing on an
identifier as permission to discard either provider's record.

## Public/restricted boundary

Harvester runs belong outside the deployed website and outside public release
staging. Raw responses can contain licensed wording, error details, contact
parameters, or other data that must not be published merely because it was
retrieved. A public release may carry approved metadata, hashes, and lawful
derived records; it must not recursively package a runtime run directory.

Unknown, restricted, and metadata-only rights states force both
`full_text_mirroring` and `text_extraction` to `false`. The latter field means
that a public candidate may copy source wording. It does not attempt to decide
whether private text-and-data analysis is lawful in every jurisdiction.

## Reference commands

Run outside the webroot:

```sh
python3 -B harvester/harvest.py demo --out /var/tmp/qeva-runs/demo
python3 -B harvester/harvest.py fetch openalex "dynamical systems" \
  --limit 100 --max-response-bytes 16777216 --out /var/tmp/qeva-runs/openalex
python3 -B harvester/harvest.py extract /var/tmp/qeva-runs/demo/normalized.jsonl \
  --out /var/tmp/qeva-runs/demo/candidates.jsonl
```

Each run contains:

- `raw/`: digest-named response bytes, written atomically and re-hashed before reuse;
- `ledger.jsonl`: content-addressed retrieval events; byte-identical events with
  the same request metadata and timestamp coalesce to one exact event ID;
- `normalized.jsonl`: stable work groups containing immutable provider assertions;
- `checkpoint.json`: deterministic run summary;
- `quarantine/`: any pre-existing digest-named blob whose bytes fail its name.

## Identity and disagreement

DOIs and arXiv base identifiers may group provider assertions into one bounded
work identity. Grouping does not select a winning title, author list, date, or
rights statement. All provider assertions remain addressable. Fuzzy
title/author/year matching is deliberately absent from this reference layer.
arXiv expression versions remain in `arxiv_expression` and `arxiv_version`.

## Candidate boundary

The extractor reads only assertions with `rights.text_extraction=true`. Every
candidate remains `unreviewed-candidate` and links to its source assertion,
raw digest, and provider-native locator. Extraction never promotes a candidate
to a QEVA mathematical object.

## Deliberate limits

This is still a bounded adapter demonstration, not a snapshot importer,
OAI-PMH harvester, full Common Crawl client, or internet-scale corpus. Those
systems require separate run manifests, provider-policy snapshots, durable
queues, restricted storage, and recovery operations before scale.
