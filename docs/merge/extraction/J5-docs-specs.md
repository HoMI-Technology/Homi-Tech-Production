# J5 — Docs & Specs Extraction (HōMI)

**Sources read in full (8 files):**
1. `HOMI-COMPLETE-TECHNICAL-DOCUMENTATION.md` (v1.0, Feb 2026 — B2B2C API platform)
2. `HoMI_Character_Specs_v1.md` (v1.0, Jan 2026 — 3 companion personas)
3. `README.md` (Companions production architecture — Express + Claude + Supabase)
4. `HoMI_Master_Roadmap_Bootstrap_to_Production.md` (2026-04-25 — Stages 0–6 lifecycle)
5. `HoMI_Companion_Architecture_Claude.md` (Architecture Brief v2 — first-principles rebuild)
6. `HōMI_Companion_Intelligence_Strategy_ChatGPT.md` (Companion Intelligence strategy)
7. `HOME Calculator_Master_Architecture_v3.docx` (v3.0, Dec 2024 — 11 HOMES calculators)
8. `HoMI_Calculator_Master_Plan.docx` (v1.0, Dec 2025 — calculator ecosystem + Phases 2–6)

**Tags:** BUILD-READY (spec sufficient to implement in React/Vite/localStorage frontend) / NEEDS-DESIGN (concept only, needs design pass) / DUPLICATE (overlaps existing build) / BACKEND-DEPENDENT (requires server/accounts/LLM API beyond current no-backend architecture).

**Current build baseline:** Readiness score (35/35/30 engine), budget dashboard, transactions, investments, goals & analytics; React/Vite, localStorage, no backend. Calculators already built: amortization, PMI, credit→rate, affordability, TCO, Monte Carlo.

---

## 1. Technical Documentation (`HOMI-COMPLETE-TECHNICAL-DOCUMENTATION.md`)

**Critical framing note:** This doc describes a *different product shape* than the current build and the roadmap: a B2B2C "Readiness Intelligence API" (Next.js 14 + Supabase + Stripe, agent-facing REST API, agent-commission flywheel). It also uses **40/30/30 composite weights** (F×0.40 + E×0.30 + T×0.30) and a **binary verdict (all three dimensions ≥ 70 → READY, else NOT_YET)** — both of which conflict with the canonical 35/35/30 weights and the 4-band verdict in the roadmap and calculator docs (see §7 Conflicts). Treat this doc as a parallel/legacy monetization spec, not the current product.

### 1.1 Architecture specified (not built)
- Next.js 14 App Router API gateway: API-key auth (SHA-256 hashed keys, prefix display), rate limiting (per-minute + monthly counters), Zod request validation, tier-based feature gating, CORS. **BACKEND-DEPENDENT**
- Scoring engine `lib/scoring-engine.js` (407 lines): three dimension scorers, composite, guidance generator (primary blocker, weakest factor, next steps, time-to-ready estimate), Quick Check pre-qualification, cached market signals for 8 metros. **DUPLICATE (core scoring overlaps existing 35/35/30 engine, but weights/thresholds differ); guidance generator + time-to-ready estimate = BUILD-READY frontend logic**
- HMAC-SHA256 completion receipts (`rcpt_...`, input_hash, signature, public verification URL) — trust differentiator. **BUILD-READY client-side (HMAC → use Web Crypto; verification URL is BACKEND-DEPENDENT)**
- Stripe billing: 4 API tiers (Explorer free / Builder $49 / Scale $299 / Enterprise custom), 3 consumer tiers (Free / Plus $9.99 / Pro $19.99), webhook handling, Connect payouts for 15–25% recurring agent commissions. **BACKEND-DEPENDENT**
- Supabase schema: 9 tables (users, agents, readiness_scores, api_calls, referrals, embed_tokens, waitlist, tier_limits, consumer_limits), 4 enums, 1 materialized view. **BACKEND-DEPENDENT**
- Demo mode: platform returns mock responses when Supabase unconfigured — pattern reusable for localStorage build. **BUILD-READY (pattern)**

### 1.2 API surface (agent-facing — all BACKEND-DEPENDENT)
| Endpoint | Purpose |
|---|---|
| POST /v1/readiness/score | Full 3-dimension scoring w/ factor breakdown + guidance + deeplink |
| GET /v1/readiness/check | Lightweight financial pre-qual (LIKELY_READY / APPROACHING / NOT_READY + confidence) |
| GET /v1/market/signals | Metro market data (affordability index, trend, median price, rates) |
| POST /v1/agents/register | Agent signup, one-time API key |
| POST /v1/readiness/embed | Partner iframe/SDK widget tokens (24h expiry) |
| POST /v1/referrals/convert | Conversion + commission calc (15/20/25% by tier) |
| POST /v1/readiness/bulk | Batch ≤100 assessments (Scale tier) |
| GET /v1/agents/stats | Usage/scoring/revenue dashboard |

### 1.3 Scoring details specified here (deltas vs current build)
- **Financial Reality (0–100):** DTI (0–25, debt×0.02 monthly-payment estimate; thresholds 28/36/43%), Down-payment coverage (0–25; home thresholds 20/10/5%, non-home 50/25/10%), **Emergency Fund Remaining post-decision** (0–25; subtracts down payment from savings then computes months of expenses; per-decision down-payment % table: home 20%, car 15%, investment 50%, education 30%, business 40%, major expense 80%), Credit health (0–25). → The **post-decision emergency-fund factor** and **decision-type down-payment table** are likely new vs current engine. **BUILD-READY**
- **Emotional Truth (0–100):** Life stability, decision confidence, stress tolerance, partner alignment (No partner = 20 > Partial = 15). Default = 50 if signals missing (drives assessment funnel). **BUILD-READY**
- **Perfect Timing (0–100):** Market conditions (0–35; 8 cached metros with affordability index/trend/median price/90d change/inventory/rate), Rate environment (0–30; brackets at 5.5/6.5/7.5%, +1 bracket if declining), Life timeline (0–35; flexible→immediate). **BUILD-READY with static metro table; live data BACKEND-DEPENDENT (Zillow/FRED keys marked future)**
- **Quick Check formula:** DTI ≤0.36 & coverage ≥0.15 → LIKELY_READY; ≤0.43 & ≥0.08 → APPROACHING; else NOT_READY. **BUILD-READY**
- **Guidance generation:** primary blocker = lowest dimension; weakest factor by score-to-max ratio; time-to-ready bands (gap 1–5 → 2–4 wks; 6–15 → 1–3 mo; 16–30 → 3–6 mo; >30 → 6–12 mo). **BUILD-READY**
- **Decision types enum:** home_purchase, car_purchase, career_change, investment, retirement, major_expense, education, business_start. **BUILD-READY (multi-decision scoring config)**

### 1.4 "What to Build Next" (doc's own list)
Immediate: deploy/schema/Stripe (BACKEND-DEPENDENT). Month 1: consumer frontend pages, docs site, agent onboarding, email (BACKEND-DEPENDENT). Month 2–3: live market data, **20-question guided emotional assessment** (BUILD-READY — expands 4-signal model), **Plaid integration** (BACKEND-DEPENDENT), partner embed widget (BUILD-READY as static widget; token infra BACKEND-DEPENDENT). Month 3–6: agent SDK, rate automation, custom scoring models, **partner-alignment sessions for couples (Pro)** (NEEDS-DESIGN), advisor marketplace (BACKEND-DEPENDENT).

---

## 2. Companion Architecture (Claude + ChatGPT + README + Character Specs)

This is the biggest new system. Four documents, two eras: **character-first** (Character Specs v1, README production build) vs **intelligence-first** (Claude Brief v2, ChatGPT Strategy). Both intelligence-first docs explicitly argue persona must be a thin layer over a state-grounded intelligence system.

### 2.1 Claude — Companion Architecture Brief v2

**Role separation (P3):** Score = source of truth (black-box service); Compass = visualization; Companion = memory + advocacy + explanation layer. Three components, three lifecycles. **NEEDS-DESIGN (for frontend: maps to scoring module / score UI / companion layer separation)**

**Trade-secret containment (P1, Part 3):** weights/formula never leave the scoring zone; clients receive only composite, pillar scores, directional deltas, confidence, and a templated **ReasoningTrail** with `magnitude_band` (small/moderate/large) instead of numeric weights; no LLM ever sees the formula. **BUILD-READY (frontend can adopt: never expose weights; generate reasoning text server-of-truth-side i.e. in scoring module, not in LLM prompts)**

**ReadinessSnapshot schema (Part 2.6):**
```
composite 0–100; pillars {FR, ET, PT}; confidence 0–100;
data_completeness per pillar {coverage_pct, missing_fields[], staleness_days};
reasoning_trail; model_version; scoring_engine_version; computed_at; consent_scope
```
**BUILD-READY (extend existing score object; confidence + completeness + staleness are new)**

**Missing-data policy:** no silent imputation; TTLs (bureau 30d, bank balance 24h, assessment 90d → re-prompt); confidence floor 70 for institutional release (`INSUFFICIENT_DATA` instead of a bad score). **BUILD-READY (staleness/confidence in localStorage app)**

**ReasoningTrail schema (Part 5):** summary_text; contributors[] {pillar, direction +/−, magnitude_band, cause, evidence_event_ids, user_actionable}; next_actions[] {text, expected_pillar_impact, expected_band, eta_band}. Edge cases: negative news w/o actionable cause (frame as patience-positive), confidence drop without score drop (communicate honestly), conflicting pillar signals (hold both, don't average). **BUILD-READY**

**Companion customization (7.1) — configuration, not character creation:** name (≤24 chars), visual identity (brand-palette orb/silhouette/abstract), voice tone slider (analytical↔warm), pacing slider (terse↔thoughtful), focus-area multi-select, notification cadence (off/weekly/on-significant-change), transparency depth (standard/detailed/expert). User does NOT customize math/verdicts/weights. **BUILD-READY (all settings are localStorage-able)**

**Memory (7.2):** per-user vector store (mem0 + pgvector — BACKEND-DEPENDENT at full spec); user-editable "what your Companion knows" surface; TTLs (90d chat memory, permanent declared values); extracted entities: partner, biggest fear, timeline, mentioned budget. **Frontend subset BUILD-READY: structured memory object + editable memory panel in localStorage; semantic recall BACKEND-DEPENDENT**

**Failure modes & recourse (7.4):** disclaimers (not fiduciary/RIA/CRA); confidence attached to numeric claims; "this advice didn't fit" feedback channel routing to review queue + eval set; out-of-scope detection (medical/legal/relational → redirect). **BUILD-READY (rules + UI)**

**LLM stack:** Sonnet 4.6 default chat, Opus 4.7 premium deep-reasoning, Haiku 4.5 proactive-insight generation + summarization; Langfuse observability w/ Presidio PII redaction; ≥90% prompt-cache target; 30-golden-conversation eval set. **BACKEND-DEPENDENT**

**Adversarial robustness (2.7):** rate-of-change anomaly flags, cross-source corroboration, assessment straight-lining/response-time detection, honeypot questions, Companion never negotiates score upward. **Partially BUILD-READY (assessment behavioral signals); data-source parts BACKEND-DEPENDENT**

### 2.2 ChatGPT — Companion Intelligence Strategy

**Core thesis:** "Companions should not be designed as characters." Companion = personalized readiness intelligence layer: private readiness analyst, transparent decision coach, data interpreter, consent-controlled institutional bridge. Explicitly chooses **Option C (Intelligence-First)** over A (Character-First) and B (Chat-First).

**Canonical CompanionReadinessState object (§20) — the product backbone:**
```ts
{ userId, assessmentId,
  score: { overall, verdict, dimensions {FR, ET, PT}, trend {direction, delta, periodDays} },
  confidence: { level: low|medium|high, reasons[] },
  dataQuality: { assessment: missing|complete|stale, financial: missing|self_reported|verified_partial|verified, emotional: ..., timing: ... },
  blockers[] { dimension, label, severity, userSafeExplanation },
  nextBestAction { label, reason, expectedImpact } | null,
  sharePreview { eligible, limitations[] },
  generatedAt, methodologyVersion }
```
Dashboard, chat, partner preview, reports, notifications, analytics all consume this one object. **BUILD-READY — highest-value single artifact in either companion doc**

**CompanionResponse contract (§21):** `{ answer, referencedState[], confidenceDisclosure?, nextAction?, safetyBoundary?, shouldUpdateMemory, shouldPromptAssessmentRefresh }` — system tracks fields user never sees. **BUILD-READY (prompt/output structure for LLM integration; rule engine without LLM)**

**Missing-data hierarchy (§6):** Verified / Self-reported / Estimated / Stale / Missing / Conflicting / Revoked — every input labeled; never hide missing data ("I can give you a medium-confidence readiness view…"). **BUILD-READY**

**Secondary metrics beyond score (§11):** Confidence, Momentum (trend per 30d, flat-streak detection), Data Completeness, Actionability, Risk Exposure, Alignment (financially eligible but personally misaligned), Shareability. **BUILD-READY (derivable from existing score history + inputs)**

**Scoring separation (§12):** deterministic core scores; AI explains/coaches/personalizes; AI must never change the score, invent data, or give regulated advice; ML prediction only later. **BUILD-READY (architectural rule)**

**Explainability (§13, §16):** "Why did this change?" view: score movement, dimension deltas, source labels, confidence change, missing data, recommended action. Expose logic, not formula. **BUILD-READY**

**MVP scope (§14):** (A) Companion dashboard module (score/verdict/confidence/completeness/top blocker/next action/trend/last-updated), (B) Explainability view, (C) state-grounded chat, (D) configuration panel (tone direct/balanced/gentle, detail brief/standard/deep, focus, nudges, memory controls, sharing prefs), (E) institutional share preview ("here is what a lender would see"). **A, B, D, E BUILD-READY now; C is BACKEND-DEPENDENT for real LLM chat, partially BUILD-READY with rule-based responses**

**Partner sharing (Phase 2, §8–§10, §22):** expiring share links, PartnerReadinessReport contract (band, confidence, data-quality summary, top factors, limitations, next step, consent {granted/expires/revoked}, audit {generatedAt, methodologyVersion, reportVersion}); partners never see raw emotional answers, chat, memory. **BACKEND-DEPENDENT for real sharing; local PDF/JSON export + preview BUILD-READY**

**Update classes (§4):** real-time (assessment complete, chat, settings, task complete), near-real-time (deltas, next action), async (provider sync), scheduled (stale warnings, monthly summaries, reassessment reminders). **BUILD-READY as frontend event model**

**10 Operating Principles (§18):** state before chat; explain before advise; confidence always travels with readiness; missing data is first-class; user owns sharing; AI interprets, deterministic systems score; private memory ≠ partner data; no magical claims; design for trust recovery; make the next action obvious.

**7 failure modes (§17):** cute-character trap, generic-chatbot trap, black-box trap, overclaiming (lender/RIA posture), partner data overexposure, AI hallucination, data staleness.

### 2.3 README — Companions Production Architecture (character-first implementation)

- Stack: React Native `CompanionChat.tsx` (animated avatars: breathing/thinking/speaking states, mood glows — Steady green, Clarity cyan, Horizon yellow) + Express backend + Claude (claude-sonnet-4, streaming, 400 max tokens) + Supabase (companion_sessions / companion_usage / companion_preferences). **BACKEND-DEPENDENT (LLM, SSE, JWT); avatar animation states + quick replies BUILD-READY in React/Vite**
- Endpoints: POST /api/chat (SSE stream), POST /api/switch-companion (with **handoff message** — new companion references prior context), GET /api/conversations/active, GET …/export (Markdown), GET /api/quick-replies?companion&score. **Switch + handoff + quick replies BUILD-READY as local logic**
- Detail extraction table: partnerConcern (partner+neg sentiment), biggestFear (afraid/scared+topic), timeline (time patterns), mentionedBudget (dollar amounts) → stored, injected into system prompt, drives quick replies. **BUILD-READY (regex/heuristic extraction works without LLM)**
- Fallback mode: static response pool when AI unavailable (demo mode). **BUILD-READY — this is exactly how a no-backend build can ship companions**
- Rate limiting 20 req/min/user; offline queue; analytics events (session_started, message_sent, companion_switched, session_completed). **BUILD-READY**

### 2.4 Character Specs v1 (see §3 for persona detail)

Companion selection flow + triggers, score-adaptive behavior bands, prohibited phrases, switching logic (30-day re-match suggestion, "surprise me" → matched to lowest dimension). **BUILD-READY**

### 2.5 Where Claude and ChatGPT agree

1. **Deterministic score, AI interprets** — never let the LLM set/change the score. Identical rule in both.
2. **Intelligence over persona** — Claude: "identity configuration, not character creation"; ChatGPT: "Choose Option C," characters only as optional style layer.
3. **Confidence + data-completeness are first-class outputs** — both require staleness, missing-data labeling, no silent imputation.
4. **Explainability via structured reasoning trail** — magnitude bands / source labels, expose logic not formula. Near-identical.
5. **User-inspectable, editable, deletable memory** — both require a "what HōMI knows/remembers" panel.
6. **Consent-scoped partner sharing separated from private memory** — partners get band/confidence/data-quality summaries, never chat or raw emotional answers.
7. **Companion never negotiates the score upward; out-of-scope refusal; disclaimers** (not lender/advisor/CRA).
8. **Phasing:** consumer intelligence first, partner/API later — but design data contracts for B2B from day one.

### 2.6 Where they conflict / diverge

| Topic | Claude | ChatGPT | Character Specs / README |
|---|---|---|---|
| Persona | Config sliders (tone/pacing/focus) + brand-voice envelope; explicitly "not cute character voices" | Characters rejected as product center; optional style underneath | Three named animal characters ARE the product (Steady/Clarity/Horizon) |
| Regulatory posture | Full FCRA/CRA Path-A build from day one (dispute, adverse action, §1033 export) | Lighter: disclaimers + consent + audit logs; explicitly "not a lender/broker/RIA/bureau" | Silent |
| Data inputs | Plaid/Pinwheel/Experian/ATTOM/FRED with costs, TTLs, second sources | "When available" verified data; self-reported acceptable with labels | Score + conversation only |
| Memory tech | mem0 + pgvector + per-user KMS envelope encryption | Permissioned inspectable memory, fact vs inference separation, confidence on inferences | JSONB `extracted_details` in session |
| Latency budgets | Engineered p95 paths (chat 830–1130ms TTFB, recompute 2.5s, institutional 300ms cached) | Softer targets (dashboard <1s cached, chat first paint 1–2s, never block dashboard on AI) | None |
| ML overlay | XGBoost time-to-Ready + volatility under SR 11-7 MRM with challenger model | "Later": outcome prediction, cohort comparison, next-best-action ranking | None |
| Naming | The Companion (singular, customizable) | HōMI Companion / Intelligence / Advisor — name TBD | Steady / Clarity / Horizon |

**Net synthesis for build:** adopt ChatGPT's `CompanionReadinessState` + Claude's `ReasoningTrail` as frontend data contracts (BUILD-READY); ship character personas from Character Specs as the voice layer (BUILD-READY, static pools per README demo mode); defer live LLM chat, vector memory, Plaid, compliance flows (BACKEND-DEPENDENT).

---

## 3. Character Specs v1 (verbatim-grade)

**Status:** "Ready for Implementation." Priority: Guide Dog → Dolphin → Owl. Integration: post-assessment character selection + ongoing chat companion.

### 3.1 Steady (Guide Dog 🐕)
- **Identity:** "Loyal, grounded, unwavering. Steady doesn't sugarcoat, but never abandons you. The friend who walks beside you through fog until you find clear ground."
- **Voice samples:** (65) "You're closer than you feel. The numbers say 65—that's not a maybe, that's momentum…" (38) "I'm not going to tell you what you want to hear. 38 means we have real work to do…" (88) "You did this. Not me, not luck—you showed up and built readiness one decision at a time…"
- **Adaptive bands:** 0–40 Protective (short warm sentences, ONE next step only); 41–70 Coaching (direct + tactical, celebrate small wins); 71–85 Partnership (asks more, directs less); 86–100 Releasing (steps back, "I'm here if you need me").
- **Specialty:** Emotional grounding during financial anxiety; translates scary numbers into manageable actions.
- **Triggers:** default for Emotional <50; after 2+ abandoned assessments; user self-identifies "anxious"/"overwhelmed".
- **Voice rule:** never uses exclamation points; calm, grounded punctuation.

### 3.2 Clarity (Smart Dolphin 🐬)
- **Identity:** "Quick, playful, pattern-obsessed. Clarity spots what you're missing and makes complex things click. Never condescending—just genuinely excited to connect dots you couldn't see."
- **Voice samples:** (54) "Okay, interesting—your financial score is strong but timing is tanking you…" (42) "You said 'I can't afford it.' But your numbers say you can—in 11 months…" (77) "You keep re-running the assessment hoping for 80. You're at 77. Three points isn't readiness—it's stalling. What are you actually nervous about?"
- **Adaptive bands:** 0–40 Simplification (exactly 3 priorities, visual metaphors); 41–70 Pattern-hunting (surfaces hidden blockers); 71–85 Optimization (fine-tuning, scenario planning); 86–100 Strategic (execution tactics, negotiation leverage).
- **Specialty:** Financial pattern recognition; reframing limiting beliefs.
- **Triggers:** default for Financial >65 but Emotional <50; after 3+ assessments with minimal change; user self-identifies "analytical"/"data-driven".
- **Voice rule:** uses dashes freely; questions end with genuine curiosity.

### 3.3 Horizon (Wise Owl 🦉)
- **Identity:** "Patient, philosophical, sees the long arc. Horizon asks the questions you've been avoiding. Not here to fix your spreadsheet—here to make sure you're chasing the right house for the right life."
- **Voice samples:** (61) "…when you imagine yourself in this house two years from now, what are you doing? Who's there?…" (73) "You're ready on paper. But you've delayed three times now. I don't think it's the market…" (91) "91 isn't just math—it's alignment… This isn't a leap. It's a step you've already prepared for."
- **Adaptive bands:** 0–40 Perspective (zoom out, "right problem?"); 41–70 Inquiry (Socratic, values clarification); 71–85 Integration (connect readiness to life vision); 86–100 Blessing (minimal intervention).
- **Specialty:** Values alignment and life-decision clarity; for technically-ready-but-hesitant users.
- **Triggers:** default for >70 overall with decision paralysis (3+ weeks no action); after major life-event flag; self-identifies "uncertain about what I really want".
- **Voice rule:** longer sentences allowed; philosophical but never vague.

### 3.4 Shared rules
- **Selection flow:** onboarding question "How would you describe where you're at right now?" → anxious→Steady / analytical→Clarity / unsure-if-right-goal→Horizon / "Surprise me"→algorithm by score profile.
- **Switching:** anytime in settings; system suggests switch after 30 days if score profile shifts; "surprise me" users matched to lowest-scoring dimension.
- **Prohibited phrases (all):** "I understand how you feel", "Don't worry", "You should", "The market says", "Most people".
- **Character queue:** 4 Fox (Strategic Opportunist — market timing/deal-hunting), 5 Bear (Protective Guardian — risk management), 6 Hummingbird (Agile Adapter), 7 Elephant (Memory Keeper — long-term tracking), 8 Bee (Community Connector — couples/family).

**Tag: BUILD-READY entirely** (static persona definitions, voice samples, band tables, selection/switching rules — all implementable as frontend config + response pools).

---

## 4. Roadmap (Bootstrap → Production)

**Owner:** Cody Short, solo founder. **Legal posture:** Architect Path A (CRA-grade), Operate Path B until CRA registration. **Locked:** 35/35/30 weights, brand v2026.04-r4 (navy #0A1628 / cyan #22D3EE / emerald #34D399 / yellow #FACC15), monorepo, Next.js 15 + Postgres/pgvector + Sonnet 4.6 + Plaid-only-v1, 8-week Phase-1 demoable.

### Stage 0 — Bootstrap ✅ done
Vision (replace credit score with forward-looking readiness signal), brand kit canonical, architecture brief v2, three locked decisions.

### Stage 1 — Phase 1 Demoable (Weeks 1–8) ← most relevant to current build
- **W1 (wk1):** canonical event model + Zod validators; consent tokens on every event; append-only events + S3 archive; KMS field-level PII encryption. **Event model + Zod validators BUILD-READY; rest BACKEND-DEPENDENT**
- **W2 (wk2–3):** real Plaid Link (BACKEND-DEPENDENT), **self-assessment UI for Emotional Truth (BUILD-READY)**, identity resolution.
- **W3 (wk3–4):** pillar calculators FR/ET/PT, **confidence calculation (BUILD-READY)**, **ReasoningTrail builder with magnitude_bands, never weights (BUILD-READY)**, snapshot persistence with version hash, Inngest 60s debounce (BACKEND-DEPENDENT).
- **W4 (wk4–5):** **Compass three-ring component — Cyan FR, Emerald ET, Yellow PT, verdict center + reasoning trail surface, low-confidence guidance state, SSE live updates.** **BUILD-READY (SSE→local recompute); likely the top UI build-add**
- **W5 (wk5–7):** Companion chat (Sonnet 4.6, prompt caching — BACKEND-DEPENDENT), mem0+pgvector memory (BACKEND-DEPENDENT), **user-editable memory surface (BUILD-READY)**, brand-voice + prohibited-phrase enforcement (BUILD-READY), identity configuration UI (BUILD-READY), proactive insights via Haiku 4.5 (BACKEND-DEPENDENT; rule-based insights BUILD-READY), out-of-scope detection (BUILD-READY), Langfuse/Presidio (BACKEND-DEPENDENT), 30 golden-conversation eval set (BUILD-READY as test fixture).
- **W6 (wk8):** invite codes, onboarding, ToS, telemetry (D1/D7/D14/D30 retention), week-8 go/no-go.
- **Gate:** D14 retention ≥30%, ≥10 interviews, zero PII leaks, weight-leak CI green.

### Stage 2 — Foundation (Mo 3–7)
FCRA §609/§611/§615 flows, CFPB §1033 export, CCPA/CPRA, GLBA WISP, CRA registration (federal + CA/MA/NY), KMS rotation, mTLS, SIEM, pen test, **ML overlay (XGBoost time-to-Ready forecast + volatility) under SR 11-7 MRM with challenger model**, second-source aggregator (MX/Finicity), SOC 2 Type II window opens, disparate-impact monitoring (4/5ths rule), ATTOM/CoreLogic/Zillow/FRED data. **Nearly all BACKEND-DEPENDENT; a time-to-ready heuristic estimate is BUILD-READY (already specced in tech doc §4 guidance bands)**

### Stage 3 — Institutional Beta (Mo 7–12)
OAuth2+mTLS API gateway, 2 design partners (non-bank mortgage originators, outcome-data clauses), adverse-action generator, **Premium consumer tier $14.99/mo** (deeper transparency, longer memory, what-if simulations, Opus companion), outcome data pipeline (the moat: snapshot↔12-month loan performance, ≥10% lift over FICO target), support tooling. **BACKEND-DEPENDENT; what-if simulations BUILD-READY**

### Stage 4 — Public Beta (Mo 12–18)
Public signup, marketing engine, **Multi-decision Companions: refi / HELOC / investing readiness — same formulas, configured per-decision pillar weights, shared memory (BUILD-READY config pattern)**, Wave-2 partners (HFAs, DPA programs), 99.9% SLOs, cost ≤$0.02/user-day, iOS app, trust & safety, i18n prep.

### Stage 5 — GA (Mo 18–24)
Insurers/employers/wealth-tech partners, white-label SDK, 50-state CRA, outcome corpus ≥10K loans + validation whitepaper, API marketplace, financial-wellness ecosystem pricing.

### Stage 6 — Public launch (Mo 24+): PR sequence, 10× capacity, ≥10K launch-week signups.

### Owner's build order (net)
1. **Now (Stage 1):** event model → Plaid/assessment → scoring core + confidence + ReasoningTrail → Compass → Companion + memory → beta. Compass + Companion are Phase-1, not later.
2. Then compliance/ML overlay/second-source (Stage 2).
3. Then institutional API + premium tier (Stage 3).
4. Then multi-decision + mobile + scale (Stage 4+).

**Cross-cutting:** brand stewardship, trade-secret containment (weight-leak CI grep, magnitude_band invariant), regulatory watch, user safety/recourse channel, cost discipline (cost-per-active-user-day dashboard), docs/ADRs, hiring plan, gated capital (seed $3–5M end Stage 2; A $15–25M end Stage 4).

---

## 5. Calculator Architecture (both docx)

### 5.1 Already-built overlap (DUPLICATE)
Amortization/payoff (have), PMI impact (have), credit→rate (have), affordability (have — doc's 23-input flagship is a superset), TCO (have), Monte Carlo 10K Box-Muller (have). The docx's scoring algorithm (FR: down-payment 30/DTI 30/reserves 20/credit 20; ET: sliders ×4/×3/×3; PT: horizon 40/MC-success 40/rate-env 20; weights 35/35/30) — **verify against current engine; likely DUPLICATE or minor delta**. Verdict bands here are **4-tier: 80+ READY / 65–79 ALMOST THERE / 50–64 BUILD FIRST / 0–49 NOT YET** with color glows — **BUILD-READY if current build uses binary verdict**.

### 5.2 New calculator specs (HOMES, Phase 1)
| Calculator | Key spec | Tag |
|---|---|---|
| Mortgage Payment (PITI) | Full PITI breakdown bar, 15/20/30 term comparison cards, rate sensitivity +1%/+2%, Freedom Date, payment-to-income safety zones (green <25%, yellow 25–32%, red >32%), range-not-point display (anti-anchoring) | **BUILD-READY** (partial DUPLICATE of amortization) |
| DTI Analysis | Front-end vs back-end DTI, qualification probability by program (Conv 43%, FHA 50%, VA 41%, Jumbo 36%), DTI improvement path ("pay off $5K → 38%→35%") | **BUILD-READY** |
| Rent vs Buy | Break-even year, wealth trajectory at 3/5/7/10yr, opportunity cost of down payment invested, sensitivity (0% appreciation, rate hikes), verdict BUY/RENT/CLOSE CALL, anti-FOMO messaging | **BUILD-READY** (overlaps TCO partially) |
| Down Payment Tracker | Progress bar, months-to-goal Monte Carlo path projection, savings-acceleration scenarios (+$200/mo → 14 vs 22 mo), gift/windfall modeling, reserve protection after down payment, milestone celebrations | **BUILD-READY** (overlaps goals module) |
| Refinance Analyzer | Break-even months, closing-cost recovery, NPV current-vs-refi, verdict REFINANCE/WAIT/DON'T | **BUILD-READY** |
| FHA/VA Comparison | Upfront MIP 1.75%, annual MIP 0.55%, lifetime MIP for <10% down, VA funding fee tables + disability exemption, county loan limits, program-vs-conventional cost comparison | **BUILD-READY** |
| HELOC / Home Equity | Available equity at 80/85/90% LTV, variable-rate scenarios, draw vs repayment period, HELOC vs fixed home-equity loan comparison, purpose-based risk framing | **BUILD-READY** |
| Rental Property Analyzer | Cash flow, cap rate, cash-on-cash, break-even occupancy, 10-year projection, total return incl. principal paydown + tax | **BUILD-READY** |
| APR Comparison | Up to 3 offers with points/fees → true APR, total-cost comparison, recommendation by timeline | **BUILD-READY** |

### 5.3 Cross-cutting calculator specs
- **Trinity Engine™:** three AI perspectives — Spark (Advocate) / Sage (Skeptic) / Atlas (Arbiter) debate then synthesize verdict. **BUILD-READY as templated 3-voice text generation; LLM-driven version BACKEND-DEPENDENT**
- **Temporal Twin™:** messages from future self (bought vs rented parallel futures). **BUILD-READY (templated)**
- **Quantum Timeline States:** 6 parallel futures with probability weights. **BUILD-READY (extends Monte Carlo percentiles)**
- **"The Signal":** show ranges ($320K–$380K) not point numbers; "safe zone" not "maximum" language. **BUILD-READY (UX copy rule)**
- **Shared input system / profile data layer:** income/debt/assets/credit/location/life-stage/risk profile entered once, flowing calculator→calculator (Affordability→Mortgage→Amortization; DTI→FHA/VA; DownPayment→RentVsBuy). **BUILD-READY — high-leverage refactor of localStorage schema**
- **Outcome Verification Network (OVN):** every verdict creates a checkpoint; +6mo "did you proceed?", +12mo "was the verdict accurate?"; verified outcomes = moat. **Local reminder/self-report BUILD-READY; network effects BACKEND-DEPENDENT**
- **Analytics events:** calculator_start, analysis_complete, scenario_saved, action_clicked; targets: 27% READY verdicts, >70% completion. **BUILD-READY**
- **Monetization gates:** free = basic calcs (3 scenarios max); premium $9.99 = readiness score, Trinity, Temporal Twin, Monte Carlo, unlimited scenarios, PDF export, OVN. **BACKEND-DEPENDENT for billing; feature-flag structure BUILD-READY**
- **Zero-conflict constraint:** never affiliate/referral fees from lenders/realtors. (Product rule, conflicts with tech doc's agent-commission model — see §7.)
- **Brand gates:** exact hexes (Cyan #22D3EE, Emerald #34D399, Yellow #FACC15, Navy #0A1628), Inter font, HōMI macron, "Would Cody use this?" final gate. **BUILD-READY**

### 5.4 Existing-but-not-in-current-build tools (from Master Plan §2 audit)
Listed as COMPLETE in prior HTML builds but absent from current React/Vite app — all **BUILD-READY as ports** if source HTMLs available, else NEEDS-DESIGN:
- Retirement: 401K optimizer, Roth conversion (bracket-filling ladder), Social Security 62/67/70 break-even, Coast FIRE, glide-path visualizer, historical backtesting (1929/1966/2000/2008), RMD calculator, withdrawal sequencing.
- Tax: bracket analysis (fed+state), widow's penalty, IRMAA surcharges, tax-loss harvesting tracker (wash sale), QCD optimizer, state arbitrage, capital-gains 0%-bracket harvesting.

### 5.5 Future calculator phases (go-trigger gated)
Phase 2 CARS (auto loan, lease, cash-back-vs-low-interest, 20/4/10 affordability — "Ready to Build"), Phase 3 INVESTMENTS (compound interest, goal-based investment, decision ROI, CD, bond), Phase 4 EDUCATION (student loan, college cost, education ROI, PSLF/IBR/refi repayment), Phase 5 BUSINESS (business loan, startup runway, valuation, hiring affordability — mostly Design Phase), Phase 6 LIFE (marriage readiness, children cost, career change runway, divorce planning — Concept Phase; noted as unique competitive territory). **All NEEDS-DESIGN except car/auto calcs which are near-BUILD-READY.**

---

## 6. Companion personas vs configuration — reconciliation note

For the build, the four companion docs converge into one shippable frontend system:
1. **Data contract:** ChatGPT `CompanionReadinessState` + `CompanionResponse` (BUILD-READY).
2. **Explainability:** Claude `ReasoningTrail` with magnitude bands (BUILD-READY).
3. **Voice layer:** Character Specs personas + adaptive bands + prohibited phrases (BUILD-READY).
4. **Runtime:** README demo-mode pattern — static response pools keyed by persona × score-band × extracted-details; heuristic detail extraction (partner/fear/timeline/budget); quick replies; companion switch + handoff messages; avatar animation states (BUILD-READY without any backend).
5. **Defer:** live Claude streaming, mem0/pgvector memory, Langfuse, Plaid, partner sharing infra (BACKEND-DEPENDENT).

---

## 7. Cross-document conflicts (flagged for lead)

1. **Composite weights:** 40/30/30 (tech doc API engine) vs 35/35/30 (roadmap locked + both calculator docx + current build). Current build matches the locked canonical value; tech doc is outlier.
2. **Verdict model:** binary READY/NOT_YET with all-dimensions-≥70 gate (tech doc) vs 4-band READY/ALMOST THERE/BUILD FIRST/NOT YET at 80/65/50 (calculator docx) vs YES/NOT YET/WAIT (Master Plan §2.1). Needs product decision.
3. **Revenue model:** agent-commission flywheel 15–25% (tech doc) vs "NEVER referral fees, zero conflict of interest, subscriptions only" (both calculator docx). Direct contradiction — likely different eras of strategy.
4. **Companion shape:** 3 named animal characters (Character Specs, README) vs "not characters, identity configuration" (Claude, ChatGPT). Claude/ChatGPT are newer strategic direction; specs remain the best voice-layer content.
5. **Stack:** Next.js 14 + Supabase + Stripe (tech doc) vs Next.js 15 + Postgres/pgvector + Plaid (roadmap) vs current React/Vite/localStorage build.
6. **Premium pricing:** $9.99/$19.99 Plus/Pro (tech doc, calculator docx) vs $14.99 single premium tier (roadmap Stage 3).
7. **Dimension naming:** Financial Reality / Emotional Truth / Perfect Timing everywhere, but tech doc weights PT factors 35/30/35 while calculator docx uses 40/40/20 point splits — different sub-factor distributions.
