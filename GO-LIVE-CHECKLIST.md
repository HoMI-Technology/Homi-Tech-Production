# HōMI — Go-Live Checklist

Everything code-side for the launch loops is **done and merged to `main`**
(attribution, shadow-share, receipts API, advisor caps, CSP collector, the
lifecycle email loop + outcome surveys, and the double-send fix). What remains
is **owner-only**: steps that need your accounts, credentials, DNS, or a
payment method. No engineer can do these without your logins. They're ordered
by _what breaks first_ under real traffic.

Legend: 🔴 hard launch blocker · 🟠 needed within week one · 🟢 do-soon.

---

## ⏱ STATUS — externally verified 2026-08-11

**Only two items remain before HōMI can take a paying customer.** Everything else
below was confirmed done by direct inspection of the live dashboards, not by
reading this file. Re-verify before trusting; dashboards change.

### 🔴 Remaining — both are owner-only, ~20 minutes total

1. **Vercel is still on the Hobby plan** (§4). The badge on the `homi-platform`
   project reads "Hobby." Hobby **prohibits commercial use** and live Stripe
   subscriptions are wired, so the first paying customer puts the project in
   breach and at risk of suspension. Usage already sat at **1h29m of the 4h
   monthly CPU allowance with near-zero traffic** — real traffic exhausts it.
   _Upgrade before sending anyone to the site._
2. **Supabase leaked-password protection is disabled** (§1.5). One toggle:
   Authentication → Policies → enable HaveIBeenPwned. Confirmable externally via
   `get_advisors` — it is the only auth item that still reports.

### ✅ Verified done (2026-08-11)

| Item                   | Evidence                                                                       |
| ---------------------- | ------------------------------------------------------------------------------ |
| Resend domain (§1)     | `homitechnology.com` **Verified**, us-east-1, added ~2026-07-19                |
| DNS (§1)               | DKIM `resend._domainkey`, bounce MX `send.` → SES, SPF, DMARC `p=quarantine`   |
| Email actually sending | Real **Delivered** sends: "Welcome to HōMI", "Reset your password"             |
| Supabase SMTP (§1.3)   | Proven by the delivered auth mail — Supabase sends those, not the app          |
| Stripe activation (§3) | Account status: **no active tasks**; Payments + Payouts + ACH + Link active    |
| Stripe products (§3)   | Plus $9.99 / Pro $24.99 / Family $39.99, all active                            |
| Stripe env vars (§3)   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_{PLUS,PRO,FAMILY}` |
| Observability (§5)     | PostHog (key/host/project/API) + Sentry (DSN/org/project/auth token) all set   |
| `CRON_SECRET` (§6)     | Present in Production and Preview — crons are **not** silently dead            |
| Deploy integrity       | `/api/healthcheck` version matched `main` tip exactly; DB ok                   |

### 🟡 Noted, not blocking

- Supabase advisors flag 6 `SECURITY DEFINER` functions as anon-callable
  (`get_org_assessment_summary`, `partner_code_stats`, `partner_recent_assessments`,
  …). **All three inspected have internal `auth.uid()` / membership guards** — anon
  gets an empty result. The lint fires only because Postgres grants EXECUTE to
  PUBLIC by default and the migrations never revoked it. Tidy when convenient;
  do not treat as a leak.
- The 7 "RLS enabled, no policy" notices are the intended pattern for
  service-role-only tables (`webhook_events`, `campaign_sends`, …): RLS on with no
  policy denies everyone. Not a finding.
- Still unverified because it needs a real card: an end-to-end live checkout.
  Stripe shows **zero payments** to date.

---

## 1. ✅ Email deliverability — DONE (verified 2026-08-11)

_Domain Verified in Resend, DNS correct, and real mail confirmed **Delivered** —
both product mail (welcome) and Supabase auth mail (password reset), which proves
steps 1–4 below. **Step 1.5 (leaked-password protection) is the exception and is
still open.** Keep the rest for reference / re-setup._

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
   _This is a separate path from step 2:_ Supabase sends the auth mail
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

_Verify:_ sign up a throwaway address on the live site → confirmation arrives;
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
`postgres`; inside such a function `current_user` is the _owner_, and the body's
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
be _accurate_, though for a different reason than it states. See the drift report.

---

## 3. ✅ Stripe — DONE (verified 2026-08-11)

_Account fully activated (Payments, Payouts, ACH, Link — no outstanding tasks), all
three products live at the canon prices, and all five env vars present in Production
and Preview. Untested only in the sense that no live card has been charged yet._

**Why:** billing is fully coded and idempotent but has never processed a live
charge.

### ✅ Verified against the live account 2026-08-01

Steps 1 and 2 are **done**, and confirmed by behaviour rather than by assumption:

- **Products + prices** — `npm run stripe-verify` → all three match
  `lib/stripe/tiers.ts`: Plus $9.99, Pro $24.99, Family $39.99, all usd,
  monthly, livemode. Note `stripe-setup` alone does **not** prove this: it
  matches on `lookup_key` and reuses whatever price it finds, whatever the
  amount. Re-run the verifier, not just setup.
- **Webhook** — `npm run stripe-verify-webhook` → one endpoint,
  `https://homitechnology.com/api/webhooks/stripe`, enabled, subscribed to
  exactly the four events the route handles and nothing stale.

Live price IDs (not secret):

```
STRIPE_PRICE_PLUS=price_1TuckuJ1m2RNwf578nHi371A
STRIPE_PRICE_PRO=price_1Tucm3J1m2RNwf57OWIpBfna
STRIPE_PRICE_FAMILY=price_1TucnIJ1m2RNwf57R4hoO06T
```

### 🔴 Remaining

1. Set all five in Vercel, **Production and Preview**: the three price IDs
   above plus `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
2. Run one **test-mode** checkout end-to-end (test clock for upgrade/downgrade/
   cancel) and confirm the profile tier updates, before taking a real charge.

---

## 4. 🔴 Vercel Pro — STILL OPEN (verified 2026-08-11)

Hobby plan prohibits commercial use — upgrade before charging a single card.
15 minutes, Vercel billing.

**Confirmed still on Hobby on 2026-08-11.** Promoted 🟠 → 🔴: this is no longer a
week-one item, it is the last hard blocker. Live Stripe subscriptions are already
wired, so the first payment lands the project in breach of Vercel's terms. Usage
was at 1h29m of the 4h monthly CPU allowance on effectively no traffic.

---

## 5. ✅ Observability — DONE (verified 2026-08-11)

_All keys below are set in Vercel Production + Preview. Remaining sub-items are the
Anthropic spend cap and the uptime monitor, neither of which is externally checkable._

- **PostHog:** create a project → set **`NEXT_PUBLIC_POSTHOG_KEY`** (+
  `NEXT_PUBLIC_POSTHOG_HOST` if not US cloud). The funnel events (assessment
  started/completed, verdict shown, checkout started/completed, share created/
  viewed) are already firing — they just need a sink. Optionally
  `POSTHOG_PERSONAL_API_KEY` (needs the "query" read scope) +
  `POSTHOG_PROJECT_ID` for the admin dashboard.
- **Sentry:** create a project → set **`SENTRY_DSN`** (server capture is wired).
- **Anthropic:** set a workspace **spend cap + alert** — the last backstop on
  Companion LLM cost.
- **Uptime monitor** (UptimeRobot/BetterStack) on `/api/healthcheck` — it 503s
  honestly on DB failure; nothing is listening yet.

---

## 6. 🟠 Rate limiting + cron + receipts secrets

- **Upstash Redis:** create a DB → **`UPSTASH_REDIS_REST_URL`** +
  **`UPSTASH_REDIS_REST_TOKEN`**. Until set, rate limits are per-lambda only.
- **`CRON_SECRET`:** ✅ **set** (verified 2026-08-11 — present in Production and
  Preview). Vercel Cron sends it as a Bearer token; the cron routes fail closed
  without it, so the reassessment + outcome-survey emails would not run. They can.
  Upstash and the remaining secrets in this section were **not** re-verified.
- **`RECEIPT_SIGNING_SECRET`:** set it so partner receipts are signed (unsigned
  otherwise). Mint partner keys with `node scripts/mint-partner-key.mjs "<Org>"`.
  ⚠ The name is `..._SECRET`. `RECEIPT_SIGNING_KEY` is the old name, is read by
  nothing (`lib/receipts/index.ts:85` reads `RECEIPT_SIGNING_SECRET`), and is
  currently set in Vercel where it does nothing. Setting only the old name leaves
  receipts unsigned and reports no error. As of 2026-08-01 `RECEIPT_SIGNING_SECRET`
  is set in **Production only** — Preview deployments return unsigned receipts.
- **`EMAIL_UNSUBSCRIBE_SECRET`**, **`INTERNAL_API_SECRET`:** set to random 32-byte
  values (`openssl rand -base64 32`).
- **Web push** (optional, powers outcome-survey push): generate a key pair with
  `npx web-push generate-vapid-keys`, then set `VAPID_PUBLIC_KEY` /
  `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT=mailto:hello@homitechnology.com` +
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`. All push code is inert until these are set.

---

## 7. 🟢 Plaid production (bank sync — Plus-gated, not launch-critical)

Plaid production approval takes weeks + a security questionnaire — start now if
bank sync matters for launch. Set `PLAID_CLIENT_ID` / `PLAID_SECRET` /
`PLAID_ENV=production` / `PLAID_TOKEN_KEY` (a base64 32-byte key). Until then the
connect UI stays gracefully disabled.

---

## 8. 🟢 GitHub + ops hygiene

- Branch protection on `main`: require the **`verify`** status check. `verify`
  now runs Lighthouse CI (`npx lhci autorun`) against the existing
  `lighthouserc.json` / `lighthouse-budget.json` budgets, so a script/a11y
  budget break blocks merge. The standalone `lighthouse.yml` workflow remains
  for manual/auth dashboard runs — see §9.
- A `support@homitechnology.com` inbox.
- Note the last-known-good Vercel deployment before each release (Instant
  Rollback is your undo).
- Enable GitHub Advanced Security (CodeQL, secret scanning) and Dependabot.

**Post-launch (no deadline):** marketing funnel analysis via PostHog; a customer
support playbook; pre-register the outcome metrics for the 30/90/365-day survey
moat (purchase completion, regret score, financial-stress delta) so the eventual
cohort study is credible rather than retro-fitted.

---

## 9. Lighthouse gate (merge-blocking) + LCP follow-up

**Merge-blocking today (inside `verify`):** LHCI asserts the existing §11
budgets — notably `resource-summary:script:size` ≤ 368640 (error) and
accessibility ≥ 0.95 (error). Soft `warn` thresholds (perf score, LCP, TBT)
do not fail the job. Public URLs include the acquisition funnel (`/assessment`,
`/results`) plus marketing/tools routes in `lighthouserc.json`. `/money` stays
auth-gated and is covered by the optional dashboard LHCI config when
`LHCI_TEST_*` secrets are set.

**LCP follow-up (warn-only, not a merge blocker):** mobile Lighthouse still
reports LCP ~3.7s on `/`, `/shadow-score`, `/tools/mortgage` under Lantern
simulation, while observed real-user LCP is 195–958ms. A dedicated pass can
trim critical JS or point LHCI at a Vercel preview with real throttling —
real-world CWV is fine for launch.

---

## The one-line priority

~~**§1 (email) → §2 (migrations) → §3 (Stripe)**~~ — **all three are done as of
2026-08-11.**

**The list is now two items: upgrade Vercel off Hobby (§4), and flip Supabase
leaked-password protection (§1.5).** Both are owner-only, roughly 20 minutes
together. Nothing else stands between HōMI and a paying customer.

Do §4 _before_ the first customer, not after — charging a card on a Hobby plan
breaches Vercel's non-commercial terms.
