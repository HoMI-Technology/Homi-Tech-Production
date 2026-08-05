# Stripe test-mode checkout runbook

**Goal:** Prove Plus / Pro / Family checkout updates the user tier before taking real cards.

**Truth source for amounts:** `lib/stripe/tiers.ts`

| Tier | lookup_key | Expected USD / mo |
|------|------------|-------------------|
| Plus | `homi_plus_monthly` | $9.99 |
| Pro | `homi_pro_monthly` | $24.99 |
| Family | `homi_family_monthly` | $39.99 |

**Webhook URL (must exist and be enabled):**  
`https://homitechnology.com/api/webhooks/stripe`

**Required events:**

- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## 0. Safety: test vs live keys

| Key prefix | Mode |
|------------|------|
| `sk_test_…` / `whsec_…` (test) | Safe sandbox |
| `sk_live_…` | Real money |

**Vercel Production today is expected to hold live keys** (commercial path). Do **not** point Production at test keys long-term.

**Recommended dry-run options (pick one):**

### Option A — Preview deploy with test keys (safest)

1. Stripe Dashboard → toggle **Test mode** ON.  
2. Developers → API keys → copy **Secret key** (`sk_test_…`).  
3. Developers → Webhooks → add endpoint:  
   `https://<your-preview>.vercel.app/api/webhooks/stripe`  
   (or use Stripe CLI — Option B). Subscribe to the four events above. Copy signing secret.  
4. Vercel → Project → Settings → Env → set **Preview** only:  
   - `STRIPE_SECRET_KEY` = test secret  
   - `STRIPE_WEBHOOK_SECRET` = test webhook secret  
   - Price IDs: either re-run `npm run stripe-setup` with test key, or create matching prices in test mode with the same `lookup_key`s, then set:  
     - `STRIPE_PRICE_PLUS` / `PRO` / `FAMILY`  
5. Open the **Preview** URL (not production) for the checkout test.

### Option B — Stripe CLI forward (local)

```bash
# From repo root, with test secret in env
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the whsec_… it prints into .env.local as STRIPE_WEBHOOK_SECRET
npm run dev
```

Use `sk_test_…` in `.env.local` + test price IDs.

### Option C — Production live mode smoke (real card, small risk)

Only after Vercel **Pro** and you accept a real $9.99 charge + immediate cancel/refund. Prefer A or B first.

---

## 1. Machine verify (read-only scripts)

Sensitive Vercel env vars cannot be pulled by CLI. Paste keys into a local shell session only:

```powershell
cd ~/Desktop/kimi-workspace/projects/homi-tech-production

$env:STRIPE_SECRET_KEY = "sk_test_..."   # or sk_live_ for prod audit
# optional if scripts need them:
# $env:STRIPE_PRICE_PLUS = "price_..."

npm run stripe-verify
npm run stripe-verify-webhook
```

**Pass criteria:**

- `stripe-verify`: each lookup_key exists, amount matches tiers.ts, currency `usd`, recurring monthly.  
- `stripe-verify-webhook`: one enabled endpoint at `https://homitechnology.com/api/webhooks/stripe` with the four events (live audit). For test mode, endpoint URL may be preview/CLI.

---

## 2. Browser checkout (happy path)

1. Open the app (Preview URL for test mode, or production for live).  
2. **Sign up / sign in** with a throwaway account.  
3. Go to **Pricing** → choose **Plus** ($9.99).  
4. Stripe Checkout card (test mode):

   | Field | Value |
   |-------|--------|
   | Card | `4242 4242 4242 4242` |
   | Expiry | any future date |
   | CVC | any 3 digits |
   | ZIP | any |

5. Complete payment → land back on success / account page.  
6. **Verify tier:**

   - In app: settings / plan shows **Plus** (or equivalent).  
   - Supabase → `profiles` row for that user: `subscription_tier` / `subscription_status` updated; `stripe_customer_id` set.  
   - Stripe Dashboard (same mode) → Customers → subscription **active**.  
   - Stripe → Developers → Webhooks → recent delivery **2xx** for `checkout.session.completed`.

7. Repeat once for **Pro** or **Family** if you want packaging confidence (optional).

---

## 3. Failure / cancel paths (15 more minutes)

### Cancel subscription

1. Stripe Customer portal or Dashboard → cancel subscription (at period end or immediately).  
2. Confirm webhook `customer.subscription.deleted` (or updated) fires.  
3. Profile returns to free / non-paid tier.

### Failed payment (test)

1. Use decline card `4000 0000 0000 0341` (generic decline) on a new checkout, **or** attach it and advance a test clock if you use clocks.  
2. Confirm `invoice.payment_failed` is accepted (2xx) and app does not grant paid access.

### Webhook secret mismatch

- Symptoms: Stripe retries, 400 on webhook, tier never updates after successful Checkout.  
- Fix: Vercel `STRIPE_WEBHOOK_SECRET` must match the endpoint’s signing secret in the **same** mode (test vs live).

---

## 4. Production go-live gate

Do **not** market paid plans until all of these are true:

- [ ] Vercel team is **Pro** (not Hobby)  
- [ ] Production env has live `STRIPE_SECRET_KEY`, three price IDs, `STRIPE_WEBHOOK_SECRET`  
- [ ] `npm run stripe-verify` + `stripe-verify-webhook` pass against **live** key  
- [ ] At least one full test-mode checkout + cancel proven  
- [ ] Optional: one live $9.99 charge on a real card you control, then refund  

---

## 5. Quick troubleshooting

| Symptom | Check |
|---------|--------|
| Checkout 500 / “not configured” | Missing price env or secret on that environment |
| Paid in Stripe, free in app | Webhook URL, secret, or event list |
| Wrong dollar amount | Price reused by lookup_key at old amount — run `stripe-verify`, create new price if needed |
| Preview works, prod doesn’t | Different env vars; live webhook only on prod URL |
| Double charges in test | Multiple open Checkout sessions — ignore extras in test mode |

---

## 6. Commands cheat sheet

```powershell
# From repo, after setting STRIPE_SECRET_KEY in the shell:
npm run stripe-verify
npm run stripe-verify-webhook

# Optional: ensure prices exist (idempotent by lookup_key — still run verify after)
npm run stripe-setup
```
