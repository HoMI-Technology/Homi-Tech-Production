# Owner go-live checklist (money / marketing)

Do these **on dashboards** — not by an agent. Product code is live; commercial path needs your keys and DNS.

Check off as you go. Source docs linked.

---

## 1. Vercel Pro (before real card volume)

- [ ] Vercel → project **homi-platform** → Settings → Billing / Plan  
- [ ] Upgrade to **Pro** (Hobby is fine for Preview-only testing)  
- [ ] Confirm production domain still points at the project  

---

## 2. Resend DNS (email delivery)

Full detail: [`EMAIL-RESEND-DNS.md`](./EMAIL-RESEND-DNS.md)

- [ ] Resend → Domains → add **homitechnology.com**  
- [ ] Add **DKIM** (+ SPF include Resend) in GoDaddy exactly as Resend shows  
- [ ] Wait for Resend “Verified”  
- [ ] Keep Google MX for human mail; do not replace Workspace MX with Resend  
- [ ] Confirm `RESEND_API_KEY` is set on Vercel **Production**  
- [ ] Send a test (sign-up or password reset) and open the message  

**From address in code:** `HōMI <hello@homitechnology.com>` (must match verified domain).

---

## 3. Stripe (test first, then live)

Full detail: [`STRIPE-TEST-CHECKOUT.md`](./STRIPE-TEST-CHECKOUT.md)

### 3a. Test mode (safe)

- [ ] Stripe → **Test mode** ON  
- [ ] Prices with lookup keys: `homi_plus_monthly` ($9.99), `homi_pro_monthly` ($24.99), `homi_family_monthly` ($39.99)  
- [ ] Vercel **Preview** env: `STRIPE_SECRET_KEY` (sk_test), `STRIPE_WEBHOOK_SECRET`, price IDs  
- [ ] Webhook to Preview URL `/api/webhooks/stripe` (or `stripe listen` locally)  
- [ ] Browser: Preview → sign in → Pricing → Plus → card `4242 4242 4242 4242`  
- [ ] Confirm profile tier becomes `plus` after return  

```powershell
# Optional machine check (paste test secret in shell only)
$env:STRIPE_SECRET_KEY = "sk_test_..."
npm run stripe-verify
```

### 3b. Live mode (after Pro + successful test)

- [ ] Stripe **Live** prices with same lookup_keys  
- [ ] Vercel **Production**: live `STRIPE_*` + webhook `https://homitechnology.com/api/webhooks/stripe`  
- [ ] Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`  
- [ ] Optional tiny live charge + cancel/refund  

---

## 4. Security hygiene

- [ ] Rotate any password used in chat/smoke (e.g. `info@homitechnology.com`)  
- [ ] Confirm service-role key never in client / `NEXT_PUBLIC_*`  
- [ ] Close issue #144 when seats 1–3 are done  

---

## 5. Smoke after each change

```powershell
npm run smoke
# optional signed-in UI:
$env:SMOKE_EMAIL = "you@example.com"
$env:SMOKE_PASSWORD = "…"
npm run smoke:auth
```

---

## Done when

1. Email delivers from `hello@homitechnology.com`  
2. Test checkout upgrades tier on Preview  
3. Production on Vercel Pro  
4. Live webhook configured (before marketing paid traffic)  
