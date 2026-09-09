# ADR-006: Product v4 Home + Shell — OPERATE/CHROME retire

**Status:** Accepted (craft CLEAR 2026-09-09) · stay-draft until Pixel Gate  
**Date:** 2026-09-09  
**Depends on:** [ADR-005](./005-change-control-plane-v1.md) (CCP v1 — lanes + flag; do not reuse 005 for chrome)  
**CLEAR:** [PRODUCT_V4_SHELL_HOME_CRAFT_CLEAR_2026-09-09](../design/PRODUCT_V4_SHELL_HOME_CRAFT_CLEAR_2026-09-09.md)  
**Tip this lane starts from:** `1b12128` (PR15) + `cc84ac6` (CCP #390)

## Context

PR15 scratched signed-in product behind KEEP. CCP v1 (#390) added lanes and
`HOMI_V4_HOME_ENABLED` (default **false**) without Shell or Home JSX.

DESIGN.md still names **OPERATE** (dashboard cockpit / `/dashboard`) and
**CHROME** (HeaderShell / SiteHeader / AppHeader) as the signed-in product
law. That is invent-chrome / role-tree language. Product v4 uses `/home`,
repo `Wordmark` + `ThresholdCompass` only, and a locked rail.

Pixel Gate is absolute: architecture → rendered Home → screenshots
(1440/1280/1024/768/390/320 + states) → internal ≥92/100 → founder
**APPROVE VISUAL DIRECTION** → only then undraft / merge / flip the flag.

## Decision

1. **OPERATE / CHROME retire** as the signed-in product floor. PERSUADE
   (marketing KEEP landing) stays. Signed-in product law is **Product v4 /
   Ultra Premium v4** on Shell v4 + Home v4.
2. **Identity KEEP:** `components/brand/Wordmark` and
   `components/brand/ThresholdCompass` only. No Lucide brand. No Homie
   cast. Compass is the shell mark, not a page hero.
3. **Primary rail (locked):** Home · Money · Path · Compare. Assess in the
   top command only — one solid cyan action, not a fifth primary peer.
   Secondary: **Bills · Tools · Learn**. System: **Accounts · Settings**.
   Mobile bottom: Home · Money · Path · More. No Support peer (no proven
   Support route). Selected row: surface lift + white label + ~2px cyan
   edge — no cyan wash pills.
4. **Home is `/home`**, never `/dashboard`. `/dashboard` stays DARK.
5. **Home State A (first unlock):** hard-stop ACTIVE + empty money.
   Greeting lives in the top command. Hierarchy: Decision context →
   Readiness hero (numeral → verdict → hold → action) → Decision evidence
   (three pillars, not Key status soup) → Current Path step → Money
   evidence → What changed → Contextual tools (~3–4). Path CTA **“Build
   runway to 1 month”** with no glow. Pillar statuses: Needs work / Strong /
   Not assessed only — never On track / READY under hard stop. Money honest
   empty + Connect accounts. Right HōMI educational prompts only. Ask HōMI
   is a top-command field, not a Homie cast.
6. **Finance GATE:** score / verdict / hard stops from **AssessmentResult
   only**. No preflight, Simulator, or household sync-score on chrome.
7. **Activation stays CCP:** `HOMI_V4_HOME_ENABLED` default false. This ADR
   does not flip the flag, undraft, or expose `/home` publicly.

## Consequences

- `productShellFor` returns `"v4"` only when the flag is on, the user is
  signed in, and the path is a V4 pending/live host.
- Production Preview and CORE E2E still fold `/home` to `/`.
- Post-login stays `/` while `HOMI_V4_HOME_ENABLED` is not exact `"true"`.
- Pixel Gate screenshots use local flag + `HOMI_V4_VISUAL_FIXTURE` only.
- Soft nits vs brand-shell-craft mocks are P2.

## Rejected alternatives

- Reuse ADR-005 for chrome — 005 is CCP only.
- Resurrect `/dashboard` or invent-chrome as the v4 floor.
- Half-shell / role-tree quiet bar as signed-in Home.
- Flip the flag or undraft before founder APPROVE VISUAL DIRECTION.
