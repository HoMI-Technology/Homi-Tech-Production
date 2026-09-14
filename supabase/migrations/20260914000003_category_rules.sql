-- =============================================================================
-- 20260914000003_category_rules.sql — Phase 2 rule-based auto-categorization.
--
-- User-authored deterministic rules (lib/finance/categorize.ts). No ML:
-- a rule only fires when the user created it (suggestions from
-- suggestRulesFromHistory are confirmed by the user before insert).
--
-- APPLY: single-file only — never blanket `supabase db push`. See
-- docs/ops/MIGRATIONS-SSOT.md.
--
-- Security (Supabase checklist):
--   • FORCE RLS
--   • Policies TO authenticated with (select auth.uid()) ownership predicate
--   • UPDATE has both USING and WITH CHECK (prevent user_id reassignment)
--   • Soft delete via deleted_at (audit), unique index respects it
-- =============================================================================

create table if not exists finance_category_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,

  match_type text not null check (match_type in ('payee_exact', 'payee_contains')),
  -- Stored normalized (lowercase, collapsed whitespace) — the same
  -- normalizePayee() the matcher applies at runtime, so the unique index
  -- and the matcher agree on identity.
  pattern text not null check (char_length(pattern) between 1 and 160),

  category_id uuid not null references finance_categories (id) on delete cascade,

  -- Lower number = evaluated first; exact beats contains at equal priority.
  priority int not null default 100,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- One live rule per (user, match_type, pattern) — retries and re-imports of
-- the same rule hit the unique index instead of duplicating.
create unique index if not exists idx_finance_category_rules_unique
  on finance_category_rules (user_id, match_type, pattern)
  where deleted_at is null;

create index if not exists idx_finance_category_rules_user
  on finance_category_rules (user_id)
  where deleted_at is null;

alter table finance_category_rules enable row level security;
alter table finance_category_rules force row level security;

drop policy if exists "finance_category_rules_select" on finance_category_rules;
create policy "finance_category_rules_select"
  on finance_category_rules for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "finance_category_rules_insert" on finance_category_rules;
create policy "finance_category_rules_insert"
  on finance_category_rules for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_category_rules_update" on finance_category_rules;
create policy "finance_category_rules_update"
  on finance_category_rules for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "finance_category_rules_delete" on finance_category_rules;
create policy "finance_category_rules_delete"
  on finance_category_rules for delete
  to authenticated
  using (user_id = (select auth.uid()));

drop trigger if exists set_updated_at on finance_category_rules;
create trigger set_updated_at
  before update on finance_category_rules
  for each row execute function touch_updated_at();

-- ROLLBACK (manual):
-- drop table if exists finance_category_rules;
