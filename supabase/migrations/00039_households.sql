-- =============================================================================
-- 00039_households.sql — True dual-user household accounts
-- Two members share readiness context; each keeps their own auth + assessments.
-- Apply after 00038_user_readiness_path.
-- =============================================================================

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Our household',
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'partner'
    check (role in ('owner', 'partner')),
  display_name text,
  -- Latest assessment snapshot for dual scoring (never the only SSOT).
  last_score numeric,
  last_verdict text,
  last_assessment_at timestamptz,
  joined_at timestamptz not null default now(),
  unique (household_id, user_id)
);

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  invited_by uuid not null references profiles (id) on delete cascade,
  email text not null,
  token text not null unique,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '14 days')
);

create index if not exists idx_household_members_user
  on household_members (user_id);
create index if not exists idx_household_members_hh
  on household_members (household_id);
create index if not exists idx_household_invites_token
  on household_invites (token);
create index if not exists idx_household_invites_email
  on household_invites (lower(email));

alter table households enable row level security;
alter table households force row level security;
alter table household_members enable row level security;
alter table household_members force row level security;
alter table household_invites enable row level security;
alter table household_invites force row level security;

-- Members can read their household
drop policy if exists "households_member_select" on households;
create policy "households_member_select"
  on households for select
  using (
    exists (
      select 1 from household_members m
      where m.household_id = households.id
        and m.user_id = (select auth.uid())
    )
  );

drop policy if exists "households_owner_insert" on households;
create policy "households_owner_insert"
  on households for insert
  with check (created_by = (select auth.uid()));

drop policy if exists "households_member_update" on households;
create policy "households_member_update"
  on households for update
  using (
    exists (
      select 1 from household_members m
      where m.household_id = households.id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
  );

drop policy if exists "household_members_select" on household_members;
create policy "household_members_select"
  on household_members for select
  using (
    exists (
      select 1 from household_members me
      where me.household_id = household_members.household_id
        and me.user_id = (select auth.uid())
    )
  );

drop policy if exists "household_members_insert_self" on household_members;
create policy "household_members_insert_self"
  on household_members for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "household_members_update_self" on household_members;
create policy "household_members_update_self"
  on household_members for update
  using (user_id = (select auth.uid()));

drop policy if exists "household_invites_member_all" on household_invites;
create policy "household_invites_member_all"
  on household_invites for all
  using (
    exists (
      select 1 from household_members m
      where m.household_id = household_invites.household_id
        and m.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from household_members m
      where m.household_id = household_invites.household_id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
    or invited_by = (select auth.uid())
  );

drop trigger if exists set_updated_at on households;
create trigger set_updated_at
  before update on households
  for each row execute function touch_updated_at();

-- ROLLBACK:
-- drop table if exists household_invites;
-- drop table if exists household_members;
-- drop table if exists households;
