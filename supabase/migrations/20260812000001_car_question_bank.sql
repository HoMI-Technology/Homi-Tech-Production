-- =============================================================================
-- 20260812000001_car_question_bank.sql — car vertical question bank (Plans.md 5.6)
--
-- Keeps the DB in parity with lib/questions/bank.ts (the offline source of
-- truth). Mirrors that change in two parts:
--   1. Insert the 8 car-specific financial questions (order_index 101-108, a
--      deliberate gap from home buying's 1-15).
--   2. Tag the 30 shared emotional/timing questions with 'car'. Same question
--      row, two verticals ("bank tags") — that is what gives the car flow all
--      three pillars without duplicating rows.
--
-- 00006_seed_question_bank.sql is already applied, so it is left untouched and
-- this migration carries the delta. Idempotent both ways: the insert is
-- ON CONFLICT (id) DO NOTHING, and the tag update is a no-op once 'car' is set.
-- =============================================================================

insert into question_bank
  (id, dimension, category, question_text, question_type, options, weight, order_index, decision_types, scoring_function)
values

-- =========================================================================
-- CAR — FINANCIAL REALITY (8 questions)
-- =========================================================================

('car_fin_vehicle_price', 'financial', 'affordability',
 'What is the total price of the vehicle you are considering?',
 'number', null, 1.0, 101, array['car'],
 '{"type":"linear_scale","min":5000,"max":80000,"optimal_min":15000,"unit":"usd"}'::jsonb),

('car_fin_down_payment_amount', 'financial', 'savings',
 'How much can you put down on the vehicle?',
 'single_choice',
 '[{"value":"20_plus","label":"20% or more of the vehicle price"},{"value":"10_19","label":"10–19% of the vehicle price"},{"value":"5_9","label":"5–9% of the vehicle price"},{"value":"under_5","label":"Less than 5% — or financing the full amount"}]'::jsonb,
 1.0, 102, array['car'],
 '{"type":"option_map","scores":{"20_plus":100,"10_19":70,"5_9":45,"under_5":20}}'::jsonb),

('car_fin_monthly_payment', 'financial', 'affordability',
 'Estimated total monthly cost — loan payment, insurance, and registration combined?',
 'single_choice',
 '[{"value":"under_10pct","label":"Under 10% of my take-home pay"},{"value":"10_15pct","label":"10–15% of my take-home pay"},{"value":"15_20pct","label":"15–20% of my take-home pay"},{"value":"over_20pct","label":"More than 20% of my take-home pay"}]'::jsonb,
 1.0, 103, array['car'],
 '{"type":"option_map","scores":{"under_10pct":100,"10_15pct":75,"15_20pct":40,"over_20pct":10}}'::jsonb),

('car_fin_income', 'financial', 'income',
 'What is your monthly gross income (before taxes)?',
 'number', null, 0.9, 104, array['car'],
 '{"type":"linear_scale","min":0,"max":25000,"optimal_min":3500,"unit":"usd"}'::jsonb),

('car_fin_debt_payments', 'financial', 'debt',
 'What are your total monthly debt payments (rent/mortgage, student loans, cards, existing car payments)?',
 'number', null, 1.0, 105, array['car'],
 '{"type":"linear_scale","min":0,"max":5000,"optimal_min":0,"unit":"usd"}'::jsonb),

('car_fin_emergency_fund', 'financial', 'savings',
 'After this purchase, how many months of expenses will you have in savings?',
 'single_choice',
 '[{"value":"6plus","label":"6 months or more"},{"value":"3to6","label":"3–6 months"},{"value":"1to3","label":"1–3 months"},{"value":"lt1","label":"Less than 1 month"}]'::jsonb,
 1.0, 106, array['car'],
 '{"type":"option_map","scores":{"6plus":100,"3to6":75,"1to3":45,"lt1":10}}'::jsonb),

('car_fin_credit_score', 'financial', 'credit',
 'What is your approximate credit score?',
 'single_choice',
 '[{"value":"excellent","label":"Excellent — 750 or above"},{"value":"good","label":"Good — 700–749"},{"value":"fair","label":"Fair — 650–699"},{"value":"low","label":"Below 650"}]'::jsonb,
 1.0, 107, array['car'],
 '{"type":"option_map","scores":{"excellent":100,"good":80,"fair":55,"low":20}}'::jsonb),

('car_fin_loan_term', 'financial', 'affordability',
 'What loan term are you considering?',
 'single_choice',
 '[{"value":"36_or_less","label":"36 months or less — paying it off fast"},{"value":"48","label":"48 months"},{"value":"60","label":"60 months"},{"value":"72_plus","label":"72 months or more — stretching to make it fit"}]'::jsonb,
 0.8, 108, array['car'],
 '{"type":"option_map","scores":{"36_or_less":100,"48":80,"60":55,"72_plus":25}}'::jsonb)

on conflict (id) do nothing;

-- =========================================================================
-- Shared emotional + timing bank tags (30 rows)
-- Financial questions are vertical-specific and are deliberately NOT tagged.
-- =========================================================================

update question_bank
   set decision_types = array_append(decision_types, 'car')
 where dimension in ('emotional', 'timing')
   and 'home_buying' = any (decision_types)
   and not ('car' = any (decision_types));
