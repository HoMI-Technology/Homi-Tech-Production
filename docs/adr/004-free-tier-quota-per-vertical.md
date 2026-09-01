# ADR-004: Free-tier quota is one completed assessment per vertical

**Status:** Accepted
**Date:** 2026-09-01

## Context

Plans.md D10: the free-tier gate on `POST /api/assessments` counted **all**
completed non-shadow assessments, with no `decision_type` filter. One home
verdict consumed the lifetime quota for every later vertical. Activating the
car picker (5.9 phase 2) would then 402 free users with “one full assessment”
and no explanation.

Options:

| Option | Meaning |
|---|---|
| One-total | One completed assessment ever on free. Protects rescoring upsell. Breaks the Decision Ladder’s first taste of car. |
| One-per-vertical | One completed assessment per `decision_type` on free. Re-score of the same vertical is Plus+. |

## Decision

**One-per-vertical.**

- Free: at most one completed non-shadow row per `decision_type`.
- Plus+: `unlimitedRescoring` unchanged — unlimited across verticals.
- 402 copy names the per-decision rule. Code stays `rescoring_locked`.
- Compensating post-insert count is also per vertical.

This is D10 resolved. It does **not** activate the car picker (5.9 phase 2).
That remains a separate deploy after this gate is live.

## Consequences

- A free user who finished home can still complete a first car assessment
  once the picker ships.
- Re-running home on free still 402s.
- Entitlement name `unlimitedRescoring` still means “re-score any vertical
  without the per-type cap.”

## Rejected alternatives

- **One-total** — unexplained 402 when car activates; fights D7–D9.
- **Unlimited free rescoring** — kills the Plus wedge.
