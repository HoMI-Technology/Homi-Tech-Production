-- =============================================================================
-- 00021_shadow_shares.sql — anonymous Shadow Score share cards. Apply after 00020.
--
-- The anonymous top-of-funnel (shadow score) previously dead-ended at /results.
-- A shadow share is a server-recomputed, token-addressed snapshot that powers
-- the public share page + its dynamic OG card:
--   • Score/verdict/pillars are computed by the canonical engine server-side at
--     creation from raw inputs — the row never stores inputs, so a share can
--     never leak self-reported financial answers.
--   • reveal_score: the share defaults to a "journey card" (pillar shape +
--     direction). The numeric score renders only when the creator opted in —
--     unflattering numbers forced onto cards are anti-viral and anti-user.
--   • 30-day expiry; rows are unreferenced by user identity (anonymous flow).
--
-- RLS enabled + forced, NO anon/authenticated policies: creation and reads go
-- through the service-role client in the API/page layer, which enforces token
-- lookup + expiry. 128-bit random tokens make enumeration infeasible.
-- =============================================================================

create table if not exists shadow_shares (
  id uuid primary key default gen_random_uuid(),
  token text unique not null default encode(gen_random_bytes(16), 'hex'),
  score integer not null check (score between 0 and 100),
  verdict text not null check (verdict in ('READY', 'ALMOST_THERE', 'BUILD_FIRST', 'NOT_YET')),
  -- Pillar attainment as 0-100 percentages of each pillar's max points.
  financial_pct integer not null check (financial_pct between 0 and 100),
  emotional_pct integer not null check (emotional_pct between 0 and 100),
  timing_pct integer not null check (timing_pct between 0 and 100),
  reveal_score boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

alter table shadow_shares enable row level security;
alter table shadow_shares force row level security;

grant select, insert on shadow_shares to service_role;

-- ROLLBACK:
-- drop table if exists shadow_shares;
