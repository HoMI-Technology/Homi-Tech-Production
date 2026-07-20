-- =============================================================================
-- 00019_attribution.sql — first-touch acquisition attribution. Apply after 00018.
--
-- Launch prerequisite: without attribution, no channel (partner links, UTM
-- campaigns, share cards) can be measured, and the partner portal's promise
-- ("every assessment they take is tagged to your partner account") is not yet
-- true. This migration makes it true:
--   • profiles.attribution / assessments.attribution — first-touch snapshot
--     ({ref, utm_source, utm_medium, utm_campaign, landing, at}) stamped
--     server-side from the attribution cookie at signup / assessment save.
--     Occurrence data only — never scores, answers, or PII beyond the ids the
--     row already carries.
--   • partner_codes — one stable invite code per partner account, so invite
--     links become /shadow-score?ref=ptr_<code> instead of a shared static ref.
-- =============================================================================

alter table profiles add column if not exists attribution jsonb;
alter table assessments add column if not exists attribution jsonb;

-- Partner-scoped stats filter on the ref value inside the jsonb snapshot.
create index if not exists idx_assessments_attribution_ref
  on assessments ((attribution ->> 'ref'));

create table if not exists partner_codes (
  code text primary key check (code ~ '^ptr_[a-z0-9]{8}$'),
  partner_user_id uuid not null unique references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table partner_codes enable row level security;
alter table partner_codes force row level security;

-- A partner (or admin) may read and create their own code; codes are
-- immutable once minted (no update/delete policies).
drop policy if exists "partner_codes_owner_select" on partner_codes;
create policy "partner_codes_owner_select"
  on partner_codes for select
  to authenticated
  using (partner_user_id = (select auth.uid()));

drop policy if exists "partner_codes_owner_insert" on partner_codes;
create policy "partner_codes_owner_insert"
  on partner_codes for insert
  to authenticated
  with check (
    partner_user_id = (select auth.uid())
    and exists (
      select 1 from profiles p
      where p.id = (select auth.uid())
        and p.role in ('partner', 'admin')
    )
  );

-- ROLLBACK:
-- drop table if exists partner_codes;
-- drop index if exists idx_assessments_attribution_ref;
-- alter table assessments drop column if exists attribution;
-- alter table profiles drop column if exists attribution;
