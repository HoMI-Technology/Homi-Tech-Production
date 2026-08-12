# Household journey — rollback

Schema for this slice is already expand-only (new tables/policies/indexes,
no column drops):

- `supabase/migrations/00039_households.sql`
- `supabase/migrations/20260802000001_household_membership_authorization.sql`
- `supabase/migrations/20260805000001_household_integrity.sql`

## App revert

If the household surface breaks production:

1. Revert the deploy (Vercel Instant Rollback to the last-known-good
   production deployment — see `DEPLOY.md`).
2. Do **not** drop `households` / `household_members` / `household_invites`.
   Existing memberships stay; the UI can 503 when tables are missing, but
   deleting them is a data-loss contract.

## Feature revert without schema contract

The product can hide `/household` from chrome (`lib/layout/nav-catalog.ts`)
without reversing migrations. Invites already created remain valid until
`expires_at`.

## Down-migration (staging only, never production)

Do not author a DROP TABLE down-migration against live data. If a future
migration must tighten a constraint, follow expand → backfill → contract in
a later file. See `docs/ops/MIGRATIONS-SSOT.md`.
