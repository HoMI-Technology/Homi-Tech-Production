# Test rebuild ledger — dashboard / finance / layout / marketing / observe / planner

Base: `origin/main` `3bd5471d496976630f8344b3120eb6a3e1f089f8`
Date: 2026-08-30

Disposition ∈ KEEP · PROMOTE · REWRITE · SPLIT · MERGE · DELETE

| file | current | target | fs? | render? | userEvent? | disposition | notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dashboard/admin.test.ts | T0 | T0 | n | n | n | KEEP | docblock added |
| dashboard/attribution.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/employee-access.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/financial-position-ledger.test.tsx | T0+T1 | T0+T1 | n | y | n | KEEP | no interaction on GoalCard |
| dashboard/fold-truth.test.ts | T0 | T0 | n | n | n | KEEP | T0 reference |
| dashboard/fold-wiring.test.ts | T3 | T0+T3 | y→n | n | n | SPLIT | T0 catalog kept; greps → policy |
| dashboard/genome-scores.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/home-money-standing.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/last-read-chrome.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/palette-visibility.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/partner-invite-empty.test.ts | T3 | T3 | y | n | n | DELETE | replaced by policy fact |
| dashboard/partner.test.ts | inline | T0 | n | n | n | REWRITE | imports extracted `canAccessPartnerDashboard` |
| dashboard/report-signin-redirect.test.ts | T3 | T3 | y | n | n | DELETE | replaced by policy fact |
| dashboard/revenue-intelligence.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/sign-in-redirect.test.ts | T2 | T2 | n | n | n | KEEP | |
| dashboard/spend.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/surface-roles.test.ts | T0+T3 | T0+T3 | y→n | n | n | SPLIT | import grep → policy |
| dashboard/switcher-visibility.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/trinity.test.ts | T0 | T0 | n | n | n | KEEP | |
| dashboard/verdict-fold-motion.test.tsx | T1+T3 | T1+T3 | y→n | y | n | SPLIT | RTL kept; CSS/naming → policy |
| finance/banners.test.tsx | T1 | T1 | n | y | n | PROMOTE | factory + docblock |
| finance/debt-payoff-preview.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/goal-semantics.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/goal-sync.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/insights-api.test.ts | T2 | T2 | n | n | n | KEEP | T2 reference |
| finance/ledger-bridge.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/ledger-sync-reconcile.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/metrics.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/migrate-from-legacy.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/observed-prefill.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/overview-components.test.tsx | T1 | T1 | n | y | y | REWRITE | fireEvent → userEvent |
| finance/plan-tab.test.tsx | T1 | T1 | n | y | n | KEEP | smoke; owned mocks remain (AP3 noted) |
| finance/prefill-confirm.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/readiness-snapshot.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/recheck-prompt.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/scoring-import-guard.test.ts | T3 | T3 | y | n | n | MERGE | → policy `no-scoring-import` |
| finance/temperature.test.ts | T0 | T0 | n | n | n | KEEP | |
| finance/threshold-compass.test.tsx | T1 | T1 | n | y | n | KEEP | pins dead `components/finance/ThresholdCompass` — defect logged |
| layout/app-header-nav.test.ts | T0 | T0 | n | n | n | KEEP | |
| layout/app-sidebar.test.tsx | T1+T3 | T1 | y→n | y | n | SPLIT | grep describe → policy |
| layout/money-mode-nav.test.ts | T0+T3 | T0 | y→n | n | n | SPLIT | MONEY_MODES T0 kept |
| layout/nav-catalog-parity.test.ts | T0 | T0 | n | n | n | KEEP | T3 AST seat added; this file stays |
| layout/product-bottom-nav.test.tsx | T1+T3 | T1 | y→n | y | n | SPLIT | grep → policy |
| marketing/chrome-honesty.test.ts | T0+T3 | T0 | y→n | n | n | SPLIT | TIERS/companionTierCopy kept |
| marketing/cookies-policy.test.ts | T3 | T3 | y | n | n | DELETE | → policy |
| marketing/decision-os-positioning.test.ts | T3 | T3 | y | n | n | DELETE | → policy |
| marketing/first-moment-copy.test.ts | T0 | T0 | n | n | n | KEEP | |
| marketing/FirstMoment.test.tsx | T1 | T1 | n | y | y | KEEP | userEvent exemplar |
| marketing/guides-faq.test.tsx | T1 | T1 | n | n | n | KEEP | SSR markup |
| marketing/homepage-walk.test.ts | T0+T3 | T0 | y→n | n | n | SPLIT | walk-copy constants kept |
| marketing/how-it-works.test.ts | T3 | T3 | y | n | n | DELETE | → policy |
| marketing/legal-pages.test.ts | T3 | T3 | y | n | n | DELETE | → policy |
| marketing/primary-close.test.ts | T3 | T3 | y | n | n | DELETE | → policy |
| marketing/quiet-home-footer.test.ts | T3 | T3 | y | n | n | DELETE | → policy |
| marketing/walk-tokens.test.ts | T0 | T0 | n | n | n | KEEP | |
| observe/log.test.ts | T0 | T0 | n | n | n | KEEP | |
| observe/request-context.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/banks-connect-cta.test.tsx | T1 | T1 | n | y | n | KEEP | |
| planner/calendar-formulas.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/calendar.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/closed-loop.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/companion.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/empty-confirm-polish.test.tsx | T1 | T1 | n | y | y | REWRITE | fireEvent → userEvent |
| planner/first-visit-seed.test.ts | T1 | T1 | n | y | n | KEEP | |
| planner/goals-derive.test.ts | T0 | T0 | n | n | n | KEEP | logic still under `components/` — layering note |
| planner/goals-progress.test.tsx | T1 | T1 | n | y | y | REWRITE | fireEvent → userEvent |
| planner/impact.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/nudgerail-overview-hide.test.tsx | T1 | T1 | n | y | y | REWRITE | fireEvent → userEvent |
| planner/plan-cash-flow.test.tsx | T0+T1 | T0+T1 | n | y | n | KEEP | `buildCashFlowSeries` still on the UI module |
| planner/readiness-hero-hard-stops.test.tsx | T1 | T1 | n | y | n | KEEP | |
| planner/score-bridge.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/scoring-import-guard.test.ts | T3 | T3 | y | n | n | MERGE | → policy `no-scoring-import` |
| planner/store-parity.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/store-persistence.test.ts | T0 | T0 | n | n | n | KEEP | |
| planner/track-bottom-strip.test.tsx | T1 | T1 | n | y | y | REWRITE | fireEvent → userEvent |
| planner/transactions-derive.test.ts | T0 | T0 | n | n | n | KEEP | logic still under `components/` — layering note |

## Root-guard overlap (T3 must allow later migration; root files untouched)

| T3 rule | Overlaps | Action |
| --- | --- | --- |
| `macron-integrity` | `scripts/brand-check.mjs` | ledger only; brand-check stays |
| `locked-palette` | `__tests__/brand-colors.test.ts`, brand-check | ledger only; root stays |
| `naming-law` | `measure-act-wave1-locks.test.ts` (fold naming), brand-check | ledger only |
| `no-scoring-import` | `__tests__/scoring-server-only.test.ts` | ledger only; root stays |
| `protected-copy` | `money-reality-hero.test.ts`, `outcomes-ping-v0.test.ts` (copy locks) | ledger only; root stays |
| `nav-catalog-parity` (AST seat) | `__tests__/layout/nav-catalog-parity.test.ts` (T0 KEEP) | dual-run; T0 stays |

## Findings F1–F15 (Phase −1, `3bd5471`)

| # | Status |
| --- | --- |
| F1 | confirmed — `environment: "node"` |
| F2 | confirmed then changed — coverage provider added, not enabled by default |
| F3 | confirmed then changed — `projects` split added |
| F4 | confirmed — jsdom still per-file docblock in `unit` |
| F5 | confirmed — 10+ `readFileSync` files; six-dir greps promoted |
| F6 | confirmed — `toContain` dominant on grep files |
| F7 | confirmed then changed — userEvent adopted on interactive T1 files in scope |
| F8 | confirmed — RTL already installed |
| F9 | confirmed — CSS greps moved to T3 css-lock |
| F10 | confirmed — `verdict-fold-motion` split |
| F11 | confirmed — scoring-import-guard MERGE |
| F12 | confirmed — `fold-truth` KEEP |
| F13 | confirmed — `vi.mock` present, not dominant |
| F14 | confirmed — `insights-api` KEEP |
| F15 | confirmed then changed — added `@vitest/coverage-v8@4.1.11`, `ts-morph@26.0.0` |

Baseline (pre-topology): 2677 tests, 302 files, 0 failed, in-scope 76 files / ~4.6s.
Post-rebuild: policy + unit; see PR verification.
