-- =============================================================================
-- 20260803000001_finance_ledger.sql — Budget & Runway PR 3 (schema + RLS only).
--
-- Mirrors lib/finance/ledger.ts (PR 1 domain types) in snake_case integer-cents.
-- Per-record sync (PR 4) and Plaid (PR 6) build on these tables; do not invent
-- float money columns or skip soft-delete.
--
-- APPLY: single-file only — never blanket `supabase db push`. See
-- docs/ops/MIGRATIONS-SSOT.md. Prefer disposable-DB verification first.
--
-- Security (Supabase checklist):
--   • FORCE RLS on every table
--   • Policies TO authenticated with (select auth.uid()) ownership predicate
--   • UPDATE has both USING and WITH CHECK (prevent user_id reassignment)
--   • System categories selectable by all authenticated; writable only when owned
--   • Idempotency rows owner-only; no service_role required for app paths
-- =============================================================================

-- ---------------------------------------------------------------------------
-- finance_categories
-- ---------------------------------------------------------------------------
create table if not exists finance_categories (
  id uuid primary key default gen_random_uuid(),
  -- Null for system defaults shared by all users.
  user_id uuid references profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  slug text not null check (char_length(slug) between 1 and 80),
  category_type text not null check (category_type in ('income', 'expense')),
  essentiality text not null check (
    essentiality in ('required', 'important', 'flexible', 'unclassified')
  ),
  parent_category_id uuid references finance_categories (id) on delete set null,
  is_system boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- System rows have null user_id; user rows are unique per (user, slug).
  constraint finance_categories_system_user_chk check (
    (is_system = true and user_id is null)
    or (is_system = false and user_id is not null)
  )
);

create unique index if not exists idx_finance_categories_system_slug
  on finance_categories (slug)
  where is_system = true;

create unique index if not exists idx_finance_categories_user_slug
  on finance_categories (user_id, slug)
  where user_id is not null;

create index if not exists idx_finance_categories_user
  on finance_categories (user_id)
  where user_id is not null;

alter table finance_categories enable row level security;
alter table finance_categories force row level security;

drop policy if exists "finance_categories_select" on finance_categories;
create policy "finance_categories_select"
  on finance_categories for select
  to authenticated
  using (
    is_system = true
    or user_id = (select auth.uid())
  );

drop policy if exists "finance_categories_insert" on finance_categories;
create policy "finance_categories_insert"
  on finance_categories for insert
  to authenticated
  with check (
    is_system = false
    and user_id = (select auth.uid())
  );

drop policy if exists "finance_categories_update" on finance_categories;
create policy "finance_categories_update"
  on finance_categories for update
  to authenticated
  using (
    is_system = false
    and user_id = (select auth.uid())
  )
  with check (
    is_system = false
    and user_id = (select auth.uid())
  );

drop policy if exists "finance_categories_delete" on finance_categories;
create policy "finance_categories_delete"
  on finance_categories for delete
  to authenticated
  using (
    is_system = false
    and user_id = (select auth.uid())
  );

drop trigger if exists set_updated_at on finance_categories;
create trigger set_updated_at
  before update on finance_categories
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- finance_transactions (soft delete via deleted_at)
-- ---------------------------------------------------------------------------
create table if not exists finance_transactions (
  id uuid primary key,
  user_id uuid not null references profiles (id) on delete cascade,

  type text not null check (
    type in ('income', 'expense', 'transfer', 'refund', 'adjustment')
  ),
  status text not null check (status in ('posted', 'pending', 'voided')),

  -- Positive magnitude; type carries direction (never negative spending).
  amount_cents bigint not null check (
    amount_cents > 0 and amount_cents <= 10000000000
  ),
  currency text not null default 'USD' check (currency = 'USD'),

  description text not null check (char_length(description) between 1 and 160),
  merchant_name text check (merchant_name is null or char_length(merchant_name) <= 160),
  category_id uuid references finance_categories (id) on delete set null,
  account_id uuid,

  -- Date-only budget frame (never derive months from UTC timestamps).
  transaction_date date not null,
  posted_at timestamptz,

  source text not null check (
    source in ('manual', 'plaid', 'recurring_rule', 'migration')
  ),
  external_transaction_id text,
  recurring_rule_id uuid,
  transfer_group_id uuid,
  parent_transaction_id uuid references finance_transactions (id) on delete set null,

  is_excluded_from_budget boolean not null default false,
  user_note text check (user_note is null or char_length(user_note) <= 500),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists idx_finance_tx_user_date
  on finance_transactions (user_id, transaction_date desc)
  where deleted_at is null;

create index if not exists idx_finance_tx_user_updated
  on finance_transactions (user_id, updated_at desc);

create unique index if not exists idx_finance_tx_external_dedupe
  on finance_transactions (user_id, source, external_transaction_id)
  where external_transaction_id is not null and deleted_at is null;

alter table finance_transactions enable row level security;
alter table finance_transactions force row level security;

drop policy if exists "finance_tx_select" on finance_transactions;
create policy "finance_tx_select"
  on finance_transactions for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_tx_insert" on finance_transactions;
create policy "finance_tx_insert"
  on finance_transactions for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_tx_update" on finance_transactions;
create policy "finance_tx_update"
  on finance_transactions for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_tx_delete" on finance_transactions;
create policy "finance_tx_delete"
  on finance_transactions for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on finance_transactions;
create trigger set_updated_at
  before update on finance_transactions
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- finance_budget_periods + allocations
-- ---------------------------------------------------------------------------
create table if not exists finance_budget_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  expected_income_cents bigint check (
    expected_income_cents is null
    or (expected_income_cents > 0 and expected_income_cents <= 10000000000)
  ),
  goal_reserve_cents bigint not null default 0 check (
    goal_reserve_cents >= 0 and goal_reserve_cents <= 10000000000
  ),
  status text not null default 'open' check (status in ('open', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint finance_budget_periods_bounds_chk check (period_start <= period_end),
  unique (user_id, period_start, period_end)
);

create index if not exists idx_finance_budget_periods_user
  on finance_budget_periods (user_id, period_start desc);

alter table finance_budget_periods enable row level security;
alter table finance_budget_periods force row level security;

drop policy if exists "finance_budget_periods_select" on finance_budget_periods;
create policy "finance_budget_periods_select"
  on finance_budget_periods for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_budget_periods_insert" on finance_budget_periods;
create policy "finance_budget_periods_insert"
  on finance_budget_periods for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_budget_periods_update" on finance_budget_periods;
create policy "finance_budget_periods_update"
  on finance_budget_periods for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_budget_periods_delete" on finance_budget_periods;
create policy "finance_budget_periods_delete"
  on finance_budget_periods for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on finance_budget_periods;
create trigger set_updated_at
  before update on finance_budget_periods
  for each row execute function touch_updated_at();

create table if not exists finance_budget_allocations (
  id uuid primary key default gen_random_uuid(),
  budget_period_id uuid not null references finance_budget_periods (id) on delete cascade,
  category_id uuid not null references finance_categories (id) on delete cascade,
  planned_cents bigint not null check (
    planned_cents >= 0 and planned_cents <= 10000000000
  ),
  rollover_mode text not null default 'none' check (
    rollover_mode in ('none', 'positive_only', 'full')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (budget_period_id, category_id)
);

create index if not exists idx_finance_budget_alloc_period
  on finance_budget_allocations (budget_period_id);

alter table finance_budget_allocations enable row level security;
alter table finance_budget_allocations force row level security;

-- Allocations inherit ownership through the parent period (join predicate).
drop policy if exists "finance_budget_alloc_select" on finance_budget_allocations;
create policy "finance_budget_alloc_select"
  on finance_budget_allocations for select
  to authenticated
  using (
    exists (
      select 1 from finance_budget_periods p
      where p.id = budget_period_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "finance_budget_alloc_insert" on finance_budget_allocations;
create policy "finance_budget_alloc_insert"
  on finance_budget_allocations for insert
  to authenticated
  with check (
    exists (
      select 1 from finance_budget_periods p
      where p.id = budget_period_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "finance_budget_alloc_update" on finance_budget_allocations;
create policy "finance_budget_alloc_update"
  on finance_budget_allocations for update
  to authenticated
  using (
    exists (
      select 1 from finance_budget_periods p
      where p.id = budget_period_id
        and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from finance_budget_periods p
      where p.id = budget_period_id
        and p.user_id = (select auth.uid())
    )
  );

drop policy if exists "finance_budget_alloc_delete" on finance_budget_allocations;
create policy "finance_budget_alloc_delete"
  on finance_budget_allocations for delete
  to authenticated
  using (
    exists (
      select 1 from finance_budget_periods p
      where p.id = budget_period_id
        and p.user_id = (select auth.uid())
    )
  );

drop trigger if exists set_updated_at on finance_budget_allocations;
create trigger set_updated_at
  before update on finance_budget_allocations
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- finance_savings_goals (ledger v1; distinct from legacy goals.down_payment)
-- ---------------------------------------------------------------------------
create table if not exists finance_savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  goal_type text not null check (
    goal_type in (
      'emergency_reserve', 'home', 'vehicle', 'education',
      'family', 'travel', 'custom'
    )
  ),
  target_amount_cents bigint not null check (
    target_amount_cents > 0 and target_amount_cents <= 10000000000
  ),
  current_amount_cents bigint not null check (
    current_amount_cents >= 0 and current_amount_cents <= 10000000000
  ),
  target_date date,
  planned_monthly_contribution_cents bigint not null default 0 check (
    planned_monthly_contribution_cents >= 0
    and planned_monthly_contribution_cents <= 10000000000
  ),
  linked_decision_id uuid,
  linked_account_id uuid,
  status text not null default 'active' check (
    status in ('active', 'paused', 'completed', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one active goal per user in v1 (plan ladder).
create unique index if not exists idx_finance_savings_goals_one_active
  on finance_savings_goals (user_id)
  where status = 'active';

create index if not exists idx_finance_savings_goals_user
  on finance_savings_goals (user_id);

alter table finance_savings_goals enable row level security;
alter table finance_savings_goals force row level security;

drop policy if exists "finance_savings_goals_select" on finance_savings_goals;
create policy "finance_savings_goals_select"
  on finance_savings_goals for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_savings_goals_insert" on finance_savings_goals;
create policy "finance_savings_goals_insert"
  on finance_savings_goals for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_savings_goals_update" on finance_savings_goals;
create policy "finance_savings_goals_update"
  on finance_savings_goals for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_savings_goals_delete" on finance_savings_goals;
create policy "finance_savings_goals_delete"
  on finance_savings_goals for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on finance_savings_goals;
create trigger set_updated_at
  before update on finance_savings_goals
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- finance_mutation_idempotency — client keys for POST create (PR 3 + PR 4)
-- ---------------------------------------------------------------------------
create table if not exists finance_mutation_idempotency (
  user_id uuid not null references profiles (id) on delete cascade,
  idempotency_key text not null check (char_length(idempotency_key) between 16 and 200),
  resource_type text not null check (
    resource_type in ('transaction', 'budget_period', 'savings_goal')
  ),
  resource_id uuid not null,
  response_status int not null check (response_status between 200 and 599),
  -- Small JSON echo so retries return the same body without re-applying.
  response_body jsonb not null default '{}'::jsonb
    check (pg_column_size(response_body) <= 16384),
  created_at timestamptz not null default now(),
  primary key (user_id, idempotency_key)
);

create index if not exists idx_finance_idempotency_created
  on finance_mutation_idempotency (created_at);

alter table finance_mutation_idempotency enable row level security;
alter table finance_mutation_idempotency force row level security;

drop policy if exists "finance_idempotency_select" on finance_mutation_idempotency;
create policy "finance_idempotency_select"
  on finance_mutation_idempotency for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_idempotency_insert" on finance_mutation_idempotency;
create policy "finance_idempotency_insert"
  on finance_mutation_idempotency for insert
  to authenticated
  with check (user_id = (select auth.uid()));

-- No UPDATE/DELETE policies — keys are append-only for the app role.

-- ---------------------------------------------------------------------------
-- Seed system categories (idempotent on slug)
-- ---------------------------------------------------------------------------
insert into finance_categories (id, user_id, name, slug, category_type, essentiality, is_system)
select gen_random_uuid(), null, v.name, v.slug, 'expense', v.essentiality, true
from (values
  ('Housing', 'housing', 'required'),
  ('Utilities', 'utilities', 'required'),
  ('Groceries', 'groceries', 'required'),
  ('Dining', 'dining', 'flexible'),
  ('Transportation', 'transportation', 'required'),
  ('Insurance', 'insurance', 'required'),
  ('Healthcare', 'healthcare', 'required'),
  ('Debt payments', 'debt-payments', 'required'),
  ('Family & childcare', 'family-childcare', 'important'),
  ('Subscriptions', 'subscriptions', 'flexible'),
  ('Personal', 'personal', 'flexible'),
  ('Entertainment', 'entertainment', 'flexible'),
  ('Travel', 'travel', 'flexible'),
  ('Giving', 'giving', 'important'),
  ('Other', 'other', 'unclassified')
) as v(name, slug, essentiality)
where not exists (
  select 1 from finance_categories c where c.is_system and c.slug = v.slug
);

insert into finance_categories (id, user_id, name, slug, category_type, essentiality, is_system)
select gen_random_uuid(), null, v.name, v.slug, 'income', 'unclassified', true
from (values
  ('Payroll', 'payroll'),
  ('Commission', 'commission'),
  ('Contract income', 'contract-income'),
  ('Business income', 'business-income'),
  ('Benefits', 'benefits'),
  ('Other income', 'other-income')
) as v(name, slug)
where not exists (
  select 1 from finance_categories c where c.is_system and c.slug = v.slug
);

-- ROLLBACK (manual, reverse order):
-- drop table if exists finance_mutation_idempotency;
-- drop table if exists finance_budget_allocations;
-- drop table if exists finance_budget_periods;
-- drop table if exists finance_transactions;
-- drop table if exists finance_savings_goals;
-- drop table if exists finance_categories;
