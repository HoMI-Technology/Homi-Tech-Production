-- =============================================================================
-- 00024 · plaid_transactions — full transaction persistence
--
-- Resolves the deliberate Session-2 limitation in lib/plaid/sync.ts: cash-flow
-- math used only the CURRENT sync window's transactions, so incremental syncs
-- under-reported. With this table the sync engine upserts every added/modified
-- transaction (and deletes removed ones), and 30-day cash flow is computed
-- from the full stored history — the moment "verified" data becomes real.
--
-- SECURITY: same posture as plaid_accounts (00017) — RLS FORCEd, reads scoped
-- to the owner via user_id, ALL writes service-role only (no write policies).
-- user_id is denormalized from plaid_items for cheap RLS and window queries.
-- =============================================================================

create table if not exists plaid_transactions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references plaid_items (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  account_id text,
  transaction_id text not null unique,
  -- Plaid convention: positive = money OUT of the account, negative = money IN.
  amount numeric not null,
  txn_date date,
  name text,
  merchant_name text,
  category text,
  pending boolean not null default false,
  iso_currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_plaid_transactions_user_date
  on plaid_transactions (user_id, txn_date desc);
create index if not exists idx_plaid_transactions_item
  on plaid_transactions (item_id);

alter table plaid_transactions enable row level security;
alter table plaid_transactions force row level security;

revoke all on plaid_transactions from anon, authenticated;
grant select on plaid_transactions to authenticated;
grant all on plaid_transactions to service_role;

drop policy if exists "plaid_transactions_owner_select" on plaid_transactions;
create policy "plaid_transactions_owner_select"
  on plaid_transactions for select
  to authenticated
  using (user_id = (select auth.uid()));

-- No insert/update/delete policies — service-role writes only.
