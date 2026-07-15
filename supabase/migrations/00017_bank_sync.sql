-- =============================================================================
-- 00017_bank_sync.sql — Plaid bank-sync foundation. Apply after 00016.
--
-- Part A — adopt three tables that exist in production but were never captured
-- in a migration (financial_snapshots, credit_snapshots, behavioral_genome).
-- Declared with IF NOT EXISTS so production is untouched; fresh environments
-- get the same shape. RLS enabled with owner-only policies.
--
-- Part B — new bank-sync tables:
--   • plaid_items: one row per linked institution login. Stores the Plaid
--     access token ONLY as AES-256-GCM ciphertext (access_token_ct, see
--     lib/plaid/crypto.ts) with a key_version for future rotation.
--   • plaid_accounts: accounts under an item, refreshed by the sync path.
--
-- SECURITY: access_token_ct must never reach the client. Postgres RLS is
-- row-level, not column-level, so plaid_items pairs a user_id select policy
-- with a COLUMN-LEVEL grant: authenticated may select only the safe columns.
-- All writes on both tables are service-role only (no write policies).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Part A · financial_snapshots (adopted from production)
-- ---------------------------------------------------------------------------
create table if not exists financial_snapshots (
  id uuid primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  state jsonb not null,
  net_worth numeric not null,
  net_cash_flow numeric not null,
  savings_rate numeric not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table financial_snapshots enable row level security;

drop policy if exists "financial_snapshots_owner_select" on financial_snapshots;
create policy "financial_snapshots_owner_select"
  on financial_snapshots for select
  using (user_id = (select auth.uid()));

drop policy if exists "financial_snapshots_owner_insert" on financial_snapshots;
create policy "financial_snapshots_owner_insert"
  on financial_snapshots for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "financial_snapshots_owner_update" on financial_snapshots;
create policy "financial_snapshots_owner_update"
  on financial_snapshots for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "financial_snapshots_owner_delete" on financial_snapshots;
create policy "financial_snapshots_owner_delete"
  on financial_snapshots for delete
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Part A · credit_snapshots (adopted from production)
-- ---------------------------------------------------------------------------
create table if not exists credit_snapshots (
  id uuid primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  score integer not null,
  utilization integer not null,
  on_time_streak_months integer not null,
  band text,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table credit_snapshots enable row level security;

drop policy if exists "credit_snapshots_owner_select" on credit_snapshots;
create policy "credit_snapshots_owner_select"
  on credit_snapshots for select
  using (user_id = (select auth.uid()));

drop policy if exists "credit_snapshots_owner_insert" on credit_snapshots;
create policy "credit_snapshots_owner_insert"
  on credit_snapshots for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "credit_snapshots_owner_update" on credit_snapshots;
create policy "credit_snapshots_owner_update"
  on credit_snapshots for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "credit_snapshots_owner_delete" on credit_snapshots;
create policy "credit_snapshots_owner_delete"
  on credit_snapshots for delete
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Part A · behavioral_genome (adopted from production)
-- ---------------------------------------------------------------------------
create table if not exists behavioral_genome (
  id uuid primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  answers jsonb not null,
  scores jsonb not null,
  completed_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table behavioral_genome enable row level security;

drop policy if exists "behavioral_genome_owner_select" on behavioral_genome;
create policy "behavioral_genome_owner_select"
  on behavioral_genome for select
  using (user_id = (select auth.uid()));

drop policy if exists "behavioral_genome_owner_insert" on behavioral_genome;
create policy "behavioral_genome_owner_insert"
  on behavioral_genome for insert
  with check (user_id = (select auth.uid()));

drop policy if exists "behavioral_genome_owner_update" on behavioral_genome;
create policy "behavioral_genome_owner_update"
  on behavioral_genome for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "behavioral_genome_owner_delete" on behavioral_genome;
create policy "behavioral_genome_owner_delete"
  on behavioral_genome for delete
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- Part B · plaid_items
-- ---------------------------------------------------------------------------
create table if not exists plaid_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  item_id text not null unique,
  access_token_ct text not null,
  key_version smallint not null default 1,
  institution_id text,
  institution_name text,
  status text not null default 'healthy'
    check (status in ('healthy', 'login_required', 'pending_disconnect', 'pending_expiration', 'revoked')),
  transactions_cursor text,
  cursor_updated_at timestamptz,
  last_successful_sync timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plaid_items_user on plaid_items (user_id);

alter table plaid_items enable row level security;
alter table plaid_items force row level security;

-- Column-level lockdown: authenticated may read ONLY the safe columns —
-- access_token_ct (and the sync cursor) stay reachable by service_role alone.
revoke all on plaid_items from anon, authenticated;
grant select (id, user_id, institution_id, institution_name, status, last_successful_sync, created_at)
  on plaid_items to authenticated;
grant all on plaid_items to service_role;

drop policy if exists "plaid_items_owner_select" on plaid_items;
create policy "plaid_items_owner_select"
  on plaid_items for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No insert/update/delete policies — writes go through the service-role
-- client only (exchange route + sync path), which bypasses RLS.

drop trigger if exists set_updated_at on plaid_items;
create trigger set_updated_at
  before update on plaid_items
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Part B · plaid_accounts
-- ---------------------------------------------------------------------------
create table if not exists plaid_accounts (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references plaid_items (id) on delete cascade,
  account_id text not null unique,
  name text not null,
  mask text,
  type text not null,
  subtype text,
  current_balance numeric,
  available_balance numeric,
  iso_currency text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_plaid_accounts_item on plaid_accounts (item_id);

alter table plaid_accounts enable row level security;
alter table plaid_accounts force row level security;

revoke all on plaid_accounts from anon, authenticated;
grant select on plaid_accounts to authenticated;
grant all on plaid_accounts to service_role;

drop policy if exists "plaid_accounts_owner_select" on plaid_accounts;
create policy "plaid_accounts_owner_select"
  on plaid_accounts for select
  to authenticated
  using (
    exists (
      select 1 from plaid_items i
      where i.id = plaid_accounts.item_id
        and i.user_id = (select auth.uid())
    )
  );

-- No insert/update/delete policies — service-role writes only.

drop trigger if exists set_updated_at on plaid_accounts;
create trigger set_updated_at
  before update on plaid_accounts
  for each row execute function touch_updated_at();

-- ROLLBACK:
-- drop table if exists plaid_accounts;
-- drop table if exists plaid_items;
-- (Part A tables are production-adopted — do not drop them on rollback.)
