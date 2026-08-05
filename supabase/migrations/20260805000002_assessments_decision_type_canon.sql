-- =============================================================================
-- 20260805000002_assessments_decision_type_canon.sql
--
-- Plans.md 5.4 (decision-vertical branching): constrain
-- assessments.decision_type to the five canon slugs from
-- lib/assessment/types.ts. The API layer additionally restricts writes to
-- ACTIVE_DECISION_TYPES; this constraint is the storage backstop so a foreign
-- slug can never land regardless of write path.
--
-- Scope note: journal_entries.decision_type is a deliberately DIFFERENT
-- vocabulary (career / purchase / investment / life) and is not touched.
--
-- AUTHORING ONLY until the migration approval gate (backup, staging, rollback).
-- Timestamp naming matches the post-rebuild ledger convention.
--
-- NOT VALID first, then VALIDATE: the ADD takes only a brief metadata lock,
-- and VALIDATE scans under SHARE UPDATE EXCLUSIVE without blocking writes.
-- Existing rows can only be 'home_buying' (the API hardcoded it until now),
-- so validation cannot fail.
-- =============================================================================

alter table assessments
  add constraint assessments_decision_type_canon
  check (decision_type in (
    'home_buying',
    'car',
    'career_change',
    'education',
    'starting_a_business'
  )) not valid;

alter table assessments
  validate constraint assessments_decision_type_canon;

comment on constraint assessments_decision_type_canon on assessments is
  'Assessment decision verticals: canon slug list mirrors DecisionType in '
  'lib/assessment/types.ts. Activation (which slugs the API accepts) is the '
  'app-layer ACTIVE_DECISION_TYPES allowlist; this only guards canon.';
