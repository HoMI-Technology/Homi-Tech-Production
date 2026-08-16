# HōMI Worktrees — Merge & Build Audit

**Date:** 2026-08-08  
**Action completed:** Extracted both Desktop zips into `homi-worktrees` (side-by-side; existing production worktrees untouched).  
**Canon precedence:** SHIPPED production code → CANON → SPEC → SCENARIO/LEGACY (never overrides).

---

## 1. What was merged

| Source zip | Destination | Role |
|---|---|---|
| `Kimi_Agent_HōMI Budget Planner Build.zip` (~1.1 MB) | `homi-worktrees/budget-planner-build/` | **Completed** Vite/React SPA + canon extract + planner port (claimed complete 2026-08-06) |
| `HoMI grok-workspace.zip` (~15 MB) | `homi-worktrees/grok-workspace/` | **Upstream prototype** — TanStack Start + 24 budget libs + 64 screenshots + UI components |
| *(pre-existing)* | `homi-worktrees/launch-assessment-decision-types/` | Production Next.js worktree — branch `fix/launch-assessment-decision-types` |
| *(pre-existing)* | `homi-worktrees/safety-canon-minimal/` | Production Next.js worktree — branch `fix/launch-companion-tier-copy` |

**Merge strategy used:** Side-by-side folders (not file-level overlay). The two zips are different stacks (Vite SPA vs TanStack Start vs Next.js production). A naïve overwrite would corrupt all three.

---

## 2. Inventory snapshot

| Tree | Stack | Git | node_modules | Files (approx) | Build role |
|---|---|---|---|---|---|
| `budget-planner-build/app` | Vite 7 + React Router 7 + Zustand + Tailwind 3 | No | Installed for audit | 378 (whole zip tree) | **Demo / closed-loop planner SPA** |
| `grok-workspace` | Vite 8 + TanStack Start + better-auth + PGLite | No | No | 287 + 64 screenshots | **Reference libs + visual spec** |
| `launch-assessment-decision-types` | Next 15 + Supabase + Stripe | Yes (ahead 1 / behind 31 of origin/main) | Yes | Full production | **SHIPPED product SSOT candidate** |
| `safety-canon-minimal` | Next 15 + Supabase + Stripe | Yes | Yes | Full production | **Parallel production worktree** |

### budget-planner-build layout

```
budget-planner-build/
├── app/                  # Runnable Vite SPA (the build)
│   ├── src/lib/score.ts  # Canon 4-tier scorer (80/65/50)
│   ├── src/lib/planner/* # Ported closed-loop planner libs
│   ├── src/components/planner/*  # Five-tab UI
│   ├── src/store/planner.ts
│   └── scripts/*.test.mjs
├── canon/                # Extracted GitHub scoring/brand/tools SSOT digests
├── extraction/           # 17 group digests (A–J)
├── planner-build/        # Spec + grok-lib-audit.md
├── plan.md               # STATUS: COMPLETE (2026-08-06)
└── HOMI_BUILD_*.md       # Requirements / backlog / review
```

### grok-workspace layout

```
grok-workspace/
├── src/lib/budget/*      # 24 libs (scoring, store, path, signals, …)
├── src/components/budget/*  # Full UI (ReadinessHero, BudgetCalendar, PlanCommand, …)
├── screenshots/          # 64 PNGs (visual SSOT for UI)
├── attachments/          # Calculator architecture docs + audit PDF
└── package.json          # app-builder-workspace (TanStack)
```

---

## 3. Relationship map (do not confuse these)

```
                    ┌─────────────────────────────┐
                    │  Homi-Tech-Production (Git) │  ← production SSOT
                    │  Next.js + lib/scoring/*    │
                    └─────────────┬───────────────┘
                                  │ canon port
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────────┐
│ grok-workspace   │   │ budget-planner   │   │ production worktrees │
│ TanStack prototype│──▶│ Vite SPA build   │   │ launch-assessment…   │
│ path 75/55 FLAG  │port│ path uses canon  │   │ safety-canon-minimal │
│ scoring 80/65/50 │   │ scoring 80/65/50 │   │ finance BudgetTab    │
└──────────────────┘   └──────────────────┘   └──────────────────────┘
```

- **Grok workspace** = source material for the five-tab planner (libs + screenshots).  
- **Budget planner build** = Kimi agent’s *completed* port into a local Vite app (not the Next production repo).  
- **Production worktrees** = real product; already have partial finance UI (`BudgetTab`, `BudgetCalendar`, `NudgeRail`, `SignalsStrip`, `PlanTab`) but **not** the full five-tab planner SPA.

---

## 4. Canon compliance audit

| Rule | Production engine | budget-planner `score.ts` | grok `scoring.ts` | grok `path.ts` |
|---|---|---|---|---|
| Pillars 35/35/30 | ✅ | ✅ | ✅ | n/a (separate finance scorer — **violates scorer-owns-truth**) |
| Verdict ≥80 / 65–79 / 50–64 / &lt;50 | ✅ | ✅ 80/65/50 | ✅ 80/65/50 | ❌ **75/55 three-tier** |
| 4 hard-stops | ✅ | ✅ | ✅ | partial / own model |
| HōMI brand tokens | ✅ | brand-check clean | mixed UI | mixed |
| Zero-affiliate | ✅ | SPA demo only | demo banks | n/a |

**Critical (already documented in `planner-build/grok-lib-audit.md`):**

1. **Never port** grok `path.ts` verdict thresholds (75/55) or its second scorer.  
2. Budget planner correctly binds Path to Ready to **canon** `lib/path.ts` + assessment verdict.  
3. Monte Carlo: keep canon 10 000-run defaults (grok default 2500 is FLAG).  
4. CFM: strip imputed 7%/12% horizon defaults if re-porting from grok.

---

## 5. Build verification (executed 2026-08-08)

### budget-planner-build/app

| Gate | Result |
|---|---|
| `npm install` | ✅ 490 packages |
| `npm run build` (`tsc -b && vite build`) | ✅ exit 0 (~6.6s) |
| `npm run brand-check` | ✅ clean — no violations |
| `planner-store.test.mjs` | ✅ 8/8 |
| `planner-closed-loop.test.mjs` | ✅ 5/5 |
| `planner-proactive.test.mjs` | ✅ 9 groups |
| `planner-lenses.test.mjs` | ✅ 10 groups |
| `planner-plan.test.mjs` | ✅ 8/8 |
| `planner-bank-wealth.test.mjs` | ✅ 8/8 |
| `planner-calendar.test.mjs` | ✅ 7/7 |
| `planner-overview.test.mjs` | ✅ 7 groups |
| `budget-persistence.test.mjs` | ✅ 5/5 |
| **SPA gate total** | **All green** |

**Bundle notes:** Planner chunk ~323 KB raw / ~70 KB gzip (largest app route). Main index ~461 KB / ~149 KB gzip — acceptable for SPA demo; production Next budgets differ.

### grok-workspace

| Gate | Result |
|---|---|
| Dependencies installed | ❌ not run (audit reference only) |
| Stack | TanStack Start + better-auth + PGLite + Nitro — **different product surface** |
| Screenshots | 64 files present (visual SSOT) |
| Budget UI components | Complete set under `src/components/budget/` |

### Production worktrees

| Tree | Branch | Notes |
|---|---|---|
| `launch-assessment-decision-types` | `fix/launch-assessment-decision-types` | **ahead 1, behind 31** of `origin/main` — stale vs remote |
| `safety-canon-minimal` | `fix/launch-companion-tier-copy` | Local branch; not verified against remote for this audit |

Both have `node_modules` and identical-looking `package.json` (homi-production Next 15). Full `next build` not re-run in this pass (heavy; deps already present).

---

## 6. What “complete” means for the Budget Planner zip

Per `plan.md` STATUS COMPLETE (2026-08-06):

- Five tabs: Overview / Calendar / Banks & bills / Wealth / Plan  
- Route: `/planner` (lazy)  
- Closed-loop: payBill → score impact toast  
- Canon scorer owns truth; path from assessment engine  
- Local tests: store, closed-loop, proactive, lenses, plan, bank-wealth, calendar, overview, persistence  

**This is a local SPA deliverable**, not a PR into Homi-Tech-Production. Production integration remains a separate port job.

---

## 7. Conflicts & risks if you “merge” into production

| Risk | Severity | Guidance |
|---|---|---|
| Stack mismatch (Vite SPA vs Next App Router) | High | Port components/libs into `components/finance` + `lib/*`; do not replace Next app with Vite shell |
| Dual scorers if grok path sneaks in | Critical | Production + budget-planner already correct; reject grok path scorer |
| Production already has finance surfaces | Medium | Diff against `BudgetTab` / `PlanTab` / `NudgeRail` before duplicating |
| Worktree behind main (31 commits) | High | Rebase/update `launch-assessment-decision-types` before any planner PR |
| No git in zip extracts | Medium | Treat as archive snapshots; commit intentionally if adopting |
| Grok `.grok/skills` game/auth boilerplate | Low | Ignore for product; not HōMI domain |
| Auth / Plaid / Stripe | High | SPA is demo-localStorage; production needs Supabase + existing entitlements |
| Affiliate / bank link demos | Medium | Keep as **demo latency fakes**; real linking is Plaid path with FCRA wall |

---

## 8. Recommended next steps (build path)

1. **Use `budget-planner-build/app` as the runnable planner reference** (build already green).  
2. **Use `grok-workspace/screenshots` + `src/components/budget` as visual/UX reference** when porting gaps.  
3. **Use production `lib/scoring/*` as SSOT** for any Next integration (already mirrored in SPA `score.ts`).  
4. **Do not merge trees into one folder.** Keep four siblings under `homi-worktrees/`.  
5. Before production port: update `launch-assessment-decision-types` (behind 31), invent feature branch, port planner libs under `lib/planner` + UI under `components/finance` or `app/(product)/finance`.  
6. Re-run production: `npm test`, `brand-check`, acceptance, then e2e on finance routes.  
7. Optional: re-run remaining SPA test scripts under `app/scripts/planner-*.test.mjs`.

---

## 9. Quick commands

```powershell
# SPA planner (verified)
cd "C:\Users\Quality Assurance\Desktop\homi-worktrees\budget-planner-build\app"
npm install
npm run build
npm run brand-check
node scripts/planner-store.test.mjs

# Grok prototype (reference only)
cd "C:\Users\Quality Assurance\Desktop\homi-worktrees\grok-workspace"
npm install
npm run dev   # port 8080

# Production worktree
cd "C:\Users\Quality Assurance\Desktop\homi-worktrees\launch-assessment-decision-types"
git fetch
git status
npm run typecheck
npm test
```

---

## 10. Verdict

| Question | Answer |
|---|---|
| Were the zips merged into `homi-worktrees`? | **Yes** — as `budget-planner-build` + `grok-workspace` |
| Is the Budget Planner build shippable as a demo SPA? | **Yes** — build + brand-check + store tests pass |
| Is it production Homi-Tech-Production? | **No** — separate Vite app; needs deliberate Next port |
| Is grok-workspace safe as scoring source? | **Partially** — scoring OK; **path.ts is not** (75/55) |
| Safe automatic code merge of all four trees? | **No** — keep side-by-side; port selectively |

**Bottom line:** Extraction and audit are done. The Kimi Budget Planner zip is a **complete, buildable SPA** with canon scoring. The Grok workspace is the **upstream prototype + screenshots**. Production worktrees remain the **real product** and already contain partial finance UI. Next engineering step is a controlled port from SPA → Next, not a folder merge.
