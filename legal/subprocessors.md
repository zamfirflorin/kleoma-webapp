---
title: Service providers and subprocessors
slug: subprocessors
version: 2026-10
updated: 2026-10-29
status: draft
order: 6
footer: false
summary: The companies that process personal data for Kleoma: what they do, which data they see and where.
---

Kleoma uses these companies to run the app and website. They process personal data only on our instructions and under data processing terms, except where they are independent controllers for their own purposes (marked below). Our [Privacy Policy](/privacy) explains how we use your data.

| Provider | What it does for us | Data involved | Location | Transfer safeguard |
|---|---|---|---|---|
| **Google Ireland Ltd / Google LLC**: Firebase Authentication | Sign-in with email, Google or Facebook | Email, sign-in method, user ID | [VERIFY: Firebase Authentication location] | [VERIFY: SCCs / EU-US Data Privacy Framework] |
| **Google**: Cloud Firestore | Stores your profile, settings and daily-practice data | Profile, settings, consent record, flame data | [VERIFY: Firestore location; confirm the service is enabled for the project] | [VERIFY] |
| **Google Cloud** (Cloud Run, Cloud SQL, Cloud Storage, Secret Manager, Logging) | Runs our API, stores your learning progress, serves lesson content and audio, keeps logs | Learning progress, user ID, request logs (about 30 days). Audio and lesson files contain no personal data. | Warsaw, Poland (europe-central2) | Data stays in the EU |
| **Google**: AdMob and the User Messaging Platform | Shows ads and asks for ad consent (independent controller for ad personalisation) | Advertising identifier, IP address, device data, ad interactions | Global | Google's own safeguards |
| **Cloudflare, Inc.** | Delivers the website and API worldwide, protects against attacks, rate limits, DNS | IP address and request details | Global edge network | [VERIFY: Cloudflare DPA, SCCs / Data Privacy Framework] |
| **RevenueCat, Inc.** | Manages subscriptions and purchase entitlements | App user ID, purchase and subscription status | United States | [VERIFY: RevenueCat DPA, SCCs / Data Privacy Framework] |
| **Apple Inc.** | App Store distribution and payments; the tracking prompt on iPhone | Purchase data handled by Apple (independent controller) | Global | Apple's own safeguards |
| **Google Play** | Play Store distribution and payments | Purchase data handled by Google (independent controller) | Global | Google's own safeguards |
| **Meta Platforms Ireland Ltd**: Facebook Login | Sign-in with Facebook, if you choose it (independent controller for the data it collects) | Name and email shared by Facebook; device data collected by Meta's SDK | EU / United States | Meta's own safeguards. [VERIFY: remove this row if Facebook Login does not ship at launch.] |
| **Supabase, Inc.** (legacy) | Previously stored learning progress; being retired and replaced by our own database | Learning progress | [VERIFY: region] | [VERIFY]. [VERIFY: remove this row when the migration is finished and the data is deleted.] |

## Providers that never see your personal data

These help us make the content, and no user data is sent to them: **Google Cloud Text-to-Speech** and **ElevenLabs** (they turn our lesson text into audio before it reaches you), and the AI models we use to help write and check lessons. See the [AI content notice](/ai-content).

## Changes to this list

When we add or replace a provider that handles personal data, we update this page and its version. Where the law requires it, we also tell you in the app before the change starts. You can see the version at the top of the page.

## Contact

Questions about a provider: {{contact.privacyEmail}}

## Version history

| Version | Date | What changed |
|---|---|---|
| 2026-10 | 2026-10-29 | First version (draft). |
