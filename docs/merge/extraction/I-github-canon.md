# HōMI GitHub Canon Extraction — Scoring Engine + Question Bank
**Source: `HoMI-Technology/Homi-Tech-Production` (SOURCE OF TRUTH, owner-ruled 2026-08-04)**
Files: `lib/scoring/engine.ts` · `lib/scoring/weights.ts` · `lib/questions/bank.ts` · `lib/brand/index.ts` · `lib/finance/store.ts` (store + brand extracted earlier — see master doc)

---

## 1. WEIGHTS (trade-secret boundary, C2 RESTRICTED — never expose via public API)
```ts
export const WEIGHTS = Object.freeze({ financial: 0.35, emotional: 0.35, timing: 0.3 });
export const PILLAR_MAX_POINTS = Object.freeze({ financial: 35, emotional: 35, timing: 30 });
```

## 2. VERDICT THRESHOLDS (engine.ts — SSOT)
`>= 80 READY · 65–79 ALMOST_THERE · 50–64 BUILD_FIRST · < 50 NOT_YET` (upper boundary inclusive).
Public helper `scoreToVerdict(score)` — never reimplement inline.
Verdict meta + copy in `lib/brand/index.ts`: READY "All three rings align. Your compass becomes a key." · ALMOST_THERE "You've nearly cooled down. One or two things first." · BUILD_FIRST "Build First is not failure. It is the map." · NOT_YET ("DO NOT PROCEED" label) "Not yet is not no. It is clarity. It is protection."

## 3. HARD-STOPS (force NOT_YET regardless of score; copy verbatim)
- `DTI_OVER_50` (dti > 0.5): "Your debt-to-income ratio is above 50%. Buying right now would leave almost no margin for surprises."
- `HOUSING_RATIO_OVER_45` (monthlyHousingRatio > 0.45, optional input): "The home you are considering would consume more than 45% of your monthly income. That is the line where one bad month becomes a crisis."
- `RUNWAY_UNDER_1_MONTH` (emergencyFundMonths < 1): "You have less than one month of expenses set aside. Owning a home means owning the surprises that come with it — you need runway first."
- `CREDIT_UNDER_620` (creditScore < 620): "Your credit score is below 620. Lenders will price this as high-risk, and the interest cost alone could undo the purchase. Build credit first; you protect yourself by waiting."

## 4. SCORING FUNCTIONS (pure, deterministic)
- clamp(v,min,max): NaN/non-finite → min
- scoreDTI(ratio): ≤28→10, ≤36→7, ≤43→4, else 0 (of max 10)
- scoreDownPayment(ratio): ≥20→10, ≥10→7, ≥5→4, else 0 (max 10)
- scoreEmergencyFund(months): ≥6→8, ≥3→5, ≥1→2, else 0 (max 8)
- scoreCreditHealth(fico): ≥740→7, ≥700→5, ≥660→3, else 0 (max 7)
- sliderToPoints(slider 1–10, max): floor((s−1)/9 × max); s=10 → max
- fomoToPoints: sliderToPoints(11 − s, 8) — inverted
- Emotional single-buyer redistribution: partner 9pts distributed by earned/max ratio across life/confidence/fomo; all-zero → 3/3/3; remainder → largest fractional
- scoreTimeHorizon(months): >12→10, ≥6→7, ≥3→4, else 2 (max 10)
- scoreSavingsRate(ratio): ≥20%→10, ≥10%→7, ≥5%→4, else 1 (max 10)
- scoreDownPaymentProgress(ratio): ≥80%→10, ≥50%→7, ≥25%→4, else 1 (max 10)
- computeScore(): score = fin.total + emo.total + tim.total, clamp [0,100], round 1dp; hardStops → verdict NOT_YET (score preserved); warnings: FOMO_WARNING (all sliders optimal → honesty recheck), PRESSURE_RUSH (fomo ≥8 & horizon <3mo)
- AssessmentInputs (13 fields): debtToIncomeRatio, downPaymentPercent, emergencyFundMonths, creditScore, lifeStability, confidenceLevel, partnerAlignment|null, fomoLevel, timeHorizonMonths, savingsRate, downPaymentProgress, monthlyHousingRatio?, referralSource?/deadlineOrigin? (informational only — never scored; consumed by lib/conflict/engine.ts)
- Example in code: inputs {0.25 dti, 20% dp, 6mo EF, 750 credit, 8/7/9/3 sliders, 18mo, 22% sr, 85% prog} → score 92.0 READY

## 5. QUESTION BANK — 45 questions (15/dimension, decision_types: ['home_buying'])
Types: slider (1–10, slider_direct output 10–100) · single_choice (option_map 0–100) · number (linear_scale / inverse_scale) · threshold. Flow order: financial → emotional → timing (`DIMENSION_ORDER`). DB mirror: `supabase/migrations/00006_seed_question_bank.sql` (prefer DB when Supabase available).

### FINANCIAL (15)
| # | id | weight | question / scoring |
|---|---|---|---|
| F1 | fin_income | 1.0 | Monthly gross income — number, linear 0–25000, optimal_min 6000 usd |
| F2 | fin_income_stability | 0.9 | 2yr income stability — very_stable 100 / mostly 75 / somewhat 40 / unstable 15 |
| F3 | fin_savings_total | 1.0 | Total savings+liquid — number, linear 0–200000, optimal_min 40000 usd |
| F4 | fin_down_payment | 1.0 | DP % — 20_plus 100 / 15_19 85 / 10_14 70 / 5_9 50 / 3_4 35 / less_3 15 |
| F5 | fin_emergency_fund | 0.95 | EF months AFTER down+closing — 6_plus 100 / 4_5 75 / 2_3 50 / 1 25 / none 5 |
| F6 | fin_debt_payments | 0.9 | Monthly debt payments — number, inverse 0–5000, optimal_max 500 usd |
| F7 | fin_dti_ratio | 0.95 | DTI — under_20 100 / 20_28 85 / 29_36 65 / 37_43 40 / over_43 15 / unknown 30 |
| F8 | fin_credit_score | 1.0 | Credit — excellent(760+) 100 / good(700-759) 80 / fair(640-699) 55 / poor(580-639) 30 / very_poor 10 / unknown 25 |
| F9 | fin_preapproval | 0.85 | Pre-approval — yes_strong 100 / yes_basic 80 / prequalified 55 / started 35 / no 10 |
| F10 | fin_housing_budget | 0.95 | Housing % of gross — under_25 100 / 25_28 85 / 29_33 65 / 34_40 40 / over_40 15 |
| F11 | fin_additional_income | 0.6 | Extra income — significant 100 / moderate 70 / small 45 / none 30 |
| F12 | fin_closing_costs | 0.75 | Closing costs budgeted (2–5%) — fully_saved 100 / partially 65 / aware 35 / unaware 10 |
| F13 | fin_maintenance_buffer | 0.7 | Maintenance budget (1–2%/yr) — yes 100 / aware_planning 70 / somewhat 40 / no 15 |
| F14 | fin_employment_type | 0.85 | Employment — w2_2plus 100 / self_2plus 75 / w2_under2 70 / self_under2 40 / gig 35 / between_jobs 5 |
| F15 | fin_literacy | 0.5 | Mortgage terms understanding — slider 1–10 direct |

### EMOTIONAL (15)
| # | id | weight | question / scoring |
|---|---|---|---|
| E1 | emo_confidence | 0.8 | Confidence buying now — slider |
| E2 | emo_clarity | 0.75 | Clarity on what you want — slider |
| E3 | emo_stress | 0.8 | Stress (extremely stressed→completely calm) — slider |
| E4 | emo_commitment_fear | 0.85 | Comfort with long-term commitment — slider |
| E5 | emo_partner_alignment | 0.85 | Partner/family alignment — fully 100 / mostly 80 / partially 45 / not 15 / solo 75 |
| E6 | emo_fomo | 0.9 | Genuine readiness vs FOMO — genuine 100 / mostly_genuine 80 / mixed 50 / mostly_fomo 25 / fomo 10 |
| E7 | emo_preparedness | 0.65 | Understand the process — slider |
| E8 | emo_support_network | 0.7 | Trusted guides — strong 100 / moderate 70 / minimal 40 / none 15 |
| E9 | emo_lifestyle_ready | 0.8 | Lifestyle readiness — slider |
| E10 | emo_regret_tolerance | 0.75 | Market drops 10% year 1 — fine 100 / slightly_anxious 75 / worried 40 / devastated 10 |
| E11 | emo_compromise | 0.65 | Willingness to compromise — slider |
| E12 | emo_rational_balance | 0.7 | Emotional vs rational — balanced 100 / mostly_rational 80 / very_rational 75 / slightly_emotional 70 / very_emotional 35 |
| E13 | emo_sleep_test | 0.75 | Keeps you up at night — never 100 / rarely 75 / sometimes 40 / often 10 |
| E14 | emo_excitement | 0.6 | Excitement vs obligation — slider |
| E15 | emo_past_decisions | 0.6 | Feel after major decisions — confident 100 / mostly_good 75 / anxious 40 / avoidant 15 |

### TIMING (15)
| # | id | weight | question / scoring |
|---|---|---|---|
| T1 | tim_timeline | 0.9 | Months to purchase — 0_3: 90 / 3_6: 100 / 6_12: 80 / 12_24: 50 / 24_plus: 30 |
| T2 | tim_market_perception | 0.8 | Market perception — buyers 100 / balanced 85 / competitive 55 / unsure 40 / very_hot 30 |
| T3 | tim_interest_rates | 0.85 | Rate environment — favorable 100 / acceptable 80 / high_but_ok 60 / waiting 35 / prohibitive 20 |
| T4 | tim_life_stage | 0.9 | Life settled — very 100 / mostly 75 / transitioning 35 / very_uncertain 10 |
| T5 | tim_career | 0.85 | 3–5yr location — rooted 100 / remote_flexible 85 / likely_stay 80 / might_relocate 40 / likely_move 15 |
| T6 | tim_rent_vs_buy | 0.75 | Rent vs mortgage — lower 100 / same 85 / not_renting 70 / slightly_more 60 / much_more 30 |
| T7 | tim_lease | 0.7 | Lease expiry — ending_soon 100 / month_to_month 90 / no_lease 80 / mid_term 70 / long_term 40 |
| T8 | tim_family_planning | 0.7 | Family timing — perfect 100 / good 85 / growing 75 / not_factor 70 / uncertain 40 |
| T9 | tim_seasonal | 0.5 | Seasonality — optimal 100 / aware 75 / not_relevant 70 / not_considered 40 |
| T10 | tim_urgency | 0.7 | Urgency slider — THRESHOLD: ≤2→40, ≤4→60, ≤6→85, ≤8→100, ≤10→70 (sweet spot 7–8) |
| T11 | tim_economic_outlook | 0.65 | Outlook — optimistic 100 / cautious 75 / uncertain 45 / pessimistic 25 |
| T12 | tim_area_development | 0.65 | Area growth — strong 95 / steady 80 / unknown 35 / declining 30 |
| T13 | tim_competing_goals | 0.75 | Competing goals — none 100 / minor 80 / moderate 50 / major 25 |
| T14 | tim_readiness_window | 0.9 | Act on perfect home today — immediately 100 / within_weeks 80 / within_months 45 / not_yet 15 |
| T15 | tim_waiting_cost | 0.6 | Waiting-cost awareness — calculated 100 / aware 70 / waiting_is_better 50 / not_considered 35 |

## 6. RELATED MODULES (inventory — fetch when building)
`lib/questions/flow.ts` (sequencing) · `lib/questions/to-inputs.ts` (bank → AssessmentInputs mapping) · `lib/scoring/insights.ts` · `lib/scoring/shadow.ts` · `lib/conflict/engine.ts` (referral/deadline bias surfacing) · `lib/readiness/*` (22 modules: coach, path, funding, partner, habit, scenario, export, legal…) · `lib/credit/` · `lib/decisions/` · `lib/genome/` · `lib/trinity/` · `lib/twin/`
