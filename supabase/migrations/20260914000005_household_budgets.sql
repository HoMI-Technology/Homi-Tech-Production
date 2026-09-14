-- =============================================================================
-- 20260914000005_household_budgets.sql — Phase 2 household shared budgets.
--
-- Conservative scope: shared VISIBILITY of budget periods only.
--   • finance_budget_periods gains a nullable household_id. A period with
--     household_id set is readable by members of that household.
--   • WRITES STAY OWNER-ONLY: the existing insert/update/delete policies are
--     untouched (user_id = auth.uid()); no new write policies are added.
--   • Transactions remain private in v1 — finance_transactions policies are
--     untouched. A household member sees the period's plan (bounds, expected
--     income, reserve), never the partner's ledger rows.
--
-- RLS pattern follows 00039_households.sql EXACTLY: membership is checked via
-- exists(select 1 from household_members ...) with (select auth.uid()), the
-- same predicate shape households_member_select / household_members_select
-- already use (including their deliberate self-referential read of
-- household_members). No new helper function is introduced — the household
-- migrations' only function (household_join_allowed) governs joining, not
-- reading, and inventing a parallel helper would fork the pattern.
--
-- APPLY: single-file only — never blanket `supabase db push`. See
-- docs/ops/MIGRATIONS-SSOT.md.
-- =============================================================================

alter table finance_budget_periods
  add column if not exists household_id uuid references households (id) on delete set null;

create index if not exists idx_finance_budget_periods_household
  on finance_budget_periods (household_id)
  where household_id is not null;

comment on column finance_budget_periods.household_id is
  'Set = the period is visible to members of this household (read-only). '
  'Null = personal period (owner-only), the default. Transactions stay '
  'owner-private in v1 regardless.';

-- Additional PERMISSIVE select policy: permissive policies OR together, so
-- the existing owner policy keeps working unchanged and this widens reads to
-- household members only. Writes are intentionally not covered here.
drop policy if exists "finance_budget_periods_household_select" on finance_budget_periods;
create policy "finance_budget_periods_household_select"
  on finance_budget_periods for select
  to authenticated
  using (
    household_id is not null
    and exists (
      select 1 from household_members m
      where m.household_id = finance_budget_periods.household_id
        and m.user_id = (select auth.uid())
    )
  );

-- ROLLBACK (manual):
-- drop policy if exists "finance_budget_periods_household_select" on finance_budget_periods;
-- alter table finance_budget_periods drop column if exists household_id;
