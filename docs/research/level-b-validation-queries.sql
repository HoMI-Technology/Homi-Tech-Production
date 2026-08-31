-- HōMI Level B validation queries — internal, observational, read-only.
-- Missing / declined / unsubscribed are NOT negative outcomes.
-- Do not publish percentages without the denominator columns.
-- Do not compute statistical significance here.

-- 1. Sample size + response rate by checkpoint
select
  os.kind as checkpoint,
  count(*)::bigint as eligible,
  count(os.completed_at)::bigint as completed,
  count(*) filter (where os.contact_state = 'declined')::bigint as declined,
  count(*) filter (where os.contact_state = 'unreachable')::bigint as unreachable,
  count(*) filter (where os.contact_state = 'unsubscribed')::bigint as unsubscribed,
  case
    when count(*) = 0 then null
    else round(count(os.completed_at)::numeric / count(*)::numeric, 4)
  end as completion_rate
from outcome_surveys os
group by os.kind
order by os.kind;

-- 2. Response rate by verdict (join historical assessment; never rewrite it)
select
  a.verdict,
  a.scoring_schema_id,
  count(*)::bigint as eligible,
  count(os.completed_at)::bigint as completed,
  case
    when count(*) = 0 then null
    else round(count(os.completed_at)::numeric / count(*)::numeric, 4)
  end as completion_rate
from outcome_surveys os
join assessments a on a.id = os.assessment_id
group by a.verdict, a.scoring_schema_id
order by a.verdict, a.scoring_schema_id;

-- 3. Baseline coverage (legacy assessments without a baseline stay missing)
select
  count(distinct a.id)::bigint as assessments,
  count(b.assessment_id)::bigint as baselines_present,
  (count(distinct a.id) - count(b.assessment_id))::bigint as baselines_missing
from assessments a
left join assessment_outcome_baselines b on b.assessment_id = a.id
where a.status = 'completed'
  and a.is_shadow = false;

-- 4. Missingness — T0 baseline fields (unknown counts as missing)
select
  count(*)::bigint as n,
  count(*) filter (where b.financial_stress is null)::bigint
    as financial_stress_missing,
  count(*) filter (
    where b.emergency_reserve_band is null
       or b.emergency_reserve_band = 'unknown'
  )::bigint as emergency_reserve_missing,
  count(*) filter (
    where b.cash_margin_band is null or b.cash_margin_band = 'unknown'
  )::bigint as cash_margin_missing,
  count(*) filter (
    where b.payment_difficulty is null or b.payment_difficulty = 'unknown'
  )::bigint as payment_difficulty_missing,
  count(*) filter (where b.decision_confidence is null)::bigint
    as decision_confidence_missing
from assessment_outcome_baselines b;

-- 5. Missingness — completed checkpoint structured fields
select
  os.kind as checkpoint,
  count(*)::bigint as completed,
  count(*) filter (where os.financial_stress is null)::bigint
    as survey_financial_stress_missing,
  count(*) filter (where os.decision_state is null)::bigint
    as decision_state_missing,
  count(*) filter (where os.outcome is null)::bigint as taxonomy_missing
from outcome_surveys os
where os.completed_at is not null
group by os.kind
order by os.kind;

-- 6. Observation grain for lib/outcomes/research-metrics.ts#levelBNotebook
select
  a.verdict,
  os.kind,
  os.contact_state,
  os.completed_at,
  a.scoring_schema_id,
  a.decision_type,
  (b.assessment_id is not null) as baseline_present,
  b.financial_stress,
  b.emergency_reserve_band,
  b.cash_margin_band,
  b.payment_difficulty,
  b.unexpected_expense_resilience,
  b.decision_confidence,
  os.financial_stress as survey_financial_stress,
  os.decision_state as survey_decision_state
from outcome_surveys os
join assessments a on a.id = os.assessment_id
left join assessment_outcome_baselines b on b.assessment_id = a.id;
