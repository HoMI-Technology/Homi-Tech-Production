# ADR-005: Change Control Plane v1 — route activation + post-login flag · no SaaS

**Status:** Proposed (PR A, draft)  
**Date:** 2026-09-09

## Context

PR15 (`1b12128`) scratched product chrome behind a KEEP landing: `/`,
`/waitlist`, `/auth/*`, three legal pages, and three KEEP APIs. Everything
else redirects to `/` or JSON-404s. Home v4 and a signed-in Shell still need
a place to land **without** resurrecting `/dashboard` or standing up a flag
product.

Historical drafts that mixed activation with UI are out of scope. This ADR
covers CCP v1 only.

## Decision

**CCP v1 = route activation + one post-login env flag. No SaaS.**

1. Four lanes in `docs/CHANGE_CONTROL_V1.md` and `lib/auth/keep-routes.ts`:
   KEEP · DARK · V4_PENDING · V4_LIVE.
2. `/home` is the V4_PENDING Home contract (preferred over `/dashboard` UX).
   V4_LIVE stays empty until Home v4 ships.
3. `HOMI_V4_HOME_ENABLED` is a single process env. Default **false**.
   Only the exact lowercase string `true` enables `/home` after login, and
   only when the V4 allow-list still names Home. Production stays false.
4. Dark means unreachable (redirect `/` or JSON 404). No DROP TABLE, no
   data wipe, no scoring/Plaid/ledger rewrite.
5. No flag service, no per-user experiments, no admin flag UI, no Shell/Home
   JSX in this change.

## Consequences

- Middleware remains a thin hook on the keep-routes classifiers.
- `resolvePostLoginDestination` keeps recovery links on
  `/auth/reset-password` and otherwise returns `/` until the dual gate
  (flag + allow-list) opens `/home`.
- Later Home v4 work moves `/home` to V4_LIVE after CLEAR + PIXEL; it does
  not invent a second activation plane.

## Rejected alternatives

- **Flag SaaS / percentage rollouts / per-user experiments** — out of
  spend-hold and out of v1.
- **Resurrect `/dashboard` as Home** — PR15 darkened it; v4 uses `/home`.
- **Delete dark schema/data** — rebuild stays possible; CCP only unpublishes.
