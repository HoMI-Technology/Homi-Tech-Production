# MONEY_CRAFT v4 — 2026-09-10

**CLEAR:** Product PR G + Finance PR G (this floor)  
**Mocks:** `docs/design/brand-shell-craft/` (`money-empty-v4`, `money-hard-stop-v4`,
`money-connected-v4`) — orientation only, **≠ PIXEL**. Mock $ must not ship as
Production invent.  
**ADR:** `docs/adr/006-signed-in-product-v4-retires-operate-chrome.md`  
**Flag:** same `HOMI_V4_HOME_ENABLED` / `isV4RouteActivated`. No second flag.

Signed-in Money workspace on **`/money`**, inside Shell v4 `main#main`. Stay
draft. Do not undraft, merge, or deploy Production.

## Locked

- Route is `/money` only (already V4_PENDING). Primary rail Money is selected
  (lift + **2px cyan edge**, no glow, no cyan pill). Compass stays in the shell
  rail, never on the fold.
- Plaid + ledger **REUSE_ENGINE**. Adapt the picture into Shell v4. Do not
  rewrite trusted sync/math. Do not invent balances.
- States: empty (Connect accounts, no fake $) · hard-stop ACTIVE (kind hold,
  empty-or-live, never On track / READY) · connected live with **always age** ·
  stale / syncing / error honesty.
- Money never writes official score. AssessmentResult stays Home/Assess SSOT.
  Hard-stop chrome is last-read only.
- Ask placeholder: **Ask HōMI about this financial picture...** (top command +
  right column). Right HōMI is a **column**, not a floating overlay.
- JetBrains Mono for **live $ only** — never for empty copy, labels, or a
  second score numeral.
- Fixture stills (`HOMI_V4_VISUAL_FIXTURE`) stay Preview-only. Connected craft
  figures ($4,280 / Example Bank) are orientation — live Plaid SSOT wins at Pixel.

## Kill list

Invent $ · second score · On track under hard stop · Identity-as-verified ·
Path N1–N4 regressions · compass on fold · KPI soup · FI v2 / WEIGHTS ·
Homie cast · large cyan pills

## Soft nits (P2)

Mock pixel-match vs brand-shell-craft stills. Do not block the stay-draft.
Raise the bar vs Path on selected edge, Ask copy, HōMI column, and live $.
