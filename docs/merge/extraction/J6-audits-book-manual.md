# J6 Extraction — Audits, Deployment Guides, AI Architecture, Research Report, Complete Book, Readiness Intelligence Manual

Sources:
- A. `HoMI_Master_Finance_Audit.pdf` — "HoMI Strategic Audit v2.0, Psychology-First Edition" (Dec 2025)
- B. `HOMI-Platform-Audit-Deployment-Guide.docx` — "Complete Platform Audit, Screen Map, and Deployment Guide v2.0" (Feb 2026)
- C. `homi-deployment-guide.docx` — "HōMI React Native Application Deployment and Execution Guide v1.0" (Feb 2026)
- D. `HōMI Decision Readiness Platform_ Website Audit and AI Architecture Build Plan.pdf` — website audit + self-hosted AI build plan
- E. `Research Report.pdf` — "HōMI strategic audit and architecture blueprint" (April 19, 2026) — supersedes/corrects D in several places
- F. `HōMI_THE_COMPLETE_BOOK.pdf` — canonical brand/product book, 55 numbered sections (~36K chars)
- G. `HOMI_TECHNOLOGY_THE_READINESS_INTELLIGENCE_MANUAL.html` — 1.6MB but only ~38K chars of text (rest is embedded base64 brand images + CSS); section inventory is ~95% identical to F (F states it was generated from this artifact)

Tags: **BUILD-READY** (spec complete enough to implement) / **NEEDS-DESIGN** (concept named, UX/logic unspecified) / **DUPLICATE** (already in existing build or repeated across docs) / **BACKEND-DEPENDENT** (needs infra: Plaid, LLM API, cron, etc.)

Existing build baseline (per lead): Readiness score (35/35/30 engine + compass), budget dashboard, transactions, investments, goals & analytics.

---

## 1. AUDIT FINDINGS — every concrete bug / gap / recommendation (prioritized)

### 1.1 Website bugs (from D, confirmed by E) — all BUILD-READY (marketing site)
Ranked by impact-to-effort in D; E re-ranks with Shadow Score first.

1. **Counter hydration bug (CRITICAL BUG).** Animated stat counters render "0% told to wait / 0% regret / $0.0T in decisions" in static DOM — Google, screen readers, and JS-disabled users see zeros. "The most-viewed content on the page." Fix: hydrate counters from static final values (SSR fallback). One-line component fix. [D#1, E#7]
2. **Missing tagline.** "Your homie, not your banker" appears nowhere on homepage. 15-minute fix, outsized brand impact. [D#2, E#5]
3. **35/35/30 weighting invisible on homepage** (only on /homi-score). Surface as labels in the three dimension cards. [D#3]
4. **No inline email capture** on homepage — "60–80% intent leak" for a pre-launch brand. [D#4]
5. **Double CTA conflict.** "Get Your HōMI-Score" vs "Join the Waitlist" signal mutually exclusive product states. Pick one per product stage. [D#5, E#4]
6. **Waitlist social proof buried** ("2,847 people") — move next to primary CTA. NOTE: F blocks publishing unverified waitlist counts until evidenced. [D#6; F-51]
7. **No product screenshot** — ship one real HōMI-Score screenshot (78, "Almost There"). [D#7]
8. **Sub-pages unindexable.** /about, /why, /how-it-works, /homi-score client-rendered without SSR; only homepage indexed in Google. Fix with generateMetadata + server components; ship sitemap.xml, robots.txt. "Fixable in a day… highest-ROI technical fix." [D#8, E#10]
9. **No JSON-LD** (Organization + SoftwareApplication schema in layout.tsx). [D#9]
10. **No founder presence** — About page w/ Cody Short photo + 3-paragraph origin story. [D#10, E#8]
11. **Voice too corporate** — rewrite FICO comparison + verdict sections in first-person "homie" voice. [D#11]
12. **No case-study vignette** (fictional-labeled-illustrative is acceptable per D; F requires explicit "fictional" labels). [D#12, G]
13. **Unverifiable stat citation** — "63% regret" cites "Qualtrics Consumer Decision Study"; needs year + link or replacement. [D#13]
14. **No custom OG image** (1200×630, "Will You Be Okay?" + wordmark). [D#14]
15. **Brand-integrity sweep needed** — DevTools pass for stray purple/pink; confirm Inter/Fraunces/DM Mono loaded. [D#15]
16. **No trust/security strip** under closing CTA ("never sell your data; advisor can't see your score"). [D#16]
17. **"26+ decision types across 6 phases" claim has no supporting surface** — enumerate on /how-it-works. [D#17]
18. **No manifesto /why page** (category-creation brands need one). [D#18]
19. **Placeholder legal pages** — real /privacy, /terms, /disclaimer content required for a financial-decision AI. [D#19]
20. **No score-generation demo** (Lottie/SVG) above FICO comparison — biggest credibility multiplier, ~2 wks. [D#20]

### 1.2 Product-messaging gaps (E, ranked top-10)
1. **Shadow Score / Guest Mode missing** — 3-question anonymous mini-assessment returning directional verdict before signup. "Single biggest funnel break"; creates Zillow-Zestimate-style shareable artifact. **BUILD-READY** (Week 2 spec in E). [E#1]
2. **No /guides content hub** — 20–40 posts targeting long-tail readiness queries ("am I ready to buy a house after [job change/divorce/layoff/kid]", "readiness checklist 90 days/6 months/1 year out", city-level "is now the right time to buy in [Austin/Denver/Raleigh]"). "Single clearest growth lever." NEEDS-DESIGN (content program, not code). [E#2]
3. **Post-verdict action layer invisible** — for ~70% non-READY users "the public promise collapses at the judgment moment." Show concrete 3-step Build First plan with dollar amounts + timelines on marketing pages, not just in-product. **BUILD-READY** (Week 4 spec in E). [E#3]
4. **Six-vertical parade premature** — five "Coming Soon" verticals dilute the Home wedge; collapse to one line. [E#9]
5. **Mobile 3D score breakdown** — if decorative, replace with performant 2D touch-draggable radial/stacked bar on mobile. NEEDS-DESIGN. [E(f)]

### 1.3 Product/engine gaps (from A — Psychology-First audit)
Core thesis: "Standard budgeting apps are psychologically backwards. They show precision because users think they want it, but precision triggers overspending." 70%+ of budgeting-app users quit within 3 weeks. Behavioral findings: certainty effect (exact balance = spending target), mental-accounting trap, month-end cliff (days 22–30 spending spike), guilt-as-accelerant (shame → comfort spending), coaching beats apps 2–3× (RCT).

Feature inventory with implementation detail (all NEEDS-DESIGN → partially spec'd in A §4; most are BACKEND-DEPENDENT on transaction data):
- **TIER 1:** Blind Budget Mode (range display "$400–$600", 2-tap precision unlock, randomized visibility, weekly windows); Permission System ("Can I spend $40…" request flow, Approved/Not Yet/Ask Partner, decision log not transaction log); Certainty Breaker (auto-hide balances days 22–30, signal-only mode, day-25 auto-sweep of 80% remaining discretionary → savings, Protect mode); Safety Margin Framing (never "failed", always "buffer absorbed $150"); Single Envelope (one discretionary pool, no sub-categories); Daily Money Minute (60-sec lockscreen/widget ritual: Signal + 1 pending decision + streak).
- **TIER 2:** Micro-Coaching Moments (4 trigger/response pairs spec'd); Decision Reputation Score (follow-through rate, regret signals, improvement velocity 30/90/180d, calibration accuracy — metrics spec'd); Grace Periods (4 trigger/auto-response pairs spec'd, incl. "recovery mode").
- **PANEL ARCHITECTURE:** COMMAND (Signal, Permission, Intent Router, Money Minute, Leak Detector), MINDFUL (Behavioral Genome v2, Reputation, Grace, Coaching, Narrative Playback/"Flight Recorder"), IMPULSE (Blind Budget, Certainty Breaker, Single Envelope, Rebellion Defuser, Safety Margin), NETWORK (Money Circles, Shared Signal couple mode, Family Financial OS, Gift Pools, Trust Graph), OUTCOMES (Outcome Network, Regret Engine), STRATEGY (calculators, Monte Carlo, Digital Twin).
- **Roadmap:** 4 phases × 6 weeks (Psychology → Behavior → Relational → Intelligence) with per-week deliverables and success metrics (Week-3 retention 70%+, decision-quality, household adoption 40%+, 10K+ verified outcomes, 73% NOT-YET rate).
- **Voice reframe table** (6 old→new pairs) + 5 messaging principles ("Never shame/precision/reactive/individual/track").
- Already-built claims in A (per that doc, not current repo): Monte Carlo engine (10K scenarios, Box-Muller), Trinity Engine (Advocate/Skeptic/Arbiter), Temporal Twin, HoMI Score, Behavioral Genome (9-dim), Plaid, 37+ calculators across 6 life phases, 7 tax/retirement tools (Roth conversion, SS claiming, IRMAA, widow's penalty, RMD…). → These are mostly **DUPLICATE** of existing build or unverified; F's Product Status Ledger says VERIFY before claiming.

### 1.4 Platform audit findings (B)
- Codebase snapshot: Next.js 14 App Router + React 18, Supabase, Stripe (+Connect), Plaid, Claude API, Tailwind, Vercel + Expo/EAS. 109 files / 11,857 LOC / 26 pages / 30 API routes / 17 lib services / 12 components / 6 SQL schemas.
- Complete screen map (15 consumer + 6 developer + 5 admin pages, routes + line counts), 30-endpoint API map (11 public v1 + 19 internal incl. 5 cron routes), 7 user flows (assessment, Plaid-enhanced, emotional deep-dive, partner alignment, developer onboarding, advisor marketplace, billing).
- Edge-case/state matrix spec'd (loading skeletons, empty states, API/auth/payment/Plaid errors, offline PWA, 429 rate-limit, tier gating, partner-waiting, 4 verdict states). **BUILD-READY** as QA checklist.
- Moat features flagged showcase-only (not production): Decision Intelligence Network, Temporal Twin Simulation, Emotional Fingerprint, Outcome Tracking, Readiness Certification — all NEEDS-DESIGN/BACKEND-DEPENDENT.
- Expo/React-Native conversion plan: folder structure, component conversion map (div→View etc.), 4-tab navigator. DUPLICATE of C; mobile deferred per F-41.

### 1.5 Book/Manual operational findings (F, G)
- **Product Status Ledger (F-24):** Brand=CANON; Marketing site / Scoring engine=VERIFY; Dashboard=PARTIAL/VERIFY (confirm real data, not mocks); Payments=BLOCKED until Stripe live-verified; Report/PDF=PATH DECISION REQUIRED; AI companion=PLANNED/VERIFY; B2B API=VISION/PLANNED.
- **PR Reconciliation (F-26):** PR #172 (security/Sentry/encryption/API hardening) verify-then-merge; PR #183 (payments/report blockers) fix/rebase; PR #179 (large launch-lanes) split or heavily verify.
- **Risk Register (F-35):** credit-score-replacement language (Critical), lender prequalification framing (Critical), exact scoring weights exposed (High), fake metrics (Critical), AI-gives-advice (Critical), large-PR merge (High).
- **Launch Gates (F-46):** 11 gates incl. Stripe live, report path, legal pages, env vars, health check, E2E main flow, dashboard real data, AI fallback without API key, no service-role exposure, RLS audit.
- **Red-Team checklist (F-55):** 12 NEEDS-REVIEW items (Unicode ō, wordmark colors, dark-first, compass structure, no formula exposure, no advice language, no fake metrics, confirmed/planned/vision separation, "not yet is not no", AI-explains-not-calculates, disclaimers, claim review).
- **30-Day Execution Plan (F-47):** W1 production control; W2 Stripe+report; W3 calculators+AI guardrails; W4 launch hardening.

---

## 2. DEPLOYMENT GUIDES — production infrastructure requirements

### 2.1 From B (web platform, Next.js) — BUILD-READY runbook
- **Backend/DB:** Supabase (PostgreSQL + Auth + Realtime). 6 migration files in order: schema.sql → schema-phase2.sql → rls-policies.sql → migration-phase2-3.sql → phase3-migration.sql → phase4-migration.sql. **17 tables** (users, assessments, scores, emotional_assessments, partner_sessions, score_history, agents, api_keys, api_usage, webhooks, advisors, advisor_connections, advisor_reviews, plaid_connections, plaid_extractions, scoring_models, receipts), all RLS-enabled, least-privilege; agents via service role + API-key middleware; advisors read connected-user scores with consent; receipts publicly verifiable by receipt_id.
- **Auth:** Supabase email/password + Google OAuth; callback route, auth context, session-refresh middleware.
- **Hosting:** Vercel (Next.js preset, Node 18.x); custom domain via CNAME; branching main/dev/feature/hotfix; GitHub Actions for ESLint, Supabase migration dry-run, bundle size, Playwright E2E.
- **Cron (vercel.json):** market-refresh every 6h; digest Mon 9am; commission-payout monthly.
- **Env vars (12 required):** NEXT_PUBLIC_SUPABASE_URL/ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET/PUBLISHABLE/WEBHOOK_SECRET, PLAID_CLIENT_ID/SECRET/ENV, ANTHROPIC_API_KEY, RESEND_API_KEY, NEXT_PUBLIC_APP_URL.
- **Mobile:** Expo + RN Web single codebase; app.json/eas.json configs provided; EAS build/submit commands.
- **Seeding + smoke-test script** provided (signup → assess → dashboard → Plaid sandbox → Stripe test card → API docs).

### 2.2 From C (React Native/Expo app) — BUILD-READY but mobile-deferred (F-41)
- Expo SDK 50, React Navigation v6, Supabase, Vercel (expo export:web), EAS Build. 35 screens in 4 sections: Dashboard (API mgmt, analytics, billing), Intelligence (HōMI Score, Temporal Twin, Decision Memory), Companion (Witness Circle, Partner Mode, Permission), Evolution (Regret Guarantee, Inheritance, Anti-Pattern Blocking).
- Minimal 3-table schema (profiles, decisions, api_keys) + RLS policies (SQL included).
- Accounts needed: GitHub, Supabase, Vercel, Expo, Apple Developer ($99/yr), Google Play ($25).
- Env: EXPO_PUBLIC_SUPABASE_URL/ANON_KEY (+optional SENTRY_DSN, analytics ID).

### 2.3 Reconciled stack (F-42, canonical)
Next.js App Router + React + TS strict; Supabase+RLS; Stripe; Plaid; Resend; PostHog + Vercel Analytics; Anthropic AI layer; Zod; Vitest + Playwright (+Sentry, Framer Motion per F-53). Validation commands: check-env, lint, typecheck, test, build, test:e2e, audit:rls, brand:audit. **DUPLICATE** of B with PostHog/Sentry additions.

---

## 3. AI ARCHITECTURE BUILD PLAN — specified features, models, flows

Two competing visions; F-52 reconciles them (Claude-first MVP, self-hosted as scale option).

### 3.1 Vision A: self-hosted 3-tier stack (D) — BACKEND-DEPENDENT, scale-phase
- **14 specialized agents, 3 layers:** Homie orchestrator (only user-facing voice); 3 dimension pods (Reality/Heart/Timing ↔ 35/35/30); domain specialists Dwell (housing), Ride (vehicles), Everyday (<$500), + Career/Kin/Grow/Debt in v1.5; cross-cutting Memory + Guardrail. MVP ships 5: Homie, Reality Check, Gut Check, Timing, Memory — Housing vertical only.
- **Models:** Qwen3-32B (reasoning/math, vLLM, H100 FP8; escalate DeepSeek-R1-Distill-Qwen-32B); fine-tuned Gemma-3-12B or Llama-3.1-8B LoRA on EmpatheticDialogues+custom data (warmth, L40S); Qwen3-4B router on SGLang; BGE-M3 embeddings + BGE-reranker-v2-m3.
- **Orchestration:** LangGraph + Postgres checkpointer; Pydantic AI tool validation; DSPy offline prompt optimization; Langfuse self-hosted tracing; interrupt() for human-in-the-loop gate >$50K or any home purchase.
- **Memory (the moat):** Mem0 self-hosted + Postgres + Qdrant (+optional Graphiti temporal graph). 5-partition schema: financial_facts (versioned), past_decisions (decision→reasoning→outcome→lesson), emotional_patterns, life_events, preferences. Weekly summary-extraction cron. RAG: hybrid dense+BM25 fused RRF, rerank 20→5, HyDE; pgvector phase 1 → Qdrant at ~5M vectors.
- **Scoring with honesty dampener:** agents emit (score 0–100, confidence 0–1, evidence[], gaps[]); HōMI_raw = .35·Reality + .35·Heart + .30·Timing; HōMI = raw × (0.7 + 0.3·min(confidences)) — min not mean, to kill false-confidence. Verdict bands: Ready 80–100 / Almost There 65–79 / Build First 50–64 / Not Yet 0–49. Score on tap ("show the math"), never the lead. **BUILD-READY formula** — candidate to upgrade existing engine.
- **Data integrations (MVP six):** Plaid (Transactions+Enrich+Income+Recurring), Array (soft-pull credit), Stripe Identity (KYC $1.50), ATTOM (property), HouseCanary (AVM+36-mo forecast — Timing agent input), FRED/BLS/Census (free macro). DELETED: Zestimate (API dead), Edmunds (use MarketCheck/VinAudit). CFPB 1033 enjoined Mar 2026; JPMC↔Plaid fees → architect aggregator-agnostic (Akoya fallback).
- **Guardrail agent — 5 hard rules:** no specific securities (ticker+verb trigger list); no moralizing (banned phrases listed); mandatory Devil's Advocate when sentiment >0.7 positive AND Reality <70 (sycophancy circuit-breaker); vulnerability detection (divorce/layoff/grief/DV/self-harm → downshift, defer verdicts, surface 988/211/NDVH); immutable ClickHouse audit log, 7-yr retention.
- **FCRA-by-accident warning:** if Emotional Truth score is ever used by third parties, HōMI becomes a Consumer Reporting Agency — hard policy: scores consumer-eyes-only, in ToS + SOC 2 controls.
- **Security controls:** TLS 1.3, per-tenant AES-256 envelope encryption, Microsoft Presidio PII redaction sidecar in LiteLLM proxy, LLM Guard, Vault, Vanta/Drata day one; SEC Reg S-P amendments (30-day breach notification etc.).
- **Cost model:** MVP ~$3.3–4.8K/mo infra + ~$3–3.50/user/mo API (≈$6–8/user total); 100K users ≈$30.8K/mo (≈$0.015/decision, $2.20–2.50/user). **Pricing floor: $8–12/mo; "$5/mo pure consumer is a losing business."**
- **Phases:** P1 prototype days 0–30 (3 hardcoded agents, RunPod serverless, 50-user closed alpha); P2 production days 30–120 (reserved+spot GPUs, Qdrant, LoRA tune, SOC 2 Type I, HITL >$50K, 500-case gold eval set, 5K MAU); P3 scale months 4–12 (100K users, SOC 2 Type II, 4 verticals, SGLang router, Graphiti).

### 3.2 Vision B: Claude-first (E — explicitly corrects D's self-host-first instinct)
- **Rule: self-hosting below ~$5K/mo Claude spend costs MORE, not less** (always-on H100 ≈$1,700/mo before one user). Introduce Qwen3-32B on Runpod Serverless only after ~10K MAU.
- **Stack:** Next.js 14 + Vercel AI SDK 5/6 + Claude Sonnet 4.6 (user-facing) + Claude Haiku 4.5 (grunt work, Batch API 50% off, system-prompt caching 90% input discount) + pgvector on Supabase (sufficient for years; don't add Qdrant/Pinecone) + Inngest durable functions (>13-min jobs, scheduled follow-ups) + Superagent Guard (PII redact/prompt-injection, MIT, native AI-SDK plugin) + Helicone observability. Sonar API for grounded financial citations. LlamaParse as a tool for bank statements/1099s.
- **Triad+2 agent model:** The Homie (coordinator/persona, Sonnet), Auditor (Financial Reality 35%, Haiku/background-capable), Mirror (Emotional Truth 35%, always Sonnet — "most likely to say no, must feel human"), Oracle (Perfect Timing 30%, Sonnet + tools/Sonar), Council (synthesizer, Opus only for life-altering). Specialists return Zod-typed objects, Homie composes prose.
- **Decision-magnitude routing (cost caps):** Micro <$200 → Homie only (<$0.002, <1s; Shadow Score lives here); Small $200–5K → Auditor only (<$0.02); Major $5K–50K → full triad + Council (<$0.30); Life-altering $50K+/irreversible → triad + Opus Council + Inngest follow-ups days 7/30/90 (<$2). **BUILD-READY routing spec — strong build-add.**
- **Escalation rules (spec'd):** insufficient data → Plaid reconnect request; externally-forced decision → 72-hr revisit offer; market volatility >2σ → "consider waiting", 7-day cooling period for life-altering; low confidence on life-altering → Opus + human review queue.
- **Data access matrix** (per-agent least-privilege table) — "the technical substrate for your privacy marketing claim. Document it publicly."
- **Interaction model:** 1° in-app streaming chat; 2° proactive email/SMS nudges (weekly Sunday-night Build-First check-in: "emergency fund $3,100→$4,400, you're on pace" — the re-engagement loop); 3° shareable HōMI-Score Card OG image (/og/score/[id]); DEFER browser extension + voice.
- **Costs:** 1K MAU ≈ $300–900/mo all-in; 10K MAU ≈ $3–7K/mo.
- **Privacy claim basis:** Anthropic Commercial Terms (no training on API data) + 7-day default retention + ZDR addendum (request from sales early — affects privacy-policy wording) + local redaction ⇒ "We can't sell your data. We built it that way" is defensible. Gotcha: never paste prod data into consumer claude.ai.
- **Ecosystem corrections (delete from any roadmap):** Claw family (OpenClaw/Goclaw/ZeroClaw/NanoClaw — personal daemons, wrong category; use Claude Agent SDK directly if wanted); Manus (Meta acquired Dec 2025 — radioactive for privacy positioning); SuperAGI OSS (dead); TGI (maintenance mode); Fly.io GPUs (deprecated Aug 2025); CrewAI (Python-only); AutoGen (maintenance mode); Llama license prohibits "unauthorized professional advice" in finance — legal sign-off required.
- **6-week MVP plan:** W1 homepage fixes + AI SDK scaffold + ZDR request; W2 Shadow Score + OG endpoint; W3 full triad assessment engine + verdict UI; W4 action layer (3-step Build First plans + Sunday check-ins) + /guides scaffold + 5 hand-written guides; W5 Stripe + magnitude router + 3 life-event branches + 10 guides; W6 trust pages ("How we make money"), testimonials, launch PH/HN.

### 3.3 Book reconciliation (F-52) — canonical decision
MVP = Claude Sonnet-class via Vercel AI SDK; Haiku-class for routing/classification; Supabase+pgvector first; Inngest durable runs; PII redaction + injection defense + schema validation + refusals + audit logs. Scale options (Qwen self-host, Qdrant, LangGraph supervisor) only when thresholds justify. Agent guardrails table (Homie/Reality Check/Gut Check/Timing Advisor/Guardrail with "cannot be bypassed"). **DUPLICATE** of E's recommendation, canonized.

---

## 4. RESEARCH REPORT (E) — new data/claims beyond known set
(Known already per lead: 73% NOT YET, TAM conflicts, FICO stats, regret stats.)

- **Cleo:** $250M+ ARR, 1M+ paid subs, voice+memory since Cleo 3.0 (Jul 2025); monetizes via cash-advance fees + interchange; **paid $17M FTC settlement** for misleading cash-advance disclosures.
- **Rocket Money:** sued Jan 2026 ("perpetual loop of illegal referrals and kickbacks"); CFPB's 2024 case dropped under current administration; **$234M net loss 2025** despite purchase-mortgage share growth.
- **OpenAI acquired Hiro Finance (Apr 2026)**, second PFM acqui-hire after Roi (Oct 2025) — "HōMI's largest existential threat"; defense = voice + judgment horizon ("IF, not HOW").
- **Origin Financial:** registered as RIA Sept 2025; $99/yr + $119/CFP session — structural conflict (validates HōMI non-RIA stance).
- **Monarch** $99/yr no free tier, no AI story; **YNAB** no AI; **Empower** free-to-AUM conversion conflict; **Facet** $2,600–8,700/yr; **Arta** accredited-only.
- **Home-readiness niche is empty:** NerdWallet article, Readynest trivia quiz, Tomo origination, Zillow/Rocket one-dimensional DTI calculators — "nobody occupies the three-dimensional, emotionally-aware 'tell me IF' slot."
- **Anthropic data terms:** default retention 30→7 days (Sep 2025); ZDR addendum removes at-rest storage; HIPAA BAA available; consumer claude.ai changed to opt-in training default Sep 2025.
- **Infra market facts:** vLLM ≈2–5× Ollama throughput, 1.5–1.8× TGI; Runpod Serverless H100 $2.39–3.29/hr; Vercel Fluid Compute limits (300s Hobby / 800s Pro); Hetzner RTX 4000 Ada €184/mo.
- **Mem0** beats OpenAI memory by 26% on LOCOMO, sub-2s p95 (from D).
- **3 messaging angles w/ proof-point requirements + risks:** "The first AI that tells you no" (churn risk → Build First layer mitigates); "Will they pay? vs. Will they be okay?" (FICO legal pushback risk → complementary-not-replacement language); "Elite AI firepower on your side" (overclaim risk → inform-not-advise disclaimers).
- **5 drafted privacy marketing statements** (hero-copy length, technically honest) + language-to-avoid list ("bank-level security" etc.).
- **Tagline verdict:** keep "Your homie, not your banker"; add expansion line "For every decision money touches"; alt "The only AI in your corner." ICP 25–40.
- **70%+ budgeting-app churn within 3 weeks** (A); certainty-effect/mental-accounting/month-end-cliff/guilt-accelerant behavioral findings (A §2) — these underpin Tier-1 features.
- **Blocked/unverified claims (F-23, F-51):** waitlist counts, regret stats, outcome metrics, testimonials — may NOT be published until verified. Treat E/D external stats as internal audit inputs only.

---

## 5. THE COMPLETE BOOK (F) — frameworks, named concepts, in-app candidates

### 5.1 Canonical frameworks (mostly DUPLICATE of existing build)
- **Threshold Compass:** outer cyan orbit = Financial Reality, middle emerald = Emotional Truth, inner yellow = Perfect Timing, yellow keyhole center in smaller yellow ring, offset orbital nodes (NOT cardinal tick marks, NOT nautical compass); slow calm motion, respect prefers-reduced-motion. (F-11, F-50; G corrects: use exact uploaded website compass image.) Wordmark: H #22d3ee · ō #34d399 · M #facc15 · I #22d3ee; dark-first UI; real Unicode ō U+014D.
- **Three Pillars** w/ canonical question each: Financial Reality ("absorb without destabilizing?"), Emotional Truth ("clarity, or fear/pressure/urgency/avoidance/external expectations?"), Perfect Timing ("does this moment support the decision?"). Weights internal-only.
- **HōMI-Score:** 0–100 deterministic; **"AI explains the score. AI does not calculate, invent, or override the score."** (F-08 critical rule.)
- **Verdict system:** READY (calm, not hype) / ALMOST THERE (encouraging+specific) / BUILD FIRST (roadmap, not shaming) / DO NOT PROCEED–NOT YET (firm, protective, human). "Not yet is not no. It is clarity. It is protection."

### 5.2 Named concepts → in-app feature candidates
- **8-stage How-HōMI-Works flow** (Arrival→Onboarding→Assessment→Scoring→Verdict+Explanation→Action Plan→Dashboard Loop→Optional Outcome Tracking). DUPLICATE of existing, minus outcome tracking. [F-08]
- **Transformation Path** — "how HōMI makes Not Yet useful"; turns protective verdict into build-first roadmap. "Build First is not failure. It is the map." **BUILD-READY concept; pairs with E's Week-4 action layer.** [F-17]
- **Results Page spec (9 elements):** score+verdict, pillar breakdown, plain-language explanation, top strengths, top gaps, hard stops, build-first plan, retest guidance, disclaimer. **BUILD-READY checklist.** [F-15]
- **Dashboard module spec (6):** current readiness, pillar breakdown, action plan, readiness history, report center, AI companion. Mostly DUPLICATE; report center + AI companion new. [F-16]
- **AI Companion roster w/ hard boundaries:** Homie (warm, no conversion pressure), Reality Check (no mortgage/investment/product advice), Gut Check (not a therapist), Timing Advisor (no certainty claims), Finance Planner (calculator-backed education only), Guardrail/Auditor (cannot be bypassed). [F-18]
- **23-calculator Finance Suite roadmap w/ phase + legal-risk tiers:** MVP 10 (Cash Flow Sufficiency, Savings Rate, Emergency Buffer, DTI, Housing Affordability, PITI, Closing Cost, Down Payment Timeline, Debt Payoff Prioritizer, Net Worth Snapshot); Phase 2 (Emergency Fund Target, Rent vs Buy, Maintenance Reserve, Property Tax/Insurance, Major Purchase Decision Matrix, Outcome Follow-Up Tracker); High-risk (Mortgage Readiness Estimator, Risk Comfort Tool, College Savings, Tax Scenario — "legal/compliance review required"); Future (Net Worth Trajectory, Retirement Readiness, Business Expansion Cash Flow). **BUILD-READY list; risk-tiering is the novel part.** [F-19]
- **B2B Readiness Platform (5 safe use cases):** pre-application education, consent-based readiness summary, gap analysis, **Readiness Receipt** (verifies what guidance shown + when), partner education flow. Never underwriting/prequalification. BACKEND-DEPENDENT/NEEDS-DESIGN. [F-20]
- **Shadow Score** (arrival entry point, F-08/F-51) — see E Week 2 spec. **Top BUILD-READY acquisition feature.**
- **Voice-of-Customer style lines (6)** — copy direction, NOT publishable testimonials. [F-30]
- **Messaging use/avoid table + 6 hero options + founder pitch lines** — copy canon. [F-31/32/33]
- **"What HōMI Should Never Say" table (9 pairs)** — maps directly to Guardrail-agent banned-phrase list; **BUILD-READY as lint/test rules for AI output.** [F-34]
- **Analytics/Admin/Marketing/Partner dashboard specs:** Marketing tracks Shadow Score starts/completions, verdict distribution, A/B tests (BUILD-READY event list); Partner dashboard must not become underwriting tool. [F-37–40]
- **Build-system discipline (F-53):** 33 prompts/11 phases, dependency order (infrastructure→contracts→auth→security→scoring→UI→journey→revenue→hardening), one prompt at a time, WHEN/WHY/HOW per prompt, checkpoint gates, commit-per-prompt rollback.
- **Report/PDF path decision (F-29):** Path A print-to-PDF v1 (labeled, secured) vs Path B true server-side PDF; auth+ownership+no-store+disclaimer rules. BACKEND-DEPENDENT.

### 5.3 Verdict philosophy (canon)
Decision Companion, not advisor; enters BEFORE the commitment; "Structural honesty is the product"; protective > persuasive; deterministic score + AI explanation only; educational-guidance-only disclaimer everywhere; fictional examples must be labeled; confirmed/planned/vision always separated.

---

## 6. READINESS INTELLIGENCE MANUAL (G) — inventory & unique content

**Module inventory (54 sections, ids):** exec, problem, identity, not, category, positioning, flow, journey, brand, compass, pillars, score, verdict, results, dashboard, path, ai, finance, b2b, moat, data, claims, status, release, prs, security, payments, report, voice, messaging, heroes, pitch, never, risk, legal, analytics, admin, marketing, partner, mobile, tech, commands, claude, codex, launch, plan, sourceaudit, canonicalcompass, siteaudit, aiaudit, buildsystem, deployment, redteam → **maps 1:1 to Complete Book chapters 01–55 (DUPLICATE — F was generated from G).** The 1.6MB size is 7 embedded base64 brand images (compass reference PNG/WebP, wordmark JPEG) + 17KB CSS design tokens (navy/cyan/emerald/yellow palette, Inter/JetBrains Mono).

**Content unique to G (not in F verbatim):**
1. **Compass correction directive:** canonical compass = exact cropped upload of website reference image; "do not replace with generic SVG approximations"; offset orbital nodes, no nodes on inner yellow orbit, compact glowing keyhole. (G-50)
2. **"System / Question it usually asks / What may be missed" 4-row table** (Lenders/Calculators/Marketplaces/HōMI) — appears in F-02 but G is the source; **BUILD-READY as landing-page/“why” content.**
3. **"Fictional scenario pattern" rule** — fictional examples allowed if explicitly labeled; never as testimonials/traction. (G-02)
4. Internal-reference framing: "THE READINESS INTELLIGENCE MANUAL · INTERNAL REFERENCE" + per-section status banners ("CANON IMPLEMENTATION STATUS MUST BE VERIFIED", "ROADMAP LEGAL/COMPLIANCE REVIEW REQUIRED FOR HIGH-RISK TOOLS", "VISION / PLANNED DO NOT FRAME AS UNDERWRITING") — a **status-labeling convention worth adopting in-product and in docs.** BUILD-READY as governance convention.

**Specified-but-not-built (across G/F, vs. existing build):** Shadow Score, Transformation Path/action plan, report center (PDF path), AI companion w/ guardrails, outcome follow-up tracker, B2B readiness receipts, partner dashboards, admin question-bank/prompt/guardrail management, marketing analytics funnel.

---

## 7. CROSS-DOC CONSISTENCY NOTES
- D and E **conflict on self-hosting timing**; E (later, Apr 2026) + F-52 canon win: Claude-first MVP, Qwen at >$5K/mo spend. Both agree on: 14-agent/triad+Homie taxonomy, Guardrail agent, magnitude/cost discipline, memory as moat, non-RIA stance, Housing wedge first.
- A's psychology-first feature set (Blind Budget, Permission, Certainty Breaker, Single Envelope, Money Minute) is the **largest body of specified-but-unbuilt product** and directly targets the churn problem of the existing budget dashboard — but it inverts current dashboard philosophy (ranges not precision, invisibility not engagement). Needs a product decision before build.
- F blocks: publishing waitlist counts, regret stats, testimonials, outcome metrics; claiming live AI agents / complete finance suite / users / revenue / partners until repo-verified.
