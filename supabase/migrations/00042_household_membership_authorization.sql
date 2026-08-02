-- =============================================================================
-- 00042_household_membership_authorization.sql — make household membership
-- actually require an invitation. The database has been trusting an
-- application layer that never guarded it.
--
-- THE BUG (four defects of one class, all introduced by 00039):
--
--   1. SELF-GRANTED MEMBERSHIP.
--      household_members_insert_self is
--          with check (user_id = (select auth.uid()))
--      which validates *who you claim to be* and never *whether you are
--      entitled to that household*. 00039 declares no explicit grants, so the
--      Supabase defaults leave `authenticated` holding INSERT. Any signed-in
--      user who learns a household UUID can insert themselves as 'partner'.
--      That insert then satisfies household_members_select,
--      households_member_select and household_invites_member_all, exposing the
--      other members' last_score / last_verdict / last_assessment_at and every
--      invite email and raw token issued for that household. The 409 guard in
--      app/api/household/accept/route.ts is application-only; a direct
--      PostgREST insert never reaches it.
--
--   2. ROW-MOVE ESCALATION.
--      household_members_update_self has a USING clause and no WITH CHECK, and
--      no column grants narrow it. A member may therefore
--          update household_members set household_id = '<someone else>'
--      or set role = 'owner' on their own row. This defeats any INSERT policy,
--      so fixing (1) alone would leave the door open.
--
--   3. LEGITIMATE INVITEES LOCKED OUT.
--      household_invites_member_all requires *existing membership* to SELECT.
--      lib/supabase/server.ts builds the request client with the anon key, so
--      RLS applies: a brand-new invitee's lookup in the accept route returns
--      zero rows and the route answers 404 before it can check anything else.
--      The invite flow has never worked for its intended recipient.
--
--   4. ACCEPTANCE NEVER RECORDED.
--      Consequence of (3): after joining, the route's
--      update({status:'accepted'}) fails household_invites_member_all's WITH
--      CHECK — the invitee is neither owner nor invited_by — and the route
--      discards the error. Invites stay 'pending' and replayable until expiry.
--
-- IMPACT: cross-tenant read of another household's readiness figures and of
--   its outstanding invite addresses and tokens, plus a partner-invite flow
--   that cannot complete honestly. Exploiting (1) needs a household UUID,
--   which is not enumerable — it is the only thing standing in the way.
--
-- THE FIX: move the entitlement decision into the database.
--
--   household_join_allowed() is SECURITY DEFINER *on purpose*, and for the
--   opposite reason to 00041. 00041's guard needed the CALLER's identity, so
--   DEFINER was the bug and INVOKER was the fix. This predicate needs to read
--   rows the caller's own RLS deliberately hides — an invitee cannot see their
--   invite, and a household's creator cannot see the household until they are
--   a member — so it must run with owner rights. It reads only, returns only
--   a boolean, takes the household id as an argument, and derives the actor
--   from auth.uid() rather than from any caller-supplied identity. This is the
--   same pattern is_admin() has used since 00004 to avoid recursive RLS.
--
--   Caller email resolves from profiles.email first, falling back to the JWT
--   claim. profiles.email is provisioned at signup by handle_new_user()
--   (00005) and is locked against self-modification by
--   guard_profiles_privileged_columns() (00040 + 00041, verified enforcing),
--   which makes it a guarded identity anchor rather than a self-asserted one.
--   If both are null the comparison yields NULL and the predicate fails
--   closed.
--
--   Column grants — not a WITH CHECK — close (2), because WITH CHECK cannot
--   reference OLD. This follows 00020_profiles_column_grants.sql: revoke
--   UPDATE wholesale, then grant back exactly the columns the product writes.
--
-- NOT VERIFIED AT AUTHORING TIME: this repository has no non-production
--   Postgres. .env.local targets the production project, and there is no
--   Docker, psql or supabase/config.toml available. Every claim above is read
--   from policy source, not observed. The accompanying acceptance suite
--   (__tests__/acceptance/household-rls.integration.test.ts) encodes the
--   behaviour and self-skips until RUN_RLS_IT=1 and a dedicated test project
--   are supplied. Do not treat this migration as proven until it has run.
--
-- ROLLBACK: see the block at the end of this file. Be aware that reverting
--   restores every defect above — (1) in particular is a live cross-tenant
--   read, which is the reason this file exists.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Entitlement predicate
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
    -- is still empty. Once anyone is a member this leg is permanently closed,
    -- so it cannot be replayed to add a second owner.
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

    -- A partner needs a live invitation addressed to them. Matching is on the
    -- invited address, never on possession of the token: tokens travel by
    -- email and are echoed back to the inviter by the invite route, so they
    -- are a routing hint, not an authenticator.
    when 'partner' then
      exists (
        select 1
        from household_invites i, actor a
        where i.household_id = hh
          and i.status = 'pending'
          and i.expires_at > now()
          and lower(i.email) = a.email
      )

    else false
  end;
$$;

comment on function public.household_join_allowed(uuid, text) is
  'Entitlement check for household_members INSERT. SECURITY DEFINER so it can '
  'read the invite and household rows the caller''s own RLS hides. Fails '
  'closed when the caller has no resolvable email.';

revoke all on function public.household_join_allowed(uuid, text) from public;
grant execute on function public.household_join_allowed(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- (1) Membership INSERT must be invitation-backed
-- ---------------------------------------------------------------------------

drop policy if exists "household_members_insert_self" on household_members;
create policy "household_members_insert_self"
  on household_members for insert
  with check (
    user_id = (select auth.uid())
    and household_join_allowed(household_id, role)
  );

-- ---------------------------------------------------------------------------
-- (2) Membership UPDATE must not be able to move the row or change its role
--
-- household_members_update_self still decides WHICH row (your own). These
-- grants decide WHICH columns. household_id, user_id, role, id and joined_at
-- are deliberately absent: those are the escalation surface.
--
-- The granted four are exactly what app/api/household/sync-score/route.ts
-- writes through the anon client.
-- ---------------------------------------------------------------------------

revoke update on household_members from anon, authenticated;
grant update (display_name, last_score, last_verdict, last_assessment_at)
  on household_members to authenticated;

-- ---------------------------------------------------------------------------
-- (3) An invitee may read the invitation addressed to them
--
-- Scoped to the invited address, not to the token. A forwarded link now finds
-- nothing rather than revealing that an invite exists — the route's 403 stays
-- as defence in depth for the case where the row IS visible.
-- ---------------------------------------------------------------------------

drop policy if exists "household_invites_recipient_select" on household_invites;
create policy "household_invites_recipient_select"
  on household_invites for select
  using (
    lower(email) = lower(nullif(
      coalesce(
        (select p.email from profiles p where p.id = (select auth.uid())),
        auth.jwt() ->> 'email'
      ),
      ''
    ))
  );

-- ---------------------------------------------------------------------------
-- (4) An invitee may mark their own live invitation accepted — and nothing else
--
-- The WITH CHECK pins the destination state to 'accepted', so this policy
-- cannot be turned into a way to revoke, un-expire or re-open an invite. The
-- column grant keeps email, token and household_id out of reach.
-- ---------------------------------------------------------------------------

drop policy if exists "household_invites_recipient_accept" on household_invites;
create policy "household_invites_recipient_accept"
  on household_invites for update
  using (
    status = 'pending'
    and expires_at > now()
    and lower(email) = lower(nullif(
      coalesce(
        (select p.email from profiles p where p.id = (select auth.uid())),
        auth.jwt() ->> 'email'
      ),
      ''
    ))
  )
  with check (
    status = 'accepted'
    and lower(email) = lower(nullif(
      coalesce(
        (select p.email from profiles p where p.id = (select auth.uid())),
        auth.jwt() ->> 'email'
      ),
      ''
    ))
  );

revoke update on household_invites from anon, authenticated;
grant update (status) on household_invites to authenticated;

-- =============================================================================
-- ROLLBACK — restores 00039 behaviour, including every defect described above.
--
-- drop policy if exists "household_invites_recipient_accept" on household_invites;
-- drop policy if exists "household_invites_recipient_select" on household_invites;
-- grant update on household_invites to authenticated;
--
-- grant update on household_members to authenticated;
--
-- drop policy if exists "household_members_insert_self" on household_members;
-- create policy "household_members_insert_self"
--   on household_members for insert
--   with check (user_id = (select auth.uid()));
--
-- drop function if exists public.household_join_allowed(uuid, text);
-- =============================================================================
