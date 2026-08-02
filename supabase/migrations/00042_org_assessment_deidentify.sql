-- =============================================================================
-- 00042 · De-identified org assessment reads
--
-- The prior assessments_org_member_select policy granted org members SELECT on
-- the full assessments table, exposing inputs/sub_scores/insights to teammates.
-- This migration replaces that broad table access with a security-definer RPC
-- function that returns only the cohort-level fields the /team dashboard needs.
--
-- IMPORTANT: apply only after the phantom migration row issue is repaired.
-- =============================================================================

-- Drop the overly permissive org-member policy on the raw assessments table.
drop policy if exists "assessments_org_member_select" on assessments;

-- Security-definer function: returns de-identified assessment rows for an
-- organization, but only when the caller is a member of that organization.
create or replace function get_org_assessment_summary(org_id uuid)
returns table (
  id uuid,
  verdict verdict_type,
  overall_score numeric,
  financial_score numeric,
  emotional_score numeric,
  timing_score numeric,
  decision_type text,
  status assessment_status,
  completed_at timestamptz,
  organization_id uuid,
  hard_stops jsonb
)
language sql
security definer
set search_path = public
as $$
  select
    a.id,
    a.verdict,
    a.overall_score,
    a.financial_score,
    a.emotional_score,
    a.timing_score,
    a.decision_type,
    a.status,
    a.completed_at,
    a.organization_id,
    a.hard_stops
  from assessments a
  where a.organization_id = org_id
    and a.status = 'completed'
    and a.is_shadow = false
    and exists (
      select 1
      from organization_members om
      where om.organization_id = org_id
        and om.profile_id = (select auth.uid())
    );
$$;

grant execute on function get_org_assessment_summary(uuid) to authenticated;

-- ROLLBACK (manual):
-- revoke execute on function get_org_assessment_summary(uuid) from authenticated;
-- drop function if exists get_org_assessment_summary(uuid);
-- create policy "assessments_org_member_select"
--   on assessments for select
--   to authenticated
--   using (
--     exists (
--       select 1 from organization_members om
--       where om.profile_id = assessments.user_id
--         and om.organization_id in (
--           select organization_id
--           from organization_members
--           where profile_id = (select auth.uid())
--         )
--     )
--   );
