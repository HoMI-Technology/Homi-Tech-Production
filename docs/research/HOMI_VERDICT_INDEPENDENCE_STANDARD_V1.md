# HōMI Verdict Independence Standard v1.0

**Status:** CANON (company and engineering control)  
**Date:** 2026-08-31  
**Related:** ETH_001–002 zero-affiliate (one-way door, 2026-08-05)

---

## Principle

> **No commercial relationship may alter a HōMI readiness verdict,
> readiness signal, scoring input, scoring threshold, or explanation.**

HōMI remains a Decision Companion unless a future legal **and** product
decision formally expands its role.

This file is not a legal opinion. Regulated use cases are flagged for
qualified counsel.

---

## Technical rules

The scoring layer (`lib/scoring/*`, `/api/scoring`, `/api/assessments`
score computation) must not consume:

```
affiliate payout
referral payout
partner ranking
partner commission
advertising economics
conversion probability
lender economics
agent economics
sponsored placement
```

`AssessmentInputs` is the only input surface. Commercial systems may
**read** a verdict after it has been calculated, where legally
appropriate (partner receipts, dashboards). They must not write back
into scoring.

Attribution / partner invite refs may be stored on the assessment row
for B2B analytics. They are occurrence data. They are not scoring
inputs.

---

## Audit requirement

After any commercialization change (pricing, partner programs, ads,
checkout copy, entitlements), engineering must inspect verdict
**distribution** for unusual shifts.

A shift is not proof of contamination. It is a trigger to verify that
no commercial field entered `computeScore`.

The Evidence Engine’s opaque `scoring_schema_id` lets later analysis
slice by engine generation. It does not license rewriting old verdicts.

---

## Counsel flags (not conclusions)

Do not make legal classifications from this file about FCRA, ECOA,
mortgage regulation, or securities law.

Flag for qualified counsel before:

- furnishing readiness or outcome data to a lender, employer, or
  landlord
- marketing “accuracy,” “predicts default,” or “improves your credit”
- any paid service that could be read as credit repair (CROA)

User consent is not a safe harbor for FCRA furnishing.

---

## Test pin

`__tests__/verdict-independence.test.ts` greps scoring input types and
the engine module for the forbidden commercial field names, and asserts
outcome writes never patch `assessments.score` / `verdict`.
