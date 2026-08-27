-- Score-trigger notification dedupe for app/api/cron/score-triggers.
-- The cron route records one row per (user_id, trigger_signature) it flags
-- so repeat runs do not re-flag the same band crossing. The signature pins
-- the assessment id plus the sorted metric set, so a new completed
-- assessment naturally resets dedupe. Service-role only; no authenticated
-- access. Same RLS posture as 00024 / 20260818000001 — FORCE RLS.

create table if not exists score_trigger_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  trigger_signature text not null,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint score_trigger_notifications_user_signature_key
    unique (user_id, trigger_signature)
);

create index if not exists idx_score_trigger_notifications_user
  on score_trigger_notifications (user_id);

alter table score_trigger_notifications enable row level security;
alter table score_trigger_notifications force row level security;
revoke all on score_trigger_notifications from anon, authenticated;
grant all on score_trigger_notifications to service_role;
