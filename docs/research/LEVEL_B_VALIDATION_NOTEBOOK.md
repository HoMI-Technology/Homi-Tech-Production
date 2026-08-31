# Level B validation notebook (internal)

**Status:** SPEC / internal analysis only  
**Date:** 2026-08-31  
**Not for publication.** Not Level C. Not a public accuracy claim.

Run **after** `20260831000001_evidence_engine.sql` is applied. Empty
result sets are honest: they mean no eligible rows, not a 0% failure rate.

---

## What this notebook answers

| Question | Output |
|---|---|
| How many checkpoint rows exist? | `sample_size.checkpoint_rows` |
| How many surveys were completed? | `sample_size.completed_surveys` |
| How many T0 baselines exist vs are missing? | `baselines_present` / `baselines_missing` |
| What is the completion rate? | `completed / eligible` (null if eligible = 0) |
| Rate by checkpoint and verdict? | same shape, split |
| How much is missing? | observed / missing / missing_rate per field |

It does **not** answer: “Does HōMI cause better outcomes?”  
It does **not** compute p-values.  
It does **not** treat declined, unsubscribed, or NULL as a bad outcome.

Permanent counterfactual (protocol v1.0): users who wait do not reveal
the outcome they would have had if they had proceeded. Overriders are
self-selected.

---

## How to run

SQL is in `docs/research/level-b-validation-queries.sql`.

Against a **linked** project (owner):

```powershell
Get-Content -Raw docs/research/level-b-validation-queries.sql |
  npx supabase db query --linked
```

Do not pipe production dumps into analytics tools. Do not put field
values in PostHog.

Shape the SQL result with `levelBNotebook()` in
`lib/outcomes/research-metrics.ts` if you want the JSON contract the
unit tests pin.

Privacy floor: do not share a slice with n < 5 outside the operator.

---

## Field missingness (v1 expected)

| Field | T0 | Checkpoints |
|---|---|---|
| `emergency_reserve_band` | often observed | optional |
| `decision_confidence` | often observed | optional |
| `financial_stress` | usually missing by design | optional |
| `cash_margin_band` | unknown by design | optional |
| `payment_difficulty` | unknown at T0 | optional |

High missingness on subjective T0 fields is **expected**, not a defect.

---

## Kill / freeze reminder

Exact statistical and practical significance thresholds are **not**
frozen here. Freeze them before any public validation. Do not pick the
prettiest secondary metric after seeing results.
