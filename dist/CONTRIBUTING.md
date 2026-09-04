# Contributing to QEVA

QEVA values explicitness over volume. A useful contribution makes a dependency, assumption, source, caveat, counterexample, or verification result more recoverable.

## Before proposing an object

1. Search stable IDs and aliases for an existing concept.
2. Choose the layer: logical object, historical claim, corpus work, or editorial relation.
3. Name the framework and every assumption that materially changes the claim.
4. Pin logical dependencies to exact revisions.
5. Supply both a plain explanation and an exact statement.
6. State what was actually checked; use `editorial` unless a reproducible stronger artifact exists.
7. Record provenance and rights.

## Never submit

- a paper citation as if it proved its abstract;
- a simulation as a universal proof;
- a title-only author merge;
- copied source prose with missing or incompatible rights;
- an unlabeled AI extraction as a QEVA claim;
- a silent correction to an existing revision.

## Local verification

```sh
python3 scripts/seed_release.py
python3 scripts/release.py
python3 scripts/verify.py
python3 scripts/test_harvester.py
```

Reviews should cite an exact QEVA revision, name the framework in which an objection applies, and preserve a disagreement when consensus has not been earned.
