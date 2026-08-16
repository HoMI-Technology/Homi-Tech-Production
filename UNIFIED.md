# HōMI Unified

One working project that merges:

| Source | Role in this tree |
|--------|-------------------|
| **Production Next** (`safety-canon-minimal` base) | App root — auth, scoring SSOT, finance, full product |
| **Budget Planner SPA** | Ported into `/planner` + kept as `planner-spa/` (green reference) |
| **Grok workspace** | `docs/merge/screenshots` (64 PNGs) + `incoming/grok-libs` (reference only) |
| **Kimi extract** | `docs/merge/` canon + requirements |

## Run (production app)

```bash
cd homi-unified
npm install
npm run dev
# open /planner  (closed-loop five-tab Budget Planner)
# open /finance  (existing production finance surface)
```

## Run (SPA reference — already build-green)

```bash
cd planner-spa
npm install
npm run dev
```

## Canon rules (do not violate)

1. **Scorer owns truth** — only `@/lib/scoring` computes scores. Planner uses `@/lib/score` adapter (reshape only).
2. **Never port** `incoming/grok-libs/path.ts` verdict 75/55 or its second scorer.
3. **Verdict bands** 80 / 65 / 50 four-tier.
4. Bank/broker link flows stay **demo** until Plaid path is intentional.

## Layout

```
homi-unified/
  app/(product)/planner/   ← Next route for closed-loop planner
  components/planner/      ← five-tab UI
  lib/planner/             ← closed-loop libs
  lib/score.ts             ← adapter → production engine
  lib/path.ts              ← adapter → production readiness path
  store/planner.ts         ← zustand persist store
  planner-spa/             ← full Vite SPA (known-green)
  docs/merge/              ← audit, screenshots, canon extract
  incoming/                ← raw grok libs + spa sources
```

## Branch

`feat/unified-budget-planner-merge`
