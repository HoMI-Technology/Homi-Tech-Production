-- =============================================================================
-- 20260802000003_tools_overlay_sync.sql — server side of the tools overlay state.
--
-- Audit T2.6 (split-brain persistence): lens-derived overlay values (mortgage
-- target price, rent, rates, etc.) were localStorage-only, so users lost their
-- tool inputs across devices or in incognito sessions. This table is the server
-- side of the local-first sync contract in lib/persistence.ts: one row per
-- user, the whole ToolsOverlay as jsonb, last-write-wins by the client's clock
-- (client_updated_at, ms epoch) since overlay fields are single-author.
--
-- Owner-only forced RLS, matching the finance_state policy shape from 00023.
-- Writes go through the authenticated client — no service role involved.
-- =============================================================================

create table if not exists user_tools_overlay (
  user_id uuid primary key references profiles (id) on delete cascade,
  state jsonb not null check (pg_column_size(state) <= 32768),
  -- ms-epoch stamp from the writing client; the LWW tiebreaker.
  client_updated_at bigint not null check (client_updated_at >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table user_tools_overlay enable row level security;
alter table user_tools_overlay force row level security;

drop policy if exists "tools_overlay_owner_select" on user_tools_overlay;
create policy "tools_overlay_owner_select"
  on user_tools_overlay for select
  using (user_id = (select auth.uid()));

drop policy if exists "tools_overlay_owner_insert" on user_tools_overlay;
create policy "tools_overlay_owner_insert"
  on user_tools_overlay for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "tools_overlay_owner_update" on user_tools_overlay;
create policy "tools_overlay_owner_update"
  on user_tools_overlay for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "tools_overlay_owner_delete" on user_tools_overlay;
create policy "tools_overlay_owner_delete"
  on user_tools_overlay for delete
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on user_tools_overlay;
create trigger set_updated_at
  before update on user_tools_overlay
  for each row execute function touch_updated_at();

-- ROLLBACK:
-- drop table if exists user_tools_overlay;
