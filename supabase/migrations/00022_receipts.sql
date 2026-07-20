-- =============================================================================
-- 00022_receipts.sql — partner-side receipt verification (B2B v1). Apply after 00021.
--
-- The consumer share system (score_shares + get_shared_assessment) is the
-- consumer-authorized "readiness receipt" the landing page sells. This adds the
-- verifying side:
--   • partner_api_keys — one hashed API key per partner org. Only the SHA-256
--     hash is stored; the plaintext key is shown once at mint time (mint happens
--     operator-side for v1 — no self-serve key UI yet).
--   • receipt_verifications — audit log of every verification. Deliberately
--     consumer-visible: the share owner can SELECT verifications of their own
--     shares ("Coastal Realty verified your receipt") — a trust surface, a
--     tamper alarm, and renewal-time proof of partner usage, in one table.
--
-- FCRA-conscious design (see LAUNCH-RUNBOOK.md): verification is strictly
-- consumer-initiated — a partner can only verify a token a consumer handed
-- them; there is no lookup by person, and receipts carry verdict/pillar bands
-- only, never underlying financial data.
-- =============================================================================

create table if not exists partner_api_keys (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  org_name text,
  key_hash text unique not null,
  created_by uuid references profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);

alter table partner_api_keys enable row level security;
alter table partner_api_keys force row level security;

grant select, insert, update on partner_api_keys to service_role;

create table if not exists receipt_verifications (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references score_shares (id) on delete cascade,
  partner_key_id uuid not null references partner_api_keys (id) on delete cascade,
  verified_at timestamptz not null default now(),
  ip text
);

create index if not exists idx_receipt_verifications_share on receipt_verifications (share_id);

alter table receipt_verifications enable row level security;
alter table receipt_verifications force row level security;

-- Consumers may see verifications of shares they created (trust surface).
-- Writes happen only through the service-role verification route.
drop policy if exists "receipt_verifications_owner_select" on receipt_verifications;
create policy "receipt_verifications_owner_select"
  on receipt_verifications for select
  to authenticated
  using (
    exists (
      select 1 from score_shares s
      where s.id = share_id
        and s.created_by = (select auth.uid())
    )
  );

grant select, insert on receipt_verifications to service_role;

-- ROLLBACK:
-- drop table if exists receipt_verifications;
-- drop table if exists partner_api_keys;
