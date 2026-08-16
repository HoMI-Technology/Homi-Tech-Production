# Extraction J3 — HōMI Finance Engines (Batch B: Suite/Ultimate/v4/Production/Master/Educational/Website)

Scope: 7 full reads + 6 quick diffs. Complements `A-finance-engines.md` (WELLNESS/PRO/UNIFIED/MASTER-15calc set). Existing build to avoid re-tagging: Readiness score (35/35/30), budget dashboard, transactions, investments, goals & analytics.

## 0. QUICK DIFFS (twins)

| File | Result |
|---|---|
| `homi-finance-v2-unified(1).html` | **byte-identical** (md5) to `homi-finance-v2-unified.html` — already extracted in digest A ("UNIFIED"). No action. |
| `HoMI_Finance_Complete_v2(1).html` | **byte-identical** to twin. No action. |
| `HoMI_Financial_Wellness_Engine_Production(1).html` and `(2).html` | **byte-identical** to twin (digest A "WELLNESS"/"PRO" lineage). No action. |
| `HoMI_Finance_Master_Corrected(1).html` | **byte-identical** to twin. No action. |
| `HoMI_Finance_Complete_Rebuild_Prompt(1).md` | **byte-identical** to twin. No action. |
| `HōMI_Master_Finance_Web_App.html` | **byte-identical to `v1.4.html`** (both 104,908 B). Read in full — see §6. |

## 1. VERSION LINEAGE — which is newest / most complete

Two independent product lines, plus a mobile reboot:

1. **Home-decision suite line**: `HoMI_Finance_Complete_Suite.html` (14 home calculators, 2,559 lines) → `HoMI_Finance_Website_Production.html` (2,361 lines). Website_Production's JS is **functionally identical** to Complete_Suite (diff shows only minification/whitespace + tab-class rename); it adds polished chrome: compass-with-keyhole logo, hero ("Complete Decision Suite" / "Know if you're ready before you decide"), footer ("A Decision Companion", "Decision Readiness Intelligence™", HōMI.com • Info@HōMI.com). **Website_Production is the newer packaging of the same engine.**
2. **Retirement/tax engine line**: `HoMI_Finance_Production.html` (1,217 lines) → `HoMI_Finance_Ultimate.html` (740 lines, minified but a **strict superset**). Ultimate = Production **plus**: THE FIRST NO onboarding wizard, Quantum Readiness Field, Economic Projections timeline, Advisor Conflict Detection, richer scoring (adds DTI, life-stability, home equity), interactive IRMAA/Widow/TLH/QCD sections with own inputs, ~9 more calculators. **Ultimate is the newest and most complete of this line.**
3. **Mobile app reboot**: `HoMI_Finance_v4.html` (3,796 lines, self-labeled "v4.0", PRO badge). Best UX architecture (bottom nav, score ring, modals, toasts, loading overlay, a11y skip-link/ARIA) and the **best Monte Carlo** (accumulation + withdrawal phases, percentile trajectory bands). BUT only 7 of 22 advertised calculators are implemented; 15 are "Coming Soon" stubs. Highest version label; incomplete feature coverage.
4. **Standalone "everything" build**: `HōMI_Master_Finance_Web_App.html` (= v1.4.html; header badge "COMPLETE v2", storage key `homi_complete_v5`). **Most working calculators of any file (26)** + full engine sections (dashboard, genome, trinity, temporal, actions, forensics, network, monte-carlo, roth, SS, tax brackets, withdrawal, advanced-tax). Distinct from digest A's "MASTER" (which had 15 toy calcs — rule72/latte/hourly). This is the broadest *feature-complete* single file.
5. `HoMI_Finance_Complete_Educational_Suite.html` — incomplete demo: only the Home Affordability calculator is implemented with the full **education-module pattern**; the other 13 sections are explicitly commented "following same pattern". Value = the pattern, not coverage.

**Bottom line**: for calculator breadth → Master_Web_App (v1.4). For tax-strategy depth → Ultimate. For app shell/UX → v4.0. For education UX → Educational Suite pattern.

---

## 2. HoMI_Finance_Complete_Suite.html (= Website_Production engine) — 14 home calculators

Calculators (all with Trinity-style verdicts READY/CAUTION/NOT YET and Temporal Twin messaging): Home Affordability (28/36 rule), Mortgage, Emergency Fund, Debt Payoff Planner, Closing Costs Estimator, **Net Worth Tracker**, **Budget Stress Test**, **Move-In Cost Calculator**, **First-Time Buyer Programs Database**, Rent vs Buy **Enhanced** (rent-increase, appreciation, opportunity cost), **Property Tax Appeal Analyzer**, **Home Maintenance Budget Planner**, Refinance, HELOC.

### NEW features (vs digest A & existing build)
| Feature | Tag | Notes |
|---|---|---|
| First-Time Buyer Programs Database | **BUILD-READY** | State-keyed program DB (CA/TX/FL/NY samples) + federal defaults (FHA/VA/USDA), each with `{name, type, amount, income limit, maxPrice}`; filters by user income/price. Real program names (CalHFA MyHome, My First Texas Home, SONYMA, HomeFirst $40k…). Data model ready to expand to 50 states. |
| Property Tax Appeal Analyzer | **BUILD-READY** | Novel — no analog anywhere. `appealStrength` score 0–100 from overassessment % vs tax records (`min(40, overassessment*2)`) + comparable-home diff (`min(30, compDiff*1.5)`); verdicts STRONG (≥50) / MODERATE (≥25) / WEAK case with action guidance. |
| Move-In Cost Calculator | **BUILD-READY** | First-month total cash-needed view (deposit, movers, utilities setup, furniture…). |
| Budget Stress Test | **BUILD-READY** | Re-runs budget at +2% rate / income-drop shock; different from existing budget dashboard (stress scenario, not tracking). |
| Home Maintenance Budget Planner | **BUILD-READY** | 1%-of-home-value/yr rule + age adjustment. |
| Rent vs Buy Enhanced | BUILD-READY (partial DUP) | Adds rent escalation, home appreciation, down-payment opportunity cost vs simple versions in A. |
| Closing Costs 2–5% estimator | BUILD-READY (thin) | |

## 3. HoMI_Finance_Complete_Educational_Suite.html — education-module PATTERN (likely NEW direction)

**Not** a courses/lessons/quizzes LMS. It's the 14-calculator suite re-skinned so each calculator embeds a structured **education module**: 28/36-rule explainer with `example-box` (worked numbers), `warning-box`, `tip-box`, `benchmark-table` (hoverable), `glossary-term` spans, `expandable` accordion sections ("Why this matters" / "The math behind it" style), and a 4-step decision workflow. Only Home Affordability is implemented (rest commented out).

NEW UI/component patterns — **BUILD-READY as a component library**, NEEDS-DESIGN for full curriculum rollout:
- `example-box`, `warning-box`, `glossary-term`, `benchmark-table`, `expandable` components (lines 429–1023).
- "Math says you CAN afford this; only you know if you SHOULD" readiness framing with benchmark table mapping score bands to guidance (lines 1253–1295).

### NEW scoring formula (distinct from all other files — quote)
```js
const dtiScore = dti <= 28 ? 100 : dti <= 36 ? 75 : Math.max(0, 100 - (dti - 36) * 5);
const downPaymentScore = downPaymentPercent >= 20 ? 100 : (downPaymentPercent / 20) * 100;
const incomeScore = income >= 75000 ? 100 : income >= 50000 ? 75 : (income / 50000) * 75;
const financialScore = Math.round((dtiScore * 0.5) + (downPaymentScore * 0.3) + (incomeScore * 0.2));
const timingScore = Math.round((dtiScore + downPaymentScore) / 2);
const readiness = Math.round((financialScore + timingScore) / 2);
const isReady = readiness >= 75;
```
Also: 28% housing rule nets out HOA first (`maxHousingPayment = monthlyIncome*0.28 - hoa`); max-price inversion `loanAmount = maxPayment / (r(1+r)^360) * ((1+r)^360 - 1)`. Readiness-tiered Temporal Twin messages (≥90 / ≥75 / ≥50 / <50) and score-tiered action plans.

## 4. HoMI_Finance_Production.html — retirement/tax engine (older sibling of Ultimate)

Sidebar app: profile inputs (income, expenses, savings rate, taxable/taxDeferred/roth, SS monthly, age, state), 50-state tax table, Monte Carlo (Box–Muller, 10k sims, FI target = expenses×25, p10/p50/p90 bands, years-to-FI), Roth conversion optimizer, SS claiming, tax bracket viewer, withdrawal sequencing + RMD projection, Advanced Tax tabs (IRMAA/Widow/TLH/QCD), Behavioral Genome, Trinity, Temporal Twin, Action Plan, Decision Forensics w/ localStorage persistence.

### New formulas/constants (quote)
```js
// Weighted score (DIFFERENT from existing build's 35/35/30 and A-MASTER's 35/35/30)
overall = Math.round(scores.financial*0.5 + scores.emotional*0.3 + scores.timing*0.2);
// Verdict: overall >= 80 → '✓ READY' else '✗ NOT YET'
// Roth conversion: fill current bracket, cap at 10% of tax-deferred balance and $50k/yr
optimalConversion = Math.min(bracketRoom, taxDeferred*0.1, 50000);
taxCost = optimalConversion * (currentBracket + stateRate);
// SS claiming (lifetime to 85 hardcoded: 23/18/15 yrs)
ss62 = ssMonthly*0.70; ss70 = ssMonthly*1.24;
life62 = ss62*12*23; life67 = ss67*12*18; life70 = ss70*12*15; winner = argmax;
// IRMAA (2024 single thresholds; Part B premium + Part D surcharge pairs)
irmaaBrackets = [{t:103000,b:174.70,d:0},{t:129000,b:244.60,d:12.90},{t:161000,b:349.40,d:33.30},
                 {t:193000,b:454.20,d:53.80},{t:500000,b:559.00,d:74.20},{t:Infinity,b:594.00,d:81.00}];
// Widow's penalty: REAL bracket math (vs digest A's flat 5% estimate)
mfjTax = Σ min(income,b.max)-b.min × b.rate over MFJ brackets; singleTax likewise; penalty = singleTax - mfjTax;
// QCD: $105,000 cap, age 70½+, est. first RMD = taxDeferred×1.07^(73-age) / 26.5
```
Feature tags: Roth optimizer **BUILD-READY**, SS optimizer **BUILD-READY**, IRMAA **BUILD-READY** (improved over A's single-filer-only), Widow's-penalty real bracket calc **BUILD-READY** (upgrade of A), Withdrawal sequencing + RMD projection **BUILD-READY**, Decision Forensics **BUILD-READY**, Action Plan rules **BUILD-READY**, Monte Carlo DUPLICATE (better version in v4, §7).

## 5. HoMI_Finance_Ultimate.html — newest tax-engine build (superset of Production)

Everything in §4, **plus**:

| Feature | Tag | Notes |
|---|---|---|
| **THE FIRST NO** onboarding wizard | **BUILD-READY** | 5-question wizard (decision type, cost band, 6-month emergency fund?, genuine-want vs pressure, life stability). Score: Q3/Q4/Q5 answers each +30/20/10, +20 base; ≥70 → READY. First-run gate before dashboard. |
| **Quantum Readiness Field** | NEEDS-DESIGN (novelty) | "Proceed Now / Wait 6mo / Wait 12mo" probability cards — but adds `Math.random()` jitter to the real score each render. Concept = timing-scenario comparison; current implementation is fake. Needs real model. |
| **Economic Projections timeline** | **BUILD-READY** | 10-year deterministic FV timeline with %-to-FI-goal coloring: `balance = initial×1.07^y + income×savingsRate×((1.07^y−1)/0.07)`. |
| **Advisor Conflict Detection** | **BUILD-READY** (content is static) | Conflict scores: commission advisor 85, bank "free" planning 78, insurance agent 82, robo-advisor 35, fee-only fiduciary 15, HōMI 0 ("We profit when you're ready"). Great trust/marketing surface. |
| **Interactive IRMAA** (own MAGI + filing-status inputs) | **BUILD-READY** | MFJ thresholds `[206000,258000,322000,386000,750000]` vs single `[103000,129000,161000,193000,500000]`; Part B surcharges `[0,69.90,174.70,279.50,384.30,419.30]`, Part D `[0,12.90,33.30,53.80,74.20,81.00]`; full 6-tier table with "← You" marker. |
| **Tax-Loss Harvesting w/ positions** | **BUILD-READY** | Position tracker (`{ticker,basis,current,date}` seeds VTI/AAPL/BND), harvestable-loss computation, 30-day wash-sale check via purchase date, $3,000/yr deduction + unlimited carryforward. |
| **Widow's penalty w/ income decomposition** | **BUILD-READY** | Inputs: income, SS, pension, investment income; real MFJ-vs-single bracket recomputation + mitigation action items (Roth conversions before widowhood, delay SS, Roth-first withdrawals). |
| **QCD planner** | **BUILD-READY** | IRA balance, age, charity goal, bracket → RMD-table (73+: 26.5, 25.5, 24.6, 23.7, 22.9, 22.0) projection, QCD-vs-RMD offset, tax saved. |
| ~9 extra calculators | mixed | Down Payment, HELOC, Rental Property, Cash-vs-Finance, Roth IRA, ROI, Inflation, Marriage Tax, Lease vs Buy (see §6 for canonical formulas). |
| **Upgraded scoring engine** | **BUILD-READY** | Adds DTI, life-stability slider, home equity — best scoring model of all files (quote below). |

### Ultimate calculateScores (best-in-set — quote)
```js
// financial (100 max): base 15 + cashFlow>0 20 + savingsRate≥15 15 (≥10: 10)
//   + liquidAssets>expenses*0.5 20 (>0.25: 10) + totalAssets>expenses*6 20 (>3: 10)
//   + dti<20 10 (<36: 5)
emotional = min(100, (desire/10)*50 + max(0,(10-pressure)/10)*30 + (stability/10)*20);
timing    = min(100, 40 + ((10-stress)/10)*30 + (stability/10)*30);
overall   = round(financial*0.5 + emotional*0.3 + timing*0.2);   // ≥80 READY
// Behavioral Genome 9 dims are DERIVED from sliders (not hardcoded):
// Loss Aversion = 50+stress*3+pressure*2; Volatility Tolerance = 100-stress*5-pressure*3;
// Social Proof = pressure*8+(10-desire)*2; Agency = desire*5+stability*3+(10-pressure)*2; etc.
// Action Plan rules engine: fin<70→emergency fund; emo<70→clarify why; timing<70→stabilize;
//   savingsRate<15→raise savings; dti>36→reduce debt; taxDeferred>roth*4→Roth conversions.
```

## 6. HōMI_Master_Finance_Web_App.html (= v1.4.html, "COMPLETE v2", key `homi_complete_v5`)

Broadest calculator coverage: 15 engine sections (dashboard, inputs, genome, trinity, temporal, actions, forensics, network, monte-carlo, roth, SS, tax-analysis, withdrawal, advanced-tax) + **26 calculators**: affordability, rent-vs-buy, mortgage (PITI), down-payment goal, DTI, mortgage payoff, refinance, HELOC, **FHA**, **VA**, rental property, auto loan, **auto lease**, **cash-back vs low-rate**, compound, **investment goal**, ROI, retirement readiness, **401k w/ match**, Roth IRA, debt payoff, **credit-card minimum trap**, budget, net worth, **marriage tax**, **student loan**, **college cost**, inflation.

### NEW calculators — all BUILD-READY unless noted
| Calculator | Core formula (verbatim-ish) |
|---|---|
| FHA Loan | `upMIP = baseLoan*0.0175; totalLoan = baseLoan+upMIP; monthlyMIP = totalLoan*0.0055/12` (1.75% upfront MIP financed + 0.55%/yr) |
| VA Loan | `feePct = firstUse ? 2.15 : 3.3; if down≥10% → 1.25; elif ≥5% → 1.5; fee = loan*feePct/100` (funding-fee tiers) |
| Auto Lease | `depreciation = (capCost − residualVal)/term; finance = (capCost + residualVal)*moneyFactor; pay = dep + finance; equivAPR = moneyFactor*2400` |
| Cash-back vs Low-rate | total-cost compare of `(price−cashback−down)` at stdRate vs `(price−down)` at promoRate over term |
| Student Loan | standard amortization + payoff date |
| College Cost | `Σ (tuition+room+books)×(1+infl)^y` per year, shows year-1 vs final-year cost + inflation impact |
| Credit-Card Minimum Trap | parallel amortization loops: minimum-only vs actual payment → months + interest saved |
| Investment Goal | monthly-compounding loop to target → time + target date (600-mo cap) |
| 401k w/ Employer Match | `totalAnn = salary*(contrib%+match%); FV = bal×(1+r)^n + moContrib×((1+r)^n−1)/r` |
| Roth IRA | annual-compounding FV + `taxSaved = growth×bracket` |
| Retirement Readiness | `supported = nestEgg×0.04/12; readiness = supported/desiredIncome×100` (ON TRACK ≥100 / CLOSE ≥70 / NEEDS WORK) |
| Marriage Tax | real bracket recomputation: Σtax(single,i1)+Σtax(single,i2) vs Σtax(MFJ,i1+i2) → penalty or bonus |
| Rental Property | `cashflow = rent×(1−vacancy) − (mortgage+tax+maint=1%price/12); CoC = cashflow×12/down×100` (STRONG >10%) |
| Refinance | `breakeven = ceil(closing/moSave); lifetime = curPay×remaining − (newPay×360+closing)`; REFINANCE if lifetime > closing×3 |
| Down Payment Goal | savings-growth loop to `price×dpPct` with monthly contribution + savings APY → months + target date (DUPLICATE-ish vs existing goals feature, but goal-type-specific) |
| Affordability (43% variant) | `maxHousing = monthlyIncome*0.43 − debts`; readiness bar `min(100,(1−dti/50)*100)`; DTI<30 READY / <43 CAUTION / else NOT YET |

### NEW engine features
| Feature | Tag | Notes |
|---|---|---|
| Decision Forensics | **BUILD-READY** | Record decision baseline (description + reasoning + score snapshot, localStorage); milestone timeline 6mo/1y/3y/5y for outcome check-ins; recorded-decision list w/ readiness at decision time. |
| Network Intelligence (cohort outcomes) | **NEEDS-DESIGN** | "Similar users / made choice / success rate / very-happy-satisfied-regret distribution" — all numbers are `Math.random()` placeholders. Concept (outcome data from similar decision-makers) is the product's stated moat; needs real backend data. |
| Action Plan rules engine | **BUILD-READY** (lighter than Ultimate's) | priority-ranked items from score thresholds + balance-sheet ratios. |
| "Zero Conflict" trust note | BUILD-READY (copy) | Sidebar: "✓ Zero Conflict — We profit when you're ready." |
| Scoring (simpler 3-ring) | DUPLICATE-ish | fin = 20 + cashFlow>0·30 + assets>50k·20 + assets>3×expenses·30; emo = desire/10·60 + (10−pressure)/10·40; timing = 50 + (6−stress)/6·50; overall = equal-weight average; ≥80 READY / ≥60 BUILDING. Ultimate's 50/30/20 weighted version (§5) is strictly better. |
| Monte Carlo (accumulation-only, FI-target success) | DUPLICATE | Same as Production (Box–Muller, 10k, success = final balance ≥ expenses×25, p10/p50/p90 bands, years-to-FI). v4's two-phase version supersedes. |

## 7. HoMI_Finance_v4.html (v4.0 mobile app) — NEW app-shell features

| Feature | Tag | Notes |
|---|---|---|
| **The Signal** (Blind Budget) | **BUILD-READY** | Shows balance as a **range** ("$2,400 – $2,800") instead of exact; double-tap reveals exact amount for 30s then re-masks; persisted toggle (`blindBudgetMode`). Anti-anxiety money UX — unique to v4. |
| **Permission System** | **BUILD-READY** | "What do you want? / Amount" → Permission Score: `100 − 40 if >50% of monthly income, −25 if >30%, −10 if >15%` (+ Trinity Advocate/Skeptic/Arbiter commentary; verdict ≥85 READY / ≥60 NOT YET / else BUILD). NOTE: subtracts `Math.random()*10` "emotional adjustment" — replace with real emotional pillar. |
| **Best Monte Carlo (two-phase)** | **BUILD-READY** | Accumulation to retireAge then decumulation to 95 with 4% withdrawal of retirement balance; 10k sims; success = survive to 95; per-sim trajectories → p10/p50/p90 **path** bands charted over age axis (Chart.js fill). Supersedes Production/Master MC. Quote: `annualWithdrawal = retirementBalance * withdrawalRate; balance = balance*(1+return) − annualWithdrawal; success = balance > 0`. |
| **Decision Log + Outcome Checkpoints** | **BUILD-READY** | Decision form (name, category, amount, feeling 1–10 slider, notes, auto score snapshot) persisted; checkpoints at 6/12/24/60 months with verified/due/pending states; Outcome Network stats ("4.6× higher negative outcomes when NOT YET ignored", "91% positive when READY followed" — hardcoded marketing stats, NEEDS-DESIGN for real data). |
| **Behavioral Genome 9 dims (values)** | DUPLICATE (Ultimate's derived version better) | Same 9 dims as A/Ultimate (Loss Aversion, Time Perception, Confidence Calibration, Volatility Tolerance, Regret Asymmetry, Social Proof Sensitivity, Narrative Bias, Agency Attribution, Outcome Bias). |
| Constants: full 2024 MFJ+Single bracket tables, RMD factors 73–100, SS factors 62–70 | **BUILD-READY** | `SS_FACTORS = {62:0.70, 63:0.75, 64:0.80, 65:0.867, 66:0.933, 67:1.00, 68:1.08, 69:1.16, 70:1.24}`; `RMD_FACTORS` 73:26.5 → 100:6.4; 50-state `STATE_TAX_RATES`; Roth calc uses "80% of bracket room" recommendation (`recommended = room*0.80`). |
| JSON export/import (versioned) | **BUILD-READY** | `homi_export_YYYY-MM-DD.json` with profile/decisions/settings + `version:'4.0'`; import validates and reloads. |
| Weekly Window, streak badge, Safety Margin card, day-of-week insight ("emotional score dips on Wednesdays") | NEEDS-DESIGN | Static demo values; concepts = habit streaks, buffer-absorbed tracking, temporal pattern insights. |
| App shell (bottom nav, score ring animation, modals, toast system, loading overlay w/ progress, skip-link, ARIA) | **BUILD-READY** | Best UX reference implementation in the corpus. |
| 15 of 22 calculators | STUBS | rentvsbuy, downpayment, closing, refinance, coastfire, withdrawal, glidepath, taxbracket, irmaa, widow, taxloss, qcd, debtpayoff, emergency, autoloan render "Coming Soon" — source formulas from §6/§5. Coast FIRE & Glide Path advertised but have **no implementation anywhere** — NEEDS-DESIGN (true gaps). |

## 8. Marketing/website features (Website_Production) — worth noting for future

- Hero: "Complete Decision Suite" + "Know if you're ready before you decide."
- Brand system: compass-with-**keyhole** logo (3 spinning rings cyan/emerald/yellow + keyhole center), letter-colored HōMI wordmark (H cyan, ō emerald serif, M yellow, I cyan).
- Footer copy: "A Decision Companion" • "HōMI.com • Info@HōMI.com" • "Decision Readiness Intelligence™".
- Verdict framing copy (shared across files): "This is wisdom, not failure. 73% of users receive this verdict." — consistent anti-rejection messaging.
- Trust copy: "Zero Conflict — We profit when you're ready, not when you transact." (Ultimate Conflicts section is the long-form version.)
- Outcome stats for landing/social proof (v4, hardcoded): "4.6× higher negative outcomes when NOT YET ignored"; "91% positive outcomes for READY verdicts followed".

---

## 9. TOP 10 BUILD-ADD CANDIDATES (summary)

1. **THE FIRST NO onboarding wizard** (Ultimate) — 5-question readiness gate w/ 100-pt scoring; perfect first-run experience. BUILD-READY.
2. **v4 Monte Carlo two-phase engine** (accumulate→decumulate, survival success, percentile path bands) — best MC in corpus; drop-in. BUILD-READY.
3. **Interactive IRMAA + Widow's Penalty + TLH + QCD tax-strategy suite** (Ultimate versions w/ own inputs, real bracket math, wash-sale check, $105k QCD cap) — no overlap with existing build. BUILD-READY.
4. **Roth Conversion Optimizer** (bracket-room fill, min(room, 10% balance, $50k) or v4's 80%-of-room) + conversion ladder table. BUILD-READY.
5. **The Signal / Blind Budget** (v4) — balance-as-range with double-tap 30s reveal; signature anti-anxiety UX. BUILD-READY.
6. **Permission System** (v4) — purchase-permission scorer (% of monthly income tiers) w/ Trinity commentary; replace Math.random with emotional pillar. BUILD-READY.
7. **Ultimate scoring upgrade** — financial adds DTI/liquidity/savings-rate tiers; emotional/timing add life-stability slider; overall 50/30/20. Replaces/extends current 35/35/30. BUILD-READY.
8. **Mortgage product calculators: FHA (1.75% UFMIP+0.55%/yr MIP), VA (2.15/3.3/1.25/1.5 funding-fee tiers), HELOC, Refinance breakeven** (Master app formulas). BUILD-READY.
9. **Education-module component pattern** (Educational Suite: example-box, warning-box, glossary-term, benchmark-table, expandables + tiered dti/downPayment/income scoring) — apply per-calculator. BUILD-READY pattern; full curriculum NEEDS-DESIGN.
10. **Network Intelligence / Outcome Network** (Master + v4) — cohort outcome distributions + decision checkpoints (6/12/24/60mo); concepts strong but all data is random/hardcoded placeholder — NEEDS-DESIGN (backend). Runner-up quick wins: Property Tax Appeal Analyzer, First-Time-Buyer Programs DB, College Cost, Credit-Card Minimum Trap (all BUILD-READY).
