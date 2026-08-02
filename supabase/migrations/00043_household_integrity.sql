-- =============================================================================
-- 00043_household_integrity.sql — close the three gaps 00042 deliberately
-- deferred. 00042 decided WHO may join a household; this file decides HOW MANY,
-- HOW OFTEN, and WHO MAY SEE THE INVITATIONS.
--
-- ORDERING — APPLY AFTER 00042. This file does `create or replace` on
--   household_join_allowed(), which 00042 introduces. Applying it first would
--   create the function without 00042's policy wiring, and 00042 would then
--   overwrite the member cap added here. Verify with:
--
--       select prosrc like '%count(*)%' from pg_proc
--        where proname = 'household_join_allowed';
--
--   after applying both; it must be true.
--
-- -----------------------------------------------------------------------------
-- G-1 — ONE HOUSEHOLD PER USER
--
--   00039 constrains `unique (household_id, user_id)`, which prevents joining
--   the SAME household twice and nothing else. A second membership in a
--   DIFFERENT household is unconstrained, and it breaks the product: every
--   household route filters household_members by user_id alone and calls
--   .maybeSingle(), which errors on multiple rows —
--
--       app/api/household/route.ts:33          (load household)
--       app/api/household/invite/route.ts:48   (owner check)
--       app/api/household/accept/route.ts:47   (already-a-member check)
--       app/api/household/sync-score/route.ts:47
--
--   so a user holding two memberships loses their household page, invitations,
--   acceptance and score sync at once. 00042 narrowed the way in but did not
--   close this.
--
--   PRE-CHECK BEFORE APPLYING TO ANY POPULATED DATABASE. If this returns rows,
--   resolve them first — do not force the index:
--
--       select user_id, count(*) as memberships
--         from household_members
--        group by user_id
--       having count(*) > 1;
--
--   Index creation aborting on duplicates is the correct outcome. It surfaces
--   corruption rather than silently picking a winner.
--
-- -----------------------------------------------------------------------------
-- G-2 — THE HOUSEHOLD VERDICT CANNOT HONESTLY HOLD A THIRD MEMBER
--
--   lib/household/dual-score.ts is shaped `memberA` / `memberB` (L22-23, L48-54)
--   — the joint readiness model is strictly two people. Nothing in 00039 caps
--   membership, so a third member can exist while the household verdict simply
--   omits them, INCLUDING THEIR HARD STOPS, and still presents itself as the
--   household's answer. A verdict that silently drops a member's protective
--   gates is a honesty failure, not only a data-model gap.
--
--   The cap belongs on the partner leg only: the owner leg already requires an
--   empty household, so the two legs together admit exactly two members.
--
--   TWO MECHANISMS, DELIBERATELY. A `count(*) < 2` test inside WITH CHECK is
--   NOT sufficient on its own: Postgres takes no lock across that read, so two
--   invitees accepting concurrently can both observe one member and both
--   insert, producing the three-member household the cap exists to prevent.
--   The guarantee therefore lives in a partial unique index —
--   household_one_partner_per_household — which the storage layer enforces and
--   which no interleaving can defeat. The count clause is kept as a fast path
--   so the ordinary case fails as a clean RLS denial rather than a unique
--   violation. The index is the invariant; the count is the error message.
--
--   This encodes 00039's own stated intent ("True dual-user household
--   accounts. Two members share readiness context"). If households of three
--   ever become a product goal, this cap is the WRONG fix and dual-score.ts is
--   the right one — revisit here first, and note that the index would need to
--   go too.
--
-- -----------------------------------------------------------------------------
-- G-3 — ANY PARTNER COULD READ EVERY INVITATION IN THEIR HOUSEHOLD
--
--   household_invites_member_all scopes USING to membership rather than
--   ownership, so a partner could read every pending invite row for their
--   household — invited addresses and raw tokens included. Since a token is
--   the routing credential for an invitation, that is a credential disclosure
--   to someone who was never meant to hold it.
--
--   Safe to narrow: no route lists invitations. The only readers are
--   accept/route.ts:56 (by token, as the recipient — served by 00042's
--   household_invites_recipient_select) and invite/route.ts:60, where the
--   owner's INSERT ... .select() returns the row it just wrote and is served
--   by the owner USING below. WITH CHECK is unchanged from 00039.
--
-- NOT VERIFIED AT AUTHORING TIME: as with 00042, this repository has no
--   non-production Postgres, so nothing here is observed. Behaviour is encoded
--   in __tests__/acceptance/household-rls.integration.test.ts (HH-007..HH-010),
--   which self-skips until RUN_RLS_IT=1 and a dedicated test project exist.
--
-- ROLLBACK: at the end of this file. Reverting restores G-1 and G-3.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- G-1 — one household per user
-- ---------------------------------------------------------------------------

create unique index if not exists household_members_one_per_user
  on household_members (user_id);

comment on index household_members_one_per_user is
  'One membership per user. The routes read household_members by user_id with '
  '.maybeSingle(), which errors on multiple rows, so a second membership '
  'breaks the household surface outright.';

-- ---------------------------------------------------------------------------
-- G-2 (storage half) — at most one partner per household
--
-- This is the real cap. The count(*) test in household_join_allowed() races:
-- two concurrent accepts can each observe one member and each insert. A
-- partial unique index cannot be raced — the second insert fails on the index
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
-- G-2 — cap membership at two (replaces the 00042 predicate)
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
    -- The count below is a FAST PATH, not the guarantee — it races under
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
-- G-3 — only the owner may read their household's invitations
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
-- ROLLBACK — restores G-1 and G-3.
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
