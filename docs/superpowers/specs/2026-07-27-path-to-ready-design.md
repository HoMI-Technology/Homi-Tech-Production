# Path to Ready — Implementation Spec

**Status:** Approved for implementation (user: build ultra-premium, Homi standards)  
**Date:** 2026-07-27  
**Brand:** DESIGN.md + `lib/brand` + OPERATE cockpit patterns  
**Scoring SSOT:** `lib/scoring/engine.ts` — never invent verdicts

## Goal

Turn assessment verdicts (esp. `NOT_YET` / `BUILD_FIRST` / hard-stops) into a **binding-constraint path** that projects to the decision calendar and surfaces on finance + Companion — without becoming a Mint/Rocket clone.

## Non-goals (v1)

- Transaction ledger / categorization product  
- Bill negotiation or cancel concierge  
- New scoring math  
- DB migration for paths (v1 = localStorage + calendar notes marker)  
- Auto-complete from Plaid  

## Architecture

```
AssessmentResult + optional FinanceSnapshot
        ↓
lib/readiness/path.ts  →  ReadinessPath (pure)
        ↓
lib/readiness/store.ts → localStorage homi:readiness-path
        ↓
UI: Results PathToReadyCard → preview → commit
        ↓
Calendar insert events (notes include PATH_MARKER JSON)
Finance overview chips (if finance saved)
Companion context path block
```

## Types

```ts
type PathStepKind = "milestone" | "deadline" | "review";
type PathReasonCode =
  | HardStopCode
  | "PILLAR_FINANCIAL" | "PILLAR_EMOTIONAL" | "PILLAR_TIMING"
  | "NEGATIVE_CASHFLOW" | "PARTNER_ALIGNMENT" | "REASSESS"
  | "MAINTENANCE" | "READY_CELEBRATE";

interface PathStep {
  id: string;
  title: string;
  kind: PathStepKind;
  daysFromNow: number; // always ≥0; first step ≤7
  reasonCode: PathReasonCode;
  href: string; // internal route e.g. /tools/runway
  notes: string; // educational, protective voice
  fundingTarget: number | null; // dollars if known
  fundingLabel: string | null;
}

interface ReadinessPath {
  id: string;
  version: 1;
  createdAt: string; // ISO
  assessmentCompletedAt: string | null;
  verdict: Verdict;
  score: number;
  bindingConstraint: PathReasonCode | null;
  confidence: "assessment_only" | "assessment_plus_finance";
  disclaimer: string;
  steps: PathStep[]; // 0 if READY (celebrate only); else 3–7
  mode: "build" | "ready_optional";
}
```

## Algorithm (binding constraint)

1. If hardStops non-empty: order  
   `RUNWAY_UNDER_1_MONTH` → `DTI_OVER_50` → `HOUSING_RATIO_OVER_45` → `CREDIT_UNDER_620`  
   Primary = first present. Build steps only for primary then other hardStops then soft.
2. Else if `netCashFlow < 0` and finance saved: first step stabilize cash flow.
3. Else if verdict === READY: `mode: ready_optional`, 0–1 optional review step (90d), no forced homework.
4. Else BUILD_FIRST / ALMOST_THERE / NOT_YET without hard-stops: weakest pillar(s) → 3–5 steps.
5. Always end with reassess review if mode === build (≤90d).
6. Cap steps at 7. First step daysFromNow ≤ 7.
7. Never use finance defaults as user numbers (`hasSavedFinanceState`).

## Calendar commit

- Notes field:  
  `HōMI Path · <reasonCode>\n\n<notes>\n\n<!--homi-path:<pathId>:<stepId>-->`
- Title = step.title  
- kind = step.kind mapped to CalendarEventKind  
- event_date = localDateISO + daysFromNow  

## Homi UI standards

- Tokens only (navy, cyan, emerald, yellow, crimson, glass, Fraunces/Inter/JetBrains)  
- VerdictBadge / existing glass cards  
- OPERATE: one primary next move, not KPI walls  
- Protective copy — never shaming  
- Educational disclaimer near housing language  
- `prefers-reduced-motion` safe (no new scroll-jack)  
- brand-check + typecheck must pass  

## Files

| Path | Owner |
|------|--------|
| `lib/readiness/path.ts` | Core |
| `lib/readiness/store.ts` | Core |
| `lib/readiness/index.ts` | Core |
| `__tests__/readiness-path.test.ts` | Core |
| `components/readiness/PathToReadyCard.tsx` | Results agent |
| `components/readiness/PathPreview.tsx` | Results agent |
| `app/.../results/page.tsx` | Results agent (wire only) |
| `app/.../calendar/page.tsx` | Calendar agent |
| `app/.../finance/page.tsx` | Finance agent (chips only) |
| `lib/advisor/context.ts` | Companion agent |
| `__tests__/companion-context.test.ts` | Companion agent (extend) |

## Tests required

- READY → no forced steps / mode ready_optional  
- Each hard-stop produces ordered primary step + href  
- Negative cash flow gate  
- Unsaved finance → confidence assessment_only  
- Cap 7 steps; first ≤7 days  
- Notes marker round-trip helpers  

## Success (code)

- vitest green for readiness tests  
- typecheck green  
- brand-check green  
- No new off-token colors  
