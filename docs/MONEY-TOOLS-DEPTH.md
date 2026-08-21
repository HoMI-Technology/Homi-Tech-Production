# Money + Tools Depth Doctrine

**Status:** Locked  
**Authority:** This file for Money/Tools vs Home hierarchy. Tool catalog lock remains
[`docs/TOOL_CONSOLIDATION.md`](TOOL_CONSOLIDATION.md). Home Path CTA and Companion
presence are out of scope (Phases 1–2 locked).

Money is **depth**. Tools are **lenses**. Path owns the Home fold.

---

## Primary questions

| Surface | Primary question |
| --- | --- |
| **Money** (`/money*`) | Where does cash sit, and what decision math? |
| **Tools** (`/tools*`) | Answer one math question. |
| **Home** (`/dashboard`) | Where do I stand on the build, and what is the next Path move? |

Home never answers Money’s full picture or Tools’ catalog.

---

## What lives where

### On Home (strip only)

- `components/dashboard/HomeMoneyStanding.tsx` — surplus / runway / liquid + meaning + as-of.
- CTAs are **ghost / sm only** — never `btn-primary` (Path owns the fold primary).
- Deep links only: `/money`, `/money/budget`, `/money/decide`, `/connections`
  (see `lib/dashboard/home-money-standing.ts`).
- No tools grid. No QuickActionGrid of calculators. No second money dashboard.

### One click deeper — Money

| Route | Job |
| --- | --- |
| `/money` (Stand) | Read where cash sits (picture + evidence) |
| `/money/budget` (Track) | Build / strengthen the on-device ledger |
| `/money/decide` (Decide) | Pick **one** lens; answer one math question inline |
| `/money/plan` | Plan command surface |
| `/money/goals` | Savings goals |
| `/money/investments` | Holdings (educational) |

Six mode tabs (`MoneyModeNav`) are **peers inside Money depth**, not peer homes to Path.

### One click deeper — Tools

- Public hub: ten lenses only (`lib/tools/registry.ts` + `TOOL_CONSOLIDATION.md`).
- Each `/tools/{lens}` page: **one** math question via `ToolShell`.
- Off-hub routes stay deep links / redirects — never remount as Home cards.
- Guest hub: educational estimates; no HōMI verdict as a fake score.

---

## Forbidden patterns

- Wall of tool cards on the Home fold.
- Turning `/money` or `/tools` into a second “where do I stand / what do I do next” home that competes with Path.
- Multi-job tool pages (two unrelated calculators on one URL).
- Advice language (“you should buy”, “recommend”, FOMO, scarcity, banker urgency).
- Softening hard stops or inventing scores on Money/Tools.
- Remounting Companion chat UI as the Money hero.
- New calculators or new top-level money homes without an explicit product lock.

---

## Educational posture (required)

- Money Stand footer and Tools hub footer: educational only — not financial, tax,
  mortgage, or investment advice.
- Tool pages: `ToolShell` carries the same posture under the lens description.
- Decide hub: one-job line + educational footer; panels use `EDUCATIONAL_FOOTER`
  from `components/tools/panel-ui.tsx` where applicable.

---

## Definition of done

- [ ] `docs/MONEY-TOOLS-DEPTH.md` matches this doctrine.
- [ ] Home fold still passes the 3-second Path test; money is strip only; no tools grid.
- [ ] Home money CTAs remain non-primary (`btn-ghost btn-sm`).
- [ ] Strip deep links land on `/money*` (or `/connections` for bank).
- [ ] Tools hub + Money Stand declare educational-only posture.
- [ ] ToolShell pages frame a single lens job + educational line.
- [ ] `npm run brand-check`, `npm run typecheck`, and Home hierarchy / presence tests green.
- [ ] PathNextMove, companionFoldLine, COMPANION-PRESENCE untouched.
