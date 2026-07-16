-- =============================================================================
-- 00019_profile_email_prefs.sql — lifecycle email state + reminder preferences.
-- apply after 00018_goals.
--   • email_reminders_enabled: user-controlled toggle in Settings (default on).
--   • welcome_email_sent_at: dedupe welcome on auth callback.
--   • last_reassessment_email_at: dedupe cron reassessment nudges.
-- =============================================================================

alter table profiles
  add column if not exists email_reminders_enabled boolean not null default true,
  add column if not exists welcome_email_sent_at timestamptz,
  add column if not exists last_reassessment_email_at timestamptz;

-- ROLLBACK:
-- alter table profiles
--   drop column if exists email_reminders_enabled,
--   drop column if exists welcome_email_sent_at,
--   drop column if exists last_reassessment_email_at;
