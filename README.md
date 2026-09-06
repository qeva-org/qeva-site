# QEVA site project

The public, dependency-free site is in `dist/`. Open `dist/index.html`
directly or serve `dist/` from any static host.

Validation commands are documented in `dist/README.md`.

Build the normalized release archive with:

```sh
python3 scripts/package_release.py /path/to/qeva-site-v0.5-mechanism-engine.zip
```

The packager runs all three verification tiers, rejects unsafe or private paths,
normalizes ZIP metadata, and writes through a temporary file so repeated builds
from identical inputs are byte-for-byte identical.
