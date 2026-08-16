# HōMI — Vercel Production Build

This repo (GitHub: `HoMI-Technology/Homi-Tech-Production`, branch `main`) is the
source of the live deployment.

- Live URL: https://homitechnology.com (alias: homi-platform-homi-tech.vercel.app)
- Vercel project: homi-platform (team: homi-tech, id: prj_LSgxv4XcVDWEQVvvMzmelruM7Xtb)
- Supabase project: giyycykxkzfbowiapxpd. Migrations in `supabase/migrations/`
  are the numbered **00001–00041** series (incl. `00020a` and two `00024_*`
  files) plus the timestamped **20260802000001–20260802000003** series.
  Apply state and single-file apply procedure: `docs/ops/MIGRATIONS-SSOT.md`
  and `docs/ops/MIGRATION-DRIFT-2026-07-28.md`; history repair (done):
  `docs/MIGRATION-REPAIR.md`.

## Run locally

npm install
cp .env.example .env.local # fill in Supabase (and any optional) values
npm run dev # http://localhost:3000

## Verify

npm run typecheck && npm test && npm run brand-check

## Deploy

npx vercel deploy --prod --yes --token <YOUR*VERCEL_TOKEN>
(No env file is committed — `.gitignore` excludes `.env*`. All vars are set
in Vercel → Project → Settings → Environment Variables: the client-safe
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SITE_URL
plus server-only keys — SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, STRIPE*_,
RESEND*API_KEY, PLAID*_, and the optional integrations listed in `.env.example`.)

## Performance measurement (one-time setup)

Two switches turn on the measurement shipped in the perf/measurement branch:

1. **Field Core Web Vitals** — Vercel dashboard → homi-platform → Speed
   Insights → Enable. The `<SpeedInsights />` component is already wired in
   `app/layout.tsx` (Vercel deployments only) and starts reporting LCP/CLS/INP
   from real users as soon as the toggle is on. Watch the homepage LCP
   specifically: the 8s cinematic hero intentionally defers the headline, and
   field data should drive whether that tradeoff stays.

2. **Authenticated dashboard in Lighthouse CI** — create a dedicated
   low-value test account (Supabase → Authentication → Add user, e.g.
   lighthouse-ci@homitechnology.com; no MFA, no real data), then add two
   GitHub repo secrets: `LHCI_TEST_EMAIL` and `LHCI_TEST_PASSWORD`
   (Settings → Secrets and variables → Actions). The lighthouse workflow's
   dashboard step activates automatically once the secrets exist; until then
   it is **NOT CONFIGURED** (the step is skipped — that is not a PASS).
   Use a dedicated DEV/test identity, never a real customer or prod admin.
   Budgets: lighthouserc.dashboard.json (warn-first while a baseline
   accumulates; CLS and accessibility gate immediately).

## Content Security Policy

`next.config.ts` sends an enforced `Content-Security-Policy` on production
builds (Vercel preview + prod, and local `next start`) and the same policy
as `Content-Security-Policy-Report-Only` everywhere, so violations stay
visible in devtools without blocking. `next dev` sends report-only only —
webpack HMR / Fast Refresh need eval + websocket freedom an enforced policy
blocks.

Adding a browser-facing third-party integration (script, iframe, API, font)?
Add its origin to the matching directive in `next.config.ts` — the comment
block above `contentSecurityPolicy` lists every current origin with
file:line evidence — then verify on the preview deploy with devtools open
(blocked requests show as CSP errors). Server-side-only calls (Stripe,
Anthropic, Resend APIs) never need CSP entries. Dropping `'unsafe-inline'`
from `script-src` requires nonce middleware and is a planned follow-up.

## Launch preflight (human — not agent-runnable)

Do these **before** charging real cards. Code on `main` does not substitute.

1. **DB backup** before any migration work. (Phantom-history repair is done —
   see `docs/MIGRATION-REPAIR.md`; never hand-DELETE from the ledger.)
2. Confirm migration apply state against `docs/ops/MIGRATION-DRIFT-2026-07-28.md`
   / `docs/ops/MIGRATIONS-SSOT.md`; apply any newly-added migration as a
   **single file** (no full-history `db push`). Note `00034` must NOT be
   applied (superseded — see GO-LIVE-CHECKLIST §2).
3. Vercel env on **Preview + Production**: `SUPABASE_SERVICE_ROLE_KEY`,
   `STRIPE_*`, `ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `UPSTASH_*`,
   `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`, `CRON_SECRET`, PostHog keys.
4. Stripe **test** products with `lookup_key`s (`npm run stripe-setup` with
   `sk_test_…`); register webhook → `/api/webhooks/stripe`; prove
   checkout → tier, replay, downgrade on a test clock. Live keys last.
5. Supabase Auth: Site URL + redirect allowlist, HaveIBeenPwned, custom
   SMTP (Resend). Password-reset round-trip on the prod domain.
6. Vercel **Pro**; GitHub: protect `main` (require `verify` + review).
7. Smoke: `/api/healthcheck` 200 + commit SHA; share create/revoke;
   free-tier entitlement gate; one Sentry error with release SHA.
8. Optional E2E: set GitHub `E2E_*` secrets, then `npm run test:e2e`
   (live specs skip cleanly until secrets exist).
