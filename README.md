# QEVA site project — 0.5.1

The public static website is in `dist/`. `vercel.json` declares `dist` as the
output directory and requires no framework build. Keep the Vercel project root
at the directory containing `vercel.json`; do not add an extra wrapper directory
or set the project root to `dist` while keeping this outer configuration.
No deployment has been performed by the production of this archive.

```sh
# Local HTTP preview
python3 -m http.server 8000 --directory dist

# Rebuild generated pages, exports and archival manifests after edits
python3 -B dist/scripts/release.py

# Outer deployment, canonical, runtime, preservation and new regression tests
python3 -B scripts/check_project.py

# Reproducible ZIP; destination must be outside this repository
python3 -B scripts/package_release.py ../qeva-site-release.zip
```

The ZIP contains repository files directly at its root. Copy its **contents**
over the existing project while keeping the existing Git history. The valid
`dist/` boundary has been retained; changing folder layout is not necessary.

## Scope

Six bounded kernels, seven analyzers, 116 current mathematical records and 159
immutable mathematical revisions remain. The patch restores the original logo,
fixes misleading aggregate statuses, supports replayable local run imports, adds
a bounded browser-local shelf and repairs deployment packaging. It does not
implement accounts, groups, alliances, user-created agents/tools, continuous
harvesting or a live shared artifact service.

The static site has no runtime package dependencies. Python 3 and Node are
needed for development/verification. The public core remains separate from
future authenticated services, private data and compute workers.

## Planning and audit

- [Audited master TODO v3](docs/QEVA_MASTER_TODO_v3_AUDITED.md)
- [Audit, changes and limitations](docs/QEVA_AUDIT_v0.5_to_v0.5.1.md)
- [Original v2 plan](docs/QEVA_MASTER_TODO_v2_DIGITAL_CIVILIZATION.md)
- [560-item traceability register](docs/todo-traceability.json)
- [Original-path preservation ledger](docs/audit/original-path-changes.json)
- [Original logo provenance](branding/README.md)

Local browser saving is not an account or backup. Browser data may be cleared;
export runs separately. Notes currently remain local. Imported old run exports
retain their payload, but a legacy aggregate analysis without enough replay
inputs is explicitly not marked verified.

Do not place credentials or operational corpus/private data under `dist/`.
Harvester acquisition is a bounded prototype; the full implementation contracts
and pipeline gaps are recorded in the TODO rather than advertised as complete.

CI configuration is included, not remotely executed. See the audit for the
difference between Node/DOM tests, local HTTP checks and actual live deployment.
