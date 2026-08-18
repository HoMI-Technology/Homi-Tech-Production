-- Plaid full picture: identity (server-only), holdings, investment
-- transactions, liabilities. Same RLS posture as 00024 — FORCE RLS,
-- owner select via denormalized user_id, service-role writes only.
-- Identity has NO authenticated SELECT: owners stay off the Data API.

-- ---------------------------------------------------------------------------
-- plaid_account_owners (bank-file Identity; not KYC)
-- ---------------------------------------------------------------------------
create table if not exists plaid_account_owners (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references plaid_items (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  account_id text not null unique,
  names text[] not null default '{}',
  emails jsonb not null default '[]'::jsonb,
  phone_numbers jsonb not null default '[]'::jsonb,
  addresses jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plaid_account_owners_user
  on plaid_account_owners (user_id);

alter table plaid_account_owners enable row level security;
alter table plaid_account_owners force row level security;
revoke all on plaid_account_owners from anon, authenticated;
grant all on plaid_account_owners to service_role;

-- ---------------------------------------------------------------------------
-- plaid_securities (instrument catalog; not user-scoped)
-- ---------------------------------------------------------------------------
create table if not exists plaid_securities (
  security_id text primary key,
  name text,
  ticker_symbol text,
  type text,
  subtype text,
  figi text,
  is_cash_equivalent boolean not null default false,
  close_price numeric,
  institution_security_id text,
  institution_id text,
  updated_at timestamptz not null default now()
);

alter table plaid_securities enable row level security;
alter table plaid_securities force row level security;
revoke all on plaid_securities from anon, authenticated;
grant select on plaid_securities to authenticated;
grant all on plaid_securities to service_role;

drop policy if exists "plaid_securities_authenticated_select" on plaid_securities;
create policy "plaid_securities_authenticated_select"
  on plaid_securities for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- plaid_holdings
-- ---------------------------------------------------------------------------
create table if not exists plaid_holdings (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references plaid_items (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  account_id text not null,
  security_id text not null references plaid_securities (security_id),
  quantity numeric,
  institution_price numeric,
  institution_value numeric,
  cost_basis numeric,
  iso_currency text,
  vested_quantity numeric,
  vested_value numeric,
  updated_at timestamptz not null default now(),
  unique (account_id, security_id)
);

create index if not exists idx_plaid_holdings_user on plaid_holdings (user_id);
create index if not exists idx_plaid_holdings_item on plaid_holdings (item_id);

alter table plaid_holdings enable row level security;
alter table plaid_holdings force row level security;
revoke all on plaid_holdings from anon, authenticated;
grant select on plaid_holdings to authenticated;
grant all on plaid_holdings to service_role;

drop policy if exists "plaid_holdings_owner_select" on plaid_holdings;
create policy "plaid_holdings_owner_select"
  on plaid_holdings for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- plaid_investment_transactions
-- ---------------------------------------------------------------------------
create table if not exists plaid_investment_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references plaid_items (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  account_id text,
  security_id text,
  investment_transaction_id text not null unique,
  -- Plaid investments convention: positive = buy / money out, negative = sale.
  amount numeric,
  quantity numeric,
  price numeric,
  fees numeric,
  txn_date date,
  name text,
  type text,
  subtype text,
  iso_currency text,
  cancel_transaction_id text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_plaid_inv_txn_user_date
  on plaid_investment_transactions (user_id, txn_date desc);
create index if not exists idx_plaid_inv_txn_item
  on plaid_investment_transactions (item_id);

alter table plaid_investment_transactions enable row level security;
alter table plaid_investment_transactions force row level security;
revoke all on plaid_investment_transactions from anon, authenticated;
grant select on plaid_investment_transactions to authenticated;
grant all on plaid_investment_transactions to service_role;

drop policy if exists "plaid_inv_txn_owner_select" on plaid_investment_transactions;
create policy "plaid_inv_txn_owner_select"
  on plaid_investment_transactions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- plaid_liabilities
-- ---------------------------------------------------------------------------
create table if not exists plaid_liabilities (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references plaid_items (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  account_id text not null unique,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists idx_plaid_liabilities_user on plaid_liabilities (user_id);

alter table plaid_liabilities enable row level security;
alter table plaid_liabilities force row level security;
revoke all on plaid_liabilities from anon, authenticated;
grant select on plaid_liabilities to authenticated;
grant all on plaid_liabilities to service_role;

drop policy if exists "plaid_liabilities_owner_select" on plaid_liabilities;
create policy "plaid_liabilities_owner_select"
  on plaid_liabilities for select
  to authenticated
  using (user_id = (select auth.uid()));

comment on table plaid_account_owners is
  'Bank-file Identity from /identity/get. Service-role only. Not a consumer report.';
comment on table plaid_holdings is
  'Plaid investment holdings snapshot. Replace on HOLDINGS.DEFAULT_UPDATE.';
comment on table plaid_investment_transactions is
  'Plaid investment transactions. Separate from plaid_transactions (sign inverted).';
comment on table plaid_liabilities is
  'Plaid liabilities payload per account (credit / student / mortgage).';
