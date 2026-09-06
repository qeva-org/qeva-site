# Evidence classes

| Class | What was done | What it can establish |
| --- | --- | --- |
| exact-execution | A named exact kernel ran on one recorded input | That trace, if independently replayed |
| bounded-exhaustive | Every case in an explicit finite domain was checked | The bounded claim only |
| numerical-observation | A pinned finite-precision computation ran | Evidence about that numerical experiment |
| heuristic-candidate | A search or estimator proposed structure | A candidate worth checking |
| formal-certificate | A named checker replayed a bound formal object | The encoded claim relative to the trusted kernel |

`none-found` always carries a domain and bound. It is not a proof of an
unbounded claim. A counterexample refutes only the exact claim whose premises
it satisfies. Popularity, citation count, and AI confidence are not evidence
classes.

## Digest boundaries

A run hash is an integrity binding, not a signature and not an authority claim.
It detects any change to the recorded run body. It does not prove who executed
the run or that the declared engine file was actually present.

Likewise, an experiment's `executable.artifact_sha256` is a declaration. A
program cannot securely attest the hash of its own source from a caller-supplied
record. Run envelopes therefore state
`engine_artifact_binding: declared-by-experiment; external-byte-verification-required`.
QEVA's release verifier supplies that external check by hashing the shipped
engine bytes and comparing all six experiment pins. Mirrors and third-party
runners must perform the same check before calling a run independently replayed.

The reference API separates structural acceptance from semantic replay.
`validateRun` checks the run envelope, digests, bounds, and analyzer contracts;
it does not establish that an in-contract observation was computed honestly.
Before attributing observations to the official engine and analyzers, a runner
must also call `validateRunAgainstExperiment`, which re-executes the named
kernel and requires canonical equality with the supplied run. `analyzeRun`
performs that replay check before it returns any official observation.

Observer Switch verifies the run-body digest before reading its trace. A digest
match proves that the trace and recorded hash agree; it still does not provide
authorship or execution-environment authenticity.
