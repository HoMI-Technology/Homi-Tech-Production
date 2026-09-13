# ASSESSMENT_CRAFT v4 — 2026-09-10

**CLEAR:** Product PR E + Finance PR E (this floor)  
**Mocks:** `docs/design/brand-shell-craft/` (`assessment-pillar-intro-v4`, `assessment-mid-walk-v4`) — orientation only, **≠ PIXEL**  
**ADR:** `docs/adr/006-signed-in-product-v4-retires-operate-chrome.md`  
**Flag:** same `HOMI_V4_HOME_ENABLED` / `isV4RouteActivated`. No second flag.

Signed-in adaptive **home_buying** walk on **`/assessment`**, inside Shell v4
`main#main`. Stay draft. Do not undraft, merge, or deploy Production.

## Locked

- Route is `/assessment` only (already V4_PENDING / `V4_SHELL_ASSESS_HREF`).
  No `/assess`. No `/dashboard` assessment. No guest official score.
- Assess = **top command only**, active cyan while the walk is open. The
  primary rail stays Home · Money · Path · Compare. No Assess rail peer.
- Option 1 adaptive reuse: live bank ids in `lib/questions/bank.ts` only.
  Vertical **home_buying** first. Do **not** rewrite `lib/scoring/*`.
- Progress never “Question N of 45”. Prefer `{Pillar} · {n} of ~{m} this path`.
- Pillar intro: quiet intro + path-true count + one Continue.
- Mid-walk: quiet progress, bank question + choices, one Continue cyan,
  optional Back. No compass on the fold. No live score. No second Assess
  in the body.
- Write path → `AssessmentResult` → Home SSOT (`/home`). Hard stops outrank.
  Free===Pro. `#397` client post-login law unchanged.
- Right HōMI is contextual educational prompts — not a second score.
- Fixture stills (`HOMI_V4_VISUAL_FIXTURE`) stay Preview-only.

## Kill list

Fake 45 chrome · Assess as rail peer · compass on fold · second Assess in
body · invent $ · Homie cast · guest official score · WEIGHTS / Packet2 /
FI v2 · new scoring ids · Pixel-matching mock choice labels over the live bank.

## Soft nits (P2)

Mock pixel-match vs brand-shell-craft stills. Do not block the stay-draft.
