// Launch gate: node scripts/check-launch.mjs [--offline]
// Fails (exit 1) while anything legal is unfinished. Run it before submitting the app to a store and before
// switching the legal pages from draft to published. CI does not run it on every merge (drafts may be deployed).
import { readFile } from 'node:fs/promises';
import { resolveMx } from 'node:dns/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { defaultRoot } from './build.mjs';
import { buildLegal } from './legal.mjs';

/** Pages the app and the stores point at; each must exist and be published (or, if conditional, not applicable). */
export const REQUIRED_SLUGS = ['privacy', 'terms', 'data-deletion', 'consent', 'cookies', 'subprocessors', 'ai-content', 'legal-notice'];
export const CONDITIONAL_SLUGS = ['subscription-terms'];

/**
 * Pure: takes what buildLegal returned (and optional mailbox results) and lists what is still open.
 * `mailboxes` maps an email address to true (receives mail), false (no mail server) or null (not checked).
 */
export function evaluateLaunch({ legal, config, mailboxes = {} }) {
  const problems = [];
  const warnings = [];
  const bySlug = Object.fromEntries(legal.docs.map((d) => [d.slug, d]));

  for (const slug of REQUIRED_SLUGS) if (!bySlug[slug]) problems.push(`Required document "${slug}" is missing from legal/`);
  for (const slug of CONDITIONAL_SLUGS) if (!bySlug[slug]) warnings.push(`Conditional document "${slug}" is missing from legal/`);

  for (const d of legal.docs) {
    const required = REQUIRED_SLUGS.includes(d.slug);
    if (d.status === 'draft') problems.push(`${d.file} is still a draft (set status: published when it is final)`);
    if (d.status === 'not-applicable' && required) problems.push(`${d.file} is required and cannot be "not-applicable"`);
    if (d.status === 'not-applicable') continue;
    if (d.unresolved.length) problems.push(`${d.file} has unfilled company details: ${d.unresolved.join(', ')} (edit site.config.json)`);
    if (d.verify.length) problems.push(`${d.file} has ${d.verify.length} statement(s) marked [VERIFY] to confirm`);
    if (d.decisions.length) problems.push(`${d.file} has ${d.decisions.length} [DECISION] still open`);
  }

  for (const [email, ok] of Object.entries(mailboxes)) {
    if (ok === false) problems.push(`${email} cannot receive mail: no mail server for its domain (set up Cloudflare Email Routing)`);
    if (ok === null) warnings.push(`${email} was not checked (offline); make sure it receives mail`);
  }

  if (!config.stores?.ios && !config.stores?.android) warnings.push('No app store link is set in site.config.json (stores): the buttons still say "Coming soon"');
  return { ok: problems.length === 0, problems, warnings };
}

async function mailboxStatus(config, offline) {
  const emails = [...new Set(Object.values(config.contact ?? {}).filter((v) => typeof v === 'string' && v.includes('@')))];
  const out = {};
  for (const email of emails) {
    if (offline) { out[email] = null; continue; }
    try { out[email] = (await resolveMx(email.split('@')[1])).length > 0; } catch { out[email] = false; }
  }
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = JSON.parse(await readFile(path.join(defaultRoot, 'site.config.json'), 'utf8'));
  const legal = await buildLegal({ root: defaultRoot, config });
  const result = evaluateLaunch({ legal, config, mailboxes: await mailboxStatus(config, process.argv.includes('--offline')) });
  for (const w of result.warnings) console.log(`warning  ${w}`);
  for (const p of result.problems) console.log(`blocked  ${p}`);
  console.log(result.ok ? '\nReady: the legal documents are complete.' : `\nNot ready: ${result.problems.length} thing(s) to finish before launch.`);
  process.exit(result.ok ? 0 : 1);
}
