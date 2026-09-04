# QEVA architecture 0.4

QEVA is one archive with four deliberately separate graphs.

| Layer | Node | Edge means | Admission rule |
|---|---|---|---|
| Logical | exact mathematical object revision | formally/editorially asserted dependence or typed mathematical relation | framework, assumptions, exact content, dependencies, provenance, qualification |
| Historical | work, person, tradition, event, place, date interval | influence, translation, priority claim, correction, independent discovery | source-backed, uncertainty-preserving historical review |
| Corpus | retrieval event, raw payload, normalized work, source locator | cites, hosts, version-of, extracted-from, duplicate-candidate | reproducible acquisition and rights state |
| Editorial | proposal, review, dissent, qualification assertion | reviews, challenges, supersedes, refutes, verifies | public method, actor, date, evidence, outcome |

## Why the separation is structural

A paper can cite another without logically depending on it. A theorem can be logically elementary and historically late. A machine extraction can identify a sentence without establishing that the sentence is correct. A mathematical object can receive several independent checks with different outcomes. QEVA stores these as different node/edge families rather than one generic “related” link.

## Identity families

```text
qeva:1:<slug>[@revision]                 logical object / exact revision
qeva-work:sha256:<digest>                normalized source work
qeva-candidate:sha256:<digest>           source-located extraction candidate
qeva-qualification:1:<name>[@revision]   independent qualification assertion
```

Stable IDs survive changing titles and interfaces. Exact revision IDs never change meaning. Content digests help deduplicate corpus material but do not replace provider identifiers such as DOI or arXiv ID.

## Data flow

```text
provider snapshot or bounded API
    → raw bytes + retrieval ledger
    → normalized works + typed corpus edges
    → source-located unreviewed candidates
    → human/formal qualification
    → new immutable logical revision
    → generated maps, pages, exports, and snapshots
```

No generated view is canonical. `archive/objects/`, `archive/qualifications/`, the protocol, and provenance-bearing corpus records are canonical inputs. The website, atlas layouts, search, and sandbox are replaceable projections.

## Foundation switchboard

QEVA’s lowest map level is not advertised as metaphysical truth. It begins with a tiny preformal orientation floor, then names formal-language roles and branches into explicit systems. ZFC’s major axioms and schemas are individual objects. Classical and constructive logics remain distinguishable. Dependent type and categorical foundations are peers with declared surrounding assumptions, not decorative aliases for set theory.

## Scale boundary

JSONL is the interchange format, not the only production index. A web-scale deployment should keep immutable object storage for raw payloads, a columnar/graph index for retrieval, and generated static release streams for preservation. A database failure must never prevent a full rebuild from canonical release files.
