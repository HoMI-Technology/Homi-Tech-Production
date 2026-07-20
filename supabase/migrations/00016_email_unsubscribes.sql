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

-- update is required: the unsubscribe endpoint upserts (ON CONFLICT DO UPDATE),
-- so a repeat unsubscribe for the same email takes the update path.
grant select, insert, update on email_unsubscribes to service_role;

-- Forced RLS with no policies already denies anon/authenticated; revoke the
-- platform's default table grants too so the deny doesn't depend on RLS alone.
revoke all on email_unsubscribes from anon, authenticated;

-- ROLLBACK:
-- drop table if exists email_unsubscribes;
