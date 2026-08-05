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
-- This file is ADD ... NOT VALID only. VALIDATE lives in the NEXT migration
-- (20260805000003) because the Supabase CLI runs each migration file in one
-- transaction (supabase/cli#2898, #5139) and Postgres holds the ACCESS
-- EXCLUSIVE lock from ADD until commit — same-file VALIDATE would hold that
-- lock through the whole scan, defeating NOT VALID (strong_migrations /
-- GitLab both mandate the two-migration split for this reason).
--
-- NOT VALID still enforces the check for all NEW writes immediately (23514 on
-- violation); only legacy rows go unproven until the validate migration. The
-- API-side allowlist (activeDecisionTypeSchema) ships BEFORE this applies, so
-- app writes cannot trip it.
--
-- Legacy-row caveat for the approval gate: rows are NOT guaranteed canon —
-- the API hardcoded 'home_buying', but assessments_owner_insert/update RLS
-- (00004_rls.sql) has always let a signed-in user write ANY string via direct
-- PostgREST calls. Pre-flight before the validate migration:
--   select decision_type, count(*) from assessments
--   group by 1 order by 2 desc;
-- If foreign slugs exist, triage (map or annotate) first — new writes stay
-- guarded by this constraint either way.
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

comment on constraint assessments_decision_type_canon on assessments is
  'Assessment decision verticals: canon slug list mirrors DecisionType in '
  'lib/assessment/types.ts. Activation (which slugs the API accepts) is the '
  'app-layer ACTIVE_DECISION_TYPES allowlist; this only guards canon.';
