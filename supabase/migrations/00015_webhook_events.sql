-- =============================================================================
-- 00015_webhook_events.sql — Stripe webhook idempotency ledger (T1.2).
-- assumes T0.6 migration-history repair; apply after 00011–00014.
--   • webhook_events(event_id) is the insert-first dedupe key: the webhook
--     handler inserts before processing and treats a unique-violation
--     (23505) as "already handled" -> 200 { received: true, duplicate: true },
--     without reprocessing.
--   • RLS is enabled + forced with no anon/authenticated policies at all —
--     only the service-role client (used exclusively by the webhook route,
--     which bypasses RLS) can read/write this table.
-- =============================================================================

create table if not exists webhook_events (
  event_id text primary key,
  type text,
  received_at timestamptz not null default now()
);

alter table webhook_events enable row level security;
alter table webhook_events force row level security;

-- No anon/authenticated policies — deliberately unreachable from those
-- roles. Only service_role (which bypasses RLS) touches this table.
grant select, insert on webhook_events to service_role;

-- ROLLBACK:
-- drop table if exists webhook_events;
