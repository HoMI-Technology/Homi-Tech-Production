-- Partner receipts: audience bind + hosted share sessions.
-- Public /share HTML stays on get_shared_assessment; partner GET requires audience.

alter table score_shares
  add column if not exists audience_partner_key_id uuid references partner_api_keys (id) on delete set null;

create index if not exists idx_score_shares_audience
  on score_shares (audience_partner_key_id)
  where audience_partner_key_id is not null;

create table if not exists share_sessions (
  id uuid primary key default gen_random_uuid(),
  partner_key_id uuid not null references partner_api_keys (id) on delete cascade,
  purpose text not null default 'educational_guidance',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table share_sessions enable row level security;
alter table share_sessions force row level security;

grant select, insert on share_sessions to service_role;

-- ROLLBACK:
-- drop table if exists share_sessions;
-- alter table score_shares drop column if exists audience_partner_key_id;
