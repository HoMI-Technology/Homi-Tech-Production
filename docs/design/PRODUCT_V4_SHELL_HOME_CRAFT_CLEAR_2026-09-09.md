# PRODUCT V4 — Shell + Home craft CLEAR

**Status:** CLEAR (Product + janitor GO) · **2026-09-09**  
**PR:** stay-draft PR C — do **not** undraft  
**Pixel Gate:** unchanged (still required before merge / flag-true)  
**Section:** 2 — Dashboard / Shell (plus CCP helpers already on `main`)

## Decision

Product CLEAR + janitor GO for Shell v4 + Home v4 **craft**. Implementation
may continue on the stay-draft PR. This is **not** APPROVE VISUAL DIRECTION,
not merge, and not `HOMI_V4_HOME_ENABLED=true`.

## Craft floors

| Floor | Path |
| --- | --- |
| SHELL_CRAFT v4 | `docs/design/SHELL_CRAFT_v4_2026-09-09.md` |
| HOME_CRAFT v4 | `docs/design/HOME_CRAFT_v4_2026-09-09.md` |
| Ultra Premium reconcile | `docs/design/ULTRA_PREMIUM_V4_RECONCILE_2026-09-09.md` |
| Mocks | `docs/design/brand-shell-craft/` (`shell-home-v4-desktop`, `shell-home-v4-mobile`) |

Identity KEEP: repo `Wordmark` + `ThresholdCompass` only. Primary rail
**Home · Money · Path · Compare**. Secondary: **Bills · Tools · Learn**.
System: **Accounts · Settings**. Assess lives in the top command, not as a
fifth primary peer. Mobile: Home · Money · Path · More. No Support peer.

Home first unlock is **State A** (hard-stop ACTIVE + empty money). Finance
GATE: AssessmentResult only. No invented $. No Homie cast. `/dashboard` stays
DARK.

## Activation (locked)

- `HOMI_V4_HOME_ENABLED` default **false**. Exact lowercase `"true"` only.
- **Post-login stays `/`** until that flag is true **and** `/home` is on the
  V4 allow-list (`resolvePostLoginDestination` → `POST_LOGIN_HOME`).
- Middleware still folds `/home` to `/` while the flag is off.

## Soft nits — P2

Visual polish against brand-shell-craft stills (selected-state edge, rail
width 216–228, right HōMI width, card density) is **P2**. Do not block the
stay-draft or Pixel Gate on them. Do not treat P2 as permission to undraft.

## OUT

- Undraft / merge / public `/home`
- Flip `HOMI_V4_HOME_ENABLED` on Production or public Preview
- Pixel Gate skip
- Post-login `/home` while the flag is false
- Invent $ / On track under hard stop / Homie / `/dashboard` as Home
