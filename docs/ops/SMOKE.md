# Smoke (easy)

KEEP-only. DARK product URLs (`/assessment`, `/pricing`, `/dashboard`, tools, …)
are not CORE — they fold to `/`. Do not chase a full-product walk.

Public default target is production. Override with `SMOKE_BASE_URL`.

## Public (no secrets)

```bash
npm run smoke
```

Hits KEEP pages (`/`, `/waitlist`, KEEP legal, `/auth/sign-in`, `/auth/sign-up`)
and KEEP `/api/healthcheck`. Does not POST `/api/scoring` (DARK).

## Signed-in (2 vars only)

1. Create an account once at https://homitechnology.com/auth/sign-up
2. Then:

```powershell
$env:SMOKE_EMAIL = "you@example.com"
$env:SMOKE_PASSWORD = "YourPassword1"
npm run smoke:auth
```

That runs `e2e/auth-smoke.e2e.ts`: sign-in lands on `/`; `/assessment`, `/tools`,
`/finance` stay KILL → `/`.

If Chromium is blocked: install Chrome, or set `$env:PLAYWRIGHT_CHANNEL = "msedge"`,
or use `npm run smoke:manual`. Do not treat a DARK API round-trip as CORE.

## Manual (no Playwright)

```bash
npm run smoke:manual
```

## Checkout (optional, later)

Use Stripe **test** mode on a **Preview** URL — not production live keys.
`/pricing` is KILL until that surface is re-opened. See `docs/ops/STRIPE-TEST-CHECKOUT.md`.

**Do not** run the full destructive E2E suite (service-role create/delete users) against production.
