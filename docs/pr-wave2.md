# PR: Wave 2 â€” Security, honesty, and persistence fixes

**Branch:** `feat/decision-os-coherence`  
**Target:** `main`  
**Type:** `feat` + `fix` + `security`  

## Summary

Addresses Wave 2 adversarial-review findings. All changes are local-first, backward-compatible, and gated by the existing validation suite. No pushes, deploys, migrations applied, or secret changes were made.

## Changes

### Security & data integrity

- **`app/api/household/accept/route.ts`** â€” verifies the invite email matches the authenticated user's email before joining; returns `403` on mismatch.
- **`app/api/advisor/route.ts` + `app/api/agents/route.ts`** â€” sanitize all user-controlled text (`surface`, `whatChanged`, `identity.name`, `hardStops`, `path.*`, message content) before it reaches the system prompt; reject instruction-override patterns and assistant-last message ordering.
- **`lib/advisor/prompt-safety.ts`** â€” shared Zod helpers for prompt-literal sanitization.
- **`app/[locale]/(product)/team/page.tsx` + `supabase/migrations/20260802000002_org_assessment_deidentify.sql`** â€” org-member assessment reads now use a de-identified projection; `inputs`/`sub_scores`/`insights` are no longer exposed to teammates.

### Data honesty

- **`app/[locale]/(product)/finance/page.tsx`** â€” DebtTab starts with an honest empty list instead of fabricated placeholder debts.
- **`app/api/plaid/webhook/route.ts`** â€” on `USER_PERMISSION_REVOKED` / `USER_ACCOUNT_REVOKED`, deletes `plaid_transactions` rows in addition to `plaid_accounts`.

### AI output guardrails

- **`app/api/agents/route.ts`** â€” discards flagged model replies and returns a deterministic fallback, matching `/api/advisor` Sentinel behavior.

### Persistence (audit T2.6)

- **`supabase/migrations/20260802000003_tools_overlay_sync.sql`** â€” new `user_tools_overlay` table with owner-only RLS.
- **`app/api/tools/overlay/route.ts`** â€” GET/PUT server side of the LWW sync contract for lens-derived overlay values.
- **`lib/tools/cfm.ts` + `hooks/use-cfm.ts`** â€” tools overlay is now local-first with debounced background server sync; `useCfm` reconciles with the server copy on mount.
- **`lib/decisions/state.ts` + `app/[locale]/(product)/decisions/page.tsx`** â€” Decision Rehearsal inputs persist to localStorage and resume where the user left off.

### Tests

- `__tests__/household-accept.route.test.ts` (11 cases)
- `__tests__/advisor-prompt-safety.route.test.ts` (8 cases)
- `__tests__/agents-prompt-safety.route.test.ts` (4 cases)
- `__tests__/tools-overlay.route.test.ts` (10 cases)
- `__tests__/decisions-state.test.ts` (5 cases)
- Updated `__tests__/agents/route.test.ts` and `__tests__/plaid-webhook.route.test.ts`

## Validation

```bash
npm run brand-check        # clean
npm run architecture:check # feed ok
npm run typecheck          # pass
npx vitest run             # 130 files, 1032 tests passed
```

## Deployment notes

âš ï¸ **Do not run `supabase db push` until the phantom migration-row issue is repaired.** Two new migrations are included for review but must not be applied against a dirty migration ledger:

- `supabase/migrations/20260802000002_org_assessment_deidentify.sql`
- `supabase/migrations/20260802000003_tools_overlay_sync.sql`

## Pre-merge checklist

- [ ] Human review of `20260802000002` and `20260802000003` migrations.
- [ ] Repair ~90 phantom migration rows in `supabase_migration.schema_migrations`.
- [ ] Apply migrations to a staging environment and verify RLS.
- [ ] Enable `main` branch protection (required reviews + status checks).
- [ ] Update `supabase/README.md` if deployment steps changed.
