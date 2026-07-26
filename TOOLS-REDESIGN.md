# HōMI Decision Lab — Tools Redesign

**Status:** Phase 1 complete on `feature/decision-lab-phase-1` — all 14 lenses refactored. Phases 2–5 designed below, not yet built.

The 14 calculators stop being isolated pages and become **lenses** on one shared,
source-labeled model of the user's financial reality — with the HōMI Companion as
the connective tissue that explains, connects, and routes. It never calculates.

---

## The problem this solves

Before this change, every tool page was a self-contained client component with
hardcoded `useState` defaults (`useState(400000)`). The user's real `FinanceState`
— already entered on `/finance`, already known to the Companion, already consumed
by the scoring engine — was invisible to every tool. Tool metadata also lived in
two places (the hub's hardcoded `GROUPS` array and each page's copy), a drift bug
waiting to happen.

A calculator's value is proportional to how much of the user's reality it starts
from and how much of the user's future it connects to. Both were zero.

## Architecture

```
SURFACE    lens pages + hub + (Phase 4) scenario comparison
COMPANION  (Phase 3) lens digest + synthesis actions — explains, never calculates
REGISTRY   lib/tools/registry.ts — one declarative contract per lens
CFM        lib/tools/cfm.ts — Canonical Financial Model (shared, source-labeled)
           deterministic only: lib/tools/*.ts, lib/finance/store.ts
```

### Canonical Financial Model (`lib/tools/cfm.ts`)

A VIEW, not a second database. Core money fields derive from the finance store;
lens-specific fields (target price, assumed rate, current rent…) live in a thin
overlay (`homi:tools-state`) written back **only on explicit user action**.

Every field carries a source label, extending the Companion spine's honesty
doctrine into the tools:

| Source | Meaning |
| --- | --- |
| `self-reported` | Entered on the finance dashboard |
| `lens-derived` | Captured inside a tool, with consent |
| `missing` | First-class signal — never imputed |

The CFM exists only when `hasSavedFinanceState()` is true. Illustrative defaults
are never presented as the user's numbers.

### Lens Registry (`lib/tools/registry.ts`)

One `LensDefinition` drives four things: the hub, CFM prefill
(`inputs[].cfmPath` / `inputs[].derive` for computed seeds like annual income),
decision chains, and (Phase 3) the Companion's lens digest. `resolveLensSeeds()`
is the pure resolver: CFM → clamped slider seeds, missing data never seeds.
Lenses are grouped by Threshold Compass ring — **Financial Reality** (cyan),
**Stability** (emerald), **Perfect Timing** (yellow) — plus Readiness.

### Impact deltas (`lib/tools/deltas.ts`)

The only place lens-impact arithmetic happens. Diffs a lens's computed monthly
obligation against saved finance state (runway + DTI, before/after,
temperature-banded). The Companion will receive these precomputed in Phase 3 and
read them — never recompute them (canon: AI explains, code calculates).

### Shared components & hooks

- `SavedNumbersStrip` — "built on your numbers, N days old" or the honest
  illustrative state with a path to `/finance`.
- `LensField` / `CalcField` — slider inputs; CFM-seeded values render a
  "your numbers" tag, fallbacks get nothing.
- `DeltasCard` — precomputed deltas; card accent follows the WORST temperature
  so a bad trade is never visually buried (radical honesty).
- `ChainLinks` — registry-driven next-lens hand-offs; routes never fabricated.
- `UpdateNumbersButton` — the explicit, always-labeled overlay write-back.
- `useCfm` / `useLensPrefill` — mount-only hydration; never fights live edits.

---

## Phases

### Phase 1 — CFM + registry + all lenses (this branch) ✅
- [x] CFM, deltas engine, registry with full input contracts, shared
      components, `useCfm` / `useLensPrefill` hooks
- [x] All 14 lenses refactored onto the pattern (mortgage = reference)
- [x] Hub rendered from the registry (hardcoded GROUPS deleted)
- [x] DeltasCards on mortgage + affordability (housing obligations);
      refinance/heloc deltas deferred — a replacement payment needs a
      different delta shape than a new obligation (Phase 2 design note)
- [x] 30+ test cases across cfm / deltas / registry suites

Known follow-ups:
- debt-payoff: itemized-debt CFM mapping (FinanceState.liabilities → debt
  rows) is a Phase 2 candidate
- mortgage page uses its own inline prefill (reference implementation);
  could adopt `useLensPrefill` for uniformity in a cleanup pass

### Phase 2 — Chains everywhere + instrumentation
PostHog events: `lens_prefilled`, `lens_delta_viewed`, `chain_followed`,
`numbers_writeback`. Success: chain follow-through >15%.

### Phase 3 — Companion lens digest + synthesis
One compact block added to `buildCompanionContext()` only when the user is on a
lens page: headline output, ≤5 rounded key inputs, precomputed deltas, and
`cfmCoverage` (the honesty dial — at low coverage the Companion must speak in
illustrative terms). "What does this change for me?" opens the dock with a
pre-seeded message; the prompt instruction is read-don't-compute, name the
largest negative delta first, magnitude bands only for readiness. Zod-validated
at `/api/advisor`; deterministic fallback via `lib/advisor/fallback.ts`.
Measure prompt token headroom before shipping.

### Phase 4 — Scenarios
`tool_scenarios` table (RLS owner-scoped), named input sets with a CFM snapshot
at save time. Staleness is displayed, not auto-refreshed — silently rewriting a
saved decision's meaning is unacceptable. Comparison view is deterministic;
the Companion summarizes on request only. Free tier: 1 scenario; Plus:
unlimited + comparison (honest 402s via `lib/entitlements.ts`). Anonymous:
local-only, labeled "browser only".

### Phase 5 — Readiness bands in lenses
`lib/simulator.ts` lever outputs → magnitude bands per lens (small / moderate /
large, never weights), deep link to the Score Simulator. CI test mirrors the
milestone voice test: bands never expose formula internals.

---

## Non-negotiables (verified for this phase)

- All math deterministic (`lib/tools/*.ts`, `lib/finance/store.ts`); AI never
  calculates.
- Missing data is a first-class signal (`missing` source, `cfmCoverage`,
  seeds never come from missing data — registry tests enforce this).
- Write-back is explicit and never touches assessment inputs or
  finance-dashboard fields.
- Educational-only disclaimers retained on every lens.
- No fake metrics: illustrative defaults are visually distinct from user data.
- SSR-safe storage access; mount-only hydration (no live-edit fights, no
  hydration mismatch).
