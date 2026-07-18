-- =============================================================================
-- 00022_user_finance_state.sql — manual Finance dashboard state. Apply after
-- 00021_readiness_calibration. (Renumbered from 00021 to avoid colliding with
-- the calibration migration that landed on main first.)
--
-- Audit T2.6 (split-brain persistence): /finance was localStorage-only while
-- the dashboard read the database — the same user got different answers about
-- their own money on different devices. This table is the server side of the
-- local-first sync contract in lib/persistence.ts: one row per user, the
-- whole FinanceState as jsonb, last-write-wins by the client's own clock
-- (client_updated_at, ms epoch) since finance numbers are single-author.
--
-- Owner-only forced RLS, matching the goals policy shape from 00018. Writes
-- go through the authenticated client — no service role involved.
-- =============================================================================

create table if not exists user_finance_state (
  user_id uuid primary key references profiles (id) on delete cascade,
  state jsonb not null check (pg_column_size(state) <= 65536),
  -- ms-epoch stamp from the writing client; the LWW tiebreaker.
  client_updated_at bigint not null check (client_updated_at >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_finance_state enable row level security;
alter table user_finance_state force row level security;

drop policy if exists "finance_state_owner_select" on user_finance_state;
create policy "finance_state_owner_select"
  on user_finance_state for select
  using (user_id = (select auth.uid()));

drop policy if exists "finance_state_owner_insert" on user_finance_state;
create policy "finance_state_owner_insert"
  on user_finance_state for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_state_owner_update" on user_finance_state;
create policy "finance_state_owner_update"
  on user_finance_state for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_state_owner_delete" on user_finance_state;
create policy "finance_state_owner_delete"
  on user_finance_state for delete
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on user_finance_state;
create trigger set_updated_at
  before update on user_finance_state
  for each row execute function touch_updated_at();

-- ROLLBACK:
-- drop table if exists user_finance_state;
