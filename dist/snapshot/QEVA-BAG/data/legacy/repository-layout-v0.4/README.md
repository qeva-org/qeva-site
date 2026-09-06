# QEVA Site repository

The deployable static site is in `dist/`. Open `dist/index.html` directly, or serve that directory from any static host.

Rebuild and verify from the repository root:

```sh
python3 dist/scripts/seed_release.py
python3 dist/scripts/release.py
python3 dist/scripts/verify.py
python3 dist/scripts/test_harvester.py
```

No runtime package installation is required. See `dist/README.md` for the archive architecture and release boundary.
