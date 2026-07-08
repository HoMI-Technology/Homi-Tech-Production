# HōMI — Master Build Brief (for an autonomous coding agent)

You are a staff-level full-stack engineer finishing and hardening a production Next.js app to a "billion-dollar company" bar. Read this entire file and `AUDIT-2026-07-08.md` before writing any code. The audit is the source of truth for *what* is wrong; this brief is *how* to execute.

---

## 0. Context

- **Product:** HōMI — "Decision Readiness Intelligence." Tells people *if* they're ready for a big decision (starting with homebuying), not *how*. Scores readiness across three pillars and returns a verdict + a build-first path.
- **Stack:** Next.js 15 (App Router) · React 19 · TypeScript (strict) · Tailwind v4 · Supabase (`@supabase/ssr`) · Stripe · deployed on Vercel.
- **Repo:** `github.com/HoMI-Technology/Homi-Tech-Production-` (branch `main`). Live at `homitechnology.com`.
- **Baseline (verified 2026-07-08):** `tsc --noEmit` clean; `vitest run` 84/84 pass; app deploys. Do not regress this.
- **Company:** HOMI TECHNOLOGIES LLC.

---

## 1. NON-NEGOTIABLE GUARDRAILS (violating any of these = stop and fix)

1. **Scoring canon is frozen.** Pillars weight **35% Financial Reality / 35% Emotional Truth / 30% Perfect Timing**. Verdict thresholds are **boundary-inclusive**: READY ≥ 80, ALMOST_THERE 65–79, BUILD_FIRST 50–64, NOT_YET 0–49. There are **4 hard stops**. Never change these numbers. If any UI shows a score/verdict pair that violates them, that is a bug (e.g. the landing card showing 82 = "ALMOST THERE" must become 76/78, or the verdict must read READY).
2. **Scoring stays server-authoritative.** The score is always recomputed server-side (`lib/scoring/engine.ts` via `/api/assessments`). Never trust a client-sent score. Never move scoring to the client.
3. **Brand canon.** Spelling is exactly **HōMI** (capital H, ō = U+014D, capital MI) in all user-visible text. Colors only: cyan `#22d3ee`, emerald `#34d399`, yellow `#facc15`, amber `#fab633`, crimson `#f24822`, navy `#0a1628`. Dark navy surfaces only — never light backgrounds. No banned stale claims ("50/30/20", "73%", "70%").
4. **Security posture only strengthens.** RLS stays enabled + FORCEd on every table. `SECURITY DEFINER` functions keep pinned `search_path`. Never expose the service-role key to the client or `NEXT_PUBLIC_`.
5. **Never commit secrets.** `.gitignore` already excludes `.env*`. Keys live in Vercel/Supabase env settings, never in the repo.
6. **Verify before every commit.** Run, in the repo, and all must pass:
   ```
   npm install --no-audit --no-fund
   npx tsc --noEmit
   npx vitest run
   npx next build         # requires .env.local with NEXT_PUBLIC_SUPABASE_URL/ANON_KEY/SITE_URL
   ```
   If `next build` OOMs locally, rely on the Vercel preview build for that branch instead — but tsc + vitest must pass locally regardless.
7. **One batch = one branch = one preview.** Never commit straight to `main`. Branch naming: `tier0/entitlements`, `tier1/shares-idor`, `premium/dashboard`, etc. Open a PR; only merge after the Vercel preview is green and reviewed.
8. **Add a test for every fix that has logic.** Especially: webhook signature/idempotency/tier-mapping, share ownership, entitlements, verdict-canon guard.

---

## 2. HUMAN PREREQUISITES (you cannot do these — request them from the owner, Cody, and proceed on everything else meanwhile)

- Make the GitHub repo **private**; provide a fine-grained PAT (Contents: read/write, this repo only) if you need to push.
- Connect the repo to the Vercel **homi-platform** project; upgrade Vercel to **Pro** (Hobby forbids commercial use).
- Supabase dashboard: enable **HaveIBeenPwned** leaked-password protection; configure **custom SMTP** (Resend); set the Auth **Site URL + redirect allowlist** to `homitechnology.com`.
- Stripe: create the three products with **lookup_keys** (plus $9.99 / pro $24.99 / family $39.99), provide live+test API keys, register the webhook endpoint.
- Provide keys for **Sentry**, **PostHog** (or Plausible), **Resend** (verified domain: SPF/DKIM), and set an **Anthropic** workspace spend cap.

List anything you're blocked on at the end of each tier; never invent secret values.

---

## 3. THE WORK — execute in order, Tier 0 → 3. Each item: file evidence → change → acceptance test.

### TIER 0 — Process & business rails
- **Entitlements (`lib/entitlements.ts`).** Today `subscription_tier` is read only as a badge (`settings`, `admin/users`) and gates nothing. Create `getEntitlements(tier)` → capabilities (`advisorMessagesPerDay`, `fullReport`, `familySeats`, `partnerSharing`). Enforce **server-side** in API routes and server components. Gate 2–3 genuinely premium capabilities (advisor depth, full report/credential export, family mode). *Accept: a free-tier request to a gated API returns 402/403 in an integration test.*
- **Observability.** Add Sentry (client+server), PostHog events (`assessment_started/completed`, `verdict_shown{verdict}`, `override_recorded`, `checkout_started/completed`, `share_created`), `@vercel/analytics`. Healthcheck (`app/api/healthcheck/route.ts`): return **503** when `database:"error"`; replace hardcoded `version:"1.0.0"` with `VERCEL_GIT_COMMIT_SHA`. *Accept: a thrown prod error appears in Sentry with a commit SHA.*
- **Password recovery.** None exists (zero `resetPasswordForEmail`). Build `/auth/forgot-password` + `/auth/reset-password` (recovery-session `updateUser`), link from sign-in, and a password-change control in settings Security. *Accept: full reset round-trip on the prod domain.*
- **Migration history repair.** Remote `supabase_migrations.schema_migrations` holds ~90 phantom prototype rows (some future-dated to 2027). Keep only `20260706193938 … 20260707224634`; mark the rest reverted. Schema itself is already correct (15 tables). *Accept: local `supabase migration list` ≡ remote.*

### TIER 1 — Security & money
- **Shares IDOR (`app/api/shares/route.ts`).** It inserts `body.assessmentId` with no ownership check → any user can mint a public share link for anyone's assessment. **Mirror the exact pattern already in `app/api/assessments/override/route.ts` (lines ~51–60):** select the assessment `.eq("id", assessmentId).eq("user_id", user.id)`, 404 if not owned. Also tighten the RLS insert policy with an EXISTS subquery. *Accept: cross-user share attempt returns 404 in a test.*
- **Billing state machine (`app/api/webhooks/stripe/route.ts`).** Adopt the official `stripe` SDK (keep raw-body). Handle `customer.subscription.updated` (propagate downgrade/`past_due`/`cancel_at_period_end`) and `invoice.payment_failed`. Add an idempotency store (`webhook_events(event_id UNIQUE)`, insert-first). Return **500** on transient DB failure so Stripe retries (currently swallows to 200 → paid-but-unprovisioned users). Require auth in `/api/checkout` (block anonymous checkout). Enforce tier via `lookup_key`, drop the hardcoded-cents fallback. *Accept: replayed event processes once; simulated DB failure → retry → provisioned; test-clock downgrade lands in the profile.*
- **Share revocation.** Add `DELETE /api/shares/:id`, an "Active share links" list in settings with revoke, and a `revoked_at` check inside `get_shared_assessment`. *Accept: revoked link returns nothing.*
- **LLM endpoints (`/api/advisor`, `/api/twin`, `/api/trinity`).** Currently unauthenticated with a per-lambda in-memory limiter → ~$60/hr/IP spend exposure. Require auth; enforce a per-user daily message quota (tie to entitlements); keep the `/artifact` demo on a tight anonymous budget. *Accept: one IP cannot exceed the quota; unauth request is rejected.*
- **Rate limiting → Redis.** Replace `lib/ratelimit.ts` (in-memory Map, useless across serverless instances) with Upstash Redis behind the same `rateLimit()` signature. Apply to **every mutating route** (`/api/assessments`, `/api/shares`, `/api/checkout`, `/api/billing/portal`, `/api/account/*`, `/api/plaid/*`). *Accept: limit holds across concurrent invocations.*
- **CSP.** No `Content-Security-Policy` today. Add report-only first (`default-src 'self'; connect-src 'self' https://*.supabase.co https://api.anthropic.com; script-src 'self' 'unsafe-inline'`), then enforce.
- **Error leakage.** Stop returning raw `error.message`/upstream bodies (`/api/assessments`, `/api/checkout`, `/api/assessments/override`, `/api/email`, `/api/plaid/exchange`). Log server-side, return generic message + correlation id.
- **Minor:** waitlist email enumeration → uniform `{ok:true}`; consolidate the two divergent assessment zod schemas (`/api/scoring` vs `/api/assessments`) into `lib/validation/assessment.ts`.

### TIER 2 — Product integrity + PREMIUM REDESIGN (see §4)
- **Auth-aware app shell.** `app/(product)/layout.tsx` reuses the marketing header (always "Sign in", never links to dashboard/settings). Build a session-reading shell with a user menu + product nav so the **8 orphaned routes** (`/trinity /twin /decisions /signals /credit /calendar /family /connections`) are reachable. Highest-leverage item.
- **Assessment draft persistence.** `components/assessment/FullAssessmentFlow.tsx` holds answers in `useState` with zero persistence → refresh/back/tab-eviction wipes progress. Persist `{version, form, index, updatedAt}` to localStorage on change; "Resume where you left off"; clear on submit. *Accept: kill the tab at step 15, reopen, resume.*
- **DB-back `/results` and `/plan`.** Both read only localStorage → a signed-in user on a new device sees "No results yet." Fall back to the latest DB assessment when signed in.
- **Landing verdict fix + canon guard.** Fix the live 82/"ALMOST THERE" card. Add a unit test asserting every hardcoded marketing score/verdict pair satisfies `scoreToVerdict()`.
- **Question bank decision.** `lib/questions/bank.ts` (45 canonical Qs, mirrored in DB) is imported by zero runtime files; the live flow is 13 hardcoded steps. **Wire the bank into the flow** (dynamic render from the bank; enables A/B + multi-decision platform) — preferred — or delete it. Do not ship a "45-question assessment" that renders 13.
- **Retention email loop.** `/api/email` + 4 templates exist but are called by nothing. Trigger welcome (auth callback), verdict (on assessment save), and a 30-day reassessment reminder (Vercel cron + unsubscribe flag). Requires verified Resend domain.
- **Persistence unification.** Split-brain today (DB: journal/daily/calendar/family/outcomes; localStorage-only: finance/credit/couples/genome/plan; advisor thread = localStorage while companion widget = sessionStorage). Introduce `lib/persistence.ts` (local-first, background-synced to DB when signed in); migrate finance and the advisor thread first.
- **Plaid honesty.** `/api/plaid/exchange` discards the token (no `plaid_items`). Hide the connect UI while unconfigured. Before enabling: `plaid_items` with the token encrypted (pgsodium/KMS), never plaintext.
- **Remove `/artifact`** (internal playground) from the public footer.

### TIER 3 — Growth & hygiene
- Canonical URLs + 308 redirects (apex/www/vercel.app serve duplicate content; no canonical). JSON-LD (Organization + WebSite on landing, FAQPage on method, Article on blog/guides). Consolidate `middleware.ts` `PROTECTED_PREFIXES` (misses family/calendar/outcomes/connections/finance/results/twin/trinity/decisions/signals/credit) → "all `(product)` protected except an explicit public list." Add `outcome_surveys.assessment_id` FK index. Extract duplicated `MoneyField`/`NumberField`/`PercentSlider` into `components/ui`; replace finance's module-scope `let nextExpenseId = 1` with `crypto.randomUUID()`. Integration + Playwright E2E (signup→confirm, assessment→verdict, checkout test-mode→tier, share create→open→revoke, password reset), CI-gated.

---

## 4. THE "ULTRA-PREMIUM" REDESIGN

The design system already exists and is excellent — it just stops at the marketing pages. **Propagate it inward; do not invent a new language.** Reuse the tokens/classes in `app/globals.css`: `.glass`, `.glass-hover`, `.tilt-3d`, `.sweep`, aurora/text-shine, compass rings (`.ring-outer/middle/inner`, canon durations 20s/15s/10s), `.halo`, `.spectrum-bar`, `.score-numeral`, fonts (Fraunces display / Inter / JetBrains Mono for numerals). Honor `prefers-reduced-motion` (already scaffolded).

Apply to **every `(product)` surface**:
- **Dashboard:** readiness hero (compass + score-numeral), three pillar gauges (radial), verdict chip + build-path, score-over-time trend against the READY=80 line, check-in streak. Glass cards, hairline dividers, ambient bloom.
- **All 11 tools** (`app/(product)/tools/*`: mortgage, affordability, roth-conversion, monte-carlo, rent-vs-buy, down-payment, debt-payoff, runway, fire, blind-budget): consistent glass card frame, JetBrains-Mono result numerals, animated result reveals, shared input primitives, a premium tool-index grid.
- **Every other product page** (results, plan, twin, trinity, signals, journal, daily, decisions, finance, genome, credit, couples, calendar, family, settings, advisor): same card system, empty states with the compass motif, consistent headers.

Bar: it should feel like one continuous cinematic product from landing → signed-in, on par with the landing page. Keep it performant (respect reduced-motion, avoid layout thrash) and accessible (focus states, `aria` on interactive gauges/sliders, `role="img"` + labels on decorative SVG).

---

## 5. DEFINITION OF DONE (launch gate)

Security: cross-tenant share test fails; all mutating routes Redis-limited; CSP enforced; no raw error passthrough; HIBP on. Money: Stripe SDK + idempotency; `subscription.updated`/`payment_failed` handled; anonymous checkout impossible; lookup_keys on all prices; entitlements enforced with tests. Product: auth-aware shell with zero orphaned routes; assessment survives refresh; results DB-backed; landing verdict canon-tested; password reset round-trips; welcome/verdict/reminder emails deliver via verified domain; every dashboard + tool on the premium system. Process: CI gate green; Sentry + analytics live; healthcheck 503s honestly; migration history repaired; Vercel Pro.

Work tier by tier. After each tier: run the full verify gate, push the branch, report what's done and what's blocked on a human prerequisite, and wait for preview approval before merging to `main`.
