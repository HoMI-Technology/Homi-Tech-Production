# PR H — Compare v4 product brief — 2026-09-11

**Status:** CLEAR  
**PR:** stay-draft PR H — do **not** undraft  
**Section:** 5 — Planning / Decisions (Compare / `/scenarios`) + Shell v4 chrome already on `main`

## Decision

Product CLEAR for Compare v4 craft. Implementation may continue on the stay-draft
PR. This is **not** APPROVE VISUAL DIRECTION, not merge, and not a second flag.

## Locked

1. Route **`/scenarios`** — rail label **Compare**. Optional `/compare` →
   `/scenarios` alias only. Do not invent a second workspace.
2. **Educational scenarios only.** Reuse `lib/readiness/scenario*.ts` and
   `lib/tools/scenarios.ts`. Adapt UI into Shell v4. Do not rewrite trusted
   simulation math. Do not mint AssessmentResult / verdict / hard-stop override.
3. States: empty · hard-stop (educational-only, never On track) · normal ≤3–4
   approved cards · stale / error honesty with quiet age.
4. Empty or live SSOT only. Never invent $ / fake results. Illustrative deltas
   (if any) stay labeled Educational. Compare **never writes** official score.
5. Same flag dual gate (`HOMI_V4_HOME_ENABLED`). Keep #397 client post-login law.
   Mobile: Compare under More (desktop primary four unchanged).
6. Raise the bar vs Money: selected Compare = 2px cyan edge, no glow/pill. Ask
   placeholder *Ask HōMI about this comparison...*. Right HōMI is a column, not
   a floating overlay. No verbose fixture meta in the fold. JetBrains Mono for
   live SSOT numbers only.
7. Ultra Premium + Shell v4 selected law. Compass shell-only. No Homie cast.

## OUT

Undraft / merge / Production deploy · second flag · second official score ·
invent $ · On track under hard stop · glow/pill selected · floating Clarity ·
invent SKUs · compass on fold · FI v2 / WEIGHTS · Pixel Gate skip
