import { before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { buildLegal, fillPlaceholders, findDecisionMarkers, findVerifyMarkers, parseFrontMatter, renderMarkdown, validateDocument } from '../scripts/legal.mjs';
import { REQUIRED_SLUGS, evaluateLaunch } from '../scripts/check-launch.mjs';
import { buildTo, read, resolveUrlPath, root } from './helpers.mjs';

const config = JSON.parse(await readFile(path.join(root, 'site.config.json'), 'utf8'));
const mdFiles = (await readdir(path.join(root, 'legal'))).filter((f) => f.endsWith('.md') && f !== 'README.md');
const readDoc = async (f) => parseFrontMatter(await readFile(path.join(root, 'legal', f), 'utf8'), f);

/** A throwaway project folder with the given legal documents. */
async function fixture(docs) {
  const dir = await mkdtemp(path.join(tmpdir(), 'kleoma-legal-'));
  await mkdir(path.join(dir, 'legal'));
  for (const [name, text] of Object.entries(docs)) await writeFile(path.join(dir, 'legal', name), text);
  return dir;
}
const doc = (extra = {}, body = 'Body text.') => {
  const d = { title: 'Terms', slug: 'terms', version: '2026-10', updated: '2026-10-29', status: 'published', summary: 'A summary.', order: '1', footer: 'true', ...extra };
  return `---\n${Object.entries(d).map(([k, v]) => `${k}: ${v}`).join('\n')}\n---\n${body}\n`;
};
const filledConfig = { ...config, company: { legalName: 'Kleoma SRL', legalForm: 'SRL', address: 'Str. 1, Bucuresti', country: 'Romania', registrationNumber: 'J40/1/2026', vatId: 'RO1', supervisoryAuthority: 'ANSPDCP' }, legal: { minimumAge: 16, governingLaw: 'Romanian law', courts: 'Bucharest' } };

describe('front matter', () => {
  it('reads the keys and strips quotes', () => {
    const { data, body } = parseFrontMatter('---\ntitle: "A: b"\nslug: x\n---\nHello\n');
    assert.deepEqual(data, { title: 'A: b', slug: 'x' });
    assert.equal(body, 'Hello\n');
  });
  it('rejects a document without front matter or with a garbled line', () => {
    assert.throws(() => parseFrontMatter('No front matter', 'a.md'), /a\.md: missing front matter/);
    assert.throws(() => parseFrontMatter('---\nnot a pair\n---\nx', 'a.md'), /cannot read front matter/);
  });
  it('validates the required keys, slug, version, date and status', () => {
    assert.deepEqual(validateDocument(parseFrontMatter(doc()).data, 'f'), []);
    const bad = validateDocument({ title: 'x', slug: 'Bad Slug', version: '2026-13', updated: '29/10/2026', status: 'final' }, 'f');
    assert.equal(bad.length, 5);
    assert.ok(bad.some((e) => /summary/.test(e)) && bad.some((e) => /slug/.test(e)) && bad.some((e) => /version/.test(e)) && bad.some((e) => /updated/.test(e)) && bad.some((e) => /status/.test(e)));
  });
});

describe('placeholders and markers', () => {
  it('fills known values (escaped) and marks the unknown ones visibly', () => {
    const { text, unresolved } = fillPlaceholders('A {{company.legalName}} B {{company.vatId}} C {{nope.x}}', { company: { legalName: 'A&B <Ltd>', vatId: '' } });
    assert.match(text, /A A&amp;B &lt;Ltd&gt; B/);
    assert.deepEqual(unresolved, ['company.vatId', 'nope.x']);
    assert.match(text, /<mark class="todo" data-todo="company\.vatId">\[vat id\]<\/mark>/);
    assert.match(text, /<mark class="todo" data-todo="nope\.x">\[x\]<\/mark>/);
  });
  it('finds [VERIFY] and [DECISION] markers', () => {
    assert.deepEqual(findVerifyMarkers('a [VERIFY: x] b [VERIFY] c'), ['[VERIFY: x]', '[VERIFY]']);
    assert.deepEqual(findDecisionMarkers('a [DECISION: y] b'), ['[DECISION: y]']);
  });
});

describe('markdown rendering', () => {
  it('puts ids on headings, lists the h2s, marks other sites safely and wraps tables for phones', () => {
    const { html, headings } = renderMarkdown('## First part\n\ntext [kleoma](https://kleoma.com/x) and [google](https://policies.google.com/privacy)\n\n### Sub\n\n| A | B |\n|---|---|\n| 1 | 2 |\n');
    assert.match(html, /<h2 id="first-part">First part<\/h2>/);
    assert.match(html, /<h3 id="sub">Sub<\/h3>/);
    assert.deepEqual(headings, [{ id: 'first-part', text: 'First part' }]);
    assert.match(html, /<a href="https:\/\/kleoma\.com\/x">/);
    assert.match(html, /<a href="https:\/\/policies\.google\.com\/privacy" rel="noopener noreferrer" target="_blank">/);
    assert.match(html, /<div class="table-wrap"><table><thead><tr><th>A<\/th><th>B<\/th><\/tr><\/thead><tbody><tr><td>1<\/td><td>2<\/td><\/tr><\/tbody><\/table><\/div>/);
  });
});

describe('buildLegal', () => {
  it('turns documents into pages, footer links and a versions file', async () => {
    const dir = await fixture({ 'terms.md': doc(), 'privacy.md': doc({ title: 'Privacy', slug: 'privacy', order: '2', version: '2026-09' }) });
    const r = await buildLegal({ root: dir, config: filledConfig });
    assert.deepEqual(r.pages.map((p) => p.urlPath), ['/terms', '/privacy', '/legal']);
    assert.deepEqual(r.links.map((l) => l.href), ['/terms', '/privacy', '/legal']);
    assert.equal(r.versions.terms, '2026-10');
    assert.equal(r.versions.privacy, '2026-09');
    assert.equal(r.versions.documents.terms.url, 'https://kleoma.com/terms');
    assert.equal(r.pages[0].file, 'terms/index.html');
  });

  it('publishes a finished document as indexable, with no draft banner', async () => {
    const dir = await fixture({ 'terms.md': doc({}, 'Provider: {{company.legalName}}.') });
    const [page] = (await buildLegal({ root: dir, config: filledConfig })).pages;
    assert.equal(page.robots, 'index,follow');
    assert.doesNotMatch(page.content, /draft-note/);
    assert.match(page.content, /Provider: Kleoma SRL\./);
  });

  it('shows a draft banner and keeps the page out of search while it is a draft, has placeholders or has open [VERIFY]s', async () => {
    for (const [extra, body] of [[{ status: 'draft' }, 'x'], [{}, '{{company.legalName}}'], [{}, 'x [VERIFY: y]'], [{}, 'x [DECISION: y]']]) {
      const dir = await fixture({ 'terms.md': doc(extra, body) });
      const [page] = (await buildLegal({ root: dir, config: { ...filledConfig, company: body.includes('company') ? {} : filledConfig.company } })).pages;
      assert.equal(page.robots, 'noindex,follow', JSON.stringify(extra) + body);
      assert.match(page.content, /<aside role="note" class="draft-note">/);
    }
  });

  it('does not publish a not-applicable document', async () => {
    const dir = await fixture({ 'terms.md': doc(), 'sub.md': doc({ slug: 'subscription-terms', status: 'not-applicable', order: '9' }) });
    const r = await buildLegal({ root: dir, config: filledConfig });
    assert.ok(!r.pages.some((p) => p.urlPath === '/subscription-terms'));
    assert.ok(!('subscription-terms' in r.versions.documents));
    assert.equal(r.docs.length, 2);
  });

  it('fails clearly on a bad document or a duplicate slug', async () => {
    await assert.rejects(buildLegal({ root: await fixture({ 'a.md': doc({ version: 'soon' }) }), config: filledConfig }), /version "soon"/);
    await assert.rejects(buildLegal({ root: await fixture({ 'a.md': doc(), 'b.md': doc({ title: 'Other' }) }), config: filledConfig }), /slug "terms" is used by two documents/);
  });

  it('returns nothing when there is no legal folder', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'kleoma-nolegal-'));
    const r = await buildLegal({ root: dir, config: filledConfig });
    assert.deepEqual([r.pages, r.links, r.versions], [[], [], null]);
  });
});

describe('launch gate', () => {
  it('is blocked on the current drafts and says why', async () => {
    const legal = await buildLegal({ root, config });
    const r = evaluateLaunch({ legal, config });
    assert.equal(r.ok, false);
    assert.ok(r.problems.some((p) => /still a draft/.test(p)));
    assert.ok(r.problems.some((p) => /unfilled company details/.test(p)));
    assert.ok(r.problems.some((p) => /\[VERIFY\]/.test(p)));
  });

  it('passes when every required document is published, complete and its mailboxes work', async () => {
    const docs = Object.fromEntries(REQUIRED_SLUGS.map((s, i) => [`${s}.md`, doc({ slug: s, title: s, order: String(i + 1) })]));
    docs['subscription-terms.md'] = doc({ slug: 'subscription-terms', status: 'not-applicable', order: '9' });
    const legal = await buildLegal({ root: await fixture(docs), config: filledConfig });
    const ok = evaluateLaunch({ legal, config: filledConfig, mailboxes: { 'support@kleoma.com': true } });
    assert.deepEqual(ok.problems, []);
    assert.equal(ok.ok, true);
    assert.ok(ok.warnings.some((w) => /Coming soon/.test(w)), 'store links are a warning, not a blocker');
  });

  it('is blocked by a missing required document, a not-applicable required document and a dead mailbox', async () => {
    const legal = await buildLegal({ root: await fixture({ 'privacy.md': doc({ slug: 'privacy', status: 'not-applicable' }) }), config: filledConfig });
    const r = evaluateLaunch({ legal, config: filledConfig, mailboxes: { 'support@kleoma.com': false, 'privacy@kleoma.com': null } });
    assert.ok(r.problems.some((p) => /"terms" is missing/.test(p)));
    assert.ok(r.problems.some((p) => /cannot be "not-applicable"/.test(p)));
    assert.ok(r.problems.some((p) => /support@kleoma\.com cannot receive mail/.test(p)));
    assert.ok(r.warnings.some((w) => /privacy@kleoma\.com was not checked/.test(w)));
  });
});

describe('the real documents', () => {
  it('include every document the app and the stores need', async () => {
    const slugs = await Promise.all(mdFiles.map(async (f) => (await readDoc(f)).data.slug));
    for (const slug of REQUIRED_SLUGS) assert.ok(slugs.includes(slug), `legal/ has no document for /${slug}`);
    // the three URLs the mobile app links to (constants/consent.ts)
    for (const slug of ['terms', 'privacy', 'data-deletion']) assert.ok(slugs.includes(slug));
  });

  it('all have valid front matter, unique slugs and a version history row for the current version', async () => {
    const seen = new Set();
    for (const f of mdFiles) {
      const { data, body } = await readDoc(f);
      assert.deepEqual(validateDocument(data, f), []);
      assert.ok(!seen.has(data.slug), `duplicate slug ${data.slug}`);
      seen.add(data.slug);
      assert.match(body, /## Version history/, `${f} needs a "Version history" section`);
      assert.ok(body.split('## Version history')[1].includes(`| ${data.version} |`), `${f} has no history row for version ${data.version}`);
      assert.ok(new Date(data.updated) <= new Date(), `${f}: updated is in the future`);
    }
  });

  it('only use placeholders that exist in site.config.json (a typo would silently stay open)', async () => {
    const known = (key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), { ...config, doc: { version: '', updated: '', title: '' } }) !== undefined;
    for (const f of mdFiles) {
      for (const m of (await readFile(path.join(root, 'legal', f), 'utf8')).matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) assert.ok(known(m[1]), `${f}: {{${m[1]}}} is not in site.config.json`);
    }
  });

  it('state the facts the code and the app really have', async () => {
    const privacy = await readFile(path.join(root, 'legal', 'privacy-policy.md'), 'utf8');
    for (const phrase of ['Firebase Authentication', 'Google AdMob', 'RevenueCat', 'about 30 days', 'Warsaw', 'Settings, Data and privacy', 'right to be forgotten', 'Standard Contractual Clauses', '{{legal.minimumAge}}', 'We do **not** sell your data']) assert.ok(privacy.includes(phrase), `privacy policy should mention "${phrase}"`);
    assert.equal(config.legal.minimumAge, 16, 'must equal MIN_AGE in the mobile app (constants/consent.ts)');
    const consent = await readFile(path.join(root, 'legal', 'consent-and-age.md'), 'utf8');
    for (const phrase of ['Terms of Service', 'age', 'analytics', 'marketing', 'Google', 'Apple', 'Notifications']) assert.ok(consent.includes(phrase), `consent page should mention "${phrase}"`);
  });

  it('list every provider the privacy policy names on the subprocessors page', async () => {
    const privacy = await readFile(path.join(root, 'legal', 'privacy-policy.md'), 'utf8');
    const sub = await readFile(path.join(root, 'legal', 'subprocessors.md'), 'utf8');
    for (const name of ['Google', 'Cloudflare', 'RevenueCat', 'Apple']) {
      assert.ok(privacy.includes(name) && sub.includes(name), `${name} must be named in both`);
    }
    for (const name of ['ElevenLabs', 'Meta', 'Supabase', 'AdMob']) assert.ok(sub.includes(name), `${name} should be on the subprocessors page`);
  });

  it('the data deletion page covers what Google Play and Apple ask for', async () => {
    const del = await readFile(path.join(root, 'legal', 'data-deletion.md'), 'utf8');
    for (const phrase of ['Delete account', 'within **30 days**', 'What we delete', 'What can remain', 'cancel the subscription', 'Export']) assert.ok(del.includes(phrase), `deletion page should say "${phrase}"`);
  });
});

describe('the reference file', () => {
  it('lists every document by file name and address, so it cannot drift', async () => {
    const readme = await readFile(path.join(root, 'legal', 'README.md'), 'utf8');
    for (const f of mdFiles) {
      const { data } = await readDoc(f);
      assert.ok(readme.includes('`' + f + '`'), `legal/README.md does not list ${f}`);
      assert.ok(readme.includes('`/' + data.slug + '`'), `legal/README.md does not show the address /${data.slug}`);
    }
    for (const internal of ['internal/store-disclosures.md', 'internal/regulations-checklist.md']) {
      assert.ok(readme.includes('`' + internal + '`'), `legal/README.md does not list ${internal}`);
      assert.ok((await readFile(path.join(root, 'legal', internal), 'utf8')).length > 500, `${internal} is empty`);
    }
  });

  it('keeps the internal documents out of the website', async () => {
    const { outDir } = await buildTo();
    for (const name of ['store-disclosures', 'regulations-checklist', 'README']) assert.equal(resolveUrlPath(outDir, `/${name}`), null);
    assert.doesNotMatch(await read(outDir, 'sitemap.xml'), /store-disclosures|regulations/);
  });
});

describe('the built site with the legal pages', () => {
  let outDir, report;
  before(async () => { ({ outDir, report } = await buildTo()); });

  it('serves every document at its own address, plus a /legal index and versions.json', async () => {
    for (const slug of REQUIRED_SLUGS) assert.ok(resolveUrlPath(outDir, `/${slug}`), `/${slug} was not built`);
    assert.ok(resolveUrlPath(outDir, '/legal'));
    const versions = JSON.parse(await read(outDir, 'legal/versions.json'));
    assert.match(versions.terms, /^\d{4}-\d{2}$/);
    assert.match(versions.privacy, /^\d{4}-\d{2}$/);
    assert.ok(versions.documents['data-deletion']);
  });

  it('links the main documents from the footer of every page', async () => {
    for (const file of ['index.html', 'privacy/index.html', '404.html']) {
      const html = await read(outDir, file);
      for (const href of ['/privacy', '/terms', '/data-deletion', '/cookies', '/legal-notice', '/legal']) assert.match(html, new RegExp(`<a [^>]*href="${href}"`), `${file} footer lacks ${href}`);
    }
  });

  it('keeps drafts out of search and the sitemap, and shows the draft notice', async () => {
    const privacy = await read(outDir, 'privacy/index.html');
    assert.match(privacy, /<meta name="robots" content="noindex,follow">/);
    assert.match(privacy, /class="draft-note"/);
    assert.match(privacy, /<mark class="todo"/, 'unfilled company details are visible, not hidden');
    assert.match(privacy, /<mark class="todo todo-verify">\[VERIFY: /, 'open [VERIFY] questions are highlighted for the reviewer');
    const sitemap = await read(outDir, 'sitemap.xml');
    assert.doesNotMatch(sitemap, /privacy|terms/);
    assert.match(sitemap, /<loc>https:\/\/kleoma\.com\/<\/loc>/);
  });

  it('shows the version and last-updated date on every document', async () => {
    const html = await read(outDir, 'terms/index.html');
    assert.match(html, /Version <span class="tabular-nums">2026-10<\/span>/);
    assert.match(html, /<time datetime="2026-10-29">29 October 2026<\/time>/);
  });

  it('has one h1 per document and a table of contents on the long ones', async () => {
    for (const p of report.pages.filter((x) => !['/', '/404'].includes(x.urlPath))) {
      assert.equal(((await read(outDir, p.file)).match(/<h1[\s>]/g) ?? []).length, 1, p.urlPath);
    }
    assert.match(await read(outDir, 'privacy/index.html'), /<nav aria-label="On this page" class="toc">/);
  });
});
