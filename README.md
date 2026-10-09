# Qeva

A minimal English website for Qeva, an independent software and AI practice run by Pakin. The first consultation is free; implementation is scoped and priced separately.

## Local development

Requires Node.js 22.12 or newer (even-numbered LTS release).

```sh
npm install
npm run dev
```

Production verification:

```sh
npm run build
npm run verify
npm run deploy:check
```

The build generates a PNG social preview from the authored SVG, then Astro outputs portable HTML/CSS/assets to `dist/`. No Cloudflare adapter, Worker script, database, or client JavaScript is needed. Commit the generated package lock after installing dependencies.

If dependencies are unavailable, `npm run preview:source` serves the same authored homepage and CSS at http://127.0.0.1:4321 using only Node. It is a source preview, not production-build validation.

## Content

- `src/content/home.html`: page copy, layout, and decorative diagram.
- `public/styles.css`: responsive layout, colors, typography, and reduced-motion handling.
- `src/layouts/Layout.astro`: document metadata.
- `public/social-preview.svg`: original social artwork; the build generates its PNG.

Public copy and metadata use Pakin only, with no full name or unverified claims. All contact actions use hello@qeva.org.

## Cloudflare Workers Free

`wrangler.jsonc` deploys only the static `dist/` directory, with proper 404 handling. No production domain is attached by this configuration, so the first deployment is a workers.dev preview. The application is portable; only this deployment file and the Cloudflare header/redirect files are host-specific.

From a working terminal:

```sh
npx wrangler login
npm run deploy
```

Alternatively connect the repository in Cloudflare Workers Builds: build command `npm run build && npm run verify`, deploy command `npx wrangler deploy`, root directory the repository root, Node version 22. Set the Worker name to `qeva-site` to match the configuration.

## Domain cutover

1. Verify the workers.dev preview, including mobile layout, links and a real missing-page response.
2. Record/export current DNS and nameservers before any changes. Check all existing web records and email MX, SPF, DKIM, DMARC and verification records.
3. If the zone needs Cloudflare nameservers, copy and verify the existing records before changing nameservers at the registrar. Do not enable Email Routing or replace the current mail provider as part of the website migration.
4. Add `qeva.org` as a Worker Custom Domain only after preview verification. Resolve any existing web-record conflict deliberately; do not remove unrelated records.
5. Configure a Cloudflare Single Redirect for hostname `www.qeva.org` to `https://qeva.org`, preserving path and query string, with status 301. Ensure www has the required proxied DNS record. Domain-level redirects cannot be expressed in the static-assets `_redirects` file.
6. Verify root/www HTTPS, the redirect, homepage assets, 404, and existing email DNS. The account owner should send and receive a real email test.
7. Keep Vercel available until verification completes. Preserve the original DNS snapshot for rollback. Retire Vercel only after successful cutover.

`vercel.json` is retained from the old checkout; this task does not change Vercel or DNS automatically. Do not assume that its previous build settings deploy the new Astro application.

## Repository state at implementation

Before new files were added, this checkout contained only `vercel.json` and `.git/`; the Git index recorded 948 already-missing tracked files. Those deletions were not reset or staged. New website files replace the website within the approved rebuild scope. Review Git changes before committing; no commit or push is performed automatically.

## Current validation status

File creation and source checks are possible. The session's terminal fails before running a command with a bundled PowerShell executable resolution error. Dependency installation, the Astro build, Wrangler validation, and deployment require a working terminal. Source-preview checks must not be reported as an Astro production build.
