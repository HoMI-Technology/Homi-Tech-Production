-- =============================================================================
-- 00010_override_outcomes.sql
-- Feature: Verdict Override ("I'm deciding anyway") + outcome surveys.
--   • assessments.user_override records that the user acknowledged the
--     honest read and chose to proceed anyway. Score/verdict never change.
--   • outcome_surveys schedules day30/day90/day365 check-ins so HōMI can
--     follow up honestly on how it went, without gatekeeping the decision.
-- =============================================================================

alter table assessments add column if not exists user_override jsonb;

create table if not exists outcome_surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  assessment_id uuid references assessments(id) on delete cascade,
  due_at timestamptz not null,
  kind text not null check (kind in ('day30', 'day90', 'day365')),
  completed_at timestamptz,
  satisfaction int check (satisfaction between 1 and 5),
  outcome text,
  notes text,
  created_at timestamptz not null default now()
);

alter table outcome_surveys enable row level security;
alter table outcome_surveys force row level security;

create policy "outcome_surveys_owner_all"
  on outcome_surveys for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists idx_outcome_surveys_user_due
  on outcome_surveys (user_id, due_at);
