# ADR-002: Car vertical hard stops (mapper-side, engine frozen)

**Status:** Accepted
**Date:** 2026-09-01

## Context

Plans.md 5.6–5.7 shipped a car question bank and mapper. The scoring engine
is frozen: four hard stops, home-shaped, in `lib/scoring/engine.ts`:

| Code | Guard |
|---|---|
| `DTI_OVER_50` | DTI > 50% |
| `HOUSING_RATIO_OVER_45` | `monthlyHousingRatio` > 45% |
| `RUNWAY_UNDER_1_MONTH` | runway < 1 month |
| credit under 620 | FICO / band equivalent |

Car finances do not have a housing ratio. A car-specific payment red line
(all-in monthly cost above 20% of take-home) has to reach the engine without
changing weights, thresholds, or `detectHardStops`.

A comment in `lib/questions/to-inputs.ts` once labeled that 20% line as
“D10.” That was wrong. **D10 (ADR-004) is free-tier quota × verticals.**

## Decision

**Keep the engine frozen. Encode car hard stops in the car mapper.**

1. DTI, runway, and credit use the same engine guards as home. The car mapper
   fills `debtToIncomeRatio`, `emergencyFundMonths`, and credit fields so
   those three fire on car fixtures (5.7 tests).
2. Car payment burden: `over_20pct` maps to `monthlyHousingRatio = 0.46`
   (just past the frozen 45% guard). Every other payment band **omits** the
   ratio so the housing guard does not fire.
3. The engine code stays `HOUSING_RATIO_OVER_45`. Per-vertical **copy** of
   that message is a render-layer follow-up, not an engine change.
   `AssessmentInputs` does not carry `decisionType` by design.

## Consequences

- `lib/scoring/*` is not a vertical branch point.
- Display copy lives in `lib/assessment/hard-stop-copy.ts`. Engine codes stay
  `HOUSING_RATIO_OVER_45`. Car payment copy names 20% of take-home, not housing.
- 5.9 phase 2 (picker) shipped independently of the first copy pass.

## Rejected alternatives

- **Add a fifth engine hard stop for car payment** — unfreezes scoring.
- **Skip a payment-burden guard on car** — a user can proceed at >20%
  take-home with no hard stop.
- **Change the 45% housing threshold** — would move the home product.
