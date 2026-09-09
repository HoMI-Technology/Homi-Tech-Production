# ADR-006: Signed-in Product v4 retires OPERATE / CHROME

**Status:** Accepted  
**Date:** 2026-09-09  
**Tip:** `1b12128` (PR15 KEEP/KILL). CCP v1 on `cc84ac6` (#390) is the activation plane.  
**Depends on:** [ADR-005](./005-change-control-plane-v1.md) (CCP only — do not reuse 005 for chrome)

## Context

Pre-reset DESIGN.md named **OPERATE** (dashboard cockpit, Cockpit Linear,
MetricRail, `/dashboard`) and **CHROME** (`HeaderShell` / signed-in
`AppHeader`) as signed-in product authority. PR15 scratched those trees.
PR C rebuilds signed-in Home at `/home` under Ultra Premium +
SIGNED-IN-PRODUCT-V4. Invent-chrome and five-peer Tools-in-primary are not
the floor.

## Decision

**OPERATE / CHROME retire as signed-in authority.** Replace with **Ultra
Premium + SIGNED-IN-PRODUCT-V4**.

1. **Primary rail (locked order):** **Home · Money · Path · Compare**.
   Money before Path. Reject five-peer Tools-in-primary.
2. **Assess** lives in the **top command** only — not a primary rail item.
3. **Tools / Settings / HōMI are secondary roles**, not primary peers:
   Tools on the secondary rail, Settings in System, HōMI as the optional
   right column (educational prompts — not a Companion peer, not Homie).
   Executable Brand CODE FAIL P0 map: Secondary **Bills · Tools · Learn**;
   System **Accounts · Settings**. No Support rail peer.
4. **KEEP:** Brand lock table · repo `Wordmark` · `ThresholdCompass` ·
   AssessmentResult honesty (Finance GATE) · **Free===Pro** on the score /
   verdict / hard-stop read (no paid-only second score) · KEEP marketing /
   auth / legal / waitlist (PERSUADE + PR15).
5. **PR C stays DRAFT** until founder **APPROVE VISUAL DIRECTION** on real
   rendered screenshots (Pixel Gate). Do not undraft, merge, or set
   `HOMI_V4_HOME_ENABLED=true` on Production or public Preview from this ADR.
6. Home is `/home`. `/dashboard` stays DARK. Score ≠ Compass. Hard stops
   outrank. No invent $. `components/operate/*` leftovers are not authority.

## Consequences

- DESIGN.md OPERATE / CHROME sections describe Product v4 / Shell v4, not
  the retired cockpit.
- Shell v4: left primary four + top command + optional right HōMI + mobile
  bottom four (Home · Money · Path · More).
- Activation remains CCP (ADR-005). Post-login stays `/` while the flag is
  not exact `"true"`.

## Rejected alternatives

- Five-peer Tools-in-primary
- Resurrect `/dashboard` or invent-chrome as Home
- Flag SaaS / per-user experiments
- Undraft before founder APPROVE VISUAL DIRECTION on real screenshots
- Reuse ADR-005 for chrome
