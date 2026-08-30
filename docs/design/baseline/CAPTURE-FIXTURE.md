# Capture fixture — Baseline 001 before/after pairs

A before/after only proves something when both frames show the **same
screen in the same state**. This file pins that state. It is binding on
any fold PR citing Baseline 001.

Baseline PNG under comparison: `2026-08-29-verdict-screen-BASELINE.png`
(**1194 × 849**, founder capture, 2026-08-29, verdict: "this is horrible").

## 1. Product state — must match exactly

| Condition | Required value | Why it matters |
|---|---|---|
| Surface | signed-in `/dashboard` first screen (ThresholdFold) | the fold under review |
| Score | **61** (from the last `AssessmentResult`, not a live score) | defect 5 (crimson numeral), defect 8 (61 vs DNP) |
| Verdict | **DO NOT PROCEED**, hard stop ACTIVE | defect 3 (hard-stop wall), defect 4 (Hot chip) |
| Runway | **0.5 mo** | defect 8 (runway overrides the score) |
| Cash | **missing / not connected** → renders `—` | **defect 2 is unjudgeable if accounts are connected** |
| Path primary | present (SSOT copy: "Stabilize emergency runway to at least 1 month") | defect 6 (density), CTA hierarchy |

Do **not** connect accounts, re-run an assessment, or seed different data
before the after-capture. Changing the fixture invalidates the pair —
report a blocked capture instead of substituting a different state.

## 2. Viewport and environment

- Width **1194 px** (match the baseline; note the baseline is a card crop —
  state in the PR whether the after is full-viewport or the same crop, and
  keep it consistent between before and after).
- Default zoom, default theme (dark navy — no light mode exists), no
  devtools panel in frame, no browser chrome in the crop.
- Real render in a real browser. **Never a hand-made mock, never a
  code-derived approximation.** Pixels decide visual claims.

## 3. The animation trap — read before capturing

`components/brand/ThresholdCompass.tsx` rotates the three ring groups
continuously: `.ring-outer` 20s CW, `.ring-middle` 15s CCW, `.ring-inner`
10s CW (`app/globals.css:914-928`). **The ring node dots travel with the
rings**, so *defect 1 (a node colliding with the "61") is intermittent — it
appears and disappears on a 60-second composite cycle* (LCM of 20/15/10).

Two consequences, both mandatory:

1. **A single lucky-phase after-frame proves nothing about defect 1.** A
   capture taken when no node is near the centre will look fixed while the
   collision still happens seconds later. This is the most likely way a
   still-broken fold passes review.
2. **Reduced motion is not a substitute either.** Under
   `prefers-reduced-motion: reduce`, `globals.css:1022-1028` sets
   `animation: none !important`, freezing the dots at their authored
   coordinates (cardinals/diagonals) — positions that never overlap the
   numeral. A reduced-motion still therefore **hides defect 1 by
   construction**.

**Required capture set for any fold PR:**

- **A. Reduced-motion still** (`page.emulateMedia({ reducedMotion: "reduce" })`)
  — deterministic and repeatable; this is the frame that adjudicates
  defects 2–8 (cash empty, hard-stop copy, Hot, numeral colour, density,
  edge-glow, runway-overrides-score line).
- **B. Motion sweep** — captures across a full 60s cycle (12 frames at 5s
  intervals is sufficient) with animation running. **Defect 1 is fixed only
  if the numeral stays legible in every frame.** Attach the worst frame.

The fix for defect 1 must therefore be geometric — z-order/backing plate,
or a node-exclusion zone around the numeral's bounding box — never a
timing tweak, and never by redrawing the compass mark (canon).

## 4. What the PR must contain

Before PNG (the baseline, or a re-capture of the pre-fix state at the same
fixture), after PNG set (A + worst frame of B), the eight defects listed
with per-defect verdict and the frame that proves it, and confirmation
that no new canon violation was introduced: compass mark untouched, locked
palette, "Decision Readiness Score" naming, score displayed and never
zeroed under a hard stop.
