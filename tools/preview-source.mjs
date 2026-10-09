// Dependency-free source preview. This does not replace an Astro production build.
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';

const root = new URL('../', import.meta.url);
const routes = new Map([
  ['/styles.css', ['public/styles.css', 'text/css; charset=utf-8']],
  ['/favicon.svg', ['public/favicon.svg', 'image/svg+xml']],
  ['/social-preview.svg', ['public/social-preview.svg', 'image/svg+xml']],
  ['/robots.txt', ['public/robots.txt', 'text/plain; charset=utf-8']],
  ['/sitemap.xml', ['public/sitemap.xml', 'application/xml']],
]);
export function document(body) {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Qeva — source preview</title><meta name="robots" content="noindex,nofollow"><link rel="icon" href="/favicon.svg"><link rel="stylesheet" href="/styles.css"></head><body>' + body + '</body></html>';
}
export function createSourcePreview() {
  return createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(document(await readFile(new URL('src/content/home.html', root), 'utf8')));
      } else if (routes.has(pathname)) {
        const [file, type] = routes.get(pathname);
        response.writeHead(200, { 'Content-Type': type });
        response.end(await readFile(new URL(file, root)));
      } else {
        response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end(document('<main class="not-found wrap"><a class="wordmark" href="/">qeva.</a><div><p class="eyebrow">404 / Page not found</p><h1>This page isn’t here.</h1><a class="button" href="/">Back to Qeva</a></div></main>'));
      }
    } catch {
      response.writeHead(500);
      response.end('Source preview could not read a file.');
    }
  });
}
// Bind only to loopback. No files outside the explicit routes are served.
createSourcePreview().listen(4321, '127.0.0.1', () => console.log('Source preview: http://127.0.0.1:4321'));
