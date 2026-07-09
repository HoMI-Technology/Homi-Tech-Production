-- 00011_shares_ownership.sql
-- Tightens the score_shares insert policy to close the cross-tenant share
-- IDOR (AUDIT T1.1) at the database layer, as defense-in-depth behind the
-- API-level ownership check in app/api/shares/route.ts.
--
-- Before: score_shares_owner_all only checked created_by = auth.uid(), so a
-- caller could set created_by to themselves while pointing assessment_id at
-- ANY assessment. After: the WITH CHECK additionally requires that the
-- referenced assessment belongs to the caller.

drop policy if exists "score_shares_owner_all" on score_shares;

create policy "score_shares_owner_all"
  on score_shares for all
  to authenticated
  using (created_by = (select auth.uid()))
  with check (
    created_by = (select auth.uid())
    and exists (
      select 1
      from assessments a
      where a.id = score_shares.assessment_id
        and a.user_id = (select auth.uid())
    )
  );

-- ROLLBACK:
-- drop policy if exists "score_shares_owner_all" on score_shares;
--
-- create policy "score_shares_owner_all"
--   on score_shares for all
--   to authenticated
--   using (created_by = (select auth.uid()))
--   with check (created_by = (select auth.uid()));
