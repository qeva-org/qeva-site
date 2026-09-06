# QEVA architecture 0.5

QEVA is one archive with four deliberately separate evidence domains and a
replaceable presentation layer.

| Domain | Primary records | An edge or outcome means | Admission boundary |
|---|---|---|---|
| Logical | exact object and experiment revisions | a typed mathematical claim inside a named framework | exact revision, assumptions, semantics, provenance |
| Historical | works, people, events, places, date intervals | source-backed influence, transmission, priority, or correction | citation plus preserved uncertainty |
| Corpus | retrieval events, raw payloads, normalized works, candidates | cites, hosts, version-of, extracted-from, rights state | reproducible acquisition and source locator |
| Qualification | append-only review/check records and certificates | a named method produced a scoped outcome | exact subject and artifact digests, actor, date, environment |

Pages, maps, plots, search, and indexes are projections. They can be deleted
and regenerated from the records.

## Identity families

```text
qeva:1:<slug>@<revision>                    logical object revision
qeva-experiment:1:<slug>@<revision>         executable mechanism revision
qeva-analyzer:1:<slug>@<revision>           analyzer contract revision
qeva-observation:sha256:<digest>             scoped computed observation
qeva-work:sha256:<digest>                    normalized source work
qeva-candidate:sha256:<digest>               source-located extraction
qeva-qualification:1:<name>@<revision>       qualification assertion
qeva-relation:sha256:<digest>                typed relation assertion
```

Readable identifiers support citation. Canonical digests bind semantic JSON;
artifact digests bind the exact bytes of engines, analyzers, certificates, and
raw source responses. Neither digest establishes authorship or truth.

## Executable loop

```text
select exact experiment
  → run a bounded named kernel
  → modify parameters or observer
  → inspect trace, metrics, and scoped observations
  → diff, sweep, attack, fork, or export
```

The engine never evaluates supplied code. A manifest selects one of six named
kernels and must satisfy a kernel-specific parameter, randomness, analyzer,
numeric, and resource contract. Every run reports states and operations used,
completion, and a stop reason. `run_sha256` binds the normalized parameters and
result to the exact experiment and engine artifact. An observation separately
binds the exact analyzer-manifest bytes. Finite execution never silently
becomes an unbounded theorem.

`validateRun` is the structural and digest gate. Semantic attribution requires
`validateRunAgainstExperiment`, which deterministically replays the experiment
and compares the canonical run, or `analyzeRun`, which performs that replay
before invoking a declared analyzer. Schema conformance alone is never treated
as proof that an official analyzer produced an observation.

## Revision and relation semantics

Released revisions never change. A new revision must form a contiguous
`supersedes` chain; exports contain both all-revision and one-current-per-ID
streams. QEVA 0.5 preserves the v0.4 mathematical records byte-for-byte and
adds corrections as later revisions.

Legacy `dependencies` did not encode proof role. QEVA therefore migrates those
edges as visible `candidate` relations. Their semantic direction is dependent
to prerequisite; any reversed drawing direction is separately labeled
`layout_from`/`layout_to`. Only a later qualification may promote an edge to a
formal proof role.

## Ingestion flow

```text
provider snapshot or bounded request
  → raw bytes + retrieval event + rights assertion
  → normalized work and identifier graph
  → source-located unreviewed candidate
  → human or formal qualification
  → new immutable logical revision
```

The active Harvester 0.2 is bounded and rights-aware. It preserves source
assertions, re-hashes existing raw bytes, quarantines conflicts, and does not
store copyrighted full text merely because it is reachable. Web-scale
ingestion requires independent storage and operational infrastructure not
present in this ZIP.

## Recovery architecture

The outer site is a complete static projection. `snapshot/QEVA-BAG/` is a
data-only recovery bag: it intentionally excludes generated HTML rather than
preserve broken partial interfaces. SHA-256/SHA-512 provide current fixity, not
timeless authenticity; future releases must add algorithms and signatures
without deleting the old bytes or manifests. A real institution also needs
independent mirrors, witness signatures, cold-recovery drills, and succession.
