-- =============================================================================
-- 00007_family_calendar.sql — Family mode + milestone calendar
-- =============================================================================

create table if not exists family_accounts (
  id uuid primary key default gen_random_uuid(),
  primary_user_id uuid not null references profiles (id) on delete cascade,
  household_name text not null,
  members jsonb not null default '[]',
  shared_goals jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  kind text not null default 'milestone',
  event_date date not null,
  notes text,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_family_accounts_primary_user
  on family_accounts (primary_user_id);
create index if not exists idx_calendar_events_user_date
  on calendar_events (user_id, event_date);

alter table family_accounts enable row level security;
alter table family_accounts force row level security;
alter table calendar_events enable row level security;
alter table calendar_events force row level security;

drop policy if exists "family_accounts_owner_all" on family_accounts;
create policy "family_accounts_owner_all"
  on family_accounts for all
  using (auth.uid() = primary_user_id)
  with check (auth.uid() = primary_user_id);

drop policy if exists "calendar_events_owner_all" on calendar_events;
create policy "calendar_events_owner_all"
  on calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_updated_at on family_accounts;
create trigger set_updated_at
  before update on family_accounts
  for each row execute function touch_updated_at();