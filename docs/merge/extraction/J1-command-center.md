# J1 — Command Center & Master System Extraction

**Sources (all read in full):**
- `HOMI_Master_Command_Center.html` (76KB, 1718 lines) — "COMMAND CENTER v1.0" psychology-first product vision
- `homi_command_center_audit.html` (45KB, 1126 lines) — audit of the command center; scores it 72/100
- `HoMI_Master_System_v3_Complete.html` (90KB, 639 lines, minified-ish) — full working engine, "MASTER v3.0"
- `HoMI_Master_System_v4.html` (130KB, 2072 lines — **TRUNCATED mid-`calcDefinitions.compound`; file is incomplete**) — v3 + Outcome Verification Network

**Existing build (baseline for DUPLICATE tags):** Readiness score view (35/35/30 engine + compass), Budget Overview dashboard, Transactions ledger, Investments monitor, Goals & Analytics. Note: v3/v4 engine uses **50/30/20 weighting** (financial 0.5, emotional 0.3, timing 0.2) — different from our 35/35/30; flag as a scoring-model conflict to resolve, not a port.

---

## 1. Feature Inventory

### A. HOMI_Master_Command_Center.html (v1.0) — 7 top-level panels

| Panel | Module | What it does / key UI |
|---|---|---|
| **Command** | The Signal | One-glance status ring (conic-gradient, PROTECTED/amber/red states) showing a **spending range** ("$400–$600 remaining this week") instead of exact balance + reassuring message |
| Command | Permission System | "Can I say yes to this?" card: amount + category, buttons ✓ Approved / ◐ Not Yet / 💬 Ask Partner (async partner approval); decisions logged |
| Command | Daily Money Minute | 60-second countdown ritual + streak badge ("🔥 14-day streak") |
| Command | Intent Router | Free-text input ("Can I afford a new car? Should I leave my job?") → keyword-routed contextual answer cards (car/job/okay intents hardcoded) |
| **Mindful** | Behavioral Genome | 9-dimension bar-grid profile: Loss Aversion, Time Perception, Confidence, Volatility Tolerance, Regret Asymmetry, Social Proof, Narrative Bias, Agency Attribution, Outcome Bias |
| Mindful | Decision Reputation Score | Follow-Through %, Regret Rate %, Calibration %, Improvement Δ — "track follow-through, not spending" |
| Mindful | Grace Periods | Auto-adjust alerts: "Buffer Absorbed $127", "busy week → guardrails +15% through Friday" — anti-shame framing |
| Mindful | Micro-Coaching | Single "one thing to protect today" contextual nudge |
| **Impulse** | Blind Budget Mode | Range-only visibility, weekly window, 2-tap "precision lock" to reveal exact balance (auto-hides) |
| Impulse | Certainty Breaker | Days 22–30 auto-protection from month-end spending cliff: hides balance, auto-sweep day 25, protected $ amount |
| Impulse | Rebellion Defuser | Pre-approved "micro-rebellion" budget ($20/wk, no-ask splurge list) as safe blow-off valve |
| Impulse | Single Envelope | One discretionary pool, deliberately no category splitting (anti mental-accounting) |
| **Network** | Shared Signal | Couples see one household signal; async partner approvals w/ decision log |
| Network | Money Circles | Structured pods: Family Circle (shared goal $/progress/contributed), Emergency Circle (max request, repayment rate, trust score A+) |
| Network | Gift Pools | Group gifting tracker: target, collected, contributors x/y, due date |
| **Strategy** (sub-nav) | Overview | Compass animation + Readiness Score 78, verdict NOT YET, 3 sub-scores |
| Strategy | Monte Carlo | Median/Best(95th)/Worst(5th)/Success% + Chart.js fan chart (5th/median/95th over 30y) |
| Strategy | Trinity Engine | Three voice cards: Advocate / Skeptic / Arbiter debating the decision |
| Strategy | Calculators | Grid of "37+ calculators" (affordability, mortgage, rent-vs-buy, auto, compound, retirement, FIRE, Roth IRA) |
| Strategy | Tax Optimization Suite | Current bracket, room-in-bracket, Roth opportunity, optimal SS age + conversion recommendation |
| **Outcomes** | Outcome Verification Network | Decisions tracked, outcomes verified, model accuracy, data points |
| Outcomes | Regret & Relief Engine | Regret Prevented $, Stress Avoided (crises), Time Saved, Confidence Δ |
| Outcomes | Temporal Twin | Styled quote "— You, 5 years from now" future-self message |
| **Audit** | System Inventory | Engine table w/ ✅ Production / 🔨 Building / 📋 Planned statuses |
| Audit | Brand Compliance | Locked palette check (#22d3ee/#34d399/#facc15, navy #0a1628, Inter, ō U+014D) |
| Audit | Implementation Roadmap | 4 phases × 6 weeks: Psychology Foundation → Behavior Layer → Relational Layer → Intelligence Layer |
| Audit | Competitive Moat | 5 numbered moat cards (psychology-first, incentive alignment, outcome data, relational lock-in, trust position) |

### B. homi_command_center_audit.html — audit report (not a product UI)
Tabs: Critical Gaps / Feature Matrix / Claude Power / Priority Roadmap. Details in §5.

### C. HoMI_Master_System_v3_Complete.html (v3.0) — 12 panels
Dashboard (score hero + 3 ring-cards + 4 stat cards + wealth-trajectory fan chart) · **Assessment** (full input form: personal, income/expenses, account balances incl. HSA/SS, assumptions: return 7%, vol 15%, inflation 2.5%, SWR 4%, contributions 401k $23k/IRA $7k/HSA $4,150/match 4%; 4 emotional 1–10 sliders) · **Accounts** (mock Plaid connect) · **Intelligence** (Trinity messages + prioritized Action Plan + Key Insights: net worth, FI number, progress %, runway months) · **Calculators** (14 in 4 categories, modal-based) · **Scenarios** (6 what-if cards: jobLoss, marketCrash, earlyRetire, inheritance, maxSavings, medical → delta score + delta success-rate) · **Planning** (Roth conversion w/ bracket room, SS claiming 62/67/70 w/ lifetime totals + BEST badge, tax-bracket waterfall + effective rate, withdrawal sequence taxable→traditional→Roth) · **Genome** (9 dims derived from inputs) · **Quantum** (ACT NOW / WAIT 6mo / 1y / 2y success-probability cards, recommended highlight) · **Temporal** (3 timeline messages at 5y/10y/retirement, score-conditional) · **Conflicts** (advisor conflict-risk scorer + platform conflict table) · **History** (localStorage decision log, export JSON, clear).

### D. HoMI_Master_System_v4.html (v4.0) — 14 panels
All of v3 plus:
- **🌐 Network** (highlighted nav tab): hero stats (decisions tracked, verified outcomes, your success rate, network decisions 12,847), animated network-viz node cloud w/ live "Active Verifications" counter, aggregate outcome distribution bars (78.3% positive / 14.2% neutral / 7.5% negative; "Ignored NOT YET → 34.7% negative, 4.6× worse"), 4 Network Intelligence stat cards with sample-size citations.
- **Outcomes**: Log New Decision modal (type: home/investment/career/major; date, title, description, readiness score, verdict, followedVerdict y/n), decision cards w/ mini verification timelines, Pending Verifications list, Verification Timeline (completed/pending/future dots), Record Outcome modal (positive/neutral/negative + financial-impact 5-point select + notes), Similar Profile Outcomes (anonymous cohort comparisons, "2yr verified" tags).
- Dashboard adds a purple "Outcome Verification Network Active" cross-link alert.

---

## 2. NEW Capabilities vs. Our Build

### BUILD-READY (fully specified in code)
1. **Monte Carlo retirement engine** — complete `runMonteCarlo(inp, numSims)` w/ Box-Muller, accumulation+drawdown phases, SS at 67, inflation-adjusted withdrawals, percentile outputs. (v3 L363-384 / v4 L1133-1194)
2. **What-If Scenario Modeling** — 6 parameterized scenarios re-running MC and showing Δscore/Δsuccess-rate. Fully coded. (v4 L1693-1743)
3. **Tax Planning Suite** — 2024 bracket tables (single + MFJ) hardcoded; bracket-room Roth conversion, SS 62/67/70 lifetime comparison, effective-rate waterfall, withdrawal sequencing. (v4 L1446-1514)
4. **14 Calculators in modal launcher** — affordability (28% rule), mortgage, rent-vs-buy, DTI, refinance (breakeven months), auto loan, lease-vs-buy, compound, FIRE (number + years-to), retirement, 50/30/20, net worth, debt payoff, emergency fund. All formulas inline.
5. **Outcome Verification / Decision Log** (v4) — decision entity (type/date/score/verdict/followedVerdict), CHECKPOINTS = [6,12,24,60] months, pending-verification queue, outcome recording (pos/neu/neg + financial impact), personal success-rate aggregation (`updateNetworkStats`, v4 L1982-2000). Front-end complete; needs backend.
6. **Trinity Engine messages** — rule-based Advocate/Skeptic/Arbiter copy generator from score+MC+concerns. (v4 L1357-1393)
7. **Prioritized Action Plan generator** — rule set: emergency fund <3mo → HIGH; savings <15% → HIGH; trad >$100k & income <$200k → Roth; 401k <$23k → max. (v4 L1398-1426)
8. **Quantum Readiness Field** — ACT NOW vs WAIT 6mo/1y/2y probability cards (+3/+5/+8 uplift). Trivial port. (v4 L1550-1575)
9. **Behavioral Genome derivation** — maps 4 sliders + inputs to 9 trait bars via simple formulas. (v4 L1519-1545)
10. **Temporal Twin** — score-conditional future-self messages on a vertical timeline. (v4 L1580-1601)
11. **Key Insights strip** — FI number = annualExpenses × retirePct / SWR; progress %; runway months. (v4 L1431-1441)
12. **Assessment History log** — 100-entry localStorage ring, JSON export. (v4 L1771-1806)
13. **Conflict Detection / Advisor Risk scorer** — 2-question additive score (commission +4, hybrid +2, fee +1; mostly-proprietary +4, some +2) → LOW/MOD/HIGH + platform comparison table. (v4 L1748-1766)

### NEEDS-DESIGN (concept/mock only in Command Center file)
14. **The Signal** — range-based weekly spending status ring (PROTECTED/amber/red). All values hardcoded; needs derivation from budget data. Partially overlaps Budget Overview.
15. **Permission System** — pre-purchase approval ritual (Approved / Not Yet / Ask Partner) + decision log. Mock only.
16. **Daily Money Minute + streaks** — 60s check-in timer, streak badge. Trivial UI but habit/engagement design needed.
17. **Blind Budget Mode** — hide exact balances, show ranges, 2-tap deliberate unlock. Novel UX; needs settings/privacy design.
18. **Certainty Breaker** — days 22–30 balance-hiding + auto-sweep to savings. Needs sweep mechanics/rules.
19. **Rebellion Defuser** — pre-approved no-ask micro-splurge budget.
20. **Single Envelope** — one discretionary pool philosophy (may conflict with category budgeting in our build).
21. **Money Circles / Shared Signal / Gift Pools** — social/relational layer: shared goals, emergency lending circles w/ trust scores, group gift pools. Multi-user backend required.
22. **Intent Router** — natural-language decision Q&A (hardcoded keyword matching in file; real version = LLM).
23. **Micro-Coaching & Grace Periods** — contextual single-nudge + auto-adjusting guardrails (busy-week +15%). Needs rule/ML design.
24. **Decision Reputation Score** — follow-through %, regret rate, calibration, improvement trend. Depends on #5 outcome data.
25. **Regret & Relief Engine** — "regret prevented $, crises avoided, time saved, confidence Δ" value-tracking. Needs instrumentation.
26. **Network Intelligence / Similar Profile Outcomes** — cohort-anonymized aggregate outcome stats. Needs multi-user data + privacy design.

### DUPLICATE (already in our build or close)
- Readiness score + verdicts READY/NOT YET/BUILD, compass animation, 3 sub-score rings (our score view)
- Monte Carlo fan chart pattern (if Analytics has projections — partial duplicate)
- Wealth trajectory chart; net worth calc (Investments monitor); 50/30/20 budget calc (Budget Overview); DTI/debt payoff (Transactions/Goals adjacent)
- Assessment input form (our onboarding/score engine presumably covers inputs)
- LocalStorage persistence pattern (we have a real backend)

---

## 3. Functions / Formulas Worth Porting

```js
// Box-Muller normal sample (v3 L361 / v4 L1109)
function boxMuller(){var u1=Math.random(),u2=Math.random();
  return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)}

// Monte Carlo (v4 L1133) — signature & mechanics
function runMonteCarlo(inp, numSims)
// accumulation: balance = balance*(1 + r + vol*boxMuller()) + annualSavings
// annualSavings = 401k + IRA + HSA + income*employerMatch/100
// drawdown: withdrawal = max(peakBalance*SWR, annualExpenses*retirePct);
//   balance = balance*(1+r+vol*boxMuller()) - withdrawalAdjusted + ss (ss from age 67);
//   withdrawalAdjusted *= (1+inflation)
// returns {successRate, p10, p25, p50, p75, p90, all}

// Financial score components (v4 L1199-1219) — NOTE: 100-pt scale, NOT our 35/35/30
score = min(40, successRate*0.4)
      + min(15, emergencyMonths*2.5)
      + min(20, savingsRatePct)
      + max(0, 15 - max(0, dti-30)*0.5)
      + (taxableShare>10% && rothShare>10% ? 10 : 5)   // diversification bonus
// Total: Math.round(fin*0.5 + emo*0.3 + tim*0.2)   ← conflicts with our 35/35/30; reconcile
// Verdict gates (v4 L1337): READY if score>=80 && MC success>=90;
//   NOT YET if score>=60 && success>=75; else BUILD

// 2024 federal brackets (v4 L1004-1023)
single: [11600, 47150, 100525, 191950, 243725, 609350] @ .10/.12/.22/.24/.32/.35/.37
MFJ:    [23200, 94300, 201050, 383900, 487450, 731200] @ same rates

// SS claiming (v4 L1470-1477): ss62 = ss*0.7; ss70 = ss*1.24;
//   lifetime = monthly*12*(lifeExpectancy - claimAge); pick max of 62/67/70

// FI number (v4 L1433): annualExpenses * (retirePct/100) / (SWR/100)

// Scenario shocks (v4 L1702-1729): jobLoss → cash -= expenses/2;
//   marketCrash → invested *= 0.6; earlyRetire → retireAge -= 5;
//   inheritance → +$100k; maxSavings → min(23000, 401k*2); medical → cash -= 50000

// Outcome verification cadence (v4 L1081): CHECKPOINTS = [6, 12, 24, 60] // months

// Quantum uplift (v4 L1552-1557): WAIT 6mo +3pts, 1y +5pts, 2y +8pts on success rate

// Genome derivation (v4 L1525-1535): lossAversion=(10-conf)*10; volTolerance=(vol/25)*100;
//   regretAsym=(10-align)*10; narrativeBias=stab*8; outcomeBias=sec*9; ...

// Advisor conflict score (v4 L1748-1758): commission+4/hybrid+2/fee+1; mostly-proprietary+4/some+2

// Affordability (v4 L2038+): maxPay = income/12*0.28 - debts;
//   maxLoan = maxPay*(( (1+r)^360 -1)/(r*(1+r)^360 )); verdict DTI<=28 READY / <=36 caution
```

---

## 4. UX Patterns Worth Adopting

- **Tab + sub-tab navigation** with color-coded active states per section; panels fade in (`fadeIn 0.3s`).
- **Card system**: icon chip (40px, 15%-alpha color bg) + title/subtitle header; consistent 16px radius slate cards.
- **Verdict tri-state everywhere**: READY (emerald) / NOT YET (yellow) / BUILD (red) badges — extend to every result, not just the score.
- **Range-over-precision display**: "$400–$600 remaining" conic-gradient signal ring instead of exact balances (Blind Budget Mode philosophy).
- **2-tap precision unlock** w/ confirm dialog + auto-hide — deliberate friction pattern.
- **Streak + ritual timer** (Daily Money Minute) for engagement.
- **Three-voice debate cards** (Advocate/Skeptic/Arbiter) color-bordered, avatar + role subtitle.
- **Verification timeline**: vertical gradient line w/ completed/pending/future dots — reuse for goals milestones.
- **Percentile fan chart** (p10/p50/p90 lines, filled median, dark grid) via Chart.js.
- **Scenario cards** → delta result boxes with +/- colored diffs and positive/negative verdict strip.
- **Empty states with CTA** ("No Decisions Tracked Yet → Log Your First Decision") — v4 has these on every list.
- **Alerts** with left-border color coding (info/success/warning/danger/purple).
- **Multi-stage loading theater**: "Running 10,000 simulations… → Analyzing behavioral patterns… → Synthesizing intelligence…" with triple-ring spinner.
- **Assessment sliders with semantic anchors** ("Anxious ↔ Confident") instead of bare numbers.

---

## 5. Audit Findings (homi_command_center_audit.html)

**Score: 72/100.** Breakdown: Structure 92 · Brand 88 · Functionality 75 · **Intelligence Layer 35** · Polish 68. Strengths: 12 features (clean structure, brand consistency, localStorage persistence, multiple view modes). Critical gaps: 7. **Claude/AI usage: 0%** — headline finding.

**Critical (blocking "elite" status):**
1. No Threshold Compass (signature visual absent) — ~2hr
2. Static mentor messages, no AI adaptation (context: completion %, time-of-day, streak, blocked tasks) — needs LLM integration
3. No velocity/burndown chart ("at this pace, finish [date]") — ~3hr
4. No Focus Mode (single-task distraction-free view) — ~1hr
5. No keyboard shortcuts (T/Space/F/N/?) — ~30min
6. No offline/PWA support — ~2hr

**Medium/enhancement:** no energy/mood tracking; no completion celebrations (confetti at 25/50/75/100%); no print view; no task dependencies.

**Claude Power recommendations:** contextual coaching from state (`buildContext()` pattern quoted: completionRate, daysLeft, streak, blockedTasks, timeOfDay → `getMentorGuidance()` calling Anthropic API, model `claude-sonnet-4-20250514`, max_tokens 500, system prompt "You are the HōMI launch mentor… ONE specific, actionable piece of guidance"); dynamic template generation; predictive insights (deadline-miss warnings, energy-drop detection, bottleneck identification); decision support with explicit reasoning.

**Priority roadmap (if 4 hours):** 1) Threshold Compass (~45m) 2) keyboard shortcuts (~30m) 3) velocity indicator = (done/days elapsed) vs (remaining/days left) → On Track/Behind/Ahead (~1h) 4) Focus Mode (~1h) 5) celebrations (~45m). If 8+ hours: wire Claude API for dynamic mentor, personalized templates, decision support, daily briefings.

*Note: the audit targets a launch-checklist command center, not the finance app directly — transpose: "tasks"→goals/habits, "mentor"→AI coach, "velocity"→savings-rate trajectory.*

**Additional finding from file inspection (not in audit):** `HoMI_Master_System_v4.html` is **truncated at line 2072 mid-calculator-definition** — the tail (most calc definitions, decision/outcome modal handlers, storage init) is missing from the delivered file; v4 as shipped would throw/fail to initialize calculator modal logic. v3 is the complete reference implementation.

---

## 6. Version Evolution v3 → v4

| Area | v3 | v4 |
|---|---|---|
| Size/structure | 90KB, single minified script, inline `onclick` handlers | 130KB, formatted/commented script, `data-panel`/`data-calc` delegation + `addEventListener` |
| Panels | 12 | 14 (**+Network, +Outcomes**) |
| Core engine | `runMC`, `calcFin/Emo/Tim` (identical math) | Same math, renamed `runMonteCarlo`, `calculateFinancialScore` etc.; staged loading texts 200ms→300ms |
| State | inputs/history in localStorage (`homi_inputs`, `homi_history`) | + `state.decisions` w/ outcomes map, `saveToStorage()` (key name in truncated tail) |
| New v4-only | — | Decision logging + outcome recording modals; CHECKPOINTS [6,12,24,60]; pending-verification queue; verification timeline; personal success-rate from followed verdicts; network hero stats, node-cloud viz w/ animated counter, aggregate outcome distribution, 4 intelligence stat cards; similar-profile cohort items; purple accent color + `alert-purple` + highlighted nav tab; empty states w/ CTAs; dashboard cross-link banner |
| Compass | identical 3-ring + keyhole | unchanged |
| File integrity | complete | **truncated at L2072** (compound calc def cut off; outcome handlers + init missing) |

**Strategic direction:** v3 = single-user analysis engine; v4 = pivot to the *data moat* — every decision becomes a tracked entity with scheduled outcome verification at 6mo/1y/2y/5y, feeding aggregate "proof the verdicts work" statistics (78.3% positive when followed; 4.6× worse when NOT YET ignored).
