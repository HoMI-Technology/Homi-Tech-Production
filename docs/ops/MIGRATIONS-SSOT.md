# Supabase migrations — source of truth

**Production project:** `giyycykxkzfbowiapxpd` (East US)  
**DEV / E2E project:** **none yet** (owner action — create a separate free/test project; never clone production PII)  
**Local folder:** `supabase/migrations/`  
**Rule:** forward-only. Never edit a migration after it has been applied to production.  
**Never** run `supabase db push` blindly against production. Zero production schema mutation unless a named security fix is marked OWNER REVIEW REQUIRED.

## DEV / E2E bootstrap (when a second project exists)

Do **not** clone production data. On a new empty project:

1. Link: `npx supabase link --project-ref <DEV_REF>` (never the production ref).
2. Apply **this repo's** `supabase/migrations/` as the contract for DEV. Local filenames are not a guaranteed 1:1 with the production ledger (`docs/ops/MIGRATION-DRIFT-2026-07-28.md`).
3. **Do not apply** `00034_profile_field_locks.sql` (superseded).
4. Prefer `supabase db query` per file or a fresh `db reset` **only on DEV**.
5. Point GitHub `E2E_SUPABASE_*` at the DEV URL + DEV `service_role` only.

Until that project exists, live E2E stays **NOT CONFIGURED** / CORE coverage.

## Reality check

Remote `supabase_migrations.schema_migrations` uses a **long history of timestamp-style versions** that predate the repo's `000xx_*.sql` naming. Local files `00001`–`00039` are the **product schema contract** for this codebase. They do not always line up 1:1 with remote version strings.

## Applying new migrations (safe path)

1. Prefer **idempotent SQL** (`create table if not exists`, `drop policy if exists`).
2. Apply to production with the linked CLI (not a blind full history replay):

```bash
# Example: apply a single file's SQL
Get-Content -Raw supabase/migrations/00038_user_readiness_path.sql | npx supabase db query --linked
```

3. Mark the local version applied so `migration list` stays honest:

```bash
npx supabase migration repair 00038 --status applied --linked
```

4. **Do not** `supabase db push` the entire 00007–00035 range against production unless you have verified none of those objects already exist under other version names.

## Current Path / household migrations

| File                                       | Purpose                                                                                                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `00036_tool_scenarios.sql`                 | Decision Lab saved scenarios                                                                                                                                                                                                                                                         |
| `00037_ad_spend.sql`                       | Admin ad spend                                                                                                                                                                                                                                                                       |
| `00038_user_readiness_path.sql`            | Path to Ready LWW JSON                                                                                                                                                                                                                                                               |
| `00039_households.sql`                     | Dual-user household + invites                                                                                                                                                                                                                                                        |
| `00040_profile_email_lock.sql`             | Adds `email` to the profiles privileged-column guard — applied 2026-08-01                                                                                                                                                                                                      |
| `00041_profile_guard_security_invoker.sql` | Makes that guard actually enforce (`security invoker`) — applied 2026-08-01                                                                                                                                                                                                    |
| `20260803000001_finance_ledger.sql`        | Budget & Runway PR 3 — `finance_*` tables + FORCE RLS + system categories + mutation idempotency. **Applied to production 2026-08-03** (single-file via `supabase db query --linked`; repair `20260803000001` applied). 6 tables FORCE RLS, 22 policies, 21 system categories. |
| `20260818000001_plaid_full_picture.sql`    | Identity owners, holdings, investment transactions, liabilities. **Applied to production 2026-08-18** (`supabase db query --linked`; repair `20260818000001` applied). All five new tables FORCE RLS; `plaid_account_owners` has no authenticated SELECT. |
| `20260831000001_evidence_engine.sql`       | Evidence Engine v1.0 — lineage columns, immutable baselines, structured outcome fields, contact events. **Applied to production 2026-08-31** (`supabase db query --linked`; repair `20260831000001` applied). Tables `assessment_outcome_baselines` + `outcome_survey_events` FORCE RLS. Do not rewrite historical outcomes. |

## Drift status

Audited 2026-07-28 by object-existence probe (not by ledger version): **40 of 41
files applied**, only `00040` outstanding. `00040` was applied 2026-08-01.
`00034_profile_field_locks.sql` is **superseded — never apply it.** Full evidence
and re-run method: `docs/ops/MIGRATION-DRIFT-2026-07-28.md`.

**Closed 2026-08-01.** Verifying `00040` revealed that the guard it extends had
never enforced anything: `guard_profiles_privileged_columns()` was `SECURITY
DEFINER` owned by `postgres`, so its `current_user in ('postgres', …)` service
allowlist matched its own owner and short-circuited for every caller — any
authenticated user could self-write `role`, `subscription_tier`,
`subscription_status`, `stripe_customer_id` and `email`. `00041` switched it to
`security invoker` and is applied; escalation attempts now raise `42501`, with the
benign, admin and `service_role` paths unaffected. A sweep for other `SECURITY
DEFINER` functions gating on `current_user` returned zero rows.

Lesson for future audits: object existence ≠ enforcement. Probe behaviour, in a
transaction you roll back.

Previously `00024` was used twice (`plaid_transactions`,
`push_and_survey_notifications`). Both were applied to production. The push
migration file was renamed to `20260720142717_push_and_survey_notifications.sql`
to match the remote ledger version and leave `00024` unique for
`plaid_transactions`. Never reuse `00024`.

## After schema change

1. Update `types/database.ts` if needed
2. `npx tsc --noEmit` + unit tests
3. Document the new file in this table
4. Apply to production before relying on APIs in prod

## CI

Schema is not applied by GitHub Actions (no DB credentials in CI). Application code must degrade when tables are missing (see readiness-path routes returning empty / 503).

## Household integrity

| File                                                    | Status                                                                                                                         | Notes                                                                                                                                                                                                                      |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260802000001_household_membership_authorization.sql` | **Applied to production 2026-08-05** (was already on remote ledger; policies verified: invite-based insert + recipient select) | Closes self-join + invitee RLS defects from 00039.                                                                                                                                                                         |
| `20260805000001_household_integrity.sql`                | **Applied to production 2026-08-05** via `supabase db query --linked` + `migration repair 20260805000001 applied`              | Pre-check: 0 multi-membership, 0 households. Post-check: indexes + `household_join_allowed` (has count cap) + owner-scoped invite policy. No separate staging project exists; applied to prod after empty-table pre-check. |
