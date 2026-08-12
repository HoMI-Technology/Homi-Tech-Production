# HōMI Companion — Ecosystem Integration Blueprint

**The Companion is the mote.** HōMI like homie — a friend. One small, always-present
point of light that travels with the user through every surface of HōMI, knows their
real numbers, and is their go-to for anything financial. Not a chatbot bolted to a
corner of the app; the connective tissue of the whole product.

This document is the single source of truth for how the Companion integrates across
the ecosystem. It is grounded in what exists in this repo today, and it is phased —
each phase ships independently.

---

## 1. What the mote is

- **One presence, everywhere.** The same Companion — same voice, same memory, same
  guardrails — whether the user meets it as the floating compass widget, the
  full-page `/advisor` chat, the `/twin` letter, or the `/trinity` engine. Those are
  surfaces; the mote is the entity behind all of them.
- **A friend, not a banker.** The voice rules already in `app/api/advisor/route.ts`
  are the canon: short honest sentences, radical honesty, willing to say "not yet,"
  never financial/legal/tax/mortgage/investment advice, educational only. Every new
  integration inherits these rules unchanged.
- **The go-to for anything financial.** When a user wonders about their money —
  cash flow, debt, runway, credit, affordability, timing — the shortest path to an
  honest answer is the Companion. That requires the Companion to _know_ what the app
  knows: assessment, finance dashboard, credit, goals, bank data, behavioral genome.
- **Protection first.** The mote never becomes a sales funnel. Upgrade nudges stay
  truthful 402s from the server-authoritative gate (`lib/advisor/quota.ts`), never
  fake scarcity.
- **Your HōMI.** Every user names and shapes their own HōMI. Identity is
  _configuration inside the brand-voice envelope_ — a name, a visual accent within
  brand canon, tone/pacing/depth/focus settings — never a way to opt out of the
  voice rules. Launch-selectable skins are Steady, Clarity, and Horizon (orb
  accents from `HOMI_PRESETS` / `LAUNCH_SKINS` in `lib/advisor/identity.ts`).
  Classic compass preset `homi` may remain default identity chrome but is not a
  fourth marketing skin label. Engine personas (homie / reality / gut / timing)
  and Trinity (advocate / skeptic / arbiter) stay off default launch pickers.
  What the user never configures: the math, verdict bands, weights, or the
  no-advice floor. (Canon per `docs/archive/COMPANION-INTELLIGENCE-AUDIT.md`.)

## 2. What exists today (the seams)

| Piece           | Where                                                                             | Role                                                  |
| --------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Floating widget | `components/companion/CompanionWidget.tsx`, mounted in `app/(product)/layout.tsx` | The mote's physical form in the product               |
| Full-page chat  | `app/(product)/advisor/page.tsx` + `components/advisor/Chat.tsx`                  | Deep-conversation surface                             |
| Brain           | `app/api/advisor/route.ts` (Anthropic, deterministic fallback)                    | One endpoint, one voice                               |
| Launch skins    | `LAUNCH_SKINS` in `lib/advisor/identity.ts` — Steady, Clarity, Horizon            | Launch UI surface of one companion                    |
| Personas        | `lib/advisor/personas.ts` — homie, reality, gut, timing, planner                  | Engine tone under the skins (not launch labels)       |
| Context spine   | `lib/advisor/context.ts`                                                          | What the Companion knows about _this user, right now_ |
| Gate            | `lib/advisor/quota.ts` + `lib/entitlements.ts`                                    | Tiered daily message quota, server-authoritative      |
| Siblings        | `/api/twin`, `/api/trinity`                                                       | Same gate, same guardrails, different formats         |
| Public taste    | `/artifact` playground (`demoContext`)                                            | Anonymous demo on fixed mock context                  |

## 3. Architecture principle: the context spine

Everything the Companion should learn about a user flows through **one builder**:
`buildCompanionContext()` in `lib/advisor/context.ts`. Client surfaces call it; the
route validates it with Zod and folds it into the system prompt. Adding a new domain
to the Companion's awareness means adding one block to the spine and one schema to
the route — never a new endpoint, never a second voice.

```
assessment (score, verdict, pillars, hard stops)   ── shipped previously
finance   (cash flow, savings rate, runway, DTI,
           liquid savings, debt, net worth)         ── Phase 1 (this change)
surface   (which page the user is standing on)      ── Phase 1 (this change)
goals, credit, genome, plaid summary                ── Phase 2+ (server-side)
```

Three hard rules for the spine:

1. **Never present defaults as the user's numbers.** Finance context is only built
   when the user has actually saved finance data (`hasSavedFinanceState()`).
2. **State travels with confidence.** Every context block carries a source label
   (verified / self-reported / stale / missing) and a freshness marker; missing data
   is a first-class signal the Companion names honestly, never hides or imputes.
3. **Client context is a convenience, not an authority.** As context grows past what
   the client holds (Plaid, credit snapshots, goals), the route should assemble
   context server-side from Supabase for the signed-in user, and client-sent context
   becomes a fallback. RLS already scopes every table involved.

## 4. Phased roadmap

### Phase 1 — The mote knows money (this change)

The Companion stops being assessment-only and becomes financially aware everywhere:

- `lib/finance/store.ts` gains `hasSavedFinanceState()` so placeholder defaults can
  never masquerade as the user's numbers.
- `lib/advisor/context.ts` becomes the full context spine: `buildFinanceContext()`
  (net cash flow, savings rate, runway, DTI, liquid savings, debt, net worth) and
  `buildSurfaceContext()` (route → human label, e.g. "the mortgage calculator"), all
  assembled by `buildCompanionContext()`.
- `/api/advisor` validates the new `finance` and `surface` fields, folds them into
  the context note, and the system prompt widens from "ready to buy a home" to the
  user's whole financial life — with every no-advice guardrail intact. Demo mode
  (`/artifact`) never mixes in real user context.
- Both surfaces (widget + full-page chat) send the full context.

Result: on the FIRE calculator the mote knows you're on the FIRE calculator; ask it
"can I afford this?" and it answers with _your_ runway and DTI, not generics.

### Phase 2 — One memory, one identity

- **Unified thread persistence** (audit T2.6) — SHIPPED: signed-in users get one
  server thread on the existing `advisor_conversations` / `advisor_messages`
  tables (`lib/advisor/memory.ts`, `/api/advisor/history`). The widget and the
  full-page chat resume the same conversation on any device; local storage
  remains the anonymous/offline fallback, and persistence is best-effort so a
  storage failure never breaks the chat itself.
- **Server-side context assembly** — SHIPPED (the authority flip): for
  signed-in users the route assembles context from their own rows via
  `lib/advisor/server-context.ts` — `assessments` (latest two, for score,
  pillars, hard stops, previous score), `user_finance_state` (mirrored
  dashboard state with LWW freshness), and `credit_snapshots` — and the
  server wins per block, with client-sent context as the fallback for
  anonymous users and empty tables. The Companion's knowledge no longer
  depends on which browser the user opened.
- **Cross-surface continuity**: opening the widget mid-conversation shows the same
  thread the full-page chat holds.
- **Canonical readiness-state contract** — SHIPPED (v1):
  `ServerCompanionState` in `lib/advisor/server-context.ts` — one object
  carrying assessment, finance, and credit blocks with freshness and a
  generation timestamp, assembled concurrently and degrading per block.
  Adapted from the strategy corpus's `CompanionReadinessState`; trend and
  next-best-action fields join it as those systems land.
- **"What HōMI remembers"** — SHIPPED: an inspectable memory panel in Settings
  (`components/settings/CompanionMemorySection.tsx`) stating plainly what the
  Companion knows (identity, readiness, money picture with freshness, stored
  conversation) with real controls: "Forget this conversation" (deletes the
  server thread via `DELETE /api/advisor/history` and clears local copies) and
  "Reset my HōMI" (returns to the identity picker). Only facts the user gave —
  no hidden inferences.

### Phase 3 — The go-to for anything financial

- **Plaid-aware context** — SHIPPED: the transactions table exists (migration
  00024, `plaid_transactions`, RLS owner-scoped, service-role writes only); the
  sync engine persists every window and computes 30-day cash flow from the full
  stored history (former under-reporting limitation resolved). The Companion
  gets its first server-assembled VERIFIED block (`lib/plaid/cashflow.ts` in
  `/api/advisor`) — money in/out/net over 30 days, summarized server-side,
  never raw transactions in a prompt — with an instruction to name any gap
  between verified and self-reported numbers honestly.
- **Credit awareness** — SHIPPED: the /credit page's state extracted to
  `lib/credit/store.ts` (defaults-leak gate + freshness stamp, mirroring the
  finance store) and joined to the spine via `buildCreditContext()` — score,
  utilization, on-time streak, all labeled self-reported with age. Scores
  below the 620 hard stop get an explain-the-protection instruction in the
  prompt. Server-side `credit_snapshots` remains the follow-up once credit
  data syncs to the database.
- **Tool hand-offs** — SHIPPED (v1): the system prompt carries the full tool
  directory (paths included) with a one-per-reply, never-as-a-brush-off rule,
  and Companion messages render known product routes as real links via an
  allowlist (`components/companion/MessageContent.tsx` — model output can
  never fabricate navigation to unknown or external destinations). Pre-loading is
  live for the highest-traffic hand-offs: /tools/runway and
  /tools/affordability open with the user's saved numbers via
  `hooks/use-lens-prefill.ts` (same defaults-leak gate as the spine; mount-only
  so it never fights live edits; superseded the earlier `lib/tools/prefill.ts`
  module, deleted 2026-08-03). Remaining calculators adopt the same hook as
  needed.
- **Behavioral genome**: `behavioral_genome` informs _how_ the mote talks (pace,
  framing), never _what_ it claims.
- **Explainability view** — SHIPPED: the "why did this change" card on /results
  (`components/results/ScoreExplanation.tsx`) built from `lib/advisor/explain.ts` —
  score movement and per-pillar deltas in magnitude bands (small / moderate /
  large), never numeric weights, with honest caveats for staleness, missing
  pillar detail, and active hard stops. The Companion receives the same
  explanation via the spine's `whatChanged` field, so chat and view always tell
  one story. Previous-score snapshots now carry pillar totals to power it.
- **Milestone moments** — SHIPPED: score-threshold crossings (40/50/60/70/80/90)
  marked in canon voice, both directions (`lib/advisor/milestones.ts`) — up
  reports the highest threshold reached, down reports honestly where you are
  now. Folded into the explanation engine, so the /results card shows the
  crossing as a highlighted strip and the Companion's context carries the same
  words. Harvested from the companions-v2 prototype, re-voiced (no emoji, no
  hype — a CI test enforces it). The ambient context bar remains future UX.

### Phase 4 — The mote reaches out (carefully)

- **Signals, not spam**: surface proactive nudges inside `/signals` and `/daily`
  ("your runway crossed 3 months — that's a yellow-to-emerald move") generated by
  the same voice. Opt-in, in-app first; email digests only through the existing
  Resend + unsubscribe infrastructure.
- **Marketing-side presence**: the mote appears on marketing pages in demo mode
  (the `/artifact` mechanics), giving anonymous visitors a genuine taste, with the
  sign-in gate as the honest threshold — not a locked teaser.
- **Couples/family mode**: shared threads where the mote holds both partners'
  context — requires explicit consent from both, enforced via `family_accounts`.
- **Institutional share preview** — SHIPPED: Settings' "If you shared your
  readiness" section (`components/settings/SharePreviewSection.tsx`, derivation
  in `lib/advisor/share-preview.ts`) — verdict band, score, confidence with its
  reasons shown (high only when the assessment is fresh AND a money picture
  exists; each degradation drops a band), per-source data quality, hard stops
  verbatim, and the not-a-credit-decision disclaimer as part of the product.
  Nothing is shareable yet and the section says so; consent-first sharing is
  the B2B follow-up.
- **Partner report contract (design-ahead)**: when sharing arrives, reports are
  generated from stored structured state — never from chat — and carry consent
  timestamp, expiry, revocation, access logging, and methodology version. Whether
  HōMI ever operates as a consumer reporting agency (the corpus's "Path A") is an
  open business decision; every document stays consistent with today's educational,
  non-CRA posture until the founder decides otherwise.

## 5. Non-negotiables (inherited from BUILD-BRIEF §1 — now `AGENTS.md` "Product guardrails")

- Scoring canon frozen: the Companion _reads_ scores; it never computes or adjusts
  them. Scoring stays server-authoritative in `lib/scoring/engine.ts`.
- Brand canon: it is always **HōMI Companion** — HōMI like homie.
- No financial, legal, tax, mortgage, or investment advice. Ever. Every phase above
  is educational context, plainly stated.
- Every AI surface stays behind `gateCompanion()`; anonymous access only via the
  fixed-context demo mode.
- Graceful degradation: every surface keeps a deterministic fallback
  (`lib/advisor/fallback.ts`) so the mote never goes dark when the model does.
- AI interprets; deterministic systems score. No LLM ever sees the formula or
  weights in a prompt, client bundle, log, or API response — explainability ships
  as server-generated text and magnitude bands only.
- Missing data is a first-class signal. The Companion says "I can't verify that
  yet" instead of pretending; confidence always travels with the claim.

## 6. Success measures

- % of active users who talk to the Companion weekly (engagement hook).
- Assessment completion rate for users who touched the Companion first.
- Share of Companion conversations where real user context (finance or assessment)
  was present — the "does it actually know me" metric.
- Free → Plus conversion attributable to honest 402 nudges (not dark patterns).
- Context coverage: share of Companion conversations where real, source-labeled
  user state (assessment or finance) was present — the "does it actually know me"
  metric with its honesty guarantee attached.

---

_Provenance: the identity, confidence, memory, explainability, and sharing items
above were adopted from the founder's strategy corpus — see
`docs/archive/COMPANION-INTELLIGENCE-AUDIT.md` for the full audit, conflict
matrix, and superseded directions._
