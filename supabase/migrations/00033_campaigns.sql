-- =============================================================================
-- 00033_campaigns.sql — broadcast email campaigns. Apply after 00032.
--
-- Admin-authored broadcast mail (Module C): an admin composes a campaign in
-- /admin/email, confirms the resolved audience size, and the API route sends
-- via the Resend batch API honoring email_unsubscribes (00016). campaign_sends
-- is the per-recipient ledger — one row per resolved recipient with the final
-- delivery outcome — mirroring the email_sends (00027) ledger philosophy.
--
-- RLS enabled + forced with NO anon/authenticated policies — only the
-- service-role client (the admin campaigns API route, which bypasses RLS)
-- touches these tables, matching email_unsubscribes (00016) / email_sends
-- (00027). Admin reads happen server-side through that same route.
-- Idempotent: safe to re-run against an existing database.
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE campaign_audience AS ENUM ('waitlist', 'free', 'plus', 'pro', 'family', 'all');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE campaign_status AS ENUM ('draft', 'sending', 'sent');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subject text not null,
  html_body text not null,
  audience campaign_audience not null,
  status campaign_status not null default 'draft',
  created_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  recipient_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_campaigns_status on campaigns (status);
create index if not exists idx_campaigns_created on campaigns (created_at desc);

create table if not exists campaign_sends (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references campaigns (id) on delete cascade,
  email text not null,
  -- sent | failed | suppressed (skipped because the recipient opted out)
  status text not null,
  error text,
  sent_at timestamptz not null default now(),
  unique (campaign_id, email)
);

create index if not exists idx_campaign_sends_campaign on campaign_sends (campaign_id);

alter table campaigns enable row level security;
alter table campaigns force row level security;
alter table campaign_sends enable row level security;
alter table campaign_sends force row level security;

grant select, insert, update on campaigns to service_role;
grant select, insert on campaign_sends to service_role;

-- Forced RLS with no policies already denies anon/authenticated; revoke the
-- platform's default table grants too so the deny doesn't depend on RLS alone.
revoke all on campaigns from anon, authenticated;
revoke all on campaign_sends from anon, authenticated;

-- ROLLBACK:
-- drop table if exists campaign_sends;
-- drop table if exists campaigns;
-- drop type if exists campaign_status;
-- drop type if exists campaign_audience;
