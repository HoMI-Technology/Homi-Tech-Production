# Migration drift audit — production vs. `supabase/migrations/`

**Date:** 2026-07-28  
**Project:** `giyycykxkzfbowiapxpd` (us-east-2, Postgres 17.6)  
**Method:** object-existence probes against the live database (`information_schema`,
`pg_policies`, `pg_proc`, `pg_trigger`, `to_regclass`) — **not** the migration ledger.  
**Production database was not modified by this audit.**

> **Addendum 2026-08-01 — read this first.** `00040` was applied on 2026-08-01 and
> the schema conclusions below all held up. But applying it exposed a much larger
> problem this audit did not catch: **the guard function `00040` extends had never
> enforced anything.** It was `SECURITY DEFINER` owned by `postgres`, so its
> service-context allowlist matched its own owner and short-circuited for every
> caller. `role`, `subscription_tier`, `subscription_status`, `stripe_customer_id`
> and `email` were all self-writable by any authenticated user.
> **Closed 2026-08-01 by `00041_profile_guard_security_invoker.sql`, applied and
> verified by behaviour.** See **[The guard was inert](#the-guard-was-inert--2026-08-01)**
> at the bottom.

## Headline

**40 of 41 local migrations are fully applied.** One gap, one column wide, now closed
by `00040_profile_email_lock.sql` (written, not yet applied).

## Why the ledger can't be trusted here

`supabase_migrations.schema_migrations` holds ~130 rows. Reading it directly produces
false conclusions in three distinct ways:

1. **Pre-rebuild residue.** Everything before `20260706193938
   reset_public_schema_for_production_rebuild` belongs to the *old* app
   (`ai_memory`, `decision_journal`, `family_mode`, …). Those objects were dropped by
   the reset, but the ledger rows survive.
2. **Future-dated stale rows.** Versions like `20260801000001` and `20270502000003`
   sort *after* the reset but were applied *before* it. They describe objects that no
   longer exist.
3. **Double-entry.** Several files were recorded under both a short version and a
   timestamp version — e.g. `00036` **and** `20260727172301 00036_tool_scenarios`;
   `00037` **and** `20260727174202 ad_spend`. Name-matching alone double-counts them.

Local files also don't map 1:1 by name: `00017_bank_sync` is `bank_sync`,
`00020a` is `profiles_privilege_guard`, `00033_campaigns` is `homi_00033_campaigns`.

**Consequence:** any future drift check must probe objects, not versions.

## Verified state

| Range | Status | Evidence probed |
|---|---|---|
| `00001`–`00010` | ✅ applied | enums, core tables, indexes, RLS, triggers, question bank, `calendar_events`, share RPC, `outcome_surveys` |
| `00011`–`00015` | ✅ applied | `score_shares.created_by`, `score_shares_owner_all`, `advisor_usage`, `score_shares.revoked_at`, `webhook_events` (+ forced RLS) |
| `00016`–`00025` | ✅ applied | `email_unsubscribes`, `plaid_items`, `goals`, profile email-pref cols, `profiles_column_grants`, `profiles_privilege_guard`, readiness calibration, outcome-survey ownership, `user_finance_state`, `plaid_transactions`, `push_subscriptions`, `profiles_delete_own` |
| `00026`–`00033` | ✅ applied | `assessments.attribution`, `email_sends`, `shadow_shares`, `partner_api_keys`, `receipt_verifications`, `try_consume_advisor_message_v2`, `partner_codes`, full `00032` set (`payments`, `profiles.employer_id`/`organization_id`, `assessments.referral_source`/`organization_id`, `behavioral_genome.assessment_id`, both partner/org select policies), `campaigns` |
| `00034` | ⚠ **not applied — and must not be** | see below |
| `00035`–`00039` | ✅ applied | `partner_code_stats` + `partner_recent_assessments` both carry the `referral_source` branch; `tool_scenarios`, `ad_spend`, `user_readiness_path`, `households` |

### Probe corrections

Three objects flagged missing on the first pass were **probe errors**, not drift.
The real names are `score_shares` (not `shares`) and `webhook_events` (not
`stripe_webhook_events`). All three confirmed present on re-check. Recorded here so
the mistake isn't repeated.

## The one real gap — `00034_profile_field_locks.sql`

Neither `enforce_profile_field_locks()` nor `trg_enforce_profile_field_locks` exists
in production. **That is the correct state.** The file's `CRITICAL` header describes
the pre-`00020a` world and is no longer accurate:

- The `role` / `subscription_tier` / `subscription_status` / `stripe_customer_id`
  self-escalation hole is **already closed** by the live `profiles_privilege_guard`
  trigger from `00020a`. Prod's function body was diffed against the repo file and
  matches exactly — no undocumented hotfix drift.
- The `outcome_surveys` IDOR tightening is **already live**, applied remotely as
  `outcome_surveys_ownership_correct`. Prod's `with_check` carries the
  assessment-ownership `exists(...)` clause.

**Genuine delta: the `email` column.** The live guard doesn't lock it, and
`profiles.email` is a *send target* — `lib/email/campaign.ts:107` and both cron
routes (`reassessment`, `outcome-surveys`) select it to address outbound mail.
`profiles_update_own` imposes no column restriction, so a user could point their own
`profiles.email` at an address they don't control and have the platform deliver
there. Moderate severity; a mail-relay/misdelivery vector rather than privilege
escalation.

**Fix:** `00040_profile_email_lock.sql` — `create or replace` on the *existing*
guard function adding the `email` clause. No second trigger. Verified by grep that no
application code updates or upserts `profiles.email`, so nothing legitimate breaks;
`service_role` and `is_admin()` callers remain exempt.

## Other findings

- **`GO-LIVE-CHECKLIST.md` §2 was stale** — it listed migrations as a 🔴 launch
  blocker "through `00033_campaigns.sql`" and named `partner_codes`, `shadow_shares`,
  `partner_api_keys`, `receipt_verifications` and `try_consume_advisor_message_v2` as
  pending. All are live. §2 has been rewritten to a verification step.
- **Numbering collision:** `00024_plaid_transactions.sql` and
  `00024_push_and_survey_notifications.sql` share an id. Both are applied and it is
  harmless today, but it will break any future ordered `supabase db push`. Leave as
  history; never reuse `00024`.
- **Security advisors:** 7 × `rls_enabled_no_policy` (INFO) on `campaigns`,
  `campaign_sends`, `email_sends`, `email_unsubscribes`, `partner_api_keys`,
  `shadow_shares`, `webhook_events`. These are service-role-only tables with forced
  RLS and no policies — **deny-all by design**, not a defect.
- **Actionable advisor:** leaked-password protection (HaveIBeenPwned) is still
  disabled in Supabase Auth. Already tracked as checklist §1.5.
- The `SECURITY DEFINER` executable-by-anon warnings cover intentionally public RPCs
  (`get_shared_assessment` powers anonymous share links). `guard_profiles_privileged_columns`
  appearing in that list is cosmetic — it is a trigger function; calling it over REST
  outside trigger context errors.

## The guard was inert — 2026-08-01

`00040` was applied to production on 2026-08-01. Verifying it — rather than
trusting the apply — turned up the real defect.

**`guard_profiles_privileged_columns()` is `SECURITY DEFINER`, owned by `postgres`.**
Inside a `SECURITY DEFINER` function, `current_user` is the *function owner*, not
the caller. The body opens with:

```sql
if current_user in ('service_role','postgres','supabase_admin','supabase_auth_admin')
  then return new; end if;
```

`postgres` is in that list, so the guard returned `new` unconditionally for every
caller. The trigger fired on every UPDATE and waved it through. This dates to
`00020a`, which installed it; `00040`'s `email` clause landed in the same dead
path and changed nothing observable.

### Proof

Transaction-scoped probe against production, ended with `ROLLBACK` — as role
`authenticated` with `request.jwt.claims.sub` set to the row's own id:

| Attempt | Result |
|---|---|
| `update profiles set email = 'guard-probe@example.invalid'` | **NOT BLOCKED** — 1 row |
| `update profiles set stripe_customer_id = 'cus_guard_probe'` | **NOT BLOCKED** — 1 row |

`profiles_update_own` imposes no column restriction, so the same path allows
`role = 'admin'` and any `subscription_tier`. The severity is **privilege
escalation and paid-tier self-grant**, well above the mail-redirect vector
`00040` was written for.

### Correction to this audit

The `00034` analysis above says the escalation hole "is already closed by the live
`profiles_privilege_guard` trigger from `00020a`." **That is wrong.** The trigger
exists, is `BEFORE UPDATE`, is enabled (`tgenabled = 'O'`), and its body matches
the repo file exactly — every check this audit ran passed. But object existence
and body equality do not imply enforcement. Probing *objects* was the right
correction to probing *versions*; it is still not enough. **Probe behaviour.**

`00034` remains superseded — it would install a duplicate trigger, and its own
service-context test (`auth.uid() is null`) is weaker, not stronger.

### Fix

`00041_profile_guard_security_invoker.sql` — same body, `security invoker`. The
function reads only `NEW`/`OLD` and calls `is_admin()`, so it needs no owner
privileges; under invoker rights `current_user` is the caller's effective role,
which is what the allowlist was always meant to test. `is_admin()` stays
`SECURITY DEFINER` and `authenticated` already holds `EXECUTE` on it.

Verified before apply, transaction-scoped and rolled back:

| Path | Result |
|---|---|
| `authenticated` → `email` | blocked, `42501` |
| `authenticated` → `stripe_customer_id` | blocked, `42501` |
| `authenticated` → `full_name` (benign) | allowed, 1 row |
| `service_role` → `email` (cron/webhook) | allowed, 1 row |
| admin self → `subscription_tier` | allowed, 1 row |
| admin self → `email` | allowed, 1 row |

**Status: APPLIED 2026-08-01.** Post-apply verification against production —
again transaction-scoped and rolled back — confirms enforcement is live:

| Attempt (as `authenticated`, own row) | Result |
|---|---|
| `role = 'admin'` (escalation) | blocked, `42501` |
| `email` (mail redirect) | blocked, `42501` |
| `stripe_customer_id` | blocked, `42501` |
| `subscription_tier = 'plus'` (paid self-grant) | blocked, `42501` |
| `full_name` (benign) | allowed, 1 row |
| admin → own `subscription_tier` (product UI) | allowed, 1 row |
| `service_role` → `email` + `subscription_status` | allowed, 1 row |

`pg_proc.prosecdef` is now `false` for the function; the `email` clause is
present. Supabase security advisors show no new findings, and the guard has
dropped off the `SECURITY DEFINER`-executable warning lists.

### Audit any other `SECURITY DEFINER` trigger the same way

Any trigger function that is `SECURITY DEFINER` *and* gates on `current_user` has
this bug by construction. Sweep for it:

```sql
select p.proname,
       pg_get_userbyid(p.proowner) as owner,
       exists (select 1 from pg_trigger t where t.tgfoid = p.oid) as used_as_trigger
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prosecdef
  and pg_get_functiondef(p.oid) ~* '\mcurrent_user\M';
```

Run 2026-08-01 after applying `00041`: **zero rows.** No other `SECURITY DEFINER`
function in `public` gates on `current_user`, so the bug class is confined to the
one guard.

## How to re-run this audit

Probe objects, never versions. The full SQL is a single `with checks(...) as (...)`
union of `to_regclass` / `information_schema.columns` / `pg_policies` / `pg_proc`
existence tests, one row per migration, returning `PRESENT` / `MISSING`. Confirm any
`MISSING` against the migration file's actual DDL before believing it — see the probe
corrections above.
