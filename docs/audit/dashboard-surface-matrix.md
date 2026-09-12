# HōMI dashboard surface matrix

SSOT for V4_PENDING operate / Shell v4 hosts vs DARK leftovers. Lane authority
is `lib/auth/keep-routes.ts` (`V4_PENDING_PATHS`, `V4_LIVE_PATHS`). This file
classifies honesty; it does not activate routes.

Recorded against `origin/main` tip `af956b5` (PR K3 Admin v4) plus this
stay-draft honesty pass. Do not treat this matrix as Pixel Gate approval.

## Labels

**Status** (plan lock — exactly these five):

| Status | Meaning |
| --- | --- |
| HONEST | Shipped view-builder + tests: empty-or-live SSOT, no HeroScore, no invented `$`, hard-stop never On track / READY |
| STAY-DRAFT | Incomplete slice named to an open stay-draft PR |
| BLOCKED | Cannot finish here (#241 spend hold, Pixel Gate, missing SSOT, founder) |
| DARK | Unpublished / do-not-resurrect. Not on the V4 allow-list |
| OUT | Forbidden this pass (spend, flag-true, V4_LIVE move, leftover PR C, site rebuild, `/team`) |

**Terminal** (latest goal lock — exactly these five):

| Terminal | Meaning |
| --- | --- |
| merged | Honesty law is on `main` (flag still default-off) |
| stay-draft | Open stay-draft PR is the home for remaining work |
| planned-not-built | Designed, not built — do not invent the surface |
| missing | Required host with no shipped builder |
| blocked | Founder / Pixel Gate / #241 / explicit do-not |

A non-HONEST V4_PENDING row must name `PR #<n>` or a `BLOCKED:` reason in Note.

## Pixel Gate

**Status: CLOSED.** Founder **APPROVE VISUAL DIRECTION** is still required
(`docs/design/v4-screenshot-set.md`). Do not undraft Home v4 as a release.
Do not set Production `HOMI_V4_HOME_ENABLED=true` from this work. CCP
`V4_LIVE_PATHS` stays `[]`.

## V4_PENDING hosts

Shipped allow-list, in order. Test iterates `V4_PENDING_PATHS` — do not
hand-copy a second list into product code.

<!-- dashboard-matrix:pending -->
| Host | Status | Terminal | Note |
| --- | --- | --- | --- |
| `/home` | HONEST | merged | `lib/v4/home-state.ts` + `__tests__/v4/home-state.test.ts`. Pixel Gate CLOSED — do not undraft. |
| `/money` | HONEST | merged | `lib/v4/money-workspace.ts` + `__tests__/v4/money-workspace.test.ts`. `/money/bills` is the `/money` prefix. Empty-or-live; never invent `$`. |
| `/path` | HONEST | merged | `lib/v4/path-workspace.ts` + `__tests__/v4/path-workspace.test.ts`. Hard-stop never On track / READY. |
| `/scenarios` | HONEST | merged | Compare rail. `lib/v4/compare-workspace.ts` + `__tests__/v4/compare-workspace.test.ts`. Educational only; no second official score. |
| `/ask` | HONEST | merged | `lib/v4/contextual-homi.ts` + `__tests__/v4/contextual-homi.test.ts`. Explain + deep-link; no Homie; no invented `$`. |
| `/tools` | HONEST | merged | `lib/v4/tools-workspace.ts` via `__tests__/v4/system-surfaces.test.ts`. Hub lenses; never a score tile. |
| `/learn` | HONEST | merged | `lib/v4/learn-workspace.ts` via `__tests__/v4/system-surfaces.test.ts`. Real `/guides` slugs only. |
| `/settings` | HONEST | merged | `lib/v4/settings-workspace.ts` via `__tests__/v4/system-surfaces.test.ts`. Account / Privacy / Billing entry. |
| `/connections` | HONEST | merged | `lib/v4/accounts-workspace.ts` via `__tests__/v4/system-surfaces.test.ts`. Live name/mask; no invented `$`. |
| `/assessment` | HONEST | merged | `lib/v4/assessment-walk.ts` + `__tests__/v4/assessment-walk.test.ts`. Adaptive home_buying; write path `/home`. |
| `/employee` | HONEST | merged | Operate home `/employee/dashboard`. `lib/v4/employee-workspace.ts` + `__tests__/v4/employee-workspace.test.ts`. Empty / hard-stop / normal. |
| `/partner` | HONEST | merged | Operate home `/partner/dashboard`. `lib/v4/partner-workspace.ts` + `__tests__/v4/partner-workspace.test.ts`. Empty / invite-error / normal. SITE_URL fail-loud. |
| `/admin` | HONEST | merged | Ops console `/admin`. `lib/v4/admin-workspace.ts` + `__tests__/v4/admin-workspace.test.ts`. Empty / normal; live SSOT counts; Companion off. |

## Related non-pending dashboards

<!-- dashboard-matrix:related -->
| Host | Status | Terminal | Note |
| --- | --- | --- | --- |
| `/dashboard` | DARK | blocked | Pre-PR15 cockpit. `classifyChangeControlLane("/dashboard")` is DARK. Do not resurrect. |
| `/team` | DARK | blocked | Not in `V4_PENDING_PATHS`. Draft PR #414 (K4) stays unmerged this pass. Do not add `/team`. |

## OUT constraints

<!-- dashboard-matrix:out -->
| Host | Status | Terminal | Note |
| --- | --- | --- | --- |
| leftover PR C `cursor/pr-c-shell-home-v4-2905` | OUT | blocked | Not the base. Work is from `origin/main` only. |
| Production `HOMI_V4_HOME_ENABLED=true` | OUT | blocked | Default-off. Only exact lowercase `"true"` enables. Do not flip Production. |
| `V4_LIVE` path moves | OUT | blocked | `V4_LIVE_PATHS` stays empty. Activation is not this pass. |
| spend against #241 | OUT | blocked | No GitHub Pro, Vercel Pro, second Supabase, or production secrets in Actions. |
| site rebuild | OUT | blocked | Dashboards already exist. Do not rebuild KEEP marketing or scoring. |
| PR #414 `/team` | OUT | blocked | Stay-draft Team v4 must not land; `/team` stays DARK. |

## CORE

Recorded locally 2026-09-12 from `node scripts/ci-coverage-report.mjs`.
Mode is `TEST_COVERAGE_MODE=CORE` (not FULL). Result cells use only
`PASS` / `FAIL` / `SKIPPED` / `NOT CONFIGURED` / `BLOCKED`. Script
`NOT_CONFIGURED` maps to `NOT CONFIGURED`. Live E2E under #241 is
`SKIPPED` or `NOT CONFIGURED`, never `FAIL`. Do not inject production
`service_role` or `sk_live_*` to force FULL. GitHub Actions `verify` /
`e2e` were not queried for this unpushed SHA.

<!-- dashboard-matrix:core -->
| Check | Result |
| --- | --- |
| CORE_E2E | NOT CONFIGURED |
| INTEGRATION_E2E_STRIPE | NOT CONFIGURED |
| INTEGRATION_E2E_SUPABASE | NOT CONFIGURED |
| AUTHENTICATED_LIGHTHOUSE | NOT CONFIGURED |
| GitHub Actions `verify` | NOT CONFIGURED |
| GitHub Actions `e2e` | NOT CONFIGURED |
| Live E2E under #241 | SKIPPED |

<!-- dashboard-matrix:core-raw -->
```
TEST_COVERAGE_MODE=CORE
CORE_E2E=NOT_CONFIGURED
INTEGRATION_E2E_SUPABASE=NOT_CONFIGURED
INTEGRATION_E2E_STRIPE=NOT_CONFIGURED
AUTHENTICATED_LIGHTHOUSE=NOT_CONFIGURED
MEANING=CORE means anonymous/public suites may run; live Supabase and/or Stripe TEST suites are not configured and must not be described as FULL.
```
