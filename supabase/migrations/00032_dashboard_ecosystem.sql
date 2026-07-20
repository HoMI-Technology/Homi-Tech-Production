-- =============================================================================
-- 00032_dashboard_ecosystem.sql
-- Partner / employer / org denormalized fields, genome hardening, payments,
-- partner + org assessment read policies.
--
-- Numbering: 00024–00031 already used in this repo. Spec names 00024–00026
-- are intentional renumbers to the next free migration id.
--
-- Reality check (live schema):
--   • profiles.partner_id already exists (uuid → profiles) from 00002
--   • behavioral_genome already exists (jsonb answers/scores) from 00017
--   • attribution jsonb + partner_codes from 00026 / 00031
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A · profiles employer / org pointers
-- ---------------------------------------------------------------------------
alter table profiles
  add column if not exists employer_id uuid references organizations (id) on delete set null,
  add column if not exists organization_id uuid references organizations (id) on delete set null;

create index if not exists idx_profiles_employer_id
  on profiles (employer_id) where employer_id is not null;

create index if not exists idx_profiles_organization_id
  on profiles (organization_id) where organization_id is not null;

-- ---------------------------------------------------------------------------
-- A · assessments referral + org (complement attribution jsonb)
-- ---------------------------------------------------------------------------
alter table assessments
  add column if not exists referral_source text,
  add column if not exists organization_id uuid references organizations (id) on delete set null;

create index if not exists idx_assessments_referral_source
  on assessments (referral_source) where referral_source is not null;

create index if not exists idx_assessments_organization_id
  on assessments (organization_id) where organization_id is not null;

-- ---------------------------------------------------------------------------
-- B · behavioral_genome hardening (table already exists)
-- ---------------------------------------------------------------------------
alter table behavioral_genome
  add column if not exists assessment_id uuid references assessments (id) on delete set null;

create unique index if not exists idx_behavioral_genome_user_id_unique
  on behavioral_genome (user_id);

alter table behavioral_genome enable row level security;
alter table behavioral_genome force row level security;

-- ---------------------------------------------------------------------------
-- C · payments (Stripe revenue analytics)
-- ---------------------------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles (id) on delete set null,
  stripe_payment_intent_id text unique,
  amount int not null check (amount > 0), -- cents
  currency text not null default 'usd',
  status text not null default 'succeeded'
    check (status in ('succeeded', 'pending', 'failed', 'refunded')),
  description text,
  created_at timestamptz not null default now()
);

alter table payments enable row level security;
alter table payments force row level security;

drop policy if exists "payments_owner_select" on payments;
create policy "payments_owner_select"
  on payments for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "payments_admin_select" on payments;
create policy "payments_admin_select"
  on payments for select
  to authenticated
  using (is_admin());

revoke insert, update, delete on payments from anon, authenticated;
grant select on payments to authenticated;
grant all on payments to service_role;

create index if not exists idx_payments_created_at_status
  on payments (created_at, status)
  where status = 'succeeded';

-- ---------------------------------------------------------------------------
-- Partner can read referred clients' assessments (no PII beyond readiness)
-- ---------------------------------------------------------------------------
drop policy if exists "assessments_partner_select" on assessments;
create policy "assessments_partner_select"
  on assessments for select
  to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = assessments.user_id
        and p.partner_id = (select auth.uid())
    )
  );

-- Org members can read teammate assessments (de-identified cohort UIs)
drop policy if exists "assessments_org_member_select" on assessments;
create policy "assessments_org_member_select"
  on assessments for select
  to authenticated
  using (
    exists (
      select 1 from organization_members om
      where om.profile_id = assessments.user_id
        and om.organization_id in (
          select organization_id
          from organization_members
          where profile_id = (select auth.uid())
        )
    )
  );

-- ROLLBACK (manual):
-- drop policy if exists "assessments_org_member_select" on assessments;
-- drop policy if exists "assessments_partner_select" on assessments;
-- drop table if exists payments;
-- alter table assessments drop column if exists referral_source;
-- alter table assessments drop column if exists organization_id;
-- alter table profiles drop column if exists employer_id;
-- alter table profiles drop column if exists organization_id;
