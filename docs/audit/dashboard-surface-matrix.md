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
| `/home` | HONEST | merged | `lib/v4/home-state.ts` + `__tests__/v4/home-state.test.ts`. Pixel Gate CLOSED — do not undraft. First-session copy stays on #415; out of #416. |
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
| `/admin` | HONEST | stay-draft | Ops console `/admin`. `lib/v4/admin-workspace.ts` + `__tests__/v4/admin-workspace.test.ts`. Empty / normal; live SSOT counts; Companion off. Assessments room: `buildAdminAssessmentsV4View` — live rows, never READY badge / HeroScore / `overall_score`. PR #416. |

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
| first-session Home copy PR #415 | OUT | blocked | Stays on `feat/home-v4-first-session`. Do not restyle `/home` on #416. |

## CORE

Recorded 2026-09-12 from `node scripts/ci-coverage-report.mjs` plus PR #416
Actions after push (`34699568254` verify success, `34699568287` e2e success).
Mode is `TEST_COVERAGE_MODE=CORE` (not FULL). Result cells use only
`PASS` / `FAIL` / `SKIPPED` / `NOT CONFIGURED` / `BLOCKED`. Live E2E under
#241 is `SKIPPED` or `NOT CONFIGURED`, never `FAIL`. Do not inject
production `service_role` or `sk_live_*` to force FULL.

<!-- dashboard-matrix:core -->
| Check | Result |
| --- | --- |
| CORE_E2E | NOT CONFIGURED |
| INTEGRATION_E2E_STRIPE | NOT CONFIGURED |
| INTEGRATION_E2E_SUPABASE | NOT CONFIGURED |
| AUTHENTICATED_LIGHTHOUSE | NOT CONFIGURED |
| GitHub Actions `verify` | PASS |
| GitHub Actions `e2e` | PASS |
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

## Surface index (prefix rooms, not extra allow-list hosts)

Founder map. Prefix pages inherit the parent host in `V4_PENDING_PATHS`.
They must not be copied into product allow-list code. Five-status here is
honesty of the page, not a new CCP host.

<!-- dashboard-matrix:index -->
| Path | Lane | Page file | View builder | Data SSOT | Five-status | PR | Evidence | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/home` | V4_PENDING | `app/(product)/home/page.tsx` | `buildHomeV4View` | assessments last completed + user_readiness_path | HONEST | #416 | `__tests__/v4/home-state.test.ts` | Empty-or-live; no HeroScore; hard-stop never On track / READY. First-session copy stays on #415; out of #416. |
| `/money` | V4_PENDING | `app/(product)/money/page.tsx` | `buildMoneyV4View` | assessments last-read + plaid_items + plaid_accounts | HONEST | #416 | `__tests__/v4/money-workspace.test.ts` | Empty-or-live; never invent $ |
| `/money/bills` | V4_PENDING | `app/(product)/money/bills/page.tsx` | `buildBillsV4View` | loadSystemV4LastRead; never invent due amounts | HONEST | #416 | `__tests__/v4/system-surfaces.test.ts` | Covered by `/money` prefix. Not an extra allow-list host. |
| `/path` | V4_PENDING | `app/(product)/path/page.tsx` | `buildPathV4View` | assessments last-read + user_readiness_path.path | HONEST | #416 | `__tests__/v4/path-workspace.test.ts` | Hard-stop never On track / READY |
| `/scenarios` | V4_PENDING | `app/(product)/scenarios/page.tsx` | `buildCompareV4View` | assessments last-read + tool_scenarios | HONEST | #416 | `__tests__/v4/compare-workspace.test.ts` | Compare rail; educational only; no second official score |
| `/ask` | V4_PENDING | `app/(product)/ask/page.tsx` | `buildAskV4View` | assessments last completed | HONEST | #416 | `__tests__/v4/contextual-homi.test.ts` | Explain + deep-link; no Homie; no invented $ |
| `/tools` | V4_PENDING | `app/(product)/tools/page.tsx` | `buildToolsV4View` | loadSystemV4LastRead + hubLenses registry | HONEST | #416 | `__tests__/v4/system-surfaces.test.ts` | Hub lenses; never a score tile |
| `/learn` | V4_PENDING | `app/(product)/learn/page.tsx` | `buildLearnV4View` | loadSystemV4LastRead + LEARN_V4_LIVE_GUIDES | HONEST | #416 | `__tests__/v4/system-surfaces.test.ts` | Real `/guides` slugs only |
| `/settings` | V4_PENDING | `app/(product)/settings/page.tsx` | `buildSettingsV4View` | loadSystemV4LastRead + SETTINGS_V4_ENTRIES | HONEST | #416 | `__tests__/v4/system-surfaces.test.ts` | Account / Privacy / Billing entry |
| `/connections` | V4_PENDING | `app/(product)/connections/page.tsx` | `buildAccountsV4View` | loadSystemV4LastRead + plaid_items + plaid_accounts name/mask | HONEST | #416 | `__tests__/v4/system-surfaces.test.ts` | Live name/mask; no invented $ |
| `/assessment` | V4_PENDING | `app/(product)/assessment/page.tsx` | `parseV4AssessVisualState` + FullAssessmentFlow | adaptive home_buying walk; write path `/home` | HONEST | #416 | `__tests__/v4/assessment-walk.test.ts` | Adaptive home_buying; guests do not mount the walk |
| `/employee/dashboard` | V4_PENDING | `app/(product)/employee/dashboard/page.tsx` | `buildEmployeeV4View` | profiles role/employer + loadSystemV4LastRead | HONEST | #416 | `__tests__/v4/employee-workspace.test.ts` | Covered by `/employee` prefix. Not an extra allow-list host. |
| `/partner/dashboard` | V4_PENDING | `app/(product)/partner/dashboard/page.tsx` | `buildPartnerV4View` | profiles + partner_codes + assessments.referral_source + SITE_URL | HONEST | #416 | `__tests__/v4/partner-workspace.test.ts` | Covered by `/partner` prefix. Not an extra allow-list host. |
| `/admin` | V4_PENDING | `app/(product)/admin/page.tsx` | `buildAdminV4View` | profiles / organizations / assessments 7d / waitlist / campaign_sends failed counts | HONEST | #416 | `__tests__/v4/admin-workspace.test.ts` | Ops console; live SSOT counts; Companion off |
| `/admin/marketing` | V4_PENDING | `app/(product)/admin/marketing/page.tsx` | `adminV4DraftsFromAssets` | marketing_assets | HONEST | #416 | `__tests__/v4/admin-workspace.test.ts` | Covered by `/admin` prefix. X+TikTok only; Queue/Approve not Publish |
| `/admin/activity` | V4_PENDING | `app/(product)/admin/activity/page.tsx` | none | audit_log | BLOCKED | #416 | `app/(product)/admin/activity/page.tsx` | BLOCKED: leftover OPERATE chrome; Pixel Gate CLOSED; not an extra host |
| `/admin/ad-spend` | V4_PENDING | `app/(product)/admin/ad-spend/page.tsx` | none | ad_spend + profiles + payments | BLOCKED | #416 | `app/(product)/admin/ad-spend/page.tsx` | BLOCKED: leftover OPERATE chrome; Pixel Gate CLOSED; not an extra host |
| `/admin/analytics` | V4_PENDING | `app/(product)/admin/analytics/page.tsx` | none | PostHog getAnalyticsBundle | BLOCKED | #416 | `app/(product)/admin/analytics/page.tsx` | BLOCKED: leftover OPERATE chrome; Pixel Gate CLOSED; not an extra host |
| `/admin/assessments` | V4_PENDING | `app/(product)/admin/assessments/page.tsx` | `buildAdminAssessmentsV4View` | assessments id/created_at/verdict/is_shadow/hard_stops | HONEST | #416 | `__tests__/v4/admin-workspace.test.ts` | Covered by `/admin` prefix. No VerdictBadge / overall_score / READY badge |
| `/admin/attribution` | V4_PENDING | `app/(product)/admin/attribution/page.tsx` | none | profiles.attribution + assessments.attribution | BLOCKED | #416 | `app/(product)/admin/attribution/page.tsx` | BLOCKED: leftover OPERATE chrome; Pixel Gate CLOSED; not an extra host |
| `/admin/email` | V4_PENDING | `app/(product)/admin/email/page.tsx` | `buildAdminEmailV4View` | campaigns + campaign_sends | HONEST | #416 | `__tests__/v4/admin-workspace.test.ts` | Covered by `/admin` prefix. Empty on loadError or []. No score column. Terminal stay-draft. |
| `/admin/organizations` | V4_PENDING | `app/(product)/admin/organizations/page.tsx` | `buildAdminOrganizationsV4View` | organizations + organization_members + family_accounts | HONEST | #416 | `__tests__/v4/admin-workspace.test.ts` | Covered by `/admin` prefix. Empty on loadError or []. No score column. Terminal stay-draft. |
| `/admin/users` | V4_PENDING | `app/(product)/admin/users/page.tsx` | `buildAdminUsersV4View` | profiles id/created_at/role/subscription_tier | HONEST | #416 | `__tests__/v4/admin-workspace.test.ts` | Covered by `/admin` prefix. Empty on loadError or []. No score column. Terminal stay-draft. |
| `/admin/waitlist` | V4_PENDING | `app/(product)/admin/waitlist/page.tsx` | `buildAdminWaitlistV4View` | waitlist id/created_at/status/source/interested_in | HONEST | #416 | `__tests__/v4/admin-workspace.test.ts` | Covered by `/admin` prefix. Empty on loadError or []. No score column. Terminal stay-draft. |
| `/dashboard` | DARK | `app/(product)/dashboard/page.tsx` | none | pre-PR15 cockpit; not on V4 allow-list | DARK | none | `classifyChangeControlLane("/dashboard")` | DARK: pre-PR15 cockpit; do not resurrect |
| `/team` | DARK | `app/(product)/team/page.tsx` | none | not in V4_PENDING_PATHS | OUT | #414 | related + OUT rows; draft PR #414 | OUT: PR #414 stays unmerged; do not add `/team` |
