# Supabase migrations — source of truth

**Production project:** `giyycykxkzfbowiapxpd` (East US)  
**Local folder:** `supabase/migrations/`  
**Rule:** forward-only. Never edit a migration after it has been applied to production.

## Reality check

Remote `supabase_migrations.schema_migrations` uses a **long history of timestamp-style versions** that predate the repo’s `000xx_*.sql` naming. Local files `00001`–`00039` are the **product schema contract** for this codebase. They do not always line up 1:1 with remote version strings.

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

## After schema change

1. Update `types/database.ts` if needed  
2. `npx tsc --noEmit` + unit tests  
3. Document the new file in this table  
4. Apply to production before relying on APIs in prod  

## CI

Schema is not applied by GitHub Actions (no DB credentials in CI). Application code must degrade when tables are missing (see readiness-path routes returning empty / 503).
