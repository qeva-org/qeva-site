# Rebuild validation — 2026-10-09

## Completed

- Astro static website source, one English homepage and 404 page.
- Shared HTML/CSS with no client scripts, first-name-only introduction, and hello@qeva.org contact.
- Cloudflare Workers Static Assets configuration, deployment/dry-run scripts, and DNS migration instructions.
- SVG favicon and social artwork; production build generates the 1200 × 630 PNG via Sharp.
- Source checks passed: one h1, unique IDs, all fragment links resolve, correct email links, no full name, no client scripts, responsive breakpoint, visible focus, reduced motion.
- Calculated text contrast against #101213: body 15.89:1, muted 8.27:1, accent 12.20:1.
- Package JSON and Wrangler JSON parse successfully; deployment has no Worker script or attached production domain.
- A dependency-free preview server is running at http://127.0.0.1:4321 for manual inspection. An ignored self-contained source preview is at .preview/index.html. Neither is Astro production output.

## Not verified / blocked

- The terminal fails at process startup: Failed to resolve full path of the current executable [C:\Users\pakin\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe]. An escalated attempt failed with the same error.
- Native Git commands cannot read the working directory in the current sandbox. The read-only Git-index inventory recorded 949 tracked entries, 948 absent before the rebuild. No Git reset, staging, commit or push was performed.
- Dependency installation, lockfile creation, Astro build and production-output verifier, generated social PNG, Wrangler dry-run and deployment remain unrun.
- Browser security policy rejected the local preview URL. No desktop/mobile screenshot, browser interaction, or rendered overflow check is claimed.
- Cloudflare dashboard access was previously blocked by browser policy. No production custom domain, www redirect, DNS migration or email delivery test has been performed.

## Remaining verification

From a working terminal, install dependencies, build, run the production-output verifier and Wrangler dry-run. Review desktop/mobile layouts and keyboard navigation. Deploy to workers.dev and verify HTTPS/static assets/404 before changing DNS. Follow README.md for domain cutover and preserve mail records; confirm mail delivery with the account owner.
