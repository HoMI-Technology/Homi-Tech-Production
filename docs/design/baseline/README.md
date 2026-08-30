# Visual Baselines — where the redesign starts

This directory holds **founder-reviewed screenshots of the current product**.
They are the floor, not the target. The founder's verdict on the first one,
verbatim: **"this is horrible."** Treat every baseline as a screen that has
already failed review.

## Rules for all redesign agents

1. **Pass 1 duty:** capture a baseline screenshot of every `app/(product)/`
   route (browser_use agent, real render, logged-in where applicable) into
   this directory as `<date>-<route>-BASELINE.png` before redesigning it.
2. **No redesign is done without a before/after.** Render the new screen,
   place it next to the baseline, and the hostile self-audit judges the
   pair. "The code is better" is not evidence; the pixels are.
3. A new screenshot replaces a baseline only after the founder or the
   hostile audit accepts it — then it becomes the new floor.

## Baseline 001 — verdict/score screen (2026-08-29)

`2026-08-29-verdict-screen-BASELINE.png` — founder-rejected. Observed
defects (from the actual pixels — verify component anchors before fixing):

1. **Ring node collides with the score numeral.** A dot on the yellow ring
   overlaps the "61", reading as "6·1"/broken glyph. Orbital node positions
   must exclude the numeral's bounding box (or the numeral layer must
   z-index above with a backing plate).
2. **Missing data rendered as a bare em-dash:** `CASH —`. A missing value
   needs an honest empty state ("Connect accounts to see cash") — a dash
   next to a hard-stop verdict reads as broken, not pending.
3. **The hard-stop message is a full-width ALL-CAPS red sentence** with wide
   tracking across ~2 lines. Unreadable exactly where reading matters most.
   Needs sentence case, narrower measure, hierarchy (short headline +
   supporting line), and calm-but-firm tone per DESIGN.md.
4. **`DO NOT PROCEED · Hot` is cryptic.** The temperature vocabulary
   (`temperature: "Hot"` — see `components/home/ThresholdPreview.tsx` for
   the vocabulary) is unexplained on the surface where it matters. Either
   explain it inline or drop it from this screen.
5. **Score color conflates score with verdict.** The "61" renders in
   red/crimson — crimson is the DO-NOT-PROCEED badge color (CANON), not a
   score color. The score is a measurement; the verdict is the judgment.
   Numeral should be `.score-numeral` treatment; verdict badge carries the
   color.
6. **Dead space dominates.** One stat pair + one badge + one CTA floating
   in a huge dark card. Information density is far below what an OPERATE
   surface owes a user in a hard-stop state: where's the runway math, the
   gap to the next band, the path items?
7. **Asymmetric red edge-glow** on the left border reads as a rendering
   artifact, not intent.
8. **Verdict/score tension unexplained on-screen.** 61 with DO NOT PROCEED
   is canon-correct (gates override score) but visually unexplained — the
   screen must say "score 61, but a hard stop overrides it" or users will
   distrust the number.

## Provenance — RESOLVED (re-verified against origin/main 2026-08-29)

**The screenshot IS the current upstream dashboard direction.** After
fetching origin (local was 89 commits stale), the marker string
`Full disclaimer` exists on origin/main in
`components/dashboard/ThresholdFold.tsx` — new in the draft series #335
("dashboard unification — Path-led HōMI fold"), #336 ("AppSidebar HōMI
rail"), #337 ("signed-in first screen is the Threshold Compass").
**The founder's "this is horrible" is therefore a verdict on the in-flight
#335–#337 redesign itself, not on legacy UI.** Consequences:

1. The 8 defects above are feedback on ThresholdFold + its compass — fix
   THAT component family on top of origin/main.
2. Whoever/whatever is producing #335–#337 (draft commits, likely another
   agent stream) must receive this baseline before their next iteration —
   otherwise two agent fleets iterate the same fold in opposite directions.
3. The earlier analysis below (kept for the record) reached "probably not
   main" honestly — but against an 89-commit-stale checkout. Sync first,
   always.

<details><summary>Superseded pre-sync analysis (stale-main evidence)</summary>

**This screenshot is probably NOT current main.** The string
`Full disclaimer` appears nowhere on main — it exists only in
`components/dashboard/HomeFold.tsx` on the branch worktrees
`C:\dev\worktrees\homi-production--slice-v0`
(`feat/slice-v0-guest-assessment`, tip includes #326 "polish verdict fold",
#331 naming rescue, #332) and `pr-326-fix`. Main's dashboard composes
`brand/ThresholdCompass` + `VerdictBadge` + `ScoreHistory` instead, and
branch HomeFold's own comment says "No compass" — so the screenshot matches
neither variant exactly and may be the currently DEPLOYED build (older code).

**P0 for pass 1 — before any redesign of this screen:** render all three
candidates (main `/dashboard`, slice-v0 `/dashboard`, the production URL)
and record which one the founder's screenshot came from. Redesigning main's
version while prod serves a branch build fixes the wrong thing. Surface the
main-vs-slice-v0 divergence to the founder as a decide-first item: which
dashboard is the intended base?

## Verified code anchors (confirmed in-code 2026-08-29)

- **THREE ThresholdCompass implementations exist.**
  `components/brand/ThresholdCompass.tsx` (padlock-in-rings glyph, the one
  everything imports), `components/finance/ThresholdCompass.tsx` (238 lines,
  score version — **zero importers found: dead duplicate**), plus a third in
  the archived budget-planner repo. The finance one also still renders
  "HōMI-Score" and "35 · 35 · 30" (`finance/ThresholdCompass.tsx:169-172`)
  — violating the 2026-08-23 naming ruling (#313). Delete or consolidate;
  never let an agent "fix" the dead one.
- **Center-pip-over-numeral geometry is real in code:** the finance compass
  draws a verdict-colored `circle cx=100 cy=100 r=6` at the exact centroid
  (`finance/ThresholdCompass.tsx:198`) with the numeral adjacent; the brand
  one draws its pip at `cx=100 cy=96` (`brand/ThresholdCompass.tsx:108`).
  Whatever variant produced the screenshot, the fix is pip position/z-order
  — never redrawing the mark (compass canon).
- Verdict system: `components/ui/verdict-ssot.ts`, `VerdictBadge.tsx`
  (screenshot's `DO NOT PROCEED`); temperature vocabulary (`Hot`) defined in
  `components/home/ThresholdPreview.tsx:79-81`.
- CTA copy "Grow emergency fund toward 3–6 months":
  `lib/readiness/path.ts:351`.
- Branch HomeFold hard-stop block (`worktrees .../HomeFold.tsx:~114-128`)
  is already sentence-case with a list — closer to right than the
  screenshot's ALL-CAPS wall, more evidence the screenshot predates #326.
- `CASH —` em-dash fallback: formatter not yet pinned (planner
  `ReadinessHero.tsx` uses `Number.isFinite(...)` guards; the screenshot
  variant's formatter to be identified during the P0 render).

</details>
