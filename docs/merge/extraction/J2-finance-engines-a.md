# Extraction J2 — HōMI Finance Engines, Batch A (7 files)

Prior digest skimmed: `A-finance-engines.md` (WELLNESS / PRO / UNIFIED / MASTER). Only diffs & NEW material below.

## Files inspected
| # | File | Lines | Status | Identity |
|---|---|---|---|---|
| 1 | `homi-finance-v2.html` | 1,977 | **TRUNCATED** mid-D3-renderer (ends `.attr('stroke', '#34d399').`) | "HōMI Finance v2.0 — Unified Dashboard" (D3 desktop retirement dashboard) |
| 2 | `HoMI_Financial_Wellness_Engine.html` | 2,805 | complete | **Prototype of WELLNESS** (pre-Production; hardcoded demo data) |
| 3 | `HoMI_Financial_Wellness_Engine_v2.html` | 3,414 | **TRUNCATED** mid-`calculateReadiness` (ends `getElementById('rea`) | "Wellness Engine v2 Production Build" — newest WELLNESS iteration |
| 4 | `HoMI_Financial_Wellness_Engine(1).html` | — | **BYTE-IDENTICAL to #2** (same md5 `d033fb3e…`) | skip — exact duplicate |
| 5 | `HoMI_Finance_Complete.html` | 1,743 | **TRUNCATED** mid-`c-fha` calculator | "Decision Readiness Intelligence™" — expanded successor of v1.4 |
| 6 | `HoMI_Phase1_Complete.html` | 1,983 | **COMPLETE** | "Financial Intelligence Platform v2" — Debt/Budget/Couples suites |
| 7 | `v1.4.html` | 561 (minified) | **COMPLETE** | "HōMI Finance Intelligence Engine" ≡ byte-identical to `HōMI_Master_Finance_Web_App.html` (md5 `6c30385f…`) |

---

## 1. VERSION LINEAGE

**Three family trees + one standalone:**

- **WELLNESS family (emotional finance):** `Wellness_Engine.html` (hardcoded prototype) → `Wellness_Engine_Production.html` (prior digest: localStorage, `homi_state`, full engines) → **`Wellness_Engine_v2.html` (NEWEST — real CRUD, XSS sanitizing, `homi_state_v2`, but truncated)**.
- **Decision-readiness web-app family:** **`v1.4.html` (complete, storage key `homi_complete_v5`, unweighted 3-band scoring, 30 working calculators)** → `HoMI_Finance_Complete.html` (same codebase extended: 50/30/20 weighting, HSA/home-equity accounts, OVN, Sankey, backtest, jsPDF, 56-calculator nav incl. couples/roommates/groups — but truncated so ~26 calculators + router/init are missing). Neither is in the prior digest.
- **Unified-dashboard family:** `homi-finance-v2-unified.html` (prior digest, truncated) ↔ `homi-finance-v2.html` (sibling "v2.0 Unified Dashboard", also truncated; smaller, cleaner, D3-only, accessibility-first).
- **Standalone:** `HoMI_Phase1_Complete.html` — only complete, fully-working multi-suite app in this batch (storage key `homi_phase1_data`).

**Most complete/newest:** for engines → `v1.4.html` (complete) and `HoMI_Phase1_Complete.html` (complete); for newest wellness UX/logic → `Wellness_Engine_v2.html` (mine it for code, it's truncated after readiness scoring); `HoMI_Finance_Complete.html` is the broadest feature map but non-functional as shipped.

---

## 2. NEW FEATURES / CALCULATORS / VIEWS (tagged)

### From `v1.4.html` (all fully implemented, copy-paste quality)
1. **FHA Loan calculator** — upfront MIP 1.75% rolled into loan + monthly MIP 0.55%/12. **BUILD-READY**
2. **VA Loan calculator** — funding fee tiers: first-use 2.15%, subsequent 3.3%; reduced to 1.5% (≥5% down) / 1.25% (≥10% down). **BUILD-READY**
3. **Rental Property analyzer** — vacancy % loss, maintenance = 1% of price/yr, cash-on-cash return; verdicts STRONG >10% / DECENT >5% / WEAK. **BUILD-READY**
4. **Auto Lease calculator** — money-factor math: `depreciation=(capCost-residual)/term`, `finance=(capCost+residual)*mf`, `APR = mf × 2400`. **BUILD-READY** (prior MASTER had only a 40%-price heuristic)
5. **Cash-Back vs Low-Rate incentive comparator** — total-cost comparison of two loan structures. **BUILD-READY**
6. **Marriage Penalty/Bonus** — full 2024 bracket math: Σ single taxes vs MFJ tax on combined income. **BUILD-READY**
7. **Refinance breakeven** — `breakeven = closing / monthlySavings`; verdict DO-IT if `lifetimeSavings > 3× closing`. **BUILD-READY**
8. **HELOC max line** — `maxBorrow = value × LTV% − mortgage`. **BUILD-READY**
9. **College Cost projector** — yearly cost × (1+inflation)^y summed over N years. **BUILD-READY**
10. **401(k) projector with employer match**; **Roth IRA tax-free growth + taxSaved = growth × bracket**. **BUILD-READY**
11. **Credit-card minimum-vs-actual payoff duel** (two amortization loops). **BUILD-READY**
12. **SS claiming optimizer 62/67/70** — `ss62 = 0.70×`, `ss70 = 1.24×`, lifetime totals to life expectancy, picks max. **BUILD-READY** (not in prior digest)
13. **Per-calculator readiness verdicts** — every calc returns READY/CAUTION/NOT-YET with a readiness bar (`ready = (1 − DTI/50) × 100` for affordability). This is the "readiness-native calculators" pattern — **BUILD-READY, high strategic fit**.

### From `HoMI_Finance_Complete.html` (implemented above the truncation point)
14. **50-state tax-rate table** (flat top rates, e.g. CA 0.133, TX 0) wired into Roth conversion & bracket analysis. **BUILD-READY (data)**
15. **Cash-Flow Sankey** (d3-sankey): Income → Tax(25%)/Net → Needs 50/Wants 30/Save 20 → sub-categories (needs: housing 60/utils 15/food 15/transport 10; savings: 401k 60/Roth 25/HSA 15). **BUILD-READY**
16. **Historical backtest with real 10-yr S&P sequences**: 1929 `[-8.4,-24.9,-43.3,-8.2,54.0,-8.6,52.6,-1.4,46.6,31.9]`, 1966, 2000, 2008 arrays; withdrawal = SWR × balance. **BUILD-READY**
17. **Branded jsPDF report** (navy background, logo, score, verdict color-coding, profile + allocation summary). **BUILD-READY** (UNIFIED only advertised it)
18. **RMD schedule projector** — ages 73–78 rows (table extends to 90: `rmdFactors {73:26.5 … 90:12.2}`), balance grown at 7% to each age. **BUILD-READY**
19. **Widow's Penalty via real bracket math** — ΣMFJ vs ΣSingle tax on same income (vs MASTER's flat 5% guess). **BUILD-READY**
20. **Outcome Verification Network (OVN) view** — decision portfolio stats + auto-computed verification status by age of record (≥180d 6mo, ≥365d 1yr, ≥1095d 3yr, ≥1825d 5yr) + verification-timeline UI (Record→6mo→1yr→3yr→5yr). Extends PRO's hardcoded checkpoints into computed logic. **BUILD-READY**
21. **Network Intelligence view** — similar-users/acted/success-rate (randomized seeds — placeholder). **NEEDS-DESIGN** (needs real aggregate data)
22. **Couples/Roommates/Groups calculator suites** (joint-vs-separate, yours/mine/ours, compatibility, merge finances, rent-by-sqft, utility splitter, security deposit, move-out settle, group expense, who-owes-who, shared subscriptions, IOU tracker) — **nav-advertised only; implementations lost to truncation. NEEDS-DESIGN** (names + grouping are the spec).

### From `HoMI_Phase1_Complete.html` (all working)
23. **Avalanche-vs-Snowball debt simulator** — month-by-month multi-debt engine (min payments + interest accrual, extra payment to first debt in sorted order), returns months + total interest both strategies, recommends cheaper. **BUILD-READY**
24. **Student Loan suite** — standard 10-yr amortization vs IDR: `povertyLine = 15060 + 5380×(family−1)` (2024), `discretionary = max(0, income − 1.5×poverty)`, `IDR = 10% × discretionary / 12`; PSLF eligibility flag (federal/mixed + public/nonprofit). **BUILD-READY**
25. **Debt consolidation breakeven** — closed-form: `months = ln(pay/(pay − bal×r/12)) / ln(1 + r/12)` for current vs new(+fee) rate. **BUILD-READY**
26. **FICO estimator** — 300 base + payment-history ≤245 (35%) + utilization bands ≤210 (30%) + age bands ≤105 (15%) + flat 70 (mix/inquiries). **NEEDS-DESIGN** (heuristic; label as "estimate")
27. **Zero-based budget analyzer** vs 50/30/20 targets with unassigned leftover. **BUILD-READY**
28. **Envelope budgeting UI** — dynamic envelopes, spent/budget bar, color shifts emerald→yellow (>80%)→red (>100%), monthly reset. **BUILD-READY**
29. **Lifestyle-creep detector** — `creep = spendingGrowth% − incomeGrowth%`; danger >5pts, warning >0. **BUILD-READY**
30. **Emergency-fund milestones** — $1k mini-fund → 1mo → 3mo → 6mo with months-away per milestone. **BUILD-READY**
31. **Couples suite**: compatibility quiz (Σ/30 ×100, bands 80/60); proportional shared-expense split by income ratio; goal-alignment meter (`(10 − avg|p1−p2| across 3 goals) ×10`, flag gaps >2); **settle-up calculator** (`settlement = p1Paid − total×ratio1`). **BUILD-READY**
32. **Cross-Tool Impact engine** — `recalculateAll()` propagates inputs across suites to a dashboard "impacts" feed (debt-free date, savings-rate gap, income-mismatch warnings). **NEEDS-DESIGN** (pattern worth adopting over our siloed views)

### From `Wellness_Engine_v2.html` (upgrades to prior WELLNESS)
33. **XSS `sanitize()` on every user string** rendered to DOM. **BUILD-READY (security)**
34. **Remaining Joy Budget** — 10% of income minus this month's non-resisted impulse spends. **BUILD-READY**
35. **Streak auto-decay** — resets to 0 if no resist logged within >1 day (`lastStreakDate` tracking). **BUILD-READY**
36. **Real 48-hour pause queue** — `paused[]` with `pauseUntil` ISO, expiry sweep + toast on return. (Production only faked it with a chat message.) **BUILD-READY**
37. **Sinking-fund contributions** (+modal) and **full CRUD deletes** for impulse log (with totalSaved correction), expenses, funds, goals. **BUILD-READY**
38. **Deterministic 7-day cash flow** — fixed `dailyExpenses=[45,32,28,67,23,89,41]`, payday injected at computed index; bands >500 positive / >100 warning. (Replaces Production's `Math.random()` noise.) **BUILD-READY**
39. **Settings panel** with Export/Import JSON + Reset; 14-day paycheck calendar; Guilt-Free allocation fixed to **10%** (resolves the 10-vs-12% conflict noted in prior digest). **BUILD-READY**

### From `homi-finance-v2.html`
40. **Coast FIRE with "years of freedom bought"** — see formulas §3. **BUILD-READY**
41. **Roth Conversion Optimizer** (room-in-current-bracket method, 2024 MFJ + single brackets). **BUILD-READY**
42. **IRMAA 2024 MFJ table with Part B + Part D premiums** and "reduce MAGI by $X to drop a tier" advice. **BUILD-READY**
43. **Scenario save/load/compare** with delta table; versioned persistence envelope `{version:'2.0', timestamp, data}`. **BUILD-READY**
44. **Sequence-of-returns demo** — one 30-yr return array vs its reverse, $40k withdrawals on $1M; "first 5 years" insight. **BUILD-READY**
45. **Accessibility layer** — skip-link, `role=tab/tabpanel/radio`, `aria-selected/aria-current`, focus rings, `prefers-reduced-motion` kill-switch. **UX — adopt everywhere**
46. **Glide-path rule** — `stocks = max(40, 110−age)` accumulation / `max(30, 110−age)` decumulation ("110-minus-age"). **BUILD-READY**

### DUPLICATE (already in prior digest / existing build — do not rebuild)
- Monte Carlo Box–Muller 10k sims w/ p10/p50/p90 fan (PRO/MASTER), 25× FI target success criterion (MASTER), uniform 0.07±0.15 variant (MASTER), Trinity 3-voice debate, Temporal Twin messages, Behavioral Genome 9 dims (v1.4/Finance_Complete derive from desire/pressure/stress sliders — new formulas below, but concept is digested), IRMAA tiers/QCD $105k cap/TLH $3k limit (MASTER), withdrawal order Taxable→Tax-Deferred→Roth (PRO), emotion check-in + coach responses + impulse achievements + 77% couples expense + paycheck allocation 38/12/8/10/20 (WELLNESS), 50/30/20 Sankey concept overlaps UNIFIED's advertised sankey.

---

## 3. NEW FORMULAS & CONSTANTS (quoted)

**Coast FIRE (homi-finance-v2, L1560):**
```js
const coastNumber = fireNumber / Math.pow(1 + returnRate, yearsToRetire);   // fireNumber = 25 × annual expenses
const yearsBought = Math.floor(Math.log(portfolio / coastNumber) / Math.log(1 + returnRate));
```

**Roth conversion optimizer (homi-finance-v2, L1606):** find current 2024 bracket (MFJ: 23200/94300/201050/383900/487450/731200; single: 11600/47150/100525/191950/243725/609350) → `optimalConversion = min(bracketTop − income, tradBalance)`; `taxCost = conversion × bracketRate`. Finance_Complete variant caps: `min(bracketRoom, taxDeferred×0.1, 50000)`, adds state rate, `lifetimeSavings = conversion × yearsToRetire × 0.05`.

**IRMAA 2024 MFJ (homi-finance-v2, L1665):**
```js
[{max:206000,partB:174.70,partD:0},{max:258000,partB:244.60,partD:12.90},
 {max:322000,partB:349.40,partD:33.30},{max:386000,partB:454.20,partD:53.80},
 {max:750000,partB:559.00,partD:74.20},{max:Infinity,partB:594.00,partD:81.00}]
// single-filer (Finance_Complete L1050): thresholds 103k/129k/161k/193k/500k, same premiums
```

**SS claiming (v1.4 & Finance_Complete):** `ss62 = 0.70 × PIA`, `ss67 = PIA`, `ss70 = 1.24 × PIA`; lifetime = `(life − claimAge) × 12 × benefit`; recommend argmax.

**Readiness scoring variants (NEW — differ from build's 35/35/30!):**
- *v1.4 (unweighted, 3-band):* `overall = avg(fin, emo, tim)`; fin: base 20, +30 cashFlow>0, +20 assets>50k, +30 assets>3×expenses; `emo = desire/10×60 + (10−pressure)/10×40`; `tim = 50 + (6−stress)/6×50`. Verdicts ≥80 READY / ≥60 BUILDING / <60 NOT YET.
- *Finance_Complete (50/30/20 weighted):* `overall = fin×0.5 + emo×0.3 + tim×0.2`; fin rule-based (base 15; +20 cashFlow>0; +15 savingsRate≥15; +20 liquid>0.5×expenses; +20 assets>6×expenses; +10 DTI<20); `emo = desire/10×50 + (10−pressure)/10×30 + stability/10×20`; `tim = 40 + (10−stress)/10×30 + stability/10×30`. Verdict binary ≥80 READY else NOT YET. **Flag: three competing weightings now exist across the corpus (35/35/30 build+PRO+MASTER, equal-thirds WELLNESS+v1.4, 50/30/20 Finance_Complete) — needs canon decision.**
- *Genome from sliders (Finance_Complete L1196):* `LossAversion = 50 + stress×3 + pressure×2`; `Confidence = desire×6 + (10−pressure)×4`; `VolatilityTolerance = 100 − stress×5 − pressure×3`; `SocialProof = pressure×8 + (10−desire)×2`; `Agency = desire×5 + stability×3 + (10−pressure)×2`; `OutcomeBias = 30 + (10−stress)×4 + savingsRate`; pattern detectors (LossAversion>70, SocialProof>60, Agency>70 & SocialProof<40).

**Debt suite (Phase1):** avalanche/snowball `simulatePayoff` loop (§2.23); consolidation `months = ln(pay/(pay−bal·r/12))/ln(1+r/12)`; IDR `povertyLine=15060+5380×(family−1)`, `IDR=(income−1.5×poverty)×0.10/12`; FICO bands (§2.26); creep `= spendGrowth% − incomeGrowth%`.

**Marriage penalty (v1.4 c-marriage):** progressive-bracket `calcTax` on each income as Single vs combined as MFJ; `diff = marriedTax − (single1+single2)` → penalty if >0.

**FHA/VA/lease/rental constants (v1.4):** FHA upfront MIP 1.75%, annual MIP 0.55%; VA fee 2.15/3.3/1.5/1.25%; lease `APR = moneyFactor × 2400`; rental maintenance 1%/yr of price, CoC verdicts 10%/5%.

**Backtest return arrays (Finance_Complete L562):** 1929/1966/2000/2008 10-yr sequences quoted in §2.16.

**Historical demo seed changes (Wellness_Engine prototype):** financialScore = `min(100, max(30, 100 − amount/1000))` (no income normalization — superseded by Production's income-based version).

---

## 4. UX PATTERNS WORTH ADOPTING

1. **Readiness verdict embedded in every calculator** (v1.4): result card + colored verdict pill + readiness bar — turns calculators into decision tools, on-brand.
2. **Cross-tool impact feed** (Phase1): one dashboard strip showing downstream effects of any input change ("Paying $500/mo extra → debt-free in ~3 yrs, then +$1,650/mo free").
3. **Winner-loser VS cards** (v1.4 rent-vs-buy, refi, cash-vs-rate, marriage): two cards + `VS` badge, winner highlighted emerald.
4. **Guided panel chaining** (Finance_Complete/v1.4): each analysis view ends with a primary CTA to the next logical view (Dashboard→Inputs→MC→Roth→SS→Tax→Withdrawal→Advanced) — built-in user journey.
5. **Envelope bars with 80%/100% color thresholds** (Phase1) for the budget dashboard.
6. **Milestone ladder for goals** (Phase1 EF: $1k→1mo→3mo→6mo with "N months away / ✓ Complete").
7. **Verification timeline dots** (OVN: Record→6mo→1yr→3yr→5yr, completed/current/future states) — directly applicable to our goals & decision log.
8. **Accessibility baseline** (homi-finance-v2): skip-link, ARIA tablist semantics, `prefers-reduced-motion`, focus outlines — cheap, adopt wholesale.
9. **Chart.js CDN fallback loader** (Wellness_v2): `script.onerror → window.Chart = null` + guards; and re-init charts on panel activation (fixes canvas-in-hidden-panel sizing bug).
10. **Versioned storage envelope** `{version, timestamp, data}` (homi-finance-v2) + deep-merge on load — migration-safe persistence.
11. **Bottom-nav mobile shell + 4-dot onboarding progress** (Wellness_v2) — most polished mobile onboarding in the batch.
12. **Confirm-guarded destructive actions** (`confirm()` on every delete) + toast feedback loop (Wellness_v2).

---

## 5. DATA MODEL / STORAGE KEYS (new)
| File | Key | Notes |
|---|---|---|
| homi-finance-v2 | `homi_user_profile`, `homi_scenarios`, `homi_settings` | versioned envelope |
| Wellness_v2 | `homi_state_v2` | adds `impulse.lastStreakDate`, `impulse.paused[]`, drops `joyBudget` (computed), MAX_LOG_ITEMS=50 |
| v1.4 | `homi_complete_v5` | shallow-merge load |
| Finance_Complete | `homi_finance_complete_v1` | nested-merge load; adds `accounts.hsa`, `accounts.homeEquity`, `income.monthlyDebts/monthlyRent/retireExpenses`, `ss.spouse`, `assumptions.swr`, `decisions[].verified` |
| Phase1 | `homi_phase1_data` | `{timestamp, state}` wrapper |

## 6. DEFECTS & FLAGS
- **3 of 7 files truncated**: homi-finance-v2 (missing PDF export, backtest runner, projection toggle), Wellness_Engine_v2 (missing verdict render, charts, modals, export/import/reset impls, initApp), Finance_Complete (missing 26 calculators incl. all couples/roommate/group suites + router + init). Code above the cut is clean and reusable.
- `generatePDF()` button in homi-finance-v2 has **no implementation** (function lost to truncation); Finance_Complete's jsPDF export is the only working PDF generator in the batch.
- Scoring-weight inconsistency across corpus (35/35/30 vs equal vs 50/30/20) — recommend canon ruling before surfacing any of these scores.
- Wellness_v2's `pauseImpulse` counts a pause as a resist (streak++, totalSaved+=cost) — arguably inflates savings metrics; flag for product decision.
- v1.4 timing score uses `(6−stress)/6` with stress slider 0–10 → score can go negative at stress>6 (clamped by Math.max(0,…) only at return).
