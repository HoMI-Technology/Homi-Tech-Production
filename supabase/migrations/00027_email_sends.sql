-- =============================================================================
-- 00027_email_sends.sql — lifecycle email idempotency ledger. Apply after 00019.
--
-- Same insert-first dedupe pattern as webhook_events (00015): every lifecycle
-- send claims a deterministic dedupe_key BEFORE the provider call, so cron
-- retries, double-fires, and concurrent triggers can never double-send.
--   dedupe_key shapes: welcome:{user_id} · verdict:{assessment_id}
--   reassess30:{assessment_id} · outcome{30|90|365}:{assessment_id}
--
-- RLS enabled + forced with NO anon/authenticated policies — only the
-- service-role client (triggers + cron route) touches this table, matching
-- email_unsubscribes (00016).
-- =============================================================================

create table if not exists email_sends (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text unique not null,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  template text not null,
  sent_at timestamptz not null default now()
);

create index if not exists idx_email_sends_user on email_sends (user_id);

alter table email_sends enable row level security;
alter table email_sends force row level security;

grant select, insert, delete on email_sends to service_role;

-- ROLLBACK:
-- drop table if exists email_sends;
