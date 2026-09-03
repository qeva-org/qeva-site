# QEVA — First Principles Archive

**Start with assumptions. See what follows.**

QEVA is an open, permanent atlas of mathematical structure: definitions, laws, proofs, counterexamples, equivalences, algorithms, conjectures, and their dependencies.

This repository is deliberately static and dependency-free. `index.html` is the site. The canonical archive is plain JSON plus a JSONL snapshot. Python is optional and used only to regenerate/verify archive manifests.

## Repository

```text
/
├── index.html                 public entrance
├── archive/                   canonical machine-readable records + human index
├── protocol/                  QEVA object protocol and schema
├── preservation/              mirroring and preservation rules
├── institution/               constitutional stewardship rules
├── snapshot/                  self-describing bootstrap document
├── scripts/                   stdlib-only release/verification tools
└── LICENSES/                  code/content licenses
```

## Local use

Open `index.html` directly, or serve the directory with any static file server.

Optional integrity check:

```bash
python3 scripts/verify.py
```

Regenerate the machine index, JSONL snapshot, and SHA-256 manifest after editing archive objects:

```bash
python3 scripts/release.py
python3 scripts/verify.py
```

## Deployment

No build command and no framework are required. Point Vercel, GitHub Pages, nginx, Apache, IPFS, or any static host at the repository root.

QEVA must remain usable if any one host, company, domain, framework, or institution disappears.

## Historical provenance

When this release is applied to the existing public repository, keep the earlier Git history. QEVA was refounded in 2026 from an earlier AI-alignment site into the First Principles Archive. History is provenance, not clutter.

## License

- Code: MIT — `LICENSES/MIT.txt`
- Archive records, protocol text, and site content: CC0-1.0 — local notice in `LICENSES/CC0-1.0.txt`
