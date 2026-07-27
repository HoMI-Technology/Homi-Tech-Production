# HōMI Decision Lab — Tools Redesign

**Status:** Phases 1, 3, 4, 5 complete on `feature/decision-lab-phase-1`. Phase 2 (instrumentation) partially covered — synthesis and write-back events already fire; the remaining four events are queued below.

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
SURFACE    lens pages + hub + scenario comparison (/tools/scenarios)
COMPANION  lens digest + "What does this change for me?" synthesis — explains, never calculates
REGISTRY   lib/tools/registry.ts — one declarative contract per lens
CFM        lib/tools/cfm.ts — Canonical Financial Model (shared, source-labeled)
           deterministic only: lib/tools/*.ts, lib/finance/store.ts, lib/simulator.ts
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
decision chains, and the Companion's lens digest. `resolveLensSeeds()`
is the pure resolver: CFM → clamped slider seeds, missing data never seeds.
Lenses are grouped by Threshold Compass ring — **Financial Reality** (cyan),
**Stability** (emerald), **Perfect Timing** (yellow) — plus Readiness.

### Impact deltas (`lib/tools/deltas.ts`)

The only place lens-impact arithmetic happens. Diffs a lens's computed monthly
obligation against saved finance state (runway + DTI, before/after,
temperature-banded). The Companion receives these precomputed in the digest and
reads them — never recomputes them (canon: AI explains, code calculates).

### Shared components & hooks

- `SavedNumbersStrip` — "built on your numbers, N days old" or the honest
  illustrative state with a path to `/finance`.
- `LensField` / `CalcField` — slider inputs; CFM-seeded values render a
  "your numbers" tag, fallbacks get nothing.
- `DeltasCard` — precomputed deltas; card accent follows the WORST temperature
  so a bad trade is never visually buried (radical honesty).
- `ChainLinks` — registry-driven next-lens hand-offs; routes never fabricated.
- `UpdateNumbersButton` — the explicit, always-labeled overlay write-back.
- `SaveScenarioButton` — named scenario capture with honest degradation
  (server → browser-only on 401/network failure, never silent loss).
- `ReadinessBand` — magnitude-only readiness impact, deep link to the simulator.
- `LensSynthesis` — keeps the digest fresh, dispatches the synthesis request.
- `useCfm` / `useLensPrefill` — mount-only hydration; never fights live edits.
- `useReadinessAnchors` — seeds the simulator baseline from finance state and
  anchors from the stored assessment result, mount-only.

---

## Phases

### Phase 1 — CFM + registry + all lenses ✅
- [x] CFM, deltas engine, registry with full input contracts, shared
      components, `useCfm` / `useLensPrefill` hooks
- [x] All 14 lenses refactored onto the pattern (mortgage = reference)
- [x] Hub rendered from the registry (hardcoded GROUPS deleted)
- [x] DeltasCards on mortgage + affordability (housing obligations)
- [x] 30+ test cases across cfm / deltas / registry suites

Known follow-ups:
- debt-payoff: itemized-debt CFM mapping (FinanceState.liabilities → debt
  rows)
- refinance/heloc: replacement-payment delta shape (a replacement obligation
  is not a new one)
- mortgage page uses its own inline prefill (reference implementation);
  could adopt `useLensPrefill` for uniformity in a cleanup pass

### Phase 2 — Chains everywhere + instrumentation (partial)
- [x] `lens_synthesis_clicked` / `lens_synthesis_opened` fire from Phase 3
- [ ] Remaining PostHog events: `lens_prefilled`, `lens_delta_viewed`,
      `chain_followed`, `numbers_writeback`. Success: chain follow-through >15%.

### Phase 3 — Companion lens digest + synthesis ✅
- [x] `lib/tools/digest.ts` — the contract: `LensDigest` (headline, ≤5 rounded
      key inputs, precomputed deltas, readiness), sessionStorage transport,
      page-scoped with a 30-minute staleness guard, `cfmCoverage` honesty dial
      (<50% coverage = the Companion speaks in illustrative terms)
- [x] `buildLensDigestNote` prompt block: read-don't-compute, worst news first,
      magnitude-only readiness language
- [x] `LensSynthesis` component + "What does this change for me?" — opens the
      dock pre-seeded; wired on mortgage + affordability
- [x] `/api/advisor` — Zod-validated `lensDigestSchema`; deterministic fallback
      reads the same digest, so the $0 answer can never contradict the paid one
- [x] 10 digest test cases (jsdom): guardrails, ordering, scoping, staleness

### Phase 4 — Scenarios ✅
- [x] `supabase/migrations/00036_tool_scenarios.sql` — RLS owner-scoped, jsonb
      size caps, LWW stamp. **Must be applied before server sync works; the
      button degrades to browser-only honestly until then.**
- [x] `lib/tools/scenarios.ts` — snapshot/drift/evaluate/compare, all
      deterministic; comparison matrix never calls AI; a tie is a tie
- [x] Tier cap is the honest gate (`maxScenarios`: free 1 / plus 25 / pro+
      family 100) — comparison needs ≥2, so the cap IS the comparison gate;
      402 copy says so plainly
- [x] `/api/tools/scenarios` GET/POST + `[id]` DELETE, server-side cap,
      rate-limited
- [x] `/tools/scenarios` comparison page — same-lens only, drift banners name
      exactly what changed since save (displayed, never auto-refreshed)
- [x] SaveScenarioButton wired on mortgage; hub links to the comparison page
- [x] 9 scenario test cases

### Phase 5 — Readiness bands in lenses ✅
- [x] `lib/simulator.ts` — additive `SimulateOptions.extraDebtService`, counted
      once in both DTI numerator and outflow (no double-count, backward
      compatible)
- [x] `lib/tools/readiness-bands.ts` — canonical `simulate()` run
      baseline-vs-hypothetical; `compositeBand` thresholds shared with the
      explainability engine (≤3 small, ≤9 moderate, else large); hard-stop
      crossings surfaced as their own signal
- [x] Band + direction only cross the UI/API boundary — never the composite
      delta, weights, or formulas. CI guard (`tools-readiness-bands.test.ts`)
      sweeps band thresholds against explain.ts and regex-guards every
      user-facing line for digits/weight/formula language
- [x] `ReadinessBand` + `useReadinessAnchors`; wired on mortgage + affordability;
      readiness magnitude rides the Phase 3 digest (`readinessDigestSchema`)
- [x] Neutral-anchor honesty: without a stored assessment, the band says so
      instead of pretending

---

## Merge gate

- [ ] `typecheck` / `lint` / `test` / `build` green
- [ ] Apply migration `00036_tool_scenarios`
- [ ] Manual: saved-numbers pass + incognito illustrative pass
- [ ] Manual: synthesis click on mortgage + affordability (paid and $0 paths)
- [ ] Manual: scenario save / compare / drift-banner pass

## Queued roll-outs

- Remaining lenses adopt `<LensSynthesis />` + `SaveScenarioButton` one at a time
  (token headroom measurement before digests go wide)
- refinance/heloc replacement-payment delta shape
- debt-payoff itemized-debt CFM mapping
- Phase 2 remaining PostHog events

---

## Non-negotiables (verified)

- All math deterministic (`lib/tools/*.ts`, `lib/finance/store.ts`,
  `lib/simulator.ts`); AI never calculates, invents, or overrides.
- Missing data is a first-class signal (`missing` source, `cfmCoverage`,
  seeds never come from missing data — registry tests enforce this).
- Write-back is explicit and never touches assessment inputs or
  finance-dashboard fields.
- Readiness impact is magnitude-only everywhere it appears; the CI guard
  fails if bands drift from the explainability engine or leak internals.
- Educational-only disclaimers retained on every lens.
- No fake metrics: illustrative defaults are visually distinct from user data.
- SSR-safe storage access; mount-only hydration (no live-edit fights, no
  hydration mismatch).
