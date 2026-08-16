# Extraction B — HōMI Strategic / Business-Intelligence Artifacts

**Sources (4 files, all read in full):**
- `homi_strategic_dashboard.html` (31KB, 518 lines) — single-page "Strategic Intelligence" tabbed dashboard. Analysis date 2025-12-16, HōMI Technology LLC.
- `homi_strategic_intelligence_v2.html` (113KB, 2068 lines) — "Strategic Intelligence Operating System v2.0", December 2025, Confidential. 10 sections.
- `homi_strategic_data.json` (7.6KB, 199 lines) — v2.0 machine-readable data, generated 2025-12-17, classification Confidential.
- `HOMI_STRATEGIC_SUMMARY.md` (179 lines) — Quick Reference Document v2.0, December 2025.

---

## 1. Strategic Data — `homi_strategic_data.json` (QUOTED IN FULL)

```json
{
  "metadata": {
    "document": "HōMI Strategic Intelligence Operating System",
    "version": "2.0",
    "generated": "2025-12-17",
    "classification": "Confidential"
  },
  "opportunity": {
    "score": 9,
    "type": "Market Gap",
    "window": "Just Right",
    "byline": "A timely B2B platform poised to redefine mortgage risk assessment and buyer qualification"
  },
  "dimensions": {
    "market_potential": {
      "score": 9,
      "tam_2024": "$3B",
      "tam_2033": "$8.3B",
      "cagr": "16.5%"
    },
    "market_timing": {
      "score": 9,
      "drivers": ["Decision intelligence demand growth", "FICO criticism mainstream", "Regulatory transparency trends"]
    },
    "competitive_advantage": {
      "score": 8,
      "moat_sources": ["Zero conflict of interest", "Three-dimensional integration", "NOT YET as value", "Trust architecture"]
    },
    "execution_feasibility": {
      "score": 6,
      "challenges": ["Data integration complexity", "Regulatory compliance", "Solo founder bandwidth"]
    }
  },
  "thesis": {
    "insight": "Most people don't regret what they bought. They regret when they bought it.",
    "positioning": "Every financial system optimizes outcomes after decisions. None optimize the moment before.",
    "statement": "The most valuable financial technology of the next decade won't help you manage money. It will help you understand when you're ready to make decisions about money."
  },
  "scoring_framework": {
    "dimensions": {
      "financial_reality": {
        "weight": 0.35,
        "threshold": 70,
        "inputs": ["Cash flow", "Affordability ratios", "Emergency buffer", "Income stability", "Asset-liability trajectory"]
      },
      "emotional_truth": {
        "weight": 0.35,
        "threshold": 70,
        "inputs": ["Values alignment", "Stress capacity", "Relationship readiness", "Psychological preparedness", "Fear vs desire calibration"]
      },
      "perfect_timing": {
        "weight": 0.30,
        "threshold": 70,
        "inputs": ["Life stage appropriateness", "Opportunity cost", "Market context", "Personal circumstances", "Future obligations"]
      }
    },
    "verdict_logic": {
      "ready": "All three dimensions >= 70",
      "not_yet": "Any dimension < 70"
    }
  },
  "business_model": {
    "not_yet_economics": {
      "ready_rate": 0.27,
      "not_yet_rate": 0.73,
      "ready_revenue": "$50-200 referral fee",
      "not_yet_revenue": "$180-540 LTV (3-10x higher)",
      "key_insight": "73% 'failure rate' becomes highest-value segment"
    },
    "pricing_tiers": {
      "free": {"price": 0, "features": "Basic assessment + recommendations"},
      "basic": {"price": 9.99, "billing": "monthly", "features": "Score tracking, dashboard, content"},
      "pro": {"price": 29.99, "billing": "monthly", "features": "Personalized roadmap, AI coaching, Plaid"},
      "premium": {"price": 99.99, "billing": "monthly", "features": "Human coaching, couples mode"},
      "b2b": {"price": "500-2000", "billing": "monthly", "features": "White-label, API access, analytics"}
    }
  },
  "unit_economics": {
    "b2c": {
      "cac": "$30-50",
      "arpu_monthly": "$22",
      "avg_lifespan_months": 8,
      "ltv": "$176",
      "ltv_cac_ratio": "3.5-5.9x",
      "payback_days": "45-60"
    },
    "b2b": {
      "cac": "$2000-5000",
      "acv": "$12000",
      "avg_lifespan_years": 3,
      "ltv": "$36000+",
      "ltv_cac_ratio": "7-18x",
      "payback_months": "2-5"
    }
  },
  "competitive_landscape": {
    "direct_competitors": [],
    "indirect_competitors": [
      {"name": "FICO", "threat": "medium", "why_cant_win": "Backward-looking, bureau customers are banks"},
      {"name": "Plaid", "threat": "high", "why_cant_win": "Infrastructure layer, no emotional dimension, likely partner"},
      {"name": "Rocket Mortgage", "threat": "medium", "why_cant_win": "Transaction-dependent, conflict of interest"},
      {"name": "NerdWallet", "threat": "low", "why_cant_win": "Affiliate model incentivizes clicks not honesty"},
      {"name": "Credit Karma", "threat": "medium", "why_cant_win": "Lead gen model, FICO-centric"}
    ],
    "moats": [
      "Zero conflict of interest structure",
      "Three-dimensional integration (financial + emotional + timing)",
      "NOT YET as premium segment (philosophical inversion)",
      "Trust architecture (saying 'wait' builds trust)"
    ]
  },
  "community_targets": {
    "tier_1": [
      {"segment": "Community Banks & CDFIs", "platform": "LinkedIn, Events", "revenue_path": "B2B SaaS"},
      {"segment": "Real Estate Tech", "platform": "LinkedIn, Reddit", "revenue_path": "B2B + Referrals"}
    ],
    "tier_2": [
      {"segment": "Financial Wellness", "platform": "Reddit, Facebook", "revenue_path": "B2C Subscriptions"}
    ],
    "tier_3": [
      {"segment": "Sales/Marketing Ops", "platform": "LinkedIn", "revenue_path": "Enterprise White-Label"}
    ]
  },
  "go_to_market": {
    "phase_1": {
      "days": "1-30",
      "name": "Foundation",
      "milestones": ["MVP 100%", "50 user tests", "Legal setup", "Plaid integration"],
      "exit_criteria": "Working product + 50 assessments"
    },
    "phase_2": {
      "days": "31-60",
      "name": "Validation",
      "milestones": ["20 paid subscribers", "1 CDFI pilot", "NOT YET content", "Referral program"],
      "exit_criteria": "$1K MRR + 1 B2B pilot"
    },
    "phase_3": {
      "days": "61-90",
      "name": "Scale Prep",
      "milestones": ["100+ users", "3 CDFI conversations", "Investor materials", "Pre-seed outreach"],
      "exit_criteria": "Ready for pre-seed raise"
    }
  },
  "fundraising": {
    "target_raise": "$400K",
    "valuation": "$2.5M post-money",
    "use_of_funds": {
      "engineering": 0.60,
      "marketing_community": 0.25,
      "ops_legal": 0.15
    },
    "target_investors": ["Hustle Fund", "South Park Commons", "On Deck", "Contrary Capital"]
  },
  "risks": {
    "high_priority": [
      {"risk": "Solo founder burnout", "probability": "high", "impact": "critical", "mitigation": "Time-boxing, first hire priority, Claude leverage"},
      {"risk": "Slow CDFI adoption", "probability": "high", "impact": "medium", "mitigation": "Free pilots, parallel B2C revenue"},
      {"risk": "Regulatory shift", "probability": "medium", "impact": "high", "mitigation": "Educational positioning, legal counsel"}
    ],
    "medium_priority": [
      {"risk": "Plaid API changes", "probability": "medium", "impact": "medium", "mitigation": "Data layer abstraction, alternatives"},
      {"risk": "NOT YET conversion below target", "probability": "medium", "impact": "high", "mitigation": "Heavy user research, pricing tests"}
    ]
  },
  "success_metrics": {
    "north_star": "Users who achieve READY status",
    "phase_1_targets": {
      "assessments_completed": 50,
      "completion_rate": 0.60,
      "not_yet_rate": "0.70-0.75",
      "nps": 40
    },
    "phase_2_targets": {
      "paid_subscribers": 20,
      "not_yet_to_paid_conversion": 0.10,
      "b2b_pilots": 1,
      "mrr": 1000,
      "day_7_retention": 0.40
    },
    "investor_ready_targets": {
      "mrr": 5000,
      "active_users": 100,
      "transformations_complete": 5,
      "b2b_pipeline": 3
    }
  },
  "brand": {
    "name": "HōMI",
    "spelling": "H (capital) + ō (lowercase with macron U+014D) + M (capital) + I (capital)",
    "colors": {
      "cyan": "#22d3ee",
      "emerald": "#34d399",
      "yellow": "#facc15",
      "navy": "#0a1628"
    },
    "voice": "Precision Empathy × Calm Authority × Cinematic Clarity",
    "tagline": "A Decision Companion"
  }
}
```

### JSON Schema Summary
Top-level keys (12): `metadata`, `opportunity`, `dimensions` (4 scored dimensions), `thesis` (3 strings), `scoring_framework` (weights + thresholds + verdict logic), `business_model` (not_yet_economics + pricing_tiers), `unit_economics` (b2c/b2b), `competitive_landscape` (direct_competitors is EMPTY array; 5 indirect), `community_targets` (3 tiers), `go_to_market` (3 phases), `fundraising`, `risks` (high/medium priority), `success_metrics` (north_star + 3 target sets), `brand` (spelling/colors/voice/tagline). All scores are integers /10; weights sum to 1.0; rates as decimals.

---

## 2. Business Metrics & Models — Exact Numbers

### 2.1 Market Sizing
- **TAM:** $3B (2024) → **$8.3B (2033)** at **16.5% CAGR** (decision-intelligence market).
- **SAM:** **$1.2B** — "Home buying readiness segment specifically."
- **SOM (Year 3):** **$5M** — "Realistic capture with current resources."
- **Target ARR Year 1:** **$120K** ("$10K MRR by month 12" — note: the v2 HTML metric card says this, but the revenue projection table says $26,000 MRR at month 12; see inconsistency below).
- Consumer decision readiness described as a "$0 market today" / first-mover white space.

### 2.2 Opportunity Scorecard
| Dimension | Score | Key factor |
|---|---|---|
| Market Potential | 9/10 | $3B → $8.3B by 2033 (16.5% CAGR) |
| Market Timing | 9/10 | Decision intelligence demand + FICO criticism convergence + regulatory transparency |
| Competitive Advantage | 8/10 | Zero-conflict model structurally uncopiable |
| Execution Feasibility | 6/10 | Data integration, compliance, solo founder bandwidth |
| **Overall** | **9/10** | Type "Market Gap", Window "Just Right" |

### 2.3 NOT YET Economics (core model)
```
100 users assessed → 27 READY (27%) → $50–200 one-time referral fee (relationship ends)
                   → 73 NOT YET (73%) → $29.99/mo × 6–18 months → $180–540 LTV (3–10x READY path)
```
- "73% 'failure rate' becomes highest-value segment."
- Traditional lead-gen comparator: lead cost $50–150, conversion 2–5%, revenue/conversion $100–300, failed leads = 100% loss → **effective CAC $1,000–7,500**.
- HōMI model: user acquisition cost **$20–50**, READY rate 27%, revenue/READY user $50–200 referral, revenue/NOT-YET user $180–540 LTV, **blended CAC payback 45–90 days**.

### 2.4 Pricing Tiers
| Tier | Price | Features | Duration/segment |
|---|---|---|---|
| Free Assessment | $0 | 3-dim readiness score + basic recommendations | Lead gen, one-time |
| Basic | $9.99/mo | Score tracking, progress dashboard, educational content | Self-directed, 3–6 mo |
| Pro | $29.99/mo | Personalized roadmap, AI coaching, Plaid integration | Active transformers, 6–12 mo |
| Premium | $99.99/mo | Human coaching calls, couples mode, priority support | High-stakes decisions, 3–6 mo |
| READY Celebration | $149 one-time | Certified readiness report for lenders + partner introductions | Graduated users |
| B2B | $500–2,000/mo | White-label, API access, analytics | CDFIs/banks |

### 2.5 Unit Economics
**B2C:** CAC $30–50 · ARPU $22/mo · lifespan 8 months · **LTV $176** · LTV:CAC **3.5–5.9x** · payback **45–60 days**.
**B2B:** CAC $2,000–5,000 · ACV $12,000/yr · lifespan 3+ years · **LTV $36,000+** · LTV:CAC **7–18x** · payback **2–5 months**.

### 2.6 Revenue Projection (24 months, from v2 HTML)
| Month | B2C Subs | B2C MRR | B2B Clients | B2B MRR | Total MRR |
|---|---|---|---|---|---|
| 3 | 50 | $1,100 | 0 | $0 | $1,100 |
| 6 | 200 | $4,400 | 1 | $1,000 | $5,400 |
| 9 | 500 | $11,000 | 2 | $2,000 | $13,000 |
| 12 | 1,000 | $22,000 | 4 | $4,000 | **$26,000** |
| 18 | 3,000 | $66,000 | 10 | $10,000 | **$76,000** |
| 24 | 7,500 | $165,000 | 25 | $25,000 | **$190,000** |

**Stated assumptions:** 15% monthly B2C growth; 1 new B2B client/month initially, accelerating to 3/month by month 18; churn 5%/mo B2C, 2%/mo B2B. (Implies flat $22 ARPU B2C, $1,000 MRR per B2B client.)
**Internal inconsistency flagged:** metric card says "Target ARR (Y1) $120K / $10K MRR by month 12" but projection table shows $26,000 MRR (≈$312K ARR) at month 12.

### 2.7 Sensitivity Analysis — NOT YET → Paid Conversion (at 1,000 assessments/mo)
| Conversion | Year-1 Revenue | LTV/user | Verdict |
|---|---|---|---|
| 5% (Pessimistic) | $86,000 | $7.17 | Challenged |
| 10% (Conservative) | $172,000 | $14.33 | Viable |
| 15% (Target) | $258,000 | $21.50 | Strong |
| 20% (Optimistic) | $344,000 | $28.67 | Excellent |
| 25% (Best Case) | $430,000 | $35.83 | Exceptional |
"Business is viable at 10% NOT YET conversion, strong at 15%, exceptional at 20%+." (Note: revenue scales linearly — $17.2K per conversion point per 1,000 assessments/mo; LTV/user = $1.4333 per point.)

### 2.8 Fundraising
- **Target raise: $400K pre-seed at $2.5M post-money** (16% dilution implied).
- Use of funds: **60% engineering (hire 1), 25% marketing/community, 15% ops/legal**.
- Investor list (v2 HTML adds stage/check-size/status): Hustle Fund (pre-seed, $25K–200K, Target); South Park Commons (pre-seed, $100K–500K, Target); On Deck (pre-seed, $50K–250K, Target); Contrary Capital (pre-seed/seed, $100K–1M, Research); fintech-focused angels ($10K–50K, Research).
- Ask framing: "$400K pre-seed at $2.5M valuation. 18-month runway to seed metrics."

### 2.9 Success Metrics / KPIs
- **North Star: "Users who achieve READY status"** — explicitly NOT assessments, NOT revenue.
- Phase 1 (Days 1–30): assessments 50 (good 75+, concerning <30); completion rate 60% (good 70%+, concerning <40%); NOT YET rate 70–75% (good 65–80%, concerning <50% or >90%); NPS 40 (good 50+, concerning <20).
- Phase 2 (Days 31–60): paid subscribers 20 (good 35+, concerning <10); NOT YET→paid conversion 10% (good 15%+, concerning <5%); B2B pilots 1 (good 2+, concerning 0); MRR $1,000 (good $2,000+, concerning <$500); 7-day retention 40% (good 50%+, concerning <25%).
- Investor-ready (Day 90): MRR $5K+, active users 100+, NOT YET→READY transformations 5+, B2B pipeline 3+.

### 2.10 FICO / Market-Failure Statistics (claims used for positioning)
- FICO **41% misclassification rate** vs. actual default behavior.
- **45M credit invisible, 63.5M credit marginalized, 17M credit avoidant**.
- **15M Americans** penalized by medical debt inclusion.
- Median FICO in majority-minority zip codes: **34th percentile**.
- FICO used in **90%+ of lending decisions**; "35 years old" (built on 1989 / "1950s logic" claims).
- BlackRock Aladdin: **$21T managed**. Bloomberg Terminal: **$25K/year**. Decision-intelligence platforms: **$50B market**.
- MVP status noted: "Complete MVP (94.3% → 100%)"; pitch-deck placeholder says "frontend 94% complete".

---

## 3. Functions / Formulas / Calculation Logic

**No real computation exists in the JS.** Both HTML files contain only view-layer scripts (tab switching, accordion toggle). All numbers are hard-coded literals in the markup. Extracted business formulas/logic:

### 3.1 Scoring Framework (the product's core algorithm, stated declaratively)
```
composite inputs (each dimension scored 0–100):
  Financial Reality  — weight 0.35, threshold ≥ 70
    inputs: current cash flow (income vs. expenses), true affordability ratios (28/36 DTI),
            emergency buffer (months of runway), income stability (tenure/industry),
            asset-to-liability trajectory, hidden-costs awareness (maintenance 1–2% home value/yr, taxes, HOA)
  Emotional Truth    — weight 0.35, threshold ≥ 70
    inputs: values alignment, stress capacity, relationship/family readiness,
            psychological preparedness, fear-vs-desire calibration, decision confidence
  Perfect Timing     — weight 0.30, threshold ≥ 70
    inputs: life-stage appropriateness, opportunity cost, market/economic context,
            personal-circumstances window, future obligation trajectory, competing priorities

VERDICT (non-compensatory AND-gate):
  READY   = (Financial ≥ 70) AND (Emotional ≥ 70) AND (Timing ≥ 70)
  NOT YET = ANY dimension < 70  → + Transformation Path
```
**Critical design decision (verbatim):** "If ANY dimension is below 70, the verdict is 'NOT YET'—even if the other two are at 100... The three dimensions are interdependent, not compensatory." (Weights 0.35/0.35/0.30 are declared but the verdict is gated per-dimension, not on a weighted composite.)

### 3.2 Scoring heuristics embedded in assessment questions (home buying)
- Emergency runway: 0–3 months = low score; 6+ months = high score.
- Mortgage payment ≤ **28% DTI** threshold.
- Post-close liquidity: **<20% of liquid savings remaining = risk flag**.
- Maintenance budget: **1–2% of home value annually**.

### 3.3 Unit-economics formulas (derivable)
- LTV_B2C = ARPU × lifespan = $22 × 8 mo = **$176**.
- LTV_CAC = LTV / CAC → 176/50 = 3.5x; 176/30 = 5.9x.
- LTV_B2B = ACV × years = $12,000 × 3 = **$36,000**; 36K/5K = 7.2x; 36K/2K = 18x.
- NOT-YET LTV = $29.99 × 6–18 mo = **$180–540** (3–10× the $50–200 referral).
- Sensitivity model: Year-1 revenue = 12,000 assessments × conversion × $143.33 avg annual value... precisely linear: $17,200 per conversion percentage point; LTV/user $1.4333 per point.
- Revenue projection drivers: B2C MRR = subs × $22; B2B MRR = clients × $1,000; 15% MoM B2C growth, 5%/2% monthly churn.

### 3.4 SVG score-ring math (dashboard.html, line 169)
Circle r=62 → circumference 2πr ≈ 389.56; `stroke-dasharray="389.56"` with `stroke-dashoffset="38.96"` renders exactly 90% filled (9/10 score). Formula: `offset = 389.56 × (1 − score/10)`. SVG rotated −90° so arc starts at top.

### 3.5 JS present (verbatim, trivial)
```js
// dashboard.html — tab switcher
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
        tab.classList.add('active');
        document.getElementById(tab.dataset.tab).classList.remove('hidden');
    });
});
// intelligence_v2.html — nav + accordion
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.section).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});
function toggleAccordion(header) { header.parentElement.classList.toggle('open'); }
```

---

## 4. Strategy Content — Key Claims (Verbatim)

### 4.1 Thesis & positioning
- Insight: "Most people don't regret what they bought. They regret **when** they bought it."
- Positioning: "Every financial system optimizes outcomes *after* decisions are made. HōMI optimizes the moment *before*."
- Statement: "The most valuable financial technology of the next decade won't help you manage money. It will help you understand when you're ready to make decisions about money."
- Byline: "A timely B2B platform poised to redefine mortgage risk assessment and buyer qualification."
- Self-description: "an Emotionally Intelligent Decision OS"; output "binary: READY or NOT YET".
- Strategic insight: "HōMI doesn't compete with existing financial systems. It creates a new layer that precedes all of them... HōMI can partner with (rather than displace) incumbent players while owning the decision readiness moment entirely."
- Daily reminder: "Aladdin optimizes portfolios. Bloomberg optimizes information. FICO optimizes debt prediction. **HōMI optimizes people.** We don't compete with them. We're the missing layer that comes before all of them."
- "HōMI is a compass; behavioral finance is a guardrail."

### 4.2 FICO question reframe (comparison block)
- FICO's question (1989): "Will this person pay back this specific debt?" — backward-looking, single-dimensional, binary approve/reject, no path forward, 41% misclassification.
- HōMI's question (2025): "Is this person ready to make this decision right now?" — forward-looking, three-dimensional, actionable verdict, transformation path, aligned incentives.

### 4.3 Four Structural Moats ("The Four Walls")
1. **Zero Conflict of Interest** — "Transaction-dependent businesses cannot structurally offer honest readiness assessment. HōMI's revenue model is the moat itself." / "Banks profit from transactions. Bureaus profit from scores. HōMI profits from readiness."
2. **Three-Dimensional Integration** — "Financial data providers don't do emotional. Mental health apps don't do financial. No one does timing. HōMI owns the intersection."
3. **NOT YET as Premium Segment** — "Every competitor sees 'NOT YET' as failure. HōMI sees it as 3-10x higher LTV. This philosophical inversion cannot be copied by incumbents."
4. **Trust Architecture** — "A system that says 'wait' builds more trust than one that only says 'buy.' Trust compounds into word-of-mouth and brand equity."

Why incumbents can't copy: Banks (origination fees/interest — "not yet" reduces revenue); Credit bureaus (Experian/TransUnion/Equifax sell to banks — no consumer monetization, no incentive to reduce lending volume); Fintechs (SoFi, Better.com, Rocket — "investors measure origination growth. A 73% 'NOT YET' rate would be catastrophic").

### 4.4 Incumbent gap map (v2 HTML table)
| System | Optimizes | Misses | HōMI position |
|---|---|---|---|
| BlackRock Aladdin ($21T managed) | Portfolio risk, scenarios, allocation | Whether the person is emotionally/financially ready | Readiness first → then Aladdin optimizes |
| Bloomberg Terminal ($25K/yr) | Market data, news, sentiment | Framework for whether to act; user's emotional state | Action framework before information overload |
| FICO (90%+ of lending) | Historical debt repayment probability | Current capacity, emotional readiness, timing | Replace backward-looking with forward-looking |
| Decision Intelligence ($50B market) | Enterprise decisions (supply chain, pricing, ops) | Personal life decisions entirely | Creates consumer decision-readiness category |
| Behavioral finance apps | Reactive nudges after decision | Proactive assessment before decision | Compass vs. guardrail |

### 4.5 Competitive war-gaming (4 scenarios)
1. **FICO launches "FICO Readiness Score"** — Likelihood: Medium (2–3 yrs). Fails: bank customers, backward model, no emotional/transformation capability, "brand associated with rejection". Counter: "the score FICO can't give you."
2. **Plaid builds consumer readiness tool** — Likelihood: Low–Medium. Fails: financial-data-only, would compete with own lender customers, no coaching infra, B2B brand. Counter: "Partner with Plaid for data layer; they enable, we interpret."
3. **Big bank (Chase/BofA) readiness tool** — Likelihood: High (defensive). Fails: structural conflict, users won't trust seller-assessor, no NOT-YET monetization. Counter: "Would you trust a car salesman to tell you if you need a car?"
4. **Startup copies HōMI directly** — Likelihood: High if traction. "No structural barrier to copying the concept." Defenses: speed/brand/community, proprietary scoring-calibration data moat, exclusive CDFI partnerships, transformation content library depth.

### 4.6 Roadmap / GTM
- Phase 1 Foundation (Days 1–30): MVP 94.3%→100%, 50 user tests, legal (LLC/ToS/Privacy), Plaid integration, community engagement. Exit: working product + 50 assessments.
- Phase 2 Validation (Days 31–60): 20 paid subscribers, 1 CDFI pilot, NOT-YET content, referral program, scoring calibration. Exit: $1K MRR + 1 B2B pilot.
- Phase 3 Scale Prep (Days 61–90): 100+ users, 3 CDFI conversations, investor materials, pre-seed outreach, team expansion plan. Exit: ready for pre-seed.
- Week 1–4 community launch: W1 Foundation (LinkedIn profile, join 5 subreddits, 3 FB groups, draft 4 posts); W2 Engagement (3–5 Reddit comments/day, first FICO-critique post, ID 10 CDFI contacts); W3 Value (first YouTube video, 5 CDFI connection requests, original-data Reddit post); W4 Conversion setup (first soft CTA, 2–3 CDFI intro calls, AMA proposal, metrics review).

### 4.7 Community targets
- **Tier 1:** Community Banks & CDFIs (mission-aligned, CRA pressure, 3–6 mo sales cycle vs. 18+ mo at big banks; B2B SaaS $500–2K/mo). Named targets: Opportunity Finance Network (OFN) members, Self-Help Credit Union (NC, $1.8B assets), Coastal Enterprises Inc. (Maine), LISC, Community Development Bankers Association members.
- **Tier 1:** Real Estate Tech/PropTech (LinkedIn, r/RealEstateTechnology; B2B integration + referral fees).
- **Tier 2:** Financial Wellness (Reddit: r/personalfinance 21.5M, r/FinancialPlanning 965K, r/FirstTimeHomeBuyer, r/povertyfinance — "Zero promotion. Value-only comments."; FB: Real Estate Agent Referral Network, GreenPath Financial Wellness Friends, Rising Up Together; YouTube gaps: AI in lead qualification, psychology of financial timing, interactive readiness tools).
- **Tier 3:** Sales/Marketing Ops (LinkedIn, r/LeadGeneration; enterprise white-label; MQL→SQL analogy).
- Content cadence: Reddit daily engagement (no CTA, link in profile only); YouTube 2x/month ("5 Signs You're Not Ready to Buy"); LinkedIn 3x/week (founder journey, FICO critique); FB groups 2x/week.

### 4.8 CDFI Partnership Script (verbatim)
> "You're seeing the same pattern we are: potential borrowers who could be great customers in 6-12 months, but aren't ready today. Right now, you either approve them (risky) or decline them (lost relationship). What if you could keep them in your ecosystem, help them get ready, and capture them when they're truly qualified? That's what HōMI does. We're piloting with 3 CDFIs this quarter—want to be one of them?"

### 4.9 Pitch deck narrative (13 slides)
1–2 Insight; 3–4 Problem (FICO 35 yrs old, 41% misclassification, 45M+ credit invisible; "will they pay?" vs. "should they buy now?"); 5–6 Solution (3-dim, binary verdict + transformation path); 7 Moat (zero-conflict, 73% NOT YET); 8 Market ($3B→$8.3B, $0 consumer readiness white space); 9 Traction (frontend 94% complete + placeholders); 10 Business model (B2C $9.99–99.99/mo + B2B $500–2K/mo + $50–200 referral); 11 GTM (CDFIs → PropTech → enterprise); 12 Team ("Solo founder + Claude as technical cofounder"); 13 Ask ($400K at $2.5M, 18-month runway).

### 4.10 Risk registry
Risk matrix (probability × impact): HighProb/HighImpact = Solo founder burnout; HighProb/MedImpact = Slow CDFI adoption; HighProb/LowImpact = Feature creep; MedProb/HighImpact = Regulatory shift; MedProb/MedImpact = Plaid API changes; MedProb/LowImpact = UX friction; LowProb/HighImpact = (none in matrix — Data breach is LowProb/MedImpact); LowProb/MedImpact = Data breach, Competitor copy (matrix cell "low")... Matrix as rendered: Low prob row: Domain issues (low), Competitor copy (low), Data breach (medium). NOT YET conversion below target is in the detailed register (Med prob / High impact) but absent from the matrix grid.
- Solo founder burnout: running dual careers (Safe Ship + HōMI); mitigations: strict time-boxing, first hire = technical co-builder, leverage Claude aggressively, "back recovery protocol" (standing desk, movement breaks), **exit Safe Ship by EOY 2025 if HōMI hits $5K MRR**. Owner: Cody.
- Slow CDFI adoption: start conversations now, free 3-month pilots, target innovation officers not procurement, case studies, parallel B2C runway. Owner: Cody.
- Regulatory shift: "educational platform" positioning from day 1, never recommend specific products, fintech attorney pre-launch, monitor CFPB/state AGs, proactive compliance docs. Owner: Cody + counsel.
- Plaid API changes: data-layer abstraction; alternatives MX, Yodlee, Finicity; manual-input fallback; Plaid startup program.
- NOT YET conversion below target: heavy user research first 60 days, pricing/packaging tests, success stories, freemium vs. hard paywall, fallback = increase B2B focus.

### 4.11 Brand constants
- Spelling: HōMI = H (capital) + ō (lowercase w/ macron U+014D) + M (capital) + I (capital).
- Colors: Cyan #22d3ee | Emerald #34d399 | Yellow #facc15 | Navy #0a1628.
- Voice: "Precision Empathy × Calm Authority × Cinematic Clarity".
- Tagline: "A Decision Companion".
- Founder name appearing in artifacts: **Cody**; side venture referenced: **Safe Ship**.

---

## 5. UI Patterns Worth Reusing

### 5.1 Design tokens (CSS custom properties, intelligence_v2.html)
```css
:root {
  --cyan: #22d3ee; --emerald: #34d399; --yellow: #facc15;
  --navy: #0a1628;   /* page bg */
  --slate: #1e293b;  /* card bg */
  --slate-600: #475569; --slate-700: #334155;  /* borders */
  --light: #e2e8f0;  /* body text */
  --muted: #94a3b8;  /* secondary text */
  --red: #f87171; --orange: #fb923c;
}
```
Font: Inter (400/500/600/700/800/900). Base font-size 15px, line-height 1.6. Border-radius: 16px cards, 12px metric cards, 8px flow boxes, 6px/9999px badges.

### 5.2 Layout patterns
- **Sticky horizontal tab/nav bar** (`position: sticky; top: 0; overflow-x: auto`) with active state `background: cyan; color: navy`; sections toggled via `display:none/block` + JS.
- **Responsive grids:** mobile-first 1-col; `grid-2`/`grid-3` at ≥768px; `grid-4` 2-col @768 → 4-col @1024px. Container max-width 1400px (v2) / 1152px (dashboard).
- **Header gradient band:** `linear-gradient(135deg, rgba(cyan,0.1), rgba(emerald,0.1), rgba(yellow,0.1))`; brand wordmark with per-letter color spans (H=cyan, ō=emerald, M=yellow, I=cyan).
- **Stat/metric cards:** big value (28–32px, weight 800–900) + uppercase 11px letter-spaced label; optional progress bar (8px track slate-700, animated fill `transition: width .5–1s ease-out`).
- **SVG score ring:** 140×140, r=62, stroke 8, dasharray 389.56, `rotate(-90deg)`, centered overlay number.

### 5.3 Content-component vocabulary
- **Callouts:** left 4px accent border + 10% tint bg, 4 variants (cyan/emerald/yellow/red) with `callout-title` + `callout-text`.
- **Comparison blocks:** 2-col grid, left = red tint ("their way"), right = emerald tint ("our way"), uppercase small title.
- **Flow diagrams:** flex row of colored `flow-box` chips joined by `→` arrows on navy inset panel; used for funnel (100 → 27 READY → 73 NOT YET) and threshold logic (≥70 + ≥70 + ≥70 ↓ READY).
- **Risk matrix:** CSS-grid 4×4 (auto + 3 cols), 2px gaps showing slate-700 grid lines, cells tinted by severity (high=red 20%, medium=yellow 20%, low=emerald 20%).
- **Timeline:** left vertical 2px line, 12px dot markers (cyan default; emerald=completed, yellow=warning, red=danger), title + date header.
- **Accordion:** `.accordion-item.open .accordion-content { display: block }`, chevron `▼` rotates 180° when open; toggled by 3-line JS.
- **Badges:** 11px uppercase, 20% alpha bg + full-saturation text per hue (cyan/emerald/yellow/red/orange/slate).
- **Check-lists:** custom `li::before` '✓' emerald; risk lists use '⚠' red.
- **Tables:** navy header row, 11px uppercase muted th, row hover `rgba(34,211,238,0.05)`, overflow-x wrapper.
- **Quote blocks:** italic 20px centered on subtle diagonal cyan→emerald gradient; attribution in muted 14px.
- **Gap/risk split cards** (dashboard.html): 3-col and 2-col grid cells with per-cell tint backgrounds (red/yellow/green 5%) and hairline dividers — "Incumbent | The Gap | HōMI Answer" and "Risk | Mitigation" layouts.

### 5.4 Dashboard tab IA
- dashboard.html (6 tabs): ◉ Overview · 🎯 Market Gaps · 🏰 Competitive Moat · 🛡️ Risk Mitigation · 👥 Communities · 💔 FICO Disruption.
- intelligence_v2.html (10 sections): Executive Summary · Core Thesis · NOT YET Economics · Scoring Framework · Competitive Analysis · Community Playbook · Go-to-Market · Financial Model · Risk Registry · Success Metrics.

---

## 6. Cross-File Consistency Notes
- Scores, weights, thresholds, pricing, unit economics, GTM phases, fundraising terms are **identical** across all 4 files.
- Differences: v2 HTML adds SAM/SOM, 24-month revenue table, sensitivity analysis, war-game scenarios, investor check sizes, risk matrix, Reddit subscriber counts, READY Celebration $149 tier, Betterment as 6th competitor (JSON lists 5). Summary.md adds NOT YET→paid "≥15% strong" framing and "exit Safe Ship at $5K MRR" detail.
- Inconsistencies found: (a) Y1 ARR $120K/$10K MRR metric card vs. $26K MRR in projection table; (b) scoring weights declared (35/35/30) but verdict is a per-dimension AND-gate, not weighted; (c) dashboard footer date 2025-12-16 vs. JSON generated 2025-12-17; (d) risk matrix grid omits "NOT YET conversion" risk present in register.
