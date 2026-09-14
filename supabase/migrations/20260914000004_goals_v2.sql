-- =============================================================================
-- 20260914000004_goals_v2.sql — Phase 2 goals V2.
--
-- One-active-goal: ALREADY LIFTED by 20260810000001_multi_goal.sql, which
-- dropped idx_finance_savings_goals_one_active. This migration therefore only
-- asserts that state idempotently (drop index if exists is a no-op) and
-- documents why, so a database that somehow missed 20260810 still lands in
-- the multi-goal shape.
--
-- What is new here:
--   • linked_account_id gains a real FK to plaid_accounts (it existed as a
--     bare uuid since 20260803 with no reference)
--   • target_date already exists on finance_savings_goals (20260803) — no-op
--   • finance_goal_allocations: per-period cash allocations funding a goal.
--     A goal contribution is a cash allocation, never spending.
--
-- APPLY: single-file only — never blanket `supabase db push`. See
-- docs/ops/MIGRATIONS-SSOT.md.
--
-- Security (Supabase checklist):
--   • FORCE RLS on the new table
--   • Policies TO authenticated with (select auth.uid()) ownership predicate
--   • UPDATE has both USING and WITH CHECK
-- =============================================================================

-- Multi-goal assertion (see header; no-op when 20260810 was applied).
drop index if exists idx_finance_savings_goals_one_active;

-- Real FK for the previously bare uuid. Existing rows with a dangling value
-- would fail the add-constraint; use NOT VALID + validate so the migration is
-- safe on data that predates the reference.
alter table finance_savings_goals
  drop constraint if exists finance_savings_goals_linked_account_fk;

alter table finance_savings_goals
  add constraint finance_savings_goals_linked_account_fk
  foreign key (linked_account_id) references plaid_accounts (id) on delete set null
  not valid;

do $$
begin
  begin
    alter table finance_savings_goals
      validate constraint finance_savings_goals_linked_account_fk;
  exception
    when foreign_key_violation then
      -- Pre-existing dangling links: NULL them rather than fail the deploy.
      -- A broken account link is unknown data, and unknown must not pretend
      -- to be known.
      update finance_savings_goals set linked_account_id = null
      where linked_account_id is not null;
      alter table finance_savings_goals
        validate constraint finance_savings_goals_linked_account_fk;
  end;
end $$;

-- ---------------------------------------------------------------------------
-- finance_goal_allocations — one row per goal per funding period
-- ---------------------------------------------------------------------------
create table if not exists finance_goal_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  goal_id uuid not null references finance_savings_goals (id) on delete cascade,

  -- Date-only month the allocation belongs to (budget frame).
  period_start date not null,

  -- Positive magnitude; an allocation is cash assigned to the goal.
  amount_cents bigint not null check (
    amount_cents > 0 and amount_cents <= 10000000000
  ),

  created_at timestamptz not null default now(),

  -- Idempotent writes: re-recording a month's allocation upserts this key.
  unique (goal_id, period_start)
);

create index if not exists idx_finance_goal_allocations_user
  on finance_goal_allocations (user_id, period_start desc);

alter table finance_goal_allocations enable row level security;
alter table finance_goal_allocations force row level security;

drop policy if exists "finance_goal_allocations_select" on finance_goal_allocations;
create policy "finance_goal_allocations_select"
  on finance_goal_allocations for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_goal_allocations_insert" on finance_goal_allocations;
create policy "finance_goal_allocations_insert"
  on finance_goal_allocations for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_goal_allocations_update" on finance_goal_allocations;
create policy "finance_goal_allocations_update"
  on finance_goal_allocations for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_goal_allocations_delete" on finance_goal_allocations;
create policy "finance_goal_allocations_delete"
  on finance_goal_allocations for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ROLLBACK (manual):
-- drop table if exists finance_goal_allocations;
-- alter table finance_savings_goals
--   drop constraint if exists finance_savings_goals_linked_account_fk;
