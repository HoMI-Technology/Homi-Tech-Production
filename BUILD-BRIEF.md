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

---

## 6. OPERATING MODEL — split by blast radius, not by topic

Do NOT treat all work as equivalent. Three lanes, three gates:

- **Foundation (serial — blocks everything):** Step 0 below, then design tokens + shared UI primitives, the auth-aware shell, and the `lib/entitlements.ts` skeleton. One branch at a time; each merges before the next starts.
- **Volume / low-risk (parallel OK):** premium redesign of pages & tools, SEO/JSON-LD, component de-duplication, Tier 3 hygiene. Gate = CI green + §11 budgets + a visual diff.
- **Critical / low-volume (never merge on your own say-so):** shares IDOR, Stripe state machine, entitlement *enforcement*, LLM auth/quota, rate-limit→Redis, CSP, ALL migrations. Gate = CI green + the independent acceptance tests in §9 pass + human review + (for billing) a Stripe **test-mode** proof. If those acceptance tests are not yet present in the repo, STOP and request them before implementing — do not write your own substitute and mark the item done.

## 7. STEP 0 — do this before any feature work (own branch `chore/foundation`)

1. **Lockfile:** run `npm install` once and **commit `package-lock.json`**. Builds are currently non-reproducible (no lockfile). After this, CI uses `npm ci`.
2. **CI:** the workflow at `.github/workflows/ci.yml` must be the required status check on `main` (Settings → Branches → protect `main` → require the `verify` check + require PR review). A red CI must make merge impossible.
3. **Preview secrets:** confirm with the owner that server-only env vars (STRIPE_*, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, RESEND_API_KEY, UPSTASH_*, SENTRY_*) are added to Vercel's **Preview** scope, not only Production — otherwise Tier 1 branches can't be tested on their preview URLs.
Merge Step 0 before anything else.

## 8. FILE-OWNERSHIP & MERGE ORDER (prevents parallel-branch collisions)

These files are **hot** — only one branch may edit each at a time, in this order:
`package-lock.json` → `.github/workflows/ci.yml` → `app/globals.css` → `components/ui/*` (new shared primitives) → `app/(product)/layout.tsx` → `middleware.ts` → `lib/entitlements.ts` → `lib/ratelimit.ts` → `app/api/webhooks/stripe/route.ts`.
Rule: land the foundation branches that touch these first; rebase every feature branch on `main` before opening its PR; a feature branch may consume shared primitives but must not modify them. Per-page redesign branches (`premium/dashboard`, `premium/tools-mortgage`, …) touch only their own route dir + read-only shared primitives, so they parallelize safely.

## 9. INDEPENDENT ACCEPTANCE TESTS (implementation-agnostic — you must make these pass; do not edit them to fit your code)

- **Shares IDOR:** User A creates assessment α; User B (valid session) calls `POST /api/shares {assessmentId: α}` → **404/403**, and **no** `score_shares` row is created. User A sharing α → 200 + token. A revoked token → `get_shared_assessment` returns empty.
- **Stripe idempotency:** the same `checkout.session.completed` event delivered twice → profile upgraded exactly once; a `webhook_events` row exists for the event id.
- **Stripe failure retry:** if the profile UPDATE throws during a webhook, the endpoint returns **≥500** (so Stripe retries) — never 200.
- **Stripe lifecycle (test clock):** `customer.subscription.updated` to a lower price → `subscription_tier` downgrades; `past_due` status → `subscription_status="past_due"`; `deleted` → `free`/`cancelled`.
- **Anonymous checkout:** `POST /api/checkout` without a session → **401**; no Stripe session created.
- **Entitlements:** a `free`-tier session calling a gated capability (e.g. advisor beyond the free daily quota, or full-report export) → **402/403**; a `pro` session → 200.
- **Verdict canon guard:** a unit test iterates every hardcoded marketing score/verdict pair and asserts it equals `scoreToVerdict(score)`; 82 must map to READY, not ALMOST_THERE.
- **RLS:** with User B's JWT, selecting User A's `assessments`/`profiles` rows returns zero rows.

## 10. AGENT GUARDRAILS (anti-patterns — treat as hard rules)

- **Minimal diffs.** Change the fewest lines that solve the item. No wholesale file rewrites, no reformatting, no renaming unrelated symbols. A reviewer must be able to read the diff.
- **No scope creep.** Do only the item on the branch. Found something else? Note it, don't fix it here.
- **No new dependencies without listing and justifying them** in the PR (name, why, weight, maintenance/security). Never add a dependency to do what the platform already does.
- **Never touch `lib/scoring/*`** (frozen canon) or delete/relax an RLS policy or a `search_path` pin.
- **Verify external APIs against live docs, not memory:** Stripe API version + event shapes, Supabase `@supabase/ssr` patterns, and the Anthropic model string (`app/api/advisor/route.ts` hardcodes `claude-sonnet-4-5` — confirm the current supported model before shipping). Do not invent SDK methods.
- **Preserve behavior:** if unsure whether code is load-bearing, keep it and ask.

## 11. PREMIUM REDESIGN — objective acceptance (not "looks nice")

Per redesigned route, the preview must hold: Lighthouse **Performance ≥ 90 (mobile)**, **Accessibility ≥ 95**, **CLS < 0.1**, **LCP < 2.5s**; added client JS **≤ ~30KB gzipped** per route; full parity under `prefers-reduced-motion` (no motion, no loss of information); interactive gauges/sliders have `aria` + visible focus; decorative SVG is `aria-hidden`/`role="img"` with a label. Effects must be CSS/GPU-friendly and must not block LCP. Include before/after screenshots (light + reduced-motion) in the PR.

## 12. PR / COMMIT TEMPLATE (so output is reviewable at volume)

Conventional commits (`fix(api): enforce share ownership`). Every PR body:
```
## Item        <BUILD-BRIEF/AUDIT reference>
## Summary     <what changed, 2–3 lines>
## Files       <hot files touched? which>
## Migrations  <none | reversible up/down; ran on branch DB not prod>
## New env      <names only, added to Vercel Preview+Prod?>
## Verified     <tsc/vitest/next build results; acceptance tests; Stripe test-mode notes>
## Screenshots  <for any UI change: default + reduced-motion>
## Blocked-on   <human prerequisites, if any>
## Risk         <blast radius + rollback note>
```

## 13. PRODUCTION & DATABASE SAFETY (there is no staging DB — treat prod as fragile)

- **Migrations run against the live Supabase project.** Before any migration: take a backup/`db dump`. Prefer a **Supabase branch** or a throwaway staging project to dry-run; if unavailable, review the SQL with a human before it runs.
- **Expand/contract only.** Add columns nullable → backfill → constrain in a *later* migration. Never drop/rename a column in the same step that code starts depending on it. Every migration ships with a tested rollback.
- **Migration-history repair** uses `supabase migration repair --status reverted` for the phantom versions — do **not** hand-`DELETE` from `supabase_migrations.schema_migrations`.
- **Stripe:** build and prove the entire webhook/checkout flow in **test mode** (test keys + test clocks) first. Switch to live keys only after §9 passes.
- **Rollback:** each merge to `main` = one Vercel production deploy. If prod breaks, use Vercel **Instant Rollback** to the previous good deployment immediately, then diagnose on a branch. Keep the last-known-good deployment id noted in the PR.
- **Preflight:** before starting, confirm the environment: `node -v` (22), `npm -v`, `npx supabase --version`, and network reach to registry/Supabase/Stripe. Report any missing capability instead of working around it.

