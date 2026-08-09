# HōMI Incident Runbook

> Quick-reference playbook for common production incidents.
> For strategic launch steps, see `GO-LIVE-CHECKLIST.md` (repo root). For the launch-loops key-file map, see `docs/launch-shipped-map.md`.

---

## 🔴 Signups Not Working

**Symptoms:** Users report "never got confirmation email" or signup spinner hangs.

**Checklist (in order):**

1. **Resend domain status** → https://resend.com/domains — is `homitechnology.com` verified?
2. **Supabase SMTP settings** → Dashboard → Auth → Emails → SMTP — is custom SMTP enabled and pointing at `smtp.resend.com:465`?
3. **Vercel env** — is `RESEND_API_KEY` set in **Production** (not just Preview)?
4. **Supabase URL Configuration** — is Site URL set to `https://homitechnology.com` and in the redirect allowlist?
5. **Send a test** — sign up with a throwaway Gmail → check spam/promotions → check Resend dashboard "Emails" for delivery status.

**Quick fix:** If Resend is down or misconfigured, Supabase's built-in sender will queue (throttled to ~few/hour) — not a real fix, but confirms the DNS/SMTP path is the issue.

**Kill switch:** There is no safe kill switch for signups; the fix is always restoring email deliverability.

---

## 🔴 Payments Not Processing

**Symptoms:** Checkout button spins, webhook errors in Stripe dashboard, tier not updating after payment.

**Checklist (in order):**

1. **Stripe keys** — is `STRIPE_SECRET_KEY` set to a **live** key (`sk_live_*`)? Test keys (`sk_test_*`) silently fail on live checkout.
2. **Webhook secret** — is `STRIPE_WEBHOOK_SECRET` set and does it match the endpoint registered at `https://homitechnology.com/api/webhooks/stripe`?
3. **Webhook endpoint** — in Stripe Dashboard → Developers → Webhooks, is the endpoint active and subscribed to:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `charge.refunded`
4. **Price IDs** — are `STRIPE_PRICE_PLUS`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_FAMILY` set to live Price IDs (not test ones)?
5. **Vercel function logs** — check `api/webhooks/stripe` for 400/500 errors.

**Quick fix:** Switch back to test mode (`sk_test_*`) and run `npm run stripe-setup` to re-verify the product/price lookup keys.

**Kill switch:** Remove `STRIPE_SECRET_KEY` from Vercel → checkout routes return 503 gracefully, product stays up (no billing).

---

## 🔴 Database Errors on a New Feature

**Symptoms:** 500 on `/shadow-score`, partner portal, advisor chat, or receipt API; Supabase error "relation does not exist."

**Checklist (in order):**

1. **Migrations applied?** — Run `SELECT * FROM information_schema.tables WHERE table_name IN ('partner_codes', 'shadow_shares', 'partner_api_keys', 'receipt_verifications');`
2. **Migration order** — Were migrations applied in numeric order through `00033`? Skipping a migration leaves dependencies broken.
3. **RPC exists?** — `SELECT proname FROM pg_proc WHERE proname = 'try_consume_advisor_message_v2';`
4. **RLS policies** — Did a migration add RLS that blocks the service role? Check Supabase Logs → Auth.

**Quick fix:** Apply the missing migration via Supabase SQL Editor. Every migration file has a `-- ROLLBACK:` block if you need to undo.

**Kill switch:** Restore from the pre-migration backup (see `GO-LIVE-CHECKLIST.md` §2 and `docs/ops/MIGRATIONS-SSOT.md`).

---

## 🟠 CSP Violations Spiking

**Symptoms:** Sentry shows `csp-violation` reports; new third-party script blocked; Plaid/PostHog not loading.

**Checklist (in order):**

1. **Check `/api/csp-report` logs** — what `violated-directive` and `blocked-uri` are reported?
2. **New script?** — Did a recent deploy add a new analytics tag, chat widget, or font loader?
3. **`next.config.ts`** — Is the domain in the `Content-Security-Policy-Report-Only` header allowlist?
4. **Plaid/PostHog specific** — Are their CDN domains still included? (`https://*.plaid.com`, `https://*.posthog.com`)

**Quick fix:** Add the blocked origin to the CSP header in `next.config.ts` → deploy.

**Kill switch:** Rename the header from `Content-Security-Policy-Report-Only` to `Content-Security-Policy` only after the violation stream is clean. If enforcement is breaking users, revert to `Report-Only`.

---

## 🟠 Advisor Spend Spike

**Symptoms:** Anthropic invoice unexpectedly high; LLM cost alerts firing.

**Checklist (in order):**

1. **Anthropic console** — set a workspace spend cap + alert (owner step in `GO-LIVE-CHECKLIST.md` §5)
2. **Upstash rate limiter** — is `UPSTASH_REDIS_REST_URL` set? Without it, limits are per-lambda fiction.
3. **Daily demo budget** — the 5/day demo budget is server-authoritative; check if a partner key is being abused.

**Kill switch:** Unset `ANTHROPIC_API_KEY` in Vercel → Companion falls back to scripted persona replies (no spend), product stays up.

---

## 🟠 Email Storm / Wrong Send

**Symptoms:** Users report duplicate emails; cron sent emails they shouldn't have received.

**Checklist (in order):**

1. **`email_sends` ledger** — the cron is idempotent; a second run sends 0. Check `SELECT COUNT(*) FROM email_sends WHERE created_at > now() - interval '1 hour';`
2. **Cron secret** — is `CRON_SECRET` set? Without it, the cron route 401s (fails closed).
3. **Lifecycle logic** — did a code change alter the send criteria?

**Kill switch:** Unset `CRON_SECRET` → `/api/cron/lifecycle` 401s, no more sends until fixed.

---

## 🟠 Leaked Share or Receipt

**Symptoms:** A user reports their share link or readiness receipt is visible to someone they didn't authorize.

**Checklist (in order):**

1. **Revoke the share** — user can do this in Settings → Share links (propagates instantly)
2. **Revoke a partner key** — if a partner API key was compromised:
   ```sql
   UPDATE partner_api_keys SET revoked_at = NOW() WHERE id = '...';
   ```
3. **Receipts fail closed** — a revoked share returns `410 Gone` at read time.

---

## 🟠 Bad Deploy / General Outage

**Symptoms:** Site 500s, core flows broken after a merge.

**Checklist (in order):**

1. **Vercel Dashboard** → Deployments → find last-known-good → **Instant Rollback** (30 seconds)
2. **Check `/api/healthcheck`** — does it return 200 or 503? A 503 indicates DB or upstream failure.
3. **Sentry** — check for the first error after the bad deploy.

**Prevention:** Note the last-known-good deployment ID in the PR before every merge.

---

## Escalation

| Severity                         | Response                                         |
| -------------------------------- | ------------------------------------------------ |
| 🔴 Revenue or signup path broken | Drop everything; fix immediately                 |
| 🟠 Observable degradation        | Fix within 4 hours; use kill switches if needed  |
| 🟡 Data integrity question       | Halt affected feature; investigate before resume |
| 🟢 Cosmetic / non-urgent         | Ticket for next sprint                           |

---

## Kill-Switch Summary

| Feature           | How to disable                                             |
| ----------------- | ---------------------------------------------------------- |
| Billing           | Remove `STRIPE_SECRET_KEY`                                 |
| AI Advisor        | Remove `ANTHROPIC_API_KEY`                                 |
| Lifecycle emails  | Remove `CRON_SECRET`                                       |
| Rate limiting     | Remove `UPSTASH_REDIS_REST_URL`                            |
| PostHog analytics | Remove `NEXT_PUBLIC_POSTHOG_KEY`                           |
| Web push          | Remove `NEXT_PUBLIC_VAPID_PUBLIC_KEY`                      |
| Receipt signing   | Remove `RECEIPT_SIGNING_SECRET` (receipts return unsigned) |
