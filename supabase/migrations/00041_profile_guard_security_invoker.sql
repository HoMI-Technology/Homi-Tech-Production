-- =============================================================================
-- 00041_profile_guard_security_invoker.sql — make the profiles privileged-column
-- guard actually enforce. It has never blocked anything in production.
--
-- THE BUG (verified against production 2026-08-01):
--   guard_profiles_privileged_columns() is SECURITY DEFINER and owned by
--   `postgres`. Inside a SECURITY DEFINER function `current_user` is the
--   FUNCTION OWNER, not the caller. The body's first branch is
--
--       if current_user in ('service_role','postgres','supabase_admin',
--                           'supabase_auth_admin') then return new; end if;
--
--   `postgres` is in that list, so the guard returned `new` unconditionally for
--   every caller — end users included. The trigger fired on every UPDATE and
--   then waved it through. This has been true since 00020a installed it; the
--   `email` clause added by 00040 inherited the same dead code path.
--
-- IMPACT: profiles_update_own places no column restriction on self-updates, so
--   an authenticated user could rewrite their own row's `role` (→ 'admin'),
--   `subscription_tier`, `subscription_status`, `stripe_customer_id` and
--   `email`. Privilege escalation and paid-tier self-grant, not merely the mail
--   redirect that 00040 was written for.
--
-- EVIDENCE: transaction-scoped probe against prod, rolled back — as role
--   `authenticated` with request.jwt.claims.sub set to the row's own id, both
--   `update profiles set email = ...` and `set stripe_customer_id = ...`
--   returned "rows updated: 1" with no exception.
--
-- THE FIX: SECURITY INVOKER. The body reads only NEW/OLD and calls is_admin();
--   it needs no owner privileges. Under invoker rights `current_user` is the
--   caller's effective role — 'authenticated' for end users, 'service_role' for
--   the Stripe webhook and crons, 'postgres' for dashboard SQL and migrations —
--   which is precisely what the allowlist was written to test.
--
--   is_admin() stays SECURITY DEFINER (it reads `profiles` and must work for a
--   caller whose RLS would otherwise hide rows). `authenticated` already holds
--   EXECUTE on it, so the admin branch keeps working.
--
-- VERIFIED (all four paths, transaction-scoped and rolled back, before apply):
--   authenticated → email                → blocked, SQLSTATE 42501
--   authenticated → stripe_customer_id   → blocked, SQLSTATE 42501
--   authenticated → full_name (benign)   → allowed, 1 row   (no regression)
--   service_role  → email (cron path)    → allowed, 1 row   (no regression)
--   admin self    → subscription_tier    → allowed, 1 row   (is_admin branch OK)
--   admin self    → email                → allowed, 1 row
--
-- ROLLBACK: re-run this body with `security definer` instead of
--   `security invoker`. Be aware that restores the bypass — in DEFINER mode the
--   guard is inert, which is the defect this file exists to fix.
-- =============================================================================

create or replace function public.guard_profiles_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  -- Platform / service contexts: Stripe webhook + ops scripts (service_role),
  -- dashboard SQL / migrations (postgres, supabase_admin), auth provisioning.
  if current_user in ('service_role', 'postgres', 'supabase_admin', 'supabase_auth_admin') then
    return new;
  end if;

  -- Application admins may manage roles/tiers through the product UI.
  if is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.subscription_tier is distinct from old.subscription_tier
     or new.subscription_status is distinct from old.subscription_status
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.email is distinct from old.email then
    raise exception 'profiles: role, subscription, billing and email columns can only be changed by the service role or an admin'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return new;
end;
$$;
