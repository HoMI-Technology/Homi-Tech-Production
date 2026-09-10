# PATH_CRAFT v4 — 2026-09-10

**CLEAR:** Product PR F + Finance PR F (this floor)  
**Mocks:** `docs/design/brand-shell-craft/` (`path-empty-v4`, `path-hard-stop-v4`) — orientation only, **≠ PIXEL**  
**ADR:** `docs/adr/006-signed-in-product-v4-retires-operate-chrome.md`  
**Flag:** same `HOMI_V4_HOME_ENABLED` / `isV4RouteActivated`. No second flag.

Signed-in Path workspace on **`/path`**, inside Shell v4 `main#main`. Stay
draft. Do not undraft, merge, or deploy Production.

## Locked

- Route is `/path` only (already V4_PENDING). Primary rail Path is selected
  (lift + ~2px cyan edge). Compass stays in the shell rail, never on the fold.
- Max **7** steps from `AssessmentResult` + path-rules SSOT
  (`lib/readiness/path.ts`). Adapt the engine into Shell v4. Do not invent a
  parallel score.
- States: empty (Assess CTA, no fake steps) · hard-stop ACTIVE (kind hold,
  steps address the stop, never On track / READY) · normal ≤7 honest ·
  complete (no pad-to-7).
- Home NextPath / Path CTAs and the rail Path item land on `/path`. Path body
  deep-links **Assess** (`/assessment`) and **Money** (`/money`) only. No
  ledger / invent $ in the Path body.
- Right HōMI is contextual educational prompts — not a second score.
- Fixture stills (`HOMI_V4_VISUAL_FIXTURE`) stay Preview-only.

## Kill list

Pad-to-7 filler · On track under ACTIVE hard stop · invent $ / score · compass
on fold · Money / Plaid UI · large cyan pills · card soup · Homie cast

## Soft nits (P2)

Mock pixel-match vs brand-shell-craft stills. Do not block the stay-draft.
