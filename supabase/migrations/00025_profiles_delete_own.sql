-- =============================================================================
-- 00025_profiles_delete_own.sql — self-service account erasure path.
--
-- /api/account/delete relies on deleting the caller's `profiles` row so the
-- ON DELETE CASCADE tree (00002/00017: every user table references
-- profiles(id) on delete cascade) erases their data. RLS on profiles is
-- forced with select/update policies only — with NO delete policy the
-- route's fallback delete silently matched 0 rows and erased nothing while
-- reporting success (audit finding, HIGH).
--
-- The policy is self-scoped; the grant is required because the hardening
-- sweep manages table grants explicitly and `authenticated` may not hold
-- DELETE. Grant + forced RLS + this policy = a user can delete exactly
-- their own row, nothing else.
-- =============================================================================

drop policy if exists "profiles_delete_own" on profiles;
create policy "profiles_delete_own"
  on profiles for delete
  using ((select auth.uid()) = id);

grant delete on profiles to authenticated;

-- ROLLBACK:
-- drop policy if exists "profiles_delete_own" on profiles;
-- revoke delete on profiles from authenticated;
