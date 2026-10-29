// Legal documents: Markdown in legal/*.md -> pages on the site. Called by build.mjs.
//
// Each document starts with front matter:
//   ---
//   title: Privacy Policy
//   slug: privacy              (the page is https://kleoma.com/privacy)
//   version: 2026-10           (YYYY-MM; bump it when the meaning changes, the app re-asks consent)
//   updated: 2026-10-29
//   status: draft              (draft | published | not-applicable)
//   summary: One sentence for the legal index.
//   order: 1                   (position in lists)
//   footer: true               (link it from the site footer)
//   ---
// {{company.legalName}}-style placeholders are replaced from site.config.json; an empty value stays visible
// as a highlighted to-do and is counted by the launch gate (npm run check:launch).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { Marked } from 'marked';

import { escapeHtml } from './build.mjs';

export const STATUSES = ['draft', 'published', 'not-applicable'];
const REQUIRED = ['title', 'slug', 'version', 'updated', 'status', 'summary'];

/** Splits "---\nkey: value\n---\nbody" into { data, body }. Values are plain text (quotes are stripped). */
export function parseFrontMatter(text, file = 'document') {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(text);
  if (!m) throw new Error(`${file}: missing front matter (--- ... ---)`);
  const data = {};
  for (const line of m[1].split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = /^([A-Za-z][\w-]*):\s*(.*)$/.exec(line);
    if (!kv) throw new Error(`${file}: cannot read front matter line "${line}"`);
    data[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim();
  }
  return { data, body: m[2] };
}

export function validateDocument(data, file) {
  const errors = [];
  for (const key of REQUIRED) if (!data[key]) errors.push(`${file}: front matter "${key}" is required`);
  if (data.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) errors.push(`${file}: slug "${data.slug}" must be lowercase words joined by dashes`);
  if (data.version && !/^\d{4}-(0[1-9]|1[0-2])$/.test(data.version)) errors.push(`${file}: version "${data.version}" must look like 2026-10`);
  if (data.updated && !/^\d{4}-\d{2}-\d{2}$/.test(data.updated)) errors.push(`${file}: updated "${data.updated}" must look like 2026-10-29`);
  if (data.status && !STATUSES.includes(data.status)) errors.push(`${file}: status "${data.status}" must be one of ${STATUSES.join(', ')}`);
  return errors;
}

const lookup = (vars, key) => key.split('.').reduce((o, k) => (o == null ? o : o[k]), vars);
const humanize = (key) => key.split('.').pop().replace(/([A-Z])/g, ' $1').toLowerCase();

/**
 * Replaces {{a.b}} in Markdown. Missing or empty values become a visible <mark> and are returned in `unresolved`.
 */
export function fillPlaceholders(markdown, vars) {
  const unresolved = [];
  const text = markdown.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const value = lookup(vars, key);
    if (value !== undefined && value !== null && String(value).trim() !== '') return escapeHtml(value);
    unresolved.push(key);
    return `<mark class="todo" data-todo="${escapeHtml(key)}">[${escapeHtml(humanize(key))}]</mark>`;
  });
  return { text, unresolved };
}

/** [VERIFY: ...] markers are facts a human still has to confirm before the document is published. */
export function findVerifyMarkers(markdown) {
  return [...markdown.matchAll(/\[VERIFY[^\]]*\]/g)].map((m) => m[0]);
}

/** [DECISION: ...] markers are product or business choices the owner still has to make. */
export function findDecisionMarkers(markdown) {
  return [...markdown.matchAll(/\[DECISION[^\]]*\]/g)].map((m) => m[0]);
}

const slugify = (s) => s.toLowerCase().replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '');

/** Markdown to HTML with ids on headings. Returns the HTML and the h2 list for the table of contents. */
export function renderMarkdown(markdown) {
  const headings = [];
  const marked = new Marked({ gfm: true, breaks: false });
  marked.use({
    renderer: {
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        const id = slugify(html);
        if (depth === 2) headings.push({ id, text: html.replace(/<[^>]+>/g, '') });
        return `<h${depth} id="${id}">${html}</h${depth}>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href) && !href.startsWith('https://kleoma.com');
        return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ''}${external ? ' rel="noopener noreferrer" target="_blank"' : ''}>${text}</a>`;
      },
      table({ header, rows }) {
        const cell = (c, tag) => `<${tag}${c.align ? ` class="text-${c.align}"` : ''}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        const head = `<thead><tr>${header.map((c) => cell(c, 'th')).join('')}</tr></thead>`;
        const body = `<tbody>${rows.map((r) => `<tr>${r.map((c) => cell(c, 'td')).join('')}</tr>`).join('')}</tbody>`;
        return `<div class="table-wrap"><table>${head}${body}</table></div>\n`;
      },
    },
  });
  return { html: marked.parse(markdown), headings };
}

const formatDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function documentPage(doc, html, headings, notices) {
  const toc = headings.length > 3
    ? `<nav aria-label="On this page" class="toc"><h2>On this page</h2><ol>${headings.map((h) => `<li><a href="#${h.id}">${escapeHtml(h.text)}</a></li>`).join('')}</ol></nav>`
    : '';
  const banner = notices.length
    ? `<aside role="note" class="draft-note"><strong>Draft.</strong> ${notices.map(escapeHtml).join(' ')}</aside>`
    : '';
  return `<div class="mx-auto max-w-3xl px-6 py-16 lg:py-20">
  <p class="mb-3 text-label-sm font-semibold uppercase text-primary"><a class="hover:text-on-surface" href="/legal">Legal</a></p>
  <h1 class="mb-4 text-display font-semibold text-on-surface">${escapeHtml(doc.title)}</h1>
  <p class="mb-8 text-label-md text-on-surface-variant">Version <span class="tabular-nums">${escapeHtml(doc.version)}</span> &middot; last updated <time datetime="${escapeHtml(doc.updated)}">${formatDate(doc.updated)}</time></p>
  ${banner}
  ${toc}
  <article class="legal">
${html}
  </article>
</div>`;
}

function indexPage(docs) {
  const rows = docs.map((d) => `<li class="flex flex-col gap-1 rounded-2xl bg-surface-container-low p-5">
      <a class="text-headline-sm font-semibold text-on-surface underline decoration-outline-variant underline-offset-4 hover:text-primary" href="/${d.slug}">${escapeHtml(d.title)}</a>
      <span class="text-body-sm text-on-surface-variant">${escapeHtml(d.summary)}</span>
      <span class="text-label-sm tabular-nums text-outline">Version ${escapeHtml(d.version)} &middot; updated ${escapeHtml(d.updated)}${d.status === 'draft' ? ' &middot; draft' : ''}</span>
    </li>`).join('\n    ');
  return `<div class="mx-auto max-w-3xl px-6 py-16 lg:py-20">
  <h1 class="mb-4 text-display font-semibold text-on-surface">Legal</h1>
  <p class="mb-10 text-body-lg text-on-surface-variant">The documents that govern the Kleoma app and this website. Each one shows its version and the date it last changed.</p>
  <ul class="flex flex-col gap-4">
    ${rows}
  </ul>
</div>`;
}

/**
 * Reads legal/*.md and returns what build.mjs needs: pages, footer links, versions.json and a report of
 * what is still open (placeholders, [VERIFY] markers, documents not yet published).
 */
export async function buildLegal({ root, config }) {
  const dir = path.join(root, 'legal');
  const result = { pages: [], links: [], versions: null, placeholders: [], verify: [], decisions: [], docs: [] };
  if (!existsSync(dir)) return result;

  const vars = { company: config.company ?? {}, contact: config.contact ?? {}, legal: config.legal ?? {}, site: config.site ?? {} };
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md').sort();
  const errors = [];
  const docs = [];
  for (const file of files) {
    const { data, body } = parseFrontMatter(await readFile(path.join(dir, file), 'utf8'), `legal/${file}`);
    errors.push(...validateDocument(data, `legal/${file}`));
    docs.push({ file, data, body });
  }
  const slugs = docs.map((d) => d.data.slug);
  for (const dup of slugs.filter((s, i) => slugs.indexOf(s) !== i)) errors.push(`legal: slug "${dup}" is used by two documents`);
  if (errors.length) throw new Error(errors.join('\n'));

  docs.sort((a, b) => Number(a.data.order ?? 99) - Number(b.data.order ?? 99) || a.data.title.localeCompare(b.data.title));

  for (const { file, data, body } of docs) {
    const doc = { ...data, file };
    const filled = fillPlaceholders(body, { ...vars, doc: data });
    const unresolved = filled.unresolved;
    // open questions stand out on the page too, so a reviewer cannot miss them
    const text = filled.text.replace(/\[(?:VERIFY|DECISION)[^\]]*\]/g, (m) => `<mark class="todo todo-verify">${escapeHtml(m)}</mark>`);
    const verify = findVerifyMarkers(body);
    const decisions = findDecisionMarkers(body);
    for (const key of unresolved) result.placeholders.push({ doc: file, key });
    for (const marker of verify) result.verify.push({ doc: file, marker });
    for (const marker of decisions) result.decisions.push({ doc: file, marker });
    result.docs.push({ ...doc, unresolved: [...new Set(unresolved)], verify, decisions });

    if (data.status === 'not-applicable') continue;     // kept in the repo, not published

    const notices = [];
    if (data.status === 'draft') notices.push('This document is being finalised and is not yet in force.');
    if (unresolved.length) notices.push('Company details are still to be filled in.');
    if (verify.length || decisions.length) notices.push('Some statements are still being verified.');
    const { html, headings } = renderMarkdown(text);
    const ready = !notices.length;
    result.pages.push({
      file: `${data.slug}/index.html`, urlPath: `/${data.slug}`,
      title: `${data.title} | Kleoma`, description: data.summary,
      robots: ready ? 'index,follow' : 'noindex,follow',
      content: documentPage(doc, html, headings, notices),
    });
    if (data.footer === 'true') result.links.push({ href: `/${data.slug}`, label: data.title });
  }

  const listed = result.docs.filter((d) => d.status !== 'not-applicable');
  result.links.push({ href: '/legal', label: 'All legal documents' });
  result.pages.push({
    file: 'legal/index.html', urlPath: '/legal', title: 'Legal | Kleoma',
    description: 'Privacy policy, terms of service and the other legal documents for the Kleoma app and website.',
    robots: listed.every((d) => d.status === 'published') ? 'index,follow' : 'noindex,follow',
    content: indexPage(listed),
  });

  const documents = Object.fromEntries(listed.map((d) => [d.slug, { version: d.version, updated: d.updated, status: d.status, url: `${config.site.url.replace(/\/$/, '')}/${d.slug}` }]));
  result.versions = {
    _comment: 'The app compares these with TERMS_VERSION and PRIVACY_VERSION (constants/consent.ts). A different version means users are asked to accept again.',
    terms: documents.terms?.version ?? null,
    privacy: documents.privacy?.version ?? null,
    documents,
  };
  return result;
}
