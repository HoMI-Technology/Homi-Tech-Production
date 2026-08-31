# HōMI Evidence Engine Implementation Status

**Date:** 2026-08-31  
**Branch:** `feat/evidence-engine-v1`  
**Base:** `main` @ `867526b9`

## Verdict

PARTIALLY COMPLETE pending CI + production migration apply.

## Gap matrix (Phase 2)

| Requirement | State | Source | Change |
|---|---|---|---|
| T0 snapshot | already built | `lib/outcomes/decision-snapshot.ts`, assessments persist | Extended to every vertical + `scoring_schema_id` |
| day30 surveys | already built | assessments persist | Kept |
| day90 / day365 | partial | override route only | Also scheduled at persist for all completed assessments |
| taxonomy moved/waited/lender_blocked/not_okay/no_answer | already built | `lib/outcomes/taxonomy.ts` | Preserved; mapped to `decision_state` for analysis |
| user_override | already built | 00010, override route | Unchanged; never rewrites score |
| email + push nudges | already built | cron + vercel.json `0 15 * * *` | Kept; added contact events |
| notified_at idempotency | already built | 20260720142717, cron | Kept |
| RLS ownership | already built | 00022 | New tables FORCE RLS, owner-only |
| calibration RPC | already built | 00021 | Unchanged product layer |
| structured resilience fields | missing → added | — | `outcome_surveys` additive columns |
| baseline table | missing → added | — | `assessment_outcome_baselines` insert-only |
| funnel telemetry | missing → added | — | `contact_state` + `outcome_survey_events` |
| open tracking | blocked | privacy | Not implemented; labeled unreliable |
| model version | missing → added | — | Opaque `scoring_schema_id` |
| lineage | missing → added | — | `previous_assessment_id` + same-user trigger |
| public predictive claims | forbidden | protocol | None added |
| scoring weights / thresholds | frozen | Section 0 | Untouched |

## Environment variables (names only)

Existing, no new secrets:

- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- Resend / `RESEND_API_KEY` (email)
- VAPID keys (push; optional)
- `NEXT_PUBLIC_POSTHOG_KEY` (occurrence events only)

## Migration

`supabase/migrations/20260831000001_evidence_engine.sql` — **not applied** anywhere.

Apply with the single-file path in `docs/ops/MIGRATIONS-SSOT.md` after review.
Do not `supabase db push` the full history.

## Remaining limitations

- T0 `financial_stress` and cash-margin are unknown unless a later UI captures them.
- Free-tier one-assessment lock limits wait-then-reassess lineage until Plus.
- Product calibration still uses satisfaction × verdict (k ≥ 5). Research metrics are separate and do not compute p-values.
- Email “opened” is not measured.
- Production apply and live survey round-trip are owner steps.
