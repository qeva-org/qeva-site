import { readFile, access, stat } from 'node:fs/promises';

const root = new URL('../dist/', import.meta.url);
const html = await readFile(new URL('index.html', root), 'utf8');
const missing = await readFile(new URL('404.html', root), 'utf8');
function requireCheck(condition, message) { if (!condition) throw new Error(message); }
requireCheck((html.match(/<h1\b/g) || []).length === 1, 'Homepage must contain one h1.');
requireCheck(/<html[^>]+lang="en"/.test(html), 'Homepage language is missing.');
requireCheck(/rel="canonical"[^>]+href="https:\/\/qeva.org\/"/.test(html), 'Homepage canonical is incorrect.');
requireCheck(/noindex/.test(missing), '404 must be excluded from indexing.');
requireCheck(!/Methawisal/i.test(html + missing), 'Full name leaked into public HTML.');
requireCheck(!/<script\b/i.test(html + missing), 'This website should ship without client JavaScript.');
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
requireCheck(new Set(ids).size === ids.length, 'Duplicate homepage IDs.');
for (const match of html.matchAll(/href="#([^"]+)"/g)) {
  requireCheck(ids.includes(match[1]), 'Missing anchor: ' + match[1]);
}
for (const match of html.matchAll(/(?:href|src)="(\/[^"#?]*)[^"]*"/g)) {
  const route = match[1];
  if (route === '/') continue;
  await access(new URL(route.slice(1), root));
}
const png = await readFile(new URL('social-preview.png', root));
requireCheck(png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), 'Invalid social PNG.');
requireCheck(png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630, 'Incorrect social-preview dimensions.');
for (const file of ['styles.css', 'favicon.svg', 'robots.txt', 'sitemap.xml', '_headers', '_redirects']) {
  requireCheck((await stat(new URL(file, root))).size > 0, 'Empty public file: ' + file);
}
const emailLinks = [...html.matchAll(/href="mailto:([^"?]+)/g)].map(match => match[1]);
requireCheck(emailLinks.length >= 2 && emailLinks.every(value => value === 'hello@qeva.org'), 'Incorrect email contact.');
console.log('Static-output verification passed: metadata, anchors, assets, contact, 404, and social image.');
