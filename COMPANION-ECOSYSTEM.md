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
  honest answer is the Companion. That requires the Companion to *know* what the app
  knows: assessment, finance dashboard, credit, goals, bank data, behavioral genome.
- **Protection first.** The mote never becomes a sales funnel. Upgrade nudges stay
  truthful 402s from the server-authoritative gate (`lib/advisor/quota.ts`), never
  fake scarcity.

## 2. What exists today (the seams)

| Piece | Where | Role |
| --- | --- | --- |
| Floating widget | `components/companion/CompanionWidget.tsx`, mounted in `app/(product)/layout.tsx` | The mote's physical form in the product |
| Full-page chat | `app/(product)/advisor/page.tsx` + `components/advisor/Chat.tsx` | Deep-conversation surface |
| Brain | `app/api/advisor/route.ts` (Anthropic, deterministic fallback) | One endpoint, one voice |
| Personas | `lib/advisor/personas.ts` — homie, reality, gut, timing, planner | Modes of the same friend |
| Context spine | `lib/advisor/context.ts` | What the Companion knows about *this user, right now* |
| Gate | `lib/advisor/quota.ts` + `lib/entitlements.ts` | Tiered daily message quota, server-authoritative |
| Siblings | `/api/twin`, `/api/trinity` | Same gate, same guardrails, different formats |
| Public taste | `/artifact` playground (`demoContext`) | Anonymous demo on fixed mock context |

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

Two hard rules for the spine:

1. **Never present defaults as the user's numbers.** Finance context is only built
   when the user has actually saved finance data (`hasSavedFinanceState()`).
2. **Client context is a convenience, not an authority.** As context grows past what
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
"can I afford this?" and it answers with *your* runway and DTI, not generics.

### Phase 2 — One memory, one identity
- **Unified thread persistence** (audit T2.6): widget uses `sessionStorage`, chat
  uses `localStorage` — same friend, different amnesia. Move both to the existing
  `advisor_conversations` / `advisor_messages` tables so the mote remembers across
  devices, with local storage as the anonymous fallback.
- **Server-side context assembly**: for signed-in users, the route reads
  `financial_snapshots`, `goals`, and `credit_snapshots` directly (RLS-scoped) so
  the Companion's knowledge doesn't depend on which browser the user opened.
- **Cross-surface continuity**: opening the widget mid-conversation shows the same
  thread the full-page chat holds.

### Phase 3 — The go-to for anything financial
- **Plaid-aware context**: once the transactions table lands (known limitation in
  `lib/plaid/sync.ts`), summarize real cash flow into the spine — always summarized
  server-side, never raw transactions in a prompt.
- **Credit awareness**: `credit_snapshots` in the spine; the mote can explain what a
  620 hard stop means with the user's actual trajectory.
- **Tool hand-offs**: the mote recommends HōMI tools by name with the user's numbers
  pre-loaded ("run your real numbers through the debt payoff planner — I'll be
  there"). Deep-link with query params; the planner persona already names tools.
- **Behavioral genome**: `behavioral_genome` informs *how* the mote talks (pace,
  framing), never *what* it claims.

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

## 5. Non-negotiables (inherited from BUILD-BRIEF)

- Scoring canon frozen: the Companion *reads* scores; it never computes or adjusts
  them. Scoring stays server-authoritative in `lib/scoring/engine.ts`.
- Brand canon: it is always **HōMI Companion** — HōMI like homie.
- No financial, legal, tax, mortgage, or investment advice. Ever. Every phase above
  is educational context, plainly stated.
- Every AI surface stays behind `gateCompanion()`; anonymous access only via the
  fixed-context demo mode.
- Graceful degradation: every surface keeps a deterministic fallback
  (`lib/advisor/fallback.ts`) so the mote never goes dark when the model does.

## 6. Success measures

- % of active users who talk to the Companion weekly (engagement hook).
- Assessment completion rate for users who touched the Companion first.
- Share of Companion conversations where real user context (finance or assessment)
  was present — the "does it actually know me" metric.
- Free → Plus conversion attributable to honest 402 nudges (not dark patterns).
