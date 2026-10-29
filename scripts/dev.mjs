// Local preview: node scripts/dev.mjs [port]   Builds, serves dist/ with the same clean URLs as Cloudflare, rebuilds on change.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { watch } from 'node:fs';
import path from 'node:path';
import { build, defaultRoot } from './build.mjs';

const port = Number(process.argv[2] || process.env.PORT || 8787);
const dist = path.join(defaultRoot, 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' };

/** /privacy -> /privacy/index.html or /privacy.html, like html_handling "auto-trailing-slash". */
async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const candidates = clean.endsWith('/') ? [clean + 'index.html'] : [clean, clean + '/index.html', clean + '.html'];
  for (const c of candidates) {
    const file = path.join(dist, c);
    if (!file.startsWith(dist)) continue;
    try { if ((await stat(file)).isFile()) return file; } catch { /* next */ }
  }
  return null;
}

// Builds run one at a time, and a burst of file events (an editor saving several files) triggers one rebuild.
// A request waits for the build in progress, so it never sees a half-written dist/.
let building = Promise.resolve();
let timer = null;
const rebuild = () => {
  building = building
    .then(() => build())
    .then((r) => console.log(`built ${r.pages.length} pages`))
    .catch((e) => console.error(e.message));
};
const scheduleRebuild = () => { clearTimeout(timer); timer = setTimeout(rebuild, 200); };
rebuild();
for (const dir of ['src', 'legal', 'scripts']) {
  try { watch(path.join(defaultRoot, dir), { recursive: true }, scheduleRebuild); } catch { /* folder may not exist */ }
}

createServer(async (req, res) => {
  await building;
  await new Promise((r) => setTimeout(r, 0));   // let a rebuild scheduled just now start before we read dist/
  await building;
  const file = await resolveFile(req.url);
  if (!file) {
    res.writeHead(404, { 'content-type': TYPES['.html'] });
    return res.end(await readFile(path.join(dist, '404.html')));
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
}).listen(port, () => console.log(`http://localhost:${port}`));
