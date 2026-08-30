# Copy lock — three rulings (30 Aug 2026)

**Role:** Marketing copy lock for Dev to implement. This file is the lock. Do not implement here.

**Stay draft. Do not merge. No Production. Never post.**

**KEEP** starting SHA `dcad50ba75c3198426c6330c43a137686ca614cf` (`dcad50ba`). Do not touch PR #349.

**Out of scope for this lock:** homepage or First Moment implementation, nav changes, Companion catalog row, reviving `/advisor` in nav, product/TSX/test edits.

**Banned in this lock and any added prose:** world's first, Decision Intelligence OS, Mint/Credit Karma killer, lender energy, HōMI-Score, HōMI Compass, product pitches.

Strings below are character-exact. Do not rewrite.

---

## Ruling A — duration

Drop “about 5 minutes.” Say “45 questions.” Homepage + First Moment.

| Surface | File (at dcad50ba) | Current | Replacement |
| --- | --- | --- | --- |
| Homepage hero | `components/home/InterviewHero.tsx` | Free · about 5 minutes · educational only | Free · 45 questions · educational only |
| Homepage close | `components/home/FrontDoor.tsx` CloseCta | Free · about 5 minutes | Free · 45 questions |
| Homepage signal layer | `components/home/FrontDoor.tsx` `OS_LAYERS[0].copy` | A five-minute assessment turns Financial Reality, Emotional Truth, and Perfect Timing into one Decision Readiness Score and a protective verdict. | A 45-question assessment turns Financial Reality, Emotional Truth, and Perfect Timing into one Decision Readiness Score and a protective verdict. |
| First Moment handoff | `components/marketing/first-moment-copy.ts` `FIRST_MOMENT_HANDOFF_LINE` | This takes about 5 minutes. You’ll need an account so the verdict stays yours. | This is 45 questions. You’ll need an account so the verdict stays yours. |

Keep the curly apostrophe in You’ll.

Tests that currently lock the old First Moment line (Dev updates when implementing):

- `__tests__/marketing/first-moment-copy.test.ts`
- `__tests__/support/policy/source-lock-facts.ts`

Also lock the same current line (Dev updates when implementing):

- `__tests__/assessment-guest-gate.test.ts`
- `__tests__/marketing/FirstMoment.test.tsx`

---

## Ruling B — public verdict

Unify public verdict to DO NOT PROCEED. Kill homepage NOT YET / `PUBLIC_VERDICT_LABELS` split.

At `dcad50ba`, `components/home/FrontDoor.tsx` defines `PUBLIC_VERDICT_LABELS` and maps `NOT_YET` → `"NOT YET"` while ADR-001 / `VERDICT_META` keeps the in-product badge as DO NOT PROCEED. Kill that split. Do not rewrite DESIGN.md dual-vocab history; the live homepage split is the ruling.

Dev implement:

- Delete `PUBLIC_VERDICT_LABELS`.
- VerdictSpectrum renders `VERDICT_META[key].label` so the fourth public name is DO NOT PROCEED (enum key may stay `NOT_YET`; the LABEL is DO NOT PROCEED).
- `STEPS[2]` detail current: `One of four honest verdicts. Not yet is one of them, on purpose.`
  Replacement: `One of four honest verdicts. DO NOT PROCEED is one of them, on purpose.`
- `STEPS[3]` detail current: `The map of what to build first, so a not-yet verdict has a path.`
  Replacement: `The map of what to build first, so a DO NOT PROCEED verdict has a path.`

KEEP (not verdict badges; canon voice / warm prose):

- CloseCta headline “Not yet is not no.” (CANON)
- First Moment beat 2: `I might tell you not yet. Not because I don’t want to help. Because I do.`
- Other “Not yet is not no.” voice uses

---

## Ruling C — Companion HOLD

HOLD Companion as launch-promised. Soften homepage “AI agent layer / Specialized companions.” Do not invent nav. Do not add a Companion catalog row. `dcad50ba` already deleted the parked Companion `/advisor` catalog row; do not put it back.

`FrontDoor.tsx` `OS_LAYERS[2]` current:

- label: Intelligence (keep)
- title: AI agent layer
- copy: Specialized companions help interpret the verdict, pressure-test tradeoffs, and keep the reasoning trail connected to your actual readiness state.
- href: `/agents`
- action: Meet the agents

Replacement:

- label: Intelligence
- title: After the verdict
- copy: The answer is not a dead end. See what is carrying the risk, and what would have to change before you move. Tied to your readiness, not to someone paid to say yes.
- href: `/how-it-works`
- action: See the method

Do not point this card at `/advisor`. Do not add nav entries. Do not add a Companion catalog row.
