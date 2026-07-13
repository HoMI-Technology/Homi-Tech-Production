-- =============================================================================
-- 00016_email_unsubscribes.sql — CAN-SPAM / RFC 8058 opt-out ledger.
-- apply after 00015_webhook_events.
--   • One row per opted-out email. The email send path checks this table and
--     skips delivery; the one-click unsubscribe endpoint inserts here.
--   • RLS enabled + forced with NO anon/authenticated policies — only the
--     service-role client (email route + unsubscribe route, which bypass RLS)
--     can read/write. Emails are not user-scoped data reachable from the app.
-- =============================================================================

create table if not exists email_unsubscribes (
  email text primary key,
  unsubscribed_at timestamptz not null default now(),
  source text
);

alter table email_unsubscribes enable row level security;
alter table email_unsubscribes force row level security;

grant select, insert on email_unsubscribes to service_role;

-- ROLLBACK:
-- drop table if exists email_unsubscribes;
