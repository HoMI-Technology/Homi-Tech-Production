-- =============================================================================
-- 20260812200000_post_performance_log.sql — social post performance ledger
--
-- The missing half of the marketing agency suite: the studio writes posts and
-- stamps UTM links, but nothing recorded what those posts actually did. This
-- table is the manual bridge — an admin logs each published post with the
-- campaign it carried, then /admin/marketing joins the entered impressions and
-- clicks against attributed assessment completions.
--
-- Manual entry on purpose. LinkedIn/X/Instagram analytics are not available
-- through an API on the plans HōMI runs, so a paste-in row beats a missing
-- number. post_snippet is capped at the first 120 characters of the copy: it
-- exists to recognise the row, not to re-store the post.
--
-- Admin-only, all operations. is_admin() (00004) is SECURITY DEFINER + STABLE
-- so the policy does not recurse through profiles RLS — the equivalent inline
-- `exists (select 1 from profiles …)` predicate would.
-- Idempotent: safe to re-run against an existing database.
-- =============================================================================

create table if not exists post_performance_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  platform text not null,
  utm_campaign text not null,
  utm_source text not null,
  post_snippet text not null,
  posted_at date not null,
  impressions integer check (impressions is null or impressions >= 0),
  clicks integer check (clicks is null or clicks >= 0),
  completions integer check (completions is null or completions >= 0),
  notes text,
  user_id uuid references auth.users (id) on delete set null
);

create index if not exists idx_post_performance_log_posted_at
  on post_performance_log (posted_at desc);
create index if not exists idx_post_performance_log_campaign
  on post_performance_log (utm_campaign);

alter table post_performance_log enable row level security;
alter table post_performance_log force row level security;

drop policy if exists post_performance_log_admin_all on post_performance_log;
create policy post_performance_log_admin_all on post_performance_log
  for all
  to authenticated
  using (is_admin())
  with check (is_admin());

-- Base table grants; the policy above is what actually restricts to admins.
grant select, insert, update, delete on post_performance_log to authenticated;
revoke all on post_performance_log from anon;

-- ROLLBACK:
-- drop table if exists post_performance_log;
