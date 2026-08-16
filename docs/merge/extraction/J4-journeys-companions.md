# J4 — Journeys & Companions Extraction

**Scope:** 5 HTML artifacts read in full. Existing build baseline: Readiness score view (35/35/30 engine + compass + manual inputs), budget dashboard, transactions, investments, goals & analytics.

**Tag legend:** `BUILD-READY` = spec is complete enough to implement directly · `NEEDS-DESIGN` = strong concept, needs product/design work before build · `DUPLICATE` = already exists in our current build

---

## 1. Onboarding Flow (`homi_onboarding.html`, 993 lines)

### Structure: 7-step wizard
| Step | Content | Data collected |
|---|---|---|
| 1. Welcome | Emoji header + philosophy quote: *"Most people don't regret what they bought. They regret **when** they bought it."* | — |
| 2. Decision Type | 2×2 option cards: 🏠 Buying a Home / 🚗 Major Purchase / 💼 Career Change / 💍 Life Transition | `decision` enum (home/car/career/life) |
| 3. Three Dimensions | Educational cards: 💎 Financial Reality (cyan), 💚 Emotional Truth (emerald), ⚡ Perfect Timing (yellow), each with left color border + ghost number | — |
| 4. Threshold Compass | Animated SVG: 3 counter-rotating concentric rings (outer cyan=financial, middle emerald=emotional, inner yellow=timing) + center **keyhole**; copy: "When all three dimensions align at 70%+ the compass becomes a key" | — |
| 5. Expectations | 4 stat cards: **5 min** to complete, **3** dimensions, **73% receive "Not Yet"**, **100%** honest answers + highlighted "About Not Yet" box ("This isn't failure — it's protection… We profit when you're genuinely ready, not when you transact") | — |
| 6. Quick Profile | First name, email (regex-validated), consent checkbox ("decision support, not financial advice" + ToS/Privacy) | `name`, `email`, `consent` |
| 7. Ready | Animated checkmark circle, personalized greeting, summary card (decision / dimensions / time / email), yellow "Start My Assessment" CTA + "I'll do this later" skip link | — |

### UX patterns worth reusing
- Fixed 4px gradient progress bar (cyan→emerald) + "Step X of 7" indicator — **BUILD-READY**
- Option cards with ✓ badge on select; Next disabled until required input valid — **BUILD-READY**
- Per-step fade-in animation; Back (ghost) / Next (gradient, 2:1 flex) button pair — **BUILD-READY**
- Email regex validation + consent gate before enabling Continue — **BUILD-READY**
- "Not Yet" expectation-setting screen (73% stat, honesty framing) — **BUILD-READY** (copy is written)
- Compass-becomes-key educational reveal — **DUPLICATE** (compass exists; keyhole/key transformation animation is a NEEDS-DESIGN upgrade)
- Decision-type routing (home/car/career/life) to tailored assessments — **NEEDS-DESIGN** (we only have home readiness today; other 3 decision types are unbuilt verticals)

---

## 2. Results Dashboard (`homi_results_dashboard.html`, 989 lines)

Demo state: verdict **NOT YET READY**, overall **67** (Financial 72 / Emotional 58 / Timing 81).

### Presentation layers (top → bottom)
1. **Header actions** — Export PDF (window.print), Share Results, Talk to Advisor — **BUILD-READY**
2. **Verdict badge** — giant pill, pulsing glow animation, yellow "⏳ NOT YET READY" / emerald "READY" variant + date stamp + 1-line verdict message naming the blocking dimension + reassurance sub ("73% of users receive Not Yet — protection, not rejection") — **BUILD-READY** (our Readiness view lacks the verdict-badge + named-blocker treatment)
3. **Compass as 3 progress rings** — concentric stroke-dasharray rings per dimension with overall score (67) in the center — **NEEDS-DESIGN** (evolution of our compass: rings become data, not decoration)
4. **Dimension cards with sub-metric breakdowns** — each dimension card has icon, score/100, status pill (✓ Passing threshold / ⚠ Needs attention), progress bar, and **4 sub-metrics with color-coded values (good/warning/concern)**:
   - Financial Reality: Cash Flow Health, Emergency Buffer (4.2 mo), Debt-to-Income (32%), Income Stability
   - Emotional Truth: Values Alignment, Decision Pressure, Support Network, Stress Level
   - Perfect Timing: Life Stage Fit, Market Conditions, Opportunity Cost, Future Obligations
   — **BUILD-READY** (sub-metric drill-down is the biggest gap vs our Readiness view)
5. **"Your Path to Readiness" action plan** — checkbox list with completion counter ("0 of 5"), priority left-borders (high=red/medium=yellow/low=emerald), dimension tag + time estimate per action ("15 min", "7 days"), header states the goal ("67 → 70+ unlocks READY"). Sample actions: Clarify Your "Why", Identify External Pressure, Have the Conversation, Stress Test Your DTI, Wait 7 Days & Re-assess — **BUILD-READY** (ties into our goals module)
6. **Key Insights** — 3 card types: 🎯 Your Strength, ⚠️ Your Blocker (with stat: "decisions under pressure have 2.3x higher regret rates"), 💡 Hidden Pattern ("Money isn't the issue — uncertainty is") — **BUILD-READY** (rule-based: min dimension = blocker, max = strength, cross-dimension tension = hidden pattern)
7. **"How You Compare" percentile bar** — user marker vs "Ready Threshold" marker at 70% vs all-users fill; "67th percentile" label — **NEEDS-DESIGN** (requires cohort data we don't have yet)
8. **CTA section** — "Talk to AI Advisor →" primary + "Retake Assessment" secondary — **BUILD-READY** (links to companion/advisor feature below)

---

## 3. Companion Selection (`homi-companion-selection.html`, 850 lines) — **MAJOR NEW FEATURE**

### Selection UX
- Header: "Choose Your Homi Companion — Every journey needs a guide." Subtitle: *"Don't worry—you can change this anytime in Settings"* (de-risks the choice)
- **4 filter tabs**: All (20) / Wise & Strategic / Energetic & Quick / Protective & Loyal / Transformative
- Card grid: SVG mascot icon (float animation) in dark tile w/ radial-glow hover, name, trait (italic), 1-line description, 2 personality tags
- Selected state: 3px **yellow** border + "✓ SELECTED" badge + yellow glow
- Fixed bottom CTA fades in after selection: "Continue with {companion name} →"; confirm logs `{id, name, trait}` to save to profile — **BUILD-READY** end-to-end

### All 20 companions
| # | Name | Trait | Category | Tags | Icon color |
|---|---|---|---|---|---|
| 1 | Wise Owl | Knowledge Keeper | wise | Analytical, Patient | emerald |
| 2 | Friendly Fox | Clever Companion | energetic | Clever, Adaptable | yellow |
| 3 | Guide Dog | Loyal Helper | protective | Loyal, Dependable | emerald |
| 4 | Smart Dolphin | Intelligent Friend | wise | Intuitive, Balanced | cyan |
| 5 | Compass Bird | Direction Finder | wise | Focused, Direct | cyan |
| 6 | Bear Guide | Strong Protector | protective | Strong, Protective | brown #8b7355 |
| 7 | Cat Companion | Independent Guide | wise | Independent, Selective | slate #94a3b8 |
| 8 | Rabbit Friend | Quick Helper | energetic | Quick, Responsive | light #e2e8f0 |
| 9 | Penguin Guide | Steady Companion | protective | Steady, Community | navy + white + amber beak |
| 10 | Squirrel Helper | Resourceful Friend | energetic | Prepared, Detail-oriented | orange #d97706 |
| 11 | Hummingbird | Quick Helper | energetic | Agile, Energetic | cyan/emerald/yellow |
| 12 | Turtle Mentor | Steady Wins | wise | Patient, Methodical | emerald + cyan shell |
| 13 | Firefly Light | Glowing Guide | wise | Illuminating, Hopeful | navy body + pulsing yellow glow |
| 14 | Butterfly | Transform | transformative | Transformative, Growth | purple #a78bfa + cyan wings |
| 15 | Eagle Vision | Big Picture | wise | Strategic, Visionary | brown |
| 16 | Elephant | Never Forgets | wise | Memory, Long-term | slate |
| 17 | Bee Helper | Together | energetic | Collaborative, Hardworking | yellow + navy stripes |
| 18 | Deer Grace | Gentle Alert | wise | Mindful, Graceful | purple #a78bfa |
| 19 | Dolphin Flow | Intelligent | wise | EQ, Flowing | cyan (near-duplicate of #4) |
| 20 | Dragonfly | Swift Precise | energetic | Decisive, Precise | emerald + cyan wings |

**Notes:** "Transformative" category has only 1 member (Butterfly); Smart Dolphin vs Dolphin Flow are redundant — trim to ~16 or add variety. Icons are simple geometric SVGs (easy to rebuild or commission better art) — icons **NEEDS-DESIGN**, selection mechanics **BUILD-READY**.

### Companion personas elsewhere in the corpus
Readiness Suite v3 (§4) contains a **second, contradictory persona system**: the **Trinity Engine™** — three AI debaters:
- ⚡ **SPARK — The Advocate** (yellow): argues the optimistic case
- 🛡️ **SAGE — The Skeptic** (red): argues the risk case
- ⚖️ **ATLAS — The Arbiter** (cyan): synthesizes the verdict

These are functional analyst personas (not user-picked mascots) with fully-written score-conditional dialogue — **BUILD-READY** as a results-section feature. Product decision needed: mascot-companions (selection screen) vs Trinity personas (analysis voices) — possibly merge (chosen companion speaks the trinity lines) — **NEEDS-DESIGN** for the merge, but either system alone is buildable.

---

## 4. Readiness Suite v3 (`HOME Readiness_Suite_v3.html`, 3,629 lines)

### Modules (4 nav tabs)
1. **🏠 Affordability** — full readiness analysis (flagship)
2. **💰 Mortgage** — PITI payment calculator
3. **📊 DTI** — debt-to-income analyzer
4. **⚖️ Rent vs Buy** — wealth-trajectory comparison

### Assessment flow & inputs (Affordability)
Grouped form sections: Income & Employment (gross, take-home, income type W-2/self/variable/retired, secondary income) → Existing Debt (car/student/CC/other) → Savings & Assets (down payment, monthly savings rate, emergency fund, gift funds) → Credit & Location (credit-score band select with rate adjustments, state select that **auto-fills property-tax rate** for 8 states + OTHER, insurance rate) → **Emotional Readiness sliders (1–10)**: Job Stability Confidence, Life Stability, Years Planning to Stay (1–30), Maintenance Comfort. Validation w/ inline errors, aria labels, skip-link — **BUILD-READY** (richer than our current manual inputs; income-type haircut self=0.85/variable=0.90, secondary income ×0.5)

### Scoring (matches our 35/35/30 engine exactly)
- Financial (35%): down payment 30pts / DTI 30pts / reserves 20pts / credit 20pts
- Emotional (35%): stability×4 + life×3 + maintenance×3
- Timing (30%): horizon 40pts + **Monte Carlo success rate** 40pts + rate environment 20pts
- **4-tier verdict** (we have effectively 2): ≥80 "YOU'RE READY" 🔑 / 65–79 "ALMOST THERE" 🔓 / 50–64 "BUILD FIRST" 🔒 / <50 "NOT YET" 🔒, each with written verdict copy — **BUILD-READY**

### Signature presentation components (beyond our engine)
- **The Signal** — "Your Safe Zone" price range (e.g. $X–$Y), tagline "protects your wellbeing — not just your approval odds"; derived from 25% (safe) vs 32% (max) of take-home — **BUILD-READY**
- **Payment Safety Bar** — gradient bar green≤25% / yellow 25–32% / red >32% of take-home with user marker + generated message — **BUILD-READY**
- **PITI breakdown stacked bar** w/ legend (P&I, tax, insurance, PMI, HOA) — **BUILD-READY**
- **Quantum Timeline States** — 6 probability-weighted parallel-reality cards: NOW (42%), WAIT 3 MO (28%), WAIT 6 MO (18%), MARKET CRASH (6%), WINDFALL (4%), JOB LOSS (2%), each showing projected score — **BUILD-READY** (probabilities currently hardcoded → NEEDS-DESIGN for real model)
- **Monte Carlo — 10,000 scenarios** — real engine in-file (Box-Muller normal, 7% return, 12% vol), fan chart p5/median/p95 + success-rate stat — **BUILD-READY** (code is directly portable)
- **Stress Test cards** — Rate +2% before lock, Income drops 20% (new DTI), $15K emergency (remaining reserves), Job Loss Runway (months before default); PASS/WARNING/FAIL badges — **BUILD-READY**
- **Trinity Engine™ Debate** — 3 persona cards (SPARK/SAGE/ATLAS, see §3) with 3 full dialogue sets keyed to score band — **BUILD-READY** (copy written)
- **Temporal Twin™** — "Message from Future You — 5 years from today", italic letter with emoji + signature, 3 score-conditional variants fully written — **BUILD-READY**
- **Action Plan** — dynamically generated w/ computed gaps (e.g. "$ to 20% down, N months at current savings rate"), priority + "💡 impact" line — **BUILD-READY** (partially DUPLICATE of results-dashboard action plan)
- **DTI spectrum bar** — marker on 28/36/43/50% gradient + **qualification probability by loan program** (Conventional/FHA/VA/Jumbo, with DTI limits table) — **BUILD-READY**
- **Rent vs Buy**: dual wealth trajectories (home equity vs invest-the-difference), break-even year, 3-way verdict (BUYING WINS / RENTING WINS / CLOSE CALL) + **Parallel Futures Temporal Twins** ("You Who Bought" 🏠 vs "You Who Rented" 🏢, both letters written, outcome-conditional) — **BUILD-READY**
- **Mortgage extras**: term comparison cards 15/20/30yr with "BEST FIT" badge (recommended from payment-to-income), rate sensitivity cards (−1/now/+1/+2%), full amortization table, "Freedom Date" payoff label — **BUILD-READY**
- **Scenario persistence** — save/load named scenarios to localStorage, scenario bar, PDF/print export w/ print stylesheet, "Clear Data" privacy footer ("your data stays on YOUR device") — **BUILD-READY** (map to Supabase rows instead of localStorage)
- Loading overlay: spinning 3-ring compass + % progress — **DUPLICATE-ish**, nice polish NEEDS-DESIGN

---

## 5. "World's First…" Landing Page (`The world's first….html`, 2,023 lines)

Positioning: "Decision Readiness Intelligence™" tagline; "We don't just calculate if you can afford something — we help you understand if you should."

### Structure: tool-category hub (9 category cards w/ tool counts)
- Essential: 💳 Debt Freedom (4), 📊 Smart Budgeting (5), 💑 Couple Finance (6), 🏖️ Retirement Planning (5), 📈 Investment Intelligence (4), 🏡 Big Purchases (3)
- **HōMI Innovations (yellow-bordered "NEW")**: 🧠 Emotional Readiness, ⏰ Perfect Timing, 🔮 Regret Prevention

### Components worth reusing
- Category-card hub with tool counts + "NEW" badges — **DUPLICATE** of app-nav patterns, but the hub layout itself is **BUILD-READY** for a tools index page
- Debt Payoff Accelerator: Avalanche/Snowball/Compare/Custom tabs, dynamic debt rows, extra-payment slider, debt-free timeline w/ milestones, "HōMI's Verdict" comparing strategies ("Avalanche saves $240… but if you need quick wins, Snowball is worth the extra cost") — **BUILD-READY** (we have no debt tools)
- Zero-Based Budget Builder ("ranges, not exact numbers — prevents the spending-ceiling trap") + 50/30/20 analyzer + overspend/savings alerts — **DUPLICATE** of our budget dashboard (skip)
- Retirement Readiness Calculator: 4%-rule needed vs projected, gap + "+$X/mo to close gap", readiness circle + "NOT YET — you're 87% of the way there" verdict — **NEEDS-DESIGN** (new vertical; simple math, buildable)
- Home Affordability Reality Check (older, simpler version of Suite v3) — **DUPLICATE** (v3 supersedes)
- **Emotional Truth Analyzer** — confidence tracking over time ("researched this house 47 times in 3 weeks; confidence dropped 78→62; mentioned 'everyone's buying' twice — this looks like FOMO, not desire"), social-pressure detection, authenticity score, regret probability — **NEEDS-DESIGN** (behavioral tracking infra we lack; but a self-report check-in version is BUILD-READY)
- **Decision Timeline Optimizer** — timeline items with projected readiness at today/3mo/6mo + verdict "WAIT UNTIL JUNE 2026" — **BUILD-READY** (projections can derive from savings-rate math like Suite v3 quantum states)
- **Regret Probability Predictor** — 1yr (12%)/5yr (34%)/10yr (58%) regret-risk cards + evidence alert ("users at your 38% DTI report 58% regret at 10 years") sourced from an "Outcome Verification Network" — **NEEDS-DESIGN** (requires outcome dataset; static actuarial table version possible)
- **Temporal Twin Messaging / Financial Freedom Date / Outcome Verification Network / Couple Finance suite** — cards only, no implementation — **NEEDS-DESIGN**
- Reusable UI atoms: score circle with gradient mask ring, verdict banners, alert boxes (info/success/warning/error), timeline component, tooltip icons, range sliders w/ live values — **BUILD-READY**

---

## Consolidated Build-Add Candidates (ranked)

1. **Companion selection feature** (20 personas, 4 categories, filter+select+CTA UX) — BUILD-READY shell; persona voice/behavior NEEDS-DESIGN. Decide mascot-vs-Trinity merge.
2. **Trinity Engine™ debate** (SPARK/SAGE/ATLAS score-conditional dialogue on results) — BUILD-READY, copy written.
3. **Temporal Twin™ "Message from Future You"** + Rent-vs-Buy Parallel Futures twins — BUILD-READY, copy written.
4. **Results-dashboard upgrades**: verdict badge w/ named blocker, dimension sub-metric breakdowns (good/warning/concern), action plan w/ priorities+time estimates+completion counter, Key Insights (strength/blocker/hidden pattern), percentile bar — mostly BUILD-READY.
5. **Onboarding wizard** (7 steps, decision-type cards, expectations/"Not Yet" framing, profile+consent, progress bar) — BUILD-READY.
6. **The Signal (Safe Zone price range) + Payment Safety Bar** — BUILD-READY, simple derivations from take-home.
7. **Monte Carlo engine (10k sims, p5/p50/p95 fan chart)** — BUILD-READY, portable JS; also feeds Timing score.
8. **Stress-test cards + Quantum Timeline States** — BUILD-READY shell; probabilities NEEDS-DESIGN later.
9. **4-tier verdict system** (READY/ALMOST THERE/BUILD FIRST/NOT YET) replacing binary — BUILD-READY.
10. **Rent vs Buy module** (wealth trajectories, break-even, 3-way verdict) — BUILD-READY.
11. **Mortgage module** (PITI breakdown, term comparison w/ BEST FIT, rate sensitivity, amortization, Freedom Date) — BUILD-READY.
12. **DTI module w/ loan-program qualification probabilities** — BUILD-READY.
13. **Debt Payoff Accelerator** (avalanche/snowball/compare, milestone timeline) — BUILD-READY.
14. **Scenario save/load + PDF export + local-data privacy stance** — BUILD-READY (Supabase-backed).
15. **Emotional Truth behavioral tracking / Regret Predictor w/ Outcome Verification Network / Couple Finance / Retirement module** — NEEDS-DESIGN (require data or new verticals).
