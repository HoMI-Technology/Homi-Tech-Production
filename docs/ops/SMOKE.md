# Smoke (easy)

## Public (no secrets)

```bash
npm run smoke
```

Hits production: routes, health, scoring.

## Signed-in (2 vars only)

1. Create an account once at https://homitechnology.com/auth/sign-up  
2. Then:

```powershell
$env:SMOKE_EMAIL = "you@example.com"
$env:SMOKE_PASSWORD = "YourPassword1"
npm run smoke:auth
```

That signs in, checks assessment honesty, opens Companion, opens finance.

## Manual (no Playwright)

```bash
npm run smoke:manual
```

## Checkout (optional, later)

Use Stripe **test** mode on a **Preview** URL — not production live keys.  
See `docs/ops/STRIPE-TEST-CHECKOUT.md`.

**Do not** run the full destructive E2E suite (service-role create/delete users) against production.
