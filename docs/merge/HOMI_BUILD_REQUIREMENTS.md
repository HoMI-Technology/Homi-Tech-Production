# HōMI — BUILD REQUIREMENTS (CANON RESOLVED)
**GitHub `HoMI-Technology/Homi-Tech-Production` = SOURCE OF TRUTH (ruled by owner 2026-08-04)**
Audited: 40 files total (31 + 9). Digests: `/mnt/agents/output/extraction/`

---

## 🔒 SECTION 1 — CANON: RESOLVED VIA GITHUB

All conflicts are now settled. Anything contradicting this table is **wrong** (stale docs, AI-generated research, superseded skills):

| # | Topic | ✅ CANON (GitHub) | ❌ Rejected variants |
|---|---|---|---|
| 1 | **Pillar weights** | **35 / 35 / 30** (Financial/Emotional/Timing) — `lib/scoring/weights.ts`, `Object.freeze`, C2 trade-secret boundary | 40/30/30, 50/30/20 |
| 2 | **Verdict bands** | **≥80 READY · 65–79 ALMOST_THERE · 50–64 BUILD_FIRST · <50 NOT_YET** — `lib/scoring/engine.ts` `scoreToVerdict()` is the SSOT; code comment: "Multiple inline copies have drifted (80/60/40 vs 80/65/50)… this is the single source of truth" | 85/70/55, 80/70/60, 80/60, AND-gate ≥70 (none exist in canon). NOTE: the landing-page 65–79 flagged as a "bug" by the research PDF is actually CORRECT — the PDF was wrong |
| 3 | **Hard-stops** (NOT an AND-gate) | Verdict forced to **NOT_YET** when any: DTI > 50% · housing payment > 45% of gross income · emergency runway < 1 mo · credit < 620 — protective, never shaming; score still shown honestly | ring-level ≥70 gate |
| 4 | **Brand tokens** | cyan `#22d3ee` · emerald `#34d399` · yellow `#facc15` · amber `#fab633` · crimson `#f24822` · navy `#0a1628` · navyLight `#0f172a` · slate `#1e293b` — `lib/brand/index.ts`: "immutable, never approximate" | `#06b6d4`/`#10b981`/`#fcd34d`/`#0a0f1c` (spec+build docs — wrong) |
| 5 | **Theme** | Dark navy only, no light mode (SKILL.md non-negotiable + all production HTML) | RTF cream/terracotta "Weekly Mirror" concept — art project, not canon |
| 6 | **Savings-rate tiers** | Timing points: ≥20%→10 / ≥10%→7 / ≥5%→4 / <5%→1 (engine.ts); dashboard temperatures ≥20/10/0 (store.ts) | ≥15/10/5 (finance skills — stale) |
| 7 | **PMI** | LTV-banded: 0% ≥20% down · 0.75%/yr 10–<20% · 1.0%/yr <10% · FHA MIP 1.75% upfront + 0.85%/yr (calculator canon) | EXPERT skill flat 0.5% |
| 8 | **Assessment scales** | Sliders **1–10** (question bank + engine `sliderToPoints`); numeric inputs direct; choice maps explicit | 1–5 scale (design skill — stale) |
| 9 | **Assessment instrument** | **45 questions — 15 per dimension** (`lib/questions/bank.ts`, mirrored in `supabase/migrations/00006_seed_question_bank.sql`), tagged `home_buying` | "12 questions" (spec docs — wrong) |
| 10 | **Pricing/market figures** | Unverified — research PDFs are AI-generated with garbled citations. TAM, regret %, funnel targets all conflict; verify before external use | all conflicting variants pending real research |

---

## 🧮 SECTION 2 — THE CANONICAL SCORING ENGINE (`lib/scoring/engine.ts`, extracted verbatim)

Pure, deterministic, 0–100. Score = Financial + Emotional + Timing (each pre-scaled to its max).

**Financial Reality (max 35):**
| Factor | Max | Bands |
|---|---|---|
| DTI | 10 | ≤28%→10 · ≤36%→7 · ≤43%→4 · >43%→0 |
| Down payment | 10 | ≥20%→10 · ≥10%→7 · ≥5%→4 · <5%→0 |
| Emergency fund | 8 | ≥6mo→8 · ≥3→5 · ≥1→2 · <1→0 |
| Credit | 7 | ≥740→7 · ≥700→5 · ≥660→3 · <660→0 |

**Emotional Truth (max 35):** lifeStability 9 + confidence 9 + partnerAlignment 9 + FOMO (inverted) 8. Slider→points: `floor((s−1)/9 × max)`, slider 10 = max exactly. **Single-buyer rule:** partnerAlignment=null → 9 points redistributed proportionally by earned ratio across the other three (even 3/3/3 split if all zero; remainder to largest fractional).

**Perfect Timing (max 30):**
| Factor | Max | Bands |
|---|---|---|
| Time horizon | 10 | >12mo→10 · ≥6→7 · ≥3→4 · <3→2 |
| Savings rate | 10 | ≥20%→10 · ≥10%→7 · ≥5%→4 · <5%→1 |
| Down-payment progress | 10 | ≥80%→10 · ≥50%→7 · ≥25%→4 · <25%→1 |

**Warnings (non-scoring):** all-emotional-maxed → honesty recheck; FOMO ≥8 + horizon <3mo → PRESSURE_RUSH. Hard-stop copy verbatim in `/mnt/agents/output/extraction/G-github-canon.md` appendix of this doc (below, §5).

---

## 📋 SECTION 3 — THE 45-QUESTION BANK (`lib/questions/bank.ts`, extracted in full)

15 per dimension, mix of `slider` (1–10), `single_choice` (option_map scores 0–100), `number` (linear/inverse scale), one `threshold` type. Per-question weights 0.5–1.0. Full verbatim bank with every option label + score map saved to **`/mnt/agents/output/extraction/I-github-canon.md`** — highlights:

- **Financial:** income (linear, optimal ≥$6K/mo), income stability (100/75/40/15), savings (optimal ≥$40K), down payment (100/85/70/50/35/15), EF post-close (100/75/50/25/5), debt payments (inverse, ≤$500 optimal), DTI (100/85/65/40/15, unknown=30), credit (100/80/55/30/10, unknown=25), pre-approval, housing budget % (100/85/65/40/15), extra income (w 0.6), closing costs, maintenance buffer, employment type (W-2 2yr=100 … between jobs=5), mortgage literacy slider (w 0.5)
- **Emotional:** confidence / clarity / stress-calm / commitment / partner alignment (solo=75) / FOMO-vs-genuine (genuine=100…fomo=10) / preparedness / support network / lifestyle readiness / regret tolerance (−10% market drop test) / compromise / rational balance (balanced=100, very_rational=75, very_emotional=35) / sleep test / excitement / past decisions
- **Timing:** timeline (3–6mo optimal=100; 0–3mo=90), market perception, rates, life-stage stability, career rootedness, rent-vs-buy economics, lease expiry, family planning, seasonality (w 0.5), urgency (**threshold: 7–8/10 = 100, extremes penalized**), economic outlook, area development, competing goals, readiness window ("could you act today?"), waiting-cost awareness

Note: the question bank produces per-dimension 0–100 weighted scores; `engine.ts` consumes a derived 13-field `AssessmentInputs` — the mapping layer is `lib/questions/to-inputs.ts` + `lib/questions/flow.ts` (also saved in the canon digest).

---

## 🧱 SECTION 4 — BUILD INVENTORY (post-resolution)

**Ready to port verbatim from GitHub:** scoring engine + weights + hard-stops · 45-question bank + SQL seed · brand tokens + verdict meta · finance store (already in our budget build) · 14 calculator contracts
**Ready from extraction corpus:** mortgage/tax constant library · Monte Carlo spec · retirement engine constants
**Still missing everywhere (greenfield):** backend auth/payments/sync · Day 30/90/365 outcome surveys (ship at launch — can't backfill) · B2B API · 90-day plan generator logic · companion naming reconciliation (Homie vs Steady/Clarity/Horizon vs Spark/Sage/Atlas)
**Strategic rules:** never affiliate revenue · dark navy only · verdict copy protective-not-shaming · 35/35/30 forever

---

## §5 Appendix — Hard-stop protective copy (verbatim, engine.ts)
- DTI_OVER_50: "Your debt-to-income ratio is above 50%. Buying right now would leave almost no margin for surprises."
- HOUSING_RATIO_OVER_45: "The home you are considering would consume more than 45% of your monthly income. That is the line where one bad month becomes a crisis."
- RUNWAY_UNDER_1_MONTH: "You have less than one month of expenses set aside. Owning a home means owning the surprises that come with it — you need runway first."
- CREDIT_UNDER_620: "Your credit score is below 620. Lenders will price this as high-risk, and the interest cost alone could undo the purchase. Build credit first; you protect yourself by waiting."
