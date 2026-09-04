# Contributing to QEVA

A contribution should make a mathematical object more explicit, not merely add prose.

For each record:

1. Keep the logical `id` stable; `kind` is metadata and may be corrected without changing identity.
2. Never rewrite a released revision. Create the next integer revision and set `supersedes` to the exact old reference.
3. Pin every QEVA dependency, relation, framework reference, and referenced assumption to an exact `@revision`.
4. Separate `content.plain` from `content.exact`.
5. State the mathematical framework and assumptions before relying on them.
6. Do not turn context-dependent terminology into a fake universal definition.
7. Describe only the verification that actually occurred.
8. Preserve provenance and source notes.
9. Run:

```bash
python3 scripts/release.py
python3 scripts/verify.py
```

Open, refuted, incomplete, or editorial records can be valuable. Their state must remain explicit.

## Historical and corpus contributions

- Never infer logical dependence from citation or historical influence alone.
- Attach identifiers, dates, source provenance, and uncertainty to historical claims.
- Disputed priority should remain representable as disagreement, not silently collapsed to one winner.
- Imported third-party material retains its own rights; do not relabel it CC0.
- Machine-extracted definitions, theorems, problems, or relations enter as candidates until qualified.
- Prefer official APIs/dumps/feeds and comply with source-specific access and reuse rules.
