-- =============================================================================
-- 20260914000006_path_to_ready.sql — Phase 3: Path to Ready v1 (server model)
--
-- The market-differentiating Build Path: after a non-ready verdict, a dated,
-- diagnosis-driven plan of milestones tied to finance metrics, with provenance
-- and confidence caps on every amount, and partner disagreement as a
-- first-class state.
--
-- The Path CONSUMES the recorded verdict/hard-stops from `assessments`;
-- scoring math never lives here (lib/scoring is frozen SSOT).
--
-- APPLY: single-file only — never blanket `supabase db push`. See
-- docs/ops/MIGRATIONS-SSOT.md.
--
-- Security (Supabase checklist):
--   • FORCE RLS on all three tables
--   • Policies TO authenticated with (select auth.uid()) ownership predicate
--   • UPDATE has both USING and WITH CHECK
--   • path_partner_states: both partners read the shared row; only the plan
--     owner writes, and only when both share a household (00039 pattern).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- path_plans — one row per generated Build Path (versioned)
-- ---------------------------------------------------------------------------
create table if not exists path_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,

  -- Optional anchor to a finance savings goal (00018 / 20260914000004).
  goal_id uuid references finance_savings_goals (id) on delete set null,

  status text not null default 'draft'
    check (status in ('draft', 'active', 'completed', 'archived')),

  -- The recorded diagnosis this plan was generated FROM: verdict, hard-stops,
  -- pillar snapshot, metric timestamps. Never a recomputation.
  diagnosis jsonb not null check (pg_column_size(diagnosis) <= 65536),

  -- Hard-stop code or 'pillar:<key>' — the constraint resolved first.
  binding_constraint text,

  -- The assessment row this plan was generated from (nullable: a plan can
  -- outlive a deleted assessment without losing the path).
  assessment_result_id uuid references assessments (id) on delete set null,

  -- Supersede chain: regenerating after a changed diagnosis bumps version.
  version int not null default 1 check (version >= 1),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_path_plans_user_active
  on path_plans (user_id, status)
  where status in ('draft', 'active');

-- ---------------------------------------------------------------------------
-- path_milestones — ordered steps of a plan
-- ---------------------------------------------------------------------------
create table if not exists path_milestones (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references path_plans (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,

  title text not null check (char_length(title) <= 200),
  description text not null default '' check (char_length(description) <= 4000),

  milestone_kind text not null
    check (milestone_kind in ('hard_stop', 'savings', 'debt', 'credit', 'timing', 'evidence')),

  -- Date-only; null when no honest date exists.
  target_date date,

  -- Integer cents, positive magnitude; null when inputs are missing — an
  -- amount is derived from recorded data or withheld, never invented.
  target_amount_cents bigint check (
    target_amount_cents is null
    or (target_amount_cents > 0 and target_amount_cents <= 10000000000)
  ),

  -- Provenance: which metric/goal the target came from + confidence cap.
  funding_source jsonb check (
    funding_source is null or pg_column_size(funding_source) <= 8192
  ),

  -- Lens id from lib/tools/registry.ts; validated in app code (the registry
  -- is code, not data, so no FK is possible).
  tool_slug text check (tool_slug is null or char_length(tool_slug) <= 64),

  depends_on uuid references path_milestones (id) on delete set null,
  sort_order int not null check (sort_order >= 0),

  status text not null default 'pending'
    check (status in ('pending', 'active', 'done', 'skipped')),
  completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_path_milestones_plan
  on path_milestones (plan_id, sort_order);
create index if not exists idx_path_milestones_user
  on path_milestones (user_id);

-- ---------------------------------------------------------------------------
-- path_partner_states — partner alignment per plan (disagreement is data)
-- ---------------------------------------------------------------------------
create table if not exists path_partner_states (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references path_plans (id) on delete cascade,
  -- The plan owner.
  user_id uuid not null references profiles (id) on delete cascade,
  -- The partner whose view is recorded.
  partner_user_id uuid not null references profiles (id) on delete cascade,

  state text not null default 'pending'
    check (state in ('aligned', 'diverged', 'pending')),

  -- What the partner saw/agreed to, when recorded (e.g. verdict + constraint).
  partner_snapshot jsonb check (
    partner_snapshot is null or pg_column_size(partner_snapshot) <= 16384
  ),

  noted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),

  unique (plan_id, user_id, partner_user_id),
  check (user_id <> partner_user_id)
);

create index if not exists idx_path_partner_states_partner
  on path_partner_states (partner_user_id);

-- ---------------------------------------------------------------------------
-- RLS — path_plans (owner only)
-- ---------------------------------------------------------------------------
alter table path_plans enable row level security;
alter table path_plans force row level security;

drop policy if exists "path_plans_select" on path_plans;
create policy "path_plans_select"
  on path_plans for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "path_plans_insert" on path_plans;
create policy "path_plans_insert"
  on path_plans for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "path_plans_update" on path_plans;
create policy "path_plans_update"
  on path_plans for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "path_plans_delete" on path_plans;
create policy "path_plans_delete"
  on path_plans for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS — path_milestones (owner only; user_id duplicated for policy simplicity)
-- ---------------------------------------------------------------------------
alter table path_milestones enable row level security;
alter table path_milestones force row level security;

drop policy if exists "path_milestones_select" on path_milestones;
create policy "path_milestones_select"
  on path_milestones for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "path_milestones_insert" on path_milestones;
create policy "path_milestones_insert"
  on path_milestones for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "path_milestones_update" on path_milestones;
create policy "path_milestones_update"
  on path_milestones for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "path_milestones_delete" on path_milestones;
create policy "path_milestones_delete"
  on path_milestones for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- RLS — path_partner_states: both partners READ the shared row; only the
-- plan owner WRITES, and only when both share a household (00039 pattern).
-- ---------------------------------------------------------------------------
alter table path_partner_states enable row level security;
alter table path_partner_states force row level security;

drop policy if exists "path_partner_states_select" on path_partner_states;
create policy "path_partner_states_select"
  on path_partner_states for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or partner_user_id = (select auth.uid())
  );

drop policy if exists "path_partner_states_insert" on path_partner_states;
create policy "path_partner_states_insert"
  on path_partner_states for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from household_members me
      join household_members them
        on them.household_id = me.household_id
      where me.user_id = (select auth.uid())
        and them.user_id = path_partner_states.partner_user_id
    )
  );

drop policy if exists "path_partner_states_update" on path_partner_states;
create policy "path_partner_states_update"
  on path_partner_states for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "path_partner_states_delete" on path_partner_states;
create policy "path_partner_states_delete"
  on path_partner_states for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- updated_at triggers (touch_updated_at from 00005)
-- ---------------------------------------------------------------------------
drop trigger if exists set_updated_at on path_plans;
create trigger set_updated_at
  before update on path_plans
  for each row execute function touch_updated_at();

drop trigger if exists set_updated_at on path_milestones;
create trigger set_updated_at
  before update on path_milestones
  for each row execute function touch_updated_at();

-- ROLLBACK (manual):
-- drop table if exists path_partner_states;
-- drop table if exists path_milestones;
-- drop table if exists path_plans;
