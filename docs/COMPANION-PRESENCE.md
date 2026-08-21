# Companion Presence Doctrine

**Status:** Locked (Home fold Phase)  
**Authority:** This file for presence on signed-in Home. Chat voice rules remain in
`app/api/advisor/route.ts` and `COMPANION-ECOSYSTEM.md`. Executable fold copy lives in
`lib/dashboard/fold-truth.ts` (`companionFoldLine`, `COMPANION_FOLD_LINES`).

The Companion is not a chatbot feature. It is the emotional contract of the product:
protect the user’s future self with radical honesty and zero conflict of interest.

---

## Identity

- **Your Homie, not your banker.**
- **Not yet is not no.**
- Voice: Precision Empathy · Calm Authority · Cinematic Clarity · Radical Honesty.
- Numbers come only from the deterministic scoring engine. Companion never calculates.
- Educational only. Not financial, legal, tax, or mortgage advice.
- Brand tokens, WEIGHTS, scoring engine, and the legal wall are read-only.

---

## Presence vs chat

- Companion is **presence**, not a permanent chat panel on Home.
- On the Home fold it may speak only as a **single calm line**
  (`data-companion-fold-line` in `components/dashboard/HomeFold.tsx`).
- Path owns the fold hero (`PathNextMove`). Companion never competes for the
  primary action.
- Admin / marketing (`/admin`, `/admin/*`): Companion stays **off**
  (`CompanionHost` / `CompanionWidget` pathname gate).

---

## Five presence states

| State | When | Home fold behavior |
| --- | --- | --- |
| **1. Silent Witness** | Default when stable / no need to speak beyond the line | No chat panel; at most the single fold line when a fold case applies |
| **2. Hard-stop Guardian** | Any active hard stop | Guardian line only (exact string below) |
| **3. Path Guide** | Assessment + Path exist | Path Guide line; Path CTA remains primary |
| **4. Score Rail** | Secondary reading of score / verdict | Compact rail only — Companion does not narrate math |
| **5. Escalation** | User explicitly asks, or genuine emotional need | Full conversation opens **elsewhere** — never on the fold |

State resolution for the fold line (priority): Guardian → Path Guide → assessment-only map → first-run. See `companionPresenceState()` / `companionFoldLine()`.

---

## Exact fold language (locked)

One sentence. No second sentence. No promotional language.

| Condition | Exact string |
| --- | --- |
| Hard stops present | `A hard stop is the read right now. The path names what has to move first.` |
| Assessment + Path exist | `Your next honest move is the binding step on Path to Ready.` |
| Assessment only | `You have a read. Path to Ready is the map from here.` |
| Empty / first-run | `One measurement and this page has a build to show.` |

SSOT: `COMPANION_FOLD_LINES` in `lib/dashboard/fold-truth.ts`.

---

## Silence rules

- Cadence: at most weekly unsolicited speech + user-initiated + hard-stop events
  (chat surfaces; fold line is deterministic presence, not a campaign).
- Never FOMO, scarcity, social proof, or banker language.
- Never soften **DO NOT PROCEED**.
- Lead with protection, never permission.
- Ask before assuming on Emotional Truth (chat).
- Stay in the relationship; treat the user as a whole person.

Chat-turn silence heuristics live in `lib/advisor/silent-witness.ts` and do **not**
replace the four locked fold strings.

---

## Escalation path (stub)

Full conversation opens at:

```
COMPANION_ESCALATION_HREF → /advisor
```

(`lib/dashboard/fold-truth.ts`)

- Home fold must **not** mount `CompanionHost`, chat panels, floating avatar,
  or voice UI.
- The fold line panel carries `data-companion-escalate-href` so a future control
  can deep-link without inventing a second primary CTA on the fold.
- Do not add a second filled primary button next to Path’s fold CTA.

---

## Forbidden behaviors

- Chat UI, floating bubble, or avatar **on** the Home fold first viewport.
- Companion calculating scores, inventing WEIGHTS, or contradicting hard stops.
- Competing with Path for the primary action.
- Softening hard stops or NOT_YET / DO NOT PROCEED.
- Promotional, FOMO, scarcity, social-proof, or banker copy on the fold line.
- Companion on admin / marketing surfaces.
- Longer fold copy than the four approved strings.

---

## Definition of done (this phase)

- [ ] `docs/COMPANION-PRESENCE.md` matches this doctrine.
- [ ] `companionFoldLine` emits only the four approved strings.
- [ ] Home fold shows Path as hero + exactly one Companion line panel (no chat).
- [ ] Empty / first-run fold still shows the first-run Companion line.
- [ ] Escalation href is documented and stamped on the fold line for future use.
- [ ] `npm run brand-check`, `npm run typecheck`, and Home / fold-truth tests green.
- [ ] `PathNextMove` hierarchy (Phase 1) untouched.
