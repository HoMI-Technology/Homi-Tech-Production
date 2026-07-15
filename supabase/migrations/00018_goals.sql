-- =============================================================================
-- 00018_goals.sql — user savings goals. Apply after 00017.
--
-- One row per (user, kind). Session 3 ships the single kind 'down_payment'
-- (the dashboard goal card); the check constraint widens when new kinds land.
-- Goals are core product — NOT gated by the bankSync entitlement — so writes
-- go through the authenticated client under owner-only RLS (no service role
-- involved), matching the financial_snapshots policy shape from 00017.
-- =============================================================================

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null check (kind in ('down_payment')),
  label text,
  target_amount numeric not null check (target_amount > 0),
  target_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, kind)
);

create index if not exists idx_goals_user on goals (user_id);

alter table goals enable row level security;
alter table goals force row level security;

drop policy if exists "goals_owner_select" on goals;
create policy "goals_owner_select"
  on goals for select
  using (user_id = (select auth.uid()));

drop policy if exists "goals_owner_insert" on goals;
create policy "goals_owner_insert"
  on goals for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "goals_owner_update" on goals;
create policy "goals_owner_update"
  on goals for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "goals_owner_delete" on goals;
create policy "goals_owner_delete"
  on goals for delete
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on goals;
create trigger set_updated_at
  before update on goals
  for each row execute function touch_updated_at();

-- ROLLBACK:
-- drop table if exists goals;
