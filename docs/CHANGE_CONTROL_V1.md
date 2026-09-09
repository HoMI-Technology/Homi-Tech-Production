# Change Control Plane v1 (CCP)

**Status:** Draft (PR A — docs + tooling). Executable allow-list: `lib/auth/keep-routes.ts`.  
**ADR:** [005 — CCP v1 = route activation + post-login flag · no SaaS](./adr/005-change-control-plane-v1.md)  
**Tip this lane starts from:** `1b12128` (PR15 KEEP/KILL).

CCP v1 is a **route-activation map**, not a product rewrite. It does not
introduce flag SaaS, per-user experiments, admin flag UI, Shell/Home JSX, or
any DROP TABLE / data wipe. Dark means *unreachable*, not *deleted*.

## Lanes

| Lane | Meaning | HTTP while unpublished / dark |
| --- | --- | --- |
| **KEEP** | Live public/auth/legal surfaces + KEEP APIs | Serve |
| **DARK** | Pre-PR15 product/role trees + dark APIs | Pages → `/`; APIs → JSON `404` `{ error: "not_found" }` |
| **V4_PENDING** | Named v4 hosts waiting on CLEAR + PIXEL + flag | `404` or `/` (v1 folds to `/`) |
| **V4_LIVE** | Shipped v4 hosts | Serve (empty until Home v4) |

## Seed map

### KEEP

| Path | Notes |
| --- | --- |
| `/` | Marketing landing (PR15 front door) |
| `/waitlist` | Waitlist |
| `/auth/*` | Sign-in, sign-up, callback, reset, sign-out |
| `/legal/privacy` | KEEP legal |
| `/legal/terms` | KEEP legal |
| `/legal/cookies` | KEEP legal |
| `/marketing/*` | Static GTM / brand assets (not a product tree) |
| `/api/waitlist` | KEEP API |
| `/api/healthcheck` | KEEP API |
| `/api/csp-report` | KEEP API |

Extra `/legal/*` folds onto `/legal/privacy` (existing PR15 helper). That is
still KEEP, not DARK.

### DARK

Pre-PR15 product and role trees remain on disk. Middleware sends document
requests to `/`. Product JSON returns 404. **No schema drop. No data wipe.**

Seed page prefixes (non-exhaustive; anything not KEEP and not V4 is DARK):

`/dashboard`, `/assessment`, `/first-moment`, `/results`, `/report`, `/path`,
`/plan`, `/money`, `/tools`, `/advisor`, `/agents`, `/agent-hub`, `/learn`,
`/timeline`, `/connections`, `/settings`, `/scenarios`, `/journal`,
`/household`, `/simulator`, `/decisions`, `/admin`, `/team`,
`/employee/dashboard`, `/partner/dashboard`, `/pricing`, `/how-it-works`,
`/shadow-score`, `/onboarding`, `/demo`, `/calendar`, `/daily`, `/credit`,
`/twin`, `/trinity`, `/genome`, `/signals`, `/outcomes`

Dark APIs: every `/api/*` except the KEEP API prefixes above
(`/api/scoring`, `/api/assessments`, `/api/plaid/*`, `/api/billing/*`, …).

`/dashboard` stays DARK. Do **not** resurrect dashboard UX as the v4 Home.

### V4_PENDING

| Path | Notes |
| --- | --- |
| `/home` | Preferred signed-in Home contract. Inactive until CLEAR + PIXEL + `HOMI_V4_HOME_ENABLED=true`. |
| Shell hosts | TBD — do not invent routes here in PR A. |

### V4_LIVE

*(empty)* — fill when Home v4 ships.

## Flag

| Name | Default | Enable |
| --- | --- | --- |
| `HOMI_V4_HOME_ENABLED` | **false** (unset, `false`, `1`, `TRUE` all stay off) | Exact lowercase `true` |

Server-only. Production must remain false until Home v4 is CLEAR+PIXEL.
Post-login (`resolvePostLoginDestination`) lands on `/` unless the flag is on
**and** the V4 allow-list still includes `/home`. Middleware lets `/home`
through under the same dual gate; there is no Home UI in this PR.

## Classifiers

`isKeepPath` · `isDarkProductPath` · `isV4Path` in `lib/auth/keep-routes.ts`.
Middleware stays a thin hook on that module.

## OUT (not this PR)

- No JSX, Shell, or Home UI components
- No flag SaaS, per-user experiments, or admin flag UI
- No scoring / Plaid / ledger rewrites
- No data wipe
- Soft nits N1–N4 stay P2
- Do not undraft or merge this PR as a release
