-- =============================================================================
-- 00024_push_and_survey_notifications.sql
-- Feature: off-site delivery for the outcome-survey loop (AUDIT crown jewel).
--   The day30/day90/day365 outcome_surveys rows are created on verdict
--   override and surfaced in-app, but nothing nudges a user when one comes
--   due — which is exactly day 30/90/365 later, when they've drifted away.
--   This migration adds the state two delivery channels need:
--     • outcome_surveys.notified_at — dedup guard so a due survey is nudged
--       once, not every daily cron pass.
--     • profiles.last_outcome_survey_email_at — parity with the existing
--       reassessment email dedup column (00019).
--     • push_subscriptions — Web Push endpoints, one row per browser/device.
-- apply after 00023_user_finance_state.
-- =============================================================================

alter table outcome_surveys
  add column if not exists notified_at timestamptz;

alter table profiles
  add column if not exists last_outcome_survey_email_at timestamptz;

-- Web Push subscriptions. Endpoint is globally unique (the push service's
-- opaque URL); p256dh/auth are the client's encryption keys. The cron sends
-- via the service role (bypasses RLS); the browser manages only its own rows.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  -- Consecutive delivery failures; the sender prunes a subscription once the
  -- push service reports it permanently gone (404/410).
  failure_count int not null default 0
);

alter table push_subscriptions enable row level security;
alter table push_subscriptions force row level security;

create policy "push_subscriptions_owner_all"
  on push_subscriptions for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists idx_push_subscriptions_user
  on push_subscriptions (user_id);

-- Cron scan predicate: due, not yet completed, not yet notified.
create index if not exists idx_outcome_surveys_due_unnotified
  on outcome_surveys (due_at)
  where completed_at is null and notified_at is null;

-- ROLLBACK:
-- drop index if exists idx_outcome_surveys_due_unnotified;
-- drop table if exists push_subscriptions;
-- alter table profiles drop column if exists last_outcome_survey_email_at;
-- alter table outcome_surveys drop column if exists notified_at;
