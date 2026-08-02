# Supabase migrations — source of truth

**Production project:** `giyycykxkzfbowiapxpd` (East US)  
**Local folder:** `supabase/migrations/`  
**Rule:** forward-only. Never edit a migration after it has been applied to production.

## Reality check

Remote `supabase_migrations.schema_migrations` uses a **long history of timestamp-style versions** that predate the repo’s `000xx_*.sql` naming. Local files `00001`–`00039` are the **product schema contract** for this codebase. They do not always line up 1:1 with remote version strings.

**Ledger divergence (audited 2026-08-02):** 139 remote entries against 42 local
files, correlating **only through `00006`**. The ledger cannot currently be read
as a record of what is applied, so **no new migration may assume a clean apply**
— verify by object existence and behaviour, in a transaction you roll back.

## Applying new migrations (safe path)

1. Prefer **idempotent SQL** (`create table if not exists`, `drop policy if exists`).
2. Apply to production with the linked CLI (not a blind full history replay):

```bash
# Example: apply a single file’s SQL
Get-Content -Raw supabase/migrations/00038_user_readiness_path.sql | npx supabase db query --linked
```

3. Mark the local version applied so `migration list` stays honest:

```bash
npx supabase migration repair 00038 --status applied --linked
```

4. **Do not** `supabase db push` the entire 00007–00035 range against production unless you have verified none of those objects already exist under other version names.

## Current Path / household migrations

| File | Purpose |
|------|---------|
| `00036_tool_scenarios.sql` | Decision Lab saved scenarios |
| `00037_ad_spend.sql` | Admin ad spend |
| `00038_user_readiness_path.sql` | Path to Ready LWW JSON |
| `00039_households.sql` | Dual-user household + invites |
| `00040_profile_email_lock.sql` | Adds `email` to the profiles privileged-column guard — applied 2026-08-01 |
| `00041_profile_guard_security_invoker.sql` | Makes that guard actually enforce (`security invoker`) — applied 2026-08-01 |
| `20260802000004_household_authorization_reconciled.sql` | Household membership authorization: invitation-backed INSERT, `household_members` UPDATE column grants, recipient invite SELECT + accept-only UPDATE, invites narrowed to the owner, one-membership-per-user and one-partner-per-household unique indexes — **NOT APPLIED** |

### `20260802000004` — not applied, and carrying an open risk

**NOT APPLIED. Never executed against any database** — production, staging or
local. It is authoring only; nothing in it has been observed. It supersedes
`20260802000001_household_membership_authorization.sql`, which was also never
applied and is removed from the tree in the same commit — do not apply both.

**A clean apply cannot be assumed.** The remote
`supabase_migrations.schema_migrations` ledger holds **139 entries** against
**42 local files** at the 2026-08-02 audit, and the two correlate **only through
`00006`**. Reconcile the ledger before scheduling this file.

**Blocking rehearsal item.** The owner leg of `household_members_insert_self`
reads `households` in a subquery, which is evaluated under the caller's RLS. The
only SELECT policy on `households` is `households_member_select` (00039), which
requires membership — and a creator is not a member until that very insert
lands. If RLS filters the subselect, **household creation breaks entirely**. The
same gap appears to sit one step earlier: `app/api/household/route.ts` does
`.insert(...).select(...)`, and `INSERT ... RETURNING` applies SELECT policies,
so `POST /api/household` may already be failing today. Both candidate
resolutions are written out (commented) in the migration header; the
recommendation is a creator-scoped SELECT policy on `households`, which fixes
both symptoms and adds no RPC-callable surface. Probe it with
`__tests__/acceptance/household-rls.integration.test.ts` HH-011 / HH-011b
(opt-in: `RUN_RLS_IT=1` + a dedicated non-production project) **before** applying
anything.

**Pre-checks before applying to a populated database** — if either returns rows,
resolve the data first; do not force the index:

```sql
select user_id, count(*) from household_members
 group by user_id having count(*) > 1;

select household_id, count(*) from household_members
 where role = 'partner' group by household_id having count(*) > 1;
```

## Drift status

Audited 2026-07-28 by object-existence probe (not by ledger version): **40 of 41
files applied**, only `00040` outstanding. `00040` was applied 2026-08-01.
`00034_profile_field_locks.sql` is **superseded — never apply it.** Full evidence
and re-run method: `docs/ops/MIGRATION-DRIFT-2026-07-28.md`.

🟢 **Closed 2026-08-01.** Verifying `00040` revealed that the guard it extends had
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

Known id collision: `00024` is used twice (`plaid_transactions`,
`push_and_survey_notifications`). Both applied. Never reuse `00024`.

## After schema change

1. Update `types/database.ts` if needed  
2. `npx tsc --noEmit` + unit tests  
3. Document the new file in this table  
4. Apply to production before relying on APIs in prod  

## CI

Schema is not applied by GitHub Actions (no DB credentials in CI). Application code must degrade when tables are missing (see readiness-path routes returning empty / 503).
