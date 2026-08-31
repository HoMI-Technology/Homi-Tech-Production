-- =============================================================================
-- 20260831000001_evidence_engine.sql
-- Evidence Engine v1.0 — additive only. Do not rewrite historical outcomes.
-- Never apply 00034. Forward-only.
--
-- Adds:
--   • opaque scoring_schema_id + previous_assessment_id lineage on assessments
--   • immutable assessment_outcome_baselines
--   • structured outcome_surveys columns + contact_state
--   • outcome_survey_events funnel (no answer payloads)
-- =============================================================================

alter table assessments
  add column if not exists scoring_schema_id text not null default 'readiness-engine-public-v1',
  add column if not exists previous_assessment_id uuid references assessments(id) on delete set null,
  add column if not exists reassessment_reason text;

alter table assessments
  drop constraint if exists assessments_previous_not_self;
alter table assessments
  add constraint assessments_previous_not_self
  check (previous_assessment_id is null or previous_assessment_id <> id);

create or replace function enforce_assessment_lineage_same_user()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.previous_assessment_id is null then
    return new;
  end if;
  if new.previous_assessment_id = new.id then
    raise exception 'assessment lineage cannot reference itself';
  end if;
  if not exists (
    select 1
    from assessments a
    where a.id = new.previous_assessment_id
      and a.user_id = new.user_id
  ) then
    raise exception 'assessment lineage must reference the same user';
  end if;
  return new;
end;
$$;

drop trigger if exists assessments_lineage_same_user on assessments;
create trigger assessments_lineage_same_user
  before insert or update of previous_assessment_id, user_id
  on assessments
  for each row
  execute function enforce_assessment_lineage_same_user();

create table if not exists assessment_outcome_baselines (
  assessment_id uuid primary key references assessments(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  captured_at timestamptz not null default now(),
  schema_version text not null,
  scoring_schema_id text not null,
  financial_stress smallint check (financial_stress is null or financial_stress between 1 and 10),
  emergency_reserve_band text not null default 'unknown'
    check (emergency_reserve_band in ('unknown', 'under_1', '1_to_3', '3_to_6', '6_plus')),
  cash_margin_band text not null default 'unknown'
    check (cash_margin_band in ('unknown', 'under_1', '1_to_3', '3_to_6', '6_plus')),
  payment_difficulty text not null default 'unknown'
    check (payment_difficulty in ('unknown', 'none', 'manageable', 'strained', 'severe')),
  unexpected_expense_resilience text not null default 'unknown'
    check (unexpected_expense_resilience in ('unknown', 'none', 'manageable', 'strained', 'severe')),
  decision_confidence smallint check (decision_confidence is null or decision_confidence between 1 and 10),
  decision_intent text not null default 'unknown'
    check (decision_intent in ('unknown', 'proceed', 'wait', 'unsure')),
  created_at timestamptz not null default now()
);

create index if not exists idx_assessment_outcome_baselines_user
  on assessment_outcome_baselines (user_id);

alter table assessment_outcome_baselines enable row level security;
alter table assessment_outcome_baselines force row level security;

drop policy if exists "baselines_select_own" on assessment_outcome_baselines;
create policy "baselines_select_own"
  on assessment_outcome_baselines for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "baselines_insert_own" on assessment_outcome_baselines;
create policy "baselines_insert_own"
  on assessment_outcome_baselines for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from assessments a
      where a.id = assessment_outcome_baselines.assessment_id
        and a.user_id = (select auth.uid())
    )
  );

-- No UPDATE / DELETE for authenticated. Cascade from assessments/profiles
-- handles account erasure.

alter table outcome_surveys
  add column if not exists contact_state text not null default 'eligible'
    check (contact_state in (
      'eligible',
      'contact_attempted',
      'delivered',
      'started',
      'completed',
      'declined',
      'unsubscribed',
      'unreachable'
    )),
  add column if not exists started_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists response_schema_version text,
  add column if not exists financial_stress smallint
    check (financial_stress is null or financial_stress between 1 and 10),
  add column if not exists emergency_reserve_band text
    check (emergency_reserve_band is null or emergency_reserve_band in
      ('unknown', 'under_1', '1_to_3', '3_to_6', '6_plus')),
  add column if not exists payment_difficulty text
    check (payment_difficulty is null or payment_difficulty in
      ('unknown', 'none', 'manageable', 'strained', 'severe')),
  add column if not exists unexpected_expense_resilience text
    check (unexpected_expense_resilience is null or unexpected_expense_resilience in
      ('unknown', 'none', 'manageable', 'strained', 'severe')),
  add column if not exists material_financial_disruption text
    check (material_financial_disruption is null or material_financial_disruption in
      ('unknown', 'yes', 'no')),
  add column if not exists decision_regret smallint
    check (decision_regret is null or decision_regret between 1 and 5),
  add column if not exists decision_confidence smallint
    check (decision_confidence is null or decision_confidence between 1 and 10),
  add column if not exists would_make_same_decision_again text
    check (would_make_same_decision_again is null or would_make_same_decision_again in
      ('unknown', 'yes', 'no')),
  add column if not exists priority_disruption text
    check (priority_disruption is null or priority_disruption in ('unknown', 'yes', 'no')),
  add column if not exists decision_state text
    check (decision_state is null or decision_state in (
      'unknown',
      'proceeded',
      'waited',
      'abandoned',
      'blocked_externally',
      'changed_decision',
      'overrode_verdict',
      'reassessed'
    ));

create unique index if not exists idx_outcome_surveys_assessment_kind
  on outcome_surveys (assessment_id, kind)
  where assessment_id is not null;

create table if not exists outcome_survey_events (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references outcome_surveys(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  event_type text not null
    check (event_type in (
      'eligible',
      'contact_attempted',
      'delivered',
      'started',
      'completed',
      'declined',
      'unsubscribed',
      'unreachable'
    )),
  channel text
    check (channel is null or channel in ('email', 'push', 'in_app', 'system')),
  occurred_at timestamptz not null default now()
);

create index if not exists idx_outcome_survey_events_survey
  on outcome_survey_events (survey_id, occurred_at);

alter table outcome_survey_events enable row level security;
alter table outcome_survey_events force row level security;

drop policy if exists "outcome_survey_events_select_own" on outcome_survey_events;
create policy "outcome_survey_events_select_own"
  on outcome_survey_events for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "outcome_survey_events_insert_own" on outcome_survey_events;
create policy "outcome_survey_events_insert_own"
  on outcome_survey_events for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from outcome_surveys s
      where s.id = outcome_survey_events.survey_id
        and s.user_id = (select auth.uid())
    )
  );

-- ROLLBACK:
-- drop trigger if exists assessments_lineage_same_user on assessments;
-- drop function if exists enforce_assessment_lineage_same_user();
-- drop table if exists outcome_survey_events;
-- drop table if exists assessment_outcome_baselines;
-- alter table assessments drop column if exists previous_assessment_id;
-- alter table assessments drop column if exists reassessment_reason;
-- alter table assessments drop column if exists scoring_schema_id;
