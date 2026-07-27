-- =============================================================================
-- 00038_user_readiness_path.sql — Path to Ready server persistence
--
-- One row per user; full ReadinessPath JSON (steps include status).
-- Local-first LWW via client_updated_at (same contract as user_finance_state).
-- Apply after 00037_ad_spend (main).
-- =============================================================================

create table if not exists user_readiness_path (
  user_id uuid primary key references profiles (id) on delete cascade,
  path jsonb not null check (pg_column_size(path) <= 131072),
  client_updated_at bigint not null check (client_updated_at >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_readiness_path enable row level security;
alter table user_readiness_path force row level security;

drop policy if exists "readiness_path_owner_select" on user_readiness_path;
create policy "readiness_path_owner_select"
  on user_readiness_path for select
  using (user_id = (select auth.uid()));

drop policy if exists "readiness_path_owner_insert" on user_readiness_path;
create policy "readiness_path_owner_insert"
  on user_readiness_path for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "readiness_path_owner_update" on user_readiness_path;
create policy "readiness_path_owner_update"
  on user_readiness_path for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "readiness_path_owner_delete" on user_readiness_path;
create policy "readiness_path_owner_delete"
  on user_readiness_path for delete
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on user_readiness_path;
create trigger set_updated_at
  before update on user_readiness_path
  for each row execute function touch_updated_at();

-- ROLLBACK:
-- drop table if exists user_readiness_path;
