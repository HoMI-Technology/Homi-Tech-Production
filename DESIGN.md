# HōMI Design Contract

Agents and humans treat this file as law for UI work.  
Executable brand wins on conflict: `lib/brand`, `app/globals.css`, `npm run brand-check`.

## Doctrine

**Propagate the existing system inward. Do not invent a second language.**

Marketing already speaks HōMI (navy, cyan/emerald/yellow temperature, glass, compass, Fraunces / Inter / JetBrains Mono). Product surfaces must match that language with **operate density**, not marketing whitespace.

## Brand lock (immutable without an explicit brand project)

| Token | Value / source |
|-------|----------------|
| Surfaces | Navy `#0a1628`, navy-light `#0f172a`, slate-surface `#1e293b` |
| Accents | Cyan `#22d3ee`, emerald `#34d399`, yellow `#facc15` |
| Verdicts | amber `#fab633` (BUILD FIRST), crimson `#f24822` (DO NOT PROCEED) |
| Text | light `#e2e8f0`, dim `#94a3b8` |
| Type | Fraunces display · Inter body · JetBrains Mono / `.score-numeral` for data |
| Materials | `.glass`, `.hairline`, compass rings, ambient bloom as atmosphere |
| Verdict enum | `READY` · `ALMOST_THERE` · `BUILD_FIRST` · `NOT_YET` (label: **DO NOT PROCEED**) |

Never introduce Anthropic / Linear-beige / purple-SaaS palettes. Never apply the Anthropic `brand-guidelines` skill to this product.

## Surface modes

### PERSUADE — marketing, assessment entry, results “moment”, share pages

- Hero is a **thesis** about decision readiness, not a feature grid.
- One primary CTA above the fold (assessment / shadow score).
- Boldness in **one** place (compass + score/verdict language).
- Motion allowed only if content is usable without it; honor `prefers-reduced-motion`.
- Sample scores must match scoring canon (e.g. 76 → ALMOST THERE). Landing-canon tests guard this.

### OPERATE — dashboard, tools results, finance, journal, admin

- **Direction A — Cockpit Linear** (locked 2026-07-26 via design-shotgun): one instrument fold, next-move dock, slim metric rail, workspace dropdown in chrome. Not multi-pill switchers. Not equal StatTile KPI walls as the hero.
- One primary job: **where do I stand, what do I do next?**
- Dominant readiness numeral + verdict chip (personal/employee) or book/cohort pulse (partner/team/admin); secondary modules recessive.
- Tabular / mono numbers for scores and money.
- Shared primitives: `components/operate/*` (`PageFrame`, `PageHeader`, `OperateInstrument`, `MetricRail`, `ActionDock`).
- No GSAP / scroll-jack / marquee on app chrome or dashboard.
- Glass is atmosphere under controlled contrast — not the text substrate over busy gradients.
- Equal 4-tile KPI walls must not outrank the score / pulse hero.

### CHROME — `HeaderShell`, `SiteHeader`, `AppHeader`, `SiteFooter`

- Dual shell is intentional: marketing vs signed-in product nav.
- Header height token: `--nav-height` (60px product density) + safe-area.
- Product bar stays **one line**: short PRIMARY (Home / Assess / Tools / More), workspace **dropdown** (never multi-pill role switcher), icon search + kbd, bell, avatar.
- Prefer content/IA fixes over rewriting mobile menu behavior.
- Preserve: vertical scroll lock only, Escape + focus return, close on nav/desktop breakpoint.
- Never `overflow-x: hidden` on `body` (breaks homepage sticky pin stages).

## Skills (use as advisors, not co-authors)

| Phase | Allowed |
|-------|---------|
| Chrome | `redesign-existing-projects`, `web-design-guidelines`, design-review |
| Dashboard | redesign-existing + this contract’s OPERATE rules |
| Hook | `cro` / `copywriting`, then **one of** `frontend-design` **or** `design-taste-frontend` |
| Always after paint | brand-check, typecheck, reduced-motion smoke |

**Forbidden stack:** multiple aesthetic skills on one PR · `brand-guidelines` (Anthropic) · unconstrained high-end on `/dashboard`.

## Layout ownership

```
(marketing)/layout → SiteHeader + SiteFooter
(product)/layout   → AppHeader if session else SiteHeader + SiteFooter
HeaderShell        → shared fixed glass bar + mobile panel behavior
```

## Definition of done (any design PR)

- [ ] No off-token colors or fonts
- [ ] Dual shell correct (signed-in / signed-out × marketing / product)
- [ ] Mobile menu: scroll lock, Escape, focus return
- [ ] Sticky header: in-page anchors clear chrome (`scroll-padding-top`)
- [ ] Skip link reaches `#main`
- [ ] `prefers-reduced-motion` still works
- [ ] `npm run brand-check` and `npm run typecheck` pass
- [ ] 3-second hierarchy test on dashboard (score + next step obvious)

## Phased work

1. **Chrome + formatting** — shell geometry, a11y, footer rhythm  
2. **Dashboard operate** — hero above supporting stats; pillar hierarchy  
3. **Landing hook** — thesis + single primary CTA, on-token craft  
4. **Tools** — `ToolShell` / `ToolGrid` / `ToolResultHero` in `components/tools/ToolShell.tsx`; hub groups by job; every calculator uses shared chrome + mono results  
5. **Finance / journal / credit** — metrics before inputs (finance); ToolShell + score hero (credit); eyebrow + entry density (journal)  

Secondary product pages should keep matching operate hierarchy when touched.
