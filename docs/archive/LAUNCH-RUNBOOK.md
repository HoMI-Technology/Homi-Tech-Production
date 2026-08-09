# HōMI — Launch Runbook

Operator playbook for taking HōMI from "hardened build" to "launched company."
Pairs with `BUILD-BRIEF.md` (engineering spec) and `AUDIT-2026-07-08.md`
(what was wrong). This file covers the **loops** built on the
`claude/homi-launch-strategy` branch and the **owner steps** only Cody can do.

The thesis in one line: the transactional core (score → verdict → pay → share)
was finished. What this branch adds is the four **compounding systems** —
measurement, retention, referral, and the B2B receipt — plus the outcome-data
loop that is the only path from "readiness opinion" to a defensible
"readiness intelligence" claim.

---

## 0. What shipped on this branch

| System                   | What it does                                                                                                                         | Key files                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| **Attribution**          | First-touch `?ref`/`utm_*` → cookie → stamped on profile + every assessment; per-partner invite codes; partner portal stats now real | `lib/attribution.ts`, `components/analytics/AttributionCapture.tsx`, migrations `00019`, `00024` |
| **Funnel events**        | The 5 canonical events wired (client) + `checkout_completed`/`assessment_completed` captured server-side (blocker-proof)             | `lib/analytics/server.ts`, results/pricing/webhook/assessment routes                             |
| **Lifecycle email**      | Welcome (signup), verdict (assessment), 30-day nudge + day-30/90/365 outcome surveys (cron); idempotency ledger                      | `lib/email/send.ts`, `lib/email/lifecycle.ts`, `app/api/cron/lifecycle`, migration `00020`       |
| **Shadow share loop**    | Anonymous journey cards + dynamic OG unfurl; the viral exit for the top-of-funnel                                                    | `app/api/shadow-shares`, `app/shadow/[token]`, migration `00021`                                 |
| **Receipt API (B2B v1)** | Partner-key-authenticated, signed, consumer-authorized readiness receipts + consumer-visible audit                                   | `lib/receipts`, `app/api/v1/receipts/[token]`, migration `00022`                                 |
| **Advisor economics**    | Monthly spend ceiling, 5/day demo budget, server-authoritative (un-forgeable) context                                                | `lib/advisor/quota.ts`, `lib/advisor/server-context.ts`, migration `00023`                       |
| **CSP**                  | Real violation collector + enforcement-ready allowlist (won't break Plaid/PostHog)                                                   | `app/api/csp-report`, `next.config.ts`                                                           |
| **Perf**                 | Companion widget deferred off the LCP critical path                                                                                  | `components/companion/CompanionWidget.tsx`                                                       |
| **E2E**                  | Playwright smoke over the anonymous funnel                                                                                           | `e2e/`, `playwright.config.ts`, `.github/workflows/e2e.yml`                                      |

All additive and expand-only. Scoring canon untouched. 342 unit tests green
(+53), tsc clean, brand-check clean.

---

## 1. Owner checklist — do these before a single marketing dollar

Ordered by **what breaks first** under real traffic. Items 1–3 are hard
launch blockers.

| #   | Task                                                                                               | Why it blocks launch                                                                                                                                        | Effort         |
| --- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | **Resend: verify `homitechnology.com` (SPF/DKIM) + set Supabase custom SMTP**                      | Supabase's built-in SMTP caps at a few emails/hour — signup confirmations die on day one of marketing. Also lights up the entire lifecycle-email loop (§2). | ~1 hr + DNS    |
| 2   | **Stripe: create 3 products w/ `lookup_key`s, register webhook, test-clock proof, then live keys** | Billing is code-complete but has never processed a live lifecycle. Prove it in test mode first (`npm run stripe-setup` scaffolds the products).             | 2–3 hrs        |
| 3   | **Vercel: upgrade to Pro**                                                                         | Hobby prohibits commercial use — ToS violation the moment a card is charged.                                                                                | 15 min         |
| 4   | **Upstash Redis + env vars**                                                                       | PR #10's cross-instance rate limiting is inert without it; until then limits are per-lambda fiction.                                                        | 20 min         |
| 5   | **Sentry DSN + PostHog key** (`NEXT_PUBLIC_POSTHOG_KEY`)                                           | You cannot run a launch you can't observe. The funnel events (§0) sink nowhere without the PostHog key.                                                     | 30 min         |
| 6   | **Anthropic workspace spend cap + alert**                                                          | Last backstop on advisor spend; discovery channel today is the invoice.                                                                                     | 10 min         |
| 7   | **Supabase: HIBP toggle, Site-URL/redirect allowlist, confirm migration-history repair (T0.6)**    | Quiet correctness.                                                                                                                                          | 30 min         |
| 8   | **GitHub: require the `verify` CI check on `main`**                                                | A red build must be unmergeable.                                                                                                                            | 10 min         |
| 9   | **Uptime monitor on `/api/healthcheck`**                                                           | It now 503s honestly (done) — but nothing is listening.                                                                                                     | 15 min         |
| 10  | **Plaid production application**                                                                   | Weeks of lead time + security questionnaire. Start now even though bank sync is Plus-gated.                                                                 | 1–2 hrs + lead |
| 11  | **support@ inbox + this runbook's §5 pinned**                                                      | Solo-founder launches die on ops chaos, not code.                                                                                                           | 1 hr           |

### New environment variables introduced on this branch

Add to Vercel **Preview + Production** (all degrade gracefully when absent):

| Var                                    | Purpose                               | Absent behavior                                |
| -------------------------------------- | ------------------------------------- | ---------------------------------------------- |
| `CRON_SECRET`                          | Bearer auth for `/api/cron/lifecycle` | Cron route 401s (fails closed) — no sends      |
| `RECEIPT_SIGNING_SECRET`               | HMAC signing of readiness receipts    | Receipts returned unsigned (`signature: null`) |
| `NEXT_PUBLIC_POSTHOG_KEY`              | Client + server funnel capture        | Events no-op                                   |
| `NEXT_PUBLIC_POSTHOG_HOST`             | PostHog ingest host (optional)        | Defaults to `us.i.posthog.com`                 |
| `E2E_TEST_EMAIL` / `E2E_TEST_PASSWORD` | Seeded account for authed E2E         | Auth E2E self-skips                            |

Also required for the cron + email + receipt features (already in the app):
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_UNSUBSCRIBE_SECRET`.

---

## 2. Migrations — apply in order before deploying this branch

Against the live Supabase project, **in numeric order**, after a backup:

```
00026_attribution.sql          -- profiles/assessments.attribution + partner_codes
00027_email_sends.sql          -- lifecycle idempotency ledger
00028_shadow_shares.sql        -- anonymous share cards
00029_receipts.sql             -- partner_api_keys + receipt_verifications
00030_advisor_monthly_quota.sql-- try_consume_advisor_message_v2
00031_partner_stats.sql        -- partner-scoped SECURITY DEFINER stat RPCs
```

All are expand-only (nullable adds, new tables, `create or replace`), each
carries a `-- ROLLBACK:` block, and the app degrades gracefully if a migration
lags the deploy (e.g. the advisor gate falls back to the v1 daily RPC until
`00023` lands). Safe order: **migrations first, then deploy.**

Mint a partner API key (operator-side, offline — no service key needed):

```
node scripts/mint-partner-key.mjs "Coastal Realty" "Coastal Realty LLC"
# prints the plaintext key ONCE + the INSERT for the hash
```

---

## 3. Merge order (this branch + the two open PRs)

`main` is green; PRs **#10** (route protection, Redis limiter, Sentry scaffold,
dead-code deletion) and **#11** (PWA) are open and were blocked only by the
Lighthouse LCP budget. Recommended sequence:

1. **This branch** → its own PR. CI (`verify`) + the mobile Lighthouse gate run
   automatically. The Companion-widget deferral targets the LCP budget; **treat
   the PR's Lighthouse run as the authoritative measurement** (local numbers are
   CPU-contended and unreliable). If `/shadow-score` or `/tools/mortgage` still
   exceed 2500ms LCP, the next levers, in order: (a) any above-the-fold content
   wrapped in `<Reveal>` (it starts `opacity:0` until JS+IntersectionObserver
   fire — fine below the fold, an LCP delay above it); (b) the async
   `(product)/layout.tsx` session read making the group dynamic.
2. **#10** — route protection is a live security gap on nine product routes;
   merge as soon as its Lighthouse passes. Highest security priority.
3. **#11** — PWA; lowest risk, merge last.

Rebase each on `main` before merging. `package-lock.json` is touched here
(added `@playwright/test`, devDependency only) — a hot file per BUILD-BRIEF §8;
land this branch's lock change before rebasing the others.

---

## 4. Verifying the loops after deploy

- **Attribution:** visit `/shadow-score?ref=ptr_test&utm_source=probe`, complete
  it signed-in → the `assessments` row carries `attribution.ref = "ptr_test"`.
- **Welcome email:** sign up a fresh account → welcome arrives once; a second
  sign-in sends nothing (ledger dedupe).
- **Verdict email:** complete an assessment → exactly one verdict email.
- **Cron:** `curl -H "Authorization: Bearer $CRON_SECRET" https://homitechnology.com/api/cron/lifecycle`
  → `{ok:true, planned, sent, skipped}`; run it twice → second run sends 0.
- **Share loop:** finish a shadow score → "Share your journey" → the
  `/shadow/<token>` card renders and unfurls with an OG image in iMessage/Slack.
- **Receipt API:** `curl -H "Authorization: Bearer homi_live_..." https://homitechnology.com/api/v1/receipts/<share_token>`
  → signed receipt with verdict + bands; revoke the share → same call returns
  `410 revoked`; the consumer sees "Verified by a partner 1×" in Settings.
- **Advisor cap:** exhaust the daily quota → graceful 402 upgrade nudge, never a
  fake error.
- **CSP:** watch `/api/csp-report` logs for a week; when clean, rename the header
  from `Content-Security-Policy-Report-Only` to `Content-Security-Policy`.

---

## 5. Incident runbook (pin this)

- **Bad deploy / prod breaks:** Vercel → Deployments → last-known-good →
  **Instant Rollback**. Note the good deployment id in the PR before every merge.
- **Advisor spend spike:** Anthropic console spend cap (owner step #6) is the
  hard stop; Upstash limiter (PR #10) + the 5/day demo budget are the soft ones.
  Kill switch: unset `ANTHROPIC_API_KEY` → the Companion falls back to its
  scripted persona replies (no spend), product stays up.
- **Email storm / wrong send:** the `email_sends` ledger makes re-runs
  idempotent; to halt the cron, unset `CRON_SECRET` (route fails closed).
- **Leaked share/receipt:** revoke in Settings → Share links (propagates
  instantly; receipts fail closed at read time). Revoke a partner key:
  `update partner_api_keys set revoked_at = now() where id = '...'`.
- **DB incident:** restore from the pre-migration backup (§2); all migrations
  have rollback blocks.

---

## 6. The one strategic reminder

The outcome-survey loop (day-30/90/365 emails → `outcome_surveys`) is the moat,
not a nicety. It is the only mechanism that will let HōMI eventually say "of the
people we called READY, X% closed and reported zero regret" — the seed of
predictive validity that took FICO decades. **Pre-register now** what outcome
metrics count as "the verdict was right" (purchase completion, regret score,
financial-stress delta) so the eventual cohort study is credible rather than
retro-fitted. Every week those emails don't send is moat-time lost. That is why
custom SMTP (owner step #1) is the single most important non-code task on this
page.
