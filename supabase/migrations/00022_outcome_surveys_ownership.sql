-- =============================================================================
-- 00022_outcome_surveys_ownership.sql — close the outcome_surveys cross-tenant
-- IDOR (same class as the score_shares fix in 00011). Apply after
-- 00020_profiles_privilege_guard. (Numbered 00022, not 00021: the 00021 slot is
-- claimed by other open migration PRs at time of writing — any of them may
-- land first; 00022 applies cleanly after 00020 regardless.)
--
-- Ported from origin/feat/security-hardening (4324ce4). That commit's profiles
-- privilege-escalation trigger already landed on main independently as
-- 00020_profiles_privilege_guard.sql, so it is intentionally NOT duplicated
-- here — this migration carries only the remaining outcome_surveys half.
--
-- Before: outcome_surveys_owner_all (00010) WITH CHECK scopes only
-- user_id = auth.uid(), so an authenticated caller could insert a survey row
-- whose assessment_id points at ANY user's assessment (cross-tenant
-- reference). After: the WITH CHECK additionally requires the referenced
-- assessment to belong to the caller (or to be null). The USING clause is
-- unchanged; this strictly tightens writes.
-- =============================================================================

drop policy if exists "outcome_surveys_owner_all" on outcome_surveys;

create policy "outcome_surveys_owner_all"
  on outcome_surveys for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      assessment_id is null
      or exists (
        select 1
        from assessments a
        where a.id = outcome_surveys.assessment_id
          and a.user_id = (select auth.uid())
      )
    )
  );

-- ROLLBACK:
-- drop policy if exists "outcome_surveys_owner_all" on outcome_surveys;
--
-- create policy "outcome_surveys_owner_all"
--   on outcome_surveys for all
--   to authenticated
--   using (user_id = (select auth.uid()))
--   with check (user_id = (select auth.uid()));
