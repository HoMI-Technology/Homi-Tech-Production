-- =============================================================================
-- 00009_security_perf_hardening.sql
-- Response to Supabase security + performance advisors (2026-07-06):
--   • touch_updated_at(): pin search_path (mutable-search-path lint)
--   • handle_new_user(): revoke RPC execution — it is trigger-only
--   • is_admin(): revoke from anon/public; admin policies scoped to
--     authenticated so anon never evaluates it
--   • All owner policies rewritten with (select auth.uid()) so Postgres
--     evaluates the auth lookup once per statement, not once per row
--     (auth_rls_initplan lint, 30 occurrences)
--   • Owner + admin SELECT policies merged into single policies
--     (multiple_permissive_policies lint, 24 occurrences)
--   • audit_log INSERT restricted to the caller's own user_id
--   • Covering indexes for 6 unindexed foreign keys
-- get_shared_assessment intentionally remains anon-executable: public score
-- shares are its purpose; rows are keyed by an unguessable 32-hex token and
-- the function exposes only non-sensitive fields.
-- =============================================================================

-- ── Function hardening ───────────────────────────────────────────────
create or replace function touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke execute on function handle_new_user() from public, anon, authenticated;
revoke execute on function is_admin() from public, anon;
grant execute on function is_admin() to authenticated;

-- ── profiles ─────────────────────────────────────────────────────────
drop policy if exists "profiles_select_own" on profiles;
drop policy if exists "profiles_admin_select_all" on profiles;
drop policy if exists "profiles_update_own" on profiles;

create policy "profiles_select"
  on profiles for select
  to authenticated
  using (id = (select auth.uid()) or is_admin());

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ── assessments ──────────────────────────────────────────────────────
drop policy if exists "assessments_owner_select" on assessments;
drop policy if exists "assessments_admin_select" on assessments;
drop policy if exists "assessments_owner_insert" on assessments;
drop policy if exists "assessments_owner_update" on assessments;
drop policy if exists "assessments_owner_delete" on assessments;

create policy "assessments_select"
  on assessments for select
  to authenticated
  using (user_id = (select auth.uid()) or is_admin());

create policy "assessments_owner_insert"
  on assessments for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "assessments_owner_update"
  on assessments for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "assessments_owner_delete"
  on assessments for delete
  to authenticated
  using (user_id = (select auth.uid()));

-- ── decision_journal ─────────────────────────────────────────────────
drop policy if exists "decision_journal_owner_select" on decision_journal;
drop policy if exists "decision_journal_owner_insert" on decision_journal;
drop policy if exists "decision_journal_owner_update" on decision_journal;
drop policy if exists "decision_journal_owner_delete" on decision_journal;

create policy "decision_journal_owner_all"
  on decision_journal for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── daily_checkins ───────────────────────────────────────────────────
drop policy if exists "daily_checkins_owner_select" on daily_checkins;
drop policy if exists "daily_checkins_owner_insert" on daily_checkins;
drop policy if exists "daily_checkins_owner_update" on daily_checkins;
drop policy if exists "daily_checkins_owner_delete" on daily_checkins;

create policy "daily_checkins_owner_all"
  on daily_checkins for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── advisor_conversations ────────────────────────────────────────────
drop policy if exists "advisor_conversations_owner_select" on advisor_conversations;
drop policy if exists "advisor_conversations_owner_insert" on advisor_conversations;
drop policy if exists "advisor_conversations_owner_update" on advisor_conversations;
drop policy if exists "advisor_conversations_owner_delete" on advisor_conversations;

create policy "advisor_conversations_owner_all"
  on advisor_conversations for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── advisor_messages ─────────────────────────────────────────────────
drop policy if exists "advisor_messages_owner_select" on advisor_messages;
drop policy if exists "advisor_messages_owner_insert" on advisor_messages;
drop policy if exists "advisor_messages_owner_update" on advisor_messages;
drop policy if exists "advisor_messages_owner_delete" on advisor_messages;

create policy "advisor_messages_owner_all"
  on advisor_messages for all
  to authenticated
  using (
    exists (
      select 1 from advisor_conversations c
      where c.id = advisor_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from advisor_conversations c
      where c.id = advisor_messages.conversation_id
        and c.user_id = (select auth.uid())
    )
  );

-- ── organizations / organization_members ────────────────────────────
drop policy if exists "organizations_member_select" on organizations;
drop policy if exists "organizations_admin_select" on organizations;

create policy "organizations_select"
  on organizations for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1 from organization_members m
      where m.organization_id = organizations.id
        and m.profile_id = (select auth.uid())
    )
  );

drop policy if exists "organization_members_member_select" on organization_members;
drop policy if exists "organization_members_admin_select" on organization_members;

create policy "organization_members_select"
  on organization_members for select
  to authenticated
  using (
    is_admin()
    or exists (
      select 1 from organization_members m
      where m.organization_id = organization_members.organization_id
        and m.profile_id = (select auth.uid())
    )
  );

-- ── score_shares ─────────────────────────────────────────────────────
drop policy if exists "score_shares_owner_select" on score_shares;
drop policy if exists "score_shares_owner_insert" on score_shares;
drop policy if exists "score_shares_owner_update" on score_shares;
drop policy if exists "score_shares_owner_delete" on score_shares;

create policy "score_shares_owner_all"
  on score_shares for all
  to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));

-- ── waitlist ─────────────────────────────────────────────────────────
drop policy if exists "waitlist_anon_insert" on waitlist;
drop policy if exists "waitlist_admin_select" on waitlist;

-- Public inserts are the point of a waitlist; constrain what can be written.
create policy "waitlist_public_insert"
  on waitlist for insert
  to anon, authenticated
  with check (status = 'pending' and position('@' in email) > 1);

create policy "waitlist_admin_select"
  on waitlist for select
  to authenticated
  using (is_admin());

-- ── audit_log ────────────────────────────────────────────────────────
drop policy if exists "audit_log_authenticated_insert" on audit_log;
drop policy if exists "audit_log_admin_select" on audit_log;

create policy "audit_log_insert_own"
  on audit_log for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy "audit_log_admin_select"
  on audit_log for select
  to authenticated
  using (is_admin());

-- ── family_accounts / calendar_events ────────────────────────────────
drop policy if exists "family_accounts_owner_all" on family_accounts;
create policy "family_accounts_owner_all"
  on family_accounts for all
  to authenticated
  using (primary_user_id = (select auth.uid()))
  with check (primary_user_id = (select auth.uid()));

drop policy if exists "calendar_events_owner_all" on calendar_events;
create policy "calendar_events_owner_all"
  on calendar_events for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ── Covering indexes for unindexed foreign keys ──────────────────────
create index if not exists idx_advisor_conversations_user
  on advisor_conversations (user_id);
create index if not exists idx_advisor_conversations_assessment
  on advisor_conversations (assessment_id);
create index if not exists idx_organization_members_profile
  on organization_members (profile_id);
create index if not exists idx_profiles_partner
  on profiles (partner_id);
create index if not exists idx_score_shares_assessment
  on score_shares (assessment_id);
create index if not exists idx_score_shares_created_by
  on score_shares (created_by);