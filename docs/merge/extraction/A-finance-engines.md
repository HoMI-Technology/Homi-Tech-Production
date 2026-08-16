# Extraction A — HōMI Finance Engines (4 single-file HTML apps)

Files inspected in full:
1. `HoMI_Financial_Wellness_Engine_Production.html` — 2,770 lines / 123KB — **"WELLNESS"** (consumer emotional-finance app)
2. `HoMI_Finance_Complete_v2.html` — 2,200 lines / 80KB — **"PRO"** (mobile decision-readiness concept)
3. `homi-finance-v2-unified.html` — 2,368 lines / 71KB — **"UNIFIED"** (desktop retirement platform; **TRUNCATED mid-file**)
4. `HoMI_Finance_Master_Corrected.html` — 1,312 lines / 82KB — **"MASTER"** (merged, brand-corrected, complete)

---

## 1. FINANCIAL FUNCTIONS & FORMULAS

### 1.1 WELLNESS (file 1) — ES5 IIFE, `window.HoMI` API

**Guilt-Free Joy Budget — 10% of monthly income** (line 1761):
```js
function calculateJoyBudget() {
    var income = state.user.monthlyIncome || 0;
    var joyPercent = 0.10; // 10% guilt-free
    state.joyBudget = Math.round(income * joyPercent);
    saveState();
    return state.joyBudget;
}
```

**Forecast savings rate — 15%** (lines 2106, 2129):
```js
var projectedSavings = (state.user.monthlyIncome * 0.15 * 12) || 0;
// per-month net:
var net = (state.user.monthlyIncome * 0.15) - total;   // total = that month's known expenses
// month severity: net < -500 → 'danger'; net < 0 → 'warning'
```

**Couples economics — 77% expense assumption** (line 2244):
```js
var combined = (state.couples.partner1.income || 0) + (state.couples.partner2.income || 0);
var expenses = combined * 0.77;
var savings = combined - expenses;
var p1Contrib = combined > 0 ? Math.round((state.couples.partner1.income / combined) * 100) : 50;
```

**Couples budget split — 10% personal each / 65% shared** (line 2266):
```js
var personal = income * 0.1;
var shared = income * 0.65;
```

**Paycheck metrics — 53% remaining heuristic** (lines 2375–2383):
```js
var netPay = state.user.netPay || (state.user.monthlyIncome / 2) || 0;
var remaining = netPay * 0.53;
daysUntil = Math.max(0, Math.ceil((payday - today) / (1000 * 60 * 60 * 24)));
```
7-day cash-flow forecast (line 2422): starts at `netPay * 0.53`, day 3 is hardcoded payday (`i === 2`), other days subtract random `Math.floor(Math.random() * 50 + 20)` (i.e., $20–$69). Colors: balance > 500 emerald, > 0 yellow, else red.

**Paycheck budget allocation constants** (line 2451) — of each net paycheck:
| Category | % | Note |
|---|---|---|
| 🏠 Housing | 38 | |
| 🍔 Groceries | 12 | |
| ⛽ Transport | 8 | |
| 📱 Bills | 10 | |
| 💰 Savings | 20 | `highlight: true` (emerald) |
| ✨ Guilt-Free | 12 | `joy: true` (purple) |
(Totals 100%. Note conflict: joy budget elsewhere = 10% of monthly income.)

**Decision Readiness scoring** (line 2475) — the file-1 readiness engine:
```js
var income = state.user.monthlyIncome * 12 || 60000;
var financialScore = Math.min(100, Math.max(30, 100 - (amount / income * 100)));

var emotionScores = { excited: 90, cautious: 75, anxious: 55, pressured: 40, uncertain: 50 };
var emotionalScore = emotionScores[emotion] || 60;

var timingScores = { planned: 95, opportunity: 80, pressure: 45, impulse: 30, life: 70 };
var timingScore = timingScores[timing] || 60;

var overall = Math.round((financialScore + emotionalScore + timingScore) / 3);
```

**Sinking-fund status bands** (line 2168): `percent >= 75 → 'on-track'`, `>= 50 → 'behind'`, else `'critical'`.

**Impulse resistance rate** (line 2014): `resisted / log.length * 100`, default 100 if no log. Streak resets to 0 on `proceedImpulse`, increments on `resistImpulse`; `totalSaved += cost` only on resist.

**Achievement thresholds** (line 1958): 🔥 7-Day Streak (`streak >= 7`), 💎 $1K Saver (`totalSaved >= 1000`), 🏆 30-Day Master (`streak >= 30`), ⭐ $5K Club (`totalSaved >= 5000`).

**formatCurrency** (line 1738): `>= 1e6 → '$X.XM'`; `>= 1e3 → '$XK'` (0 dp); else locale string, 0 fraction digits. Check-in history capped at 100 entries (line 1884).

### 1.2 PRO (file 2) — weighted HōMI Score + Monte Carlo

**HōMI Score — weights Financial 35% / Emotional 35% / Timing 30%** (line 1577):
```js
function calculateHomiScore() {
    const profile = appState.profile;
    // Financial Reality (35%)
    const savingsRate = profile.savingsRate * 100;
    const emergencyFund = (profile.taxableAccounts / profile.expenses) * 12;  // months of coverage
    const debtToIncome = 0;
    const financialScore = Math.min(100,
        (savingsRate * 0.4) +
        (Math.min(emergencyFund / 6, 1) * 30) +     // 6-month EF = max 30 pts
        ((1 - debtToIncome) * 30)
    );
    // Emotional Truth (35%) = mean of 9 genome dimensions
    const genomeAvg = GENOME_DIMENSIONS.reduce((sum, d) => sum + d.value, 0) / GENOME_DIMENSIONS.length;
    const emotionalScore = genomeAvg;
    // Perfect Timing (30%) — HARDCODED
    const timingScore = 74;
    const homiScore = Math.round((financialScore * 0.35) + (emotionalScore * 0.35) + (timingScore * 0.30));
    ...
}
```

**Verdict thresholds (file 2)** (line 1622): `>= 85 → '✓ READY'`, `>= 60 → '⏳ NOT YET'`, else `'🔨 BUILD'`.

**The Signal — blind-budget range display** (lines 1671–1702): range = `exactBalance * 0.9` floor to `* 1.1` ceil; double-tap within 500ms reveals exact for 30s then reverts. Seed `exactBalance: 2643`.

**Permission System** (line 1705):
```js
const affordability = (amount / appState.exactBalance) * 100;
const permissionScore = Math.max(0, Math.min(100, scores.total - (affordability * 0.3)));
```
Arbiter verdict threshold: `score >= 75` → proceed-with-30-day-wait copy; below → "Not yet" copy.

**Monte Carlo retirement simulator** (lines 1768–1851) — Box–Muller normal returns:
```js
function boxMuller() {
    let u1 = Math.random(), u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}
// constants:
const expectedReturn = 0.07;
const volatility = 0.15;
const withdrawalRate = 0.04;
const simulations = 10000;
const yearsToRetire = retireAge - currentAge;
const yearsInRetirement = 95 - retireAge;        // horizon: age 95
// accumulation:  balance = balance * (1 + annualReturn) + annualContrib;
// withdrawal:    annualWithdrawal = balance * withdrawalRate;  (fixed $ from retirement-year balance)
//                balance = balance * (1 + annualReturn) - annualWithdrawal;  break if <= 0
// success = finalBalance > 0; percentiles p10/p50/p90 after sort
```
Displayed: success rate (colored emerald if `>= 85`, else yellow), median at retirement (`/1e6 → M`), safe withdrawal = `median * 0.04`.

### 1.3 UNIFIED (file 3) — retirement-platform engine (PARTIAL — see §6)

**Profile collector defaults** (line 2266, `collectProfile()`):
```js
currentAge: 35, retirementAge: 60, lifeExpectancy: 90,
filingStatus: 'married', state: 'CA',
income: 175000, expenses: 85000, savings: 40000,
retirementExpensePct: 75, ssBenefit: 3200,          // monthly at 67
taxable: 150000, cash: 30000,
traditional401k: 325000, traditionalIRA: 45000,
roth401k: 0, rothIRA: 55000,
expectedReturn: 0.07, volatility: 0.15, inflation: 0.03,
withdrawalRate: 0.035, targetPortfolio: 2500000
```

**Monte Carlo engine (lines 2324–2368, then file is CUT OFF)**:
```js
function runMonteCarlo(profile, simulations = 10000) {
  const years = profile.lifeExpectancy - profile.currentAge;
  const retireYear = profile.retirementAge - profile.currentAge;
  const totalPortfolio = profile.taxable + profile.cash + profile.traditional401k +
                         profile.traditionalIRA + profile.roth401k + profile.rothIRA;
  for (let sim = 0; sim < simulations; sim++) {
    let portfolio = totalPortfolio;
    for (let year = 1; year <= years; year++) {
      // Box-Muller inline:
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const yearReturn = profile.expectedReturn + z * profile.volatility;
      portfolio *= (1 + yearReturn);
      if (year <= retireYear) {
        portfolio += profile.savings;
      } else {
        const retireExpenses = profile.expenses * (profile.retirementExpensePct / 100);
        portfolio -= retireExpenses * Math.pow(1 + profile.inflation, year);
        // Social Security after 67:
        if (profile.currentAge + year >= 67) { portfolio += profile.ssBenefit * 12; }
      }
      path.push(Math.max(0, portfolio));
    }
    results.          // ← FILE TRUNCATED HERE (line 2368, ends mid-identifier)
```

### 1.4 MASTER (file 4) — 15 core calculators (exact `logic` functions, line 842)

```js
var calcs = {
  affordability: fields ['Annual Income','Monthly Debt'],
      logic: (v) => (v[0]/12*0.36 - v[1]) * 12 * 5;              // 36% DTI × 5× multiplier
  mortgage:      fields ['Loan Amount','Rate %'],
      logic: (v) => { var r=v[1]/1200; return v[0]*r*Math.pow(1+r,360)/(Math.pow(1+r,360)-1); },  // 30-yr amortization
  rentVsBuy:     fields ['Monthly Rent','Home Price'],
      logic: (v) => (v[0]*12*10 > v[1]*0.4) ? 'BUY recommended' : 'RENT recommended';   // 10yr rent vs 40% price
  auto:          fields ['Car Price','Rate %'],
      logic: (v) => { var r=v[1]/1200; return v[0]*r*Math.pow(1+r,60)/(Math.pow(1+r,60)-1); },    // 60-mo amortization
  lease:         fields ['Car Price','Monthly Lease'],
      logic: (v) => (v[1]*36 < v[0]*0.4) ? 'LEASE recommended' : 'BUY recommended';
  fire:          fields ['Annual Spending'], logic: (v) => v[0] * 25;                      // 4% rule (25×)
  debt:          fields ['Balance','Monthly Payment'],
      logic: (v) => v[1] > 0 ? Math.ceil(v[0]/v[1]) + ' months' : '∞';
  compound:      fields ['Principal','Years'], logic: (v) => v[0] * Math.pow(1.07, v[1]);  // fixed 7%
  rule72:        fields ['Interest Rate %'], logic: (v) => v[0] > 0 ? (72/v[0]).toFixed(1)+' years' : '∞';
  dti:           fields ['Monthly Income','Monthly Debt'], logic: (v) => v[0]>0 ? pct(v[1]/v[0]*100) : '0%';
  netWorth:      fields ['Total Assets','Total Liabilities'], logic: (v) => v[0]-v[1];
  emergency:     fields ['Monthly Expenses'], logic: (v) => v[0]*6;                        // 6-month EF
  savingsRate:   fields ['Monthly Income','Monthly Saved'], logic: (v) => v[0]>0 ? pct(v[1]/v[0]*100) : '0%';
  hourly:        fields ['Annual Salary'], logic: (v) => v[0]/2080;                        // 2,080 work-hrs
  latte:         fields ['Daily Expense'], logic: (v) => v[0]*365*10;                      // 10-year cost
};
```

**7 "Tax Pro" calculators** (line 860) — exact constants:
```js
roth:   fields ['Trad IRA Balance','Current Bracket %','Retirement Bracket %'],
    logic: benefit = v[0] * ((v[1]-v[2])/100); benefit>0 ? fmt(benefit)+' lifetime benefit' : 'Wait—current bracket higher';
irmaa:  fields ['MAGI'],
    thresholds = [103000, 129000, 161000, 193000, 500000];          // single-filer MAGI tiers
    surcharges = [0, 69.90, 174.70, 279.50, 384.30, 419.30];        // $/mo Part B
    tier = count of thresholds exceeded; tier===0 → 'No IRMAA surcharge' else '+$X.XX/month Part B';
qcd:    fields ['IRA Balance','Age','Charity Goal'],
    divisors = {72:27.4, 73:26.5, 74:25.5, 75:24.6, 76:23.7, 77:22.9, 78:22.0, 79:21.1, 80:20.2};  // IRS Uniform Lifetime Table (clamped 72–80, fallback 26.5)
    rmd = balance / divisor; optimal = min(charityGoal, rmd, 105000);  // $105k QCD cap
widow:  fields ['Joint Income','Filing Status'], logic: penalty = v[0] * 0.05;   // flat 5% estimate
capGains: fields ['Taxable Income','Unrealized Gains'],
    threshold = 47025; headroom = max(0, threshold - income);        // 2024 single 0% LTCG bracket top
stateArb: fields ['Income','Current State Rate %'], logic: savings = income*(rate/100)*25;  // 25-year horizon
lossHarvest: fields ['Loss Amount','Tax Bracket %'], logic: savings = loss * bracket/100;
```

**What-If scenarios** (line 870):
```js
crash:    'Portfolio drops 30%' → fmt(s.user.savings * 0.7) + "Recovery estimate: 2-4 years with continued investing";
job:      '6 months no income' → runway = Math.round(savings / (income * 0.6))  // months at 60% spending
windfall: 'Receive $10,000' → hardcoded split: $8,000 Invest / $2,000 Enjoy (80/20)
```

**MASTER scoring engine** (line 958, `calcScores()`):
```js
var fin = 20;
if (s.savings > 10000) fin += 30;
if (s.savings > s.income * 3) fin += 20;
if (s.debt === 0) fin += 30;
else if (s.debt < s.income * 3) fin += 15;
fin = Math.min(100, fin);                        // max reachable = 100
var emo = 40;
if (s.savings > s.income * 3) emo += 30;
if (state.impulse.streak > 5) emo += 20;
if (state.moods.length && state.moods[0] === 'calm') emo += 10;
emo = Math.min(100, emo);
var time = 50;
if (s.savings > 0) time += 20;
if (s.debt < s.savings) time += 30;
time = Math.min(100, time);
return { total: Math.round((fin * 0.35 + emo * 0.35 + time * 0.30)), fin, emo, time };
```

**MASTER Monte Carlo** (line 1035) — note: uniform distribution, NOT Box–Muller:
```js
var sims = 10000;
var years = Math.max(1, s.retAge - s.age);
for (var i = 0; i < sims; i++) {
    var balance = s.savings;
    for (var y = 0; y < years; y++) {
        var ret = 0.07 + (Math.random() - 0.5) * 0.3;   // uniform −8% … +22%
        balance = balance * (1 + ret) + s.income * 0.15 * 12;  // 15% savings contribution
    }
    results.push(balance);
}
var successCount = results.filter(function(r) { return r > s.income * 25; }).length;  // 25× income = FI
var successRate = Math.round(successCount / sims * 100);
var median = results[Math.floor(sims / 2)];   // after sort
// qRisk = 100 - successRate
```

**Wealth chart growth factors** (line 1272): `[savings, savings*1.07 + income*0.1*12, savings*1.23 + income*0.1*36, savings*1.4 + income*0.1*60, savings*2 + income*0.1*120]` (Now/1Y/3Y/5Y/10Y; 10% monthly contribution assumption).

**MASTER behavioral genome derived from stress slider** (line 1201) — 9 dims:
```js
Loss Aversion:        min(100, 50 + stress*5)
Time Perception:      min(100, (10 - stress) * 10)
Confidence:           min(100, 60 - stress*2)
Volatility Tolerance: min(100, 100 - stress*8)
Regret Asymmetry:     min(100, 40 + stress*6)
Social Proof:         min(100, stress*8 + 20)
Narrative Bias:       min(100, 50 + stress*3)
Agency:               min(100, 80 - stress*4)
Outcome Bias:         min(100, 30 + stress*4)
// insight: dims[0].val > 60 → 'Your loss aversion is elevated. Consider "permission-based" spending to reduce anxiety.'
```

**MASTER tax-efficiency score** (line 1086): `savings > 50000 → 'OPTIMIZED'`; `> 10000 → 'GOOD'`; else `'NEEDS WORK'`.

---

## 2. DATA MODEL

### localStorage keys by file
| File | Key(s) |
|---|---|
| WELLNESS | `homi_state` (single blob, deep-merged into defaults) |
| PRO | `homi_profile`, `homi_decisions`, `homi_settings`, `homi_genome` (4 keys) |
| UNIFIED | `homi_profile` (single blob + `savedAt` ISO timestamp) |
| MASTER | `homiFinanceProfile` (single blob) |

### WELLNESS defaultState (line 1687)
```js
{
  user: { name: '', monthlyIncome: 0, payFrequency: 'biweekly', nextPayday: '', netPay: 0 },
  emotions: { current: null, history: [], checkIns: [] },
  impulse: { streak: 0, totalSaved: 0, log: [], lastCheckIn: null },
  forecast: { expenses: [], balance: 0 },
  sinkingFunds: [],
  couples: { partner1: { name: 'You', income: 0 }, partner2: { name: 'Partner', income: 0 }, goals: [], budgetSplit: 50 },
  settings: { adhdMode: false, onboardingComplete: false },
  joyBudget: 0
}
```
Record shapes: impulse log `{name, amount, trigger, resisted, paused?, date ISO}`; forecast expense `{id: Date.now(), name, amount, date, recurrence: once|monthly|quarterly|annual}`; sinking fund `{id, name, target, current, date, icon}`; shared goal `{id, name, target, current}`; check-in `{emotion, note, timestamp ISO}`.

Pay frequencies (both WELLNESS onboarding & settings): `weekly | biweekly | semimonthly | monthly`.
Impulse triggers: `stress, boredom, social, reward, sadness, celebration`.
Decision types: `home, car, investment, education, business, career, major`.
Decision emotions: `excited, cautious, anxious, pressured, uncertain`. Decision timing: `planned, opportunity, pressure, impulse, life`.
Emotion set: `anxious 😰, guilty 😔, stressed 😫, hopeful 🌟, calm 😌, empowered 💪`.

### PRO appState (line 1528)
```js
{
  currentTab: 'command', blindBudgetMode: false, exactBalance: 2643,
  signalRevealed: false, tapCount: 0, lastTap: 0,
  profile: { age: 35, retirementAge: 65, income: 85000, expenses: 55000,
             savingsRate: 0.20, portfolio: 150000, taxableAccounts: 50000,
             taxDeferred: 80000, roth: 20000 }
}
```
GENOME_DIMENSIONS (9, with seeds): Loss Aversion 72, Time Perception 65, Confidence Calibration 58, Volatility Tolerance 48, Regret Asymmetry 77, Social Proof Sensitivity 82, Narrative Bias 69, Agency Attribution 54, Outcome Bias 61 (colors cycle cyan/emerald/yellow).

### UNIFIED state (line 2183): `{ profile: {}, results: null, scenarios: [], charts: {}, currentPanel: 'dashboard' }`; profile fields per §1.3 (`filingStatus: single|married|hoh`, `state: CA|TX|FL|NY|WA|NV|CO|AZ|other`).

### MASTER state (line 834)
```js
{
  user: { name: '', income: 0, savings: 0, debt: 0, age: 35, retAge: 65, stress: 5 },
  impulse: { streak: 0, saved: 0, resists: [] },   // resists: {item, cost, date ISO}
  decisions: [],                                    // {title, amount, date ISO}
  moods: [],                                        // 'anxious'|'calm'|'bold'|'stressed'
  onboarded: false
}
```

### Seed/hardcoded chart data
- WELLNESS emotional chart: Stress Spending `[45,32,127,28,89,156,67]`, Planned `[120,85,45,200,67,234,156]`; impulse doughnut `[35,25,20,12,8]` (Stress/Boredom/FOMO/Reward/Other); couples stacked bars You `[990,275,165,99,132,275]`, Partner `[810,225,135,81,108,225]`.
- PRO quantum grid seeds: Buy Now 78 (current), Wait 3mo 85 (82% likely), Wait 6mo 91 (76% likely), Market Crash 54 (12% likely).
- MASTER network stats: 12,482 active nodes, 98% verified.

---

## 3. SCORING / VERDICT LOGIC — cross-file comparison

| File | Composite | READY | Middle | Low |
|---|---|---|---|---|
| WELLNESS | unweighted avg of 3 | ≥80 `READY` | ≥60 `NOT YET` | <60 `BUILD FIRST` |
| PRO | 35/35/30 weighted | ≥85 `✓ READY` | ≥60 `⏳ NOT YET` | <60 `🔨 BUILD` |
| UNIFIED | (UI only — engine truncated) `ready/not-yet/build` badge classes | — | — | — |
| MASTER | 35/35/30 weighted | ≥80 `READY` | ≥55 `BUILDING` | <55 `NOT YET` |

**Verdict copy (WELLNESS, line 2506):**
- READY: "You're in a strong position. Your financial reality, emotional state, and timing are aligned. Trust yourself." (compass 🔒→🔑, `.ready` glow)
- NOT YET: "You're getting close, but there are things to strengthen first. This isn't 'no'—it's 'not yet.'"
- BUILD FIRST: "Let's focus on building a stronger foundation first. This decision will still be available when you're truly ready."

**Trinity Engine** (exists in 3 variants):
- PRO (line 1733): The Advocate ✨ (emerald) / The Skeptic ⚠️ (yellow) / The Arbiter ⚖️ (cyan). Arbiter threshold `score >= 75`: pass copy = "…I recommend waiting 30 days to confirm this isn't impulse-driven…"; fail copy = "Not yet. Your desire is valid, but timing is off… Let's revisit in 3 months…"
- UNIFIED (line 2039): Logic ⚡ / Empathy 💚 / Timing ⏱ — renamed roles, no consensus logic survives.
- MASTER (line 1064): Advocate/Skeptic/Arbiter restored; Arbiter thresholds: `>= 80` → "…build a 6-month cash buffer as insurance against sequence risk."; `>= 60` → "…increasing savings rate by 5% over the next 12 months."; else → "…extending your timeline or reducing expected retirement spending by 15-20%."

**Temporal Twin thresholds** — successRate bands ≥80 / ≥60 / <60 in both PRO (3 messages: +5yr, +10yr, at-retirement) and MASTER (single message). MASTER <60 copy: `"I wish you'd started earlier, but you didn't, and that's okay. What matters is that you started. Every dollar from here matters twice as much."`

**Outcome-validation stats (PRO, hardcoded):** "4.6× — Higher negative outcomes for users who ignored NOT YET"; "91% — Positive outcomes for users who followed READY verdicts". Decision checkpoints: 6mo/12mo/24mo/60mo (verified/due/pending).

---

## 4. UI / ARCHITECTURE

**Shared design tokens (all 4 files):** `--cyan: #22d3ee; --emerald: #34d399; --yellow: #facc15; --navy: #0a1628; --slate: #1e293b; --light: #e2e8f0; --red/danger: #ef4444`. WELLNESS/MASTER add `--purple: #a855f7; --orange: #f97316`. Fonts: **Inter** (body, 300–900) + **Fraunces** (serif display) via Google Fonts. Logo always 4-color spans: H=cyan, ō=emerald(Fraunces), M=yellow, I=cyan. Chart.js everywhere (WELLNESS pinned `@4.4.1`); UNIFIED adds D3 v7 + html2canvas + jsPDF (PDF export). Conic-gradient/canvas score rings; rotating 3-ring compass (cyan 20s CW, emerald 15s CCW, yellow 10s CW); ambient blurred orbs; toast/notification systems.

**WELLNESS:** top-nav panel app, 6 panels — 💚 Mindful, 🔮 Future, ⚡ Impulse, 💕 Couples, 📅 Paycheck, 🎯 Readiness. Features: onboarding wizard (4 steps: name → income → pay frequency), emotion check-in grid + coach chat, Guilt-Free Budget card, 12-month forecast timeline + sinking funds, impulse streak/achievements/log, couples dashboard + Money Date, paycheck calendar + 7-day cash flow, readiness assessment. Modals: impulse, addExpense, addSinkingFund, addGoal. ADHD "Focus Mode" toggle (sets `--transition` 0.1s/0.3s).

**PRO:** mobile-first, bottom-nav 6 tabs — COMMAND, MINDFUL, INTEL, TOOLS, OUTCOMES, STRATEGY. Canvas score ring (radius 80, lw 12, cyan→emerald gradient arc from −π/2). The Signal (tap-twice reveal), Permission System form, Behavioral Genome bars, Weekly Window (Day 4 of 7, 57%), Safety Margin ($487 seed), Monte Carlo + Trinity + Temporal Twin + Quantum grid, 19-calculator registry (only `afford` and `fire` have real forms; `calculateModal()` is a stub returning "View simulation for detailed analysis"), decision log with checkpoints, withdrawal-sequencing stack (1. Taxable → 2. Tax-Deferred → 3. Roth), hardcoded action plan ("Convert $47,250 to Roth This Year… $14,000 lifetime tax savings").

**UNIFIED:** desktop sidebar app (280px fixed sidebar, collapsible <900px), 12 panels in 5 nav groups — Overview (Dashboard, Financial Profile), Analysis (Monte Carlo, Tax Optimization, Social Security, Withdrawal Strategy), Visualizations (Cash Flow Sankey, Coast FIRE, Glide Path, Life Timeline), Advanced (Historical Backtest, Advanced Tax [NEW badge], Scenario Compare), Intelligence (Trinity Engine, Temporal Twins). Sub-tabs: tax (brackets/roth/RMD), backtest (crisis/sequence/rolling), adv-tax (widow/IRMAA/QCD/state). Profile form = 4 cards (Personal, Income & Expenses, Account Balances, Assumptions). Coast FIRE slider age 30–65; glide-path risk slider 1–5. Crisis scenarios hardcoded: 1929 (−89%), 1966 stagflation, 2000 (−49%), 2008 (−57%). Import/export JSON modal; save/load scenario modal; print stylesheet. Score ring SVG dasharray 251.2 (r=40). **All engine code below `runMonteCarlo` line 2368 is missing.**

**MASTER:** mobile app-shell (`height: 100dvh; overflow: hidden`), dual nav: 10-chip top nav (Dashboard, Command, Mindful, Impulse, Tools, Tax Pro, Intel, Genome, Network, Plan) + 5-icon SVG bottom nav (Home, Command, Mood, Tools, Intel). Full-screen loader with keyhole-compass SVG (hides after 1800ms). Brand-corrected "Threshold Compass" SVG: 3 glowing rings with orbiting dots (outer r=85 cyan w/ 4 dots, middle r=60 emerald w/ 4 dots, inner r=35 yellow) + static center keyhole (circle+rect, `#facc15`). CSS score circle: `background: conic-gradient(var(--cyan) calc(var(--score,0) * 3.6deg), rgba(255,255,255,0.08) 0deg)`. Modals: onboarding, assessment (income/savings/debt/age/retAge/stress slider 1–10), impulse, newDecision, generic calc modal. Event-delegation architecture (`bindEvents`, `data-view`, `data-close`), `$`/`$$` helpers, `fmt = '$' + Math.round(n).toLocaleString()`, `pct`. Simulated Plaid link adds $24,500 savings / $1,200 debt (Chase Checking $4,500, Ally Savings $20,000). Paycheck calendar hardcodes paydays on 15th & 28th.

---

## 5. BRAND COPY (verbatim, distinctive)

- Title/meta: "HōMI | Financial Wellness Engine"; "HōMI Finance — Decision Readiness Intelligence"; "HōMI Finance v2.0 — Complete Financial Intelligence Platform"; "HōMI | Decision Readiness Intelligence™" / "Emotionally Intelligent Decision OS".
- Taglines: "Financial Wellness Engine"; "Financial Intelligence Platform"; "Decision Readiness Intelligence™"; "Master" (header sub).
- Onboarding: "This is a shame-free space for your financial wellness journey. We're not here to judge—we're here to help you understand your relationship with money." / MASTER: "A shame-free space for financial clarity." CTA: "Start My Journey" / "Begin Your Journey".
- Shame-Free Zone banner: "Progress, not perfection. Every small step counts."
- Guilt-Free Joy Budget: "This is yours to enjoy—no questions, no guilt."
- Coach greeting: "I'm here to help you understand your relationship with money—without any judgment."
- Coach responses per emotion (WELLNESS, verbatim): anxious → "I hear you. Financial anxiety is real, and you're not alone. Let's take it one step at a time…"; guilty → "…you deserve to spend on things that bring you joy. The goal isn't perfection—it's progress."; hopeful → "That's wonderful! Hope is powerful fuel…"
- Impulse pause: "Great choice! 48-hour pause set for X. 73% of users decide they don't need it after the pause. 💪"
- Impulse overspend: "That's okay—awareness matters more than perfection."
- Money Date: "15 minutes to harmony"; "no blame, just understanding."
- MASTER chat seed: "Hello. I'm your financial wellness companion. No judgment here—just honest guidance when you need it."
- Network insights: "73% received 'NOT YET' verdicts this week"; "$2.4M in impulse purchases avoided"; "89% report improved financial clarity".
- Temporal Twin (PRO, ≥85%): "Remember when you thought this was impossible? You proved yourself wrong. Your consistency changed everything."
- Card subtitles: "Will you be okay?" (readiness); "See your future before it happens" (forecast); "Know before you're broke" (cash flow); "Save now, avoid stress later" (sinking funds); "Autonomy within alignment" (couples); "Budget on YOUR rhythm" (paycheck).
- MASTER blind features: "The Signal… Protected • Buffer Active • Tap twice to reveal exact" (PRO); "🙈 Blind Budget Mode — Show ranges instead of exact amounts".
- No formal legal disclaimers found in any of the 4 files.

---

## 6. VERSION EVOLUTION & WHICH IS MOST COMPLETE

**Progression:** WELLNESS (emotional/behavioral consumer app) → PRO (mobile "Decision Readiness" concept with heavy engines but stubbed calculators) → UNIFIED (desktop retirement-planning platform; ambitious but **incomplete file**) → MASTER (merge + brand correction; the intended superset).

**UNIFIED is defective:** the file ends at line 2368 mid-statement (`    results.`) inside `runMonteCarlo()`. Everything after — simulation result aggregation, all chart renderers, tax/RMD/SS/withdrawal/coast-FIRE/glide-path computations, Trinity/Temporal generation, scenario save/load/compare, PDF export — is referenced by the HTML but **absent from the file**. As shipped it cannot function past profile collection. This is likely what "Master_Corrected" corrects.

**What MASTER fixes / changes vs the others:**
1. **Completes the unified vision in one working file**: 22 working calculators (15 core + 7 tax) with real `logic` functions vs PRO's 19-entry registry with only 2 implemented forms and UNIFIED's missing engine.
2. **Brand-corrected compass**: proper "Threshold Compass" with keyhole SVG center (comment: `<!-- Brand-compliant Threshold Compass -->`; loader comment: `<!-- LOADER with proper keyhole compass -->`) — replaces the 🔒/🔑 emoji center of WELLNESS and plain SVG rings of PRO.
3. **Verdict banding corrected**: MASTER uses ≥80 READY / ≥55 BUILDING / <55 NOT YET — PRO had ≥85 READY and WELLNESS put NOT YET in the middle; MASTER makes NOT YET the *lowest* band and introduces BUILDING as the middle. (Inconsistent with PRO's ≥85 — a deliberate or accidental threshold change worth flagging.)
4. **Score weights retained** (35/35/30) but financial sub-score is rule-based (savings/debt thresholds) instead of PRO's savings-rate/EF formula; timing no longer hardcoded 74 — derived from savings/debt relationship.
5. **Monte Carlo simplified**: uniform `0.07 ± 0.15` distribution (not Box–Muller normal), accumulation-only (no withdrawal phase), success = final > 25× income (FIRE-number criterion) vs PRO's balance>0-at-95.
6. **New storage key** `homiFinanceProfile` (vs `homi_state`, 4-key PRO scheme, `homi_profile`).
7. **Tax Pro content made real**: IRMAA tiers, QCD divisors (IRS Uniform Lifetime Table ages 72–80), 0% LTCG headroom ($47,025), widow's penalty — all present only as tab placeholders in UNIFIED.
8. **Dual mobile nav** (chips + bottom icons), `100dvh` app-shell, safe-area insets, loader screen — most polished mobile architecture.
9. Behavioral Genome made *computed* from stress slider instead of static seeds (PRO).

**Most complete/correct:** `HoMI_Finance_Master_Corrected.html` — the only file where every advertised feature has working JS. Richest *engine* code (normal-distribution Monte Carlo with drawdown) lives in PRO file 2; richest retirement data-model/defaults live in UNIFIED file 3 (but its engine is cut off); the emotional-wellness feature set (couples, paycheck rhythm, sinking funds, shame-free coaching) exists only in WELLNESS file 1.
