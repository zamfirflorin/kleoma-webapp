// Builds the static site into dist/:  node scripts/build.mjs
// No framework: Tailwind compiles the CSS, a few string templates make the pages, assets get content hashes.
import { copyFile, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const defaultRoot = path.resolve(here, '..');

import { escapeHtml } from './html.mjs';
export { escapeHtml };

const lookup = (vars, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), vars);

/** {{name}} is HTML-escaped, {{{name}}} is inserted as it is. Dotted names read nested values. */
export function render(template, vars) {
  return template
    .replace(/\{\{\{\s*([\w.]+)\s*\}\}\}/g, (_, k) => lookup(vars, k) ?? '')
    .replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => escapeHtml(lookup(vars, k) ?? ''));
}

const hash8 = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 8);

const INTER_RANGES = {
  'inter-latin': 'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
  'inter-latin-ext': 'U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C4, U+2113, U+2C60-2C7F, U+A720-A7FF',
};

function fontFaceCss(hrefs) {
  const inter = Object.entries(INTER_RANGES).filter(([name]) => hrefs[name]).map(([name, range]) =>
    `@font-face{font-family:Inter;font-style:normal;font-weight:100 900;font-display:swap;src:url(${hrefs[name]}) format('woff2');unicode-range:${range}}`);
  const icons = hrefs['material-symbols']
    ? [`@font-face{font-family:'Material Symbols Outlined';font-style:normal;font-weight:400;font-display:block;src:url(${hrefs['material-symbols']}) format('woff2')}`]
    : [];
  return [...inter, ...icons].join('\n');
}

/** A deterministic waveform: the same markup on every build. */
export function waveformSvg() {
  const bars = [];
  for (let i = 0; i < 40; i++) {
    const h = Math.round(8 + 50 * Math.abs(Math.sin(i * 0.9) * Math.cos(i * 0.37) + 0.2));
    const clamped = Math.min(60, h);
    bars.push(`<rect fill="currentColor" height="${clamped}" opacity="${(0.35 + (0.6 * clamped) / 60).toFixed(2)}" rx="2" width="4" x="${Math.round(i * 12.2)}" y="${(64 - clamped) / 2}"/>`);
  }
  return `<svg class="wave h-16 w-full text-primary-container" id="wave" viewBox="0 0 492 64" fill="none" role="img" aria-label="Waveform of the sample line" xmlns="http://www.w3.org/2000/svg">${bars.join('')}</svg>`;
}

function storeButton(kind, url) {
  const meta = kind === 'ios' ? { name: 'iOS', icon: 'phone_iphone' } : { name: 'Android', icon: 'android' };
  const base = 'inline-flex w-full items-center justify-center gap-3 rounded-full px-7 py-3.5 text-label-lg sm:w-auto';
  const inner = (small) => `<span class="icon text-[24px]" aria-hidden="true">${meta.icon}</span><span class="text-left leading-tight"><span class="block text-[10px] uppercase tracking-wider opacity-80">${small}</span><span class="text-sm font-semibold">${meta.name}</span></span>`;
  if (url) {
    const tone = kind === 'ios' ? 'bg-primary-container text-on-primary hover:bg-primary-fixed-dim shadow-md' : 'bg-surface-container-high text-on-surface hover:bg-surface-variant shadow-sm';
    return `<a class="press ${base} ${tone}" href="${escapeHtml(url)}" rel="noopener">${inner('Download for')}</a>`;
  }
  return `<span class="${base} cursor-default bg-surface-container-high text-on-surface-variant opacity-70" aria-disabled="true">${inner('Coming soon')}</span>`;
}

async function readIfExists(file) {
  return existsSync(file) ? readFile(file, 'utf8') : null;
}

/**
 * Build the site. Returns a report the tests (and `npm run build`) use.
 * Options: root (project folder), outDir (default root/dist), now (a Date, for the footer year), config (replaces site.config.json, for tests).
 */
export async function build({ root = defaultRoot, outDir = path.join(root, 'dist'), now = new Date(), config: configOverride } = {}) {
  const config = configOverride ?? JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
  const src = (...p) => path.join(root, 'src', ...p);
  const siteUrl = config.site.url.replace(/\/$/, '');

  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, 'assets', 'fonts'), { recursive: true });

  // 1. Fonts (hashed names, so they can be cached for a year)
  const fontHref = {};
  for (const file of (await readdir(src('assets', 'fonts'))).filter((f) => f.endsWith('.woff2'))) {
    const buf = await readFile(src('assets', 'fonts', file));
    const name = file.replace(/\.woff2$/, '');
    const hashed = `${name}.${hash8(buf)}.woff2`;
    await writeFile(path.join(outDir, 'assets', 'fonts', hashed), buf);
    fontHref[name] = `/assets/fonts/${hashed}`;
  }

  // 2. CSS: Tailwind over the sources, with the font faces filled in
  const tmp = path.join(outDir, '.build');
  await mkdir(tmp, { recursive: true });
  const input = (await readFile(src('styles', 'input.css'), 'utf8')).replace('/*FONT_FACES*/', fontFaceCss(fontHref));
  await writeFile(path.join(tmp, 'input.css'), input);
  const tailwindCli = path.join(root, 'node_modules', 'tailwindcss', 'lib', 'cli.js');
  execFileSync(process.execPath, [tailwindCli, '-c', path.join(root, 'tailwind.config.cjs'), '-i', path.join(tmp, 'input.css'), '-o', path.join(tmp, 'site.css'), '--minify'],
    { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] });
  const css = await readFile(path.join(tmp, 'site.css'));
  const cssName = `site.${hash8(css)}.css`;
  await writeFile(path.join(outDir, 'assets', cssName), css);
  await rm(tmp, { recursive: true, force: true });

  // 3. JS
  const js = await readFile(src('assets', 'site.js'));
  const jsName = `site.${hash8(js)}.js`;
  await writeFile(path.join(outDir, 'assets', jsName), js);

  // 4. Static files (favicon, _headers, ...)
  for (const file of await readdir(src('public'))) await copyFile(src('public', file), path.join(outDir, file));

  // 5. Optional legal documents (added by the legal-documents story)
  let legal = { pages: [], links: [], versions: null };
  const legalModule = path.join(here, 'legal.mjs');
  if (existsSync(legalModule)) {
    const { buildLegal } = await import(pathToFileURL(legalModule).href);
    legal = await buildLegal({ root, config, now });
  }

  // 6. Pages
  const layout = await readFile(src('layout.html'), 'utf8');
  const header = await readFile(src('header.html'), 'utf8');
  const footerTemplate = await readFile(src('footer.html'), 'utf8');
  const legalLinks = legal.links.length
    ? legal.links.map((l) => `<a class="text-body-sm text-on-surface-variant transition-colors hover:text-primary" href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`).join('\n        ')
    : '';
  const footer = render(footerTemplate, { supportEmail: config.contact.supportEmail, year: now.getUTCFullYear(), legalLinks });

  const preload = [fontHref['material-symbols'], fontHref['inter-latin']].filter(Boolean)
    .map((h) => `<link rel="preload" href="${h}" as="font" type="font/woff2" crossorigin>`).join('\n');

  const page = (p) => render(layout, {
    title: p.title, description: p.description, robots: p.robots, canonical: `${siteUrl}${p.urlPath}`,
    preload, cssHref: `/assets/${cssName}`, jsHref: `/assets/${jsName}`, header, footer, content: p.content,
  });

  const indexContent = render(await readFile(src('pages', 'index.html'), 'utf8'), {
    waveform: waveformSvg(),
    storeIos: storeButton('ios', config.stores.ios),
    storeAndroid: storeButton('android', config.stores.android),
    storesNote: config.stores.ios || config.stores.android ? ''
      : '<p class="mt-8 text-label-md text-on-surface-variant">The app is coming soon to iOS and Android.</p>',
  });
  const pages = [
    { file: 'index.html', urlPath: '/', title: `Kleoma: ${config.site.tagline.toLowerCase()}`, description: config.site.description, robots: 'index,follow', content: indexContent },
    { file: '404.html', urlPath: '/404', title: 'Page not found | Kleoma', description: 'This page does not exist.', robots: 'noindex', content: await readFile(src('pages', '404.html'), 'utf8') },
  ];
  for (const p of pages) await writeFile(path.join(outDir, p.file), page(p));
  for (const p of legal.pages) {
    const target = path.join(outDir, p.file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, page(p));
  }
  if (legal.versions) {
    await mkdir(path.join(outDir, 'legal'), { recursive: true });
    await writeFile(path.join(outDir, 'legal', 'versions.json'), JSON.stringify(legal.versions, null, 2) + '\n');
  }

  // 7. robots and sitemap (only pages meant to be found)
  const indexable = [...pages, ...legal.pages].filter((p) => p.robots.startsWith('index'));
  await writeFile(path.join(outDir, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`);
  await writeFile(path.join(outDir, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((p) => `  <url><loc>${siteUrl}${p.urlPath}</loc></url>`).join('\n')}\n</urlset>\n`);

  return { outDir, css: `/assets/${cssName}`, js: `/assets/${jsName}`, fonts: fontHref, pages: [...pages, ...legal.pages].map((p) => ({ file: p.file, urlPath: p.urlPath, robots: p.robots })), legal };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const report = await build({ outDir: process.env.KLEOMA_OUT_DIR ? path.resolve(process.env.KLEOMA_OUT_DIR) : undefined });
  console.log(`Built ${report.pages.length} pages into ${path.relative(process.cwd(), report.outDir)}/ (${report.css}, ${report.js})`);
  if (report.legal.placeholders?.length) console.warn(`Warning: ${report.legal.placeholders.length} unfilled placeholder(s) in the legal documents. Run: npm run check:launch`);
}
