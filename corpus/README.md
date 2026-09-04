# QEVA corpus layer

The corpus layer is the provenance graph from which QEVA can build its historical map and propose logical objects.

It is **not** the QEVA truth layer.

## Entity families

- `work` — paper, book, manuscript, thesis, dataset, formal proof artifact
- `person` — identity/provenance node; not a measure of truth
- `source` — journal, archive, repository, library, dataset provider
- `citation` — one work cites another
- `event` — publication, independent discovery, correction, retraction, formalization, resolution
- `candidate` — machine- or human-extracted claim/definition/problem awaiting qualification

## Minimum provenance fields

Every imported record should retain, when available:

- provider name
- provider identifier
- canonical external identifiers (DOI, arXiv id, ISBN, Wikidata id, etc.)
- source URL or locator
- title
- authors as supplied by source
- date(s) with uncertainty where relevant
- license / rights signal
- retrieval timestamp
- raw-source hash when a reusable snapshot is stored
- normalization version

## Rights rule

Metadata may be open while abstracts, reviews, figures, PDFs, scans, or source files have different rights. QEVA must track rights at the field/item level instead of assuming one license covers everything.

## Historical graph versus logical graph

A `work -> work` citation edge is historical/provenance data.

A `theorem -> lemma` dependency edge is logical data.

Never infer the second merely from the first.
