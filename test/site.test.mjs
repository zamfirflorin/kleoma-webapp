import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { render, waveformSvg } from '../scripts/build.mjs';
import { buildTo, cssOutsideHoverMedia, listFiles, loadedUrls, read, removeDivById, resolveUrlPath, root, stripCssComments } from './helpers.mjs';

let outDir, report, home, css, allHtmlFiles;

before(async () => {
  ({ outDir, report } = await buildTo());
  home = await read(outDir, 'index.html');
  css = stripCssComments(await readFile(path.join(outDir, report.css), 'utf8'));
  allHtmlFiles = (await listFiles(outDir)).filter((f) => f.endsWith('.html'));
});

describe('build output', () => {
  it('writes the pages, hashed assets, fonts, headers, robots and sitemap', async () => {
    const files = await listFiles(outDir);
    for (const f of ['index.html', '404.html', '_headers', 'favicon.svg', 'robots.txt', 'sitemap.xml']) assert.ok(files.includes(f), `${f} is missing`);
    assert.match(report.css, /^\/assets\/site\.[0-9a-f]{8}\.css$/);
    assert.match(report.js, /^\/assets\/site\.[0-9a-f]{8}\.js$/);
    assert.ok(files.includes(report.css.slice(1)) && files.includes(report.js.slice(1)));
    for (const href of Object.values(report.fonts)) assert.ok(files.includes(href.slice(1)), `${href} was not copied`);
    assert.ok(Object.keys(report.fonts).length >= 3, 'Inter (2 subsets) and the icon font');
  });

  it('is deterministic: building twice gives the same file names', async () => {
    const second = await buildTo();
    assert.deepEqual(second.report.css, report.css);
    assert.deepEqual(second.report.js, report.js);
    assert.deepEqual(second.report.fonts, report.fonts);
    assert.equal(await read(second.outDir, 'index.html'), home);
  });

  it('puts the content hash in every cacheable asset name', () => {
    assert.match(Object.values(report.fonts).join(' '), /\.[0-9a-f]{8}\.woff2/);
  });
});

describe('Cloudflare configuration', () => {
  it('serves /privacy directly (no trailing-slash redirect) and keeps the canonical links in step', async () => {
    const jsonc = await readFile(path.join(root, 'wrangler.jsonc'), 'utf8');
    const config = JSON.parse(jsonc.replace(/^\s*\/\/.*$/gm, ''));
    assert.equal(config.assets.directory, './dist');
    assert.equal(config.assets.html_handling, 'drop-trailing-slash', 'the app and the canonical tags use /privacy, not /privacy/');
    assert.equal(config.assets.not_found_handling, '404-page');
    assert.deepEqual(config.routes.map((r) => r.pattern).sort(), ['kleoma.com', 'www.kleoma.com']);
    assert.ok(config.routes.every((r) => r.custom_domain === true));
    assert.equal(config.main, undefined, 'assets only: no Worker script, so no request limit applies');
    // every canonical link is the no-slash form the config serves
    for (const file of allHtmlFiles.filter((f) => f !== 'index.html')) {
      const canonical = /<link rel="canonical" href="([^"]+)"/.exec(await read(outDir, file))[1];
      assert.ok(!canonical.endsWith('/'), `${file}: canonical ${canonical} should not end with a slash`);
    }
  });
});

describe('the command line', () => {
  it('`node scripts/build.mjs` finishes and writes every page (no import cycle, no hanging top-level await)', async () => {
    const { execFileSync } = await import('node:child_process');
    const { mkdtemp } = await import('node:fs/promises');
    const { tmpdir } = await import('node:os');
    const out = await mkdtemp(path.join(tmpdir(), 'kleoma-cli-'));
    const stdout = execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root, env: { ...process.env, KLEOMA_OUT_DIR: out }, timeout: 120000 }).toString();
    assert.match(stdout, /Built \d+ pages into/);
    const files = await listFiles(out);
    for (const f of ['index.html', 'privacy/index.html', 'terms/index.html', 'data-deletion/index.html', 'legal/versions.json']) assert.ok(files.includes(f), `${f} was not written`);
  });

  it('`node scripts/check-launch.mjs` runs and reports (it exits 1 while the drafts are open)', async () => {
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, ['scripts/check-launch.mjs', '--offline'], { cwd: root, timeout: 60000, encoding: 'utf8' });
    assert.match(r.stdout, /blocked\s+/);
    assert.match(r.stdout, /Not ready: \d+ thing\(s\)/);
    assert.equal(r.status, 1);
  });
});

describe('privacy by design: the site talks to nobody else', () => {
  it('loads nothing from a third party on any page (links to other sites are fine, requests are not)', async () => {
    const own = /^(\/|https:\/\/kleoma\.com\/|data:|#)/;
    for (const file of allHtmlFiles) {
      const html = await read(outDir, file);
      const loaded = loadedUrls(html);
      assert.deepEqual(loaded.filter((u) => !own.test(u)), [], `${file} loads something from a third party`);
      assert.doesNotMatch(html, /@import|url\(\s*["']?https?:/, `${file}: remote CSS import`);
    }
  });

  it('has no external URL in the compiled CSS (fonts are self-hosted)', () => {
    const urls = css.match(/https?:\/\/[^\s"'<>)]+/g) ?? [];
    assert.deepEqual(urls, []);
  });

  it('loads no CDN script, Google Fonts or analytics', async () => {
    for (const file of allHtmlFiles) {
      const urls = loadedUrls(await read(outDir, file));
      assert.deepEqual(urls.filter((u) => /cdn\.|googleapis|gstatic|googletagmanager|google-analytics|facebook|doubleclick|^https?:/i.test(u)), [], file);
    }
  });

  it('sets no cookies and has no forms or inputs that collect data', () => {
    assert.doesNotMatch(home, /document\.cookie|<form|<input(?![^>]*type="range")/);
  });
});

describe('Content-Security-Policy compatibility', () => {
  it('has no inline script, inline style or event-handler attribute', async () => {
    for (const file of allHtmlFiles) {
      const html = await read(outDir, file);
      assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, `${file}: inline script`);
      assert.doesNotMatch(html, /<style[\s>]/, `${file}: <style> element`);
      assert.doesNotMatch(html, /\sstyle="/, `${file}: style attribute`);
      assert.doesNotMatch(html, /\son[a-z]+="/, `${file}: event-handler attribute`);
    }
  });

  it('ships strict security headers and a year of caching for hashed assets', async () => {
    const headers = await read(outDir, '_headers');
    assert.match(headers, /Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'/);
    assert.match(headers, /frame-ancestors 'none'/);
    assert.match(headers, /X-Content-Type-Options: nosniff/);
    assert.match(headers, /Strict-Transport-Security: max-age=31536000/);
    assert.match(headers, /Referrer-Policy: strict-origin-when-cross-origin/);
    assert.match(headers, /\/assets\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
    assert.doesNotMatch(headers, /unsafe-inline|unsafe-eval|https?:/, 'the policy allows only our own origin');
  });
});

describe('links', () => {
  it('every internal link, script, stylesheet, font and icon resolves to a built file', async () => {
    const missing = [];
    for (const file of allHtmlFiles) {
      const html = await read(outDir, file);
      for (const m of html.matchAll(/\s(?:href|src)="(\/[^"]*)"/g)) {
        if (!resolveUrlPath(outDir, m[1])) missing.push(`${file} -> ${m[1]}`);
      }
    }
    assert.deepEqual(missing, []);
  });

  it('every in-page anchor points at an element that exists', async () => {
    for (const file of allHtmlFiles) {
      const html = await read(outDir, file);
      // "#id" stays on the page and must exist there; "/#id" goes to the home page and must exist there
      for (const m of html.matchAll(/\shref="#([\w-]+)"/g)) assert.match(html, new RegExp(`\\sid="${m[1]}"`), `${file}: #${m[1]}`);
      for (const m of html.matchAll(/\shref="\/#([\w-]+)"/g)) assert.match(home, new RegExp(`\\sid="${m[1]}"`), `${file}: /#${m[1]} is not on the home page`);
    }
  });
});

describe('accessibility basics', () => {
  it('every page has lang, title, description, viewport, theme colour and canonical', async () => {
    for (const file of allHtmlFiles) {
      const html = await read(outDir, file);
      assert.match(html, /<html lang="en">/, file);
      assert.match(html, /<title>[^<]{5,}<\/title>/, file);
      assert.match(html, /<meta name="description" content="[^"]{10,}">/, file);
      assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">/, file);
      assert.doesNotMatch(html, /user-scalable|maximum-scale/, `${file}: zoom must never be disabled`);
      assert.match(html, /<meta name="theme-color" content="#0c1325">/, file);
      assert.match(html, /<link rel="canonical" href="https:\/\/kleoma\.com\//, file);
      assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${file}: exactly one h1`);
    }
  });

  it('has a skip link and labelled landmarks', () => {
    assert.match(home, /<a href="#main"[^>]*>Skip to content<\/a>/);
    assert.match(home, /<nav [^>]*aria-label="Main"/);
    assert.match(home, /<main id="main"/);
  });

  it('marks every decorative icon as hidden from screen readers', () => {
    assert.ok([...home.matchAll(/<span class="icon[^"]*"/g)].length > 20);
    // icons inside the phone illustration are covered by its aria-hidden wrapper; every other icon carries aria-hidden itself
    assert.match(home, /id="phone-illustration"[^>]*aria-hidden="true"/);
    const outside = removeDivById(home, 'phone-illustration');
    assert.notEqual(outside, home, 'the illustration was found');
    const unhidden = [...outside.matchAll(/<span class="icon[^"]*"([^>]*)>([^<]*)</g)].filter((m) => !/aria-hidden="true"/.test(m[1])).map((m) => m[2]);
    assert.deepEqual(unhidden, [], 'icons a screen reader would read out as text');
  });

  it('player tabs follow the ARIA tabs pattern', () => {
    const tabs = [...home.matchAll(/<button[^>]*role="tab"[^>]*>/g)].map((m) => m[0]);
    assert.equal(tabs.length, 3);
    assert.equal(tabs.filter((t) => /aria-selected="true"/.test(t)).length, 1, 'one tab selected at first');
    for (const t of tabs) {
      const panel = /aria-controls="([^"]+)"/.exec(t)[1];
      assert.match(home, new RegExp(`role="tabpanel" id="${panel}"`), `${panel} exists`);
    }
    assert.equal((home.match(/role="tabpanel"[^>]*\shidden/g) ?? []).length, 2, 'the other two panels start hidden');
    assert.ok(css.includes('[hidden]{display:none!important}'), 'a display utility can never reveal a hidden panel');
  });

  it('the speed slider has a label and the range the app really supports (0.25x to 2x)', () => {
    assert.match(home, /<label for="cadence"/);
    assert.match(home, /<input type="range" class="range" id="cadence" min="25" max="200" step="5" value="85"/);
  });
});

describe('phone and motion behaviour', () => {
  it('gates :hover behind a hover-capable pointer, so a tap never leaves a stuck hover', () => {
    assert.ok(css.includes('@media (hover:hover)'));
    const outside = cssOutsideHoverMedia(css);
    assert.ok(!/:hover[,{]/.test(outside), 'a :hover rule sits outside the (hover:hover) media query');
  });

  it('respects reduced motion and reduced transparency', () => {
    assert.ok(css.includes('prefers-reduced-motion:reduce'));
    assert.ok(css.includes('prefers-reduced-transparency:reduce'));
  });

  it('removes the tap highlight and gives pressables press feedback on :active', () => {
    assert.ok(css.includes('-webkit-tap-highlight-color:transparent'));
    assert.ok(css.includes('.press:active{transform:scale(.97)}'));
  });

  it('keeps clear of the notch and home indicator', () => {
    assert.ok(css.includes('env(safe-area-inset-left'));
    assert.match(home, /env\(safe-area-inset-top\)/);
    assert.match(home, /env\(safe-area-inset-bottom\)/);
  });

  it('uses size-specific tracking: tight for the display sizes, loose for small caps labels', () => {
    assert.ok(/\.text-display\{[^}]*letter-spacing:-\.02em/.test(css), 'display text is tracked tight');
    assert.ok(/\.text-label-sm\{[^}]*letter-spacing:\.08em/.test(css), 'small caps labels are tracked loose');
  });

  it('does not animate the headline on load (the first frame must be complete)', () => {
    assert.doesNotMatch(home, /<h1[^>]*class="[^"]*\b(rise|animate-)/);
  });
});

describe('honest marketing: claims the app cannot back are not on the page', () => {
  it('has none of the unverified numbers or invented names from the first design', () => {
    for (const claim of ['70%', '62%', '48kHz', '48 kHz', '24-bit', 'Alex', 'Sophie', '1.4s', '2.5×', 'Top 100', '4,000-word']) {
      assert.ok(!home.includes(claim), `"${claim}" is a claim the product does not support`);
    }
  });

  it('discloses that the voices are synthetic', () => {
    assert.match(home, /Synthetic voices, clearly labelled/);
    assert.match(home, /synthetic/i);
  });

  it('has no fake QR code', () => {
    assert.doesNotMatch(home, /Instant Mobile Onboarding|M2 2h8v8H2V2z/);
  });
});

describe('store buttons', () => {
  it('say "Coming soon" and are not links until real store URLs are configured', () => {
    assert.match(home, /Coming soon/);
    assert.match(home, /The app is coming soon to iOS and Android/);
    assert.doesNotMatch(home, /href="#"/);
    assert.equal((home.match(/aria-disabled="true"/g) ?? []).length, 2);
  });

  it('become real links when the URLs are set in the config', async () => {
    const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
    config.stores = { ios: 'https://apps.apple.com/app/id1', android: 'https://play.google.com/store/apps/details?id=com.example' };
    const built = await buildTo({ config });
    const html = await read(built.outDir, 'index.html');
    assert.match(html, /<a [^>]*href="https:\/\/apps\.apple\.com\/app\/id1"/);
    assert.match(html, /<a [^>]*href="https:\/\/play\.google\.com\/store\/apps\/details\?id=com\.example"/);
    assert.doesNotMatch(html, /aria-disabled|Coming soon/);
  });
});

describe('search and sharing', () => {
  it('lists the home page in the sitemap and not the 404', async () => {
    const sitemap = await read(outDir, 'sitemap.xml');
    assert.match(sitemap, /<loc>https:\/\/kleoma\.com\/<\/loc>/);
    assert.doesNotMatch(sitemap, /404/);
    assert.match(await read(outDir, 'robots.txt'), /Sitemap: https:\/\/kleoma\.com\/sitemap\.xml/);
  });

  it('keeps the 404 page out of search results', async () => {
    assert.match(await read(outDir, '404.html'), /<meta name="robots" content="noindex">/);
    assert.match(home, /<meta name="robots" content="index,follow">/);
  });
});

describe('template and helpers', () => {
  it('escapes {{x}} and passes {{{x}}} through, with dotted names', () => {
    assert.equal(render('a {{x}} b {{{y}}} c {{z.w}}', { x: '<b>"&', y: '<i>', z: { w: 'ok' } }), 'a &lt;b&gt;&quot;&amp; b <i> c ok');
    assert.equal(render('{{missing}}|{{{missing}}}|{{a.b.c}}', {}), '||');
  });

  it('draws the same waveform every time', () => {
    assert.equal(waveformSvg(), waveformSvg());
    assert.equal((waveformSvg().match(/<rect /g) ?? []).length, 40);
  });
});
