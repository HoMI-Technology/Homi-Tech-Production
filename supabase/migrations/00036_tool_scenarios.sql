-- =============================================================================
-- 00036_tool_scenarios.sql — Decision Lab Phase 4: saved tool scenarios.
-- Apply after 00035_partner_attribution_backfill.
--
-- A scenario is a named snapshot of one lens's inputs ("House at $420k") plus
-- the CFM core it was saved against. The snapshot is deliberate: when the
-- user's real numbers change later, the scenario is honestly STALE — the UI
-- shows the drift and offers a refresh. Auto-refresh would silently rewrite
-- the meaning of a saved decision, which a decision-record product must never
-- do.
--
-- Owner-only forced RLS, matching user_finance_state (00023). Writes go
-- through the authenticated API route, which enforces the per-tier scenario
-- cap (entitlements.maxScenarios) server-side before insert.
-- =============================================================================

create table if not exists tool_scenarios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  -- Which lens this was saved from (registry id, e.g. "mortgage"). Comparison
  -- only makes sense within a lens, so the lens travels with the row.
  lens_id text not null check (char_length(lens_id) between 1 and 40),
  -- The lens's slider values at save time (numeric-only by API validation).
  inputs jsonb not null check (pg_column_size(inputs) <= 8192),
  -- CFM core at save time — the staleness anchor. Null allowed for scenarios
  -- saved before any finance data existed (they can never go stale).
  cfm_snapshot jsonb check (cfm_snapshot is null or pg_column_size(cfm_snapshot) <= 8192),
  -- ms-epoch stamp from the writing client; LWW tiebreaker for future sync.
  client_updated_at bigint not null check (client_updated_at >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tool_scenarios_user_idx on tool_scenarios (user_id, created_at desc);

alter table tool_scenarios enable row level security;
alter table tool_scenarios force row level security;

drop policy if exists "tool_scenarios_owner_select" on tool_scenarios;
create policy "tool_scenarios_owner_select"
  on tool_scenarios for select
  using (user_id = (select auth.uid()));

drop policy if exists "tool_scenarios_owner_insert" on tool_scenarios;
create policy "tool_scenarios_owner_insert"
  on tool_scenarios for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "tool_scenarios_owner_update" on tool_scenarios;
create policy "tool_scenarios_owner_update"
  on tool_scenarios for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "tool_scenarios_owner_delete" on tool_scenarios;
create policy "tool_scenarios_owner_delete"
  on tool_scenarios for delete
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on tool_scenarios;
create trigger set_updated_at
  before update on tool_scenarios
  for each row execute function touch_updated_at();

-- ROLLBACK:
-- drop table if exists tool_scenarios;
