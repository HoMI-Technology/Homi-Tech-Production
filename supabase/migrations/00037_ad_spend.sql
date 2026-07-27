-- =============================================================================
-- 00036_ad_spend.sql — manual paid-media spend ledger. Apply after 00035.
--
-- The connective tissue for CAC/ROAS: no external tool holds HōMI's ad spend
-- until it is entered here. An admin logs weekly/daily spend per channel (and
-- optionally per utm_campaign) in /admin/ad-spend; the growth dashboards then
-- join this against attributed signups (profiles.attribution channel) and
-- Stripe revenue (payments) to compute blended and per-channel CAC/ROAS.
--
-- Channel labels are free text so they can match the attribution channel
-- vocabulary (google, meta, referral, …). One row per (date, channel,
-- campaign); campaign defaults to '' so the uniqueness holds without NULL
-- skew. Admin-managed directly through the session client: RLS gates every
-- operation on is_admin() (00004), so no service-role round-trip is needed.
-- Idempotent: safe to re-run against an existing database.
-- =============================================================================

create table if not exists ad_spend (
  id uuid primary key default gen_random_uuid(),
  spend_date date not null,
  channel text not null,
  campaign text not null default '',
  spend_cents integer not null default 0 check (spend_cents >= 0),
  impressions integer not null default 0 check (impressions >= 0),
  clicks integer not null default 0 check (clicks >= 0),
  notes text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (spend_date, channel, campaign)
);

create index if not exists idx_ad_spend_date on ad_spend (spend_date desc);
create index if not exists idx_ad_spend_channel on ad_spend (channel);

-- Maintain updated_at via the generic trigger (00005).
drop trigger if exists set_updated_at on ad_spend;
create trigger set_updated_at
  before update on ad_spend
  for each row execute function touch_updated_at();

alter table ad_spend enable row level security;
alter table ad_spend force row level security;

-- Admin-only, all operations. is_admin() (00004) is SECURITY DEFINER + STABLE
-- so it doesn't recurse through profiles RLS.
drop policy if exists ad_spend_admin_all on ad_spend;
create policy ad_spend_admin_all on ad_spend
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Base table grants; the policy above is what actually restricts to admins.
grant select, insert, update, delete on ad_spend to authenticated;
revoke all on ad_spend from anon;

-- ROLLBACK:
-- drop table if exists ad_spend;
