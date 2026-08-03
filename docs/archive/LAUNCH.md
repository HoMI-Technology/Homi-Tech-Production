# HōMI Launch Checklist

> Last updated: 2026-07-23
> Status: Pre-launch (code complete, owner config pending)

This document is the single source of truth for taking HōMI from "code complete" to "live and accepting users." All code-side work is merged to `main`; what remains are owner-only configuration steps that require your accounts, credentials, DNS, or a payment method.

**One-line priority:** Email → Migrations → Stripe unblock "users who can sign up, get emails, and pay." Everything else is week-one hardening.

---

## Phase 0: Code Complete ✅

- [ ] PR #81 merged (i18n sweep)
- [ ] Migration fix merged (duplicate 00020)
- [ ] Code quality tooling merged (Dependabot/ESLint/Prettier)
- [ ] All tests passing (`npm run test`)
- [ ] Build green (`npm run build`)

---

## Phase 1: Critical Infrastructure (Do First — Blocks Everything)

### 1.1 Email Deliverability 🔴

**Why blocks:** Supabase's built-in email sender is throttled to a few/hour. Users cannot sign up without this. Also gates the entire retention loop (welcome / verdict / reassessment / outcome-survey emails) that is already coded and waiting.

**Steps:**
1. Go to https://resend.com → Add domain `homitechnology.com`
2. Publish DNS records (SPF + DKIM) from Resend dashboard → wait for "Verified"
3. Create Resend API key → Set `RESEND_API_KEY` in Vercel (Production + Preview)
4. Supabase Dashboard → Auth → Emails → SMTP Settings → Enable custom SMTP
   - Host: `smtp.resend.com`
   - Port: `465`
   - Username: your Resend SMTP username
   - Password: your Resend SMTP password
   - Sender: `hello@homitechnology.com`
5. Supabase Dashboard → Auth → URL Configuration
   - Site URL: `https://homitechnology.com`
   - Add to redirect allowlist
6. Enable "Leaked password protection" (HaveIBeenPwned)

**Verify:** Sign up with a test email on the live site → confirmation arrives within 60 seconds; complete an assessment → verdict email arrives.

---

### 1.2 Database Migrations 🔴

**Why blocks:** Merging code does not touch the database. Several shipped features (attribution columns, `partner_codes`, `shadow_shares`, `partner_api_keys`, `receipt_verifications`, the advisor monthly-quota RPC, dashboard/campaign tables) need their migrations run against the live Supabase project, or those routes error at runtime.

**Steps:**
1. Take Supabase backup (Dashboard → Database → Backups)
2. Apply migrations in `supabase/migrations/` in numeric order from `00001` through `00033`
   - Via Supabase SQL Editor (paste each file) OR
   - Via CLI: `supabase db push`
3. Verify these tables exist: `partner_codes`, `shadow_shares`, `partner_api_keys`, `receipt_verifications`
4. Verify RPC exists: `try_consume_advisor_message_v2`

**Rollback:** Each migration file has a `-- ROLLBACK:` comment at the bottom.

---

### 1.3 Stripe Billing 🔴

**Why blocks:** Billing is fully coded and idempotent but has never processed a live charge. Cannot process payments without live keys.

**Steps:**
1. `npm run stripe-setup` (or Stripe Dashboard) → Create 3 products with lookup keys:
   - `homi_plus_monthly`
   - `homi_pro_monthly`
   - `homi_family_monthly`
2. Register webhook endpoint: `https://homitechnology.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `invoice.payment_succeeded`, `charge.refunded`
   - Copy signing secret → Set `STRIPE_WEBHOOK_SECRET`
3. Set in Vercel:
   - `STRIPE_SECRET_KEY` (live `sk_live_*`)
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_FAMILY`
4. Run ONE test-mode checkout end-to-end (test clock for upgrade/downgrade/cancel)
5. Confirm the profile tier updates → receipt appears
6. Swap to live keys

**Verify:** Complete a live checkout → profile tier updates → receipt appears.

---

## Phase 2: Platform & Observability (Week 1)

### 2.1 Vercel Pro

- Upgrade to Pro plan (required for commercial use — Hobby prohibits charging cards)
- Enable Analytics

### 2.2 PostHog Analytics

- Create project at https://posthog.com
- Set `NEXT_PUBLIC_POSTHOG_KEY` (browser capture)
- Set `NEXT_PUBLIC_POSTHOG_HOST` (default: `https://us.i.posthog.com`)
- Set `POSTHOG_PERSONAL_API_KEY` (server-only, for `/admin/analytics` dashboard — needs "query" read scope)
- Set `POSTHOG_PROJECT_ID` (optional, auto-detected)

> The funnel events (assessment started/completed, verdict shown, checkout started/completed, share created/viewed) are already firing — they just need a sink.

### 2.3 Sentry Error Tracking

- Create project → Set `SENTRY_DSN`
- Server capture is already wired; SDK initializes when DSN is present

### 2.4 Anthropic Spend Cap

- Set a workspace **spend cap + alert** — the last backstop on Companion LLM cost
- Kill switch: unset `ANTHROPIC_API_KEY` → Companion falls back to scripted persona replies (no spend), product stays up

### 2.5 Rate Limiting + Cron Secrets

- **Upstash Redis:** Create DB → Set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- Generate random secrets:
  ```bash
  openssl rand -base64 32  # CRON_SECRET
  openssl rand -base64 32  # RECEIPT_SIGNING_KEY
  openssl rand -base64 32  # EMAIL_UNSUBSCRIBE_SECRET
  openssl rand -base64 32  # INTERNAL_API_SECRET
  ```
- Set all in Vercel

### 2.6 Web Push (Optional)

```bash
npx web-push generate-vapid-keys
```
- Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Set `VAPID_PRIVATE_KEY`
- Set `VAPID_SUBJECT=mailto:hello@homitechnology.com`

> Powers outcome-survey push nudges. All push code is inert until these are set.

---

## Phase 3: Ops Hardening (Week 1–2)

- [ ] Branch protection on `main`: require `verify` status check (the gating one; `lighthouse` is informational)
- [ ] Set up `support@homitechnology.com` inbox
- [ ] Uptime monitor on `/api/healthcheck` (UptimeRobot/BetterStack) — it 503s honestly on DB failure
- [ ] Enable GitHub Advanced Security (CodeQL, secret scanning)
- [ ] Enable Dependabot (PR incoming from code squad)
- [ ] Document last-known-good deployment for rollback before each release (Vercel Instant Rollback)

---

## Phase 4: Post-Launch

- [ ] Plaid production approval (takes weeks + security questionnaire — start now even though bank sync is Plus-gated)
- [ ] Lighthouse LCP optimization pass (mobile Lighthouse reports ~3.7s on `/`, `/shadow-score`, `/tools/mortgage`; observed LCP for real users is 195–958ms)
- [ ] Marketing funnel analysis via PostHog
- [ ] Customer support playbook
- [ ] Pre-register outcome metrics for the 30/90/365-day survey moat (purchase completion, regret score, financial-stress delta)

---

## Environment Variable Quick Reference

All required and optional env vars are documented in `.env.example`. Key vars for launch:

| Variable | Required for launch | Phase |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | 0 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | 0 |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | 0 |
| `NEXT_PUBLIC_SITE_URL` | Yes | 0 |
| `RESEND_API_KEY` | Yes | 1.1 |
| `STRIPE_SECRET_KEY` | Yes | 1.3 |
| `STRIPE_WEBHOOK_SECRET` | Yes | 1.3 |
| `STRIPE_PRICE_PLUS/PRO/FAMILY` | Yes | 1.3 |
| `NEXT_PUBLIC_POSTHOG_KEY` | No (Week 1) | 2.2 |
| `POSTHOG_PERSONAL_API_KEY` | No (Week 1) | 2.2 |
| `SENTRY_DSN` | No (Week 1) | 2.3 |
| `UPSTASH_REDIS_REST_URL` | No (Week 1) | 2.5 |
| `UPSTASH_REDIS_REST_TOKEN` | No (Week 1) | 2.5 |
| `CRON_SECRET` | No (Week 1) | 2.5 |
| `RECEIPT_SIGNING_KEY` | No (Week 1) | 2.5 |
| `EMAIL_UNSUBSCRIBE_SECRET` | No (Week 1) | 2.5 |
| `INTERNAL_API_SECRET` | No (Week 1) | 2.5 |
| `ANTHROPIC_API_KEY` | No (degrades gracefully) | — |
| `PLAID_*` | No (Plus-gated) | 4 |
| `NEXT_PUBLIC_VAPID_*` | No (optional) | 2.6 |

---

## Related Documents

| Document | Purpose |
|---|---|
| `GO-LIVE-CHECKLIST.md` | Original scattered checklist (superseded by this file) |
| `LAUNCH-RUNBOOK.md` | Detailed runbook covering loops, merge order, verification steps |
| `docs/RUNBOOK.md` | Incident response playbook (common outages + quick fixes) |
| `BUILD-BRIEF.md` | Engineering spec and architecture decisions |
| `AUDIT-2026-07-08.md` | Pre-launch security/performance audit |
| `DEPLOY.md` | Deployment procedures |
| `supabase/README.md` | Migration apply order + RLS policy overview |
| `.env.example` | Complete environment variable reference |
