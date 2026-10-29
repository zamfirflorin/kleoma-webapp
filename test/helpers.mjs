import { mkdtemp, readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, defaultRoot } from '../scripts/build.mjs';

export const root = defaultRoot;

/** Builds the site into a fresh temp folder. */
export async function buildTo(options = {}) {
  const outDir = await mkdtemp(path.join(tmpdir(), 'kleoma-web-'));
  const report = await build({ root, outDir, ...options });
  return { outDir, report };
}

export const read = (outDir, file) => readFile(path.join(outDir, file), 'utf8');

export async function listFiles(dir, base = dir) {
  const out = [];
  for (const name of await readdir(dir)) {
    const p = path.join(dir, name);
    if ((await stat(p)).isDirectory()) out.push(...(await listFiles(p, base)));
    else out.push(path.relative(base, p));
  }
  return out;
}

/** Same rules as Cloudflare's html_handling "auto-trailing-slash": /privacy -> privacy/index.html or privacy.html. */
export function resolveUrlPath(outDir, urlPath) {
  const clean = urlPath.split('#')[0].split('?')[0];
  const candidates = clean.endsWith('/') ? [clean + 'index.html'] : [clean, clean + '/index.html', clean + '.html'];
  for (const c of candidates) {
    const file = path.join(outDir, c);
    if (existsSync(file) && file.startsWith(outDir)) return file;
  }
  return null;
}

export const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Removes the element with the given id (and everything inside it) by counting nested <div> tags. */
export function removeDivById(html, id) {
  const start = html.search(new RegExp(`<div[^>]*\\sid="${id}"`));
  if (start < 0) return html;
  const tag = /<\/?div\b[^>]*>/g;
  tag.lastIndex = start;
  let depth = 0;
  for (let m = tag.exec(html); m; m = tag.exec(html)) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return html.slice(0, start) + html.slice(tag.lastIndex);
  }
  return html;
}

/** The CSS with every @media (hover:hover) block taken out (blocks may nest braces). */
export function cssOutsideHoverMedia(css) {
  let out = '';
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('@media (hover:hover)', i)) {
      let depth = 0;
      let seenBrace = false;
      while (i < css.length) {
        if (css[i] === '{') { depth++; seenBrace = true; }
        if (css[i] === '}') depth--;
        i++;
        if (seenBrace && depth === 0) break;
      }
    } else out += css[i++];
  }
  return out;
}
