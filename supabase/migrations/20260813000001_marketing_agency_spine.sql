-- =============================================================================
-- 20260813000001_marketing_agency_spine.sql
-- Agency OS P0–P3 spine: assets (approval lifecycle), agent run ledger,
-- durable calendar + competitor log, activation aggregates RPC.
-- Admin-only via is_admin() (00004). Idempotent.
-- =============================================================================

-- ── marketing_assets (approval spine) ───────────────────────────────────────
create table if not exists marketing_assets (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  kind text not null
    check (kind in (
      'post', 'caption', 'image_brief', 'drip_step', 'brief',
      'week_slot', 'insight', 'analytics', 'competitor_derived'
    )),
  status text not null default 'draft'
    check (status in ('draft', 'in_review', 'approved', 'published', 'rejected')),
  platform text,
  title text not null default '',
  body text not null default '',
  meta jsonb not null default '{}'::jsonb,
  source text not null default 'template'
    check (source in ('model', 'template', 'human', 'cron')),
  model text,
  flagged text[] not null default '{}',
  claim_law_rev text not null default 'v1',
  agent_id text,
  created_by uuid references auth.users (id) on delete set null,
  approved_by uuid references auth.users (id) on delete set null,
  approved_at timestamptz,
  rejected_reason text,
  published_at timestamptz,
  publish_target text,
  publish_status integer,
  parent_id uuid references marketing_assets (id) on delete set null,
  -- Cron-created rows (created_by is null) may never be approved without a human.
  constraint marketing_assets_cron_not_auto_approved
    check (created_by is not null or status not in ('approved', 'published'))
);

create index if not exists idx_marketing_assets_status_created
  on marketing_assets (status, created_at desc);
create index if not exists idx_marketing_assets_kind on marketing_assets (kind);
create index if not exists idx_marketing_assets_agent on marketing_assets (agent_id);

alter table marketing_assets enable row level security;
alter table marketing_assets force row level security;

drop policy if exists marketing_assets_admin_all on marketing_assets;
create policy marketing_assets_admin_all on marketing_assets
  for all to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update, delete on marketing_assets to authenticated;
revoke all on marketing_assets from anon;

-- ── marketing_agent_runs (P3 ledger) ────────────────────────────────────────
create table if not exists marketing_agent_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  agent_id text,
  model text,
  source text not null default 'template'
    check (source in ('model', 'template', 'error')),
  input_tokens integer,
  output_tokens integer,
  latency_ms integer,
  flagged text[] not null default '{}',
  actor_id uuid references auth.users (id) on delete set null,
  asset_id uuid references marketing_assets (id) on delete set null,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists idx_marketing_agent_runs_created
  on marketing_agent_runs (created_at desc);
create index if not exists idx_marketing_agent_runs_action
  on marketing_agent_runs (action);

alter table marketing_agent_runs enable row level security;
alter table marketing_agent_runs force row level security;

drop policy if exists marketing_agent_runs_admin_all on marketing_agent_runs;
create policy marketing_agent_runs_admin_all on marketing_agent_runs
  for all to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert on marketing_agent_runs to authenticated;
revoke all on marketing_agent_runs from anon;

-- ── marketing_calendar_entries (P2 durability) ──────────────────────────────
create table if not exists marketing_calendar_entries (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  day_key text not null,
  slot text not null default 'morning',
  title text not null default '',
  body text not null default '',
  platform text,
  campaign text,
  meta jsonb not null default '{}'::jsonb,
  user_id uuid references auth.users (id) on delete set null,
  unique (day_key, slot)
);

create index if not exists idx_marketing_calendar_day on marketing_calendar_entries (day_key);

alter table marketing_calendar_entries enable row level security;
alter table marketing_calendar_entries force row level security;

drop policy if exists marketing_calendar_admin_all on marketing_calendar_entries;
create policy marketing_calendar_admin_all on marketing_calendar_entries
  for all to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update, delete on marketing_calendar_entries to authenticated;
revoke all on marketing_calendar_entries from anon;

-- ── marketing_competitor_log (P2 durability) ────────────────────────────────
create table if not exists marketing_competitor_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  account text not null default '',
  hook text not null,
  posted_on date,
  tags text[] not null default '{}',
  impressions integer check (impressions is null or impressions >= 0),
  user_id uuid references auth.users (id) on delete set null
);

create index if not exists idx_marketing_competitor_created
  on marketing_competitor_log (created_at desc);

alter table marketing_competitor_log enable row level security;
alter table marketing_competitor_log force row level security;

drop policy if exists marketing_competitor_admin_all on marketing_competitor_log;
create policy marketing_competitor_admin_all on marketing_competitor_log
  for all to authenticated
  using (is_admin())
  with check (is_admin());

grant select, insert, update, delete on marketing_competitor_log to authenticated;
revoke all on marketing_competitor_log from anon;

-- ── Activation aggregates RPC (P2/P3 — kills client 10k scan) ───────────────
-- Returns daily unique activated users for the last `p_days` days (UTC).
create or replace function marketing_activation_series(p_days integer default 30)
returns table (day date, unique_users bigint, completions bigint)
language sql
security definer
set search_path = public
stable
as $$
  with bounds as (
    select (current_date - (greatest(p_days, 1) - 1))::date as start_day
  ),
  days as (
    select generate_series(
      (select start_day from bounds),
      current_date,
      interval '1 day'
    )::date as day
  ),
  completed as (
    select
      (coalesce(a.completed_at, a.created_at) at time zone 'utc')::date as day,
      a.user_id
    from assessments a, bounds b
    where a.status = 'completed'
      and coalesce(a.completed_at, a.created_at) >= b.start_day::timestamptz
      and a.user_id is not null
  )
  select
    d.day,
    count(distinct c.user_id)::bigint as unique_users,
    count(c.user_id)::bigint as completions
  from days d
  left join completed c on c.day = d.day
  group by d.day
  order by d.day;
$$;

revoke all on function marketing_activation_series(integer) from public;
grant execute on function marketing_activation_series(integer) to authenticated;
grant execute on function marketing_activation_series(integer) to service_role;

-- ROLLBACK:
-- drop function if exists marketing_activation_series(integer);
-- drop table if exists marketing_competitor_log;
-- drop table if exists marketing_calendar_entries;
-- drop table if exists marketing_agent_runs;
-- drop table if exists marketing_assets;
