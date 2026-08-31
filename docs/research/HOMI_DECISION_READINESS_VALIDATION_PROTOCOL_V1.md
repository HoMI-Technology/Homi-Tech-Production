# HōMI Decision Readiness Validation Protocol v1.0

**Status:** SPEC (research contract)  
**Date:** 2026-08-31  
**Authority:** Founder-approved build command for Evidence Engine v1.0  
**Does not override:** SHIPPED scoring weights, verdict thresholds, or FCRA wall

This document is the research contract. It defines what HōMI intends to
evaluate **before** enough data exists to tempt the company to redefine
success after seeing results.

---

## Research purpose

HōMI is evaluating whether its readiness classifications are associated
with measurable differences in post decision financial resilience, decision
stability, and reported decision quality over time.

HōMI does **not** claim to:

- predict credit default
- predict mortgage repayment
- replace FICO or any credit score
- prove causal effects from observational evidence

HōMI remains a Decision Companion. The Evidence Engine exists so the
company can answer, honestly, with denominators:

> Does a HōMI readiness verdict meaningfully tell a person whether they
> are positioned to be okay after making the decision?

---

## Primary outcome family — financial resilience

Primary validation is **change from the user's T0 baseline**, not a
single post-decision mood score.

| Measure | v1 capture | Notes |
|---|---|---|
| `financial_stress` | 1–10 self-report, optional | Subjective. Never inferred from DTI or score. Null = unknown. |
| `emergency_reserve_months` / `emergency_reserve_band` | Observed from assessment `emergencyFundMonths` at T0; self-report band at checkpoints | Bands, not raw dollars. |
| `monthly_cash_margin` / `cash_margin_band` | Unknown at T0 unless a future product decision captures it | Do not treat `savingsRate` as cash margin. |
| `payment_difficulty` | Checkpoint self-report enum | Not inferred from DTI. |
| `unexpected_expense_resilience` | Checkpoint self-report enum | |
| `material_financial_disruption` | Checkpoint enum `yes` / `no` / `unknown` | |

**Product decision (v1):** do not add a large onboarding wall. T0 stores
only values HōMI already observed on the assessment, plus explicit
unknowns. Subjective stress is collected at checkpoints; T0 stress is
null unless a later UI captures it at verdict time.

These fields are research records. They do not have to appear on public
product surfaces.

---

## Secondary outcome family — decision stability

Structured states (canonical keys; do not rename production verdicts):

```
proceeded
waited
abandoned
blocked_externally
changed_decision
overrode_verdict
reassessed
unknown
```

**Legacy taxonomy (SHIPPED, keep forever):**

```
moved
waited
lender_blocked
not_okay
no_answer
```

Compatibility map (analysis only; do not rewrite historical rows):

| Legacy `outcome` | `decision_state` |
|---|---|
| `moved` | `proceeded` |
| `waited` | `waited` |
| `lender_blocked` | `blocked_externally` |
| `not_okay` | `unknown` (quality signal, not a stability state) |
| `no_answer` | (contact = `declined`; outcome unknown) |

`assessments.user_override` remains the override cohort flag. Score and
verdict never change when it is set.

---

## Secondary outcome family — decision quality

| Measure | v1 |
|---|---|
| `decision_regret` | 1–5, optional |
| `decision_confidence` | 1–10; T0 may reuse assessment `confidenceLevel` (observed self-report) |
| `would_make_same_decision_again` | `yes` / `no` / `unsure` / unknown |
| `perceived_financial_strain` | alias of checkpoint `financial_stress` |
| `priority_disruption` | `yes` / `no` / `unknown` |
| `satisfaction` | 1–5, **kept** for product calibration compatibility |

**Satisfaction is not the primary definition of whether a verdict was
correct.** It is a secondary, biased, self-report instrument.

---

## Measurement checkpoints

| Label | Meaning | Storage |
|---|---|---|
| T0 | Verdict time baseline | `assessment_outcome_baselines` + immutable snapshot |
| T30 | Approximately day 30 | `outcome_surveys.kind = day30` |
| T90 | Approximately day 90 | `outcome_surveys.kind = day90` |
| T365 | Approximately day 365 | `outcome_surveys.kind = day365` |

The system **preserves actual timestamps** (`completed_at`, `due_at`,
`captured_at`, event `occurred_at`). Labels are analysis convenience
only. Do not replace timestamps with labels.

---

## Cohorts

Machine verdict keys stay `READY` · `ALMOST_THERE` · `BUILD_FIRST` ·
`NOT_YET` (badge: DO NOT PROCEED).

Minimum analysis slices:

- READY proceeded / READY did not proceed
- ALMOST_THERE proceeded / ALMOST_THERE waited
- BUILD_FIRST proceeded / BUILD_FIRST waited / BUILD_FIRST reassessed
- NOT_YET proceeded / NOT_YET waited / NOT_YET reassessed
- Override cohort / non-override cohort
- Wait then reassess
- Wait then READY then proceed (lineage)

---

## Counterfactual limitation (permanent)

Users who comply with a recommendation to wait do not reveal the outcome
they would have experienced had they proceeded.

Users who override a verdict are self-selected.

**Differences between overriders and compliers cannot automatically be
interpreted as causal effects of following HōMI.**

This sentence is not optional copy. It belongs in every research
handoff and every internal dashboard that shows a “readiness dividend.”

---

## Response bias

Survey responders may differ systematically from nonresponders.

The Evidence Engine tracks:

```
eligible
contact_attempted
delivered
started
completed
declined
unsubscribed
unreachable
```

`opened` is **not** a v1 metric. Email open tracking is unreliable under
privacy controls. Do not fake it.

Analysis must report **count and rate**. Do not publish outcome
percentages without a denominator.

---

## Missing data

| Situation | Treatment |
|---|---|
| Missing baseline field | `unknown` / NULL. Never backfilled from later answers. |
| Missing checkpoint | Eligible but not completed. Not a negative outcome. |
| Partial survey | Store answered fields; unanswered stay NULL. Completeness flag via `completed_at`. |
| Unreachable / unsubscribed | Contact state only. Outcome unknown. |
| Declined (`no_answer`) | Declined contact. Outcome unknown. |
| Legacy rows | Satisfaction-only or taxonomy-only rows remain valid. New fields NULL. |

Missing responses must **never** be treated as positive or negative
outcomes.

Never infer missing historical T0 values and present them as observed.

---

## Versioning

Every assessment used for research is attributable to an opaque
`scoring_schema_id` captured at verdict time
(`readiness-engine-public-v1` at ship).

This identifier is **not** a formula, weight table, or curve. Proprietary
implementation stays in `lib/scoring/*` (`server-only`).

Also stored: baseline schema version, survey response schema version,
checkpoint kind.

If scoring logic later changes, **historical verdicts stay frozen**.
New assessments get a new opaque schema id. Old rows are not rewritten.

---

## Validation hierarchy

### Level A — internal product telemetry

Useful for product iteration. Not suitable for public predictive claims.

Includes the existing `get_readiness_calibration()` RPC (k-anonymity
floor of 5; satisfaction-by-verdict association).

### Level B — internal validation analysis

Larger cohorts. Prespecified analysis. Confidence intervals only when
the sample and method support them. Attrition reporting. Sensitivity
analysis. Still observational.

### Level C — external or independent validation

Suitable methodology. Independent review where appropriate.

**Only Level C can support major external predictive claims** unless
qualified experts approve otherwise.

A five-response cohort cannot support external claims. The product UI
minimum of 5 is a **privacy floor**, not a validation threshold.

---

## Kill criterion

HōMI will reconsider predictive positioning if adequately powered
validation fails to demonstrate a meaningful and reproducible association
between readiness classifications and the prespecified **primary**
outcomes (financial resilience deltas), not whichever secondary metric
looks best after the fact.

Exact statistical and practical significance thresholds must be approved
and frozen **before** public validation begins.

This protocol **prohibits** retroactively selecting whichever outcome
happens to look best.

A fake precise numerical threshold is not invented here.

---

## Survey design (bias control)

Ask what happened. Do not ask whether HōMI was right.

Ask: “Did you proceed with the decision?”  
Not: “Did you follow HōMI’s advice?”

Ask: “Compared with when you made the decision, how financially
stretched do you feel today?”  
Not: “Did the decision hurt you financially?”

Never: “Did HōMI correctly warn you?” / “Was the verdict accurate?”

AI must not grade whether an outcome was good or bad when structured
data exists. Structured fields are research ground truth.

---

## Counsel flags (not legal conclusions)

- Outcome data is sensitive. FCRA wall still applies: never furnish
  readiness or outcome records for lending, employment, or housing
  eligibility.
- Public predictive claims are a counsel + Level C matter.
- Partner-facing outcome summaries are out of v1 scope.
