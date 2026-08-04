-- =============================================================================
-- 20260804000001_finance_insights.sql — durable agent insights (Phase 3).
--
-- Stores agent-generated insights server-side so they survive across devices
-- and sessions. Anonymous/offline users continue to fall back to localStorage
-- in the client.
--
-- APPLY: single-file only — never blanket `supabase db push`. See
-- docs/ops/MIGRATIONS-SSOT.md.
-- =============================================================================

create table if not exists finance_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  agent_id text not null check (char_length(agent_id) between 1 and 40),
  type text not null check (char_length(type) between 1 and 40),
  title text not null check (char_length(title) between 1 and 160),
  body text not null check (char_length(body) between 1 and 1000),
  severity text check (severity in ('emerald', 'yellow', 'amber', 'crimson')),
  action_label text check (action_label is null or char_length(action_label) <= 120),
  action_href text check (action_href is null or char_length(action_href) <= 240),
  dismissed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_finance_insights_user_dismissed_created
  on finance_insights (user_id, dismissed_at, created_at desc);

alter table finance_insights enable row level security;
alter table finance_insights force row level security;

drop policy if exists "finance_insights_select" on finance_insights;
create policy "finance_insights_select"
  on finance_insights for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_insights_insert" on finance_insights;
create policy "finance_insights_insert"
  on finance_insights for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_insights_update" on finance_insights;
create policy "finance_insights_update"
  on finance_insights for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_insights_delete" on finance_insights;
create policy "finance_insights_delete"
  on finance_insights for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on finance_insights;
create trigger set_updated_at
  before update on finance_insights
  for each row execute function touch_updated_at();

-- ROLLBACK (manual):
-- drop table if exists finance_insights;
