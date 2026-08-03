# Launch loops — what shipped, key-file map

> Extracted 2026-08-03 from `LAUNCH-RUNBOOK.md` §0 (now archived at
> `docs/archive/LAUNCH-RUNBOOK.md`). This is the where-things-live index for the
> attribution / funnel / lifecycle-email / share / receipt systems.

| System | What it does | Key files |
|---|---|---|
| **Attribution** | First-touch `?ref`/`utm_*` → cookie → stamped on profile + every assessment; per-partner invite codes; partner portal stats now real | `lib/attribution.ts`, `components/analytics/AttributionCapture.tsx`, migrations `00019`, `00024` |
| **Funnel events** | The 5 canonical events wired (client) + `checkout_completed`/`assessment_completed` captured server-side (blocker-proof) | `lib/analytics/server.ts`, results/pricing/webhook/assessment routes |
| **Lifecycle email** | Welcome (signup), verdict (assessment), 30-day nudge + day-30/90/365 outcome surveys (cron); idempotency ledger | `lib/email/send.ts`, `lib/email/lifecycle.ts`, `app/api/cron/lifecycle`, migration `00020` |
| **Shadow share loop** | Anonymous journey cards + dynamic OG unfurl; the viral exit for the top-of-funnel | `app/api/shadow-shares`, `app/shadow/[token]`, migration `00021` |
| **Receipt API (B2B v1)** | Partner-key-authenticated, signed, consumer-authorized readiness receipts + consumer-visible audit | `lib/receipts`, `app/api/v1/receipts/[token]`, migration `00022` |
| **Advisor economics** | Monthly spend ceiling, 5/day demo budget, server-authoritative (un-forgeable) context | `lib/advisor/quota.ts`, `lib/advisor/server-context.ts`, migration `00023` |
| **CSP** | Real violation collector + enforcement-ready allowlist (won't break Plaid/PostHog) | `app/api/csp-report`, `next.config.ts` |
| **Perf** | Companion widget deferred off the LCP critical path | `components/companion/CompanionWidget.tsx` |
| **E2E** | Playwright smoke over the anonymous funnel | `e2e/`, `playwright.config.ts`, `.github/workflows/e2e.yml` |

Note: the runbook's migration numbers referred to the branch-era numbering; the
canonical apply state is tracked in `docs/ops/MIGRATIONS-SSOT.md` and
`docs/ops/MIGRATION-DRIFT-2026-07-28.md`.
