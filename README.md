# HōMI

**HōMI** (Decision Readiness Intelligence™) is a production full-stack platform,
built by HOMI TECHNOLOGIES LLC, that helps people know whether they are truly
ready for a major life decision — starting with home buying. Instead of a
generic pre-qualification calculator, HōMI runs a structured assessment across
three pillars — **Financial Reality**, **Emotional Truth**, and **Perfect
Timing** — and returns a single, honest verdict: READY, ALMOST THERE, BUILD
FIRST, or NOT YET. The goal is protection and clarity, never a sales funnel:
"Not yet" is not "no" — it's the map for what to build next.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Database / Auth:** Supabase (Postgres, Row Level Security, Supabase Auth)
- **Styling:** Tailwind CSS v4
- **Validation:** Zod
- **Fonts:** Fraunces, Inter, JetBrains Mono (via Fontsource)
- **Testing:** Vitest
- **Optional integrations:** Anthropic (AI advisor), Stripe (billing), Plaid
  (bank sync), Resend (email) — each degrades gracefully when its env vars
  are absent.

## Quickstart

```bash
npm install
cp .env.example .env.local   # fill in Supabase (and any optional) values
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run `next lint` |
| `npm run typecheck` | `tsc --noEmit` across the project |
| `npm test` | Run the Vitest suite (`vitest run`) |
| `npm run test:acceptance` | Independent acceptance suite (`vitest.acceptance.config.ts`) |
| `npm run test:e2e` | Playwright E2E (needs `npx playwright install chromium`) |
| `npm run brand-check` | Brand canon lint (spelling, colors, banned claims) |
| `npm run architecture:check` | Verify `public/architecture.json` is in sync |

## Architecture & Design

**Human-readable production architecture design document** (system, UI specs, integration plan, tradeoffs, diagrams):  
[`docs/ARCHITECTURE-DESIGN.md`](./docs/ARCHITECTURE-DESIGN.md)

**Machine-readable snapshot** (for agents): `public/architecture.json` (regenerate with `npm run architecture:gen`).

## Architecture overview

```
homi-production/
├── app/                     # Next.js App Router routes (marketing, product, auth)
├── components/              # UI components (brand, layout, assessment, ui)
├── lib/
│   ├── scoring/              # Canonical HōMI-Score engine (engine, weights, shadow, insights)
│   ├── questions/             # 45-question assessment bank (bank.ts)
│   ├── assessment/            # Assessment flow types, storage, derivation
│   ├── tools/                 # Mortgage, debt, Monte Carlo calculators
│   ├── supabase/               # Client/server Supabase helpers
│   └── brand/                  # Brand tokens, verdict metadata, legal copy
├── types/                   # Shared TypeScript types (mirrors supabase/migrations)
├── supabase/
│   ├── migrations/            # Ordered, idempotent SQL migrations (schema, RLS, seed)
│   └── README.md                # How to apply migrations + RLS overview
├── __tests__/                # Vitest suites (scoring engine, etc.)
└── vitest.config.ts          # Test runner config (node env, "@" path alias)
```

## Scoring canon

The HōMI-Score is a deterministic 0–100 weighted composite of three pillars:

- **Financial Reality** — max 35 points
- **Emotional Truth** — max 35 points
- **Perfect Timing** — max 30 points

Verdict thresholds (boundary inclusive on the higher tier):

| Score | Verdict |
|---|---|
| ≥ 80 | READY |
| 65–79 | ALMOST THERE |
| 50–64 | BUILD FIRST |
| < 50 | NOT YET |

Four **hard stops** override the numeric verdict to protect the user,
regardless of score:

1. Debt-to-income ratio > 50%
2. Monthly housing payment > 45% of gross monthly income
3. Emergency fund runway < 1 month
4. Credit score < 620

When any hard stop trips, the verdict is forced to **NOT_YET** and the
specific reasons are surfaced to the UI — the numeric score itself is never
hidden or zeroed out. The full sub-factor point tables are intentionally
**not** reproduced here; `lib/scoring/engine.ts` is the single source of
truth and `lib/scoring/weights.ts` is a C2-restricted trade-secret boundary.

## Deploy notes

- **Hosting:** Vercel (Next.js 15, App Router).
- **Database:** Supabase project, provisioned via the migrations in
  `supabase/migrations/` (numbered `00001`+ series plus timestamped
  `20260802...` series). Against the existing live project, apply **single
  files** as documented in `docs/ops/MIGRATIONS-SSOT.md` — do **not** run
  `supabase db push` over the full history (the remote ledger predates the
  rebuild and a replay would collide). See `supabase/README.md` for the RLS
  policy overview.
- Set all required environment variables in the Vercel project settings
  before the first deploy (see table below). Optional integrations can be
  left blank; the app disables the corresponding feature gracefully.
- CI gate (`.github/workflows/ci.yml`): `brand-check` → `architecture:check`
  → `tsc --noEmit` → `vitest run` → `next build`.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon/publishable key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | No | Enables the AI advisor; falls back gracefully when absent |
| `STRIPE_SECRET_KEY` | No | Enables billing |
| `STRIPE_WEBHOOK_SECRET` | No | Verifies Stripe webhook signatures |
| `STRIPE_PRICE_PLUS` | No | Stripe price ID for the Plus tier |
| `STRIPE_PRICE_PRO` | No | Stripe price ID for the Pro tier |
| `STRIPE_PRICE_FAMILY` | No | Stripe price ID for the Family tier |
| `PLAID_CLIENT_ID` | No | Enables bank sync |
| `PLAID_SECRET` | No | Plaid API secret |
| `PLAID_ENV` | No | Plaid environment (`sandbox`, `development`, `production`) |
| `RESEND_API_KEY` | No | Enables transactional email |
| `SENTRY_DSN` | No | Enables server-side Sentry error capture; SDK stays fully uninitialized when absent |
| `UPSTASH_REDIS_REST_URL` | No | Redis-backed rate limiting shared across serverless instances; in-memory fallback when absent |
| `UPSTASH_REDIS_REST_TOKEN` | No | Upstash REST token (pairs with the URL above) |
| `NEXT_PUBLIC_SITE_URL` | Yes | Canonical site URL used for metadata, sitemaps, and redirects |

---

HōMI is a product of HOMI TECHNOLOGIES LLC. HōMI is not a lender, mortgage
broker, registered investment advisor, credit bureau, real estate agent or
brokerage, financial planner, bank or deposit institution, or product
recommendation engine. HōMI provides educational guidance only and does not
provide financial, legal, tax, mortgage, real estate, or investment advice.
