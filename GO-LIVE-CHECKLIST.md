# HōMI — Go-Live Checklist

Everything code-side for the launch loops is **done and merged to `main`**
(attribution, shadow-share, receipts API, advisor caps, CSP collector, the
lifecycle email loop + outcome surveys, and the double-send fix). What remains
is **owner-only**: steps that need your accounts, credentials, DNS, or a
payment method. No engineer can do these without your logins. They're ordered
by *what breaks first* under real traffic.

Legend: 🔴 hard launch blocker · 🟠 needed within week one · 🟢 do-soon.

---

## 1. 🔴 Email deliverability — Resend domain + Supabase SMTP

**Why first:** Supabase's built-in email sender is throttled to a few messages
per hour. The moment marketing drives signups, confirmation emails silently
queue and fail — users can't even create accounts. This also gates the entire
retention loop (welcome / verdict / reassessment / outcome-survey emails) that
is already coded and waiting.

1. **Resend** → add domain `homitechnology.com`, publish the SPF + DKIM DNS
   records it gives you, wait for "Verified."
2. Create a Resend API key → set **`RESEND_API_KEY`** in Vercel (Production +
   Preview).
3. **Supabase Dashboard** → Project → Authentication → Emails → SMTP Settings →
   enable custom SMTP, point it at Resend (host `smtp.resend.com`, port 465,
   your Resend SMTP creds). Set the sender to `hello@homitechnology.com`.
4. Supabase → Authentication → URL Configuration → set **Site URL** to
   `https://homitechnology.com` and add it to the redirect allowlist.
5. Supabase → Authentication → Providers/Policies → enable **"Leaked password
   protection" (HaveIBeenPwned)**.

*Verify:* sign up a throwaway address on the live site → confirmation arrives;
complete an assessment → verdict email arrives.

---

## 2. 🔴 Database — schema is current, but the profiles guard does not work

**Schema coverage: fine.** A full object-level audit on 2026-07-28 confirmed
**40 of 41** local migrations applied, including everything this section once
listed as pending — `partner_codes`, `shadow_shares`, `partner_api_keys`,
`receipt_verifications`, `try_consume_advisor_message_v2`, the dashboard/campaign
tables, and the whole `00034`–`00039` Path/household range. `00040` was applied
2026-08-01. Evidence: **`docs/ops/MIGRATION-DRIFT-2026-07-28.md`**.

Do **not** run `supabase db push` over the full history — the remote ledger carries
pre-rebuild rows under different version names and a replay would collide. Apply
single files as documented in `docs/ops/MIGRATIONS-SSOT.md`.

### 🔴 Launch blocker — privilege escalation is live right now

Verifying `00040` uncovered that the guard it extends **has never enforced
anything**. `guard_profiles_privileged_columns()` is `SECURITY DEFINER` owned by
`postgres`; inside such a function `current_user` is the *owner*, and the body's
first branch exempts `postgres`. So it returns `new` for every caller. The trigger
fires on every UPDATE and waves it through — true since `00020a` installed it.

`profiles_update_own` places no column restriction on self-updates, so **any
authenticated user can currently set their own `role = 'admin'`, grant themselves
any `subscription_tier`/`subscription_status`, rewrite `stripe_customer_id`, and
redirect `email`.** Confirmed by a rolled-back probe against production: an
`authenticated` self-update of `email` and `stripe_customer_id` both returned
"1 row" with no exception.

**Fix — `00041_profile_guard_security_invoker.sql`, written and verified, pending apply:**

1. Take a Supabase backup / `db dump` first (there's no staging DB).
2. Apply `supabase/migrations/00041_profile_guard_security_invoker.sql`.
3. Verify enforcement — *behaviour, not existence*. In a transaction you
   `rollback`: `set local role authenticated` with `request.jwt.claims.sub` set to
   a real profile id, then `update profiles set email = …` on that row. It must
   raise `42501`. Checking that the trigger merely exists is what missed this bug.
4. Regression check (same rolled-back transaction): a `full_name` self-update still
   succeeds; a `service_role` write to `email` still succeeds; an admin's own
   `subscription_tier` update still succeeds. All six paths verified pre-apply.

⚠ `00034_profile_field_locks.sql` must **not** be applied — it would install a
duplicate trigger and its service-context test (`auth.uid() is null`) is weaker
than the allowlist. Note its header's "escalation hole is open" claim turned out to
be *accurate*, though for a different reason than it states. See the drift report.

*(`00040` has been applied. `00041` has not — the apply was blocked by a
permission classifier and needs your go-ahead.)*

---

## 3. 🔴 Stripe — real products + live keys

**Why:** billing is fully coded and idempotent but has never processed a live
charge. Prove it in test mode, then go live.

1. `npm run stripe-setup` (or the dashboard) → create the 3 products with the
   **lookup keys** the code maps on: `homi_plus_monthly`, `homi_pro_monthly`,
   `homi_family_monthly`.
2. Register the webhook endpoint `https://homitechnology.com/api/webhooks/stripe`
   → copy its signing secret.
3. Set in Vercel: **`STRIPE_SECRET_KEY`**, **`STRIPE_WEBHOOK_SECRET`**,
   **`STRIPE_PRICE_PLUS/PRO/FAMILY`**.
4. Run one **test-mode** checkout end-to-end (test clock for upgrade/downgrade/
   cancel), confirm the profile tier updates, then swap in live keys.

---

## 4. 🟠 Vercel Pro

Hobby plan prohibits commercial use — upgrade before charging a single card.
15 minutes, Vercel billing.

---

## 5. 🟠 Observability — you can't market blind

- **PostHog:** create a project → set **`NEXT_PUBLIC_POSTHOG_KEY`** (+
  `NEXT_PUBLIC_POSTHOG_HOST` if not US cloud). The funnel events (assessment
  started/completed, verdict shown, checkout started/completed, share created/
  viewed) are already firing — they just need a sink. Optionally
  `POSTHOG_PERSONAL_API_KEY` + `POSTHOG_PROJECT_ID` for the admin dashboard.
- **Sentry:** create a project → set **`SENTRY_DSN`** (server capture is wired).
- **Anthropic:** set a workspace **spend cap + alert** — the last backstop on
  Companion LLM cost.
- **Uptime monitor** (UptimeRobot/BetterStack) on `/api/healthcheck` — it 503s
  honestly on DB failure; nothing is listening yet.

---

## 6. 🟠 Rate limiting + cron + receipts secrets

- **Upstash Redis:** create a DB → **`UPSTASH_REDIS_REST_URL`** +
  **`UPSTASH_REDIS_REST_TOKEN`**. Until set, rate limits are per-lambda only.
- **`CRON_SECRET`:** set it (Vercel Cron sends it as a Bearer token; the cron
  routes fail closed without it, so the reassessment + outcome-survey emails
  won't run until it's present).
- **`RECEIPT_SIGNING_KEY`:** set it so partner receipts are signed (unsigned
  otherwise). Mint partner keys with `node scripts/mint-partner-key.mjs "<Org>"`.
- **`EMAIL_UNSUBSCRIBE_SECRET`**, **`INTERNAL_API_SECRET`:** set to random 32-byte
  values (`openssl rand -base64 32`).
- **Web push** (optional, powers outcome-survey push): `VAPID_PUBLIC_KEY` /
  `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` + `NEXT_PUBLIC_VAPID_PUBLIC_KEY`.

---

## 7. 🟢 Plaid production (bank sync — Plus-gated, not launch-critical)

Plaid production approval takes weeks + a security questionnaire — start now if
bank sync matters for launch. Set `PLAID_CLIENT_ID` / `PLAID_SECRET` /
`PLAID_ENV=production` / `PLAID_TOKEN_KEY` (a base64 32-byte key). Until then the
connect UI stays gracefully disabled.

---

## 8. 🟢 GitHub + ops hygiene

- Branch protection on `main`: require the **`verify`** status check (it's the
  gating one; `lighthouse` is informational — see §9).
- A `support@homitechnology.com` inbox.
- Note the last-known-good Vercel deployment before each release (Instant
  Rollback is your undo).

---

## 9. Known code-side follow-up (not a blocker): Lighthouse LCP

The mobile Lighthouse check reports **LCP ~3.7s** on `/`, `/shadow-score`,
`/tools/mortgage`. Investigated this session:

- **CLS is now fixed** (0.33 → ~0.00) and the off-message welcome toast no longer
  covers the funnel.
- The **observed** LCP is **195–958ms** — real users get a fast page. The ~3.7s
  is Lighthouse's *Lantern simulation* estimate, which models these
  dynamically-rendered App-Router routes' largest paint as gated behind the JS/
  RSC chain on simulated slow-4G.
- It does **not** block merges (the `verify` check is the required one; this
  team has been merging past the Lighthouse check).

To actually turn the check green later needs a dedicated pass: reduce critical
JS on these routes (RSC prefetch trimming, deferring the advisor-history fetch),
or make the landing hero lighter, or point LHCI at a Vercel preview with real
(not simulated) throttling. Not required to launch — real-world CWV is fine.

---

## The one-line priority

**§1 (email) → §2 (migrations) → §3 (Stripe) unblock "have users who can sign
up, get emails, and pay."** Everything else is week-one hardening. When §1–§3
are done, you can start marketing.
