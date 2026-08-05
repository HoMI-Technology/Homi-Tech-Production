# HōMI monthly subscription — signup & manage map

All paid plans are **monthly**: Plus $9.99 · Pro $24.99 · Family $39.99  
Source of truth: `lib/stripe/tiers.ts` · Stripe lookup keys `homi_*_monthly`.

---

## User journeys

### A. New visitor → paid (primary)

```
/pricing  →  Start Plus/Pro/Family
    ↓ 401
/auth/sign-in?next=/pricing  or  /auth/sign-up?next=/pricing
    ↓
POST /api/checkout { tier }
    ↓
Stripe Checkout (subscription)
    ↓ success
/settings/subscription?upgraded=1
    ↓ webhook checkout.session.completed
profiles.subscription_tier + stripe_customer_id set
```

### B. Signed-in free user → paid

```
Account menu → Subscription
  or  Settings → Choose a plan
  or  /pricing
    ↓
/settings/subscription  →  Start <tier>
    ↓
POST /api/checkout { tier, source: "subscription" }
    ↓
Stripe Checkout → /settings/subscription?upgraded=1
```

### C. Paid user → change plan / payment method / cancel

```
/settings/subscription  →  Manage billing  /  Upgrade in billing
    ↓
POST /api/billing/portal
    ↓
Stripe Customer Portal (plan switch + cancel + payment method)
    ↓ return
/settings/subscription
    ↓ webhooks subscription.updated / deleted
profiles.subscription_tier / status updated
```

### D. Free acquisition (no pay)

```
/shadow-score  ·  /assessment  ·  sign-up → /onboarding
```

---

## Pages & APIs

| Surface | Path | Auth | Role |
|---------|------|------|------|
| Public pricing | `/pricing` | public | Start paid CTAs |
| Subscription hub | `/settings/subscription` | **required** | View plan, upgrade, manage |
| Settings summary | `/settings` | required | Badge + links into hub |
| Checkout API | `POST /api/checkout` | required | Creates Checkout session |
| Portal API | `POST /api/billing/portal` | required + `stripe_customer_id` | Customer Portal session |
| Webhook | `POST /api/webhooks/stripe` | Stripe sig | Tier sync |

### Account chrome

- App header account menu: **Settings**, **Subscription**
- Command palette: **Settings**, **Manage subscription**

---

## Checkout details

- `client_reference_id` = Supabase user id (webhook requires this)
- Reuses `profiles.stripe_customer_id` when present; else pre-fills `customer_email`
- Success → `/settings/subscription?upgraded=1` (hub **polls entitlements** until tier is paid or 30s timeout)
- Cancel → `/pricing` or `/settings/subscription` depending on `source`
- Promotion codes allowed
- **409 `already_subscribed`** when `subscription_tier` is paid and status is active-like
  (`active|trialing|cancelling|past_due|unpaid|incomplete`). Client must open
  Customer Portal (or `/settings/subscription`), not a second Checkout.
- Pricing CTAs: 409 → portal; `configured:false` → honest error (no fake waitlist);
  other failures surface the server message

---

## Portal setup (ops)

After creating products/prices:

```bash
STRIPE_SECRET_KEY=sk_live_... node scripts/ensure-stripe-billing-portal.mjs
```

Enables plan updates (proration), cancel at period end, payment method update, invoice history, and attaches the three HōMI products.

---

## Gaps intentionally not built

| Item | Why |
|------|-----|
| Annual plans | Product only ships monthly today |
| In-app payment form | Stripe Checkout / Portal own PCI |
| Family member seat UI beyond household | Separate household invite product |
| B2B partner/employee “subscribe” | Different commercial motion |

---

## QA checklist

- [ ] Anonymous on `/pricing` → Start Plus → lands on sign-in → after login checkout works  
- [ ] Free user on `/settings/subscription` → Start Pro → Checkout → success banner  
- [ ] Paid user → Manage billing → change to Family → webhook updates tier  
- [ ] Paid user → cancel in portal → period end / free after delete webhook  
- [ ] `npm run stripe-verify` + `stripe-verify-webhook` green on live  
