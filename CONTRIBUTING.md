# Contributing to QEVA

A contribution should make a mathematical object more explicit, not merely add prose.

For a new archive record:

1. Copy an existing file in `archive/objects/`.
2. Give it a stable QEVA ID and revision number.
3. State the context and assumptions before the claim.
4. Separate a plain-language explanation from the exact statement.
5. Record dependencies and relations explicitly.
6. Do not label context-dependent terminology as universal.
7. Do not overwrite a released correction; create a new revision.
8. Run:

```bash
python3 scripts/release.py
python3 scripts/verify.py
```

A record may be useful even when open, refuted, or only editorially checked. Its verification state must be honest.
