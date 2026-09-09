# SHELL_CRAFT v4 — 2026-09-09

**CLEAR:** `docs/design/PRODUCT_V4_SHELL_HOME_CRAFT_CLEAR_2026-09-09.md`  
**Mocks:** `docs/design/brand-shell-craft/` (`shell-home-v4-desktop`, `shell-home-v4-mobile`)

Signed-in product chrome for `/home`. Flag default false. Post-login stays `/`.

## Locked

- Identity: repo `Wordmark` + `ThresholdCompass` only. Compass is the shell
  mark (32px), not a page hero. No Lucide brand.
- Primary rail (locked order): **Home · Money · Path · Compare**.
  Reject five-peer Tools-in-primary. Money before Path.
- Assess = **top command only** — one solid cyan action, not a primary rail item.
  Ask HōMI is a field in that command bar (not a Homie cast).
- Secondary: **Bills · Tools · Learn**. System: **Accounts · Settings**.
  No Support peer.
- Mobile bottom: Home · Money · Path · More.
- Selected: surface lift + white label + ~2px cyan edge (mobile scaled).
  No large cyan pills / teal fill.
- Greeting lives in the top command bar (never overlaps Home verdict/score).
- Optional right HōMI is contextual educational prompts — not a Companion peer.
- Dual-shell a11y KEEP: skip link → `#main`, Escape + focus return, vertical
  scroll lock on overlays, `prefers-reduced-motion`, never `overflow-x: hidden`
  on `body`.
- No Homie cast. No `/dashboard`. No invent-chrome rail as the floor.

## Soft nits (P2)

Right HōMI ~300–340. Top command ~60–68. Mock pixel-match. Do not block
the stay-draft.

Activation remains CCP (`HOMI_V4_HOME_ENABLED`, default false). Pixel Gate
unchanged — founder APPROVE VISUAL DIRECTION is still required to undraft.
