-- =============================================================================
-- 00017_readiness_calibration.sql — anonymized network calibration RPC.
-- apply after 00016_email_unsubscribes.
--
-- The Outcome Verification Network reports how members' reported satisfaction
-- tracks with the verdict they originally received. This is ASSOCIATION, not
-- proof of causation (people who are ready differ in many ways from people who
-- aren't) — the UI is worded accordingly.
--
-- Privacy: aggregate-only (counts + averages, never rows), AND a k-anonymity
-- floor of 5 is enforced HERE in SQL via `having count(*) >= 5`, so a cohort
-- with fewer than 5 completed outcomes is never returned — no caller (anon
-- included) can back out an individual's satisfaction score. Individual
-- outcome_surveys rows stay locked by their owner RLS regardless.
--
-- Known limitation (schema gap): the strongest version of this thesis compares
-- people who WAITED against people who PROCEEDED against a not-ready verdict.
-- outcome_surveys has no structured "proceeded" / outcome-valence field yet, so
-- this uses satisfaction-by-verdict as the honest available proxy. Add a
-- `proceeded boolean` + `outcome_valence` column in a later migration to unlock
-- the proceed-anyway comparison.
-- =============================================================================

create or replace function get_readiness_calibration()
returns table (
  verdict verdict_type,
  response_count bigint,
  avg_satisfaction numeric,
  positive_rate numeric
)
language sql
security definer
stable
set search_path = public
as $$
  select
    a.verdict,
    count(*) as response_count,
    round(avg(os.satisfaction)::numeric, 2) as avg_satisfaction,
    round(avg((os.satisfaction >= 4)::int)::numeric, 3) as positive_rate
  from outcome_surveys os
  join assessments a on a.id = os.assessment_id
  where os.completed_at is not null
    and os.satisfaction is not null
    and a.verdict is not null
  group by a.verdict
  having count(*) >= 5;  -- k-anonymity: never expose a sub-5 cohort
$$;

grant execute on function get_readiness_calibration() to anon, authenticated;

-- ROLLBACK:
-- drop function if exists get_readiness_calibration();
