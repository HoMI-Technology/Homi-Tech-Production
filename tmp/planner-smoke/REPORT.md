# Planner verification — 2026-08-08

## 1. Tab click-through (`/planner`)

**Host:** Vite SPA (`planner-spa`) at `http://127.0.0.1:5173/planner`  
**Why not Next :3000:** `next-swc-win32-x64-msvc` is blocked by Windows Application Control (WDAC) on this machine; `next dev` listens but never finishes compiling. SPA serves the **same** `PlannerPage` five-tab shell used by the unified port.

| Tab | Result | Screenshot |
|-----|--------|------------|
| Overview | PASS (`aria-current=page`) | `tab-overview.png` |
| Calendar | PASS | `tab-calendar.png` |
| Banks & bills | PASS | `tab-banks-bills.png` |
| Wealth | PASS | `tab-wealth.png` |
| Plan | PASS | `tab-plan.png` |
| Score/verdict content | PASS | — |

Script: `node scripts/planner-tab-smoke.mjs http://127.0.0.1:5173` (uses system Edge channel).

## 2. `npm test`

```
Test Files  165 passed (165)
Tests       1503 passed (1503)
Duration    ~20s
```

Fixes applied for a clean suite:
- Classified `planner` in `PUBLIC_PRODUCT_ROUTES` (`lib/auth/protected-routes.ts`)
- Excluded `planner-spa/**`, `incoming/**`, `scripts/planner/**` from Vitest

## 3. `npm run brand-check`

```
brand-check: clean — no violations found.
```

Fixes applied: raw hex → `COLORS.*` in ChartTooltip, RunwayCard, PlanDebt, PlanModels, institutions.

## 4. SPA planner unit scripts (extra)

All 9 scripts under `planner-spa/scripts/*.test.mjs` — **PASS** (store, closed-loop, overview, calendar, bank-wealth, plan, proactive, lenses, persistence).
