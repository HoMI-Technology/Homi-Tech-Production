# PARTNER_CRAFT v4 — 2026-09-11

**CLEAR:** Product PR K2 + Finance PR K2 (this floor)  
**Mocks:** `docs/design/brand-shell-craft/` (`partner-empty-v4`,
`partner-normal-v4`, `partner-invite-error-v4`) — orientation only, **≠ PIXEL**.
Mock copy must not ship as Production invent $ / a client score / craft-badge
fold prose.  
**ADR:** `docs/adr/006-signed-in-product-v4-retires-operate-chrome.md`  
**Flag:** same `HOMI_V4_HOME_ENABLED` / `isV4RouteActivated`. No second flag.

Signed-in Partner operate home is a thin Shell v4 destination at
`/partner/dashboard`. One shell · different jobs. Stay draft. Do not undraft,
merge, or deploy Production. K3–K4 (`/admin` `/team`) stay closed.

## Locked

- Route is `/partner/dashboard` only (V4_PENDING via `/partner` prefix). Portals
  redirect here. Do not invent a peer `/partner` home.
- Invite: `/first-moment?ref=` KEEP. Never `/shadow-score?ref=`. SITE_URL fail-loud.
  Do not add `/first-moment` to V4_PENDING.
- Empty or live referral_source SSOT only. Never invent a client list, scores, or $.
  Never write AssessmentResult.
- Empty primary CTA = **Invite** (not a Clarity question). Headline: **No clients
  in your book yet.**
- Invite-error: **INVITE BLOCKED** · Origin missing · Retry invite. Never a silent
  bad link.
- Normal: **Your book.** Live referral pulse rows (`Referral · live` / `SSOT`).
  Invite again. Quiet Synced age.
- Compass shell-only. No Homie. No HeroScore. No On track on a held client.
- Desktop: right HōMI column (not overlay). Micro Clarity header — not both large
  wordmark + CLARITY.
- Mobile: Ask sheet = one Ask only (book prompts, no nav dump). Column Ask
  hidden below 1280.
- ≤3 primary fold blocks. Selected rail = 2px cyan edge, no glow, no pill.
- Workspace jobs: Home · Book · Invite. No new `/partner/*` URL sprawl.
- No craft-mock fold prose in Production (`Switch only if >1 workspace` stays
  craft-only).

## Ask placeholder (book-bound)

| Surface | Placeholder |
| --- | --- |
| Partner | Ask HōMI about this partner book... |

## Prompts (≤3, deep-link only)

**Empty:** What is the book? · How invite works · Why no client scores  
**Invite-error:** What is SITE_URL? · Why fail-loud? · Open settings path  
**Normal:** What is book pulse? · When is age stale? · Why no HeroScore

## Kill list

HeroScore · shadow-score invite restore · silent bad SITE_URL · invent $ / fake
book · On track on a held client · Clarity-as-CTA · Homie · craft-mock fold prose
· floating overlay · Admin/Team reopen · FI v2 / WEIGHTS

## Soft nits (P2)

Mock pixel-match vs brand-shell-craft stills. Do not block the stay-draft.
Raise the bar vs Employee on Invite-as-CTA (not a Clarity question), SITE_URL
fail-loud, live referral pulse only, and no client score slot.
