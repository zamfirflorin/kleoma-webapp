# Regulations and store rules checklist

Internal. Not published. For each rule: what it asks, where we handle it, and its status. **Not legal advice**; confirm each line with a lawyer. Status as of 2026-10-29: `done` = handled in code or text, `partly` = needs a human step, `todo` = not yet.

## Data protection

| Rule | What it asks | Where handled | Status |
|---|---|---|---|
| GDPR Art. 13/14 (information) | Tell people who we are, what we collect, why, legal basis, recipients, transfers, retention, rights | `privacy-policy.md` | partly: company facts and `[VERIFY]`s |
| GDPR Art. 6 and 7 (lawful basis, consent) | A basis for each purpose; consent that is specific, informed, withdrawable and provable | Privacy Policy table; `consent-and-age.md`; consent record in the profile | partly: consent time is the device clock |
| GDPR Art. 15 to 21 (rights) | Access, correction, deletion, restriction, portability, objection | Settings, Data and privacy (export, delete); `data-deletion.md`; privacy email | partly: export lacks progress until SCRUM-187 is done |
| GDPR Art. 28 (processors) | A processing agreement with each provider | `subprocessors.md`; sign each provider's DPA | todo: collect the DPAs |
| GDPR Art. 30 (records) | An internal record of processing | This folder and the store worksheet are the base; a formal register may be required | todo |
| GDPR Chapter V (transfers) | A valid mechanism for data leaving the EEA | `subprocessors.md`, Privacy Policy | partly: confirm per provider |
| GDPR Art. 32 to 34 (security, breach) | Appropriate security; notify the authority within 72 hours | Privacy Policy (security); Cloudflare Access, private Cloud Run, encrypted transport | partly: write an incident procedure |
| GDPR Art. 8 (children) | Digital consent age is 13 to 16 by country | Age confirmation at 16 (`MIN_AGE`) | done (self-declared) |
| GDPR Art. 37 (DPO) | Required only for large-scale monitoring or special data | Privacy Policy says none appointed | verify with a lawyer |
| ePrivacy / cookies | Consent for non-essential cookies and similar technologies | `cookie-policy.md`; the website sets none | done |
| CCPA / CPRA and other US state laws | Notice, access/deletion, no sale, honour opt-outs | Privacy Policy (US section) | partly: verify which states apply |

## Consumer and e-commerce law

| Rule | What it asks | Where handled | Status |
|---|---|---|---|
| E-Commerce Directive Art. 5 | Provider name, address, registration, email | `legal-notice.md` | partly: company facts |
| Consumer Rights Directive (digital content) | Pre-contract information; 14-day withdrawal, with the waiver for immediate supply | `subscription-terms.md`, store checkout | conditional on Premium |
| Digital Content Directive | Conformity of digital content and remedies | Terms section 12 (rights are not excluded) | done |
| Unfair Contract Terms | Terms must be clear and fair | `terms-of-service.md` | needs lawyer review |
| Unfair Commercial Practices (marketing claims) | No misleading claims | The site's claims were reduced to what the app does; test guards them | done |
| Automatic renewal disclosures (EU, US) | Show price, period and how to cancel before purchase | `subscription-terms.md`; paywall copy | conditional on Premium |

## AI and accessibility

| Rule | What it asks | Where handled | Status |
|---|---|---|---|
| EU AI Act Art. 50 (transparency) | Disclose AI interaction; mark synthetic audio; label deepfakes | `ai-content-notice.md`; "synthetic" labels on the site and in the app | partly: lawyer to confirm scope and dates |
| EU Accessibility Act (since June 2025) | Accessible products and services, for in-scope services | Site meets basic WCAG practices (tests); the app was reviewed in the design passes | verify scope for a language-learning app |

## App stores

| Rule | What it asks | Where handled | Status |
|---|---|---|---|
| Apple 5.1.1(i) privacy policy | Public policy link in the app and in the listing | App links (`constants/consent.ts`); App Store Connect | todo: point the app at kleoma.com (SCRUM-187) |
| Apple 5.1.1(v) account deletion | In-app deletion | Settings, Data and privacy | done (progress deletion in SCRUM-187) |
| Apple App Privacy label + Privacy Manifest | Declare data and tracking; SDK manifests | `internal/store-disclosures.md`, `PrivacyInfo.xcprivacy` | partly |
| Apple ATT | Ask before tracking | `services/trackingTransparency.ts` | done |
| Apple 4.8 login services | Offer Sign in with Apple when other third-party login is offered | Not implemented | todo: decide |
| Apple 3.1.2 subscriptions | Show price, term, how to cancel; link terms and privacy in the paywall | `subscription-terms.md` | conditional on Premium |
| Google Play Data safety + account deletion URL | Declarations and a public deletion page | `internal/store-disclosures.md`; `data-deletion.md` | partly |
| Google Play User Data and Ads policies, UMP consent | Consent form in the EEA/UK | `services/adsConsentService.ts` | done |
| AdMob / Google EU User Consent Policy | A certified CMP for ads in the EEA, UK and Switzerland | Google UMP | done |

## Brand and IP (outside this folder)

Trademark filing and domain/social handles are tracked in Jira (SCRUM-10, SCRUM-11).
