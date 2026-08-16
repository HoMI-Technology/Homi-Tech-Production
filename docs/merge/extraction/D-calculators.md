# D — HōMI Calculators Extraction Digest

Source files (all single-file HTML apps, dark navy theme, Inter font, Chart.js 4.4.0 where noted):

| File | Lines | Size | Role |
|---|---|---|---|
| `homi-house-affordability-calculator.html` | 1,015 | 39KB | **v1 "basic"** — original concept: score + Monte Carlo + Trinity + Temporal Twin. No Chart.js. |
| `homi-calculator-production-part1.html` | 1,303 | 52KB | **v2 "part1"** — expanded inputs (state/incomeType/relationship/market/rate-trend), live metrics, PITI/PMI functions; JS intentionally truncated ("CONTINUED IN NEXT MESSAGE"). |
| `homi-house-calculator-complete.html` | 926 | 35KB | **v3 "complete"** — compact working build: live metrics + score + affordability + verdict + action plan. No charts rendered (Chart.js loaded but unused). |
| `homi-calculator-production-phase2.html` | 1,759 | 81KB | **v4 "phase2"** — full production build: Monte Carlo crash sim, loan products, 30-yr TCO, cash-flow, Trinity, 2 Chart.js charts. |
| `homi-house-affordability-calculator-expert.html` | 2,304 | 98KB | **v5 "expert"** — richest build: iterative max-loan solver, FHA/conv loan options w/ closing costs, scenario comparison table, Path-to-Readiness milestones, histogram chart, save/export controls, localStorage. |

Shared brand: "Decision Readiness Intelligence™", tagline "Will you be okay?" instead of "Can you afford it?", footer "◉→ The compass holds", "73% of HōMI users receive NOT YET verdicts", "We profit when you succeed, not when you transact."

---

## 1. Calculation Functions (core JS, quoted verbatim)

### 1.1 Mortgage P&I — amortization payment (part1 L1266–1271, phase2 L1147–1152)

```js
// Calculate monthly payment using amortization formula
function calculateMonthlyPayment(principal, annualRate, months) {
    if (annualRate === 0) return principal / months;
    const monthlyRate = annualRate / 100 / 12;
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) /
           (Math.pow(1 + monthlyRate, months) - 1);
}
```

### 1.2 PITI (part1 L1274–1290 — most complete variant; includes HOA + PMI)

```js
// Calculate complete PITI
function calculatePITI(loanAmount, rate, propertyPrice, propertyTaxRate, insuranceAnnual, hoaMonthly = 0) {
    const pi = calculateMonthlyPayment(loanAmount, rate, MONTHS_30_YEAR);
    const taxes = (propertyPrice * propertyTaxRate / 100) / 12;
    const insurance = insuranceAnnual / 12;
    const pmi = calculatePMI(loanAmount, propertyPrice);

    return {
        principal: loanAmount / MONTHS_30_YEAR,   // NOTE: simplistic straight-line principal, not true amortization split
        interest: pi - (loanAmount / MONTHS_30_YEAR),
        pi: pi,
        taxes: taxes,
        insurance: insurance,
        pmi: pmi,
        hoa: hoaMonthly,
        total: pi + taxes + insurance + pmi + hoaMonthly
    };
}
```

Expert variant (L1483–1503) is simpler — inline P&I, no PMI/HOA, returns `{pi, taxes, insurance, total}`:

```js
function calculatePITI(loanAmount, rate, propertyPrice, propertyTaxRate, insuranceAnnual) {
    const monthlyRate = rate / 12 / 100;
    const numPayments = 360; // 30 years
    const PI = loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
               (Math.pow(1 + monthlyRate, numPayments) - 1);
    const T = (propertyPrice * propertyTaxRate / 100) / 12;
    const I = insuranceAnnual / 12;
    return { pi: PI, taxes: T, insurance: I, total: PI + T + I };
}
```

### 1.3 PMI

Two signatures across versions:

```js
// part1 L1293–1298 — infers DP% from loan vs price
function calculatePMI(loanAmount, propertyPrice) {
    const dpPercent = ((propertyPrice - loanAmount) / propertyPrice) * 100;
    if (dpPercent >= 20) return 0;
    const pmiRate = dpPercent < 10 ? 0.01 : 0.0075;
    return (loanAmount * pmiRate) / 12;
}

// expert L1506–1510 — takes DP% directly
function calculatePMI(loanAmount, downPaymentPercent) {
    if (downPaymentPercent >= 20) return 0;
    const pmiRate = downPaymentPercent < 10 ? 0.01 : 0.0075;
    return (loanAmount * pmiRate) / 12;
}
```

**PMI rates: 0 (≥20% down), 0.75%/yr (10–<20% down), 1.0%/yr (<10% down). FHA MIP: 0.85%/yr** (phase2 L1115 `(loanFHA * 0.0085) / 12`; expert L1826 same).

### 1.4 Affordability — price from payment (inverse amortization)

Complete (L779–784):

```js
function calculateAffordablePrice(monthlyPI, rate, downPayment) {
    const monthlyRate = rate / 12 / 100;
    const numPayments = 360;
    const loanAmount = monthlyPI / (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) * (Math.pow(1 + monthlyRate, numPayments) - 1);
    return loanAmount + downPayment;
}
```

Expert — iterative solver for the circular price↔taxes dependency (L1598–1614), 10 iterations seeded at $300K:

```js
// Calculate max loan amount from payment
function calculateMaxLoanAmount(maxPayment, rate, propertyTaxRate, insuranceAnnual) {
    // Iterative approach since PITI is circular (price depends on loan depends on price)
    let estimatedPrice = 300000;
    for (let i = 0; i < 10; i++) {
        const estimatedTaxes = (estimatedPrice * propertyTaxRate / 100) / 12;
        const estimatedInsurance = insuranceAnnual / 12;
        const piAvailable = maxPayment - estimatedTaxes - estimatedInsurance;

        const monthlyRate = rate / 12 / 100;
        const numPayments = 360;
        const loanAmount = piAvailable * (Math.pow(1 + monthlyRate, numPayments) - 1) /
                         (monthlyRate * Math.pow(1 + monthlyRate, numPayments));

        estimatedPrice = loanAmount;
    }
    return estimatedPrice;
}
```

Complete's affordability wrapper (L761–763) — 28% rule minus Florida-default taxes/insurance:

```js
const maxPayment = takeHome * 0.28;
const monthlyPI = maxPayment - (estimatedPrice * 0.0098 / 12) - (8800 / 12);   // hardcodes 0.98% tax, $8,800/yr insurance (Florida)
const affordable = calculateAffordablePrice(monthlyPI, rate, downPayment);
```

### 1.5 Box-Muller normal sampler (all versions)

```js
// part1/phase2 parameterized version (part1 L1258–1263)
function boxMuller(mu = 0, sigma = 1) {
    let u = 0, v = 0;
    while(u === 0) u = Math.random();
    while(v === 0) v = Math.random();
    return mu + sigma * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
```

### 1.6 Monte Carlo — v1 basic (L822–844): affordability distribution

```js
function runMonteCarloSimulation(income, debt, downPayment, rate) {
    const scenarios = 10000;
    const results = [];
    for (let i = 0; i < scenarios; i++) {
        const marketVolatility = 0.15;
        const marketReturn = boxMuller() * marketVolatility;
        const incomeVariation = 1 + (boxMuller() * 0.1);
        const debtVariation = 1 + (boxMuller() * 0.05);
        const adjustedIncome = income * incomeVariation;
        const adjustedDebt = debt * debtVariation;      // NOTE: computed but unused
        const frontEndDTI = 0.28;
        const maxMonthlyPayment = (adjustedIncome / 12) * frontEndDTI;
        const maxLoan = (maxMonthlyPayment * 1000) / (rate * 0.8);   // crude heuristic, NOT amortization
        const maxPrice = maxLoan + downPayment;
        results.push(maxPrice * (1 + marketReturn));
    }
    return results.sort((a, b) => a - b);
}
// percentiles: p10/p50/p90 at indices 0.1/0.5/0.9; successRate = share of results >= p50*0.8
```

### 1.7 Monte Carlo — phase2 (L1019–1070): survival/stress-test sim

```js
function runMonteCarlo(income, debt, downPayment, emergencyFund, jobStability, rate) {
    const scenarios = [];
    const NUM_SCENARIOS = 10000;
    for (let i = 0; i < NUM_SCENARIOS; i++) {
        const marketType = Math.random();
        let priceChange, jobLossProb;
        if (marketType < 0.05)      { priceChange = -0.33; jobLossProb = 0.15; }  // 2008 crash, 5%
        else if (marketType < 0.15) { priceChange = -0.10; jobLossProb = 0.08; }  // correction, 10%
        else if (marketType < 0.20) { priceChange = 0.15;  jobLossProb = 0.08; }  // boom, 5%
        else                        { priceChange = 0.04;  jobLossProb = 0.04; }  // normal, 80%

        const jobLoss = Math.random() < jobLossProb;
        const incomeShock = jobLoss ? 0.5 : 1.0;
        const emergencyRepair = Math.random() < 0.15 ? 8000 + Math.random() * 12000 : 0;  // 15% × $8K–20K

        const finalIncome = income * incomeShock;
        const finalCash = emergencyFund - emergencyRepair;
        const survived = finalCash >= 0 && finalIncome >= income * 0.5;
        scenarios.push({ priceChange, survived, finalCash, jobLoss, emergencyRepair });
    }
    const successRate = (scenarios.filter(s => s.survived).length / NUM_SCENARIOS) * 100;
    const crashSurvival = scenarios.filter(s => s.priceChange === -0.33 && s.survived).length /
                          scenarios.filter(s => s.priceChange === -0.33).length * 100;
    const jobLossSurvival = scenarios.filter(s => s.jobLoss && s.survived).length /
                            scenarios.filter(s => s.jobLoss).length * 100;
    return { successRate: successRate.toFixed(1), crashSurvival: crashSurvival.toFixed(1),
             jobLossSurvival: jobLossSurvival.toFixed(1), scenarios: scenarios.slice(0, 100) };
}
```

### 1.8 Monte Carlo — expert (L1513–1595): historical crash table + income-type + job-loss months

```js
function runEnhancedMonteCarloSimulation(params) {
    const scenarios = 10000;
    const results = { affordability: [], cashFlow: [], equityBuildup: [], jobLossRecovery: [], marketCrashSurvival: [] };

    // Historical crash scenarios
    const crashScenarios = [
        { name: '2008 Crisis', priceChange: -0.33, duration: 60, prob: 0.05 },
        { name: '2020 COVID', priceChange: 0.15, duration: 12, prob: 0.05 },
        { name: '2000 Dotcom', priceChange: -0.10, duration: 36, prob: 0.05 },
        { name: 'Normal Growth', priceChange: 0.04, duration: 12, prob: 0.85 }
    ];

    for (let i = 0; i < scenarios; i++) {
        // Select market scenario (cumulative probability walk)
        const rand = Math.random();
        let cumProb = 0;
        let scenario = crashScenarios[crashScenarios.length - 1];
        for (const s of crashScenarios) { cumProb += s.prob; if (rand <= cumProb) { scenario = s; break; } }

        // Job loss simulation
        const jobLossProb = 0.15; // 15% chance over 5 years
        const hasJobLoss = Math.random() < jobLossProb;
        const monthsJobless = hasJobLoss ? Math.floor(Math.random() * 6) + 1 : 0;   // 1–6 months (unused downstream)

        // Income variation
        const incomeVariation = 1 + (boxMuller() * 0.1);
        const adjustedIncome = params.income * incomeVariation * params.incomeTypeMultiplier;

        // Affordability in this scenario — 28% rule through iterative solver
        const monthlyIncome = adjustedIncome / 12;
        const maxPayment = monthlyIncome * 0.28;
        const rate = params.rate;
        const loanAmount = calculateMaxLoanAmount(maxPayment, rate, params.propertyTaxRate, params.insuranceAnnual);
        const price = loanAmount + params.downPayment;
        const finalPrice = price * (1 + scenario.priceChange);

        // Cash flow after purchase
        const piti = calculatePITI(loanAmount, rate, price, params.propertyTaxRate, params.insuranceAnnual);
        const pmi = calculatePMI(loanAmount, (params.downPayment / price) * 100);
        const totalHousing = piti.total + pmi + 200; // +$200 maintenance buffer
        const monthlySurplus = params.takeHome - totalHousing - params.debt;

        // Job loss recovery (months of housing the emergency fund covers)
        const emergencyMonths = hasJobLoss ? Math.floor(params.emergencyFund / totalHousing) : 12;

        // Market crash survival (can they hold on?)
        const crashSurvival = scenario.name === '2008 Crisis' && monthlySurplus > 500;

        results.affordability.push(finalPrice);
        results.cashFlow.push(monthlySurplus);
        results.equityBuildup.push(finalPrice * 0.04 * 5); // 5-year appreciation @4%/yr (unused in UI)
        results.jobLossRecovery.push(emergencyMonths);
        results.marketCrashSurvival.push(crashSurvival ? 1 : 0);
    }
    results.affordability.sort((a, b) => a - b);
    results.cashFlow.sort((a, b) => a - b);
    return {
        p10: results.affordability[Math.floor(scenarios * 0.1)],
        p50: results.affordability[Math.floor(scenarios * 0.5)],
        p90: results.affordability[Math.floor(scenarios * 0.9)],
        successRate: (results.affordability.filter(a => a > 0).length / scenarios) * 100,
        avgCashFlow: results.cashFlow.reduce((a,b) => a+b, 0) / scenarios,
        jobLossSurvival: results.jobLossRecovery.reduce((a,b) => a+b, 0) / scenarios,
        crashSurvivalRate: (results.marketCrashSurvival.reduce((a,b) => a+b, 0) / scenarios) * 100
    };
}
```

### 1.9 Loan product comparison — phase2 (L1072–1145)

Four products, all priced off `estimatedPrice = 350000`; taxes/insurance/HOA from state select:

```js
// 30-yr conventional 20% down (only if downPayment >= price*0.20): rate = baseRate, pmi = 0, recommended: true
// 30-yr conventional 10% down: loan10 = price*0.90; rate = baseRate + 0.25; pmi10 = (loan10 * 0.0075)/12
// FHA 3.5% down: loanFHA = price*0.965; rate = baseRate + 0.5; pmiFHA = (loanFHA * 0.0085)/12; risky: true
// 15-yr fixed (only if downPayment >= 20%): rate = baseRate - 0.5; months = 180; pmi = 0
// Each: monthlyPayment = pi + taxes + ins + pmi + hoa
//       totalInterest = (pi * months) - loanAmount
//       totalCost = monthlyPayment * months
```

### 1.10 Loan options — expert (L1816–1881) — adds closing costs & cash-to-close

```js
function calculateLoanOptions(income, debt, downPayment, baseRate, propertyTaxRate, insuranceAnnual, takeHome) {
    const options = [];
    const estimatedPrice = 350000;

    // FHA 3.5% down — shown only if downPayment >= 3.5% of price
    //   rate = baseRate + 0.25 ("FHA typically higher"); MIP = (loan*0.0085)/12
    //   cashNeeded = fhaDP + (estimatedPrice * 0.03)        // 3% closing costs
    // Conventional 10% down — if downPayment >= 10%
    //   rate = baseRate; PMI via calculatePMI(loan,10)      // 0.75%/yr
    //   cashNeeded = conv10DP + (estimatedPrice * 0.04)     // 4% closing costs
    // Conventional 20% down — if downPayment >= 20%  → best: true
    //   rate = baseRate - 0.125; pmi = 0
    //   cashNeeded = conv20DP + (estimatedPrice * 0.04)
    ...
}
```

**Closing-cost assumptions: 3% of price (FHA), 4% (conventional). 20%-down gets a 0.125% rate discount.**

### 1.11 Total Cost of Ownership — phase2 (L1154–1205) — rent-vs-buy engine

```js
function calculateTotalCostOfOwnership(price, downPayment, rate, taxRate, insurance, hoa, currentRent) {
    const loanAmount = price - downPayment;
    const monthlyPI = calculateMonthlyPayment(loanAmount, rate, 360);
    const monthlyTax = (price * taxRate / 100) / 12;
    const monthlyIns = insurance / 12;

    let totalCost = downPayment;
    let totalInterest = 0, totalTaxes = 0, totalInsurance = 0, totalMaintenance = 0, totalHOA = 0;
    let currentValue = price;
    let currentTax = monthlyTax, currentIns = monthlyIns;
    let currentMaint = price * 0.025 / 12;              // maintenance: 2.5% of price/yr

    for (let year = 1; year <= 30; year++) {
        totalInterest += (monthlyPI * 12) - (loanAmount / 30);   // straight-line principal approx
        totalTaxes += currentTax * 12;
        totalInsurance += currentIns * 12;
        totalMaintenance += currentMaint * 12;
        totalHOA += hoa * 12;

        currentValue *= 1.03;    // 3%/yr appreciation
        currentTax *= 1.03;      // 3%/yr tax escalation
        currentIns *= 1.05;      // 5%/yr insurance escalation
        currentMaint *= 1.03;    // 3%/yr maintenance escalation
    }

    const totalPaid = downPayment + (loanAmount) + totalInterest + totalTaxes + totalInsurance + totalMaintenance + totalHOA;
    const finalValue = currentValue;
    const sellingCosts = finalValue * 0.09;             // 9% selling costs
    const netProceeds = finalValue - sellingCosts;
    const totalRent = currentRent * 12 * 30 * Math.pow(1.03, 15);   // 30y rent w/ 3% growth (midpoint compounding approx)

    return { totalPaid, totalInterest, totalTaxes, totalInsurance, totalMaintenance, totalHOA,
             finalValue, netProceeds,
             netPosition: netProceeds - totalPaid,
             totalRent,
             vsRenting: (netProceeds - totalPaid) - (-totalRent) };
}
```

UI copy adds: **"Breakeven: Typically occurs around year 8-9"** vs renting.

### 1.12 Cash-flow impact — phase2 (L1207–1221)

```js
function calculateCashFlow(takeHome, debt, newHousing, oldHousing, savings) {
    const before = { housing: oldHousing, debt: debt, remaining: takeHome - oldHousing - debt };
    const after  = { housing: newHousing, debt: debt, remaining: takeHome - newHousing - debt };
    return { before, after, impact: after.remaining - before.remaining };
}
// Display thresholds: impact >= 0 → "Positive Cash Flow" (info-box);
//   >= -800 → "Moderate Impact" (warning-box); else "Significant Lifestyle Reduction" (danger-box)
```

Expert lifestyle variant (L2260–2281): `% change = (future - current)/current * 100`; thresholds: `< -30%` significant (red), `< -10%` moderate (yellow), else manageable (emerald). Current rent hardcoded at **$1,800** in expert charts (`data: [1800, housingCost]`, `takeHome - 1800 - debt`).

### 1.13 Readiness scoring engines (3 variants)

**v1 basic (L871–914):**
```js
// Financial (35): DTI 14/10/6/2 at ≤28/≤36/≤43/>43 (dti = monthlyDebt/takeHome, NOT incl. housing)
//   dpPercent = downPayment/350000*100 → 10.5/7/4/1 at ≥20/≥10/≥5/<5
//   monthsReserve = emergencyFund/takeHome → 7/5/2/0 at ≥6/≥3/≥1/<1
//   credit (as rate) ≤4 → 3.5; ≤5 → 2.5; else 1
// Emotional (35): jobStability/10*13 + lifeStability/10*13 + maintenanceComfort/10*9
// Timing (30): timeHorizon*15 + savings(≥20%→10, ≥15%→7, ≥10%→5, else 2) + (downPayment/350000)*5
const totalScore = Math.round(financialScore + emotionalScore + timingScore);
```

**v3 complete / v4 phase2 (identical, phase2 L951–971):**
```js
const dti = (debt / takeHome) * 100;
let dtiScore = dti <= 28 ? 14 : dti <= 36 ? 10 : dti <= 43 ? 6 : 2;
const dpPercent = (downPayment / estimatedPrice) * 100;                    // estimatedPrice = 350000
let dpScore = dpPercent >= 20 ? 10.5 : dpPercent >= 15 ? 8.0 : dpPercent >= 10 ? 5.5 : dpPercent >= 5 ? 3.0 : 1.0;
const monthsReserve = emergencyFund / takeHome;
let reservesScore = monthsReserve >= 6 ? 7.0 : monthsReserve >= 3 ? 5.0 : monthsReserve >= 1 ? 2.5 : 0.5;
let creditScore = rate <= 6.0 ? 3.5 : rate <= 6.5 ? 3.0 : rate <= 7.0 ? 2.5 : 1.5;
const financialScore = dtiScore + dpScore + reservesScore + creditScore;   // max 35
const emotionalScore = jobStability * 1.3 + lifeStability * 1.3 + maintenanceComfort * 0.9;  // max 35
const savingsRate = (savings / takeHome) * 100;
let savingsScore = savingsRate >= 20 ? 10 : savingsRate >= 15 ? 7.5 : savingsRate >= 10 ? 5.0 : savingsRate >= 5 ? 2.5 : 0.5;
const dpProgress = dpPercent >= 20 ? 5 : dpPercent >= 15 ? 4 : dpPercent >= 10 ? 3 : 1.5;
const timingScore = timeHorizon * 15 + savingsScore + dpProgress;          // max 30
const totalScore = Math.round(financialScore + emotionalScore + timingScore);
```

**v5 expert (L1647–1750)** — same buckets as v1 (DTI 14/10/6/2; DP 10.5/7/4/1; reserves 7/5/2/0; credit ≤6→3.5, ≤7→2.5, else 1) **plus two multipliers**:
```js
emotionalScore = (jobStability/10*13 + lifeStability/10*13 + maintenanceComfort/10*9) * relationshipMultiplier;
timingScore = timeHorizon * 15 + savingsPoints(20/15/10% → 10/7/5/2) + (downPayment/estimatedPrice)*5;
// marketCondition is captured into timingDetails text but NOT multiplied into the score (collected, unused numerically)
// incomeTypeMultiplier is NOT used in scoring — only inside Monte Carlo income variation
```

**Verdict thresholds (all versions): ≥80 READY · 60–79 ALMOST THERE · <60 NOT YET.**

### 1.14 Live metrics (all post-v1) — traffic-light rules

```js
// DTI: dti = (debt/takeHome)*100 → safe ≤28, warning ≤36, danger >36
// Down payment: dpPercent = downPayment/350000*100 → safe ≥20, warning ≥10, danger <10
//   PMI preview (part1/phase2): pmiCost = dpPercent >= 20 ? 0 :
//       Math.round((350000 * (100-dpPercent)/100 * (dpPercent < 10 ? 0.01 : 0.0075)) / 12)
//   Expert preview: ≥10% → 350000*0.8*0.0075/12 ≈ $175/mo; <10% → 350000*0.9*0.01/12 ≈ $263/mo
// Reserves: monthsReserve = emergencyFund/takeHome → safe ≥6, warning ≥3, danger <3
```

### 1.15 Path-to-Readiness milestone planner (expert only, L2096–2166)

```js
const targetScore = 80;
const financialGap = Math.max(0, 30 - financialScore); // Target 30/35
const emotionalGap = Math.max(0, 28 - emotionalScore); // Target 28/35
const timingGap = Math.max(0, 22 - timingScore);       // Target 22/30
// Milestone 1: monthsToEmergency = ceil((takeHome*6 - emergencyFund) / savings)
// Milestone 2 (if debt/takeHome > 0.28): debtToEliminate = (debt - takeHome*0.28)*6;
//              debtMonths = ceil(debtToEliminate / (savings*0.5))   // 50% of savings → debt
// Milestone 3: dpNeeded = 350000*0.2 - downPayment;
//              dpMonths = ceil((dpNeeded - savingsAccumulated) / savings)
// Final: "🎯 READY — Target score: 80+"
```

Phase2's simpler variant: `monthsToReady = Math.ceil((80 - totalScore) / 2)` for ALMOST (range +6mo); `/1.5` for NOT YET (range +12mo).

---

## 2. Constants & Defaults (exact values)

### 2.1 Global constants

```js
// part1 L1188–1190
const MONTHS_PER_YEAR = 12;
const MONTHS_30_YEAR = 360;
const MONTHS_15_YEAR = 180;
// All versions: estimatedPrice / reference home price = 350000 ($350K) for DP% scoring
// Scoring weights: Financial Reality 35 pts, Emotional Truth 35 pts, Perfect Timing 30 pts
// Verdict thresholds: READY ≥ 80, ALMOST THERE ≥ 60, NOT YET < 60
// Monte Carlo runs: 10,000 scenarios (every version)
```

### 2.2 Credit score → interest rate maps (per version)

| Tier | v1 basic | part1 (8 tiers) | phase2 (7 tiers) | complete (4 tiers) | expert (6 tiers) |
|---|---|---|---|---|---|
| 800+ Exceptional | — | 5.625 | 5.625 | 5.625 | — |
| 780+ / 780–799 | 3.5 (780+) | 5.75 | 5.75 | — | 5.75 (780+) |
| 740–779 Very Good | 4.0 ★ | 6.00 ★ | 6.00 ★ | 6.00 ★ | 6.00 ★ |
| 700–739 Good | 4.5 | 6.375 | 6.375 | 6.50 | 6.50 |
| 660–699 Fair | 5.5 | 7.00 | 7.00 | (620–699: 7.50) | 7.00 |
| 620–659 Poor | 7.0 | 7.75 | 7.75 | — | 7.75 |
| 580–619 Very Poor | 9.0 | 8.50 | 8.50 (<620) | — | 8.50 |
| <580 Bad | — | 9.50 | — | — | — |

★ = default selected. **Note v1's rates (3.5–9.0) are stale/placeholder; later versions converge on ~5.625–9.50 (a ~2023–24 rate environment).** Tooltip heuristic: "Every 20 points = ~0.25% rate difference = $50/month on $300K loan."

### 2.3 State data (property tax %, insurance, HOA)

**part1** — 3-tuple `value="tax,insK,hoa"` (insurance encoded in $K: ×$1000):
| State | Tax % | Insurance $/yr | Avg HOA $/mo |
|---|---|---|---|
| California | 0.76 | 2,800 (0.8K in value → ×1000 = 800? — see note) | 200 |
| Texas | 1.80 | 4,200 | 150 |
| Florida ★ | 0.98 | 8,800 | 300 |
| New Jersey | 2.49 | 3,500 | 250 |
| Colorado | 0.55 | 2,500 | 200 |
| Arizona | 0.90 | 2,800 | 100 |
| National Avg | 1.10 | 3,500 | 150 |

Note: part1's option values are `"0.76,0.8,200"`, `"1.80,1.2,150"`, `"0.98,2.5,300"` etc. — the middle number does NOT match the label ($2,800 label vs 0.8 value; $8,800 label vs 2.5). **phase2 fixed this** to `tax,insK(×1000),hoa` with matching values: CA `"0.76,2.8,200"`, TX `"1.80,4.2,150"`, FL `"0.98,8.8,300"` ★, NJ `"2.49,3.5,250"`, CO `"0.55,2.5,200"`, NAT `"1.10,3.5,150"`. In phase2 JS: `insuranceAnnual = parseFloat(stateData[1]) * 1000`.

**expert** — 2-tuple `value="tax,insuranceMultiplier"`; `insuranceAnnual = 3500 * insuranceMultiplier`:
| State | Tax % | Multiplier | → Insurance $/yr |
|---|---|---|---|
| California | 0.76 | 0.8 | 2,800 |
| Texas | 1.80 | 1.2 | 4,200 |
| Florida ★ | 0.98 | 2.5 | 8,750 (label says 8,800) |
| New Jersey | 2.49 | 1.0 | 3,500 |
| Colorado | 0.55 | 0.7 | 2,450 (label says 2,500) |
| Average US | 1.10 | 1.0 | 3,500 |

**v1 basic** — tax only: CA 0.76, TX 1.00, FL 1.20 ★, NJ 2.49, CO 0.85, US 1.10 (note TX/FL/CO differ from later canon: 1.80/0.98/0.55).

### 2.4 PMI / MIP rates

- Conventional PMI: **0.75%/yr** of loan (10–<20% down), **1.0%/yr** (<10% down), **0** at ≥20% — identical across part1/phase2/expert.
- FHA MIP: **0.85%/yr** (phase2 & expert).
- Expert live-metric shorthands: PMI ≈ $175/mo at 10–19% down, ≈ $263/mo at <10% (on $350K).

### 2.5 Loan-product rate adjustments

| Adjustment | Value | Source |
|---|---|---|
| 10%-down conventional rate penalty | +0.25% | phase2 |
| FHA rate penalty | +0.5% (phase2), +0.25% (expert) | both |
| 15-yr fixed rate discount | −0.5% | phase2 |
| 20%-down rate discount | −0.125% | expert |
| Closing costs (cash-to-close) | 3% of price (FHA), 4% (conventional) | expert |

### 2.6 Scoring multipliers (select-option values)

**Income type** (part1 5 tiers / expert 4 tiers) — used in expert Monte Carlo income scaling only:
- W-2 salaried 1.0 ★ · Self-employed/1099 0.85 · Commission/bonus-heavy 0.90 · Dual income W-2 0.95 · Single + rental income 0.80 (part1 only; "rental = 75% credit")

**Relationship status:**
- part1 (6 tiers): Single 1.0 ★ · Married/partnered >2y 1.1 · Engaged/<2y 0.9 · Recently separated/divorced 0.7 · Single parent 0.95 · Married dual-income no kids 1.05
- expert (4 tiers): Single 1.0 ★ · Married/partnered 1.1 · Recently separated 0.7 · Engaged 0.8

**Future changes (part1 only):** none 1.0 ★ · job change same field 0.9 · career transition/school 0.8 · first child 0.85 · additional children 0.75 · elder care 0.8 · multiple changes 0.7

**Time horizon** (score multiplier ×15):
- v1/complete: 1–2y 0.5 · 3–4y 0.7 · 5–7y 1.0 ★ · 8–10y 1.2 · 10+y 1.3
- expert: 1–2y 0.3 · 3–4y 0.6 · 5–7y 1.0 ★ · 8–10y 1.2 · 10+y 1.3
- part1/phase2 (6–7 tiers): 1–2y 0.2 · 3–4y 0.5 · 5–7y 1.0 ★ · 8–10y 1.2 · 10–15y 1.3 · 15+y/forever 1.4 · (part1 adds "uncertain relocation" 0.7)

**Market condition** (price multiplier; captured but only used in detail text in expert):
- part1 (7 tiers): extreme seller 1.25 · hot seller 1.15 · slight seller 1.05 · balanced 1.0 ★ · slight buyer 0.95 · strong buyer 0.90 · distressed 0.85
- expert (5 tiers): extreme 1.2 · hot 1.1 · balanced 1.0 ★ · buyer 0.95 · distressed 0.90

**Interest-rate trend (part1 only):** drop 1%+ 1.1 · drop 0.5% 1.05 · flat 1.0 ★ · rise 0.5% 0.95 · rise 1%+ 0.9

### 2.7 TCO / long-horizon assumptions (phase2)

- Home appreciation **3%/yr**; property-tax escalation **3%/yr**; insurance escalation **5%/yr**; maintenance escalation **3%/yr**.
- Maintenance budget: **2.5% of home value/yr** (Atlas copy also cites "2.5% annual maintenance").
- Selling costs: **9% of final value**.
- Rent comparison: `totalRent = currentRent * 12 * 30 * 1.03^15` (30 yrs, ~3%/yr growth via midpoint factor).
- Rent-vs-buy breakeven copy: **"around year 8–9"**; time-horizon tooltips: under 5 yrs → renting wins; 5–7 yrs → breakeven; 10+ → strong.
- Expert Monte Carlo: maintenance buffer **+$200/mo**; crash-survival threshold = monthly surplus > **$500**; job-loss probability **15% over 5 yrs** (1–6 months jobless); equity proxy = price × 4%/yr × 5 yrs.
- Phase2 Monte Carlo: emergency repair **15% probability, $8,000–$20,000**; job loss halves income (0.5 shock).

### 2.8 Default input values (consistent across ALL versions)

```
annualIncome = 85000 · monthlyTakeHome = 5200 · monthlyDebt = 650
downPayment = 50000 · emergencyFund = 15000 · monthlySavings = 800
currentRent = 1800 (where present) · sliders: jobStability 7, lifeStability 8, maintenanceComfort 6
state default = Florida · creditScore default = 740–779 (~6.00%)
```

### 2.9 Miscellaneous embedded heuristics (UI copy worth reusing)

- Comparison-table monthly-payment shorthand (expert): `price*0.8*0.06/12 + price*0.01/12 + price*0.008/12` ≈ 6% rate P&I on 80% LTV + 1% tax + 0.8% insurance.
- Comparison scenarios: Conservative = p50×0.85 (28% DTI, SAFE), Moderate = p50 (31% DTI, TIGHT), Aggressive = p90 (36% DTI, RISKY), "What You Qualify For" = p90×1.15 (DANGER ZONE). HōMI Safe Zone = p50×0.85 → p50×1.05.
- "Ranges prevent psychological stretching/anchoring. Lenders will approve you for your maximum. We show you your comfortable range."
- Rate-shopping copy: "0.25% difference = $(p50×0.8×0.0025/12)/month savings."
- Post-purchase budget copy: "$10–15K for post-purchase costs (furniture, repairs, emergencies)"; hire-out maintenance "adds $300–500/month".
- Pre-close discipline: "No new debt, no job changes, no large purchases."
- MC interpretation bands (phase2): success ≥85 strong / ≥70 moderate / <70 "high vulnerability… 3+ out of 10 scenarios financial distress".
- Lifestyle-impact band (phase2 cash flow): impact ≥0 positive; ≥−$800 moderate; <−$800 "Significant Lifestyle Reduction".

---

## 3. Expert Version Extras (expert vs. basic/others)

1. **Iterative max-loan solver** (`calculateMaxLoanAmount`, 10 iterations) — only version that properly handles circular price↔tax dependency; basic used crude `(maxMonthlyPayment*1000)/(rate*0.8)`.
2. **Historical crash scenario table** in Monte Carlo (2008 −33%/60mo, 2020 +15%/12mo, dotcom −10%/36mo, normal +4%/85%) plus job-loss recovery months & crash-survival rate metrics.
3. **Income-type multiplier** plumbed into Monte Carlo income (0.80–1.0).
4. **Relationship multiplier** applied to emotional score (0.7–1.1).
5. **Loan options with cash-to-close** (FHA/conv10/conv20, closing costs 3%/4%, 20%-down rate discount −0.125%, `best` flag → "RECOMMENDED" badge).
6. **Scenario comparison table** in THE SIGNAL card: HōMI Safe Zone / Conservative 28% / Moderate 31% / Aggressive 36% / "What You Qualify For" = p90×1.15 with status pills (COMFORTABLE/SAFE/TIGHT/RISKY/DANGER ZONE).
7. **Per-dimension score breakdowns** (`financialDetails`, `emotionalDetails`, `timingDetails` bullet lists under each dimension card).
8. **Path to Readiness** milestone timeline (emergency fund → DTI <28% → 20% down → 🎯 READY) shown only on NOT YET, with month estimates from savings rate.
9. **"Moat message"** panel shown only on NOT YET verdict ("Why HōMI can tell you NOT YET when others can't" — 73% stat, structural-honesty pitch).
10. **Post-Purchase Reality Check** with lifestyle % change thresholds (−30%/−10%) and stacked cash-flow chart vs hardcoded $1,800 rent.
11. **Chart.js histogram** of affordability distribution (20 bins, uniform-random simulation between p10–p90 — visualization only, not real MC output) + stacked-bar cash-flow chart; `charts = {}` registry with destroy-before-recreate.
12. **Sticky controls bar**: Save Analysis (localStorage `homiAnalysis`), Export PDF (`window.print()` stub), Start Over (confirm + reload).
13. **Longer fake-loading**: 2.5s `setTimeout` (v1: 2s, phase2: 4.5s with 10-step progress theater).

---

## 4. Data Model & State

### 4.1 Input shape (DOM ids, all versions unless noted)

```js
{
  annualIncome:      number ($/yr),      // min 0 step 1000
  monthlyTakeHome:   number ($/mo),      // step 100
  monthlyDebt:       number ($/mo),      // step 50; excludes utilities/subscriptions
  downPayment:       number ($),         // step 5000; liquid only, excl. emergency fund & retirement
  emergencyFund:     number ($),         // step 1000
  creditScore:       select → annual interest rate % (proxy for credit tier)
  state:             select → "taxPct,insK,hoa" (part1/phase2) | "taxPct,insMult" (expert) | "taxPct" (v1)
  incomeType:        select → multiplier 0.80–1.0          // part1, expert
  jobStability:      range 1–10 (7)
  lifeStability:     range 1–10 (8)
  maintenanceComfort:range 1–10 (6)
  relationshipStatus:select → multiplier 0.7–1.1           // part1, expert
  futureChanges:     select → multiplier 0.7–1.0           // part1 only
  timeHorizon:       select → multiplier 0.2–1.4
  monthlySavings:    number ($/mo), step 50
  currentRent:       number ($/mo), step 100               // part1, phase2
  marketCondition:   select → multiplier 0.85–1.25         // part1, expert
  interestRateTrend: select → multiplier 0.9–1.1           // part1 only
  debtDetails:       textarea (free text, advisory only)   // part1 only
}
```

### 4.2 Analysis result objects

```js
// phase2 calculateCompleteAnalysis() returns:
{ totalScore, verdict, verdictClass, financialScore, emotionalScore, timingScore,
  dti, dpPercent, monthsReserve, monteCarlo: {successRate, crashSurvival, jobLossSurvival, scenarios[100]},
  loanProducts: [{name, rate, loanAmount, monthlyPayment, pi, taxes, ins, pmi, hoa, totalInterest, totalCost, recommended, risky}],
  tco: {totalPaid, totalInterest, totalTaxes, totalInsurance, totalMaintenance, totalHOA,
        finalValue, netProceeds, netPosition, totalRent, vsRenting},
  cashFlow: {before:{housing,debt,remaining}, after:{...}, impact},
  inputs: {income, takeHome, debt, downPayment, emergencyFund, rate, jobStability, lifeStability,
           maintenanceComfort, timeHorizon, savings, currentRent, estimatedPrice} }

// expert analysisData (what gets saved):
{ totalScore, financialScore, emotionalScore, timingScore,
  mcResults: {p10, p50, p90, successRate, avgCashFlow, jobLossSurvival, crashSurvivalRate},
  loanOptions: [{name, downPayment, downPaymentPercent, loanAmount, rate, monthlyPayment, pmi, cashNeeded, best}],
  inputs: {income, takeHome, debt, downPayment, emergencyFund} }
```

### 4.3 localStorage keys

- **`homiAnalyses`** — part1 only: `let previousAnalyses = JSON.parse(localStorage.getItem('homiAnalyses') || '[]')` (array of past analyses; powers the declared-but-unimplemented `compareProgress()`).
- **`homiAnalysis`** — expert: `localStorage.setItem('homiAnalysis', JSON.stringify({ timestamp: new Date().toISOString(), data: analysisData }))`.
- v1/complete/phase2: **no persistence**.

### 4.4 Validation

- Weak throughout: HTML `min="0"`, `step`, and `required` (part1 only) attributes; JS uses `parseFloat(...) || 0` in live metrics but **bare `parseFloat` in analysis paths** (NaN risk). No explicit range checks, no error messages. `resetCalculator()` = confirm + `location.reload()`. Expert `exportPDF()` = alert + `window.print()`.

---

## 5. UI Patterns

### 5.1 Color tokens (all versions)

```css
:root {
    --cyan: #22d3ee;      /* primary / financial dimension */
    --emerald: #34d399;   /* success / emotional dimension */
    --yellow: #facc15;    /* caution / timing dimension */
    --navy: #0a1628;      /* page bg (gradient to #0f172a) */
    --slate: #1e293b;     /* card bg */
    --light: #e2e8f0;     /* text */
    --red: #ef4444;       /* danger (part1/phase2/complete/expert) */
    --orange: #fb923c;    /* part1/complete only */
}
/* muted text: #94a3b8; dimmer: #64748b / #475569 */
/* status classes: .safe → emerald bg-alpha, .caution → yellow, .danger → red */
```

Font: Inter 400/600/700/800/900 via Google Fonts. Layout: `.container` max-width 1400px (1200px in v1), `.grid-2` (minmax 250–280px), `.grid-3` (minmax 180–220px), mobile breakpoint 768px, print stylesheet in part1.

### 5.2 Signature components

- **Compass loader/logo**: 3 nested rings (outer cyan 20s, middle emerald 15s reverse, inner yellow 10s rotation) + center "◉".
- **Sliders**: `<input type="range">` 1–10 with gradient track (cyan→emerald), yellow 24px circular thumb, paired `.slider-value` display "N / 10" updated on `input` event; sliders also trigger `updateLiveMetrics()`.
- **Tooltips**: `?` circle with `data-tip` attribute, CSS-only `:hover::after` popup (250–280px, navy bg, cyan border). Rich financial-literacy copy (see tooltips quoted in sections above).
- **Live metrics**: three border-left cards (DTI, Down Payment %, Reserves) with `.live-metric` / `.warning` / `.danger` state classes, 2.5rem values, status line with ✓/⚠.
- **Verdict display**:
  - v1/expert: SVG score circle r=90, `stroke-dasharray="565"` (2πr), animated `stroke-dashoffset = 565 − score/100×565` over 2s; gradient stroke cyan→emerald→yellow; `.verdict.ready/.almost/.not-yet`.
  - complete/phase2: `.verdict-box` with 3px border (emerald/yellow/red by class), 3rem title + 5rem score.
- **THE SIGNAL**: price-range card (2.5rem cyan), copy "Your safe zone (not your maximum)".
- **Trinity Debate**: three border-left cards — ⚡ Spark/Advocate-Optimist, 🦉/📘 Sage/Skeptic, ⚖️ Atlas/Arbiter (color assignment varies: v1/expert spark=emerald, sage=yellow, atlas=cyan; phase2 spark=yellow, sage=cyan, atlas=emerald).
- **Temporal Twin**: gradient card, italic "Message from Your Future Self (5 Years Out)".
- **Loading theater**: spinner + "Running 10,000 Monte Carlo scenarios…"; phase2 adds 10 rotating step labels + progress bar over 4.5s (`setInterval` 400ms), e.g. "Testing 2008 crash scenarios…", "Simulating job loss events…".
- **Charts (Chart.js 4.4.0 UMD via jsdelivr)**:
  - phase2: stacked bar `cashFlowChart` (Housing cyan / Debt red / Discretionary emerald, Current vs After), doughnut `monteCarloChart` (success emerald vs stress red, sample of 100 scenarios).
  - expert: stacked bar cash-flow (Debt yellow instead of red), 20-bin histogram `monteCarloChart` (cyan bars, 45° labels).
  - All charts: `maintainAspectRatio: false`, container height 300–350px, light tick colors `#e2e8f0`/`#94a3b8`, grid `rgba(255,255,255,0.1)`, destroy-before-recreate guard.
- **Loan cards**: `.loan-product`/`.loan-option` with badges `best`=emerald "Recommended/RECOMMENDED", `caution`=yellow, `avoid`=red "High Cost"; metric grid (payment, rate, loan amount; expert adds PMI + cash needed).
- **Boxes**: `.info-box` (cyan), `.warning-box` (yellow), `.danger-box` (red, phase2+), `.disclaimer` (red, part1), `.moat-message` + `.milestone` rows (expert), `.action-item` (emerald border-left).
- **Sticky controls** (part1 hidden until results, expert always-rendered but `display:none` until results): Save 💾 / Export PDF 📄 / Compare Progress 📊 (part1 only) / Start Over 🔄.
- **Disclaimers**: part1 has full legal block (Not a Lender, Not Financial Advice, Estimates, No Guarantee, Fair Housing, RESPA, Data Privacy, State Variations, Monte Carlo disclaimer, © 2024 HōMI Technology LLC); expert has 3-line footer disclaimer; v1/complete/phase2 minimal/none.

---

## 6. Version Evolution (part1 → phase2 → complete → expert, with v1 basic as origin)

| Capability | v1 basic (39KB) | part1 (52KB) | complete (35KB) | phase2 (81KB) | expert (98KB) |
|---|---|---|---|---|---|
| Live metrics | ✗ | ✓ + PMI estimate | ✓ (simple) | ✓ + PMI estimate | ✓ (fixed $175/$263 PMI) |
| State data | tax only (stale values) | tax,ins,HOA (mismatched ins values) | ✗ none | tax,insK×1000,HOA (fixed) | tax,insuranceMultiplier (base $3,500) |
| Credit→rate tiers | 6 (3.5–9.0, stale) | 8 (5.625–9.50) | 4 (5.625–7.50) | 7 (5.625–8.50) | 6 (5.75–8.50) |
| Extra inputs | — | incomeType, relationship, futureChanges, market, rateTrend, debtDetails, rent | — | rent | incomeType, relationship, market |
| P&I amortization fn | ✗ (heuristic loan est.) | ✓ `calculateMonthlyPayment` | ✓ + inverse `calculateAffordablePrice` | ✓ | ✓ + iterative `calculateMaxLoanAmount` |
| PITI / PMI fns | ✗ | ✓ full (PITI+PMI+HOA) | tax/ins hardcoded (FL) | per-product inline | ✓ PITI + separate PMI |
| Monte Carlo | affordability distribution (boxMuller, unused debt var) | (truncated) | ✗ (faked — loading text only, no MC code!) | survival sim (crash/job-loss/repair, 10K, survival rates) | historical-scenario sim (crash table, job-loss months, p10/50/90) |
| Loan products | ✗ | ✗ (CSS only) | ✗ | 4 products w/ rate adj & PMI | 3 options w/ closing costs & cash-to-close |
| TCO / rent-vs-buy | ✗ | ✗ | ✗ | ✓ 30-yr TCO + vsRenting | ✗ (lifestyle % change instead) |
| Cash-flow analysis | ✗ | ✗ | ✗ | ✓ fn + stacked chart | ✓ lifestyle impact + chart |
| Scoring engine | v1 rubric | (truncated) | refined rubric (finer DP/savings tiers) | = complete | v1 rubric + relationship multiplier |
| Score circle SVG | ✓ | ✗ | ✗ | ✗ | ✓ |
| Trinity / Temporal Twin | ✓ static messages | ✗ | ✗ | ✓ dynamic w/ MC stats & concern list | ✓ dynamic w/ PMI math + moat message |
| Charts | ✗ none | Chart.js loaded (charts={} declared) | Chart.js loaded, unused | 2 charts (bar, doughnut) | 2 charts (bar, histogram) |
| Persistence / export | ✗ | `homiAnalyses` read; save/export/compare declared, unimplemented | ✗ | ✗ | `homiAnalysis` save; print-PDF stub |
| Path to Readiness | action items only | ✗ | static per-verdict plans | dynamic month estimates | full milestone engine |
| Legal disclaimers | ✗ | full (RESPA, Fair Housing…) | ✗ | ✗ | short footer |

**Key takeaways on lineage:** `complete` is a stripped-down reboot of part1's input set with a refined scoring rubric that phase2 inherits verbatim. `expert` is a different branch off v1 basic (keeps SVG score circle, THE SIGNAL table, Trinity/Twin structure, v1 scoring buckets) extended with the best engineering (iterative solver, crash-table MC, loan options, milestones, persistence). part1 is a fragment — its JS ends mid-file with `// [CONTINUED IN NEXT MESSAGE DUE TO LENGTH LIMIT]`; its PITI/PMI/multiplier inputs and localStorage design are its reusable legacy. complete's "Monte Carlo" is pure marketing: no simulation code exists in that file. Known defects preserved above: part1's state insurance values don't match labels; basic's Monte Carlo computes `adjustedDebt` never used; expert's `marketCondition` multiplier never applied numerically; TCO interest uses straight-line principal approximation.
