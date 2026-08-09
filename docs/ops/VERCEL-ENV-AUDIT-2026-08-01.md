# Vercel environment variable audit

**Date:** 2026-08-01
**Project:** `homi-platform` (`prj_LSgxv4XcVDWEQVvvMzmelruM7Xtb`, team `homi-tech`)
**Method:** every `process.env.*` read in the codebase, diffed against
`vercel env ls`. Values were never read — only names and which environments
carry them.

## Headline

Nothing is missing that blocks launch, and **all five Stripe variables were
already set** in Production _and_ Preview two weeks ago — §3's env step was
done before today. What the diff exposes instead is drift: one variable set
under a dead name, several server secrets absent from Preview, and 20 variables
in Production that no code reads.

## 1. Set under the wrong name — receipts are unsigned

`lib/receipts/index.ts:85` reads **`RECEIPT_SIGNING_SECRET`**.

- `RECEIPT_SIGNING_KEY` is set in Vercel (Preview + Production) and is read by
  **nothing**. `lib/agents/registry.ts:300` records that it was deliberately
  removed.
- `.env.example` and `GO-LIVE-CHECKLIST.md` both documented the dead name. Fixed
  in the same commit as this audit.
- `RECEIPT_SIGNING_SECRET` is set in **Production only**, so **Preview
  deployments return unsigned receipts** (`signature: null`).

Failure mode is silent: no error, receipts simply aren't signed.

## 2. Read by code, absent from Vercel entirely

Grouped by whether it matters for launch.

| Variable                                                             | Consequence                                                                                     | Checklist                    |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------- |
| `SENTRY_DSN`                                                         | Sentry never initialises — no error capture in production                                       | §5                           |
| `POSTHOG_PERSONAL_API_KEY`, `POSTHOG_PROJECT_ID`                     | `/admin/analytics` renders a setup guide instead of the dashboard                               | §5                           |
| `EMAIL_UNSUBSCRIBE_SECRET`                                           | **Degrades safely** — falls back to `INTERNAL_API_SECRET`, which is set. Unsubscribe links work | §6                           |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web push inert; outcome-survey nudges are email-only                                            | §6                           |
| `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV`, `PLAID_TOKEN_KEY`    | Bank sync disabled                                                                              | §7 (🟢, not launch-critical) |
| `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED`                                   | "Continue with Google" button hidden                                                            | intentional                  |

`E2E_*`, `LHCI_*`, `ARCHITECTURE_WRITE`, `GEMINI_API_KEY`, `GOOGLE_API_KEY` are
local/CI-only and correctly absent from the project settings.

## 3. In Production but not Preview

Preview deployments therefore behave differently from production:

| Variable                            | Effect on preview builds                                                                                                                                         |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY`         | Service-role paths dead — webhooks, crons, admin. `docs/archive/BUILD-BRIEF.md:116` calls this out explicitly as a thing to fix                                  |
| `RECEIPT_SIGNING_SECRET`            | Unsigned receipts (see §1)                                                                                                                                       |
| `NEXT_PUBLIC_SITE_URL`              | ✅ **fixed in code** — `lib/env.ts` now falls back to the deployment's own `VERCEL_URL` on preview builds, so a preview stays self-consistent. No env var needed |
| `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` | No analytics from previews — probably intentional                                                                                                                |
| `ADMIN_EMAILS`, `ADMIN_REQUIRE_MFA` | Admin hardening off on previews — probably intentional                                                                                                           |

The first three are worth fixing. The rest are defensible as-is.

## 4. Set in Vercel, read by nothing (20) — 19 removed 2026-08-01

**Status: cleaned up and re-verified.** All 19 listed below were removed from
Production and a re-run of the diff confirms only `OPENAI_API_KEY` remains, held
back deliberately because deleting the variable does not revoke the key.

Before removing, each was checked against `next.config.ts`, `middleware.ts`,
`vercel.json`, `instrumentation.ts`, the Sentry configs and every CI workflow —
none was referenced outside the `process.env` scan.

Dead configuration. Each is a small maintenance tax and, for the credentials, an
unnecessary exposure surface.

**Credential worth removing and revoking:**

- **`OPENAI_API_KEY`** — a live third-party credential sitting in Production that
  no code path reads. The codebase uses `ANTHROPIC_API_KEY`. Remove from Vercel
  _and_ revoke it at OpenAI; deleting the variable alone leaves the key valid.

**Legacy `DATABASE_*` duplicates of the `SUPABASE_*` variables** — the app reads
only the `SUPABASE_*` / `NEXT_PUBLIC_SUPABASE_*` names:
`DATABASE_ANON_KEY`, `DATABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`,
`NEXT_PUBLIC_DATABASE_ANON_KEY`, `NEXT_PUBLIC_DATABASE_URL`

**Salts read by nothing:** `MFA_RECOVERY_SALT`, `PARTNER_API_KEY_SALT` —
checked, and these are **dead config, not disconnected wiring**. Neither name
appears anywhere in `lib/`, `app/` or `scripts/`. Partner keys are hashed with
unsalted SHA-256 in `scripts/mint-partner-key.mjs:23` and
`lib/receipts/index.ts:25`, which is deliberate: `lib/security.ts:7` notes that
salting/stretching is unnecessary for high-entropy generated secrets (as opposed
to passwords). `MFA_RECOVERY_SALT` is a leftover of the TOTP flow that commit
`e56e278` disabled. Safe to delete.

**Feature flags read by nothing** — every one of these is inert, so toggling them
in the dashboard does nothing:
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BLIND_BUDGET`, `NEXT_PUBLIC_CATEGORIES_BETA`,
`NEXT_PUBLIC_CERTAINTY_BREAKER`, `NEXT_PUBLIC_COUPLES_MODE`,
`NEXT_PUBLIC_DEMO_LOGIN_ENABLED`, `NEXT_PUBLIC_ENV`, `NEXT_PUBLIC_NEW_HOME_V1`,
`NEXT_PUBLIC_PARTNER_PORTAL`, `NEXT_PUBLIC_PLAID_ENABLED`,
`NEXT_PUBLIC_PRICING_ENABLED`, `NEXT_PUBLIC_REFERRAL`

Note `NEXT_PUBLIC_*` values are **inlined into the client bundle at build time**,
so any of these carrying a non-public value is already public.

## How to re-run

```bash
vercel env ls > /tmp/envls.txt        # names + environments only, never values
# then diff against every process.env.* read in the tree
```

The one-off script used for this pass walked all `.ts/.tsx/.mjs/.js` files for
`process.env.NAME` and `process.env["NAME"]`, excluded platform-provided names
(`VERCEL_*`, `NODE_ENV`, …) and local/CI-only names, then compared both
directions.

Two false positives to expect on a re-run:

- **`X`** — `lib/env.ts:11` mentions `process.env.X` inside a doc comment.
- **`NEXT_PUBLIC_VERCEL_ENV` / `NEXT_PUBLIC_VERCEL_URL`** — read by `lib/env.ts`
  for the preview-origin fallback, and they will always show as "missing"
  because Vercel injects them as _system_ variables rather than project
  settings. Do not add them by hand.

  A caveat on those two: the `NEXT_PUBLIC_` mirrors only exist when
  "Automatically expose System Environment Variables" is enabled (the default).
  If it were off, the client-side branch of the preview fallback would go quiet
  and fall through to the production origin. Every consumer that matters —
  checkout, shares, shadow-shares, billing portal, household invites — is a
  server route reading the unprefixed `VERCEL_ENV`/`VERCEL_URL`, so the fix
  holds either way.
