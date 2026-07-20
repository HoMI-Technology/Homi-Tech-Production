# HōMI — Launch Runbook

Operator playbook for taking HōMI from "hardened build" to "launched company."
Pairs with `BUILD-BRIEF.md` (engineering spec) and `AUDIT-2026-07-08.md`
(what was wrong). This file covers the **loops** built on the
`claude/homi-launch-strategy` branch and the **owner steps** only Cody can do.

The thesis in one line: the transactional core (score → verdict → pay → share)
was finished. What this branch adds are the **compounding systems** that make a
launch retain and spread — measurement, referral, and the B2B receipt.

> **Scope note (reconciled onto main).** While this work was in flight, `main`
> independently shipped the **lifecycle email loop** (welcome/verdict/
> reassessment + day-30/90/365 outcome surveys, `welcome_email_sent_at` dedupe +
> `/api/cron/reassessment` & `/api/cron/outcome-surveys`) and the **Companion
> "authority flip"** (server-side context assembly). Those are main's now — this
> branch does **not** duplicate them. It contributes the five areas main did not
> have, listed below.

---

## 0. What this branch adds (rebased onto main)

| System | What it does | Key files |
|---|---|---|
| **Attribution** | First-touch `?ref`/`utm_*` → cookie → stamped on profile + every assessment; per-partner invite codes; partner portal stats now real (were global, mislabeled) | `lib/attribution.ts`, `components/analytics/AttributionCapture.tsx`, migrations `00026`, `00030` |
| **Server funnel event** | `assessment_completed` captured server-side (blocker-proof) — main only had the client event | `lib/analytics/server.ts`, assessments route |
| **Shadow share loop** | Anonymous journey cards + dynamic OG unfurl; the viral exit for the top-of-funnel | `app/api/shadow-shares`, `app/shadow/[token]`, migration `00027` |
| **Receipt API (B2B v1)** | Partner-key-authenticated, signed, consumer-authorized readiness receipts + consumer-visible audit | `lib/receipts`, `app/api/v1/receipts/[token]`, migration `00028` |
| **Advisor monthly cap** | Monthly spend ceiling on top of main's daily quota (v2 RPC, v1 fallback) | `lib/entitlements.ts`, `lib/advisor/quota.ts`, migration `00029` |
| **CSP collector** | Violation collector + report-uri/report-to for main's already-enforced policy | `app/api/csp-report`, `next.config.ts` |

Provided by **main** (not this branch): lifecycle email loop + outcome-survey
delivery, Companion server-context, receipts-adjacent advisor rewrite, PWA,
Redis rate limiting, Sentry. All additive and expand-only. Scoring canon
untouched. Full suite green (tsc clean, 596 tests, brand-check clean, build ok).

---

## 1. Owner checklist — do these before a single marketing dollar

Ordered by **what breaks first** under real traffic. Items 1–3 are hard
launch blockers.

| # | Task | Why it blocks launch | Effort |
|---|---|---|---|
| 1 | **Resend: verify `homitechnology.com` (SPF/DKIM) + set Supabase custom SMTP** | Supabase's built-in SMTP caps at a few emails/hour — signup confirmations die on day one of marketing. Also lights up the entire lifecycle-email loop (§2). | ~1 hr + DNS |
| 2 | **Stripe: create 3 products w/ `lookup_key`s, register webhook, test-clock proof, then live keys** | Billing is code-complete but has never processed a live lifecycle. Prove it in test mode first (`npm run stripe-setup` scaffolds the products). | 2–3 hrs |
| 3 | **Vercel: upgrade to Pro** | Hobby prohibits commercial use — ToS violation the moment a card is charged. | 15 min |
| 4 | **Upstash Redis + env vars** | PR #10's cross-instance rate limiting is inert without it; until then limits are per-lambda fiction. | 20 min |
| 5 | **Sentry DSN + PostHog key** (`NEXT_PUBLIC_POSTHOG_KEY`) | You cannot run a launch you can't observe. The funnel events (§0) sink nowhere without the PostHog key. | 30 min |
| 6 | **Anthropic workspace spend cap + alert** | Last backstop on advisor spend; discovery channel today is the invoice. | 10 min |
| 7 | **Supabase: HIBP toggle, Site-URL/redirect allowlist, confirm migration-history repair (T0.6)** | Quiet correctness. | 30 min |
| 8 | **GitHub: require the `verify` CI check on `main`** | A red build must be unmergeable. | 10 min |
| 9 | **Uptime monitor on `/api/healthcheck`** | It now 503s honestly (done) — but nothing is listening. | 15 min |
| 10 | **Plaid production application** | Weeks of lead time + security questionnaire. Start now even though bank sync is Plus-gated. | 1–2 hrs + lead |
| 11 | **support@ inbox + this runbook's §5 pinned** | Solo-founder launches die on ops chaos, not code. | 1 hr |

### New environment variables introduced on this branch

Add to Vercel **Preview + Production** (all degrade gracefully when absent):

| Var | Purpose | Absent behavior |
|---|---|---|
| `RECEIPT_SIGNING_SECRET` | HMAC signing of readiness receipts | Receipts returned unsigned (`signature: null`) |
| `NEXT_PUBLIC_POSTHOG_KEY` | Client + server funnel capture | Events no-op |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog ingest host (optional) | Defaults to `us.i.posthog.com` |

(`CRON_SECRET`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` etc. are already
required by main's lifecycle-email cron — this branch adds no new cron.)

---

## 2. Migrations — apply in order before deploying this branch

Against the live Supabase project, **in numeric order**, after a backup.
These sit on top of main's lineage (main ends at `00025`):

```
00026_attribution.sql          -- profiles/assessments.attribution + partner_codes
00027_shadow_shares.sql        -- anonymous share cards
00028_receipts.sql             -- partner_api_keys + receipt_verifications
00029_advisor_monthly_quota.sql-- try_consume_advisor_message_v2 (monthly ceiling)
00030_partner_stats.sql        -- partner-scoped SECURITY DEFINER stat RPCs
```

All are expand-only (nullable adds, new tables, `create or replace`), each
carries a `-- ROLLBACK:` block, and the app degrades gracefully if a migration
lags the deploy (e.g. the advisor gate falls back to main's v1 daily RPC until
`00029` lands). Safe order: **migrations first, then deploy.**

Mint a partner API key (operator-side, offline — no service key needed):

```
node scripts/mint-partner-key.mjs "Coastal Realty" "Coastal Realty LLC"
# prints the plaintext key ONCE + the INSERT for the hash
```

---

## 3. Merge order

This branch is rebased on current `main` (the earlier PRs #10 route protection /
Redis limiter / Sentry and #11 PWA have already merged into `main`, along with
the lifecycle-email loop and Companion authority-flip). It targets `main` as a
single additive PR — CI (`verify`) + the mobile Lighthouse gate run
automatically. Nothing here modifies a hot shared primitive beyond the
documented shared-file touches (`layout.tsx`, `auth/callback`, `results`,
`entitlements`, `quota`, `next.config`, `partner/portal`, `ShareLinksSection`,
`assessments`), each adapted onto main's current version rather than reverting
it. No `package-lock.json` change (Playwright already on main).

---

## 4. Verifying the loops after deploy

- **Attribution:** visit `/shadow-score?ref=ptr_test&utm_source=probe`, complete
  it signed-in → the `assessments` row carries `attribution.ref = "ptr_test"`.
- **Partner scoping:** open `/partner/portal` as a partner → an invite link
  `/shadow-score?ref=ptr_xxxxxxxx` is minted and the stat tiles read from that
  code only (not global).
- **Email loop** (main's): sign up → welcome once; complete an assessment →
  verdict email. (Delivery needs owner step #1.)
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
  hard stop; the Redis limiter + the daily/monthly quotas are the soft ones.
  Kill switch: unset `ANTHROPIC_API_KEY` → the Companion falls back to its
  scripted persona replies (no spend), product stays up.
- **Email storm / wrong send:** main's lifecycle cron is idempotent per its
  dedupe columns; to halt it, unset `CRON_SECRET` (route fails closed).
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
