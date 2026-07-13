-- 00012_outcome_surveys_index.sql
-- Adds the missing index on outcome_surveys.assessment_id (AUDIT T3.7).
-- outcome_surveys is joined/filtered by assessment_id (see the override route
-- and future outcome-survey delivery), and the FK had no supporting index.
-- Apply AFTER 00011_shares_ownership.sql.

create index if not exists idx_outcome_surveys_assessment
  on outcome_surveys (assessment_id);
