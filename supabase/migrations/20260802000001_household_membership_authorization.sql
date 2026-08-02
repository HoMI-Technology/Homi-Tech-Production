-- =============================================================================
-- 20260802000001_household_membership_authorization.sql
--
-- Fixes two halves of the same defect in 00039_households.sql: joining a
-- household was authorized by nothing, while reading your own invite was
-- authorized by too much.
--
-- NOT APPLIED BY THIS COMMIT. Authoring only. Applying it requires the
-- separate approval gate (exact target, backup, staging rehearsal, rollback),
-- and the migration ledger for this project is currently diverged - 139 remote
-- entries against 42 local files, correlating only through 00006 - so DO NOT
-- assume a clean apply. Reconcile first.
--
-- Timestamp naming is deliberate: everything actually recorded against this
-- database since 2026-04 uses timestamps, so a 00042 would add one more
-- uncorrelatable row to a ledger that already cannot be read.
--
-- -----------------------------------------------------------------------------
-- DEFECT 1 (escalation) - household_members_insert_self
--
--   with check (user_id = (select auth.uid()))
--
-- This validates only that you are inserting YOURSELF. It never checks that you
-- are entitled to the household you are inserting yourself INTO. Any
-- authenticated user who knows a household id can add themselves as a partner
-- and, via households_member_select and household_members_select, read that
-- household's shared readiness context. It is reachable directly with the anon
-- key, so hardening the /api/household/accept route does not close it.
--
-- Practical reach is limited by household ids being gen_random_uuid() and not
-- enumerable - which lowers the odds, not the severity. Authorization should
-- not rest on an identifier being hard to guess.
--
-- DEFECT 2 (broken feature) - household_invites_member_all
--
-- Its USING clause requires you to ALREADY be a member of the household to
-- select the invite row. A genuine new invitee is not a member yet, so their
-- token lookup returns nothing and /api/household/accept 404s. The invite flow
-- appears to fail closed for the very person it was issued to.
--
-- Together these produce the worst possible pairing: the legitimate path is
-- blocked, and the only route that actually works is the insecure one.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Let a recipient read the invite addressed to them - and nothing else.
--
-- Scoped by email rather than by token: the row is theirs either way, and
-- matching on identity avoids making a bearer token sufficient to read data.
-- The existing member policy stays; permissive policies OR together, so
-- household members keep their current visibility.
-- -----------------------------------------------------------------------------
drop policy if exists "household_invites_recipient_select" on household_invites;
create policy "household_invites_recipient_select"
  on household_invites for select
  using (
    lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

-- -----------------------------------------------------------------------------
-- 2. Require a real entitlement to join a household.
--
-- Two legitimate ways in, and no others:
--   · you created the household and are adding yourself as its owner
--   · you hold a live invite addressed to your email, and join as a partner
--
-- The invite must still be pending and unexpired at insert time, so a revoked
-- or lapsed invite cannot be replayed into membership.
-- -----------------------------------------------------------------------------
drop policy if exists "household_members_insert_self" on household_members;
create policy "household_members_insert_self"
  on household_members for insert
  with check (
    user_id = (select auth.uid())
    and (
      (
        role = 'owner'
        and exists (
          select 1
          from households h
          where h.id = household_members.household_id
            and h.created_by = (select auth.uid())
        )
      )
      or (
        role = 'partner'
        and exists (
          select 1
          from household_invites i
          where i.household_id = household_members.household_id
            and i.status = 'pending'
            and i.expires_at > now()
            and lower(i.email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
        )
      )
    )
  );

-- Supports the invite lookup the insert check performs on every join.
create index if not exists idx_household_invites_hh_email
  on household_invites (household_id, lower(email));

-- =============================================================================
-- VERIFICATION (run against a disposable database, never production)
--
--   · a user with no invite CANNOT insert themselves into a household they do
--     not own                                                   -> expect denial
--   · a user holding a pending invite for their email CAN join as partner
--   · that same user CANNOT join a DIFFERENT household           -> expect denial
--   · an expired or revoked invite CANNOT be used to join        -> expect denial
--   · a household creator CAN insert themselves as owner
--   · an invitee CAN select the invite addressed to their email
--   · an invitee CANNOT select an invite addressed to someone else
--
-- ROLLBACK:
-- drop index if exists idx_household_invites_hh_email;
-- drop policy if exists "household_invites_recipient_select" on household_invites;
-- drop policy if exists "household_members_insert_self" on household_members;
-- create policy "household_members_insert_self"
--   on household_members for insert
--   with check (user_id = (select auth.uid()));
-- NOTE: rolling back RESTORES the escalation described above. Prefer fixing
-- forward.
-- =============================================================================
