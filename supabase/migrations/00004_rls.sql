-- =============================================================================
-- 00004_rls.sql — Row Level Security
-- Enables RLS + FORCE where appropriate, and defines least-privilege policies.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- is_admin() — SECURITY DEFINER helper to avoid recursive RLS on profiles.
-- ---------------------------------------------------------------------------
create or replace function is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS on every table.
-- ---------------------------------------------------------------------------
alter table profiles enable row level security;
alter table assessments enable row level security;
alter table question_bank enable row level security;
alter table decision_journal enable row level security;
alter table daily_checkins enable row level security;
alter table advisor_conversations enable row level security;
alter table advisor_messages enable row level security;
alter table organizations enable row level security;
alter table organization_members enable row level security;
alter table score_shares enable row level security;
alter table waitlist enable row level security;
alter table audit_log enable row level security;

-- FORCE RLS so table owners are also subject to policies (defense in depth).
alter table profiles force row level security;
alter table assessments force row level security;
alter table decision_journal force row level security;
alter table daily_checkins force row level security;
alter table advisor_conversations force row level security;
alter table advisor_messages force row level security;
alter table score_shares force row level security;
alter table waitlist force row level security;
alter table audit_log force row level security;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own"
  on profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_admin_select_all" on profiles;
create policy "profiles_admin_select_all"
  on profiles for select
  using (is_admin());

-- ---------------------------------------------------------------------------
-- assessments — owner full CRUD, admin read
-- ---------------------------------------------------------------------------
drop policy if exists "assessments_owner_select" on assessments;
create policy "assessments_owner_select"
  on assessments for select
  using (auth.uid() = user_id);

drop policy if exists "assessments_owner_insert" on assessments;
create policy "assessments_owner_insert"
  on assessments for insert
  with check (auth.uid() = user_id);

drop policy if exists "assessments_owner_update" on assessments;
create policy "assessments_owner_update"
  on assessments for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "assessments_owner_delete" on assessments;
create policy "assessments_owner_delete"
  on assessments for delete
  using (auth.uid() = user_id);

drop policy if exists "assessments_admin_select" on assessments;
create policy "assessments_admin_select"
  on assessments for select
  using (is_admin());

-- ---------------------------------------------------------------------------
-- question_bank — public read (anon + authenticated)
-- ---------------------------------------------------------------------------
drop policy if exists "question_bank_public_select" on question_bank;
create policy "question_bank_public_select"
  on question_bank for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- decision_journal — owner full CRUD
-- ---------------------------------------------------------------------------
drop policy if exists "decision_journal_owner_select" on decision_journal;
create policy "decision_journal_owner_select"
  on decision_journal for select
  using (auth.uid() = user_id);

drop policy if exists "decision_journal_owner_insert" on decision_journal;
create policy "decision_journal_owner_insert"
  on decision_journal for insert
  with check (auth.uid() = user_id);

drop policy if exists "decision_journal_owner_update" on decision_journal;
create policy "decision_journal_owner_update"
  on decision_journal for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "decision_journal_owner_delete" on decision_journal;
create policy "decision_journal_owner_delete"
  on decision_journal for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- daily_checkins — owner full CRUD
-- ---------------------------------------------------------------------------
drop policy if exists "daily_checkins_owner_select" on daily_checkins;
create policy "daily_checkins_owner_select"
  on daily_checkins for select
  using (auth.uid() = user_id);

drop policy if exists "daily_checkins_owner_insert" on daily_checkins;
create policy "daily_checkins_owner_insert"
  on daily_checkins for insert
  with check (auth.uid() = user_id);

drop policy if exists "daily_checkins_owner_update" on daily_checkins;
create policy "daily_checkins_owner_update"
  on daily_checkins for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "daily_checkins_owner_delete" on daily_checkins;
create policy "daily_checkins_owner_delete"
  on daily_checkins for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- advisor_conversations — owner full CRUD
-- ---------------------------------------------------------------------------
drop policy if exists "advisor_conversations_owner_select" on advisor_conversations;
create policy "advisor_conversations_owner_select"
  on advisor_conversations for select
  using (auth.uid() = user_id);

drop policy if exists "advisor_conversations_owner_insert" on advisor_conversations;
create policy "advisor_conversations_owner_insert"
  on advisor_conversations for insert
  with check (auth.uid() = user_id);

drop policy if exists "advisor_conversations_owner_update" on advisor_conversations;
create policy "advisor_conversations_owner_update"
  on advisor_conversations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "advisor_conversations_owner_delete" on advisor_conversations;
create policy "advisor_conversations_owner_delete"
  on advisor_conversations for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- advisor_messages — access via conversation ownership
-- ---------------------------------------------------------------------------
drop policy if exists "advisor_messages_owner_select" on advisor_messages;
create policy "advisor_messages_owner_select"
  on advisor_messages for select
  using (
    exists (
      select 1 from advisor_conversations c
      where c.id = advisor_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "advisor_messages_owner_insert" on advisor_messages;
create policy "advisor_messages_owner_insert"
  on advisor_messages for insert
  with check (
    exists (
      select 1 from advisor_conversations c
      where c.id = advisor_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "advisor_messages_owner_update" on advisor_messages;
create policy "advisor_messages_owner_update"
  on advisor_messages for update
  using (
    exists (
      select 1 from advisor_conversations c
      where c.id = advisor_messages.conversation_id
        and c.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from advisor_conversations c
      where c.id = advisor_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

drop policy if exists "advisor_messages_owner_delete" on advisor_messages;
create policy "advisor_messages_owner_delete"
  on advisor_messages for delete
  using (
    exists (
      select 1 from advisor_conversations c
      where c.id = advisor_messages.conversation_id
        and c.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- organizations / organization_members — readable by members
-- ---------------------------------------------------------------------------
drop policy if exists "organizations_member_select" on organizations;
create policy "organizations_member_select"
  on organizations for select
  using (
    exists (
      select 1 from organization_members m
      where m.organization_id = organizations.id
        and m.profile_id = auth.uid()
    )
  );

drop policy if exists "organizations_admin_select" on organizations;
create policy "organizations_admin_select"
  on organizations for select
  using (is_admin());

drop policy if exists "organization_members_member_select" on organization_members;
create policy "organization_members_member_select"
  on organization_members for select
  using (
    exists (
      select 1 from organization_members m
      where m.organization_id = organization_members.organization_id
        and m.profile_id = auth.uid()
    )
  );

drop policy if exists "organization_members_admin_select" on organization_members;
create policy "organization_members_admin_select"
  on organization_members for select
  using (is_admin());

-- ---------------------------------------------------------------------------
-- score_shares — readable/insertable by owner (created_by)
-- ---------------------------------------------------------------------------
drop policy if exists "score_shares_owner_select" on score_shares;
create policy "score_shares_owner_select"
  on score_shares for select
  using (auth.uid() = created_by);

drop policy if exists "score_shares_owner_insert" on score_shares;
create policy "score_shares_owner_insert"
  on score_shares for insert
  with check (auth.uid() = created_by);

drop policy if exists "score_shares_owner_update" on score_shares;
create policy "score_shares_owner_update"
  on score_shares for update
  using (auth.uid() = created_by)
  with check (auth.uid() = created_by);

drop policy if exists "score_shares_owner_delete" on score_shares;
create policy "score_shares_owner_delete"
  on score_shares for delete
  using (auth.uid() = created_by);

-- ---------------------------------------------------------------------------
-- waitlist — anon insert allowed, no anon select; admin read
-- ---------------------------------------------------------------------------
drop policy if exists "waitlist_anon_insert" on waitlist;
create policy "waitlist_anon_insert"
  on waitlist for insert
  to anon, authenticated
  with check (true);

drop policy if exists "waitlist_admin_select" on waitlist;
create policy "waitlist_admin_select"
  on waitlist for select
  using (is_admin());

-- ---------------------------------------------------------------------------
-- audit_log — insert by authenticated, select admin only
-- ---------------------------------------------------------------------------
drop policy if exists "audit_log_authenticated_insert" on audit_log;
create policy "audit_log_authenticated_insert"
  on audit_log for insert
  to authenticated
  with check (true);

drop policy if exists "audit_log_admin_select" on audit_log;
create policy "audit_log_admin_select"
  on audit_log for select
  using (is_admin());
