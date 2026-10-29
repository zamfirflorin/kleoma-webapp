# kleoma-webapp

The public website of Kleoma: **https://kleoma.com**. A landing page, and (story SCRUM-186) the legal pages the app links to.

A static site on Cloudflare. No framework, no cookies, no analytics, no third-party requests.

## Everyday commands

```sh
npm ci            # once
npm run dev       # builds and serves http://localhost:8787 (clean URLs, rebuilds on every change)
npm test          # build + checks: privacy, security headers, links, accessibility, claims, phone behaviour
npm run build     # writes dist/
npm run deploy    # build + wrangler deploy (normally CI does this, see below)
```

## Where things are

| Path | What |
|---|---|
| `site.config.json` | Site name/URL, app store links, support email. **Edit this when the app goes live** (`stores.ios`, `stores.android`). |
| `src/pages/index.html` | The landing page content. |
| `src/layout.html`, `header.html`, `footer.html` | Shared page shell. |
| `src/styles/input.css`, `tailwind.config.cjs` | Styles. Design tokens come from the Stitch design. |
| `src/assets/site.js` | Player tabs, speed slider, mobile menu (about 70 lines, no dependencies). |
| `src/assets/fonts/` | Self-hosted Inter and a subset of Material Symbols (see `LICENSES.md` there to add an icon). |
| `src/public/` | Copied as is: `favicon.svg`, `_headers` (security headers, caching). |
| `scripts/build.mjs` | The build. `scripts/dev.mjs` is the local preview server. |
| `test/` | `node --test`. |
| `design/stitch_google.html` | The original Stitch mock, kept for reference only. |

## How it is deployed

`wrangler.jsonc` deploys `dist/` as a Cloudflare Worker with static assets (static file requests are free and unlimited; no script runs). Custom domains: `kleoma.com` and `www.kleoma.com`. Every page carries a canonical link to `https://kleoma.com/...`.

**CI** (`.github/workflows/ci.yml`): every pull request is built and tested; a merge to `main` is deployed and smoke-tested. It needs two repository secrets (Settings, Secrets and variables, Actions):

| Secret | Value |
|---|---|
| `CLOUDFLARE_ACCOUNT_ID` | `7f883a123499f8c9e2a062fd110505ce` |
| `CLOUDFLARE_API_TOKEN` | A token with Account > Workers Scripts: Edit, Zone > Workers Routes: Edit and Zone > DNS: Edit for the `kleoma.com` zone. Prefer a **new token only for this repository** over the infrastructure one. |

Manual deploy from a laptop: `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...; npm run deploy`.

## Design

Built from the Stitch design with the apple-design, emil-design-eng and mobile-native guidance:

- Type: size-specific tracking (tight for large text, loose for small caps labels), balanced headings.
- Motion: the headline is never animated; press feedback on `:active` (140 ms, strong ease-out), nothing animates from nothing; reduced motion and reduced transparency are respected; the waveform is the only looping animation and stops under reduced motion.
- Phone: `viewport-fit=cover` with safe-area padding, no tap highlight, hover styles only where a pointer can hover, `dvh` heights, zoom never disabled, the menu is a `<details>` (works without JavaScript).
- Accessibility: skip link, ARIA tabs with arrow keys, labelled slider, decorative icons hidden from screen readers, one `h1` per page.
- Privacy and security: fonts and icons are self-hosted, a strict Content-Security-Policy allows only our own origin, and tests fail on any third-party URL, inline script, inline style, or cookie code.

## Marketing claims

The first design contained statements the product cannot back; they were changed, and a test (`honest marketing`) fails if they come back. Anything new that states a number or a capability must be true in the app first.

| In the Stitch mock | On the site |
|---|---|
| "Mastering the Top 50 irregular verbs unlocks over 70% of spoken conversation", "Covers 62% of spoken verb usage" | Removed (no source). |
| Speed "0.5x to 2.5x" | "0.25x to 2x", the range the app really has. |
| "24-bit / 48 kHz neural", "Echo latency 1.4 s" | Removed (the audio is 44.1 kHz; gaps are a user setting). |
| Voices named "Alex" and "Sophie" | "Voice 1" / "Voice 2", labelled synthetic. |
| Bedtime presets 10 / 20 / 45 min | "A gentle 20-minute fade" (what the app does). |
| "Top 100 nouns" | "Essential words" (not published yet). |
| A QR code graphic | Removed (it was decorative and would not scan). |

Still design intent, to confirm they match the product: "a habit that never punishes a missed day" and "no broken streaks" (the flame never resets).

## Before launch

- Set `stores.ios` / `stores.android` in `site.config.json` when the apps are live (use the official App Store and Google Play badge artwork then; today the buttons say "Coming soon").
- Make the support mailbox work: Cloudflare dashboard, Email, Email Routing, enable it for `kleoma.com`, add the address `support@kleoma.com` and a destination inbox. The site and (later) the legal pages publish this address.
- Optional: a redirect `www.kleoma.com` to `kleoma.com` (Cloudflare Rules, Redirect Rules). Both names serve the site today.
