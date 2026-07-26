-- =============================================================================
-- 00020_profiles_privilege_guard.sql — close the profiles self-service
-- privilege-escalation hole (flagged in PR #17's security note).
--
--   profiles_update_own (00004) allows an authenticated user to UPDATE their
--   own row with NO column restrictions — including `role`,
--   `subscription_tier`, `subscription_status`, and `stripe_customer_id`.
--   A single PostgREST call could therefore self-grant `role='admin'`
--   (unlocking is_admin() reads across every RLS policy and the /admin UI)
--   or a paid tier without paying.
--
--   Fix: a BEFORE UPDATE trigger that rejects changes to those four
--   privileged columns unless the caller is a privileged database role
--   (service_role — Stripe webhook, ops scripts — or the platform roles) or
--   an application admin (is_admin()). RLS policies stay untouched: benign
--   self-updates (full_name, avatar_url, onboarding_completed, partner_id,
--   email-pref columns) keep working exactly as before. Triggers fire even
--   for RLS-bypassing roles, hence the explicit current_user allowlist.
-- =============================================================================

create or replace function public.guard_profiles_privileged_columns()
returns trigger
language plpgsql
security definer
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
     or new.stripe_customer_id is distinct from old.stripe_customer_id then
    raise exception 'profiles: role/subscription columns can only be changed by the service role or an admin'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_privilege_guard on profiles;
create trigger profiles_privilege_guard
  before update on profiles
  for each row
  execute function public.guard_profiles_privileged_columns();

-- ROLLBACK:
-- drop trigger if exists profiles_privilege_guard on profiles;
-- drop function if exists public.guard_profiles_privileged_columns();
