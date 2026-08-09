# HōMI Decision Lab — Tools Redesign

**Status:** COMPLETE on `feature/decision-lab-phase-1`. All 14 lenses wired end-to-end: CFM prefill, Companion digest + synthesis, scenarios, and (where a monthly obligation exists) impact deltas + readiness magnitude bands. Phase 2 instrumentation live.

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

| Source          | Meaning                              |
| --------------- | ------------------------------------ |
| `self-reported` | Entered on the finance dashboard     |
| `lens-derived`  | Captured inside a tool, with consent |
| `missing`       | First-class signal — never imputed   |

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

The only place lens-impact arithmetic happens, in two non-interchangeable shapes:

- `computeHousingDeltas` — a NEW obligation (optionally replacing rent).
- `computeReplacementDeltas` — an EXISTING obligation swapped for a new one
  (refinance). Only the difference moves runway/DTI, and the replaced amount is
  capped at the user's actual outflow so relief is never flattered.

The Companion receives these precomputed in the digest and reads them — never
recomputes them (canon: AI explains, code calculates).

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

### Phase 2 — Chains everywhere + instrumentation ✅

- [x] `lens_prefilled` (useLensPrefill + mortgage's inline reference prefill)
- [x] `lens_delta_viewed` (DeltasCard, once per mount, with lens + worst
      temperature attribution)
- [x] `chain_followed` (ChainLinks, from/to paths)
- [x] `numbers_writeback` (UpdateNumbersButton + mortgage's inline write-back)
- [x] `lens_synthesis_clicked` / `lens_synthesis_opened` (Phase 3)
- Success metric to watch: chain follow-through >15%.

### Phase 3 — Companion lens digest + synthesis ✅

- [x] `lib/tools/digest.ts` — sessionStorage transport, page-scoped, 30-minute
      staleness guard, `cfmCoverage` honesty dial (<50% = illustrative voice)
- [x] `buildLensDigestNote` prompt block: read-don't-compute, worst news first,
      magnitude-only readiness language
- [x] `/api/advisor` — Zod-validated; deterministic fallback reads the same
      digest, so the $0 answer can never contradict the paid one
- [x] **Live on all 14 lenses.** Headline choices are deliberate:
      blind-budget leads with the worst-case end of the band; monte-carlo with
      the median (a plan that only works at P90 is riding the market);
      debt-payoff publishes only once a real comparison exists.
- [x] Prompt headroom guard: maximal legal digest (5 inputs, protective
      deltas, hard-stop readiness, full coverage) must stay ≤2,000 chars
      (~500 tokens) for the note and ≤1,000 chars for the fallback — CI
      tripwire against prompt bloat.

### Phase 4 — Scenarios ✅

- [x] `supabase/migrations/00036_tool_scenarios.sql` — RLS owner-scoped.
      **Must be applied before server sync works; degrades to browser-only
      honestly until then.**
- [x] Tier cap is the honest gate (`maxScenarios`: free 1 / plus 25 / pro+
      family 100); 402 copy says so plainly
- [x] `/tools/scenarios` comparison page — same-lens only, drift banners name
      exactly what changed since save (displayed, never auto-refreshed)
- [x] **Live on all 14 lenses.** Refinance scenarios evaluate with the
      replacement shape (swap, never stack); apr-compare flattens all three
      offers so a saved scenario reproduces the full comparison; debt-payoff
      saves deterministic aggregates (count, total, weighted APR).

### Phase 5 — Readiness bands in lenses ✅

- [x] `lib/simulator.ts` — additive `SimulateOptions.extraDebtService`, counted
      once in both DTI numerator and outflow
- [x] `compositeBand` thresholds shared with the explainability engine; CI
      guard sweeps alignment and regex-guards every user-facing line for
      digits/weight/formula language
- [x] **Live on all 7 obligation-producing lenses**: mortgage, affordability,
      rent-vs-buy, heloc, refinance (replacement frame), apr-compare (winning
      offer), loan-programs (cheapest program). Savings/horizon lenses carry
      no band by design — a plan is not a payment.

### Debt-payoff itemized CFM mapping ✅

- [x] Rows seed from finance-dashboard liabilities: real names and balances;
      apr/minPayment deliberately left at zero (needs-your-input) because the
      dashboard doesn't store them. An honesty banner says exactly which
      fields are real. Extra payment seeds from actual positive cash flow.

---

## Merge gate

- [x] `typecheck` / `lint` / `test` / `build` green — CI green on #111 and on
      `main` through 44fee8d
- [x] Apply migration `00036_tool_scenarios` — applied to production; table,
      RLS, and `tool_scenarios_user_idx` all verified present
- [x] Manual: saved-numbers pass + incognito illustrative pass across several
      lenses (not just mortgage) — verified on mortgage + runway. Seeded fields
      carry the "your numbers" tag; fields with no CFM data (all `housing.*`
      on mortgage) correctly fall back untagged. Empty-storage origin shows the
      "These are illustrative numbers" banner with no tags anywhere.
- [ ] Manual: synthesis click on a housing lens and a non-housing lens
      (paid + $0 paths) — button renders on both; the click itself (which sends
      a Companion message) is still unexercised
- [ ] Manual: scenario save / compare / drift-banner pass (mortgage +
      refinance swap evaluation) — compare needs two saved scenarios, i.e. a
      write to a real account; not yet exercised
- [x] Manual: readiness band **without** a stored assessment — mortgage renders
      "LARGE SHIFT DOWN" plus the "No assessment on file — this uses neutral
      placeholders" honesty note
- [ ] Manual: readiness band **with** a stored assessment

## Queued after merge

- Prompt token headroom measurement against the production system prompt
  (the CI guard bounds the digest block; total-prompt measurement is a
  deploy-time check)
- Mortgage page could adopt `useLensPrefill` for uniformity (cleanup only —
  its inline reference implementation is event-equivalent)
- Watch Phase 2 funnels; tune chain pitches against follow-through

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
- Replacement deltas never stack obligations, and never claim relief beyond
  the user's actual outflow (cap test enforced).
- Educational-only disclaimers retained on every lens.
- No fake metrics: illustrative defaults are visually distinct from user data.
- SSR-safe storage access; mount-only hydration (no live-edit fights, no
  hydration mismatch).
