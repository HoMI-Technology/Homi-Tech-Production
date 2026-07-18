# HōMI — Vercel Production Build

This folder is the complete source of the live deployment.

- Live URL: https://homitechnology.com (alias: homi-platform-homi-tech.vercel.app)
- Vercel project: homi-platform (team: homi-tech, id: prj_LSgxv4XcVDWEQVvvMzmelruM7Xtb)
- Supabase project: giyycykxkzfbowiapxpd (repo migrations 00001–00020 in
  `supabase/migrations/`, applied in numeric order)

## Run locally
npm install
cp .env.example .env.local   # fill in Supabase (and any optional) values
npm run dev        # http://localhost:3000

## Verify
npm run typecheck && npm test && npm run brand-check

## Deploy
npx vercel deploy --prod --yes --token <YOUR_VERCEL_TOKEN>
(No env file is committed — `.gitignore` excludes `.env*`. All vars are set
in Vercel → Project → Settings → Environment Variables: the client-safe
NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY / NEXT_PUBLIC_SITE_URL
plus server-only keys — SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, STRIPE_*,
RESEND_API_KEY, PLAID_*, and the optional integrations listed in `.env.example`.)

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
   it skips itself. Budgets: lighthouserc.dashboard.json (warn-first while a
   baseline accumulates; CLS and accessibility gate immediately).

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
