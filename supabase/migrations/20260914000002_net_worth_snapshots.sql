-- =============================================================================
-- 20260914000002_net_worth_snapshots.sql — Phase 2 net-worth time series.
--
-- Daily point-in-time snapshots computed by lib/finance/networth.ts from the
-- plaid_* tables (never the reverse: snapshots are derived, plaid is source).
--
-- APPLY: single-file only — never blanket `supabase db push`. See
-- docs/ops/MIGRATIONS-SSOT.md.
--
-- SIGN CONVENTION (documented deviation): net_worth_cents is a SIGNED bigint.
-- Transactions keep positive magnitudes because their direction lives in the
-- type column; net worth has no type — debts exceeding assets is a real state
-- (negative net worth) and must be representable, so the sign lives here.
-- total_assets_cents / total_liabilities_cents stay positive magnitudes.
--
-- Security (Supabase checklist):
--   • FORCE RLS
--   • Policies TO authenticated with (select auth.uid()) ownership predicate
--   • UPDATE has both USING and WITH CHECK (prevent user_id reassignment)
-- =============================================================================

create table if not exists finance_net_worth_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,

  -- Date-only budget frame, one snapshot per user per day.
  snapshot_date date not null,

  total_assets_cents bigint not null check (
    total_assets_cents >= 0 and total_assets_cents <= 10000000000
  ),
  total_liabilities_cents bigint not null check (
    total_liabilities_cents >= 0 and total_liabilities_cents <= 10000000000
  ),
  -- SIGNED: assets − liabilities may be negative. See header.
  net_worth_cents bigint not null check (
    net_worth_cents between -10000000000 and 10000000000
  ),

  source text not null check (source in ('plaid', 'manual', 'mixed')),

  -- Per-account signed contributions + completeness metadata from
  -- computeNetWorthSnapshot (missing balances are counted, never invented).
  breakdown jsonb not null default '[]'::jsonb
    check (pg_column_size(breakdown) <= 65536),

  created_at timestamptz not null default now(),

  unique (user_id, snapshot_date)
);

create index if not exists idx_finance_net_worth_user_date
  on finance_net_worth_snapshots (user_id, snapshot_date);

alter table finance_net_worth_snapshots enable row level security;
alter table finance_net_worth_snapshots force row level security;

drop policy if exists "finance_net_worth_select" on finance_net_worth_snapshots;
create policy "finance_net_worth_select"
  on finance_net_worth_snapshots for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_net_worth_insert" on finance_net_worth_snapshots;
create policy "finance_net_worth_insert"
  on finance_net_worth_snapshots for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_net_worth_update" on finance_net_worth_snapshots;
create policy "finance_net_worth_update"
  on finance_net_worth_snapshots for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_net_worth_delete" on finance_net_worth_snapshots;
create policy "finance_net_worth_delete"
  on finance_net_worth_snapshots for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- No updated_at trigger: a snapshot is a point-in-time fact; the daily upsert
-- replaces the whole row's numbers, and created_at records first capture.

-- ROLLBACK (manual):
-- drop table if exists finance_net_worth_snapshots;
