# ADR-002: Readiness across the decision ladder — how hard stops generalize beyond home

**Status:** Proposed — requires founder sign-off on the open questions in §5
**Date:** 2026-08-10

## Context

Founder direction (2026-08-10): readiness should cover "cars, investments, buying a TV —
essentially any purchase or investment," not a car-shaped vertical alone. This extends,
rather than contradicts, the Decision Ladder already in canon: micro → considered → major.

What is shipped today:

- `DecisionType` is a five-value union (`home_buying`, `car`, `career_change`, `education`,
  `starting_a_business`), but `ACTIVE_DECISION_TYPES = ["home_buying"]`. Everything else is
  accepted and persisted, not scored.
- Four hard stops live in `detectHardStops()` and force `NOT_YET`: `DTI_OVER_50`,
  `HOUSING_RATIO_OVER_45`, `RUNWAY_UNDER_1_MONTH`, `CREDIT_UNDER_620`.
- Scoring canon is frozen at 35/35/30 with verdict bands 80/65/50. Verticals branch through
  question-bank tags and per-vertical mappers into the same `AssessmentInputs` — never by
  editing `lib/scoring/*`.

Two constraints bound any answer here:

1. **A TV is not a small house.** The home model assumes a large, leveraged, irreversible,
   multi-year obligation. Most purchases are none of those. A model that emits `NOT_YET` for a
   $400 television is not protective — it is noise, and it trains users to ignore the product.
2. **Micro-verdicts phrased as commands are individualized advice in substance.** Canon already
   resolves this: show the consequence, let the user decide. "This leaves you $840 and 2.1 months
   of runway" is a fact. "Don't buy this" is advice.

## Decision (proposed)

**Three tiers, three different mechanisms. Hard stops do not apply uniformly.**

| Tier           | Examples              | Mechanism                                         | Verdict? | Hard stops?           |
| -------------- | --------------------- | ------------------------------------------------- | -------- | --------------------- |
| **Micro**      | TV, shoes, dinner out | Consequence preview, pull-only (user asks first)  | No       | No                    |
| **Considered** | Car, vacation, laptop | Short parameterized assessment (~24–30 questions) | Yes      | Reduced set (§3)      |
| **Major**      | Home, business        | Full 45-question assessment                       | Yes      | Full set (as shipped) |

The tier is a property of the decision, not of the user. Which tier a given purchase lands in is
the first open question in §5.

## 3. Which shipped hard stops generalize

Assessed against the four in `HardStopCode`:

| Hard stop               | Generalizes?            | Reasoning                                                                                                     |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `RUNWAY_UNDER_1_MONTH`  | **Yes — universal**     | Applies to any outflow regardless of size or financing. The single most decision-agnostic stop we have.       |
| `DTI_OVER_50`           | **Yes, when financed**  | A car loan or 0% store card changes debt service exactly as a mortgage does. Meaningless for a cash purchase. |
| `CREDIT_UNDER_620`      | **Only when financing** | A gate on borrowing terms, not on affordability. Irrelevant to a cash purchase; relevant to any financed one. |
| `HOUSING_RATIO_OVER_45` | **No — home-specific**  | Has no analogue outside housing. Stays scoped to `home_buying`.                                               |

This yields a natural structure: **one universal stop, two financing-conditional stops, and
per-vertical stops layered on top.** Hard stops become a composed set rather than a fixed table.

## 4. Investments — carved out, not included

Purchases and investments are not the same regulatory object. Assessing whether someone can
absorb an outflow is affordability. Assessing whether they should buy a security is investment
advice, which implicates the Investment Advisers Act. HōMI's canon states plainly that it is not
an RIA.

**Proposed:** investments are out of scope for this ADR and gated behind counsel review before
any design work. If a readiness signal for investing ships at all, the likely-safe shape is the
same consequence framing used for micro — "this moves $X out of your emergency fund, leaving Y
months" — with no view whatsoever on the instrument, timing, or expected return. That is
affordability, not advice. It still needs counsel sign-off before build.

## 5. Open questions — founder sign-off required

Numbers are deliberately absent below. These are canon-level and are not mine to assume.

1. **Tier boundary.** What sorts a purchase into micro vs. considered? Candidates: absolute
   dollar amount; percentage of monthly discretionary income; percentage of liquid savings;
   whether it is financed; or user-declared. A percentage-of-runway rule adapts across income
   levels where a flat dollar threshold does not — but it needs live balances to compute.
2. **Runway floor.** Is `RUNWAY_UNDER_1_MONTH` still the right universal floor for smaller
   decisions, or does a car warrant a longer floor than a home given the shorter recovery window?
3. **Financing trigger.** Do the financing-conditional stops fire on any financing, or only above
   a term or rate threshold (0% for 12 months differs from 24% revolving)?
4. **Car-specific stops.** Beyond the composed set, does the car vertical need its own — total
   vehicle cost vs. annual income, negative equity rolled from a trade-in, loan term beyond some
   length? Each needs a threshold.
5. **Micro tier prerequisite.** Micro is only meaningful with a live financial picture; a
   consequence preview built on stale manual figures is worse than none, and stale data driving a
   confident number is a UDAAP exposure. Does micro therefore gate on Plaid connection?
6. **Investments.** Park entirely, or commission counsel review now?

## Consequences

- `ACTIVE_DECISION_TYPES` grows one vertical at a time; each entry requires its stop set resolved
  here first.
- `HardStopCode` becomes a composed union rather than a flat four. Existing codes keep their
  names and meanings — no migration of persisted assessments.
- The micro tier introduces a surface that returns **no score and no verdict**. Results-page
  disclaimer patterns do not transfer to it unchanged and will need their own copy review.
- `DecisionType` may need values beyond the current five (a TV is not any of them). Note that
  `journal_entries.decision_type` is a separate vocabulary and must not be reconciled with this one.
- Nothing here touches `lib/scoring/*`. If an option in §5 cannot be expressed through question
  tags and mappers, it is the wrong option.

## Rejected alternatives

- **A per-vertical hard-stop table.** Works for five verticals, collapses at "any purchase" —
  every new category needs its own founder-signed thresholds before it can ship.
- **One universal stop set across all tiers.** Produces `NOT_YET` on a $400 television, which
  destroys the meaning of the verdict at the top of the ladder.
- **Extending the home engine with per-vertical branches.** Violates frozen scoring canon and puts
  vertical logic inside the trade-secret module.
- **Folding investments in with purchases.** Different regulatory regime; would put HōMI adjacent
  to advice it has committed never to give.
