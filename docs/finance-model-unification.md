# Finance Ledger Model Comparison & Unified Recommendations

**Date:** 2026-08-04  
**Context:** Builds directly on the `20260803000001_finance_ledger.sql` migration (applied 2026-08-03).  
**Purpose:** Side-by-side analysis of existing "ledger" and idempotency patterns across the codebase + recommended unified TS interfaces + minimal DB extensions. Goal: reduce drift as Plaid import (PR6), recurring, and legacy snapshot migration proceed.

## 1. Side-by-Side Comparison

| Ledger / Pattern              | Primary Table(s)                                                                           | Amount Representation                                                           | Key Dates                                                      | Idempotency / Dedupe                                                             | RLS / Access Model                                              | TS Shape Location                                                                | Notes / Inconsistencies                                                                                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Stripe Revenue**            | `payments`                                                                                 | `amount int` (cents, >0)                                                        | `created_at` only                                              | `stripe_payment_intent_id` (unique) + upsert                                     | service_role writes; owner+admin select (via policies)          | `types/database.ts: Payment`                                                     | Revenue-focused, not user tx. No user_id required at write time (backfilled via customer). No currency variation handling beyond default.                                                                                    |
| **Raw Bank Import**           | `plaid_transactions`                                                                       | `amount numeric` (signed; + = out)                                              | `txn_date` (date)                                              | `transaction_id` unique (per Plaid)                                              | service writes only; owner select                               | Inline in `lib/plaid/sync.ts` + tests                                            | Separate "raw" layer. Negative convention opposite to finance. No soft-delete, no `source` enum, `pending` bool instead of status. Feeds future finance import.                                                              |
| **Email Lifecycle**           | `email_sends`                                                                              | N/A                                                                             | `sent_at`                                                      | `dedupe_key` (unique, e.g. `verdict:{id}`)                                       | service_role only (no auth policies)                            | Inline in `lib/email/send.ts`                                                    | Append-only audit. Delete on provider failure for retry. Global-ish (not per-user PK).                                                                                                                                       |
| **Webhook Dedupe**            | `webhook_events`                                                                           | N/A                                                                             | `received_at`                                                  | `event_id` (PK)                                                                  | service_role only                                               | Inline usage in stripe webhook                                                   | Minimal; just claim-before-process. Rollback delete on transient error.                                                                                                                                                      |
| **Ad / Marketing Spend**      | `ad_spend`                                                                                 | `spend_cents integer` (>=0)                                                     | `spend_date` (date), created/updated                           | `unique(spend_date, channel, campaign)`                                          | admin-only (via is_admin() policy)                              | `types/database.ts: AdSpend`                                                     | Manual entry. Positive only. Date attribution key (not tx date).                                                                                                                                                             |
| **User Finance Events (NEW)** | `finance_transactions` + `finance_categories`, `finance_budget_*`, `finance_savings_goals` | `amount_cents bigint` (>0) + `type` (income/expense/transfer/refund/adjustment) | `transaction_date` (date, user frame), `posted_at` timestamptz | Client-supplied `id` (uuid) + separate `finance_mutation_idempotency` (user+key) | Full authenticated owner RLS + FORCE on all; system cats shared | Domain: `lib/finance/ledger.ts` (camel)<br>Rows: `lib/finance/db-map.ts` (snake) | **Most advanced**: positive cents + semantic type, date-only budget frame, soft-delete (`deleted_at`), rich FKs (category, transfer_group, parent, recurring_rule), source enum, status enum. Mirrors ledger domain exactly. |
| **App Mutation Dedupe**       | `finance_mutation_idempotency`                                                             | N/A (stores response_body jsonb)                                                | `created_at`                                                   | Composite PK `(user_id, idempotency_key)`                                        | authenticated insert/select (owner)                             | `lib/finance/db-map.ts` (partial)                                                | Per-user, response echo for idempotent retries. Resource_type + id. Append-only (no update/delete policies).                                                                                                                 |
| **Legacy Snapshot**           | `user_finance_state`                                                                       | jsonb (floats in dollars)                                                       | `client_updated_at` (ms epoch), created/updated                | LWW via `client_updated_at`                                                      | owner RLS                                                       | `types/database.ts: UserFinanceStateRow`                                         | Monthly estimates (coexists with ledger during transition). Will become derived/readonly.                                                                                                                                    |

**Key Observed Inconsistencies (to address via unification):**

- **Amounts**: Signed numeric (plaid) vs positive-int-cents (most) vs float dollars (legacy). Finance ledger's "type carries sign" is the cleanest for double-entry correctness.
- **Dates**: Mix of `date` (budget-relevant) vs timestamptz only. Finance's explicit `transaction_date` (never derive month from UTC) is the model to follow.
- **Idempotency**: 4+ different shapes (PK natural key, unique dedupe, composite user+key, client uuid). Finance mutation table is most robust for authenticated client-driven ops.
- **RLS/Access**: service-only (audit/imports) vs owner-authenticated (user data) vs admin. Consistent FORCE RLS + explicit grants is the pattern.
- **TS Shapes**: Scattered (database.ts for some, inline Rows in lib/tests, domain separate). No central mirror for the new finance tables yet.
- **Soft Delete / Audit**: Only finance_transactions has `deleted_at`. Others either hard-delete or never delete.
- **Currency**: Explicit "USD" checks in finance; loose elsewhere.
- **Schema Drift Risk**: New finance tables not yet in `types/database.ts`; plaid_transactions not centralized.

## 2. Recommended Unified Approach

### 2.1 TS Interfaces (Central + Domain Split)

**Principle:**

- `types/database.ts` owns **exact DB row shapes** (snake_case, nullable as per Postgres/PostgREST, `number | string` for bigints from wire, ISO strings for dates). Import these for routes, mappers, tests.
- Domain types (`lib/finance/ledger.ts`) stay pure/camelCase/branded (e.g. `MoneyCents`) for business logic, calcs, UI, validation. Mappers are the only boundary.
- Re-export or co-locate common primitives (`MoneyCents`, enums) where useful.
- Update mappers in `lib/finance/db-map.ts` to import Rows from `@/types/database`.
- Add `PlaidTransactionRow` and other missing for completeness.
- Use consistent comments referencing the source migration.

**Proposed additions to `types/database.ts`** (append after `PlaidAccount`):

```ts
/** Finance ledger (migration 20260803000001_finance_ledger.sql).
 *  Positive cents + semantic type. Date-only for budget framing.
 *  Soft delete via deleted_at. Mirrors lib/finance/ledger.ts domain. */
export type FinanceTransactionType = "income" | "expense" | "transfer" | "refund" | "adjustment";
export type FinanceTransactionStatus = "posted" | "pending" | "voided";
export type FinanceTransactionSource = "manual" | "plaid" | "recurring_rule" | "migration";

export interface FinanceTransactionRow {
  id: string;
  user_id: string;
  type: FinanceTransactionType;
  status: FinanceTransactionStatus;
  amount_cents: number | string; // PostgREST may deliver bigint as string
  currency: "USD";
  description: string;
  merchant_name: string | null;
  category_id: string | null;
  account_id: string | null;
  transaction_date: string; // YYYY-MM-DD (user's budget frame)
  posted_at: string | null;
  source: FinanceTransactionSource;
  external_transaction_id: string | null;
  recurring_rule_id: string | null;
  transfer_group_id: string | null;
  parent_transaction_id: string | null;
  is_excluded_from_budget: boolean;
  user_note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type FinanceCategoryType = "income" | "expense";
export type CategoryEssentiality = "required" | "important" | "flexible" | "unclassified";

export interface FinanceCategoryRow {
  id: string;
  user_id: string | null; // null = system default
  name: string;
  slug: string;
  category_type: FinanceCategoryType;
  essentiality: CategoryEssentiality;
  parent_category_id: string | null;
  is_system: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceBudgetPeriodRow {
  id: string;
  user_id: string;
  period_start: string; // YYYY-MM-DD inclusive
  period_end: string;
  expected_income_cents: number | string | null;
  goal_reserve_cents: number | string;
  status: "open" | "closed";
  created_at: string;
  updated_at: string;
}

export interface FinanceBudgetAllocationRow {
  id: string;
  budget_period_id: string;
  category_id: string;
  planned_cents: number | string;
  rollover_mode: "none" | "positive_only" | "full";
  created_at: string;
  updated_at: string;
}

export interface FinanceSavingsGoalRow {
  id: string;
  user_id: string;
  name: string;
  goal_type:
    | "emergency_reserve"
    | "home"
    | "vehicle"
    | "education"
    | "family"
    | "travel"
    | "custom";
  target_amount_cents: number | string;
  current_amount_cents: number | string;
  target_date: string | null;
  planned_monthly_contribution_cents: number | string;
  linked_decision_id: string | null;
  linked_account_id: string | null;
  status: "active" | "paused" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

/** Client-driven mutation idempotency (finance only for now). */
export interface FinanceMutationIdempotencyRow {
  user_id: string;
  idempotency_key: string;
  resource_type: "transaction" | "budget_period" | "savings_goal";
  resource_id: string;
  response_status: number;
  response_body: Record<string, unknown>;
  created_at: string;
}

/** Plaid raw transactions (migration 00024) — separate raw layer for now. */
export interface PlaidTransactionRow {
  id: string;
  item_id: string;
  user_id: string;
  account_id: string | null;
  transaction_id: string;
  amount: number; // signed per Plaid
  txn_date: string | null;
  name: string | null;
  merchant_name: string | null;
  category: string | null;
  pending: boolean;
  iso_currency: string | null;
  created_at: string;
  updated_at: string;
}
```

**Update `lib/finance/db-map.ts`** (recommended change):

- Import the \*Row types from `@/types/database` instead of re-defining locally.
- Keep pure mapper functions.
- Re-export the enums/types for convenience.

This makes `import type { FinanceTransactionRow } from "@/types/database"` the canonical shape for DB consumers (routes, tests, sync).

Domain types in `ledger.ts` remain the source of truth for logic (with `MoneyCents` branding).

### 2.2 DB Extensions (Build on 20260803 migration)

Propose a **follow-up single-file migration** (e.g. `20260804000001_finance_ledger_extensions.sql`) for consistency without breaking changes. Apply only after full verification.

Key proposed extensions (minimal, additive):

```sql
-- 20260804000001_finance_ledger_extensions.sql
-- Builds on 20260803000001. Adds cross-ledger linkage, normalization helpers,
-- and parity fields. Idempotent.

-- 1. Link finance txs to raw plaid import (for PR6 import path + audit trail)
alter table finance_transactions
  add column if not exists plaid_transaction_id text,
  add column if not exists plaid_item_id uuid;

create index if not exists idx_finance_tx_plaid
  on finance_transactions (plaid_item_id, plaid_transaction_id)
  where plaid_transaction_id is not null and deleted_at is null;

-- 2. Optional normalized signed_amount for easy reporting / views (positive for in)
--    (avoids changing amount_cents contract)
alter table finance_transactions
  add column if not exists signed_amount_cents bigint generated always as (
    case
      when type in ('income', 'refund') then amount_cents
      when type in ('expense', 'transfer', 'adjustment') then -amount_cents
      else 0
    end
  ) stored;

-- 3. Parity for legacy payments/ad_spend: explicit cents naming + comment (no rename yet)
comment on column payments.amount is 'Cents (positive). Consider amount_cents in future unification pass.';
comment on column ad_spend.spend_cents is 'Cents (positive).';

-- 4. Extend finance_mutation_idempotency for future general use? (keep finance-prefixed for now)
--    Add optional correlation for tracing.
alter table finance_mutation_idempotency
  add column if not exists correlation_id text;

-- 5. Soft-delete parity suggestion (non-breaking; document for other ledgers)
comment on column finance_transactions.deleted_at is 'Soft delete for audit + historical accuracy. Pattern to consider for payments/ad_spend if they ever need correction rows.';

-- Add similar comment to plaid_transactions for future merge consideration.
comment on table plaid_transactions is 'Raw Plaid mirror (signed numeric). Import into finance_transactions (source=plaid) in future; keep raw for re-sync.';

-- ROLLBACK (reverse):
-- alter table finance_transactions drop column if exists plaid_transaction_id;
-- ... (etc)
```

**Additional unification recommendations (no immediate migration):**

- When adding Plaid→finance import (PR6): always write to `finance_transactions` (source=plaid) + optionally keep/update `plaid_transactions` for raw fidelity.
- Future: consider a lightweight `finance_ledger_events` view or materialized for unified queries across manual + plaid.
- Standardize on `*_cents bigint` + type/status enums across new tables.
- For legacy `payments`: leave as-is (revenue analytics); do not mix with user finance ledger.

### 2.3 Migration & Rollout Notes

- Update `types/database.ts` immediately (central source for mirrors).
- Patch `lib/finance/db-map.ts` + any inline casts in routes/tests to use imported types.
- Add `Finance*Row` usage to `docs/ops/MIGRATIONS-SSOT.md` and `docs/finance-audit-inventory.md`.
- Regenerate architecture feed after changes: `npm run architecture:gen`.
- Tests already guard `FINANCE_LEDGER_INFRA_MISSING`; extend for new columns gracefully if needed.
- No breaking changes to existing finance_ledger tables.

## 3. Next Steps / Open Items

- Implement the TS centralization (this doc + patches).
- Build Plaid import mapper that produces `FinanceTransaction` (source=plaid, external=plaid tx id).
- Decide on recurring_rules table + ledger row (currently referenced in types/columns but no table in 20260803 migration).
- Consider extracting a shared `lib/ledger/idempotency.ts` helper if more tables adopt the mutation pattern.
- Track drift via `npm run architecture:check` and migration probes.

This unifies the **new finance model** as the target while documenting and incrementally aligning legacy patterns.

---

**Files to touch (recommended):**

- `types/database.ts` (add interfaces + enums)
- `lib/finance/db-map.ts` (import from types, remove duplicate defs)
- `docs/finance-model-unification.md` (this)
- Optional: follow-up migration file + update MIGRATIONS-SSOT.md
