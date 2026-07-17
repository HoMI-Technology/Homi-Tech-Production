-- =============================================================================
-- 00020_profiles_column_grants.sql — close the profiles self-service
-- privilege escalation. Apply after 00019_profile_email_prefs.
--
-- The `profiles_update_own` RLS policy correctly restricts WHICH ROWS a user
-- may update (their own), but said nothing about WHICH COLUMNS. Because
-- `authenticated` held a table-wide UPDATE grant, any signed-in user could
-- PATCH their own row through PostgREST and set `role = 'admin'` (full admin
-- panel + paywall bypass) or `subscription_tier = 'family'` (free paid plan).
--
-- Fix: RLS keeps deciding rows; column-level grants now decide columns.
-- `authenticated` may update only the user-owned display/preference fields.
-- Everything privileged (role, subscription_tier, subscription_status,
-- stripe_customer_id, partner_id, email, lifecycle-email bookkeeping) is
-- writable only via the service role (Stripe webhook, cron, ops scripts),
-- which is unaffected by these grants.
--
-- `updated_at` stays grantable because components/settings/ProfileSection.tsx
-- includes it in its update payload (the set_updated_at trigger would maintain
-- it regardless).
-- =============================================================================

revoke insert, update, delete on public.profiles from anon, authenticated;

grant update (full_name, avatar_url, onboarding_completed, email_reminders_enabled, updated_at)
  on public.profiles to authenticated;

-- profiles rows are created only by the on_auth_user_created trigger
-- (SECURITY DEFINER, owner postgres) and deleted only via the auth.users
-- cascade / service role — neither needs table grants for anon/authenticated.

-- ROLLBACK:
-- grant insert, update, delete on public.profiles to authenticated;
