---
title: Post-login audit — let users experience their build
source: Claude Code (design audit, two-lens review)
date: 2026-08-17
status: design — not yet implemented
surface: post-login (`/dashboard`, `/path`, `/plan`, `/results`, `/onboarding`)
sections: Section 1 (Assessment/Readiness surfaces) + Section 5 (Chrome/IA) — no writes to Section 0 or 8
related: DESIGN.md, CANON.md, docs/SECTIONS.md
---

# Post-login audit — let users experience their build

## The one-sentence verdict

**After login, HōMI hands you a grade. It never hands you a build.**

The product's whole vocabulary is construction — `BUILD_FIRST`, Path to Ready,
binding constraint, "softest lever first." The screen a user actually lands on is
a report card: a numeral, a band, and a spectrum from Not Yet to Ready.

## Two lenses, one finding

**The craft lens — _does it feel built?_**
Nothing on the post-login surface accumulates. "Verdict held · 3 days."
"Check-ins · 2/7." "Journal · 4." Those are attendance records. A build has
mass — courses laid, a thing that is measurably taller than it was last month.
A user who has done six weeks of real work sees a dashboard that looks
identical to week one with different digits in it.

**The subtraction lens — _what is the one thing this screen is for?_**
Today the honest answer is "your number." But the number is a *measurement of*
the build, not the build. Nobody opens their project to look at its grade. The
score belongs on the instrument rail, in mono, next to its delta — where a
reading belongs. The fold belongs to the thing being built.

Both lenses land on the same move: **invert the hierarchy. The build is the
hero; the score is its reading.**

---

## Findings

Ranked by severity. Every claim is anchored to code in this repo.

### F1 · CRITICAL — The first minute is an empty room

Every module below the hero is gated on `latest`
(`app/(product)/dashboard/page.tsx:474`). A user who just signed up, clicked
through the three onboarding steps, and landed on `/dashboard` sees exactly two
things: a greeting, and one empty-state card
(`app/(product)/dashboard/page.tsx:460`). No metric rail, no pillars, no
history, no quick actions, no path.

The single most important minute in the product renders as a near-blank navy
page with two buttons on it.

**Fix:** never land a scoreless user on a score page. Route by state at the
door, not by convention.

### F2 · CRITICAL — The build is client-only and below the fold

`PathNextMove` (`app/(product)/dashboard/page.tsx:466`) is a `"use client"`
island that hydrates from `localStorage`, then pulls the server copy
(`components/dashboard/PathNextMove.tsx`). Consequences:

- On a new device, first paint has **no build at all**.
- It renders *after* the instrument, *under* the fold.
- The thing the user is supposedly building is the last element on the page to
  exist.

**Fix:** server-render the path into the dashboard. `GET /api/readiness-path`
already exists and is already validated. The page already runs six parallel
server queries in one `Promise.all` — make it seven.

### F3 · HIGH — The score outranks the build in the hierarchy

`OperateInstrument` gives the entire fold to compass + `HeroScore` numeral
(`:350`) + verdict chip + spectrum + `ActionDock` (`:403`). DESIGN.md's own
definition of done asks for a "3-second hierarchy test on dashboard (score +
next step obvious)." That test encodes the wrong priority.

**Fix:** the correct 3-second test is **"what am I building, and what is the
next course?"** Hero becomes the build — current stage, binding constraint,
next step. Score moves into `MetricRail` as a mono reading with its
`ScoreDeltaBadge`, which is exactly what it is.

### F4 · HIGH — Four surfaces own one story

`/results`, `/path`, `/plan`, and `/report/{id}` all narrate readiness. The
codebase carries a nine-line comment (`app/(product)/path/page.tsx:52-61`)
explaining which page does what and warning agents not to duplicate jobs across
them.

If the codebase needs that comment to keep them straight, so does the user —
and the user never gets one.

**Fix:** collapse to two.

| Surface | Job |
| --- | --- |
| **The Build** | Living, singular, the post-login home. Absorbs `/path` and `/plan`. |
| **The Record** (`/report/{id}`) | The frozen, shareable, printable artifact of one measurement. |

`/results` stops being a destination and becomes the reveal *transition* into
the Build.

### F5 · HIGH — Onboarding is a write-only dead end

`profiles.onboarding_completed` is written at
`app/(product)/onboarding/page.tsx:23` and **read nowhere in application
code** — the only other references are the type definition (`types/database.ts:27`)
and an RLS test. Meanwhile `safeNext`'s fallback is `/dashboard`
(`lib/auth/safeNext.ts:7`) for every sign-in.

So: a user who abandons onboarding is never brought back to it, and a user who
finished it gets the identical dashboard to one who never saw it. The column is
a promise the product does not keep.

**Fix:** read it or drop it. A field that is written and never read is a lie in
the schema. Reading it is the cheaper option — it is the natural switch for the
first-run Build state in F1.

### F6 · MEDIUM — 70 product pages, 36 catalog destinations, 14 in the rail

`find app/(product) -name page.tsx` returns **70**. `lib/layout/nav-catalog.ts`
carries **36** destinations; four are header-primary and ten are under More.
Genome, Trinity, Twin, Signals, Decisions, Calibration, Simulator, Scenarios,
Timeline and Shadow Score each promise a different lens on the same three
numbers.

`AppSidebar`'s Measure → Understand → Act → Reflect grouping is a good instinct
applied one layer too late: it *labels* an inventory instead of reducing it.
The comment in the file is candid that it is "a *labeling* change only."

**Fix:** the question is not "which pages do we delete." It is **"which of
these are instruments the Build calls for at a stage?"** Surface them from
inside the Build when the stage needs them; leave ⌘K as the escape hatch for
everything else. A tool nobody can find at the moment they need it is not a
feature.

### F7 · MEDIUM — Nothing shows cause and effect

`VerdictCelebrate` fires only when a verdict *band* improves
(`components/dashboard/VerdictCelebrate.tsx:23`) — a rare event. Completing a
path step via `completePathStepWithImpact` produces no visible receipt on the
dashboard. A user does real work, returns, and the page looks the same.

**Fix:** the receipt *is* the product. Every completed step writes a line into a
visible build ledger stating what it moved. That loop is what brings people
back — not a reminder email.

### F8 · MEDIUM — The metrics measure compliance, not construction

The `MetricRail` cells are Verdict held · Strongest · Check-ins 7d · Journal
(`app/(product)/dashboard/page.tsx:477-529`). Three of the four are attendance.
None answers "how much of my build is done?"

`pathCompletionRatio()` already exists (`lib/readiness/progress.ts:315`) and is
used on `/path`, `PathToReadyCard`, and the planner overview — but **never on
the dashboard**. The number is already computed. It is simply not shown where it
matters.

**Fix:** build progress becomes the rail's first cell.

---

## The proposal — "The Build"

### 1. Route by state at the door

One function, called once after auth. Replaces the blanket `/dashboard`
fallback in `safeNext`.

| User state | Lands on |
| --- | --- |
| No assessment | Shadow Score, in place — two minutes to a real read |
| Assessment, not READY | **The Build** |
| READY | The decision surface |
| Partner / employee / admin role | Their hub (already handled by the switcher) |

### 2. The Build fold, top to bottom

1. **What you're building** — the decision, named, from `decision_type`, which
   the dashboard already loads and currently only passes to the sidebar
   (`:303`). "A house, spring 2027." Not "Good morning, Cody."
2. **How far up it is** — the structure: courses complete, course in progress,
   and the binding constraint holding the next one. Verdict tint carries state;
   the existing `ThresholdCompass` becomes the capstone, not the headline.
3. **The next course** — one action, the binding step, completable in place.
4. **The reading** — score, delta, and the three pillars as instruments *on* the
   build, in mono, in the rail.
5. **The ledger** — what you did and what it moved, newest first. This is the
   part that accumulates. This is the part users screenshot.

### 3. What gets cut

- `/plan` as a destination — folds into the Build's near-term list.
- `/results` as a destination — becomes the reveal transition.
- The greeting as the page's headline.
- Three of four compliance metrics in the rail.

### 4. Build order

| Phase | Work | Ships |
| --- | --- | --- |
| 1 | Server-render the readiness path into `/dashboard`; add `pathCompletionRatio` to the rail | F2, F8 |
| 2 | State-based post-login routing; read `onboarding_completed`; first-run Build state | F1, F5 |
| 3 | Invert the fold — build hero, score to rail; update DESIGN.md's 3-second test in the same commit | F3 |
| 4 | The ledger — completed steps with their impact | F7 |
| 5 | Collapse `/plan` and `/results` into the Build; re-point nav catalog | F4, F6 |

Phases 1 and 2 are additive and carry no doctrine collision. Phase 3 edits
DESIGN.md's definition of done, so per CANON.md's amendment procedure it is a
PILOT on one named surface (`/dashboard`) with a named revert, or it goes to
CANON with the doctrine file edited in the same commit.

---

## Boundaries respected

- No changes proposed to `lib/scoring/*`, verdict thresholds, pillar weights, or
  the four hard stops. The scoring canon is frozen and stays frozen.
- No new palette, typeface, or visual language. Every element above is built
  from existing tokens and existing `components/operate/*` primitives.
- No light surfaces. Navy only.
- Findings F3 and F4 touch DESIGN.md doctrine and are flagged as such rather
  than assumed.
