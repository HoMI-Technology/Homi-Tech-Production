-- =============================================================================
-- 20260805000003_assessments_decision_type_validate.sql
--
-- Second half of 20260805000002: prove legacy rows against the canon CHECK.
-- Separate file so VALIDATE runs in its own transaction — it takes only
-- SHARE UPDATE EXCLUSIVE (reads/writes proceed) instead of extending the
-- ACCESS EXCLUSIVE lock from the ADD (see notes in 20260805000002).
--
-- AUTHORING ONLY until the migration approval gate. Run the pre-flight
-- distinct-values query from 20260805000002 first; if it surfaces foreign
-- slugs, triage them before applying this file. On violation this statement
-- aborts with check_violation and the constraint simply stays NOT VALID —
-- new writes remain guarded either way.
-- =============================================================================

alter table assessments
  validate constraint assessments_decision_type_canon;
