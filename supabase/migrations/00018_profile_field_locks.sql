-- =============================================================================
-- 00018_profile_field_locks.sql — privilege-escalation lock + outcome ownership.
-- apply after 00017_readiness_calibration.
--
-- CRITICAL (fleet audit): profiles_update_own (00009) checks only
-- id = auth.uid() with no column restriction, so any authenticated user could
--   update profiles set role = 'admin' where id = <self>
-- → self-grant admin (is_admin() true → read every user's data + admin panel),
--   or self-grant a paid subscription_tier, or overwrite stripe_customer_id.
-- There is no role-freeze in the post-reset schema. This adds a BEFORE UPDATE
-- trigger that forbids non-admin authenticated users from changing privileged
-- columns. The Stripe webhook writes these via the service-role client (no
-- auth.uid()), so it is exempt and billing keeps working; admins are exempt too.
--
-- Also: outcome_surveys WITH CHECK (00010) only scopes user_id, not ownership of
-- assessment_id — the same IDOR class fixed for shares in 00011. Tightened here.
-- =============================================================================

create or replace function enforce_profile_field_locks()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Server contexts (service role, e.g. the Stripe webhook) have no auth.uid();
  -- admins may manage these fields. Everyone else is locked out of them.
  if auth.uid() is null or is_admin() then
    return new;
  end if;

  if new.role is distinct from old.role
     or new.subscription_tier is distinct from old.subscription_tier
     or new.subscription_status is distinct from old.subscription_status
     or new.stripe_customer_id is distinct from old.stripe_customer_id
     or new.email is distinct from old.email then
    raise exception 'Not authorized to modify account role, subscription, or billing fields';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_profile_field_locks on profiles;
create trigger trg_enforce_profile_field_locks
  before update on profiles
  for each row execute function enforce_profile_field_locks();

-- ── outcome_surveys assessment ownership (IDOR class, mirrors 00011) ─────────
drop policy if exists "outcome_surveys_owner_all" on outcome_surveys;
create policy "outcome_surveys_owner_all"
  on outcome_surveys for all
  to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      assessment_id is null
      or exists (
        select 1 from assessments a
        where a.id = outcome_surveys.assessment_id
          and a.user_id = (select auth.uid())
      )
    )
  );

-- ROLLBACK:
-- drop trigger if exists trg_enforce_profile_field_locks on profiles;
-- drop function if exists enforce_profile_field_locks();
-- (restore prior outcome_surveys_owner_all from 00010 if needed)
