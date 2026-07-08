# HōMI — Supabase Database

This directory contains the full Postgres schema for HōMI as a set of
ordered, idempotent SQL migrations. Every file can be re-run safely against
an existing database (guards via `IF NOT EXISTS`, `DO $$ ... EXCEPTION`,
`ON CONFLICT ... DO NOTHING`, and `DROP POLICY IF EXISTS`).

## Migration order

Apply in numeric order — later files depend on tables/types created earlier.

| # | File | Purpose |
|---|------|---------|
| 1 | `00001_enums.sql` | Enum types (`user_role`, `subscription_tier`, `assessment_status`, `verdict_type`, `dimension_type`, `message_role`, `org_kind`) |
| 2 | `00002_tables.sql` | Core tables — profiles, assessments, question_bank, decision_journal, daily_checkins, advisor_conversations/messages, organizations, organization_members, score_shares, waitlist, audit_log |
| 3 | `00003_indexes.sql` | Query-pattern indexes (owner + created_at, lookup columns) |
| 4 | `00004_rls.sql` | Row Level Security — enable/force + policies + `is_admin()` helper |
| 5 | `00005_triggers.sql` | `auth.users` → `profiles` provisioning trigger, `updated_at` touch triggers |
| 6 | `00006_seed_question_bank.sql` | 45 canonical assessment questions (ported from `lib/questions/bank.ts`) |

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
