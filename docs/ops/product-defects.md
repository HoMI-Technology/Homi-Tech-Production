# Product defects found by the test-suite rebuild

Logged 2026-08-30 against `3bd5471d496976630f8344b3120eb6a3e1f089f8`.
These are **not** fixed in this PR. Tests were not softened.

| file | line | severity | failing / proving test | what is broken |
| --- | --- | --- | --- | --- |
| `components/finance/ThresholdCompass.tsx` | 1 | medium | `__tests__/finance/threshold-compass.test.tsx` | Zero product importers. Live fold uses `components/brand/ThresholdCompass` via `ThresholdFold.tsx`. The finance copy is a dead scoring UI; the test pins a surface users never see. |
| `app/(product)/partner/dashboard/page.tsx` | 47 (pre-extraction) | medium | old `__tests__/dashboard/partner.test.ts` | Access gate was inline. Anonymized-row helper existed only inside the test (tautology). Client scoping is `.eq("partner_id", user.id)` — now T3 `partner/clients-scoped-by-partner-id`. Email-on-row is still not a product function. |
| `lib/scoring/index.ts` | 22 | medium | `__tests__/policy/rules/no-weights-reexport.test.ts` | Re-exports `PILLAR_MAX_POINTS` from `./weights`. The T3 rule allows this one named seam and forbids any other weights re-export. Full `WEIGHTS` tables must stay un-re-exported. |
| `components/planner/goals/goals-derive.ts` | 1 | low | `__tests__/planner/goals-derive.test.ts` | Pure derivation lives under `components/`. Not extracted this PR (already testable). |
| `components/planner/transactions/transactions-derive.ts` | 1 | low | `__tests__/planner/transactions-derive.test.ts` | Same layering note. |
| `components/planner/plan/PlanCashFlow.tsx` | ~55 | low | `__tests__/planner/plan-cash-flow.test.tsx` | `buildCashFlowSeries` is exported from a UI module. |
| fetching `page.tsx` siblings | — | low | `__tests__/policy/rules/route-state-coverage.test.ts` | 32 fetching pages missing `loading.tsx` and/or `error.tsx`. List is the ratchet in `ROUTE_STATE_GAPS`; shrink only. |

## Route-state gaps (32)

See `ROUTE_STATE_GAPS` in `__tests__/policy/rules/route-state-coverage.test.ts`.
Examples: `app/(product)/assessment/page.tsx` (no loading/error), `app/(product)/path/page.tsx` (no loading), partner/employee/team dashboards (no error).
