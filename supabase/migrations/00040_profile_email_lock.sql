-- =============================================================================
-- 00040_profile_email_lock.sql — add `email` to the profiles privileged-column
-- guard installed by 00020a_profiles_privilege_guard.sql.
--
-- ⚠ APPLIED 2026-08-01, BUT INERT ON ITS OWN. The guard this file extends never
-- enforced anything: it is SECURITY DEFINER owned by `postgres`, so inside the
-- body `current_user` is the owner, which matches the service-context allowlist
-- and returns `new` for every caller. The `email` clause below landed in that
-- dead path. 00041_profile_guard_security_invoker.sql switches the function to
-- SECURITY INVOKER and is what actually makes this — and the role/subscription
-- locks from 00020a — take effect. 00041 was applied 2026-08-01; this lock is
-- enforcing as of then, not as of this file.
--
-- WHY (verified against production 2026-07-28):
--   The live guard `guard_profiles_privileged_columns()` locks role,
--   subscription_tier, subscription_status and stripe_customer_id — but not
--   `email`. profiles.email is a *send target*, not a display field:
--     • lib/email/campaign.ts  → selects profiles.email to build campaign lists
--     • app/api/cron/reassessment/route.ts     → selects profiles.email to send
--     • app/api/cron/outcome-surveys/route.ts  → selects profiles.email to send
--   profiles_update_own places no column restriction on self-updates, so an
--   authenticated user could rewrite their own profiles.email to an address
--   they do not control and have HōMI deliver their mail there. Locking the
--   column closes that relay vector and keeps profiles.email consistent with
--   auth.users.email, which is changed through the Supabase auth flow.
--
-- WHY NOT 00034_profile_field_locks.sql:
--   That file predates this and installs a *second* BEFORE UPDATE trigger doing
--   the same job, with a weaker service-context test (`auth.uid() is null`
--   rather than an explicit current_user allowlist). Its outcome_surveys policy
--   change is already live. It is superseded — see its amended header.
--
-- SAFETY: no application code updates or upserts profiles.email (verified by
--   grep over *.ts/*.tsx), so nothing legitimate starts failing. service_role
--   (Stripe webhook, cron, ops scripts) and is_admin() callers stay exempt.
--
-- This is a create-or-replace of the existing function body — the trigger
-- created in 00020a is left in place and simply picks up the new definition.
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
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.email is distinct from old.email then
    raise exception 'profiles: role, subscription, billing and email columns can only be changed by the service role or an admin'
      using errcode = '42501'; -- insufficient_privilege
  end if;

  return new;
end;
$$;

-- ROLLBACK: re-run the function body from
-- 00020a_profiles_privilege_guard.sql (identical minus the `new.email` clause
-- and with the original exception message). The trigger itself needs no change.
