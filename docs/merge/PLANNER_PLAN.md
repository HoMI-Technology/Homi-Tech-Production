# HōMI Budget Planner Build — plan.md

**Mission:** Build the complete five-tab HōMI Budget Planner — Overview / Calendar / Banks & bills / Wealth / Plan — fully functional, into our local build at `/mnt/agents/output/app`. Spec = 63 screenshots in `/mnt/agents/upload/*.png` (two rounds) + 24 Grok workspace libs (`/mnt/agents/upload/*.ts`). Lib audit banked at `/mnt/agents/output/planner-build/grok-lib-audit.md` — follow its PORT/SKIP/FLAG verdicts exactly.

**Constraints (standing):**
- GitHub repo is READ-ONLY. All work local. Git worktree swarm on the shared repo `/mnt/agents/output/app`.
- Canon wins every conflict: verdict bands ≥80 READY / 65–79 ALMOST_THERE / 50–64 BUILD_FIRST / <50 NOT_YET (4-tier, from `src/lib/score.ts` — NEVER the Grok 3-tier 75/55); 4 hard-stops; scorer-owns-truth (no second scorer).
- Brand canon: tokens only (TEMP_HEX/TIER_HEX maps or Tailwind theme colors — no raw hex outside token maps), HōMI with U+014D macron, forbidden words lint (`scripts/brand-check.mjs` must stay clean; use SUPPRESSION_REGISTRY only for verbatim legal/canon copy with reasons).
- Verbatim footer disclaimer: "HōMI is a product of HOMI TECHNOLOGIES LLC. Educational guidance only — not financial, legal, tax, or investment advice. Bank/broker linking, Monte Carlo, and decision models are demo flows for product validation." (planner variant)
- Skip: p2p.ts, db.ts (backend), scoring/household/debt/simulate/montecarlo/categories/format (duplicates — ours are canon-correct).

**Adaptation contract:** TanStack Start → Vite/React SPA. Zustand is APPROVED as a new dependency for the planner store only (keeps the 942-line port near-verbatim; persist middleware → localStorage key `homi-planner-v1` with versioned envelope per our hardening pattern). Demo bank/broker link+sync flows stay local fake-latency demos. No auth — drop the "Sign in" button. Existing libs reused: `lib/score.ts` (engine), `lib/receipts.ts` (band-only receipts), `lib/path.ts` (canon path), `lib/tools/*` (debt, montecarlo, mortgage), `lib/household.ts`, `lib/tools/format.ts` + `lib/money.ts` (formatters).

---

## Stage 1 — Foundation (keystone, ONE agent, must merge first)
Port the data layer:
- `src/lib/planner/types.ts` — novel types from U:types.ts (Transaction, Bill, BankAccount, Holding, NetWorthItem, DebtItem, DailyCheckin, ReadinessProfile, HouseholdPartner, PathSnapshot, ScoreImpactSnapshot, BudgetState). Verdict type imported from `@/lib/score` (canon 4-tier), never 3-tier.
- `src/store/planner.ts` — zustand + persist port of U:store.ts with the EXACT action API (see audit §3), demo seed (`resetDemo`) + `clearWorkspace`, derived helpers exported from `src/lib/planner/derived.ts` (financialReality, summarize, summarizeAccounts, summarizePortfolio, totalNetWorth, upcomingBillsTotal, holding math, buildPathFinanceSnapshot, temperature fns, daysUntil/addDaysISO).
- Gate: `npm run build` green on master after merge.

## Stage 2 — Lib waves (3 parallel agents, after Stage 1 merge)
- **A2 closed-loop core** → `src/lib/planner/`: cfm.ts (strip 7/12 imputation per audit), score-bridge.ts (uses OUR lib/score.ts engine), impact.ts, closed-loop.ts.
- **A3 proactive layer** → `src/lib/planner/`: stress.ts, signals.ts, nudges.ts, digest.ts (spend digest + cashflow spark ONLY — no receipt helpers).
- **A4 lenses & voice** → `src/lib/planner/`: housing.ts (rent-vs-buy), companion.ts, brokers.ts, institutions.ts.
- Gate: build green after each merge; closed-loop unit smoke (payBill → impact with before/after score).

## Stage 3 — UI waves (4 parallel agents, after Stage 2 merge; screenshots are the visual spec — agents read the PNGs directly)
- **C1 shell + Overview**: route `/planner`, AppHeader (DECISION READINESS INTELLIGENCE / Budget Planner / tagline / Reset demo·Clear data), five-tab nav, ReadinessHero (score card + 10 tiles + pillar bars), SignalsStrip, NudgeRail, ImpactToast, OverviewCommand (30-day cash path, quick actions + next-from-score, Financial Reality gauges, pillar subscores 35/35/30, spend digest, add transaction, savings goal, spending-by-category donut, transactions list w/ edit-delete, daily check-in, export pack w/ copy summary + print/PDF + readiness receipt via lib/receipts.ts, START HONEST empty state).
- **C2 Calendar**: BudgetCalendar — month/week/agenda views, month tiles (income/spend/bills-open/net cash flow + EOM projection), projected cash runway area chart w/ daily-net bars, filter chips, day cells w/ bill chips + dots (overdue crimson/bill-due gold/spend cyan/income-paid emerald), selected-day inspector (day impact, IN/OUT/BILLS, day pressure, pay-from dropdown, add bill, log spend, bills list pay-now/schedule, ledger), upcoming bills, bottom strip, keyboard nav (M/W/A/arrows/T).
- **C3 Banks & bills + Wealth**: BankingCommand (live cash command tiles, linked accounts w/ institution metadata, demo Link bank + Sync now, cash-you-control self-entry mode, bill pay open/due-today/overdue tiles, bill cards pay-from + pay now + schedule + remove, paid banner) + BrokerPanel (demo broker link) + PortfolioPanel (holdings, marked prices, cost basis, unrealized, allocation donut) + NetWorthPanel (assets/liabilities/other/debts).
- **C4 Plan tab**: PlanCommand — sub-tabs Path / Housing / Debt / Household / Models / Share. Path: generate/regenerate/clear from live numbers via CANON `lib/path.ts` binding-constraint engine + path completion + optional 90-day review step (salvage Grok step-ideas: runway/savings/EF funding targets — onto canon engine only). Housing: rent-vs-buy lens (planner/housing.ts) w/ inputs + STRETCH/verdict chip + 5-yr comparison + break-even + warnings. Debt: avalanche/snowball via `lib/tools/debt.ts`. Household: dual readiness via `lib/household.ts` + planner partner profile. Models: Monte Carlo via `lib/tools/montecarlo.ts` (canon 10000-run default) P10/P50/P90 + survival/distress + re-roll seed; decision rehearsal via `lib/rehearsal.ts` (buy-now vs wait-12/24). Share: receipt + copy summary + export.
- Gate: each worktree builds; merge sequentially; resolve conflicts.

## Stage 4 — Integration, verification, delivery
- Wire `/planner` route (React.lazy) + Sidebar item + TopBar meta; planner store provider.
- Gates: `npm run build` ✓; `node scripts/brand-check.mjs` clean; golden vectors 9/9; differential 2000/2000 (engine untouched — regression check); persistence test for planner store (seed → mutate → reload → corrupt-backup); runtime smoke all routes incl. /planner tabs (demo parity: score 73 ALMOST, pillars 74/66/80, closed-loop toast on bill pay).
- Deliver: `website_version_manager` build_version (type static, project_dir /mnt/agents/output/app).

## STATUS: COMPLETE (2026-08-06)
- Stage 1 foundation: merged d8c3269. Stage 2 libs: proactive 673c61b, closed-loop 33e6b04, lenses ad3bf01.
- Stage 3 UI: shell+Overview 881b4e0, bank+wealth a4ee038, plan+canon-path 6e2e473, calendar 9e8808a — all merged.
- Stage 4: /planner route + Sidebar + Planner page composition wired (c671b3f). Gates: build green, brand-check clean, 9 test scripts all passing (store 8/8, closed-loop 5/5, proactive 9/9, lenses 10/10, plan 8/8, bank-wealth 8/8, calendar 7/7, overview 7/7, persistence 5/5). Browser smoke: all five tabs render with demo parity (73 ALMOST, 74/66/80, $18,720.60, $16,374.72 EOM).
- Delivered: website_version_manager build_version, version ID bd1ab4f (type static).
