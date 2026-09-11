# CONTEXTUAL_HOMI_CRAFT v4 — 2026-09-11

**CLEAR:** Product PR I + Finance PR I (this floor)  
**Mocks:** `docs/design/brand-shell-craft/` (`contextual-homi-default-v4`,
`contextual-homi-hard-stop-v4`, `contextual-homi-empty-v4`) — orientation only,
**≠ PIXEL**. Mock copy must not ship as Production invent $ / a second score.  
**ADR:** `docs/adr/006-signed-in-product-v4-retires-operate-chrome.md`  
**Flag:** same `HOMI_V4_HOME_ENABLED` / `isV4RouteActivated`. No second flag.

Signed-in Contextual HōMI is the Shell v4 **right column** plus **Ask HōMI** in the top
command. Optional `/ask` opens the same surface. Stay draft. Do not undraft, merge, or
deploy Production.

## Locked

- Desktop: right column 300–340 (`V4_HOMI_RAIL_WIDTH_PX` 320). Full-height column, not a
  floating overlay. Primary rail selected = lift + **2px cyan edge**, no glow, no cyan
  pill. Compass stays in the shell rail, never on the fold.
- Mobile: Ask/HōMI as a **sheet** from the top command, or More depth. Never a fifth
  bottom-nav peer (Home · Money · Path · More stays).
- `/ask` is V4_PENDING, flag-gated. Home stays selected. Not a peer dashboard.
- Explain + deep-link only to Path / Money / Compare / Assess / Home. Never mint
  AssessmentResult / verdict / hard-stop override. Never invent $.
- States on `/ask`: empty (Assess CTA, no fake readiness) · hard-stop ACTIVE (explain-only,
  never On track / READY) · default (quiet last-read explain + ≤2 deep-link cards).
- Educational label on illustrative claims. No craft-badge prose in the fold.
- No Homie cast. No fake live-AI typing. Reuse advisor/ask surfaces — adapt into Shell v4.

## Ask placeholders (workspace-bound)

| Surface | Placeholder |
| --- | --- |
| Home / `/ask` | Ask HōMI about this readiness... |
| Money | Ask HōMI about this financial picture... |
| Path | Ask HōMI about this path... |
| Compare | Ask HōMI about this comparison... |
| Assess intro | Ask HōMI about this decision... |
| Assess question | Ask HōMI about this question... |

## Prompts (≤3–5, deep-link only)

**Home / Ask · default:** What does this readiness mean? · Why Path leads from here · Deep-link Money without a second score  
**Home / Ask · hard-stop:** What does this hard stop mean? · Open Path from this hold · When to retake Assess  
**Home / Ask · empty:** What does Assess cover? · Start a readiness read · Why there's no score yet

## Kill list

Second score · invent $ · On track under hard stop · Homie cast · floating overlay ·
fifth bottom Ask peer · compass as score instrument · FI v2 / WEIGHTS

## Soft nits (P2)

Mock pixel-match vs brand-shell-craft stills. Do not block the stay-draft.
Raise the bar vs Compare on column (not overlay), no craft-badge prose, 2px cyan edge,
and no fake typing.
