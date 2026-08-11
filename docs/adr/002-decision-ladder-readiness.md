# ADR-002: Readiness beyond home — reversibility triage and the drift ledger

**Status:** Proposed — requires founder sign-off on the open questions in §7
**Date:** 2026-08-11

## 1. Context

Founder direction (2026-08-10): readiness should cover "cars, investments, buying a TV —
essentially any purchase or investment," not a car-shaped vertical alone. This extends, rather
than contradicts, the Decision Ladder already in canon: micro → considered → major.

What is shipped today:

- `DecisionType` is a five-value union (`home_buying`, `car`, `career_change`, `education`,
  `starting_a_business`), but `ACTIVE_DECISION_TYPES = ["home_buying"]`. Everything else is
  accepted and persisted, not scored.
- Four hard stops in `detectHardStops()` force `NOT_YET`: `DTI_OVER_50`,
  `HOUSING_RATIO_OVER_45`, `RUNWAY_UNDER_1_MONTH`, `CREDIT_UNDER_620`.
- Scoring canon is frozen at 35/35/30 with bands 80/65/50. Verticals branch through question-bank
  tags and per-vertical mappers into the same `AssessmentInputs` — never by editing `lib/scoring/*`.

Two constraints bound any answer:

1. **A TV is not a small house.** The home model assumes a large, leveraged, irreversible,
   multi-year obligation. Most purchases are none of those. Emitting `NOT_YET` on a $400
   television is not protective — it is noise, and it teaches users to ignore the verdict that
   matters at the top of the ladder.
2. **Micro-verdicts phrased as commands are individualized advice in substance.** Canon already
   resolves this: show the consequence, let the user decide. "This leaves you $840 and 2.1 months
   of runway" is a fact. "Don't buy this" is advice.

## 2. Prior art — checked 2026-08-11

An earlier draft of this ADR leaned on time-denominated pricing as the novel primitive. A prior-art
review refuted that. Recording it here so nobody re-derives the same conclusion:

| Idea                                  | Precedent found                                                                                                                                                    | Implication                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Pricing purchases in time             | _Your Money or Your Life_ (Robin & Dominguez, **1992**) — "life energy." Multiple live calculators (pricetohours.com, timeismoneycalc.com, Robin's own).           | **Not novel.** Use the mechanic; never market it as new.                 |
| Grading a purchase before you buy     | **runwayfinance.app** grades purchases A–F pre-purchase (built 2026). Also DASPR (daily safe-spend number) and PocketGuard ("safe to spend" + "Pace" forecasting). | **Occupied.** Also a naming collision — that product is called _Runway_. |
| Aggregate drift of many small choices | No direct precedent found. PocketGuard's "Pace" is within-month budget pacing, not decision accumulation against a long-term readiness goal.                       | **Most open ground.** Absence of results is not proof of absence.        |
| Reversibility as triage axis          | One-way / two-way doors (Bezos, 2015); applied to consumer finance in writing, not in a shipped product.                                                           | Idea is borrowed; the **implementation** is unclaimed.                   |

**Conclusion: the differentiator is not the metric.** Any of these is a two-week sprint for Monarch
or Copilot once visible. The durable position is the one already locked by ETH_001-002:
**zero-affiliate.** Every product above earns when the user transacts — Klarna and Affirm from the
purchase itself, PocketGuard and Credit Karma from referrals. HōMI is structurally incapable of
profiting from a "yes," which lets it say a sentence none of them can: _we make the same money
either way._ Competitors would have to break their revenue model to copy it.

Everything below is how that stance gets expressed in product. It is not the source of the moat.

## 3. Decision (proposed) — triage by reversibility, not by price

**How hard a decision is to undo, not how much it costs, determines how much friction HōMI adds.**

| Reversibility       | Examples              | Mechanism                                         | Verdict? | Hard stops?           |
| ------------------- | --------------------- | ------------------------------------------------- | -------- | --------------------- |
| Undo in days        | TV, shoes, dinner out | Consequence preview, pull-only (user asks first)  | **No**   | No                    |
| Undo at a loss      | Car, vacation, laptop | Short parameterized assessment (~24–30 questions) | Yes      | Reduced set (§5)      |
| Locked in for years | Home, business        | Full 45-question assessment                       | Yes      | Full set (as shipped) |

A $2,000 sofa on a 12-month payment plan warrants **more** scrutiny than a $3,000 cash purchase,
because it cannot be unwound. Price does not capture that; reversibility does — and it adapts
across income levels with no dollar threshold for anyone to guess at.

## 4. The drift ledger — flagship surface

Small decisions are **never** judged individually. That is simultaneously the legal position
(no individualized command), the behavioral position (notification fatigue: 64% delete apps at 5+
pushes/week; ostrich effect suppresses logins after negative framing), and the honest one — a
single $400 purchase rarely decides anything.

But they accumulate, and the accumulation is invisible in every product surveyed. So HōMI stays
silent per decision and speaks in aggregate, at most weekly per the cadence law:

> "The 14 small decisions since April cost 5 weeks of runway. Without them you'd be at Almost There."

This is where the unit of account earns its place: **days of runway**, forward-looking (how long
you last without income), as distinct from _Your Money or Your Life_'s backward-looking hours of
labor already spent. Same mechanic, different denominator, different emotional register — safety
rather than guilt. Framing must satisfy the anti-shame canon: every drift readout pairs with a
build action, never a scold.

## 5. Which shipped hard stops generalize

| Hard stop               | Generalizes?            | Reasoning                                                                                                  |
| ----------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `RUNWAY_UNDER_1_MONTH`  | **Yes — universal**     | Applies to any outflow regardless of size or financing. The most decision-agnostic stop we have.           |
| `DTI_OVER_50`           | **Yes, when financed**  | A car loan or store card changes debt service exactly as a mortgage does. Meaningless for a cash purchase. |
| `CREDIT_UNDER_620`      | **Only when financing** | A gate on borrowing terms, not affordability. Irrelevant to cash; relevant to anything financed.           |
| `HOUSING_RATIO_OVER_45` | **No — home-specific**  | No analogue outside housing. Stays scoped to `home_buying`.                                                |

Structure that falls out: **one universal stop, two financing-conditional stops, per-vertical stops
layered on top.** Hard stops become a composed set rather than a fixed table of four.

## 6. Investments — carved out, not included

Purchases and investments are not the same regulatory object. Whether someone can absorb an outflow
is affordability. Whether they should buy a security is investment advice, implicating the
Investment Advisers Act — and canon states plainly that HōMI is not an RIA.

**Proposed:** investments are out of scope here and gated behind counsel review before any design
work. If an investing signal ever ships, the likely-safe shape is the same consequence framing used
for micro — "this moves $X out of your emergency fund, leaving Y months" — with no view whatsoever
on instrument, timing, or expected return. That is affordability, not advice. Counsel signs off
before build regardless.

## 7. Open questions — founder sign-off required

Numbers are deliberately absent. These are canon-level and not mine to assume.

1. **Reversibility boundaries.** What separates "undo in days" from "undo at a loss"? Return window,
   resale liquidity, financing term, or a declared mix? This replaces the dollar-threshold question
   from the earlier draft.
2. **Runway floor.** Is `RUNWAY_UNDER_1_MONTH` right as the universal floor, or does a car warrant a
   longer floor than a home given the shorter recovery window?
3. **Financing trigger.** Do financing-conditional stops fire on any financing, or above a term or
   rate threshold (0% for 12 months differs from 24% revolving)?
4. **Car-specific stops.** Does the car vertical need its own — vehicle cost vs. annual income,
   negative equity rolled from a trade-in, loan term beyond some length? Each needs a threshold.
5. **Micro prerequisite.** A consequence preview built on stale manual figures is confidently wrong,
   which is the UDAAP exposure. Does the micro tier gate on a live Plaid connection?
6. **Drift cadence and window.** Weekly or monthly? Rolling 30/90 days? What counts as "small"
   enough to enter the ledger rather than get its own assessment?
7. **Naming.** "Runway" is an existing purchase-grading product. Keep the word, or find our own?
8. **Investments.** Park entirely, or commission counsel review now?

## 8. Consequences

- **Plaid is the unlock, not more verticals.** Micro and the drift ledger are both fiction without
  live balances. This reorders the roadmap: H2 before H3.
- `ACTIVE_DECISION_TYPES` grows one vertical at a time; each requires its stop set resolved here.
- `HardStopCode` becomes a composed union. Existing codes keep names and meanings — no migration of
  persisted assessments.
- The micro tier introduces a surface returning **no score and no verdict**. Results-page disclaimer
  patterns do not transfer unchanged and need their own copy review.
- The drift ledger needs a decision-capture path — HōMI cannot aggregate choices it never saw.
  Whether that is transaction-inferred, user-logged, or both is a design question downstream of Q5.
- `DecisionType` may need values beyond the current five (a TV is none of them). Note that
  `journal_entries.decision_type` is a separate vocabulary and must not be reconciled with this one.
- Nothing here touches `lib/scoring/*`. If an option in §7 cannot be expressed through question tags
  and mappers, it is the wrong option.

## 9. Rejected alternatives

- **Leading with the metric as the moat.** Refuted by §2 — the mechanic is 34 years old, purchase
  grading already ships elsewhere, and a novelty claim is puncturable in one search. Marketing it as
  new also risks the FTC §5 exposure that governs every other claim we make.
- **Tiering by dollar amount.** Fails the sofa-vs-cash case, needs a founder-signed threshold per
  category, and does not adapt across income levels.
- **A per-vertical hard-stop table.** Works for five verticals, collapses at "any purchase."
- **One universal stop set across all tiers.** Produces `NOT_YET` on a $400 television, emptying the
  verdict of meaning where it counts.
- **Extending the home engine with per-vertical branches.** Violates frozen scoring canon and puts
  vertical logic inside the trade-secret module.
- **Folding investments in with purchases.** Different regulatory regime; moves HōMI adjacent to
  advice it has committed never to give.
