-- Multi-goal: lift the v1 "one active goal per user" restriction.
--
-- 20260803000001_finance_ledger.sql created:
--
--   create unique index idx_finance_savings_goals_one_active
--     on finance_savings_goals (user_id)
--     where status = 'active';
--
-- That was the plan-ladder v1 decision. Users save for more than one thing at
-- a time — a house deposit and an emergency reserve are not competing rows —
-- so the restriction goes.
--
-- Dropping a unique index is safe in both directions: every row that satisfied
-- it still satisfies the table's remaining constraints, so this migration does
-- not rewrite or invalidate any existing goal. Rolling back would require the
-- data to be single-goal again, which is why the down path is documented rather
-- than automated: recreating the index on multi-goal data would fail.
--
-- The supporting non-unique index on (user_id) already exists
-- (idx_finance_savings_goals_user) and is what the multi-goal read path uses,
-- so query performance is unaffected.

drop index if exists idx_finance_savings_goals_one_active;

-- Reads now order by created_at, so back it with an index rather than leaving
-- a sort on every goals fetch.
create index if not exists idx_finance_savings_goals_user_created
  on finance_savings_goals (user_id, created_at);
