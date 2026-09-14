-- =============================================================================
-- 20260914000001_finance_recurring_rules.sql — recurring transaction rules.
--
-- Mirrors RecurringTransactionRule in lib/finance/ledger.ts in snake_case
-- integer cents. A rule is a plan, not a transaction: v1 rules are
-- forecast-only ("create_pending" never auto-posts) so a forecasted rent can
-- never duplicate an imported rent.
--
-- Also extends finance_mutation_idempotency.resource_type with
-- 'recurring_rule' so rule writes share the PR-3 idempotency pattern.
--
-- APPLY: single-file only — never blanket `supabase db push`. See
-- docs/ops/MIGRATIONS-SSOT.md.
--
-- Security (Supabase checklist):
--   • FORCE RLS
--   • Policies TO authenticated with (select auth.uid()) ownership predicate
--   • UPDATE has both USING and WITH CHECK (prevent user_id reassignment)
-- =============================================================================

create table if not exists finance_recurring_rules (
  id uuid primary key,
  user_id uuid not null references profiles (id) on delete cascade,

  type text not null check (type in ('income', 'expense')),

  -- Positive magnitude; type carries direction (never negative amounts).
  amount_cents bigint not null check (
    amount_cents > 0 and amount_cents <= 10000000000
  ),

  description text not null check (char_length(description) between 1 and 160),
  category_id uuid references finance_categories (id) on delete set null,

  cadence text not null check (
    cadence in ('weekly', 'biweekly', 'semimonthly', 'monthly', 'quarterly', 'annual')
  ),

  -- Date-only budget frame (never derive months from UTC timestamps).
  start_date date not null,
  next_occurrence_date date not null,
  end_date date,

  generation_mode text not null default 'forecast_only' check (
    generation_mode in ('forecast_only', 'create_pending')
  ),

  is_active boolean not null default true,

  -- How the rule entered the ledger. plaid_detected rules carry the
  -- detector's confidence (0..1); manual rules leave it null (no false
  -- precision).
  detection_source text not null default 'manual' check (
    detection_source in ('manual', 'plaid_detected')
  ),
  detection_confidence numeric check (
    detection_confidence is null
    or (detection_confidence >= 0 and detection_confidence <= 1)
  ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Soft delete — excluded from forecasts, preserved for audit.
  deleted_at timestamptz,

  constraint finance_recurring_rules_dates_chk check (
    end_date is null or end_date >= start_date
  )
);

create index if not exists idx_finance_recurring_rules_user
  on finance_recurring_rules (user_id, next_occurrence_date)
  where deleted_at is null;

alter table finance_recurring_rules enable row level security;
alter table finance_recurring_rules force row level security;

drop policy if exists "finance_recurring_rules_select" on finance_recurring_rules;
create policy "finance_recurring_rules_select"
  on finance_recurring_rules for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_recurring_rules_insert" on finance_recurring_rules;
create policy "finance_recurring_rules_insert"
  on finance_recurring_rules for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_recurring_rules_update" on finance_recurring_rules;
create policy "finance_recurring_rules_update"
  on finance_recurring_rules for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_recurring_rules_delete" on finance_recurring_rules;
create policy "finance_recurring_rules_delete"
  on finance_recurring_rules for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on finance_recurring_rules;
create trigger set_updated_at
  before update on finance_recurring_rules
  for each row execute function touch_updated_at();

-- Recurring-rule writes share the PR-3 idempotency ledger.
alter table finance_mutation_idempotency
  drop constraint if exists finance_mutation_idempotency_resource_type_check;

alter table finance_mutation_idempotency
  add constraint finance_mutation_idempotency_resource_type_check
  check (resource_type in ('transaction', 'budget_period', 'savings_goal', 'recurring_rule'));

-- ROLLBACK (manual):
-- alter table finance_mutation_idempotency
--   drop constraint if exists finance_mutation_idempotency_resource_type_check;
-- alter table finance_mutation_idempotency
--   add constraint finance_mutation_idempotency_resource_type_check
--   check (resource_type in ('transaction', 'budget_period', 'savings_goal'));
-- drop table if exists finance_recurring_rules;
