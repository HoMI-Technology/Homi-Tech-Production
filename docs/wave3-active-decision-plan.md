# Wave 3 — Active-decision homebuying vertical slice

**Status:** Plan only. No implementation started.
**Base:** `integration/wave2-reconciled` (PR #126)
**Author date:** 2026-08-02

The goal: one connected homebuying decision a user can create, feed with evidence, calculate
against, correct, and re-run — where "what changed" is answerable from versioned records rather
than from prose. Ending with a Playwright journey that needs no manual database setup.

---

## 1. What already exists

This is not greenfield. The audit below is what the slice must build **on**, not around.

| Capability | Where it lives | State |
|---|---|---|
| Deterministic scoring | `lib/scoring/engine.ts:677` — `computeScore(inputs): AssessmentResult` | **Authoritative. Must not change.** |
| Readiness snapshot | `assessments` table (`00002_tables.sql:29`) | Point-in-time; already carries `decision_type`, `verdict`, three pillar scores, `inputs`, `sub_scores`, `hard_stops` |
| Path to Ready | `user_readiness_path` (`00038`) | One row per user, jsonb, LWW via `client_updated_at` |
| Saved scenarios | `tool_scenarios` (`00036`) | Per-lens inputs **plus `cfm_snapshot` as a staleness anchor** |
| Calculator registry | `lib/tools/registry.ts` | Lens definitions, inputs, `writeBack`, chains, `resolveCarryWrites` |
| Cross-lens state | `user_tools_overlay` (`20260802000003`) | LWW server sync, owner-only RLS |
| Household participants | `households`, `household_members`, `household_invites` (`00039`) | Exists; authorization fixed in `20260802000001` |
| Decision Rehearsal inputs | `lib/decisions/state.ts` | **localStorage only** — no server persistence |
| Retrospective journal | `decision_journal` (`00002_tables.sql:68`) | A reflective log. **Not** an active decision |
| Explainability | `lib/advisor/explain` | Produces the "what changed" one-liner |

### Two patterns to follow, not reinvent

1. **Local-first + LWW sync** (`client_updated_at`) — used by `user_readiness_path`,
   `tool_scenarios`, `user_tools_overlay`. Any new persistence should match it.
2. **Snapshot-as-staleness-anchor** — `tool_scenarios.cfm_snapshot` records the financial model at
   save time so the row can later be judged stale. This is exactly the provenance/freshness
   primitive Wave 3 needs; generalize it rather than invent a parallel scheme.

---

## 2. The gap

**There is no `decisions` table.** That is the core finding.

`assessments` is a *snapshot*, one row per completed assessment, keyed to a user. Nothing owns a
decision across time, so today there is no place to hang:

- a goal and time horizon
- which participants are attached and what they authorized
- which evidence was used, from what source, how fresh, and what was missing
- an ordered history of readiness results for **this** decision
- the binding constraint, next action, and reassessment date as first-class state
- correction history — what the user changed and when
- the versioned consumer readiness state a Receipt would later reference

Everything else in the journey has a component that already works. The missing piece is the spine
that connects them.

---

## 3. Proposed architecture

Three new tables. Deliberately additive — no existing table changes shape, so nothing already in
production is disturbed.

### `decisions`
The spine. One row per active decision.
- `id`, `user_id`, `household_id` (nullable — couples come free via existing tables)
- `decision_type` (default `home_buying`, matching `assessments.decision_type`)
- `goal` text, `time_horizon_months` int
- `status` — `active` / `paused` / `resolved` / `abandoned`
- `reassess_at` date
- timestamps + `client_updated_at` for LWW consistency with existing tables

### `decision_evidence`
What the decision knows, and how much that is worth.
- `decision_id`, `kind` (income / savings / debt / credit / emotional / timing)
- `source` — `user_entered` / `plaid` / `derived` / `imported`
- `provenance` jsonb, `observed_at` timestamptz (**freshness lives here**)
- `value` jsonb, `is_missing` boolean, `confidence` / `uncertainty`
- `superseded_by` self-reference — corrections become a chain, not an overwrite

### `decision_snapshots`
Versioned readiness for this decision.
- `decision_id`, `version` int (monotonic per decision)
- `assessment_id` → the existing `assessments` row, so scoring output stays where it lives
- `evidence_ids` — exactly which evidence produced this result
- `binding_constraint`, `next_action`, `scenario_assumptions` jsonb
- `result_id` — stable, referenceable identifier

**"What changed" becomes a diff of two `decision_snapshots` rows** — derived from stored evidence
and result ids, not from model prose. That is the requirement the whole wave turns on.

---

## 4. Hard constraints

- **Scoring is untouchable.** `computeScore()` keeps sole authority over score and verdict.
  Wave 3 adds *context around* results; it must not alter weights, thresholds, verdict behavior,
  or compatibility. Any scoring change is a separate scope with its own approval.
- **AI may explain, never calculate.** Snapshots are written by deterministic code only.
- **Emotional Truth stays private by default** and must never enter a business-facing payload
  (see Wave 6 / `20260802000002`).
- **No new top-level directory.** Everything fits under existing `lib/`, `app/`, `supabase/`.
- **Migrations are authored, never auto-applied.** The ledger is diverged (139 remote vs 42 local,
  correlating only through `00006`); `supabase db push` must never be run against this project.
- **Timestamp migration naming**, per the convention set on 2026-08-02.

---

## 5. Phases

Each lands as its own reviewable PR. Later phases assume earlier ones merged.

**3.1 — Schema + RLS.** The three tables, owner-scoped RLS, household-scoped read where a
participant is attached. Local RLS tests proving anonymous, cross-user, and cross-household denial.
*Requires Docker or a staging database — currently blocked.*

**3.2 — Decision lifecycle.** Create/select/pause a decision; set goal and horizon. Server routes
with Zod validation. Replaces `lib/decisions/state.ts`'s localStorage-only persistence with the
LWW pattern used elsewhere, preserving existing local data on first sync.

**3.3 — Evidence + freshness.** Attach evidence with provenance and `observed_at`; surface missing
and stale items. Generalize the `cfm_snapshot` staleness idea into `decision_evidence`.

**3.4 — Deterministic run + snapshot.** Run the existing lenses (runway, payment stress,
affordability), persist structured results, write a `decision_snapshots` row referencing the
`assessments` row. Binding constraint and next action derived deterministically.

**3.5 — Correction and re-run.** User edits evidence → new evidence row supersedes the old →
new snapshot. Verdict may move only because deterministic inputs moved.

**3.6 — "What changed".** Diff two snapshots by evidence and result ids. This is where the wave
either proves itself or doesn't.

**3.7 — E2E journey.** Playwright: create → evidence → run → BUILD FIRST → correct → re-run →
ALMOST THERE → explain the delta → set reassessment. No manual DB setup.

---

## 6. Decisions needed before 3.3

1. **Evidence retention.** How long is superseded evidence kept? This is the same unanswered
   retention policy that blocks Plaid deletion work. Not inventable.
2. **Household evidence visibility.** Can a partner see the other's raw evidence, or only its
   contribution to the joint result? Emotional Truth is private by default — does that extend to
   income and debt?
3. **Reassessment cadence.** Fixed (e.g. 30 days), horizon-derived, or user-set?

Phases 3.1–3.2 do not depend on these and can proceed.

---

## 7. Test contract

- RLS: anonymous denial, cross-user denial, cross-household denial
- Evidence: missing, stale, superseded chains, unit/currency correctness
- Snapshots: monotonic versions, stable result ids, correct evidence linkage
- Scoring untouched: existing scoring fixtures byte-identical before and after
- "What changed": derived only from stored records — a test asserting no model text is involved
- E2E: the full journey, unseeded

---

## 8. Honest risk

The largest risk is not technical. It is that Wave 3 is where HōMI's product claim becomes
literally true — "decision-specific and time-specific" only means something once a decision is a
real object with a history. A partial slice that stores a decision but cannot answer "what
changed" from records would be worse than not starting, because the UI would imply a rigor the
data doesn't have.

Phase 3.6 is therefore the acceptance gate, not phase 3.7.
