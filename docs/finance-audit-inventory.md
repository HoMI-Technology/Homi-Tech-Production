# Finance Code Audit: Inventory + Removal/Integration Map

**Audit Date:** 2026-08-04 (subagent task)
**Focus:** Current standalone surface (legacy finance snapshot / monthly estimates) vs. ledger work (transaction-level budget & runway).
**Scope:** Exhaustive search/grep/file reads in `/Users/cody/code/Homi-Tech-Production` (authoritative local clone). Note: duplicate clone exists at `/Users/cody/Documents/kimi/workspace/homi-tech-production` (drifted per AGENTS.md; ignored for primary audit).
**Workspace:** /Users/cody
**No other finance code projects found** (skills only for external FMP market data; templates in .grok are non-code).

## 1. Executive Summary

- **Legacy Standalone Surface (pre-2026 PRs):** Client-side + DB-backed monthly aggregates via `lib/finance/store.ts`. Used across dashboard, tools, advisor, readiness, scoring prep, Companion context. Backed by `/api/finance-state` + `user_finance_state` table (migration 00023).
- **Ledger Work (ongoing PR ladder):** Transaction-level double-entry-style ledger (`lib/finance/ledger.ts` types + local impl + sync + calcs). Gated behind the `budgetLedger` flag. Local-first (localStorage), server sync (PR4), Plaid import planned (PR6). Tables in migration `20260803000001_finance_ledger.sql` (applied to prod).
- **Current State:** Coexist. Legacy authoritative for most surfaces. Budget tab (new UI) uses the ledger locally. No data migration path yet; summaries not derived from ledger in prod paths.
- **Key Duplication Risk:** Two parallel finance models (snapshot vs. events). Legacy numbers are estimates; ledger is events (income/expense/transfer/refund/adjustment).
- **Other Finance Surfaces:** Plaid (bank sync, separate `plaid_transactions` table + cashflow), Stripe (billing/subscriptions/payments ledger — distinct from user finance), scoring financial pillar (assessment-driven, not directly from store/ledger yet).
- **Other Ledgers (non-user-finance):** payments (00032), email_sends (00027), ad_spend (00037), webhook_events, etc. — audit scoped to user finance + related.

## 2. Detailed Inventory

### 2.1 Core Legacy Standalone Surface

**Location:** `lib/finance/store.ts` (271 lines)

- `FinanceState`: monthlyIncome/Expenses, liquidSavings, totalDebt, monthlyDebtPayments, expenseCategories[], downPaymentTarget, monteCarlo params, assets[], liabilities[].
- `DEFAULT_FINANCE_STATE` (illustrative numbers).
- `loadFinanceState()`, `saveFinanceState()`, `hasSavedFinanceState()`, `pullFinanceState()`, `writeLocal()`.
- Uses `lib/persistence.ts` for LWW sync to server.
- Consumers (grep hits ~30+ files):
  - UI: `app/(product)/finance/page.tsx` (main dashboard, tabs for overview/cashflow/debt/montecarlo/networth; Budget tab conditional), `app/(product)/path/page.tsx`, `app/(product)/scenarios/page.tsx`, `app/(product)/tools/*` (debt-payoff, preflight, etc.), `components/dashboard/*` (GoalCard, FinancialPositionSection), `components/simulator/ScoreSimulator.tsx`, `hooks/use-lens-prefill.ts`, `hooks/use-readiness.ts`.
  - Logic: `lib/tools/cfm.ts`, `lib/tools/deltas.ts`, `lib/tools/scenarios.ts`, `lib/simulator.ts`, `lib/readiness/store.ts`, `lib/readiness/funding.ts`, `lib/advisor/context.ts`, `lib/advisor/server-context.ts`, `lib/readiness/impact-bus.ts` (avoids direct), `components/tools/DeltasCard.tsx`.
  - Tests/E2E: Many (decision-lab.e2e.ts seeds it; companion tests, tools tests, readiness tests).
  - Derivations: netCashFlow, savingsRate, runwayMonths, debtToIncome, etc. (exported).
- Server: `app/api/finance-state/route.ts` (GET/PUT, LWW, rate-limited, handles infra-missing for migration).
- DB: `user_finance_state` (jsonb state + client_updated_at bigint; RLS owner).
- Migration: `supabase/migrations/00023_user_finance_state.sql`.
- Notes: Still primary; "your numbers" guard via `hasSavedFinanceState()` to avoid quoting defaults to users.

### 2.2 New Ledger System (Budget & Runway)

**PR Ladder (from comments/docs):**

- PR1: Domain types + calcs + validation + migration schema.
- PR2: Local-first UI (manual tx + budgets).
- PR3: Server schema/RLS (done).
- PR4: Per-record sync (partial impl).
- PR6+: Plaid import, recurring, goals V2, full integration.

**Core Files (`lib/finance/`):**

- `ledger.ts` (242 lines): Types only.
  - `FinanceTransaction`: 5 types (income/expense/transfer/refund/adjustment), sources (manual/plaid/recurring_rule/migration), status (posted/pending/voided), amountCents, dates (date-only), soft-delete, transferGroup/parent, isExcludedFromBudget.
  - `FinanceCategory` (system + user; essentiality: required/important/flexible/unclassified; 4-state).
  - `BudgetPeriod`, `BudgetCategoryAllocation` (rollover modes), `SavingsGoal` (V1), `RecurringTransactionRule` (forecast-only V1).
  - `DEFAULT_EXPENSE_CATEGORIES`, `DEFAULT_INCOME_CATEGORIES`.
  - Comment: "The two coexist during the staged migration; the snapshot stays authoritative until a user opts in to transaction mode."
- `local-ledger.ts` (548 lines): Local-first persistence.
  - `BudgetLedgerState` {schemaVersion, categories, transactions, periods, allocations, goal}.
  - `BUDGET_LEDGER_STORAGE_KEY = "homi:budget-ledger"`, corrupt backup key.
  - `loadBudgetLedger()`, `saveBudgetLedger()`, `hasSavedBudgetLedger()`.
  - Pure mutators: `addManualTransaction()`, `softDeleteTransaction()`, `setPlannedAllocation()`, `setGoalReserve()`, `ensurePeriodFor()`, `upsertGoal()`, `archiveGoal()`, `newLedgerId()`, `seedCategories()`.
  - SSR-safe, defensive schema migration, versioned.
- `ledger-sync.ts` (295 lines): Local <-> server sync.
  - `adoptServerCategoryIds()` (slug bridge for system cats), `mergeRemoteTransactions()` (LWW + soft-delete), pull/push helpers.
  - Category mapping for system slugs (`cat-housing` etc.).
- `calculations.ts` (318 lines): Pure period math.
  - `summarizePeriod()`, `categoryActuals()`, inclusion predicates (`countsAsIncome`, `countsAsSpending`, `countsAsRefund`, `isAlive`).
  - `PeriodTotals`, `CategoryActual`.
  - Date-only period membership.
- `db-map.ts` (106 lines): Row <-> domain (snake_case for Postgres).
  - `rowToTransaction()`, `rowToCategory()`.
  - `FINANCE_LEDGER_INFRA_MISSING` codes.
- `validation.ts` (130 lines): Zod schemas.
  - `transactionCreateSchema`, `transactionUpdateSchema`, `budgetPeriodUpsertSchema`, `savingsGoalUpsertSchema`, `moneyCentsSchema`.
- `money.ts` (86 lines): Cents primitives.
  - `MoneyCents`, `dollarsToCents()`, `centsToDollars()`, `sumCents()`, `formatCentsUSD()`, `isValidCents()`, `MAX_MONEY_CENTS`.
- `readiness-snapshot.ts` (138 lines): Bridge to readiness layer.
  - `FinanceReadinessSnapshot`, `FinanceEvidenceSummary`, `FinanceCompleteness` (low/medium/high).
  - `buildReadinessSnapshot()`, `gradeCompleteness()`.
- Other: `local-ledger.ts` also has UI helpers (todayDateOnly, monthBoundsFor, elapsedFraction).

**API Surface (`app/api/finance/`):**

- `categories/route.ts`: GET (system + user cats; archived included).
- `transactions/route.ts`: GET (paginated, cursor on updated_at), POST (manual create + idempotency via `finance_mutation_idempotency`).
- `transactions/[id]/route.ts`: PATCH (optimistic via expectedUpdatedAt), DELETE (soft-delete + voided).
- Notes: No routes yet for periods/allocations/goals/recurring (local-only in UI for PR2). All handle "deferred" for missing migration.
- Rate limiting, auth, infra-missing graceful.

**UI:**

- `app/(product)/finance/page.tsx` (1.3k lines): Main page. Uses legacy store heavily for most tabs. Conditionally dynamic-imports `BudgetTab` if `budgetLedger` flag. Tabs include "Budget" when enabled.
- `components/finance/BudgetTab.tsx` (35k lines): Full budget UI.
  - State: local ledger.
  - Features: periods, tx list/add/edit/delete, allocations, category bars, goal, summaries from calcs, sync hooks.
  - Uses: calculations (summarizePeriod, categoryActuals), local-ledger mutators, ledger-sync, money formatters.
  - Modals for tx, goal, etc.

**Migration (Schema + RLS only):**

- `supabase/migrations/20260803000001_finance_ledger.sql` (~489 lines shown; full defines tables + policies).
  - Tables: `finance_categories`, `finance_transactions`, `finance_budget_periods`, `finance_budget_allocations`, `finance_savings_goals`, `finance_recurring_rules`, `finance_mutation_idempotency`.
  - FORCE RLS, owner policies, system cat sharing, triggers, indexes, checks (e.g., system vs user rows).
  - Notes: "Mirrors lib/finance/ledger.ts". Apply single-file only. System categories seeded.

**Types/DB:**

- `types/database.ts`: Legacy `UserFinanceStateRow`; partial plaid; no full new finance\_\* yet (or not reflected).
- Other migrations: `00024_plaid_transactions.sql` (older, separate).

**Tests:**

- `finance-*.test.*`: budget-tab, calculations, ledger-sync, local-ledger, state.route, transactions.route, validation.
- Plaid tests separate.

**Flags (`lib/flags.ts`):**

- `budgetLedger`: Controls Budget tab visibility + dynamic import (NEXT_PUBLIC_FF_BUDGET_LEDGER).

**Docs/Plans References:**

- COMPANION-ECOSYSTEM.md, Plans.md, GO-LIVE-CHECKLIST.md, DEPLOY.md, MIGRATIONS-SSOT.md (notes migration applied 2026-08-03), docs/superpowers/specs/2026-07-27-path-to-ready-design.md (mentions tx ledger).

### 2.3 Plaid Bank Integration (Related, Not Yet Ledger-Native)

- `lib/plaid/`: client.ts, sync.ts (main), cashflow.ts, categories.ts, crypto.ts (token encrypt), remove.ts, webhook-verify.ts.
- API: `app/api/plaid/` (accounts, disconnect, exchange, link-token, sync, webhook).
- DB: `plaid_items`, `plaid_transactions` (older migration 00024; RLS).
- Usage: Connections page, dashboard, advisor (verified cashflow), simulator (prefers plaid snapshot), lib/readiness/evidence.ts.
- Current: Summarizes to legacy-like or separate verified cashflow. Ledger has `source: "plaid"` slots but no import code yet (PR6).
- Tests: Many plaid-\*.test.ts.

**Key Distinction:** Plaid populates raw txs; ledger will consume for budget (future).

### 2.4 Stripe / Billing / Payments (Separate Surface)

- `lib/stripe/`: server.ts, tiers.ts.
- API: `app/api/checkout/route.ts`, `app/api/billing/portal/route.ts`, `app/api/webhooks/stripe/route.ts` (large, signature verify, idempotency).
- DB: payments ledger (00032), profiles stripe\_\* fields.
- Scripts: stripe-setup.mjs, verify-\*.mjs.
- Consumers: entitlements, admin, checkout E2E, cron.
- Distinct "payments ledger" — not user personal finance.

### 2.5 Scoring / Assessment Financial Pillar

- `lib/scoring/engine.ts`, weights.ts, insights.ts.
- `computeFinancial()`: DTI, downPayment, emergencyFund, creditHealth (from AssessmentInputs, not directly store/ledger).
- 35% weight. Inputs collected in assessment flow; may prefill from finance state in future/elsewhere.
- No direct ledger tie yet.

### 2.6 Other Finance-Related

- `lib/tools/`: cfm.ts (cashflow model?), deltas.ts, scenarios.ts, blindbudget.ts?, refinance.ts, montecarlo (in finance page), debt.ts, format.ts.
- `lib/readiness/`: funding.ts, impact-bus.ts (explicitly avoids some finance), store.ts, evidence.ts (plaid + finance).
- `lib/advisor/`: context building uses finance state.
- `lib/persistence.ts`: Sync helper for legacy (and planned for ledger).
- `lib/dashboard/spend.ts`: Ad spend ledger (separate).
- Components: Many dashboard/tools reference finance numbers.
- E2E: decision-lab, checkout, public-funnel, etc. seed/use finance.
- Docs: Research on budget apps, launch maps, etc.

### 2.7 Cross-Cutting / Infra

- Rate limit, auth (Supabase), RLS everywhere.
- Idempotency patterns (multiple ledgers).
- Graceful degradation on missing migrations ("deferred").
- localStorage keys: "homi:finance" (legacy), "homi:budget-ledger" (new).
- Brand/guardrails: No changes to scoring; financial reality pillar frozen.

### 2.8 External / Non-Core

- `.hermes/skills/RobinBeraud/hermes-skills/finance/fmp/`: FMP API for stocks/crypto/forex (market data, not personal finance/ledger).
- `.grok/bundled/skills/pptx/templates/`: Many finance-themed deck templates (e.g. finance\_\*.js) — content gen, not runtime code.
- No other repos/code in /Users/cody matching (searched home; only clones/docs).

## 3. Removal / Integration Map

### 3.1 Current Parallel State (Risk)

- Legacy surface drives most UX, Companion, tools, readiness funding, advisor.
- Ledger: New Budget tab only (flag-gated); local data not surfaced elsewhere.
- No overlap handling: User can have both; numbers diverge.
- Plaid feeds verified cashflow (old table) but not ledger txs.

### 3.2 Proposed Integration Phases (Staged Migration)

1. **Foundation (Current/PRs 1-4):** Complete local + sync for manual. Wire Budget tab. Expose ledger summaries internally (e.g. via readiness-snapshot already stubbed).
2. **Data Bridge (Next):**
   - Add one-time migration: Import legacy FinanceState aggregates as "adjustment" or seed txs/periods (or keep legacy as "estimated" view).
   - Make `hasSavedFinanceState` + load prefer ledger when opted-in.
   - Update derivations (netCashFlow etc.) to optionally source from ledger calcs.
3. **Surface Unification:**
   - Deprecate direct store.ts in UI/logic for budget/cashflow views.
   - Finance page: Budget tab always-on; other tabs derive from ledger or hybrid.
   - Update Companion/advisor/server-context: Add ledger block (similar to plaid verified).
   - Path/readiness: Consume `buildReadinessSnapshot` + gradeCompleteness.
4. **Plaid Integration (PR6):**
   - Extend plaid/sync.ts or new to write to `finance_transactions` (source=plaid, status=posted/pending).
   - Dedupe via externalTransactionId.
   - Update cashflow-summary or deprecate old table for budget use.
   - Verified data in context from ledger.
5. **Full Replacement / Removal:**
   - Once all consumers migrated + data ported + tests green:
     - Remove/ mark deprecated: legacy store.ts fields, finance-state API (or keep read-only for backward).
     - Drop `user_finance_state` after migration (or archive).
     - Update scoring? (if assessment prefill changes).
     - Remove flag gates.
   - Retention: Keep old rows for audit/history; soft-delete or separate archive table.
6. **Hard Stops / Guards (from AGENTS.md):**
   - Scoring canon frozen — do not change weights or engine.
   - Never relax RLS.
   - Test every logic change (esp. webhooks, idempotency, tier, verdict).
   - Brand: exact HōMI spelling, colors.

### 3.3 Specific Removal Candidates (Post-Integration)

- `lib/finance/store.ts` (core legacy; keep minimal bridge?).
- `app/api/finance-state/route.ts` + migration 00023.
- Duplicate legacy calcs (cfm.ts, deltas.ts derivations) if superseded by calculations.ts.
- Old plaid_transactions reliance for budget math.
- Flag checks + dynamic imports (once shipped).
- Test fixtures seeding only legacy.
- Docs referencing "manual finance numbers" as primary.

### 3.4 Integration Touchpoints (Where Ledger Must Feed)

- `lib/advisor/*` context builders.
- `lib/readiness/*` (funding, impact, path).
- `lib/simulator.ts`, tools (scenarios, cfm?).
- `app/(product)/finance/page.tsx` (beyond Budget tab).
- `components/dashboard/*`.
- Companion context (COMPANION-ECOSYSTEM.md).
- E2E/acceptance that assert "your numbers".
- Architecture feed / public/architecture.json (update if new surfaces).

### 3.5 Risks / Gotchas

- Data loss on switch: Plan explicit migration script + user opt-in.
- Category ID drift: local slug vs server UUID (sync already handles for system).
- Cents vs float: money.ts bridge; legacy uses floats.
- Multi-device: LWW + sync critical.
- Completeness: Ledger must report "low" until real data (see grade fn).
- Performance: Tx volume vs snapshot; use pagination/cursors.
- Security: All new tables have RLS; verify in prod.
- Drift between clones: Per AGENTS.md, use ssot scripts.
- Other ledgers: Do not confuse user-finance with payments/email.

### 3.6 Recommendations

- Run `npm run architecture:check` + full test suite post-changes.
- Update types/database.ts with new tables (generate?).
- Add migration for legacy -> ledger data (one-way).
- Wire ledger into advisor/readiness before removing legacy surface.
- Audit consumers of `loadFinanceState` (grep results above) for phased replacement.
- Verify prod migration state: `supabase db query ...` or similar (per docs).
- For Plaid: Prioritize ledger population over old cashflow for budget features.

## 4. Files Touched by This Audit

- Created: `docs/finance-audit-inventory.md` (this file).
- No modifications to source (read-only audit).
- Greps/reads performed on ~50+ files (exhaustive via search_files + read_file + terminal find/ls on lib/app/supabase/components/tests).

## 5. Issues Encountered

- Search timeouts on broad home-dir greps (mitigated by path-limiting to /code/Homi... and globs).
- Duplicate clone discovered (Documents/...); per rules, did not audit/edit it.
- Some APIs (periods/goals) appear incomplete (no routes, full UI local); noted as PR status.
- Types/database.ts incomplete for new ledger tables (common post-migration).
- No "standalone surface" exact phrase in code (inferred from comments: "legacy finance snapshot", "surface", "manual finance numbers").
- Large files (BudgetTab 35k, finance page 46k, migration) read in chunks.
- Node_modules/.next noise in broad finds (pruned in commands).

**End of Audit.** Ledger work is well-structured for staged replacement of the standalone snapshot. Prioritize data bridge + context integration next.

Sources: Direct file reads + greps in repo. All claims grounded in code comments, structure, and content.
