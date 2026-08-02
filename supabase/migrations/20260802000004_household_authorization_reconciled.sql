-- =============================================================================
-- 20260802000004_household_authorization_reconciled.sql — household membership
-- authorization, reconciled into one file.
--
-- NOT APPLIED. This migration has never executed against any database —
-- production, staging or local. Nothing in it is observed; every claim below is
-- read from policy source. Applying it requires the separate approval gate
-- (exact target, backup, staging rehearsal, rollback rehearsal), and the
-- migration ledger for this project is diverged — 139 remote entries against 42
-- local files at the 2026-08-02 audit, correlating only through 00006 — so a
-- clean apply CANNOT be assumed. Reconcile the ledger first.
--
-- SUPERSEDES 20260802000001_household_membership_authorization.sql, which is
-- removed in the same commit. That file was also never applied, so this is a
-- replacement rather than a revision of applied history; the forward-only rule
-- is not engaged. It closed two of the five defects below. It is not a
-- prerequisite and must not be applied alongside this file.
--
-- Timestamp naming is deliberate. Everything actually recorded against this
-- database since 2026-04 uses timestamp versions, so a `00044_` would add one
-- more uncorrelatable row to a ledger that already cannot be read. 000001
-- through 000003 in this date are taken; this is the next free slot.
--
-- =============================================================================
-- THE BUG — five defects of one class, all originating in 00039_households.sql.
--
--   1. SELF-GRANTED MEMBERSHIP.
--      household_members_insert_self is
--          with check (user_id = (select auth.uid()))
--      which validates WHO YOU CLAIM TO BE and never WHETHER YOU ARE ENTITLED
--      to that household. 00039 declares no explicit grants, so the Supabase
--      defaults leave `authenticated` holding INSERT. Any signed-in user who
--      learns a household UUID can insert themselves as 'partner'. That row
--      then satisfies household_members_select, households_member_select and
--      household_invites_member_all — exposing the other member's last_score /
--      last_verdict / last_assessment_at and every invite address and raw
--      token issued for that household. The 409 guard in
--      app/api/household/accept/route.ts is application-only; a direct
--      PostgREST insert with the anon key never reaches it.
--
--   2. ROW-MOVE / ROLE ESCALATION.
--      household_members_update_self has a USING clause, NO WITH CHECK, and no
--      column grants narrowing it. A member may therefore
--          update household_members set household_id = '<someone else>'
--      or set role = 'owner' on their own row. This defeats any INSERT policy,
--      so fixing (1) alone leaves the door open by another route.
--
--   3. LEGITIMATE INVITEES LOCKED OUT.
--      household_invites_member_all requires EXISTING MEMBERSHIP to SELECT.
--      lib/supabase/server.ts builds the request client with the anon key, so
--      RLS applies: a brand-new invitee's token lookup in the accept route
--      (accept/route.ts:55) returns zero rows and the route answers 404 before
--      it can check anything else. The invite flow has never worked for its
--      intended recipient.
--
--   4. ACCEPTANCE NEVER RECORDED.
--      Consequence of (3): after joining, the route's
--      update({status:'accepted'}) (accept/route.ts:90) fails
--      household_invites_member_all's WITH CHECK — the invitee is neither
--      owner nor invited_by — AND THE ROUTE DISCARDS THE ERROR (no `error`
--      destructured, no await on the result checked). Invites stay 'pending'
--      and replayable until expiry.
--
--   5. NO INTEGRITY BOUND ON MEMBERSHIP.
--      00039 constrains `unique (household_id, user_id)`, which prevents
--      joining the SAME household twice and nothing else.
--        · A second membership in a DIFFERENT household is unconstrained, and
--          it breaks the product outright: all four household routes filter
--          household_members by user_id alone and call .maybeSingle(), which
--          ERRORS on multiple rows —
--              app/api/household/route.ts:33            (load household)
--              app/api/household/invite/route.ts:48     (owner check)
--              app/api/household/accept/route.ts:47     (already-member check)
--              app/api/household/sync-score/route.ts:52 (score sync target)
--          A user holding two memberships loses their household page,
--          invitations, acceptance and score sync at once.
--        · Nothing caps household size, but lib/household/dual-score.ts is
--          shaped memberA / memberB (L22-23, L48-54) — the joint readiness
--          model is strictly two people. A third member can exist while the
--          household verdict silently omits them, INCLUDING THEIR HARD STOPS,
--          and still presents itself as the household's answer. That is an
--          honesty failure, not only a data-model gap.
--
-- IMPACT: cross-tenant read of another household's readiness figures and of its
--   outstanding invite addresses and tokens; a partner-invite flow that cannot
--   complete honestly; and a joint verdict that can quietly drop a member's
--   protective gates. Exploiting (1) needs a household UUID, which is
--   gen_random_uuid() and not enumerable — that is the only thing standing in
--   the way, and it lowers the odds, not the severity. Authorization must not
--   rest on an identifier being hard to guess.
--
-- =============================================================================
-- THE FIX — move the entitlement decision into the database, inline.
--
--   ENTITLEMENT IS EXPRESSED DIRECTLY IN THE POLICY, not in a helper function.
--   A SECURITY DEFINER predicate in `public` is reachable as a PostgREST RPC by
--   anyone holding EXECUTE, so it is a second, independently-callable surface
--   that must then be reasoned about on its own terms. Inline policy logic has
--   no such surface. This costs one thing — see OPEN RISK below, which is the
--   whole reason a DEFINER helper is still on the table.
--
--   Every policy is scoped `to authenticated`. An anonymous caller can never
--   satisfy any of them (no auth.uid(), no JWT email), but role scoping keeps
--   them from being EVALUATED for anon at all.
--
--   auth.uid() and auth.jwt() are wrapped in a scalar SELECT so the planner
--   treats them as an InitPlan and evaluates them ONCE per statement rather
--   than once per row. On a table scanned per-request this is the difference
--   between a constant and a per-row function call.
--
--   The JWT email is explicitly guarded `is not null` BEFORE any comparison.
--   Without the guard, a JWT carrying no email claim yields NULL, and while
--   NULL = anything is NULL (not true), the guard makes the fail-closed
--   behaviour a stated property of the policy rather than an inherited
--   accident of three-valued logic. Identity is taken from the JWT rather than
--   from profiles.email: the JWT claim is minted by GoTrue from
--   auth.users.email and cannot be written by the user at all, whereas
--   profiles.email is a mirror that only became un-writable on 2026-08-01
--   (00041). Fewer moving parts, and no dependency on a table whose own RLS
--   would have to be reasoned about inside a policy.
--
--   COLUMN GRANTS — not a WITH CHECK — close (2). WITH CHECK cannot reference
--   OLD, so it cannot express "you may not CHANGE this column"; it can only
--   describe the destination row. Precedent is
--   00020_profiles_column_grants.sql: revoke UPDATE wholesale, then grant back
--   exactly the columns the product writes.
--
--   A PARTIAL UNIQUE INDEX — not a count(*) in WITH CHECK — caps household
--   size. Postgres takes no lock across a count(*) read inside a policy, so two
--   invitees accepting concurrently can each observe one member and each
--   insert, producing exactly the three-member household the cap exists to
--   prevent. A unique index cannot be raced: the second insert fails on the
--   index no matter how the transactions interleave. The storage layer is the
--   invariant.
--
-- =============================================================================
-- OPEN RISK — UNRESOLVED. Do not read the rest of this file as if this were
-- settled. It cannot be settled without a live database.
--
--   The owner leg of household_members_insert_self reads `households`:
--
--       exists (select 1 from households h
--                where h.id = household_members.household_id
--                  and h.created_by = (select auth.uid()))
--
--   A subquery inside an RLS policy is evaluated AS THE CALLER, and the
--   referenced table's own policies apply to it. The only SELECT policy on
--   `households` is households_member_select (00039 L59-68), which requires
--   MEMBERSHIP. A household's creator is NOT YET A MEMBER at the moment they
--   insert their own owner row — that insert is what makes them one.
--
--   If RLS filters that subselect, it returns zero rows, the WITH CHECK fails,
--   and HOUSEHOLD CREATION BREAKS ENTIRELY: POST /api/household would return
--   500 "Could not join household" for every user, every time, having already
--   written an orphan `households` row. This trades a cross-tenant read for a
--   dead feature. It is not an acceptable outcome and it must be rehearsed
--   before this file is applied anywhere.
--
--   A CORROBORATING SIGNAL, worth checking in the same rehearsal: the same gap
--   appears to sit one step EARLIER, independently of this migration.
--   app/api/household/route.ts:115-119 does
--       .insert({ name, created_by: user.id }).select(...).single()
--   and an INSERT ... RETURNING on an RLS table applies the SELECT policies to
--   the returned row. Under households_member_select alone the creator cannot
--   see the row they just wrote, so POST /api/household would already be
--   failing at 500 "Could not create household" today, before reaching the
--   member insert. If rehearsal confirms that, the creator-visibility gap is a
--   PRE-EXISTING 00039 defect that this migration merely inherits — and
--   whichever resolution is chosen must fix the RETURNING too, not only the
--   policy subselect.
--
--   TWO CANDIDATE RESOLUTIONS. Both are written out below, commented, so
--   rehearsal can drop one in without redesign.
--
--   (i) SECURITY DEFINER predicate. Move the owner leg into a function owned by
--       `postgres`, which reads `households` with owner rights and so bypasses
--       the caller's RLS. Precedent: is_admin() has done this since 00004 to
--       avoid recursive RLS, and it is the opposite case to 00041 — 00041's
--       guard needed the CALLER's identity, so DEFINER was the bug there.
--       Costs: a new PostgREST-callable RPC (mitigable with `revoke all from
--       public` + `grant execute to authenticated`, boolean return, actor
--       derived from auth.uid() and never from an argument), and it leaves the
--       INSERT ... RETURNING problem above untouched.
--
--       -- create or replace function public.household_owner_seat_allowed(hh uuid)
--       -- returns boolean language sql stable security definer
--       -- set search_path = public as $fn$
--       --   select exists (
--       --     select 1 from households h
--       --      where h.id = hh and h.created_by = (select auth.uid())
--       --   );
--       -- $fn$;
--       -- revoke all on function public.household_owner_seat_allowed(uuid) from public;
--       -- grant execute on function public.household_owner_seat_allowed(uuid) to authenticated;
--       -- (then replace the owner leg's exists(...) with
--       --  household_owner_seat_allowed(household_members.household_id))
--
--   (ii) CREATOR-SCOPED SELECT POLICY ON households. Add a second permissive
--       SELECT policy so a creator can see the household they created.
--       Permissive policies OR together, so members keep their existing
--       visibility and nothing is narrowed.
--
--       -- drop policy if exists "households_creator_select" on households;
--       -- create policy "households_creator_select"
--       --   on households for select
--       --   to authenticated
--       --   using (created_by = (select auth.uid()));
--
--   RECOMMENDED IF REHEARSAL SHOWS FILTERING: (ii).
--       · It fixes both symptoms with one object. The policy subselect and the
--         INSERT ... RETURNING are the same missing grant of visibility, and
--         (i) addresses only the first.
--       · It adds no callable surface. (i) adds an RPC that must then be
--         audited on its own.
--       · What it widens is exactly what it should: seeing the household row
--         you created, whose created_by is already your own uid. It discloses
--         nothing the caller did not author.
--       · It keeps the entitlement decision in one readable place — the policy
--         — rather than splitting it between a policy and a function body.
--       The argument the other way is real and should be weighed at rehearsal:
--       (ii) mutates a 00039 object this migration otherwise leaves alone, and
--       widens `households` SELECT slightly for the window before a creator
--       joins. If that window is judged unacceptable, take (i) AND still fix
--       the RETURNING, which will cost a policy change anyway — at which point
--       (ii) alone was the smaller change.
--
--   UNTIL REHEARSED, THE OWNER LEG BELOW IS UNPROVEN. The partner leg reads
--   household_invites, which has the same class of exposure — but there the
--   recipient policy created in step 1 of this file grants the invitee
--   visibility of their own invite row BEFORE the insert is attempted, so the
--   subselect has something to find. That is why only the owner leg is at risk.
--
-- =============================================================================
-- NOT VERIFIED AT AUTHORING TIME. This repository has no non-production
--   Postgres: .env.local targets the production project, and there is no
--   Docker, psql or supabase/config.toml available. The accompanying suite
--   __tests__/acceptance/household-rls.integration.test.ts encodes the intended
--   behaviour (HH-001..HH-010) and self-skips until RUN_RLS_IT=1 and a
--   dedicated test project are supplied. Do not treat this migration as proven
--   until it has run against a database.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. An invitee may read the invitation addressed to them — and nothing else.
--    Closes defect (3).
--
-- Scoped by EMAIL rather than by token. The row is theirs either way, and
-- matching on identity keeps a bearer token from being sufficient to read data:
-- tokens travel by email and are echoed back to the inviter by invite/route.ts,
-- so they are a routing hint, not an authenticator. A forwarded link now finds
-- nothing rather than revealing that an invite exists; the route's 403
-- (accept/route.ts:73) stays as defence in depth.
--
-- The existing member policy is unaffected here — permissive policies OR
-- together — though step 5 narrows it separately.
-- ---------------------------------------------------------------------------
drop policy if exists "household_invites_recipient_select" on household_invites;
create policy "household_invites_recipient_select"
  on household_invites for select
  to authenticated
  using (
    (select auth.jwt() ->> 'email') is not null
    and lower(email) = lower((select auth.jwt() ->> 'email'))
  );

-- ---------------------------------------------------------------------------
-- 2. Joining a household requires a real entitlement. Closes defect (1).
--
-- Two legitimate ways in, and no others:
--   · you created the household and are seating yourself as its owner
--   · you hold a live invitation addressed to your email, and join as partner
--
-- The invite must still be pending and unexpired AT INSERT TIME, so a revoked
-- or lapsed invitation cannot be replayed into membership.
--
-- Household size is NOT capped here. It is capped by the indexes in step 6,
-- for the race reasons given in THE FIX. The owner leg needs no separate cap:
-- it admits only the creator (h.created_by), 00039's unique (household_id,
-- user_id) stops them seating themselves twice, and step 6's one-membership-
-- per-user index stops them holding a seat elsewhere. One owner + one partner
-- = the two members lib/household/dual-score.ts can actually represent.
--
-- SEE OPEN RISK ABOVE: the owner leg's subselect against `households` may be
-- filtered by that table's own RLS. Unproven until rehearsed.
-- ---------------------------------------------------------------------------
drop policy if exists "household_members_insert_self" on household_members;
create policy "household_members_insert_self"
  on household_members for insert
  to authenticated
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
            and (select auth.jwt() ->> 'email') is not null
            and lower(i.email) = lower((select auth.jwt() ->> 'email'))
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Membership UPDATE cannot move the row or change its role. Closes (2).
--
-- The RLS policy decides WHICH ROW (your own). These grants decide WHICH
-- COLUMNS. household_id, user_id, role, id and joined_at are deliberately
-- absent — those are the entire escalation surface, and a WITH CHECK could not
-- protect them because it cannot see OLD.
--
-- The four granted columns are exactly what app/api/household/sync-score/
-- route.ts:45-55 writes through the anon client, and nothing else in the
-- codebase updates this table.
--
-- household_members_update_self is restated only to add `to authenticated` and
-- a WITH CHECK. The grants above are what enforce; the WITH CHECK is defence in
-- depth for the day someone re-grants a column — it pins the destination row to
-- the caller, so the row can never end up belonging to somebody else. It cannot
-- substitute for the grants, because it cannot express "unchanged".
-- ---------------------------------------------------------------------------
revoke update on household_members from anon, authenticated;
grant update (display_name, last_score, last_verdict, last_assessment_at)
  on household_members to authenticated;

drop policy if exists "household_members_update_self" on household_members;
create policy "household_members_update_self"
  on household_members for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- 4. An invitee may record their own acceptance — and nothing else. Closes (4).
--
-- accept/route.ts:90-93 sets status='accepted' immediately after the join. By
-- then the caller IS a member, but step 5 narrows the member policy to owners,
-- so without this policy the update fails its WITH CHECK, the route discards
-- the error, and the invitation stays pending and replayable.
--
-- The WITH CHECK PINS THE DESTINATION STATE to 'accepted', so this cannot be
-- turned into a way to revoke, un-expire or re-open an invitation — those stay
-- the owner's call. The column grant keeps email, token, household_id and
-- expires_at out of reach entirely.
--
-- The email leg is repeated in both USING and WITH CHECK on purpose: USING
-- decides which row you may touch, WITH CHECK decides what it may become, and
-- an unqualified WITH CHECK would let a row be pointed at a different address
-- if `email` were ever re-granted.
-- ---------------------------------------------------------------------------
drop policy if exists "household_invites_recipient_accept" on household_invites;
create policy "household_invites_recipient_accept"
  on household_invites for update
  to authenticated
  using (
    status = 'pending'
    and expires_at > now()
    and (select auth.jwt() ->> 'email') is not null
    and lower(email) = lower((select auth.jwt() ->> 'email'))
  )
  with check (
    status = 'accepted'
    and (select auth.jwt() ->> 'email') is not null
    and lower(email) = lower((select auth.jwt() ->> 'email'))
  );

revoke update on household_invites from anon, authenticated;
grant update (status) on household_invites to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Only the OWNER may read their household's invitations. Closes the token
--    disclosure half of (1).
--
-- household_invites_member_all scoped USING to membership rather than
-- ownership, so any partner could read every pending invite row for their
-- household — invited addresses and raw tokens included. A token is the routing
-- credential for an invitation; that is a credential disclosure to someone who
-- was never meant to hold it.
--
-- Verified safe to narrow: NO ROUTE LISTS INVITATIONS. The only readers are
-- accept/route.ts:55-59 (by token, as the recipient — served by step 1) and
-- invite/route.ts:59-69, where the owner's INSERT ... .select() returns the row
-- it just wrote and is served by the owner USING below. WITH CHECK is
-- reproduced UNCHANGED from 00039 so the owner's INSERT path is untouched.
--
-- Note the interaction with step 4's revoke: the owner also loses UPDATE on
-- household_invites (only `status` is granted back, and the owner does not
-- satisfy the recipient policy). No route revokes or edits an invitation today.
-- If an owner-side revoke feature is ever built, it needs both an owner UPDATE
-- policy and its own column grant — it will not silently inherit one.
-- ---------------------------------------------------------------------------
drop policy if exists "household_invites_member_all" on household_invites;
create policy "household_invites_member_all"
  on household_invites for all
  to authenticated
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

-- ---------------------------------------------------------------------------
-- 6. Integrity bounds. Closes (5). These are the guarantees — the policies
--    above decide WHO may join, these decide HOW MANY and HOW OFTEN, and only
--    the storage layer can do that without racing.
--
-- PRE-CHECK BEFORE APPLYING TO ANY POPULATED DATABASE. If either query returns
-- rows, resolve the data first — do not force the index. Creation aborting on
-- duplicates is the CORRECT outcome: it surfaces corruption instead of
-- silently picking a winner.
--
--     select user_id, count(*) from household_members
--      group by user_id having count(*) > 1;
--
--     select household_id, count(*) from household_members
--      where role = 'partner' group by household_id having count(*) > 1;
-- ---------------------------------------------------------------------------
create unique index if not exists household_members_one_per_user
  on household_members (user_id);

comment on index household_members_one_per_user is
  'One membership per user. All four household routes read household_members '
  'by user_id with .maybeSingle(), which errors on multiple rows, so a second '
  'membership breaks the household surface outright.';

create unique index if not exists household_one_partner_per_household
  on household_members (household_id) where role = 'partner';

comment on index household_one_partner_per_household is
  'Caps a household at one partner, and with the owner leg at two members '
  'total, matching the memberA/memberB shape of lib/household/dual-score.ts. '
  'Race-proof where a count(*) inside WITH CHECK is not: concurrent accepts '
  'can each observe one member and each insert.';

-- Supports the invite lookup the INSERT check performs on every join, and the
-- recipient SELECT policy's lower(email) comparison.
create index if not exists idx_household_invites_hh_email
  on household_invites (household_id, lower(email));

-- =============================================================================
-- VERIFICATION — run against a disposable database, NEVER production. Encoded
-- as __tests__/acceptance/household-rls.integration.test.ts (opt-in;
-- RUN_RLS_IT=1 plus a dedicated test project).
--
--   FIRST, AND BLOCKING (see OPEN RISK):
--     · a household creator CAN insert themselves as owner            [HH-011]
--       If this fails, STOP and adopt resolution (ii) — or (i) — above.
--     · POST /api/household end to end returns 200, and the households
--       INSERT ... RETURNING gives back the created row
--
--   Then:
--     · an uninvited user CANNOT insert themselves into a household   [HH-001]
--     · and therefore cannot read its members' readiness figures     [HH-001b]
--     · nor its invite addresses and tokens                          [HH-001c]
--     · a member CANNOT move their row to another household           [HH-002]
--     · a member CANNOT promote themselves to owner                   [HH-003]
--     · sync-score's four columns are still writable (no regression)  [HH-004]
--     · the invited recipient CAN read the invite addressed to them   [HH-005]
--     · the recipient CAN only transition it to 'accepted'            [HH-006]
--     · and CANNOT rewrite the address it was issued to              [HH-006b]
--     · a user holding a household CANNOT join a second               [HH-007]
--     · an invited THIRD member CANNOT join a full household          [HH-008]
--     · a partner CANNOT read their household's invite tokens         [HH-009]
--     · the owner CAN still read their household's invitations        [HH-010]
--     · an expired or revoked invite CANNOT be used to join
--     · an invitee CANNOT join a DIFFERENT household than the invited one
--
-- =============================================================================
-- ROLLBACK — restores 00039 behaviour verbatim.
--
-- BE CLEAR ABOUT WHAT THIS COSTS. Reverting does not merely undo a change: it
-- REINSTATES EVERY VULNERABILITY LISTED AT THE TOP OF THIS FILE — the
-- self-granted membership and the cross-tenant read of another household's
-- readiness figures, invite addresses and raw tokens; the role and row-move
-- escalation; the invitee lockout; the unrecorded, replayable acceptance; and
-- the unbounded membership that breaks .maybeSingle() and silently drops a
-- third member's hard stops from the joint verdict. Prefer fixing forward.
--
-- drop index if exists idx_household_invites_hh_email;
-- drop index if exists household_one_partner_per_household;
-- drop index if exists household_members_one_per_user;
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
-- drop policy if exists "household_invites_recipient_accept" on household_invites;
-- drop policy if exists "household_invites_recipient_select" on household_invites;
-- grant update on household_invites to authenticated;
--
-- drop policy if exists "household_members_update_self" on household_members;
-- create policy "household_members_update_self"
--   on household_members for update
--   using (user_id = (select auth.uid()));
-- grant update on household_members to authenticated;
--
-- drop policy if exists "household_members_insert_self" on household_members;
-- create policy "household_members_insert_self"
--   on household_members for insert
--   with check (user_id = (select auth.uid()));
-- =============================================================================
