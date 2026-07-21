# HōMI — Supabase Database

This directory contains the full Postgres schema for HōMI as a set of
ordered, idempotent SQL migrations. Every file can be re-run safely against
an existing database (guards via `IF NOT EXISTS`, `DO $$ ... EXCEPTION`,
`ON CONFLICT ... DO NOTHING`, and `DROP POLICY IF EXISTS`).

## Migration order

Apply in numeric order — later files depend on tables/types created earlier.

> **Note:** Three prefix collisions exist in this repo (`00018`, `00020`, `00024`).
> Apply both files sharing a prefix in filesystem sort order (see table).
> Remote project `giyycykxkzfbowiapxpd` has migrations through `00031`; `00032`
> is pending (`npm run verify-supabase` + `supabase db push` after repair).

| # | File | Purpose |
|---|------|---------|
| 1 | `00001_enums.sql` | Enum types (`user_role`, `subscription_tier`, `assessment_status`, `verdict_type`, `dimension_type`, `message_role`, `org_kind`) |
| 2 | `00002_tables.sql` | Core tables — profiles, assessments, question_bank, decision_journal, daily_checkins, advisor_conversations/messages, organizations, organization_members, score_shares, waitlist, audit_log |
| 3 | `00003_indexes.sql` | Query-pattern indexes (owner + created_at, lookup columns) |
| 4 | `00004_rls.sql` | Row Level Security — enable/force + policies + `is_admin()` helper |
| 5 | `00005_triggers.sql` | `auth.users` → `profiles` provisioning trigger, `updated_at` touch triggers |
| 6 | `00006_seed_question_bank.sql` | 45 canonical assessment questions (ported from `lib/questions/bank.ts`) |
| 7 | `00007_family_calendar.sql` | Family mode + milestone calendar tables |
| 8 | `00008_share_rpc.sql` | Public score-share lookup via `SECURITY DEFINER` RPC |
| 9 | `00009_security_perf_hardening.sql` | Security + performance hardening (RLS, indexes, grants) |
| 10 | `00010_override_outcomes.sql` | Outcome surveys + override tracking |
| 11 | `00011_shares_ownership.sql` | Tightens `score_shares` insert policy (cross-tenant fix) |
| 12 | `00012_outcome_surveys_index.sql` | Index on `outcome_surveys.assessment_id` |
| 13 | `00013_advisor_usage.sql` | Server-authoritative daily AI advisor message quota |
| 14 | `00014_share_revocation.sql` | Revocable score-share links |
| 15 | `00015_webhook_events.sql` | Stripe webhook idempotency ledger |
| 16 | `00016_email_unsubscribes.sql` | CAN-SPAM / RFC 8058 opt-out ledger |
| 17 | `00017_bank_sync.sql` | Plaid bank-sync foundation (`plaid_items`, `plaid_accounts`) |
| 18a | `00018_goals.sql` | User savings goals |
| 18b | `00018_profile_field_locks.sql` | Privilege-escalation lock on `profiles` + outcome ownership |
| 19 | `00019_profile_email_prefs.sql` | Lifecycle email state + reminder preferences |
| 20a | `00020_profiles_column_grants.sql` | Column-level grants on `profiles` self-service updates |
| 20b | `00020_profiles_privilege_guard.sql` | `BEFORE UPDATE` trigger blocking role/tier self-escalation |
| 21 | `00021_readiness_calibration.sql` | Anonymized network calibration RPC |
| 22 | `00022_outcome_surveys_ownership.sql` | Cross-tenant fix on `outcome_surveys` |
| 23 | `00023_user_finance_state.sql` | Manual Finance dashboard state |
| 24a | `00024_plaid_transactions.sql` | Full Plaid transaction persistence |
| 24b | `00024_push_and_survey_notifications.sql` | Web Push subscriptions + survey nudge prefs |
| 25 | `00025_profiles_delete_own.sql` | Self-service account erasure path |
| 26 | `00026_attribution.sql` | First-touch acquisition attribution + `partner_codes` |
| 27 | `00027_email_sends.sql` | Lifecycle email idempotency ledger |
| 28 | `00028_shadow_shares.sql` | Anonymous Shadow Score share cards |
| 29 | `00029_receipts.sql` | Partner-side receipt verification (B2B v1) |
| 30 | `00030_advisor_monthly_quota.sql` | Monthly ceiling for Companion usage |
| 31 | `00031_partner_stats.sql` | Partner-scoped, anonymized portal stats |
| 32 | `00032_dashboard_ecosystem.sql` | Employer/org pointers, genome hardening, payments, partner read policies |

**Total:** 34 SQL files covering migrations `00001`–`00032` (three shared prefixes).

### Tier 2 verification checklist

```bash
cp .env.example .env.local          # Tier 1 values from ci.yml
npm run verify-supabase             # anon client smoke test (no service role)
# Tier 2 — owner-provided secret:
#   SUPABASE_SERVICE_ROLE_KEY=...   # Dashboard → Settings → API
npm run create-admin                # optional admin bootstrap
```

Auth redirect (live E2E): Supabase Dashboard → **Auth → URL Configuration** →
allow `http://localhost:3000/**`. See `e2e/README.md` for the full env map.

## Applying migrations

### Option A — Supabase Dashboard SQL Editor

1. Open your project in the [Supabase Dashboard](https://supabase.com/dashboard).
2. Go to **SQL Editor** → **New query**.
3. Paste the contents of `00001_enums.sql`, run it.
4. Repeat in order for `00002` through `00006`.

This is the simplest path for a first-time setup or a hosted project without
the CLI installed locally.

### Option B — Supabase CLI (`supabase db push`)

```bash
# Link once to your project
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations in supabase/migrations/ in order
supabase db push
```

The CLI tracks applied migrations in the `supabase_migrations` schema, so
`supabase db push` only applies files that haven't run yet. For local
development, use `supabase start` + `supabase db reset` to rebuild the local
stack from these migrations plus seed data.

> **Production history repair:** the remote project's migration history still contains prototype-era phantom rows — before any `db push` against production, a human must run the runbook in [`docs/MIGRATION-REPAIR.md`](../docs/MIGRATION-REPAIR.md) (AUDIT T0.6).

## Row Level Security overview

Every table has RLS **enabled**; tables holding user-owned data additionally
have RLS **forced** so even the table owner role is subject to policy checks.
`is_admin()` is a `SECURITY DEFINER`, `STABLE` helper function (search_path
pinned) that checks the caller's `profiles.role`, used instead of a
recursive subquery on `profiles` to avoid RLS self-reference issues.

| Table | Select | Insert | Update | Delete |
|-------|--------|--------|--------|--------|
| `profiles` | Owner (`auth.uid() = id`) or admin | via trigger only | Owner only | — |
| `assessments` | Owner or admin | Owner only | Owner only | Owner only |
| `question_bank` | Public (`anon` + `authenticated`) | — | — | — |
| `decision_journal` | Owner only | Owner only | Owner only | Owner only |
| `daily_checkins` | Owner only | Owner only | Owner only | Owner only |
| `advisor_conversations` | Owner only | Owner only | Owner only | Owner only |
| `advisor_messages` | Via conversation ownership | Via conversation ownership | Via conversation ownership | Via conversation ownership |
| `organizations` | Members or admin | — | — | — |
| `organization_members` | Members or admin | — | — | — |
| `score_shares` | Owner (`created_by`) | Owner only | Owner only | Owner only |
| `waitlist` | Admin only | `anon` + `authenticated` (`with check (true)`) | — | — |
| `audit_log` | Admin only | `authenticated` (`with check (true)`) | — | — |

Notes:
- "Owner" means the row's `user_id` (or `created_by` for `score_shares`)
  matches `auth.uid()`.
- `question_bank` has no write policies defined here — write access is
  reserved for the seed migration (executed with elevated privileges) and
  the Supabase service role.
- `waitlist` explicitly has **no** anonymous select policy — public signup
  forms can insert but never read back other entrants' rows.

## Regenerating TypeScript types

After schema changes, regenerate `types/database.ts` (or use the Supabase
MCP `generate_typescript_types` tool) so the application types stay in sync
with the live schema.
