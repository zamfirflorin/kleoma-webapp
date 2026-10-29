# Legal reference

The source of truth for everything legal that Kleoma needs: **which documents exist, why, where they are used, and how to change them**. Each public document is its own Markdown file in this folder; the website turns it into a page. Edit them as often as the product changes.

> **These are working drafts written from what the code does. They are not legal advice.** A lawyer must review them before launch. Every fact we could not verify is marked `[VERIFY: ...]`, every business choice `[DECISION: ...]`, and every missing company fact shows as a highlighted to-do. `npm run check:launch` lists all of them and fails until they are gone.

## 1. How this folder works

| File | Public page | Purpose |
|---|---|---|
| `privacy-policy.md` | `/privacy` | What personal data we process, why, who gets it, how long, your rights (GDPR Art. 13) |
| `terms-of-service.md` | `/terms` | The agreement for using the app and website |
| `consent-and-age.md` | `/consent` | Every choice the app asks the user to make and what we record |
| `data-deletion.md` | `/data-deletion` | How to delete an account and data (Google Play and Apple require a public page) |
| `cookie-policy.md` | `/cookies` | The website sets no cookies; what the app stores |
| `subprocessors.md` | `/subprocessors` | Every provider that handles personal data |
| `ai-content-notice.md` | `/ai-content` | Synthetic voices and AI-written content |
| `legal-notice.md` | `/legal-notice` | Provider identity and contact (EU e-commerce rules) |
| `subscription-terms.md` | `/subscription-terms` | Prices, renewal, cancellation, refunds. **Conditional**: only if the app sells Premium |
| `internal/store-disclosures.md` | (not published) | Answers for Apple's App Privacy and Google Play's Data safety forms |
| `internal/regulations-checklist.md` | (not published) | The laws and store rules, and where each is handled |
| `README.md` | (not published) | This file |

The page for a document is `https://kleoma.com/<slug>`; the list is `https://kleoma.com/legal`; the versions are `https://kleoma.com/legal/versions.json`.

### Front matter (the header of every document)

```yaml
---
title: Privacy Policy
slug: privacy            # the address: kleoma.com/privacy (the app links to terms, privacy, data-deletion: do not rename those)
version: 2026-10         # YYYY-MM. Bump when the meaning changes
updated: 2026-10-29      # the day you changed it
status: draft            # draft | published | not-applicable
order: 1                 # position in lists
footer: true             # show a link in the site footer
summary: One sentence for the /legal list and search results.
---
```

- **`draft`**: the page is online with a "Draft" notice and is hidden from search engines.
- **`published`**: the page is online and indexable, once it has no placeholder, `[VERIFY]` or `[DECISION]` left.
- **`not-applicable`**: not built at all (only allowed for conditional documents such as subscription terms).

### Company facts (placeholders)

Documents use `{{company.legalName}}`, `{{company.address}}`, `{{contact.privacyEmail}}`, `{{legal.governingLaw}}` and so on. The values live in **one file**, `../site.config.json`. An empty value is shown on the page as a highlighted to-do and is counted by the launch gate. Fill them in once and every document updates.

### Commands (from the repository root)

```sh
npm run dev            # preview all pages at http://localhost:8787
npm test               # checks the documents, links, versions, privacy of the site
npm run check:launch   # lists everything still open before launch (exit 1 while anything is)
```

## 2. How to change a document (release checklist)

1. Edit the Markdown file. Keep sentences short and in plain language.
2. If the **meaning** changed (new data, new provider, new purpose, new right or duty): bump `version` (for example `2026-10` to `2026-12`), set `updated`, and add a row to the document's **Version history** table. For a typo or clarification, only change `updated`.
3. If you bumped the **Terms** or the **Privacy Policy** version: update `TERMS_VERSION` / `PRIVACY_VERSION` in the mobile app (`constants/consent.ts`) to the same value. The app then asks every user to accept again. `versions.json` always shows the current values.
4. If a **new SDK, data category, provider or country** is involved, update `subprocessors.md`, `internal/store-disclosures.md` and, if needed, the iOS `PrivacyInfo.xcprivacy` and the store forms (section 4).
5. Run `npm test`, open a pull request, review the preview, merge. The site deploys itself.
6. Check the live page, and tell the team what changed.

## 3. What triggers an update

| If this happens | Update |
|---|---|
| A new SDK or tool that collects data (analytics, crash reporting, push, a new ad network) | Privacy Policy, Subprocessors, Consent, store disclosures, `PrivacyInfo.xcprivacy` |
| A new category of data is stored (for example voice recordings, location, contacts) | Privacy Policy, store disclosures, and rethink consent |
| A new provider or a change of provider or region | Subprocessors, Privacy Policy (transfers) |
| Premium, a price change, a trial or a lifetime plan | Subscription terms, Terms section 7, store listings |
| Ads change (new network, new formats) | Privacy Policy (advertising), Consent, store disclosures |
| Push notifications or marketing emails start | Privacy Policy, Consent, store disclosures |
| Progress moves between databases or regions | Privacy Policy (storage, retention), Data deletion, Subprocessors |
| The minimum age changes | Terms, Privacy Policy, Consent, and `MIN_AGE` / `AGE_GATE_VERSION` in the app |
| The company details change (name, address, registration) | `site.config.json` only |
| A new language market or country with its own rules | Ask the lawyer, then Privacy Policy and Legal notice |
| A data breach | Follow GDPR Art. 33 and 34 (authority within 72 hours; users when high risk) and log what happened |

## 4. Where each document is used

| Used by | Needs |
|---|---|
| **The mobile app** | Links to `/terms`, `/privacy` and `/data-deletion` (`constants/consent.ts`, defaults and `EXPO_PUBLIC_*` overrides), the support email, the version numbers. The consent screen, Settings (Data and privacy) and the login screen link to them. |
| **Apple App Store Connect** | Privacy Policy URL, support URL, the App Privacy answers (`internal/store-disclosures.md`), subscription terms and privacy links if Premium exists, an in-app account deletion option. |
| **Google Play Console** | Privacy Policy URL, the Data safety form, the **account deletion URL** (`/data-deletion`), ads declaration. |
| **The website** | All pages, footer links, `versions.json`. |
| **Customer support** | `support@kleoma.com` and `privacy@kleoma.com` must receive mail (checked by `check:launch`). |

## 5. Who does what

| Task | Who |
|---|---|
| Fill company facts in `site.config.json`; make the two mailboxes work | Owner |
| Review every document and resolve the `[VERIFY]` markers | Lawyer, with the owner |
| Decide Premium, ads, analytics, push, marketing emails | Owner |
| Keep documents in line with the code (new SDK, data, provider) | Whoever ships the change (use the table in section 3) |
| Fill the Apple and Google store forms from `internal/store-disclosures.md` | Owner |
| Review all documents at least once a year and before each major release | Owner |

## 6. Open items at the time of writing (2026-10-29)

- Company legal name, form, address, registration, VAT, supervisory authority, governing law and courts.
- `support@kleoma.com` and `privacy@kleoma.com` (Cloudflare Email Routing).
- Which analytics tool, if any, the app uses (the consent screen records an analytics choice).
- Locations and transfer safeguards for Firebase Authentication and Cloud Firestore (the Firestore API was found disabled in the Google project; confirm where profile data really lives).
- The legacy Supabase progress store: delete it and remove it from the policy, or keep it and state its region.
- Backup retention period (Cloud SQL automatic backups are on).
- Whether Facebook Login ships at launch.
- Whether Premium, push notifications or marketing emails are in the launch scope.
- Sign in with Apple: Apple generally requires it when other third-party login is offered; confirm.
- Lawyer review of the EU AI Act wording for synthetic audio, the consumer withdrawal wording and the governing-law clause.
