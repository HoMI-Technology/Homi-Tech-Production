# Pixel Gate — Home v4 + Assessment v4 + Path v4 screenshot set

Stay-draft until founder **APPROVE VISUAL DIRECTION**. Do not undraft, do not
merge, do not deploy Production. Production may already have
`HOMI_V4_HOME_ENABLED=true`; that is not Pixel Gate for Path v4.

Operator Preview / local stills: `HOMI_V4_HOME_ENABLED=true` **and**
`HOMI_V4_VISUAL_FIXTURE=true`, then `/home?visual=hard-stop` (State A),
`empty`, `money-disconnected`, `normal`. Assessment walk stills:
`/assessment?visual=pillar-intro`, `/assessment?visual=mid-walk`. Path stills:
`/path?visual=empty`, `hard-stop`, `normal`, `complete`. Those URLs
must paint **ShellV4** (left rail + top command), never marketing SiteHeader.
Fixture stays Preview-only. Flag stays operator-set.

## Viewports (required)

1440 · 1280 · 1024 · 768 · 390 · 320

## Home states (required)

| Query | Intent |
| --- | --- |
| `?visual=hard-stop` | State A — hard-stop ACTIVE + empty money |
| `?visual=empty` | No assessment yet |
| `?visual=money-disconnected` | Honest empty money + Connect accounts |
| `?visual=normal` | Last-read without hard stop (not the first-unlock hero) |

## Assessment states (PR E)

| Query | Intent |
| --- | --- |
| `/assessment?visual=pillar-intro` | Quiet Financial Reality intro + path-true count |
| `/assessment?visual=mid-walk` | Quiet progress + live bank question (down payment) |

## Path states (PR F)

| Query | Intent |
| --- | --- |
| `/path?visual=empty` | No read yet — Assess CTA, no fake steps |
| `/path?visual=hard-stop` | Hard-stop ACTIVE hold + honest steps addressing the stop |
| `/path?visual=normal` | ≤7 honest steps, no hold chrome |
| `/path?visual=complete` | Done steps, no pad-to-7 |

Mocks (`path-empty-v4`, `path-hard-stop-v4`) are orientation only — **≠ PIXEL**.
Live path-rules titles win over mock step labels.

## Gate

Architecture → real rendered Home + Assessment + Path → this set → internal ≥92/100 →
founder APPROVE VISUAL DIRECTION → then undraft / merge.

Stills land under `docs/design/baseline/` when captured. This PR does not
flip Pixel Gate.
