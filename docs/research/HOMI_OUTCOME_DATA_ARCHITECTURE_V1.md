# HōMI Outcome Data Architecture v1.0

**Status:** SPEC implemented additively in `20260831000001_evidence_engine.sql`  
**Date:** 2026-08-31  
**Depends on:** Validation Protocol v1.0

Translates the research contract into data requirements. Two layers:

1. **Immutable historical state** (what HōMI knew and said at T0)
2. **Longitudinal outcome state** (what happened later)

Do not collapse history into the latest assessment.

---

## 1. Immutable decision snapshot

Reuse `lib/outcomes/decision-snapshot.ts`. Do not duplicate the type.

Stored on `assessments.insights.decisionSnapshot` (SHIPPED) and extended
with `scoring_schema_id`.

Required concepts:

| Concept | v1 location |
|---|---|
| `assessment_id` | snapshot `decision_id` + row id |
| `user_id` | `assessments.user_id` |
| `decision_type` | `assessments.decision_type` |
| `verdict` | snapshot + `assessments.verdict` (never rewritten by surveys) |
| `readiness_signal` | snapshot score + verdict (not a second score) |
| timestamps | `assessments.created_at`, `completed_at`, snapshot `timestamp` |
| `scoring_schema_id` | opaque public id, also on the assessment row |
| pillar **state** snapshot | `assessments.sub_scores` (earned points already shown in UI) |
| hard-stop state | snapshot `hardStops` |
| provenance | snapshot `provenance` (self_report vs verified) |

Do **not** store pillar weights, curves, or hidden factors.

v1 snapshots every completed assessment (home and car). Historical home
snapshots remain valid.

---

## 2. Baseline state (P0)

Table: `assessment_outcome_baselines`

One row per assessment. Insert-only for authenticated owners. No UPDATE
policy. Account deletion cascades via `profiles(id)` /
`assessments(id)`.

| Column | Type | Rule |
|---|---|---|
| `assessment_id` | uuid PK | FK cascade |
| `user_id` | uuid | must match assessment owner |
| `captured_at` | timestamptz | actual time |
| `schema_version` | text | `outcome-baseline-v1` |
| `scoring_schema_id` | text | opaque |
| `financial_stress` | smallint 1–10 | NULL unless explicitly captured |
| `emergency_reserve_band` | constrained text | derived from observed months |
| `cash_margin_band` | constrained text | NULL in v1 (not silently inferred) |
| `payment_difficulty` | constrained text | NULL at T0 |
| `unexpected_expense_resilience` | constrained text | NULL at T0 |
| `decision_confidence` | smallint 1–10 | observed from `confidenceLevel` |
| `decision_intent` | constrained text | `unknown` unless captured |

Derived T0 bands (conservative product decision):

| Months of reserve | Band |
|---|---|
| unknown / missing | `unknown` |
| < 1 | `under_1` |
| 1–2.99 | `1_to_3` |
| 3–5.99 | `3_to_6` |
| ≥ 6 | `6_plus` |

Never invent a baseline for assessments completed before this migration.
Those rows simply have no baseline.

---

## 3. Outcome checkpoint

Existing table `outcome_surveys` (00010 + 00012 + 00022 + push
migration). **Keep** `satisfaction`, `outcome`, `notes`, `completed_at`,
`notified_at`, `kind`, `due_at`.

Additive columns (all nullable except contact default):

- `contact_state` (funnel; default `eligible`)
- `started_at`, `declined_at`
- `response_schema_version`
- structured resilience / quality fields listed in the protocol
- `decision_state`

Checkpoints remain `day30` / `day90` / `day365`. Unique
`(assessment_id, kind)` where `assessment_id` is present, so a persist
plus an override cannot double-create the same checkpoint without first
clearing incomplete rows (existing override behavior).

### Contact events

Table: `outcome_survey_events`

Append-only funnel facts: `eligible`, `contact_attempted`, `delivered`,
`started`, `completed`, `declined`, `unsubscribed`, `unreachable`.

Channel: `email` | `push` | `in_app` | `system`.

**No answer payloads. No notes. No financial values.**

Opens are not stored.

---

## 4. Cohort lineage

Minimum additive fields on `assessments`:

- `previous_assessment_id` uuid NULL FK → `assessments(id)` ON DELETE SET NULL
- `reassessment_reason` text NULL
- `scoring_schema_id` text NOT NULL default `readiness-engine-public-v1`

A trigger rejects cross-user lineage (previous row must share `user_id`,
and must not be the same id).

This supports:

```
assessment A  BUILD_FIRST  waited
assessment B  previous=A   READY  proceeded
day30 / day90 / day365 on B
```

A remains historical. Surveys never update A’s score or verdict.

No `decision_episode_id` in v1. Sequences are reconstructed from
`previous_assessment_id` plus timestamps. Add an episode id later only
if reconstruction proves insufficient.

---

## 5. Product calibration vs research validation

| Layer | Mechanism | Use |
|---|---|---|
| Product calibration | SHIPPED `get_readiness_calibration()` | Internal UI. Satisfaction × verdict. k ≥ 5. Association, not proof. |
| Research validation | `lib/outcomes/research-metrics.ts` | Sample size, response rate, checkpoint, verdict, missingness, schema id, decision type. No p-values unless a later method lands. |

Readiness Dividend remains an **internal directional** helper with min
cohort 5. Presentation must not be readable as formal validation.

---

## 6. Privacy and deletion

- FORCE RLS on new tables.
- Owner policies only (`auth.uid()`).
- Service role is server-only (cron).
- Sensitive values never go to PostHog (occurrence labels only, same
  contract as `captureServerEvent`).
- Notes never logged.
- Account delete: `ON DELETE CASCADE` from `profiles` / `assessments`
  (existing `app/api/account/delete` path).

---

## 7. What this architecture refuses

- Rewriting historical verdicts when scoring changes
- Backfilling unknown T0 values from later surveys
- Treating missing as `not_okay`
- Storing weights in outcome tables
- A public “HōMI is X% accurate” dashboard
