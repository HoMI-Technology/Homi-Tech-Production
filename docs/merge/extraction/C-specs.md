# HōMI Technical Specifications — Structured Digest (C-specs)

**Sources (8 files, all read in full):**
1. `01_Financial_Modeling_Specification.md` (v2.0, Dec 2024) — PITI, PMI, TCO, loan products
2. `02_Monte_Carlo_Technical_Specification.md` (v2.0) — 10K-scenario stress testing engine
3. `03_Scoring_Algorithm_Validation.md` (v2.0) — Decision Readiness Score™ weights & validation
4. `HoMI_Expert_Calculator_Documentation.md` — V1→Expert transformation, live metrics, moat
5. `HoMI_Finance_Complete_Rebuild_Prompt.md` — full mobile app rebuild spec (brand, views, mini-calculators, state)
6. `HōMI_finance_research.md` — research foundation (500+ sources), ring scoring question banks
7. `00_Phase2_Implementation_Summary.md` — shipped Phase 2 feature list, Phase 3 roadmap
8. `HoMI_Finance_v2_User_Manual.docx` — Finance Intelligence Engine v2.0 (retirement OS) user manual

**Two product generations exist in these docs:**
- **Gen A (House Affordability Calculator, Dec 2024):** PITI + Monte Carlo + 35/35/30 scoring, verdicts READY 80+ / ALMOST THERE 60–79 / NOT YET <60.
- **Gen B (Finance Intelligence Engine v2.0, Nov 2025):** retirement-focused OS — Roth optimizer, Social Security, tax brackets, withdrawal sequencing; scoring weights changed to 40/30/30, verdicts READY 75+ / BUILD 55–74 / NOT YET <55.
- **Gen C (Mobile app rebuild prompt):** full consumer app with 22 mini-calculators, Behavioral Genome, Impulse Control, etc.

---

# PART 1 — FINANCIAL MODELING SPEC (exact math)

## 1.1 Principal & Interest (amortization)

```
M = P * [r(1+r)^n] / [(1+r)^n - 1]

M = monthly payment
P = principal (loan amount)
r = monthly interest rate = annual rate / 12 / 100
n = monthly payments (360 for 30-yr, 180 for 15-yr)
```

Validated test case: P=$280,000, 6.0%, 30yr → r=0.005, n=360 → **M = $1,678.68/mo** (verified vs. Bankrate, Zillow, Fannie Mae). Max deviation tolerance: **±$5/month**.

Edge cases: r=0 → `M = P / n`; rate >15% → flag "predatory lending territory"; term <5yr → recommend 15-yr minimum.

```javascript
function calculatePI(principal, annualRate, termMonths) {
    if (principal <= 0) throw new Error("Principal must be positive");
    if (annualRate < 0) throw new Error("Interest rate cannot be negative");
    if (termMonths <= 0) throw new Error("Term must be positive");
    if (annualRate === 0) return principal / termMonths;
    const monthlyRate = annualRate / 12 / 100;
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                    (Math.pow(1 + monthlyRate, termMonths) - 1);
    return Math.round(payment * 100) / 100;
}
```

## 1.2 Property Taxes

```
Monthly Tax = (Property Value * Annual Tax Rate / 100) / 12
```

Effective state tax rates (2024, on $350K home): HI 0.28% ($980/yr), AL 0.41% ($1,435), CO 0.55% ($1,925), CA 0.76% ($2,660), FL 0.98% ($3,430), TX 1.80% ($6,300), NJ 2.49% ($8,715).

Considerations: CA Prop 13 caps increases at 2%/yr; TX reassesses annually; homestead exemptions — TX up to $100K, FL up to $50K, GA $2K–$10K. FL example with $50K exemption: (300,000 × 0.0098)/12 = **$245/mo** vs $286/mo without (saves $492/yr). Model **3% annual tax growth** over 30 years (national avg 3–4%, hot markets 5–8%).

30-year projection: $350K home, 0.98%, 3% growth → Year 1 $3,430, Year 30 $8,320, **Total $171,847**.

## 1.3 Homeowners Insurance

Annual premiums by state (2024): OR $1,200; UT $1,400; CA $2,800 (earthquake); CO $2,500 (hail); TX $4,200 (hurricane coast); FL $8,800 (hurricane); LA $9,900.

Premium factors: dwelling coverage 80–100% of value; deductibles — $2,500 → −15%, $5,000 → −30%; credit — 700–779 +10%, 620–699 +25%, <620 +50%/decline; claims — 1 claim +15–20%, 2+ +40%/non-renewal.

FL hurricane breakdown: base $4,800 + hurricane deductible (2%) +$1,500 + sinkhole +$800 + flood +$700–2,000 = **$7,800–$9,100/yr ($650–758/mo)**.

Annual increase: national 4–6%; high-risk states 8–12%; **model at 5%**. 30-yr FL projection ($8,800 initial, 5%): Yr15 $18,299, Yr30 $38,059, **Total $586,304**.

## 1.4 PMI / FHA MIP

| Down | LTV | Annual PMI rate | Monthly on $280K |
|------|-----|-----------------|------------------|
| 20%+ | ≤80% | 0% | $0 |
| 15–19.99% | 80.01–85% | 0.40% | $93 |
| 10–14.99% | 85.01–90% | 0.75% | $175 |
| 5–9.99% | 90.01–95% | 1.00% | $233 |
| 3.5–4.99% | 95.01–96.5% | 1.15% | $268 |

PMI removal (conventional): auto-terminates at 78% LTV (original value); borrower-requested at 80%; midpoint termination at 15 yrs on 30-yr loan.
FHA MIP: upfront 1.75% (financeable) + annual 0.85% for >95% LTV, **never removes without refinance**. $280K loan = $4,900 upfront + $198/mo.

FHA vs conventional comparison ($350K home): conventional 20% down PMI $0; conventional 10% down PMI $197/mo, removes ~yr 11, total $26,004; FHA 3.5% down upfront MIP $5,911 + $239/mo forever = **$91,951 total; $65,947 more than conventional**.

```javascript
function calculatePMI(loanAmount, propertyValue, loanType = 'conventional') {
    const ltv = (loanAmount / propertyValue) * 100;
    if (ltv <= 80) return 0;
    if (loanType === 'fha') return (loanAmount * 0.0085) / 12;
    let pmiRate;
    if (ltv > 95) pmiRate = 0.0115;
    else if (ltv > 90) pmiRate = 0.0100;
    else if (ltv > 85) pmiRate = 0.0075;
    else if (ltv > 80) pmiRate = 0.0040;
    else pmiRate = 0;
    return (loanAmount * pmiRate) / 12;
}
```

## 1.5 HOA

Median monthly by state: AZ $200, CA $350, CO $250, FL $300, NV $275, TX $150. Increases 3–5%/yr; special assessments can spike 20–50%. Model 3% annual growth. FL $300/mo HOA over 30 yrs @3% → **$171,847 total**.

## 1.6 Complete monthly payment — worked example ($350K FL home, 20% down, 6.0%)

```
P&I: $1,679 | Taxes: $286 | Insurance: $733 | PMI: $0 | HOA: $300
Total Monthly: $2,998
Maintenance Reserve (2%): $583
TRUE Monthly Cost: $3,581
```

Year-1 total housing cost $49,606 vs prior rent $21,600 → +$28,006 (+$2,334/mo).

## 1.7 Total Cost of Ownership (30-year, same example)

```
Acquisition: $70K down + $14K closing (4%) = $84,000 cash
Holding (30yr): Principal $280,000 + Interest $323,567 (115% of principal)
  + Taxes $171,847 + Insurance $586,304 + HOA $171,847
  + Maintenance $262,500 + Major repairs $75,000 = $1,871,065
Disposition: Sale @3% appreciation = $849,274 − 6% realtor ($50,956) − closing ($8,493) = $789,825 net
Net position: $84,000 + $1,871,065 − $789,825 = −$1,165,240
Opportunity cost: $70K in S&P @7% = $533,058; payment delta vs $1,800 rent invested = $1,156,847 → $1,689,905
Breakeven vs renting: Year 8 (Yr5 renting +$93K; Yr10 owning +$58K; Yr15 +$267K; Yr30 +$524,665)
```

Constants: closing costs 4% buy side; selling costs ~9% (6% realtor + ~2.4% seller closing); appreciation 3%/yr; maintenance 2.5% of home value annually (compounding); alternative return 7%.

## 1.8 Loan products

- **30-yr fixed:** qualifies at 3% down (97% LTV); PMI <20% down; highest total interest. $280K @6%: $1,679/mo, $323,567 interest, $603,567 total.
- **15-yr fixed:** rate −0.25 to −0.50%; $280K @5.5%: $2,287/mo (+36%), $131,609 interest → **saves $191,958** vs 30-yr, costs +$608/mo.
- **5/1 ARM:** initial −0.50 to −0.75%; caps 2/2/5 (first adj +2%, subsequent +2%/yr, lifetime +5%). Example 5.25%: $1,546/mo, saves $7,980 over 5 yrs; worst case 10.25% → $2,491/mo.
- **FHA 3.5%:** credit 580+; $350K home → loan $337,750 + $5,911 upfront MIP financed = $343,661; P&I @6.25% $2,116 + MIP $244 + T $286 + I $733 = **$3,379/mo**, $681/mo more than conventional 20% down ($2,698/mo); 30-yr difference $245,160.
- **VA 0%:** funding fee 2.3% first-time ($8,050 on $350K); P&I @5.75% $2,089 + T + I = $3,108/mo; $410/mo more than conventional but $0 down.
- **Interest-only:** I/O 10 yrs then P&I over remaining 20 — $280K @6.5%: $1,517/mo then $2,364/mo (+56% payment shock). AVOID.

## 1.9 Edge cases & validation

```javascript
// Self-employed income: apply 15% discount automatically
// 0% rate → P/n; 100% down → $0 P&I; DTI>100% → "Reduce debt first"
// Input validation: income>0, debt≥0, 0≤downPayment≤price, 0≤rate≤30, price>0
```

Income-type multipliers (Expert doc): W-2 1.0; Self-Employed 0.85; Commission 0.90; Dual Income 0.95.
Relationship multipliers: Single 1.0; Married 1.1; Recently Separated 0.7; Engaged 0.8.

Regional PITI examples ($350K): FL $2,866/mo; TX $3,150/mo; CA $2,450/mo.

---

# PART 2 — MONTE CARLO TECHNICAL SPEC (quote-level)

## 2.1 Fundamentals

- **10,000 scenarios** → ±1.0% margin of error at 95% confidence (1,000 → ±3.1%; 5,000 → ±1.4%; 50,000 → ±0.4% overkill). Completes in 2–4s (target <5s).
- Tests: market crashes, income shocks, rate changes, emergency repairs, health events, inflation.
- Philosophy: "Test resilience, not just affordability."

## 2.2 Box-Muller normal generator

```
Given U₁, U₂ ~ Uniform(0,1):  Z = √(-2 ln U₁) × cos(2π U₂)  →  Z ~ Normal(0,1)
Scale: X = μ + σZ
```

```javascript
function boxMuller(mu = 0, sigma = 1) {
    let u1 = 0, u2 = 0;
    while(u1 === 0) u1 = Math.random();
    while(u2 === 0) u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mu + sigma * z;
}
// Validated: 100K samples → mean −0.0023, variance 0.998
```

## 2.3 Market scenarios (Case-Shiller 1987–2024 calibration)

```javascript
const marketScenarios = [
    { name: '2008 Financial Crisis', priceChange: -0.33, duration: 72, probability: 0.05,
      characteristics: { unemploymentSpike: 0.10, creditFreeze: true, foreclosureWave: true } },
    { name: 'Dotcom Correction', priceChange: -0.10, duration: 24, probability: 0.10,
      characteristics: { unemploymentSpike: 0.02, creditFreeze: false, foreclosureWave: false } },
    { name: 'COVID Boom', priceChange: 0.15, duration: 24, probability: 0.05,
      characteristics: { unemploymentSpike: 0.08, creditFreeze: false, foreclosureWave: false } },
    { name: 'Normal Appreciation', priceChange: 0.04, duration: 12, probability: 0.70,
      characteristics: { unemploymentSpike: 0, creditFreeze: false, foreclosureWave: false } },
    { name: 'Regional Correction', priceChange: -0.15, duration: 36, probability: 0.10,
      characteristics: { unemploymentSpike: 0.04, creditFreeze: false, foreclosureWave: false } }
];
```

(Historical table also lists S&L Crisis 1989–91 −8%, recovery 2 yrs, 10% prob; Dotcom −3% trough; recovery times: 2008 = 6 yrs.)

Selection: weighted random via cumulative probability. Price path:

```javascript
function generatePricePath(initialPrice, scenario, years = 5) {
    const path = [initialPrice];
    let currentPrice = initialPrice;
    const annualChange = Math.pow(1 + scenario.priceChange, 12 / scenario.duration) - 1;
    for (let month = 1; month <= years * 12; month++) {
        const monthlyChange = annualChange / 12;
        const volatility = boxMuller(0, 0.02); // 2% monthly volatility
        currentPrice *= (1 + monthlyChange + volatility);
        path.push(currentPrice);
    }
    return path;
}
// 2008 example: M0 $350K → M12 $338,450 → M24 $310,625 → M60 $234,500 (−33% trough)
```

## 2.4 Job loss & income model

BLS annual job-loss probabilities: Professional/College+ 4% (3.2 mo duration); Service/HS 8% (4.8); Retail/no degree 12% (6.5); Self-employed 15% (7.2); Gig 25% (4.0).

```javascript
function simulateJobLoss(jobStability, years = 5) {
    // 1-10 scale → probability: 10 = 2%/yr, 5 = 8%/yr, 1 = 20%/yr
    const annualProb = 0.02 + (0.018 * (10 - jobStability));
    for (let year = 1; year <= years; year++) {
        if (Math.random() < annualProb) {
            const duration = Math.round(3 + boxMuller(0, 2)); // 3±2 months
            return { occurred: true, year, duration: Math.max(1, duration),
                     severancePay: Math.random() < 0.3 }; // 30% get severance
        }
    }
    return { occurred: false };
}
// On re-employment: return at 15% lower salary (income * 0.85)
```

Income volatility by type:

```javascript
const incomeVolatility = {
    'W-2 Salaried':    { mu: 0.02,  sigma: 0.03, downside: 0.90, upside: 1.15 },
    'Self-Employed':   { mu: 0.03,  sigma: 0.25, downside: 0.50, upside: 2.00 },
    'Commission Heavy':{ mu: 0.04,  sigma: 0.15, downside: 0.70, upside: 1.50 },
    'Dual Income':     { mu: 0.025, sigma: 0.05, downside: 0.50, upside: 1.20 }
};
// Each year: income *= (1 + boxMuller(mu, sigma)); clamp to [base*downside, base*upside]
```

## 2.5 Interest rate model (mean reversion, NOT random walk)

Historical 30-yr rates (1971–2024): mean 7.76%, median 7.42%, σ 2.89%, min 2.65% (2021), max 18.45% (1981), Dec 2024 ~6.5%.

```javascript
function simulateRates(initialRate, years) {
    const longTermMean = 6.5, meanReversion = 0.3, volatility = 0.50;
    let rate = initialRate;
    for (let year = 1; year <= years; year++) {
        const drift = (longTermMean - rate) * meanReversion;
        const shock = boxMuller(0, volatility);
        rate += drift + shock;
        rate = Math.max(2.0, Math.min(15.0, rate)); // floor 2%, cap 15%
    }
}
```

Refinance rule: refi if rate drop ≥1% AND ≥10 yrs remain AND breakeven ≤24 months; closing costs = 2% of loan balance.

## 2.6 Repair events

System lifespans/costs: HVAC 15yr (10–20) $8–12K; asphalt roof 20yr $12–18K; tile roof 50yr $25–35K; water heater 10yr $1.5–2.5K; appliances 13yr $3–6K; foundation $10–50K; re-pipe 50yr $8–15K.

Simulation rules: HVAC replacement every 15 yrs from yr 10, 80% probability, cost $8K+rand×$4K; roof at 20±3 yrs, $12K+rand×$6K; catastrophic repair 1%/yr, $10K+rand×$40K; routine major repair every 5 yrs, $2K+rand×$3K.

## 2.7 Correlations (critical: events NOT independent)

- Market crash × job loss: severe crash (<−20%) → 3× job-loss prob; moderate (<−10%) → 1.5×. (2008: prices −33%, unemployment +4.5pts, ρ = 0.67.)
- Rates × prices: ρ = −0.45; **1% rate increase → ~8% price decrease** (`priceImpact = rateChange * -8.0 / 100`).

## 2.8 Master engine pseudocode (quoted structure)

```javascript
function runCompleteMonteCarlo(userInputs, scenarios = 10000) {
    for (let i = 0; i < scenarios; i++) {
        const marketScenario = selectMarketScenario();
        const adjustedJobLossProb = correlatedEvents(marketScenario,
            calculateBaseJobLossProb(userInputs.jobStability));
        const simulation = runSingleScenario({ ...userInputs, marketScenario,
            jobLossProb: adjustedJobLossProb, years: 5 });
        // collect: affordability, cashFlowSurvival(monthsSolvent), equityPosition,
        //          jobLossRecovery, crashResilience, refinanceOpportunities
    }
    return {
        p10: percentile(results.affordability, 0.10),
        p50: percentile(results.affordability, 0.50),
        p90: percentile(results.affordability, 0.90),
        successRate: (cashFlowSurvival.filter(m => m >= 60).length / scenarios) * 100,
        avgJobLossSurvival: mean(jobLossRecovery),
        crashSurvivalRate: (crashResilience.filter(s => s).length / scenarios) * 100,
        avgRefinanceSavings: mean(refinanceOpportunities)
    };
}
```

Single scenario: month-by-month over 5 years; job loss check `Math.random() < jobLossProb/12`; recovery months `3 + boxMuller(0,2)`; monthly cash flow `surplus = income/12 − (PITI + debt)`; repairs deducted; **insolvency (cash < 0) → break**; equity = currentPrice − loanBalance. `survived2008Scenario = scenario.name === '2008 Financial Crisis' && monthsSolvent >= 60`.

## 2.9 Output tiers & percentile interpretation

```
Success Rate ≥85% → Tier 1 Strong → READY
Success Rate 70–84% → Tier 2 Moderate → ALMOST THERE
Success Rate <70% → Tier 3 Weak → NOT YET

P10: "Can you survive bad luck?" (negative P10 equity = high risk)
P50: "Most likely scenario" (primary recommendation)
P90: upside only — don't plan on it (optimism bias)
```

## 2.10 Validation & sensitivity

Backtest on 2006 cohort (Fannie Mae data): actual default 8.2%, HōMI predicted 8.7% (+0.5pp error), **R² = 0.78**.
Sensitivity: rate +1% → affordability −10.3%; income +10% → +10.8%; down payment +$10K → +$10K (1:1); property tax +0.5% → −2.1%; job stability −2 pts → −4.7%. Most sensitive: interest rate.

Performance: pre-compute 100K normal samples; early termination (`if monthsSolvent < 12 && month > 24 → break`); fallback to deterministic P50 on error.

---

# PART 3 — SCORING ALGORITHM VALIDATION (exact weights & thresholds)

## 3.1 Framework: 35 / 35 / 30

- **Financial Reality 35 pts** — explains ~40% of default variance (Bhutta et al. 2015).
- **Emotional Truth 35 pts** — life events + strategic behavior ≈ 60% of defaults (Bhutta: life events 35%, strategic 25%, pure financial 40%).
- **Perfect Timing 30 pts** — timing/horizon determines equity trajectory (Foote: negative equity + life shock = 65% foreclosure vs 12% equity alone).

Evidence: Gerardi 2008 — 40% of foreclosures had DTI <36% at origination. Logistic regression R²: financial-only 0.42 → +emotional 0.61 → +timing 0.68 (**62% better than financial-only**).

## 3.2 Financial Reality sub-scores (35 pts)

**DTI — 14 pts** (Fannie Mae 2000–2023, 28.4M loans):

| DTI | Default rate | Rel. risk | Points |
|-----|-------------|-----------|--------|
| ≤28% | 2.1% | 1.0× | 14 |
| 28–36% | 4.8% | 2.3× | 10 |
| 36–43% | 9.2% | 4.4× | 6 |
| 43–50% | 15.7% | 7.5× | 3 |
| >50% | 27.3% | 13.0× | 1 |

Stats: β=0.047 (each +1% DTI → 4.8% higher default odds), pseudo-R²=0.34, χ²=18,742. Point formula: `Points = 14 * max(0, (7.5 − RelativeRisk) / 6.5)`, min 3 in 43–50 band. HōMI position: 28% aspirational (14), 36% acceptable (10), 43% high risk (6).

**Down payment — 10.5 pts:**

| Down | LTV | Default | Rel. risk | Points |
|------|-----|---------|-----------|--------|
| ≥20% | ≤80% | 1.8% | 1.0× | 10.5 |
| 15–19% | 80–85% | 3.2% | 1.8× | 8.0 |
| 10–14% | 85–90% | 5.1% | 2.8× | 5.5 |
| 5–9% | 90–95% | 8.4% | 4.7× | 3.0 |
| <5% | >95% | 13.2% | 7.3× | 1.0 |

(Bhutta & Keys 2016: <10% down → 3.2× default vs 20%+.)

**Emergency reserves — 7 pts** (months = fund / monthly housing cost):

| Reserves | Default | Rel. risk | Points |
|----------|---------|-----------|--------|
| ≥6 mo | 2.3% | 1.0× | 7.0 |
| 3–6 mo | 4.7% | 2.0× | 5.0 |
| 1–3 mo | 9.1% | 4.0× | 2.5 |
| <1 mo | 18.4% | 8.0× | 0.5 |

JPMorgan Chase Institute: <3 mo reserves → 2.3× foreclosure; after job loss, 6+ mo reserves → 78% return to solvency vs 31% for <3 mo. Homeowner standard = 6–12 mo (renters 3–6).

**Credit score — 3.5 pts** (trailing indicator; Fuster & Willen 2017 — loses power controlling for DTI/LTV):

| Score | Default | Avg rate | Points |
|-------|---------|----------|--------|
| 780+ | 1.4% | 5.75% | 3.5 |
| 740–779 | 2.2% | 6.00% | 3.0 |
| 700–739 | 4.1% | 6.50% | 2.5 |
| 660–699 | 7.8% | 7.25% | 1.5 |
| 620–659 | 13.2% | 8.00% | 0.5 |
| <620 | 24.1% | 9.50%/decline | 0.0 |

## 3.3 Emotional Truth sub-scores (35 pts)

**Job stability — 13 pts** (1–10 user scale): 9–10 → 2%/yr unemployment risk, 8% foreclosure-if-loss → 13.0; 7–8 → 5%, 15% → 10.0; 5–6 → 10%, 28% → 7.0; 3–4 → 20%, 45% → 3.5; 1–2 → 35%, 67% → 1.0. (Herkenhoff 2019: <2yr tenure → 2.8× layoff rate; unemployment during ownership → 22% foreclosure.)

**Life stability — 13 pts:** 9–10 → 5% 5-yr major-event prob, 2.8% default → 13.0; 7–8 → 15%, 5.2% → 10.0; 5–6 → 30%, 9.7% → 7.0; 3–4 → 50%, 18.3% → 3.5; 1–2 → 75%, 31.2% → 1.0. Linear map: `points = stabilityScore * 1.3`. (Bricker & Thompson 2016: life events = 40% of mortgage distress; life event + high DTI = 3.5× default.)

**Maintenance comfort — 9 pts:** 9–10 (enjoys, ~$500 DIY/$1K hired) → 9.0; 7–8 → 7.0; 5–6 → 5.0; 3–4 ($6K hired/yr) → 3.0; 1–2 (hires all, $8K+) → 1.0. (Rohe & Lindblad 2013: enjoy maintenance → +35% life satisfaction; hate it → 2.1× regret.)

## 3.4 Perfect Timing sub-scores (30 pts)

**Time horizon — 15 pts** (note: validation doc's table sums to 19.5 max — internal inconsistency preserved): ≤2 yrs → 3.0; 3–4 → 7.5; 5–7 → 15.0; 8–10 → 18.0; 10+ → 19.5. Breakeven vs renting = year 8–9; transaction costs on $350K = $22,500 entry (4% closing $14K + inspection $1.5K + moving $2K + repairs $5K) + $62,449 exit = $84,949 total.

**Savings rate — 10 pts:** ≥20% → 96% on-time, 10.0; 15–19% → 91%, 7.5; 10–14% → 83%, 5.0; 5–9% → 71%, 2.5; <5% → 52%, 0.5.

**Down payment progress — 5 pts:** ≥20% saved → 5.0; 15–19% → 4.0; 10–14% → 3.0; 5–9% → 1.5; <5% → 0.5. (20%+ savers: 40% lower default.)

## 3.5 Verdict thresholds

```
80+  = READY         → MC success ≥85%, historical default <3%
60–79 = ALMOST THERE → success 70–84%, default 5–8%
<60  = NOT YET        → success <70%, default 12%+
```

A/B test plan: A strict 85+ (80% NOT YET) / B moderate 80+ (73%) / C lenient 75+ (60%); 90 days, 10K users/variant; primary metric 6-month return rate. **"The 73% NOT YET rate is not a bug. It's the feature that builds trust."**

(Expert doc states slightly simplified tiers: DTI >43% → 2 pts "subprime"; down 10–20% → 7, 5–10% → 4, <5% → 1; reserves <1 mo → 0; credit by rate ≤6% → 3.5, 6–7% → 2.5, >7% → 1.)

---

# PART 4 — EXPERT CALCULATOR DOCUMENTATION (feature specs)

## 4.1 Live metrics thresholds
- DTI meter: Green ≤28% "Lender Sweet Spot"; Yellow 28–36% "Acceptable"; Red >36% "High Risk (Reduce Debt)".
- Down payment indicator: live PMI estimate, clear 20% threshold.
- Reserves gauge: months of coverage; warns below 6-month homeowner minimum (renters 3–6 mo).

## 4.2 "The Signal" — safe zone vs lender max (anchoring counter-design)
```
HōMI Safe Zone         $300K–$370K  $2,450/mo  COMFORTABLE
Conservative (28% DTI)  $330K       $2,600     SAFE
Moderate (31% DTI)      $365K       $2,890     TIGHT
Aggressive (36% DTI)    $415K       $3,280     RISKY
What You "Qualify" For  $475K       $3,750     DANGER ZONE
→ Gap: lender approves $105–175K more than HōMI safe zone
```

## 4.3 Cash-flow lifestyle impact (worked example)
Renting: housing $1,800, debt $650, remaining $2,750/mo (vacation $5K/yr, retirement $600/mo). After $350K purchase: housing $2,890, remaining $1,660/mo (vacation $2K, retirement $200) → **−40% discretionary income**. Color warnings: green minimal; yellow −$500 to −$800/mo; red >$800/mo reduction.

## 4.4 Path to Readiness (NOT YET roadmap format)
Example: score 58 → needs +$45K down payment, $8.5K debt payoff, +$18K emergency fund; at $800/mo savings → 22 months, milestones at Mo 6 (reserves complete), Mo 14 (DTI <28%), Mo 22 (20% down → READY 80+).

## 4.5 NOT YET Moat message (canonical copy)
"73% of HōMI users receive 'NOT YET' verdicts. This is our competitive advantage, not our failure. Traditional lenders profit when you transact… HōMI profits when you succeed… This structural difference creates radical honesty that competitors cannot replicate."

## 4.6 Loan comparison table (Expert example)
Conventional 20%: $70K down, 5.75%, $2,450/mo, $0 PMI, $84K cash — RECOMMENDED. Conventional 10%: $35K, 6.00%, $2,710, $180 PMI, $49K — TIGHT. FHA 3.5%: $12.3K, 6.25%, $2,890, $280 MIP, $22.8K — RISKY. FHA costs $440/mo more → $158,400 extra over 30 yrs; MIP never falls off.

## 4.7 Monte Carlo output examples
Success Rate 78%; Job Loss Survival 8.3 months; 2008 Crash Survival 62%. (Phase 2 Sage example: 58% survive 2008-level crash, 61% survive job loss.)

## 4.8 Phase 2 wish list (not yet built)
Plaid linking, Supabase backend, OVN checkpoints (6/12/24-mo outcome verification), rent-vs-buy, 15 vs 30-yr comparison, refi alerts, co-borrower mode, investment property version (25% down), historical score comparison, ML on verified outcomes.

---

# PART 5 — MOBILE APP REBUILD PROMPT (full product spec)

## 5.1 Brand constants (immutable)
- Spelling: `HōMI` only (H&#333;MI). Banned: HŌMI, HÅMI, HOMI, Homi, HōMi, HoMI. Letter colors: H cyan, ō emerald, M yellow, I cyan.
- Colors: Cyan #22d3ee (financial), Emerald #34d399 (emotional), Yellow #facc15 (timing/action), Navy #0a1628 (bg), Slate #1e293b (cards), Light #e2e8f0, Muted #94a3b8, Danger #ef4444, Purple #a855f7 (couples).
- Fonts: Inter (300–900); Fraunces for display headers. H1 cyan, H2 emerald, H3 yellow.
- Threshold Compass SVG (200px viewBox): outer ring cyan r=85, 20s CW, 4 cardinal dots; middle emerald r=60, 15s CCW, 4 intermediate dots; inner yellow r=35, 10s CW; center yellow keyhole (circle cx100 cy96 r12 + rect x94 y104 w12 h16 rx2); glow `drop-shadow(0 0 30px rgba(34,211,238,0.4))`.
- Tagline: "Decision Readiness Intelligence™". Voice: calm confidence, radical honesty, no buzzwords/apologies.

## 5.2 Tech architecture
Single HTML file, embedded CSS/JS, Chart.js + Google Fonts only, localStorage persistence (key `homiFinanceProfile`). Mobile-first: viewport-fit=cover, safe-area insets, 100dvh, 44px touch targets, bottom nav 64px + safe area, input font-size 16px, maximum-scale=1.0.

## 5.3 Views (10) & modals (5)
Views: Dashboard, Command, Mindful, Impulse, Tools, Tax Pro, Intel, Genome, Network, Plan. Modals: Onboarding, Assessment, Impulse, New Decision, Calculator.
Dashboard verdict badge: **≥80 READY (emerald); 55–79 BUILDING (cyan); <55 NOT YET (yellow)** (note: app uses 55/80 bands vs calculator's 60/80).

## 5.4 App score calculation (simplified consumer version)

```javascript
function calcScores() {
  // Financial (0-100)
  let fin = 20;
  if (savings > 10000) fin += 30;
  if (savings > income * 3) fin += 20;
  if (debt === 0) fin += 30;
  else if (debt < income * 3) fin += 15;
  // Emotional (0-100)
  let emo = 40;
  if (savings > income * 3) emo += 30;
  if (impulseStreak > 5) emo += 20;
  if (lastMood === 'calm') emo += 10;
  // Timing (0-100)
  let time = 50;
  if (savings > 0) time += 20;
  if (debt < savings) time += 30;
  // Weighted total
  total = (fin * 0.35) + (emo * 0.35) + (time * 0.30);
}
```

## 5.5 App Monte Carlo (simplified retirement version)

```javascript
function runMonteCarlo() {
  const sims = 10000;
  const years = retAge - age;
  for (let i = 0; i < sims; i++) {
    let balance = savings;
    for (let y = 0; y < years; y++) {
      const ret = 0.07 + (Math.random() - 0.5) * 0.3; // uniform −8% to +22%
      balance = balance * (1 + ret) + (income * 0.15 * 12); // 15% savings rate
    }
    results.push(balance);
  }
  results.sort((a, b) => a - b);
  const successCount = results.filter(r => r > income * 25).length; // 25× income target
  const successRate = (successCount / sims) * 100;
  const median = results[Math.floor(sims / 2)];
}
```

## 5.6 The 15 financial mini-calculators (exact logic)

| Key | Name | Fields | Formula |
|-----|------|--------|---------|
| affordability | Home Affordability | Annual Income, Monthly Debt | `(income/12*0.36 − debt) * 12 * 5` |
| mortgage | Mortgage Payment | Loan, Rate % | amortization, 360 mo |
| rentVsBuy | Rent vs Buy | Rent, Home Price | compare `rent*120` vs `price*0.4` |
| auto | Auto Loan | Price, Rate % | amortization, 60 mo |
| lease | Lease vs Buy | Price, Monthly Lease | `lease*36` vs `price*0.4` |
| fire | FIRE Number | Annual Spending | `spending * 25` (4% rule) |
| debt | Debt Payoff | Balance, Monthly Payment | `balance / payment` months |
| compound | Compound Growth | Principal, Years | `principal * 1.07^years` |
| rule72 | Doubling Time | Rate % | `72 / rate` |
| dti | DTI Ratio | Monthly Income, Debt | `(debt/income) * 100` |
| netWorth | Net Worth | Assets, Liabilities | `assets − liabilities` |
| emergency | Emergency Fund | Monthly Expenses | `expenses * 6` |
| savingsRate | Savings Rate | Income, Saved | `(saved/income) * 100` |
| hourly | Hourly Value | Annual Salary | `salary / 2080` |
| latte | Latte Factor | Daily Expense | `expense * 365 * 10` |

## 5.7 The 7 tax calculators
roth (Roth Conversion: IRA balance, current vs retirement bracket → lifetime benefit); irmaa (MAGI → surcharge tier); qcd (IRA balance, age, charity goal → optimal QCD); widow (joint income, filing status → annual penalty); capGains (taxable income, unrealized gains → harvestable at 0%); stateArb (income, state rate → 25-yr savings); lossHarvest (loss, bracket → tax savings). Plus Tax Efficiency Score: OPTIMIZED / GOOD / NEEDS WORK.

## 5.8 What-If scenarios
crash: portfolio −30% → show savings×0.7 + recovery estimate; job: 6 months no income → runway at 60% spending; windfall: $10K → suggest 80/20 invest/enjoy split.

## 5.9 Behavioral Genome — 9 dimensions (app formulas, from stress 1–10)

| Dimension | Formula | Color |
|-----------|---------|-------|
| Loss Aversion | 50 + stress*5 | cyan |
| Time Perception | (10−stress)*10 | emerald |
| Confidence | 60 − stress*2 | yellow |
| Volatility Tolerance | 100 − stress*8 | cyan |
| Regret Asymmetry | 40 + stress*6 | emerald |
| Social Proof | stress*8 + 20 | yellow |
| Narrative Bias | 50 + stress*3 | cyan |
| Agency | 80 − stress*4 | emerald |
| Outcome Bias | 30 + stress*4 | yellow |

## 5.10 State object

```javascript
{
  user: { name:'', income:0, savings:0, debt:0, age:35, retAge:65, stress:5 },
  impulse: { streak:0, saved:0, resists: [] }, // {item, cost, date}
  decisions: [], // {title, amount, date}
  moods: [], onboarded: false
}
```

Other app features: Trinity Engine (Advocate/Skeptic/Arbiter — app naming; calculator uses Spark/Sage/Atlas), Temporal Twin™ future-self message, mood check-in (😰😌💪😫) with mood-keyed coach responses, impulse streak/saved tracking + doughnut chart (70% cutout), paycheck calendar (paydays 15th & 28th), 12-month forecast bar chart, network viz (30 nodes/18 lines, demo stats 12,482 nodes), Couple Sync (purple), linked-accounts simulation (Chase $4,500 + Ally $20,000), loader 1800ms fade.

---

# PART 6 — RESEARCH FOUNDATION (HōMI_finance_research.md)

## 6.1 Market-gap data points
- 31% of couples: money is #1 relationship stressor (APA 2025).
- Weekly money fights → 30%+ more likely to divorce.
- 63% of Americans regret major financial decisions.
- Four fragmented research streams HōMI unifies: financial capability, behavioral biases, couples dynamics, decision timing.

## 6.2 Financial Ring evidence
- Emergency fund = strongest resilience predictor: 3–6 months saved → 87% less vulnerable to shocks; 30% of mortgage defaults from unemployment/illness.
- DTI risk curve: <36% low stress; 36–45% manageable; 45–50% visible stress; >50% acute fragility, default risk 3×.
- Down payment: 3–5% down → 2× default; 10%+ → equity buffer, fewer regret sales.
- Income stability > income level: job-change risk drives 40% of financial stress; ignoring it → 60% higher regret; unstable income + home purchase → 5× marital stress.

**Financial Ring question weights:** Emergency Buffer 25% (scoring: 0 mo→1, 1–2→2, 3–4→4, 5+→5; <1 mo = hard cap Financial score at 55); DTI 25% (<20%→5, 20–35%→4, 36–45%→2, 46%+→1; DTI>50% = hard cap at 50); Income Stability 20%; Housing Cost Share 15% (<25%→5, 25–28%→4, 28–36%→3, 36%+→1; 28% front-end / 36% back-end lender standards); Down Payment Adequacy 10% (3%→2, 5–10%→3, 10%+→5); Surprise Capacity 5% ($3,000 shock test).

## 6.3 Emotional Ring evidence
- Emotional regret = #1 predictor of buyer dissatisfaction (not market conditions).
- "Pushed into this" → 2.5× seller's remorse; clear internal "why" → 70%+ satisfaction even if market drops 10%.
- Pressure-driven decisions → 60%+ higher post-purchase emotional dysregulation.
- Financial decisions ~60% emotional / 40% rational (Damasio); EI = 15–30% of decision-quality variance.

**Emotional Ring weights:** Clarity of Why 20%; Pressure vs Pull 20% (0–100 scale; 0–20 pull→5, 60+ pressure→1); Nervous System Check 15% (somatic markers; panic signals misalignment); Relationship Alignment 15% (N/A if single); Emotional Bandwidth 15%; Regret Lens 10%; Coping & Support 5%. Thresholds: <45 consider Stop Mode; 45–55 NOT YET tier; 55+ foundation present.

## 6.4 Timing Ring evidence & weights
"Perfect time" = personal readiness + market window + life stability alignment; life stability 3× more important than rate environment. Weights: Market Conditions 20%; Life Timing/event clustering 20% (next 18 months); Career Arc 15%; Location Stability 15% (3–5 yr move likelihood; mobility regret = top-3 homebuyer regret); Opportunity Cost Window 15%; Lock-in Comfort 10%; Macro Risk Tolerance 5%. Bands: <50 early window; 50–65 opening; 65+ strong.

## 6.5 Behavioral Genome — research version (9 traits, 0–100)
Loss Aversion, Time Perception, Confidence, Social Comparison, Mental Accounting, Anchoring, Regret Sensitivity, Present Bias, Risk Tolerance. Interpretation bands: high 75+, low 25−. Loss aversion heterogeneity: 30–40% high, 20–30% low. Big-5 Conscientiousness + Agreeableness explain 40% of financial-behavior variance. Stabilizes after 3–4 weeks of check-ins.
Coach routing: High Confidence + High Present Bias → **Spark**; High Loss Aversion + High Regret Sensitivity → **Sage**; balanced → **Atlas**.

## 6.6 Transformation paths
Severity-based: mild (60–69) → 30 days/3–4 micro-steps; moderate (45–59) → 60 days; severe (<45) → 90 days/3 chapters. Financial severe path (DTI>45% or EF<1 mo): Ch1 Stabilize the Floor (7-day expense audit, kill 1 recurring expense, auto-transfer even $25/wk); Ch2 Tame the Payments (debt avalanche; creditor rate-reduction calls = 15–20% success, 20 min); Ch3 Build Proof of Pattern (90 days consistency, HYSA, retest).

## 6.7 Stop Mode triggers
- Single emotional assessment <35 → immediate flag.
- 15-point drop in 7 days → Stop Mode.
- 3+ consecutive severe-stress check-ins ("numb", "overwhelmed") → Stop Mode.
- Behavioral: repeated override attempts, manic buy/stop oscillation, isolation/hiding signals.
- Support: 72-hour decision pause (cooling-off improves outcomes), grounding, "protection not failure" reframe; crisis language → 988/Crisis Text Line. Lift: user-initiated + confirm, auto-review at 72h, or +10 emotional points.

## 6.8 Couples alignment formula
```
Alignment = 100 − WeightedAvgDistance
distance per dimension = |PartnerA − PartnerB| on Financial, Emotional, Timing, Risk Tolerance(genome)
Weights: Financial 40%, Emotional 35%, Timing 20%, Genome 5%
Bands: 75+ high; 50–74 moderate; <50 low (needs deeper conversation)
```
Top-3 conflict drivers (Peetz et al. 2023, 500+ couples): perceived irresponsibility 39%, exceptional expenses 29%, different values 24%.

## 6.9 Compliance & privacy
Assessment disclaimer: educational tool, not investment/legal advice. Pre-referral: "READY reflects personal readiness, not lender eligibility… HōMI may receive compensation for referrals." Retention: default long-term; auto-delete after 3 yrs inactivity (notify at 2); GDPR full deletion; CSV/PDF export.

## 6.10 Key citations
Kahneman & Tversky 1979 (Prospect Theory); Sherraden 2013 / Archuleta 2022 (financial capability); Peetz et al. 2023; Kaur et al. 2020; Ma & Stachurski 2019 (continuation values); Dixit & Pindyck 1994; Klontz & Klontz 2009 (money scripts); Damasio (somatic markers); Gottman method.

---

# PART 7 — PHASE 2 IMPLEMENTATION SUMMARY (shipped state & roadmap)

Shipped Phase 2 features: 10K Monte Carlo (~4s) with crash scenarios/job loss/repairs; loan product comparison (30-yr 20%, 30-yr 10%, FHA 3.5%, 15-yr); 30-yr TCO with breakeven (yr 8–9); cash-flow impact; dynamic Trinity debate; live metrics; regional cost data (CA 0.76%/$2,800; TX 1.80%/$4,200; FL 0.98%/$8,800; NJ 2.49%/$3,500; CO 0.55%/$2,500); 35/35/30 scoring; verdict action plans; 10-step loading; Chart.js visuals. Single HTML, 112KB; load <1s; MC ~4.5s; 375–1440px responsive; Chrome 90+/FF 88+/Safari 14+/Edge 90+.

Testing targets: completion ≥65%; time on page 5–8 min; **NOT YET rate ~73%**; email capture ≥40%; 6-mo return ≥30%; NPS: READY 70+, ALMOST 60+, NOT YET 50+.

Phase 3 roadmap (SQL given): Supabase tables `users`, `analyses` (inputs/results JSONB, verdict, score), `subscribers` (list: not_yet/almost_there/ready); Plaid; email nurture sequences per verdict (full 7-touch NOT YET, 5-touch ALMOST, 4-touch READY sequences documented); Outcome Verification Network checkpoints (analysis_id, 6-month checkpoint, actual_outcome: purchased/still_saving/circumstances_changed) — target claim: "We told 10,000 people NOT YET. 87% of them thank us."; A/B thresholds 75/80/85; PostHog analytics; Sentry.

Known limitations: MC simplified (needs correlation matrices, serial correlation, Case-Shiller calibration); no persistence; no lender referrals/email capture; regional data approximate; self-reported income; credit score ranges only.

---

# PART 8 — USER MANUAL v2.0 (Finance Intelligence Engine — retirement OS)

Product: `HoMI_Finance_Intelligence_Engine_v2.html`, browser-only, no server, data cleared on close. Nov 2025.

**Six tabs:** Financial Profile; Intelligence Report; Roth Optimizer; Social Security; Tax Strategy; Withdrawal Plan.

**Profile inputs:** current age, target retirement age (default 65), life expectancy, state, filing status, risk tolerance (Conservative 5% return/8% vol; Moderate 7%/12%; Aggressive 9%/18%); gross income, expected SS benefit at FRA 67, current & retirement expenses (70–80% rule of thumb), monthly savings rate, pension; balances: 401(k)/Trad IRA, Roth, taxable brokerage, cash, HSA, home equity; emotional sliders 1–10: retirement clarity, financial confidence, money stress, partner alignment.

**Monte Carlo:** 10,000 sims, randomized returns per risk tolerance; bands shown: 95th pct (green), median (cyan), 5th pct (yellow); success rate = % of sims not running out of money.

**Scoring (v2 — different weights than Gen A):**
- Financial Security 40% — from MC success rate.
- Tax Efficiency 30% — Roth ratio, conversion opportunities, tax diversification.
- Timing Optimization 30% — years to retirement + emotional readiness.
- Verdicts: **YOU'RE READY 75+; BUILD 55–74; NOT YET <55.**

**Roth Optimizer:** conversion ladder filling lower brackets; metrics — current bracket room, total recommended conversions, estimated tax cost. Goals: eliminate RMDs, tax-free inheritance, reduce IRMAA surcharges.

**Social Security:** age 62 ≈ 70% of FRA; 67 = 100%; 70 ≈ 124% of FRA. Recommendation by life expectancy: 70 if LE 82+; 67 if 78–81; 62 if <78. Break-even analysis shown.

**Tax Strategy:** bracket-fill visualization (cyan full, emerald partial); effective vs marginal rate; strategies — Roth conversions/gains harvesting to fill low brackets; maximize pre-tax (401k/HSA) in high brackets.

**Withdrawal sequencing:** 1) taxable first (cap gains rates), 2) tax-deferred second (fill brackets pre-RMD), 3) Roth last (tax-free legacy). RMDs start age 73; large trad balances = "tax time bomb" → convert before 73. HSA strategy: pay out-of-pocket now, save receipts, reimburse tax-free in retirement.

**FAQ facts:** most users need 12–36 months to go NOT YET → READY; Roth suggestions simplified (consult pro re: state taxes, IRMAA, ACA subsidies); SS uses standard reduction/enhancement factors (verify at ssa.gov). Tagline: "The most valuable answer is often 'NOT YET.'"

---

# APPENDIX — CROSS-DOC CONSISTENCY NOTES
- Verdict bands differ by generation: Gen A calculator 80/60; mobile app dashboard 80/55 (READY/BUILDING/NOT YET); v2 engine 75/55 (READY/BUILD/NOT YET).
- Pillar weights: Gen A 35/35/30 (fin/emo/timing); app simplified 35/35/30; v2 engine 40/30/30 (financial-security/tax/timing).
- Trinity personas named Advocate/Skeptic/Arbiter in app & manual; Spark/Sage/Atlas in calculator docs & research coach routing.
- 28/36 rule, 20% down/PMI, 6-month homeowner reserve, 25× FIRE (4% rule), 72 rule, 2080 work-hours, 3% appreciation/tax/HOA growth, 5% insurance growth, 7% equity return, 2% monthly price volatility recur across docs as core constants.
