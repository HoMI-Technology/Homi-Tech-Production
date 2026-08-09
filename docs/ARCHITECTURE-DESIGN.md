# HōMI Architecture Design Document

**Version:** v1.0 (Production-Ready Baseline)  
**Date:** 2026-08-04  
**Product:** HōMI — Decision Readiness Intelligence™  
**Owner:** HOMI TECHNOLOGIES LLC  
**Repo:** github.com/HoMI-Technology/Homi-Tech-Production  
**Live Feed:** https://homitechnology.com/architecture.json (machine-readable, generated)  
**Authority:** Executable TypeScript (`lib/scoring/*`, `lib/brand/*`, `lib/entitlements.ts`, `lib/agents/registry.ts`) wins on any conflict. This document is derived documentation.

> **Core Question:** "Will you be okay?"  
> **Promise:** Protection and clarity. "Not yet" is not "no" — it is the map for what to build next. Never a sales funnel.

---

## 1. Executive Summary & Context

HōMI is a full-stack, privacy-first platform that helps individuals (and households/organizations) evaluate **readiness** for high-stakes life decisions — starting with home buying — through a structured, three-pillar assessment:

- **Financial Reality** (max 35 pts)
- **Emotional Truth** (max 35 pts)
- **Perfect Timing** (max 30 pts)

It returns a single deterministic verdict (`READY` / `ALMOST_THERE` / `BUILD_FIRST` / `NOT_YET`) with protective **hard stops** that force `NOT_YET` regardless of numeric score when catastrophic conditions exist (DTI >50%, housing >45% gross, emergency runway <1mo, credit <620).

**Key Differentiators:**

- Server-authoritative scoring and entitlements (never trust client).
- Brand-locked, high-density "operate" UI (cockpit) vs. cinematic "persuade" marketing.
- Multi-agent AI Companion ("the mote") with strict no-advice guardrails, tiered quotas, and context spine.
- Graceful degradation: optional integrations (Anthropic, Plaid, Stripe advanced) fall back cleanly.
- Strict RLS on every table; no service-role exposure to client.
- Auditability: architecture feed, brand-check, acceptance tests, ADR trail.

**Scale & Team Context (2026):**

- Early production (Vercel + Supabase primary).
- Solo founder + AI agent-augmented development (Claude/Codex/Kimi/Grok/Hermes workflows).
- Target: individual consumers + B2B (partners, employers, households).
- Constraints: LLM cost control, liability avoidance (no financial/legal advice), regulatory sensitivity around credit/finance data, Vercel/Supabase economics, rapid iteration with strong guardrails.

**Non-Negotiables (from BUILD-BRIEF / AGENTS.md / DESIGN.md):**

- Scoring canon frozen (weights in `lib/scoring/weights.ts` C2 boundary; thresholds boundary-inclusive).
- Brand canon (exact spelling **HōMI**, palette, verdict labels, no banned claims).
- RLS + `SECURITY DEFINER` + pinned `search_path`.
- Test every logic fix (especially webhooks, shares, entitlements, verdict guards).
- Dual-shell navigation; operate density over whitespace.

---

## 2. Goals, Constraints & Non-Functional Requirements

### Functional Goals

- Deliver honest, actionable readiness signal + next-step map.
- Enable safe exploration via tools/calculators that prefill from real user data (CFM spine).
- Provide persistent Companion that knows the user's full context (assessment + finance + goals) without ever giving advice.
- Support sharing, journaling, outcome tracking, household collaboration.
- Tiered monetization that gates advanced AI / tools / household without breaking core free experience.

### Non-Functional Requirements (Production-Ready)

| Category            | Requirement                                                    | Target / Measurement                             |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------ |
| **Correctness**     | Deterministic scoring; hard stops always win                   | 100% test coverage on engine + gates             |
| **Security**        | RLS on all user data; no secrets in client; webhook sig verify | SOC2-ready posture; zero client keys             |
| **Privacy**         | User owns data; minimal PII; Plaid token server-side           | RLS + audit_log; data export path                |
| **Performance**     | <3s LCP marketing; interactive tools <200ms feedback           | Lighthouse ≥90; budget in lighthouse-budget.json |
| **Reliability**     | Graceful degrade; idempotent webhooks; quota backstops         | 99.5%+ uptime; Sentry + healthcheck              |
| **Cost**            | LLM spend bounded (daily + monthly caps)                       | Per-tier quotas + monthly ceiling                |
| **Accessibility**   | WCAG AA; reduced-motion; keyboard + screenreader               | Skip links, aria, brand-check + manual           |
| **Observability**   | Errors, product events, verdict analytics                      | Sentry + PostHog (uniform taxonomy)              |
| **Maintainability** | SSOT registries; architecture feed; pure modules               | `npm run architecture:check`; typecheck          |
| **Scalability**     | Supabase row limits + Vercel edge; sharded? later              | Horizontal via serverless; monitor               |

**Constraints:**

- Next.js 15 App Router + React 19 (colocation wins).
- Node 22, npm only (legacy-peer-deps).
- Optional envs degrade: no Stripe → no checkout; no Anthropic → rule-based fallback.
- Mobile-first density; no heavy client bundles on core paths.
- Legal entity boundaries for B2B (orgs, partner_codes, de-identification).

---

## 3. Core Entities & Domain Model

**Primary Entities (from DB + code):**

- `profiles` (id, email, subscription_tier, role, employer_id, organization_id, ...)
- `assessments` (user_id, score, verdict, pillars JSON, hard_stops, inputs snapshot)
- `checkins` (daily mood/pulse)
- `journal_entries`, `outcomes`, `outcome_surveys`
- `behavioral_genome`
- `goals`
- `financial_snapshots`, `user_finance_state`, `credit_snapshots`
- `plaid_items/accounts/transactions`
- `calendar_events`
- `advisor_conversations / advisor_messages / advisor_usage`
- `score_shares`, `shadow_shares`
- `partner_codes`, `organizations`, `organization_members`, `partner_api_keys`
- `campaigns`, `email_sends`, `push_subscriptions`
- `audit_log`, `webhook_events`, `receipt_verifications`
- Platform: `question_bank` (seeded 45 q)

**Relationships:** Strong user ownership via RLS. Assessments link to shares/outcomes. Plaid → finance state. Orgs for B2B scoping.

**Derived / Transient:**

- HōMI-Score + verdict (computed server-side)
- Companion context spine (assessment + finance + surface + goals)
- CFM (Canonical Financial Model) overlay for tool prefill

---

## 4. High-Level Architecture Options & Tradeoffs

### Option A: Current Hybrid Full-Stack Next.js + Supabase (Recommended / As-Built)

**Description:** Single Next.js 15 app (App Router) handling marketing + product surfaces. Supabase for Auth + Postgres (RLS) + edge functions/RPCs where needed. Server components for data/auth shells. Client components + hooks for interactive (assessment, Plaid Link, chat, tools). Pure TS scoring engine. Optional third-party via server proxies.

**Pros:**

- Colocation of UI + API + logic → fast iteration.
- Server components reduce client JS + improve SEO/perf for marketing.
- Supabase RLS + Auth is "batteries-included" and matches security posture perfectly.
- Vercel deploy is zero-config for Next; edge functions align.
- Architecture feed + registries (tools, agents, brand) enable agent consumption + SSOT.
- Graceful degradation built-in.

**Cons / Tradeoffs:**

- Vendor lock (Supabase schema + Vercel functions).
- Scaling limits on free/cheap tiers (row counts, function invocations, AI spend).
- Monolith: harder to extract B2B API later (mitigated by clear lib boundaries).
- SSR dynamic shells (product layout) trade some static caching for correctness/flicker-free UX.

**Why chosen:** Matches team size (solo + agents), speed-to-production, and "protection first" requirements. Boring + proven for this domain.

### Option B: Microservices / Separate API + SPA Frontend

**Description:** Next.js (or Vite) SPA for frontend only + dedicated API (Node/Go + custom Postgres or Supabase backend service) + separate auth service.

**Pros:** Independent scaling, team boundaries, easier B2B public API, language choice per service.

**Cons:** Much higher complexity/ops (multiple deploys, CORS, auth sync, distributed tx), slower iteration, duplicated types/contracts, more surface for security mistakes. Overkill for current scale and "protect the user" mandate (harder to keep scoring/quotas/enforcement in one place).

**Tradeoff Summary:** 3-5x dev/ops cost for marginal benefit until user count justifies (>>10k MAU + heavy B2B).

### Option C: Heavier Client + Edge DB (e.g. SQLite/WASM or Firebase)

**Description:** More computation client-side + Firebase/Supabase-lite or local-first.

**Pros:** Offline potential, lower backend cost initially.

**Cons:** Violates "server-authoritative scoring" canon; security nightmare for finance data; hard stops/enforcement bypassable; poor for multi-device/household; analytics/audit harder.

**Rejected outright** due to core product invariants.

### Option D: AI-First / Agent-Native (Future Exploration)

Emerging: Orchestrate more via multi-agent workflows (e.g. using the existing Agent OS + external orchestrators). Current is hybrid (registry + single backend endpoint + specialist prompts). Future may evolve toward more declarative agent graphs while keeping human-visible surfaces stable.

**Tradeoff:** Higher flexibility vs. auditability and guardrail drift risk. Mitigate with sentinel + receipt HMAC.

**Recommendation:** Stay with Option A for 2026-2027. Re-evaluate at clear inflection (e.g. need for public partner API surface or >5k concurrent).

**Module Boundaries (enforced in current):**

- `lib/scoring/` — pure, self-contained, testable. No DB, no UI.
- `lib/brand/` + `lib/stripe/tiers.ts` + `lib/entitlements.ts` — immutable canon.
- `lib/agents/registry.ts` + `lib/advisor/*` — agent meta + context spine.
- `lib/tools/registry.ts` + `lib/tools/cfm.ts` — lens contracts + prefill.
- `app/api/*` — thin handlers; heavy logic in lib; always gate with `getUserEntitlements` + `requireCapability`.
- `components/operate/*` + `components/ui/*` — shared primitives (see DESIGN.md).
- `supabase/migrations/` — ordered, idempotent, RLS-first.

---

## 5. System Diagram (Mermaid)

```mermaid
flowchart TB
    subgraph Marketing["Marketing (Persuade)"]
        L[Landing + Hero/Compass] --> A[Assessment Entry]
        A --> Assess[Assessment Wizard]
    end

    subgraph Product["Product Shell (Operate) - Dual Header"]
        Assess --> Score[Server Scoring Engine]
        Score --> Results[Results + Verdict + Path/Plan]
        Results --> Tools[Tools Hub + Lenses (Registry-driven)]
        Tools --> Finance[Finance Dashboard / Plaid]
        Results --> Companion[Companion Widget + /advisor]
        Companion --> Journal[Journal + Calendar + Goals]
        Journal --> Outcomes[Outcome Tracking]
    end

    subgraph Backend["Server / API Layer (Next.js Route Handlers)"]
        Score
        Companion
        Billing[Stripe Checkout/Portal/Webhooks]
        PlaidSync[Plaid Token Exchange + Sync]
        Entitle[Entitlements Gate]
    end

    subgraph Data["Supabase (Postgres + Auth + RLS)"]
        DB[(37+ Tables - RLS enforced)]
        RPCs[RPCs for shares/quotas]
    end

    subgraph External["External Integrations (Server-only where possible)"]
        Anthropic[Anthropic (advisor/trinity/twin)]
        Stripe[Stripe]
        Plaid[Plaid (Link SDK client, API server)]
        Resend[Resend Email]
        Push[Web Push]
        Sentry[Sentry]
        Analytics[PostHog / Vercel]
    end

    Marketing -->|Server Component Shell| Product
    Product -->|Zod + Server Gates| Backend
    Backend --> Data
    Backend <--> External

    style Score fill:#22d3ee,stroke:#0a1628,color:#0a1628
    style Companion fill:#34d399,stroke:#0a1628
    style Entitle fill:#facc15,stroke:#0a1628
```

**Data Flow Summary:**

1. Anonymous user → Marketing → Assessment collection (client form state) → POST `/api/assessments` (or scoring route).
2. Server: validate inputs (Zod) → run `scoringEngine(AssessmentInputs)` (pure) → apply hard stops → persist to `assessments` (RLS).
3. Results page (server-fetched for owner) renders verdict hero + pillar breakdown + recommended tools/path.
4. Tools pull prefill via CFM from finance state or assessment snapshot.
5. Companion: client sends surface + optional client context → server builds full spine (assessment + finance + goals + plaid summary if authorized) → calls Anthropic (or fallback) with persona + agent system lines + strict boundaries → quota check + usage log.
6. Billing: Stripe checkout → webhook (idempotent table) → update profile tier → entitlements recompute on every privileged op.
7. Plaid: client Link → public token → server exchange → store items/accounts/tx → sync to user_finance_state + snapshots.

---

## 6. Detailed UI Specifications

**Source of Truth:** `DESIGN.md` (immutable contract) + `lib/brand/*` + `app/globals.css` + `npm run brand-check`.

### 6.1 Global Design System

- **Palette (exact, no approximations):**
  - Surfaces: Navy `#0a1628`, Navy-light `#0f172a`, Slate-surface `#1e293b`
  - Accents: Cyan `#22d3ee`, Emerald `#34d399`, Yellow `#facc15`
  - Verdicts: Amber `#fab633` (BUILD FIRST), Crimson `#f24822` (DO NOT PROCEED)
  - Text: Light `#e2e8f0`, Dim `#94a3b8`, Ink white
- **Typography:** Fraunces (display/hero), Inter (body), JetBrains Mono (numerals, scores, code). `.score-numeral` for data.
- **Materials:** `.glass` (translucent cards), `.hairline` borders, subtle compass rings / ambient bloom (atmosphere only). Controlled contrast — glass is _under_ text, not substrate for busy content.
- **Motion:** Framer-motion limited. Honor `prefers-reduced-motion`. No GSAP/scroll-jack/marquee on chrome or dashboards. Micro-transitions on verdict changes, sliders, tool results only.
- **Density:** Operate mode = high information density (cockpit), not marketing whitespace.
- **Verdict Vocabulary (per ADR 001):** Enum `NOT_YET` (stored); public badge **DO NOT PROCEED**. Never change without migration ADR.

### 6.2 Shell & Navigation (Dual-Shell Intentional)

- **Marketing Shell:** `SiteHeader` + `SiteFooter`. Persuade mode. One primary CTA above fold.
- **Product Shell:** `AppHeader` (signed-in) or `SiteHeader` (public product pages). `HeaderShell` shared fixed glass bar.
  - Height: `--nav-height` ~60px + safe-area.
  - One line: PRIMARY nav (Home / Assess / Tools / More) + Workspace dropdown (never multi-pill role switcher) + search (kbd) + bell + avatar.
  - Mobile: panel behavior with scroll-lock, Escape, focus return. Prefer content fixes over behavior rewrites.
- **Skip link** to `#main`.
- **Layout ownership:** `(marketing)/layout` vs `(product)/layout` (dynamic based on session).

**Product Chrome Primitives (from `components/operate/` and `components/layout/`):**

- `PageFrame`, `PageHeader`
- `OperateInstrument` (hero score/verdict container)
- `MetricRail` (slim secondary metrics)
- `ActionDock` (next-move primary actions)
- `InstrumentFold` or equivalent for progressive disclosure

### 6.3 Mode-Specific Rules

**PERSUADE (marketing, assessment entry, results "moment", share pages):**

- Hero = thesis about decision readiness (not feature grid).
- Boldness in one place (compass + score/verdict).
- Sample scores must exactly match canon (e.g., 76 → ALMOST THERE).
- Cinematic elements (Compass3D, CinemaFX, DecisionOrbit, etc.) but usable without motion.

**OPERATE (dashboard, tools results, finance, journal, admin, advisor):**

- Dominant readiness numeral + verdict chip (personal) or book/cohort pulse (partner/admin).
- Secondary modules recessive.
- Tabular / mono numbers for scores and money.
- 3-second hierarchy test: score + next step must be obvious on load.
- No equal 4-tile KPI walls outranking the hero.
- Tools: `ToolShell` / `ToolGrid` / `ToolResultHero`; hub groups by ring/job (readiness/reality/stability/timing).

### 6.4 Key Screens / Component Specs

- **Landing (`app/(marketing)/page.tsx`):** Cinematic private decision room. InterviewHero or equivalent. ThresholdPreview, VerdictShift, Voices, AlignmentScene. Single primary CTA. Accurate sample verdicts.
- **Assessment:** 45-question flow (sliders dominant, choices, numbers). Progress, pillar grouping. Client state + server submit. Validation mirrors bank.
- **Results / Path / Plan:** Hero score + verdict (full meta: color, line, bg). Pillar breakdown (detailed on paid). Recommended next lenses from registry. Share button (generates token). Hard stops surfaced explicitly.
- **Tools Hub (`/tools`):** Ring-grouped cards (registry SSOT). Prefill badges ("your numbers"). Every calculator uses shared chrome + mono output.
- **Advisor / Companion:** Floating widget (always present in product layout). Full `/advisor`. Context-aware. Real model only on paid. Quota UI honest.
- **Finance / Credit / Plaid:** Metrics-first (current state) before inputs. Plaid Link in controlled flow. Snapshots + ledger.
- **Admin:** Protected; activity, assessments, attribution, email, marketing, ad-spend. Audit log.
- **B2B / Partner / Employee:** Role-gated dashboards; de-id for org assessments.
- **Mobile:** Single-line chrome; vertical scroll lock only where specified; full touch targets.

**Component Hierarchy (reuse first):**

- `components/ui/` — low-level (buttons, inputs, modals, Reveal, etc.)
- `components/operate/` — product-specific primitives
- Feature folders (assessment/, tools/, advisor/, dashboard/, etc.)
- Always check `component-reuse` patterns before new.

**Definition of Done (any UI change):**

- Brand-check + typecheck pass.
- No off-token colors/fonts.
- Dual shell correct.
- Mobile behavior + reduced motion.
- Hierarchy test (score/next obvious).
- a11y smoke (skip, aria, labels).
- Architecture feed updated if routes change.

---

## 7. Integration Plan & Current State

### 7.1 Core Platform Integrations

| Integration            | Purpose                                                              | Client Exposure               | Server Role                                            | Tradeoffs & Notes                                                                                                                 | Status                            |
| ---------------------- | -------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| **Supabase**           | Auth, Postgres (RLS), profiles, all user data, RPCs (shares, quotas) | Anon key (public), SSR client | Full; service role only server                         | RLS is the security model. Easy, fast. Lock-in + pricing at scale. Realtime optional for live features.                           | Production (core)                 |
| **Stripe**             | Checkout, Billing Portal, subscriptions, webhooks                    | None (no Stripe.js on core)   | Raw fetch or SDK server-only; idempotent webhook table | Webhook sig verify critical. Price IDs in env. Graceful no-Stripe mode. Cost of failed payments.                                  | Production                        |
| **Plaid**              | Bank linking & tx sync for verified finance data                     | Link SDK (cdn allowed in CSP) | Token exchange, sync, storage                          | Real per-item cost → gated to paid tiers. Sandbox vs prod. Data freshness/confidence labels.                                      | Production (bankSync entitlement) |
| **Anthropic**          | AI Companion (advisor, twin, trinity, agents)                        | None                          | Full prompts + context spine + model call              | Primary cost driver. Cheap model for paid; fallback deterministic for free. Quotas + monthly cap. Strict system lines + Sentinel. | Production (tiered)               |
| **Resend**             | Transactional email (shares, welcome, campaigns)                     | None                          | Server                                                 | Simple, reliable. Unsub handling.                                                                                                 | Production                        |
| **Web Push**           | Notifications (calendar, nudges?)                                    | Service worker registration   | Subscription storage + send                            | Privacy + permission UX. Optional.                                                                                                | Partial                           |
| **Vercel**             | Hosting, Analytics, Speed Insights, env                              | Analytics snippet             | Build/deploy                                           | Edge runtime constraints (some Node libs).                                                                                        | Production                        |
| **Sentry**             | Error tracking (client/server/edge)                                  | DSN                           | Source maps etc.                                       | Sampling for volume.                                                                                                              | Production                        |
| **PostHog** (inferred) | Product analytics                                                    | Snippet (CSP)                 | Events                                                 | Uniform taxonomy per BUILD-BRIEF needed (gap).                                                                                    | Partial instrumentation           |

**Key Patterns (non-negotiable):**

- All privileged calls: `getUserEntitlements(supabase)` → `requireCapability(...)` → 401/402.
- Webhooks: store `webhook_events` for idempotency + replay.
- Context for AI: always via single `buildCompanionContext()` spine. Client context = convenience/fallback; server authoritative where possible.
- CSP: explicitly allows only needed origins (Plaid, Anthropic, Supabase, PostHog, Stripe checkout, etc.). See `next.config.ts`.
- Secrets: `.env.local` (local), Vercel env (deploy), GitHub secrets (CI/E2E only). Never service role to client.

### 7.2 Phased Integration Roadmap (Current + Near-Term)

**Phase 0 — Stabilize (done in recent reorg):**

- Dead code removal, nav consolidation, typecheck green, architecture feed live.
- Entitlements layer + server gates.
- Tool registry unification.

**Phase 1 — Awareness & Polish (in progress / next):**

- Full finance context in Companion spine.
- Uniform PostHog events (assessment*\*, verdict*\_, checkout\_\_, companion\_\*).
- Expand E2E coverage (money, auth, share flows).
- Plaid sync reliability + confidence labels.

**Phase 2 — Household + Advanced Surfaces:**

- Family seats full (shared assessments, joint verdicts, family dashboard).
- Advanced tools gated properly behind `advancedTools`.
- Couples mode.
- Scenario saving/comparison (maxScenarios).

**Phase 3 — B2B & Extensibility:**

- Partner API keys / org scoping / de-id.
- Admin tools maturity.
- Public partner surfaces (careful with advice liability).
- Agent OS maturation (more routing, receipts).

**Phase 4+ — Outcomes, Learning, Scale:**

- Full outcome tracking loop (post-decision surveys → score calibration).
- Behavioral genome usage in Companion/insights.
- Multi-decision type support (beyond home_buying tags).
- Cost/scale mitigations (caching, cheaper models, batching).
- Data export + deletion (compliance).

**Integration Tradeoff Decisions Made:**

- Plaid cost vs. value of "verified" data: gated, not free.
- Real AI vs. fallback: free gets real taste (5/day) to hook, but bounded cost.
- Stripe vs. custom billing: Stripe for compliance + portal; webhooks for truth.
- Supabase vs. self-managed: speed + RLS > control (for now).
- No client-side scoring: correctness + canon > perceived speed.
- Webhook raw-fetch in some e2e (to avoid SDK in tests).

**Degradation Matrix:**

- No Stripe: pricing page shows, checkout disabled, tiers stay free.
- No Anthropic: advisor still works with deterministic logic + "educational only" copy.
- No Plaid: manual finance entry + snapshots only.
- No Resend: emails logged but not sent (or silent fail).

---

## 8. Data & API Architecture

### API Surface (selected)

- `/api/assessments` — create/score/retrieve (server compute)
- `/api/advisor`, `/api/twin`, `/api/trinity` — AI surfaces (shared gate + context)
- `/api/agents` — Agent OS entry
- `/api/plaid` — link/exchange/sync
- `/api/checkout`, `/api/billing` — Stripe
- `/api/shares`, `/api/shadow-shares`
- `/api/webhooks/stripe`
- Admin, finance-state, goals, push, etc.
- Healthcheck, csp-report.

All routes use Zod for request/response where possible. Server-authoritative.

### Scoring Engine Contract (lib/scoring/engine.ts)

Pure function:

```ts
interface AssessmentInputs { ... }  // 10+ fields across pillars
function computeScore(inputs: AssessmentInputs): {
  score: number;          // 0-100
  verdict: Verdict;
  pillars: { financial: number; emotional: number; timing: number };
  hardStops: HardStopReason[];
  // insights, subscores etc. (internal)
}
```

Hard stops override verdict to NOT_YET but numeric score remains visible (protective transparency).

Weights and detailed tables are executable-only (not reproduced in docs).

### Database Notes

- 46+ migrations (ordered, timestamped).
- RLS enabled + FORCED on every user table.
- RPCs for atomic operations (share creation, quota decrement).
- Seed: question_bank faithful mirror of `lib/questions/bank.ts`.
- Audit trail via `audit_log`.
- See `supabase/README.md` + `docs/MIGRATION-REPAIR.md` for ops.

---

## 9. Security, Compliance & Risk Mitigation

**Security Posture:**

- RLS is the perimeter (not app code).
- No `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE`.
- Stripe/Plaid/Anthropic keys server-only.
- Webhook signature verification + idempotency table.
- CSP strict (see next.config).
- Rate limiting / quotas at entitlement + usage tables.
- Admin bypass limited and audited.

**Compliance / Liability:**

- Explicit positioning: educational + readiness only. Never advice.
- Sentinel agent + prompt boundaries + UI disclaimers.
- Hard stops protect user (and company).
- B2B de-identification options.
- See `SECURITY.md`, `COMPANION-ECOSYSTEM.md`, ADRs.

**Risks & Mitigations (from skill template + project):**

- **LLM spend explosion:** Daily + monthly ceilings + cheap model + fallback + admin finite override.
- **Scoring / brand drift:** Executable TS + CI gates (architecture:check, brand-check, acceptance tests) + frozen canon.
- **Data breach / privacy:** RLS + minimal collection + Plaid token hygiene + export/deletion paths.
- **Advice liability:** Multi-layer guardrails (prompts, registry boundaries, UI copy, no specific recs in Analyst/Architect).
- **Vendor failure:** Graceful degradation + local fallbacks where possible + healthchecks.
- **E2E gaps / coverage debt:** Surgical expansion; live tests gated on secrets.
- **Analytics blind spots:** Taxonomized event plan (gap to close).
- **Mobile / a11y regression:** CI + manual + reduced-motion tests.
- **B2B scaling / org leakage:** Role + org_id scoping in queries + de-id migrations.

**Observability:**

- Sentry (errors + performance).
- Structured logs on critical paths (scoring, webhooks, AI calls).
- Product events (plan uniform capture).
- Health endpoints + synthetic checks.

---

## 10. Testing, CI/CD, Deployment & Operations

**Testing Layers:**

- Unit/Vitest: scoring engine (pure), entitlements, brand, registries, lib modules. Isolated configs.
- Acceptance: `vitest.acceptance.config.ts` — canon invariants (verdict boundaries, hard stops, tier mapping).
- E2E: Playwright — core funnels (assessment, checkout gated, shares). Needs real secrets for full.
- Brand + Architecture: `npm run brand-check`, `architecture:gen` + `check`.
- Typecheck + lint (but CI uses specific order: brand → arch → tsc → vitest → build).
- Lighthouse budgets.

**CI/CD:**

- GitHub Actions (verify job gates merges).
- Vercel Git integration for Preview + Prod.
- Secrets management via `homi` tools + doctor.
- SSOT sync between machines via Git (never copy folders).

**Deployment:**

- Main branch → Vercel prod.
- PR previews.
- Migrations: apply carefully (see docs); never push until repair complete historically.
- Env promotion via scripts.

**Operations (see OPERATORS-MANUAL.md, RUNBOOK.md, DEPLOY.md):**

- `homi doctor`, ssot, hygiene.
- Architecture feed consumption protocol for agents.
- Go-live checklist.
- Incident: Sentry triage + logs.

**Release Hygiene:**

- One PR per stream.
- Pull before work; push (or PR) before switching.
- Dead code + orphan triage ongoing.

---

## 11. Gaps, Technical Debt & Evolution

**Known Verified Gaps (from architecture feed):**

1. E2E coverage incomplete for full matrix (esp. money/auth/share).
2. PostHog instrumentation not uniform.
3. Verdict vocabulary dual-stable (policy decision — document only).

**Recent Debt Cleared (reorg):**

- i18n remnants, dead components, duplicate logic (trinity-gap), stale paths, nav parity, route consolidation.

**Future Evolution Priorities (high impact):**

- Outcome loop closure (for scoring calibration).
- Deeper agent orchestration + receipts.
- B2B partner portal + API surface.
- Multi-decision support.
- Cost optimization + caching for Companion.
- Advanced analytics + cohort insights (admin).
- Progressive web app / offline for journal/tools.

**ADR Trail:** See `docs/adr/`. Key: 001-verdict-vocabulary.

**How to Update This Doc:**

- After major structural change: update sections + regenerate architecture.json.
- Use `npm run architecture:gen && npm run architecture:check`.
- PR must keep executable authority note.

---

## 12. Appendices

### A. Key Commands

```bash
npm run dev
npm run typecheck
npm run test
npm run test:acceptance
npm run architecture:gen
npm run architecture:check
npm run brand-check
npm run build
```

### B. Registries (SSOT)

- Tools/Lenses: `lib/tools/registry.ts`
- Agents: `lib/agents/registry.ts`
- Brand + Verdicts: `lib/brand/index.ts`
- Calculators (for feed): `lib/architecture/calculators.ts`
- Entitlements: `lib/entitlements.ts` + `lib/stripe/tiers.ts`
- Questions: `lib/questions/bank.ts`

### C. References

- `DESIGN.md` (UI contract)
- `AGENTS.md` (agent instructions + canon)
- `README.md`
- `COMPANION-ECOSYSTEM.md`
- `Plans.md` + reorg handoff
- `supabase/README.md`
- `lib/architecture/build.ts` + generated `public/architecture.json`
- ADRs, SECURITY.md, GO-LIVE-CHECKLIST.md, RUNBOOK.md, OPERATORS-MANUAL.md
- `next.config.ts` (CSP, rewrites, architecture.json serve)

### D. Consumption for Agents / External

Fetch `https://homitechnology.com/architecture.json`. Prefer routes from feed, real agent levels, gaps as hints. Verify executable code.

---

**This document is living but frozen at a high level.** Major changes require ADR + update to this doc + architecture feed regeneration. Executable code remains the final authority.

_Produced following production-ready standards with explicit tradeoffs, per architecture-design discipline._
