# HōMI Companion — Intelligence Strategy Corpus Audit

**Scope:** systematic audit of five strategy artifacts provided by the founder on 2026-07-16,
reconciled against the shipped codebase (this repo) and the companion ecosystem blueprint
(`COMPANION-ECOSYSTEM.md`). Every file was read end-to-end.

**Audited artifacts:**

| # | File | Type | Lines/pages |
|---|---|---|---|
| 1 | `Ho_MI_Companion_Intelligence_Strategy_ChatGPT.md` | Strategy doc | 1,671 lines |
| 2 | `HoMI_Master_Roadmap_Bootstrap_to_Production.md` | Roadmap (dated 2026-04-25) | 635 lines |
| 3 | `HoMI_Companion_Architecture_Claude.md` | Architecture Brief v2 | 498 lines |
| 4 | `homi_companions_v2.html` | Character-based prototype | 1,338 lines |
| 5 | `homi50characterconcepts.pdf` | Screenshot export | 4 pages |

---

## 1. Verdict summary

The corpus is internally contradictory but converges on one strong answer. The two strategy
documents (files 1 and 3) agree on ~90% of principles: the Companion is a **readiness
intelligence layer** — deterministic score, AI as interpreter, confidence and source labels on
every claim, memory the user can inspect, consent-controlled sharing. The prototypes (files 4
and 5) represent an earlier **character-first** direction those documents explicitly reject.
The roadmap (file 2) plans an architecture that was never built as written.

Meanwhile, the shipped product already implements more of the strategy docs' foundation than
any of the documents acknowledge: deterministic server-authoritative scoring, AI-as-interpreter
with hard no-advice guardrails, server-side quota gates, deterministic fallbacks, and (as of
PR #19) a cross-surface context spine.

**Canon decision (founder, 2026-07-16):** intelligence-first core, *plus* each user gets to
pick/create their own HōMI — "HōMI like homie, a friend." Personal identity (name, style,
tone) is a first-class feature implemented as **configuration inside the brand-voice
envelope**, not a fixed character roster. This resolves the corpus's central conflict: the
intelligence layer is the product; the user-created identity is how it feels like a friend.

---

## 2. File-by-file audit

### 2.1 Companion Intelligence Strategy (file 1) — **ADOPT, with three carve-outs**

**Contains:** the definitive argument that "a character is cosmetic; a Companion Intelligence
layer becomes the product moat." Data architecture for companion context, update-frequency
classes, latency budgets, missing-data handling, B2B partner model, metrics system
(confidence, momentum, completeness, actionability, risk, alignment, shareability), MVP scope,
failure-mode catalog, ten operating principles, canonical state/response/report contracts.

**Sound and genuinely missing from the repo (adopted into the blueprint):**
- Data-state taxonomy: verified / self-reported / estimated / stale / missing / conflicting / revoked (§6).
- Confidence travels with every readiness claim (§11).
- Canonical `CompanionReadinessState` object as the single context backbone (§20).
- Explainability view — "why did this change" from structured state (§16).
- "What HōMI remembers" — inspectable, editable, deletable memory, fact vs. inference (§3E).
- Institutional share preview before any B2B exists (§14E).
- Partner report contract: consent timestamp, expiry, revocation, methodology version (§8, §22).
- Operating principles 1–10 (§18), especially "state before chat," "AI interprets;
  deterministic systems score," and "missing data is a first-class signal."

**Already satisfied by the shipped repo** (the doc treats these as future work; they are done):

| Doc requirement | Shipped implementation |
|---|---|
| Deterministic, auditable score; no LLM scoring | `lib/scoring/engine.ts`, weights contained in `lib/scoring/weights.ts` |
| AI explains, never advises; refusal rules | `app/api/advisor/route.ts` system prompt (no financial/legal/tax/mortgage/investment advice) |
| Chat grounded in structured state | `lib/advisor/context.ts` context spine (assessment + finance + surface) |
| Server-authoritative gating | `lib/advisor/quota.ts` (`gateCompanion()`), `lib/entitlements.ts` |
| Graceful AI-outage behavior | `lib/advisor/fallback.ts` deterministic persona fallback |
| Dashboard never waits on live AI (§5) | AI surfaces are opt-in chat/letter/analysis; dashboards render structured state |

**Carve-outs:**
- **A — Identity.** §16/§24 say "configuration, not character creation." The founder's canon
  decision overrides the anti-personality absolutism: naming and shaping your own HōMI is IN,
  as the warmth layer on top of the intelligence layer. The doc itself permits "optional
  personality underneath" (§16), so this is a tension resolution, not a contradiction.
- **B — Scoring.** Confidence bands and momentum are adopted as **additive metadata only**.
  The scoring canon (35/35/30 pillars, verdict thresholds, four hard stops) is frozen per
  `BUILD-BRIEF.md`. Nothing in this audit changes how the score is computed.
- **C — B2B timing.** Partner sharing enters the blueprint as Phase 4+ direction. The repo has
  no partner-report infrastructure today; the §9 API shape is design-for-compatibility, not a
  build order.

### 2.2 Master Roadmap: Bootstrap → Production (file 2) — **SUPERSEDED as an execution plan; strategic skeleton salvaged**

**Contains:** six stage-gated phases from brainstorm to 1.0 GA — 8-week demoable build, CRA-grade
compliance foundation, institutional beta, public beta, GA, launch — plus cross-cutting
workstreams, hiring plan, capital gates, and a risk register.

**Why superseded:** it describes a build that did not happen as written. Divergences from reality:

| Roadmap assumption | Actual shipped state |
|---|---|
| Repo `HōMI_Dev_Master`, later split | `Homi-Tech-Production-`, single Next.js 15 app |
| Separate scoring service in `apps/scoring/` | `lib/scoring/` inside the app (server-only, weights contained) |
| mem0 + pgvector relationship memory | No vector memory; threads in sessionStorage/localStorage (see T2.6) |
| Inngest queues, AWS KMS, mTLS, VPC isolation | Vercel + Supabase; AES-256-GCM token encryption in `lib/plaid/crypto.ts` |
| Auth provider open (Clerk vs Supabase) | Supabase Auth, shipped |
| "Sonnet 4.6 / Opus 4.7 / Haiku 4.5" routing | `claude-sonnet-4-5`, single model, direct fetch |
| Week-2 real Plaid build | Plaid shipped (`lib/plaid/`, migration 00017), transactions table still pending |

**Salvaged into the record (as strategy, not commitments):** stage-gate discipline
(metrics-gated progression, go/no-go matrices); the risk register (FCRA classification,
trade-secret leak, Plaid concentration, disparate impact, FICO 10T / VantageScore 4.0
absorbing the wedge); cost-discipline and brand-stewardship cross-cuts; retention gates
(D14 ≥30%).

**Flag:** the roadmap assumes "Architect Path A (CRA-grade)." The shipped legal posture
(`README.md`, `/legal/disclaimer`) is explicitly *not* a lender, RIA, credit bureau, broker, or
bank — educational only (Operate-B). CRA registration is an open founder-level business
decision with real operational burden. No repo document should assume it has been made.

### 2.3 Architecture Brief v2 (file 3) — **ADAPT: right principles, premature topology**

**Contains:** five-service architecture (ingestion / scoring / companion / compass /
institutional API), FCRA Path A/B legal analysis, trade-secret containment design, canonical
event model, latency budgets, adversarial-robustness measures, unit economics at 1M MAU, and
§7's companion-as-identity-configuration design.

**Adopted principles:**
- **P1 trade-secret containment as structure:** "no LLM ever sees the formula in a system
  prompt." The repo already complies — the advisor prompt receives score/verdict/pillar
  percentages and derived finance metrics, never weights. Now codified as a blueprint
  non-negotiable.
- **P3 three-component separation:** Score = asset, Companion = relationship layer, UI =
  surface. Maps to `lib/scoring/` / `lib/advisor/` + `/api/advisor` / components.
- **ReasoningTrail with `magnitude_band`, never numeric weights (§5)** — the future shape of
  the explainability view that can never leak scoring canon.
- **§7.1 identity-configuration table** — name (≤24 chars), visual identity within brand
  palette, tone and pacing sliders, focus areas, notification cadence, transparency depth.
  **This is the concrete spec for the founder's "pick/create your HōMI" decision.** What the
  user never configures: the math, verdict bands, weights, voice-rule floor.
- **§7.4 failure modes & recourse:** bad-advice feedback channel, out-of-scope detection
  (medical/legal/relational redirects), confidence on numeric claims.
- **§2.6 confidence-not-imputation** and **§2.7 adversarial robustness** (users will game
  readiness; the Companion explains, never negotiates the math).

**Not adopted now (recorded as scale-later triggers, not current plan):** microservice split,
gRPC/Protobuf contracts, ULID canonical event model, multi-aggregator failover, institutional
API gateway, 1M-MAU unit-economics table. Correct for a later company; premature inside a
single Next.js app.

### 2.4 Companions v2 prototype (file 4) — **SUPERSEDED as direction; three UX mechanics harvested**

**Contains:** a working single-file prototype with a fixed character roster — Steady the guide
dog, Clarity the dolphin, Horizon the owl — keyword intent detection, canned score-banded
response banks, a simulated score slider, milestone toasts, and a conversation-context bar.

**Why superseded:** both strategy documents explicitly reject the fixed-character direction,
and the shipped `/api/advisor` (real model, real user context, persona system, deterministic
fallback) already outclasses the canned-response engine. Notably, the roster's *emotional
jobs* survived into production: grounding (Steady) → Gut Check, analytical (Clarity) → Reality
Check, reflective (Horizon) → the homie/timing register in `lib/advisor/personas.ts`. The
animals died; the archetypes shipped.

**Harvested for the blueprint (as future UX, re-voiced to canon):**
1. **Milestone moments** — marking score-threshold crossings inside the Companion surface.
2. **Context bar** — one ambient line stating what the conversation has covered.
3. **Personality pacing** — reply cadence as part of identity configuration (maps to Brief §7.1).

**Conflict flag:** the prototype's milestone copy uses emoji and hype; shipped voice rules
prohibit both. Harvested mechanics must be re-voiced before use.

### 2.5 "50 character concepts" PDF (file 5) — **LOW-CONTENT / EVIDENCE ONLY**

**Finding:** this is not a concepts document. It is a 4-page screenshot export (dated
2025-10-18) of the claude.ai "HŌMI: Build-to-Launch Command Center" project page: chat history,
project file inventory, and the Ω-Mentor CTO project instructions. The only file *content*
captured is the first ~80 lines of CSS from `homi-50-character-concepts.html`, repeated on
every page. **The actual 50 character concepts are not in this PDF.**

**Actions:**
- Recorded as historical evidence of the character-era exploration.
- If the 50 concepts are wanted as a style palette for the "create your HōMI" feature, the
  source file `homi-50-character-concepts.html` needs to be provided — it was never uploaded.
- The screenshot also reveals other un-audited project files that may be worth reconciling
  later: `homi-complete-30-concepts.html`, `homi-companion-selection.html`, `Competitive
  Intelligence and Twitter Growth`, `Alpha AI Companion Analysis`,
  `HOMI-Brand-Strategy-and-Growth-OS.docx`, `HŌMI Brand Headquarters`, `HŌMI roadmap`.

---

## 3. Cross-document conflict matrix

| Axis | Strategy (1) | Arch Brief (3) | Roadmap (2) | Prototypes (4/5) | Shipped repo | **Canon resolution** |
|---|---|---|---|---|---|---|
| Identity | Configuration, not character | Identity config, "deeply personal" | Name your Companion | Fixed animal roster | 5 personas, unnamed | **User-created HōMI** (name/style/tone config); roster superseded |
| Who scores | Deterministic; AI never | Deterministic black box | Deterministic + ML overlay under MRM | Demo slider | Deterministic, canon frozen | Canon frozen; ML overlay far-future, MRM-gated |
| Confidence / data states | First-class, 7 states | Confidence, no imputation | Confidence calc W3 | Absent | **Absent** | **Adopt — the biggest genuine gap** |
| Memory | Permissioned, inspectable | mem0/pgvector, user-editable | mem0 + pgvector | Session-only | Split sessionStorage/localStorage (T2.6) | Inspectable memory on existing Supabase tables, not mem0 |
| Architecture | Compose around existing app | 5 microservices | Monorepo w/ services | Single HTML | Single Next.js app | Stay single-app; service split is a scale trigger, documented not scheduled |
| B2B | Phase 2–3, consent-based | Institutional API + FCRA | Design partners mo. 7–12 | Absent | Absent | Blueprint Phase 4+; preview feature first |
| Legal posture | Not a lender/RIA/bureau | Path A recommended | Architect-A / Operate-B | n/a | Operate-B disclaimers shipped | **Stay Operate-B in all docs; Path A = open decision** |
| Models | n/a | Sonnet 4.6 / Opus 4.7 | Sonnet 4.6 | n/a | claude-sonnet-4-5 | Aspirational refs noted; docs pin nothing unreleased |

---

## 4. Adopted canon (numbered, with provenance)

1. **Intelligence-first, friend-shaped.** The Companion is the readiness intelligence layer
   (file 1 §2); each user names and shapes their own HōMI as configuration within the
   brand-voice envelope (file 3 §7.1 + founder decision).
2. **State before chat; explain before advise** (file 1 §18.1–2). Already structurally true via
   the context spine; extended by the readiness-state contract.
3. **Confidence and source labels travel with every claim** (file 1 §6, §11; file 3 §2.6).
4. **Missing data is a first-class signal — never hidden, never imputed** (file 1 §18.4).
5. **AI interprets; deterministic systems score** (file 1 §12; file 3 P1). Scoring canon frozen.
6. **Memory is permissioned and inspectable** — "what HōMI remembers," fact vs. inference,
   user-deletable (file 1 §3E; file 3 §7.2).
7. **Trade-secret containment is structural** — weights never reach a prompt, client, or log;
   explainability ships as magnitude bands (file 3 P1, §5).
8. **User owns sharing** — institutional preview first, consent/expiry/revocation/audit when
   partner sharing arrives (file 1 §8, §10, §22).
9. **The mote never becomes a sales funnel** — truthful gates, no approval language, no
   regulated advice (file 1 §17.4; existing blueprint non-negotiable).
10. **Milestones, ambient context, and pacing** as re-voiced UX warmth (file 4, harvested).

## 5. Superseded

- Fixed character roster (Steady/Clarity/Horizon) and the 50-character direction as product
  strategy — replaced by user-created identity configuration.
- Keyword/canned-response engine (file 4) — outclassed by shipped `/api/advisor`.
- The roadmap's parallel architecture stack (mem0, Inngest, KMS, microservices, Clerk
  question) — recorded as scale-later options, removed from the active plan.
- Any assumption that CRA Path A has been chosen.

## 6. Gaps and requests

1. `homi-50-character-concepts.html` was never provided (the PDF is a screenshot of a page
   *listing* it). Re-upload if the concepts should feed the identity-creation style palette.
2. The other project files listed in §2.5 remain un-audited.
3. The strategy corpus predates the shipped finance/surface context spine; none of the
   documents account for it. This audit and the updated blueprint are now the reconciliation
   point.

## 7. Blueprint changes made as a result

`COMPANION-ECOSYSTEM.md` was updated in the same commit: "Your HōMI" identity principle (§1),
confidence/data-freshness rules in the context spine (§3), the canonical readiness-state
contract and memory panel in Phase 2, explainability view and milestone moments in Phase 3,
institutional share preview and partner-report contract in Phase 4, and two new
non-negotiables (§5). This audit is the provenance record for those changes.
