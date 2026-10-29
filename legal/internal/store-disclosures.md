# Store disclosures: Apple "App Privacy" and Google Play "Data safety"

Internal worksheet. Not published. Fill the store forms from this, and keep it in step with `privacy-policy.md` and `ios/lingo/PrivacyInfo.xcprivacy` in the mobile app. Draft from the code as of 2026-10-29; **confirm each row against the real build before submitting**. The store forms are legal declarations; wrong answers can get the app rejected or removed.

## What the app collects (from the code)

| Data | Collected? | Linked to the user? | Used for tracking? | Purpose | Apple category | Google Play category |
|---|---|---|---|---|---|---|
| Email address | Yes (account) | Yes | No | App functionality, account management | Contact Info: Email Address | Personal info: Email address |
| Name | Only if a Google or Facebook login provides it | Yes | No | App functionality | Contact Info: Name | Personal info: Name |
| User ID (Firebase UID) | Yes | Yes | No | App functionality, analytics if enabled | Identifiers: User ID | Personal info: User IDs |
| Language settings, level, daily goal | Yes | Yes | No | App functionality, personalisation | User Content: Other User Content | App activity: Other user-generated content |
| Learning progress and positions | Yes | Yes | No | App functionality, personalisation | Usage Data: Product Interaction | App activity: App interactions |
| Streak / practice days | Yes | Yes | No | App functionality | Usage Data: Product Interaction | App activity: App interactions |
| Purchase history | Only if Premium | Yes | No | App functionality | Purchases: Purchase History | Financial info: Purchase history |
| Advertising identifier (IDFA / AAID) | Only if ads shown, and with consent on iOS | Yes (device) | Yes, if personalised ads are enabled and the user allows tracking | Third-party advertising | Identifiers: Device ID; Usage Data: Advertising Data | Device or other IDs |
| Coarse location | No | | | | | |
| Contacts, photos, microphone, camera | No (microphone permission was removed) | | | | | |
| Crash logs and diagnostics | [VERIFY: only if a crash tool is added] | | | | Diagnostics | App info and performance: Crash logs |
| Messages to support | Yes (by email) | Yes | No | Customer support | Contact / Other User Content | Messages |

## Answers to give

**Apple, App Privacy**
- Data used to track you: Device ID / Advertising Data **only** if personalised ads are enabled. If the app stays non-personalised forever, answer "No" and set `NSPrivacyTracking` to `false` in `PrivacyInfo.xcprivacy`.
- Data linked to you: Email, User ID, Product Interaction, Purchase History (if Premium), User Content.
- Privacy policy URL: `https://kleoma.com/privacy`. Support URL: `https://kleoma.com` (or `mailto` support).
- In-app **account deletion** is required (App Store Review Guideline 5.1.1(v)); it exists in Settings, Data and privacy.
- If third-party login is offered, offer **Sign in with Apple** too (Guideline 4.8), or an equivalent privacy-preserving login. [VERIFY: not implemented today.]

**Google Play, Data safety**
- Data collected: the rows above. Data shared with third parties: advertising ID (AdMob) if ads are shown; nothing else for advertising.
- Encrypted in transit: Yes (HTTPS). Users can request deletion: Yes.
- **Account deletion URL:** `https://kleoma.com/data-deletion`.
- Privacy policy URL: `https://kleoma.com/privacy`.
- Ads: declare that the app contains ads if it does.
- Target age: 16 and older (not designed for children; do not join the Families programme).

## Keep in step with

- `ios/lingo/PrivacyInfo.xcprivacy` and the SDKs' own manifests (RevenueCat, AdMob, Google Sign-In, Facebook SDK).
- `docs/compliance-review.md` in the mobile repository.
- `privacy-policy.md` (the table of data) and `subprocessors.md`.
