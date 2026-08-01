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

⚠ **The sender address is hardcoded, not configurable.** `hello@homitechnology.com`
appears literally in `lib/email/send.ts` (both senders), `lib/email/campaign.ts`
and `app/api/household/invite/route.ts`. The verified Resend domain **must** be
`homitechnology.com` or every transactional send fails at the provider with a
403 — the code has no env override to point somewhere else.

1. **Resend** → add domain `homitechnology.com`, publish the SPF + DKIM DNS
   records it gives you, wait for "Verified." Add a **DMARC** record too
   (`_dmarc.homitechnology.com`, start at `v=DMARC1; p=none; rua=mailto:…`) —
   Gmail and Yahoo require it for bulk senders and it materially affects
   inbox placement.
2. Create a Resend API key → set **`RESEND_API_KEY`** in Vercel (Production +
   Preview). The app talks to Resend's **HTTPS API**, not SMTP — this key is
   what the lifecycle and campaign mail uses.
3. **Supabase Dashboard** → Project → Authentication → Emails → SMTP Settings →
   enable custom SMTP: host `smtp.resend.com`, port `465`, username **`resend`**
   (the literal word — not your email), password = **the same Resend API key**.
   Sender `hello@homitechnology.com`, sender name `HōMI`.
   *This is a separate path from step 2:* Supabase sends the auth mail
   (confirmation, magic link, password reset) over SMTP, while the app sends
   product mail over the API. Both must be configured — doing only one leaves
   either signups or the retention loop broken.
4. Supabase → Authentication → URL Configuration → set **Site URL** to
   `https://homitechnology.com` and add to the redirect allowlist:
   `https://homitechnology.com/**` and `http://localhost:3000/**` (local dev and
   Tier 2 E2E need the localhost entry — see `e2e/README.md`).
5. Supabase → Authentication → Providers/Policies → enable **"Leaked password
   protection" (HaveIBeenPwned)**. This is the one item here that shows up in
   `get_advisors`, so it can be confirmed externally once flipped.

*Verify:* sign up a throwaway address on the live site → confirmation arrives;
complete an assessment → verdict email arrives.

---

## 2. 🟢 Database — schema current, profiles guard repaired and enforcing

**Schema coverage: fine.** A full object-level audit on 2026-07-28 confirmed
**40 of 41** local migrations applied, including everything this section once
listed as pending — `partner_codes`, `shadow_shares`, `partner_api_keys`,
`receipt_verifications`, `try_consume_advisor_message_v2`, the dashboard/campaign
tables, and the whole `00034`–`00039` Path/household range. `00040` was applied
2026-08-01. Evidence: **`docs/ops/MIGRATION-DRIFT-2026-07-28.md`**.

Do **not** run `supabase db push` over the full history — the remote ledger carries
pre-rebuild rows under different version names and a replay would collide. Apply
single files as documented in `docs/ops/MIGRATIONS-SSOT.md`.

### Resolved 2026-08-01 — a privilege escalation live since `00020a`

Verifying `00040` uncovered that the guard it extends **had never enforced
anything**. `guard_profiles_privileged_columns()` was `SECURITY DEFINER` owned by
`postgres`; inside such a function `current_user` is the *owner*, and the body's
first branch exempts `postgres`. So it returned `new` for every caller — the
trigger fired on every UPDATE and waved it through.

`profiles_update_own` places no column restriction on self-updates, so until this
was fixed **any authenticated user could set their own `role = 'admin'`, grant
themselves any `subscription_tier`/`subscription_status`, rewrite
`stripe_customer_id`, and redirect `email`.**

`00041_profile_guard_security_invoker.sql` switched the function to `SECURITY
INVOKER` and was applied 2026-08-01. Post-apply verification against production
(transaction-scoped, rolled back): `role`, `email`, `stripe_customer_id` and
`subscription_tier` self-updates all raise `42501`; `full_name` self-updates,
admin updates through `is_admin()`, and `service_role` writes are unaffected. A
sweep for other `SECURITY DEFINER` functions gating on `current_user` returned
zero rows, so the bug class is confined to this one guard.

**Carry this forward: verify migrations by behaviour, not by object existence.**
The July audit checked that the trigger existed, was `BEFORE UPDATE`, was enabled,
and that its body matched the repo file — all four passed, and the guard was still
inert. The check that works is a rolled-back transaction: `set local role
authenticated` with `request.jwt.claims.sub` set to a real profile id, attempt the
write, assert `42501`.

⚠ `00034_profile_field_locks.sql` must **not** be applied — it would install a
duplicate trigger and its service-context test (`auth.uid() is null`) is weaker
than the allowlist. Note its header's "escalation hole is open" claim turned out to
be *accurate*, though for a different reason than it states. See the drift report.

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
