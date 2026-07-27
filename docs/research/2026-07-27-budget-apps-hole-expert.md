# Expert rebuild: Budget software holes × Find the Hole × HōMI Path to Ready

**Date:** 2026-07-27  
**Status:** Research + product strategy (pre-implementation)  
**Framework:** Find the Hole, Fill the Hole™  
**Scoring SSOT:** `lib/scoring/engine.ts` (verdicts: READY | ALMOST_THERE | BUILD_FIRST | NOT_YET; badge DO NOT PROCEED for NOT_YET)

---

## Phase 1 — Ruthless self-critique of the prior synthesis

My initial draft was **not** the best possible output. Identified gaps:

### Under-explained
1. Treated “Path to Ready” as a calendar seed feature without defining the **plan graph** (assumptions, binding constraints, funding targets, evidence rules, version history).
2. Collapsed four different verdicts into “non-ready” — ignored READY / ALMOST_THERE / BUILD_FIRST / NOT_YET behavioral differences.
3. Did not unpack **hard-stops** (`DTI_OVER_50`, `HOUSING_RATIO_OVER_45`, `RUNWAY_UNDER_1_MONTH`, `CREDIT_UNDER_620`) as ordered path drivers.
4. Did not explain dual vocabulary: enum `NOT_YET` vs badge `DO NOT PROCEED` (ADR-001).
5. Did not distinguish **self-report finance** vs **Plaid-verified cashflow** vs **assessment inputs** (three truth sources that can disagree).
6. Quantified demand with hand-wavy market figures without labeling confidence.

### Oversimplified
1. “Don’t fight Rocket Money” is directionally right but underspecified — users still expect *some* recurring-spend awareness; the question is product identity, not absolute feature abstinence.
2. Competitor matrix ignored packaging (Core vs Plus, AUM funnel, success fees, free+upsell).
3. Homi calendar “payment” kind was listed as if it were bill pay — it is currently a **label only**.
4. Default milestones (30/60/90/180 day reviews) were not called out as **generic, not diagnosis-driven**.

### Unverified assumptions (called out now as A1–A12 in §8)
1. That “decision readiness” has enough willingness-to-pay without bank sync polish.
2. That DO NOT PROCEED users want a multi-week path (some want one next action only).
3. That composing existing surfaces ships in 1–3 days without schema work (calendar lacks amount/funding/depends_on).
4. That Monarch Plus is the main threat for life scenarios (Origin and CFP software also matter).

### What a top 1% expert would flag as missing
1. **Binding-constraint logic** (fix lowest dimension first — not spray milestones).
2. **Data provenance + confidence caps** (never READY on pure self-report without disclosure).
3. **False precision** (runway to one decimal from guessed income).
4. **Regulatory posture** (Reg Z / “not a commitment to lend” for housing-adjacent language).
5. **Partner disagreement** as first-class state.
6. **Failure modes of auto-generated plans** (empty calendar, over-seed, guilt UX, AI overriding scorer).
7. **Prior art**: YNAB funding, Monarch scenarios, RightCapital Action Items, MoneyGuide needs/wants/wishes, Origin PoS, USAA readiness plans.
8. **Second-order risk**: Path becomes Mint-with-a-calendar and dilutes Decision Readiness brand.

---

## Phase 2 — External research integrated

### Agent A — Prior art (summary)
Production systems treat the calendar as an **output view**, not the core. Core is: provenanced baseline → dimension diagnosis → **binding constraint** → funded path / Action Items that move a success metric → reassess versioning. See YNAB (funding = truth), Monarch Plus (typed life events + directional accuracy disclaimer), Origin (scenario + human CFP), RightCapital (Action Items ↔ PoS), MoneyGuide (Needs/Wants/Wishes), Reg Z advertising rules.

### Agent B — Failure modes (summary)
Highest severity for HōMI: inventing/flipping verdicts; pushing big decisions on bad/stale data; surprise fees; shame loops; AI narrating around the scorer; silent incomplete bank data; over-seeded calendars; READY users getting fake homework.

---

*(Full narrative body lives in the conversation response; this file is the durable index + critique register.)*

## Assumption register (load-bearing)

| ID | Assumption | Confidence | Critical? | Verifiable? |
|----|------------|------------|-----------|-------------|
| A1 | Primary ICP is people facing a large discontinuous decision (esp. housing), not pure day-to-day budgeters | 0.75 | Yes | User interviews / assessment funnel analytics |
| A2 | Users will pay for clarity + path, not for another full ledger | 0.70 | Yes | Pricing tests / conversion of path users |
| A3 | Scoring engine + hard-stops are trusted SSOT for product truth | 0.90 | Yes | In-repo `lib/scoring` + tests |
| A4 | Calendar + finance + results can be composed without new scoring math | 0.85 | Yes | Code inventory |
| A5 | Plaid env may be off in some environments; path must work questionnaire-only | 0.80 | Yes | `.env` / connections “coming soon” path |
| A6 | Rocket-class cancel/negotiate is a poor first wedge for HōMI identity | 0.85 | Yes | Brand docs + competitive cost structure |
| A7 | Generic 30/60/90/180 seeds underperform diagnosis-driven paths | 0.75 | No | A/B if shipped |
| A8 | Multi-decision conflict (house vs kids) is real but out of scope for v1 | 0.80 | No | Product choice |
| A9 | “1–3 day MVP” needs schema light-touch OR path stored as notes JSON — pure calendar seed is incomplete for “funding targets” | 0.80 | Yes | Schema review |
| A10 | Companion must never invent numbers | 0.95 | Yes | COMPANION-ECOSYSTEM honesty rules |
| A11 | Housing language must stay educational / not lending commitment | 0.90 | Yes | Legal / Reg Z awareness |
| A12 | WTP exists for decision products (YNAB/Monarch/Origin pricing as weaker-offer proof) | 0.70 | Yes | Market already paying ~$100–200/yr |

---

## Recommended primary plug

**Path to Ready v1** — binding-constraint path generator from assessment + finance honesty gates → calendar milestones with tool links → reassess loop.  
**Non-goals:** Mint clone, bill negotiation marketplace, cancel concierge, AI-owned verdicts.
