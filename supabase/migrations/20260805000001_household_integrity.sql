-- =============================================================================
-- 20260805000001_household_integrity.sql
--
-- Ports unshipped work from branch fix/household-membership-authorization
-- (was 00043_household_integrity.sql). Apply AFTER
-- 20260802000001_household_membership_authorization.sql has been applied.
--
-- AUTHORING ONLY until the migration approval gate (backup, staging, rollback).
-- Timestamp naming matches the post-rebuild ledger convention.
--
-- Closes three gaps left open by membership-authorization:
--   G-1 one household per user (unique on user_id)
--   G-2 max two members / one partner (race-proof partial unique index)
--   G-3 invite rows readable by owners only (not partners)
-- =============================================================================

create unique index if not exists household_members_one_per_user
  on household_members (user_id);

comment on index household_members_one_per_user is
  'One membership per user. The routes read household_members by user_id with '
  '.maybeSingle(), which errors on multiple rows, so a second membership '
  'breaks the household surface outright.';

-- ---------------------------------------------------------------------------
-- G-2 (storage half) - at most one partner per household
--
-- This is the real cap. The count(*) test in household_join_allowed() races:
-- two concurrent accepts can each observe one member and each insert. A
-- partial unique index cannot be raced - the second insert fails on the index
-- no matter how the transactions interleave.
--
-- One partner + the owner leg's empty-household requirement = exactly two.
-- ---------------------------------------------------------------------------

create unique index if not exists household_one_partner_per_household
  on household_members (household_id) where role = 'partner';

comment on index household_one_partner_per_household is
  'Caps a household at one partner, and with it at two members total, matching '
  'the memberA/memberB shape of lib/household/dual-score.ts. Race-proof where '
  'the count(*) clause in household_join_allowed() is not.';

-- ---------------------------------------------------------------------------
-- G-2 - cap membership at two (replaces the 00042 predicate)
--
-- Identical to 00042 except for the member-count clause on the partner leg.
-- Restated in full rather than patched, so this file alone describes the
-- function's whole behaviour.
-- ---------------------------------------------------------------------------

create or replace function public.household_join_allowed(hh uuid, want_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with actor as (
    select
      (select auth.uid()) as uid,
      lower(nullif(
        coalesce(
          (select p.email from profiles p where p.id = (select auth.uid())),
          auth.jwt() ->> 'email'
        ),
        ''
      )) as email
  )
  select case want_role
    -- The creator may seat themselves as owner, and only while the household
    -- is still empty. Once anyone is a member this leg is permanently closed.
    when 'owner' then
      exists (
        select 1
        from households h, actor a
        where h.id = hh
          and h.created_by = a.uid
      )
      and not exists (
        select 1 from household_members m where m.household_id = hh
      )

    -- A partner needs a live invitation addressed to them, AND room in the
    -- household. The cap is what keeps the dual-score model honest: a third
    -- member would be dropped from the joint verdict without trace.
    --
    -- The count below is a FAST PATH, not the guarantee - it races under
    -- concurrent accepts. household_one_partner_per_household is what actually
    -- holds the line. Do not remove the index on the strength of this clause.
    when 'partner' then
      exists (
        select 1
        from household_invites i, actor a
        where i.household_id = hh
          and i.status = 'pending'
          and i.expires_at > now()
          and lower(i.email) = a.email
      )
      and (
        select count(*) from household_members m2 where m2.household_id = hh
      ) < 2

    else false
  end;
$$;

comment on function public.household_join_allowed(uuid, text) is
  'Entitlement check for household_members INSERT. SECURITY DEFINER so it can '
  'read the invite and household rows the caller''s own RLS hides. Caps '
  'membership at two, matching the memberA/memberB dual-score model. Fails '
  'closed when the caller has no resolvable email.';

-- Idempotent restatement: create or replace preserves privileges, but this
-- keeps the file self-contained if it is ever applied to a database where the
-- 00042 grants were not present.
revoke all on function public.household_join_allowed(uuid, text) from public;
grant execute on function public.household_join_allowed(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- G-3 - only the owner may read their household's invitations
--
-- USING narrows from "any member" to "the owner". WITH CHECK is reproduced
-- unchanged from 00039. 00042's household_invites_recipient_select still lets
-- an invitee read the one invitation addressed to them.
-- ---------------------------------------------------------------------------

drop policy if exists "household_invites_member_all" on household_invites;
create policy "household_invites_member_all"
  on household_invites for all
  using (
    exists (
      select 1 from household_members m
      where m.household_id = household_invites.household_id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
  )
  with check (
    exists (
      select 1 from household_members m
      where m.household_id = household_invites.household_id
        and m.user_id = (select auth.uid())
        and m.role = 'owner'
    )
    or invited_by = (select auth.uid())
  );

-- =============================================================================
-- ROLLBACK - restores G-1 and G-3.
--
-- drop policy if exists "household_invites_member_all" on household_invites;
-- create policy "household_invites_member_all"
--   on household_invites for all
--   using (
--     exists (
--       select 1 from household_members m
--       where m.household_id = household_invites.household_id
--         and m.user_id = (select auth.uid())
--     )
--   )
--   with check (
--     exists (
--       select 1 from household_members m
--       where m.household_id = household_invites.household_id
--         and m.user_id = (select auth.uid())
--         and m.role = 'owner'
--     )
--     or invited_by = (select auth.uid())
--   );
--
-- drop index if exists household_one_partner_per_household;
-- drop index if exists household_members_one_per_user;
--
-- Then re-apply 00042 verbatim to drop the member cap from the predicate.
-- =============================================================================
