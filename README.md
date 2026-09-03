# QEVA — First Principles Archive

**Make the assumptions, meanings, dependencies, and verification state of mathematics inspectable.**

QEVA is a small open protocol plus archive. The website is only one view of it.

## Who it is for

1. **Curious non-specialists** who can read a mathematical statement but are blocked by hidden prerequisites or undefined notation.
2. **Students and researchers** who need to compare exact definitions, assumptions, equivalent formulations, or dependency chains across fields.
3. **Formalization/tool builders** who need stable, machine-readable mathematical records without scraping prose pages.
4. **Libraries and independent custodians** who want a corpus that can be copied and checked without a proprietary service.

## Pain points QEVA is designed to remove

- “What was assumed, and what was actually proved or defined?”
- “Which exact earlier version does this result depend on?”
- “Is this word universal, or does this field use a special convention?”
- “Are these two formulas different objects or two representations of one object?”
- “Can I explain this to a careful beginner without deleting the real mathematics?”
- “Can I still reconstruct this corpus if the current website and organization vanish?”

## Repository

```text
/
├── index.html                 minimal public entrance
├── archive/                   records + JSONL + TSV catalog
├── protocol/                  Protocol 0.2, schema, compact CORE.txt
├── preservation/              threat model and custody rules
├── institution/               constitutional stewardship rules
├── snapshot/                  READ-ME-FIRST recovery bootstrap
├── scripts/                   stdlib-only release/verification tools
├── LICENSES/                  complete local license texts
├── MANIFEST.sha256            full-repo fixity manifest
└── MANIFEST.sha512            second full-repo fixity manifest
```

## Important scope boundary

This is a **seed archive, not a completed foundation of mathematics**. Most seed records still name their ambient framework textually instead of recursively resolving every primitive, axiom, and inference rule to QEVA records. That incompleteness is intentional and visible.

The long-term completion target is stronger: a record that claims first-principles closure must have an explicit chain to declared roots rather than merely saying “standard mathematics.”

## Offline use

All public links are relative. Open `index.html` directly from an extracted directory, or serve the directory from any static HTTP server.

Optional full audit:

```bash
python3 scripts/verify.py
```

Regenerate exports and manifests after editing records:

```bash
python3 scripts/release.py
python3 scripts/verify.py
```

No package manager, build system, runtime framework, database, account, analytics service, or webfont is required.

## Identity and revisions

Logical object:

```text
qeva:1:sequence
```

Exact immutable revision:

```text
qeva:1:sequence@1
```

Dependencies always pin exact revisions.

## Historical provenance

Keep the earlier Git history when applying this release to the existing public repository. QEVA was refounded in 2026 from an earlier AI-alignment site into the First Principles Archive. Historical direction changes are provenance, not a reason to rewrite Git history.

## License

- Code: MIT — `LICENSES/MIT.txt`
- Archive records, protocol text, and site content: CC0-1.0 — full local legal text in `LICENSES/CC0-1.0.txt`
