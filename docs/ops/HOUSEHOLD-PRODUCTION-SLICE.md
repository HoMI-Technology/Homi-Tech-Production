# Household production slice

**Profile:** `next-supabase-vercel`  
**Journey:** Signed-in Family-tier user creates a household, invites a partner
by email, and the partner accepts the token to join.  
**Date:** 2026-08-12

## Gate files (this slice)

| Gate | Evidence on disk |
| ---- | ---------------- |
| G1 | `components/household/HouseholdJointPanel.tsx` — empty / error / success |
| G2 | labeled name, email, display-name fields; `.input` focus ring |
| G3 | `app/api/household/{route,invite,accept}/route.ts` + Zod |
| G4 | `supabase/migrations/00039_households.sql` + `20260802000001_*` + `20260805000001_*` |
| G5 | `app/auth/sign-{up,in,out}` + `@supabase/ssr` cookies |
| G6 | owner-only invite; RLS ownership in the household migrations |
| G7 | `.env.example` — `SUPABASE_SERVICE_ROLE_KEY` is not `NEXT_PUBLIC_` |
| G8 | `__tests__/household-{create,invite,accept}.route.test.ts` |
| G9 | `lib/observe/*` + `docs/ops/HOUSEHOLD-ONCALL.md` |
| G10 | `.github/workflows/ci.yml` `verify` job |
| G11 | `DEPLOY.md` — Vercel `homi-platform`, smoke URL `https://homitechnology.com` |
| G12 | `docs/ops/HOUSEHOLD-ROLLBACK.md` |
| G13 | n/a — not going live this turn (owner ops stay in `GO-LIVE-CHECKLIST.md`) |
| G14 | this file |

## G14 deferrals (2026-08-12)

- **Live Resend delivery** — invite still returns a shareable `acceptUrl` when
  `RESEND_API_KEY` is unset (`emailSent: "unconfigured"`). Trigger: owner
  finishes `docs/ops/EMAIL-RESEND-DNS.md`.
- **Browser e2e of the full two-account accept** — covered at the authz
  boundary by route tests; Playwright two-inbox flow waits on live E2E
  service-role secrets.
- **Couples Alignment / Family Mode tabs** — not this journey.
- **Owner go-live** (custom domain DNS, Stripe live keys, Vercel Pro) —
  `GO-LIVE-CHECKLIST.md`. Not this turn.
- **Free/Plus/Pro users inviting** — server 402 `household_locked` is
  intentional (Family entitlement).
