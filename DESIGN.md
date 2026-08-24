# HōMI Design Contract

Agents and humans treat this file as law for UI work.
Executable brand wins on conflict: `lib/brand`, `app/globals.css`, `app/fonts.ts`, `npm run brand-check`.
Visual SSOT is this repo on GitHub (`HoMI-Technology/Homi-Tech-Production`, branch `main`). Do not invent a second language. Do not restyle from a consultation mock.

**2026-08-23:** A generic navy HTML preview was generated in a design-consultation pass and **rejected**. It is not identity. Delete or ignore `persuade-preview.html`. The shipped homepage is the identity.

## Doctrine

**Propagate the existing system inward. Do not invent a second language.**

Marketing already speaks HōMI (navy, cyan/emerald/yellow temperature, glass, compass, Fraunces / Inter / JetBrains Mono). Product surfaces must match that language with **operate density**, not marketing whitespace.

## Brand lock (immutable without an explicit brand project)

Source: `lib/brand/index.ts` + `lib/brand/homi-tokens.json`.

| Token        | Value / source                                                                   |
| ------------ | -------------------------------------------------------------------------------- |
| Surfaces     | Navy `#0a1628`, navy-light `#0f172a`, slate-surface `#1e293b`                    |
| Accents      | Cyan `#22d3ee`, emerald `#34d399`, yellow `#facc15`                              |
| Verdicts     | amber `#fab633` (BUILD FIRST), crimson `#f24822` (DO NOT PROCEED)                |
| Text         | light `#e2e8f0`, dim `#94a3b8`, ink `#ffffff` (headings on navy)                 |
| CTA ink      | `#04121c` on cyan primary buttons                                                |
| Type         | Fraunces display · Inter body · JetBrains Mono / `.score-numeral` for data       |
| Font load    | `app/fonts.ts` via `next/font/local` + `@fontsource-variable` (never Google `<link>` in product) |
| Materials    | `.glass`, `.hairline`, compass rings, ambient bloom as atmosphere                |
| Verdict enum | `READY` · `ALMOST_THERE` · `BUILD_FIRST` · `NOT_YET` (in-product badge: **DO NOT PROCEED**) |

Never introduce Anthropic / Linear-beige / purple-SaaS palettes. Never apply the Anthropic `brand-guidelines` skill to this product. Never redraw the compass as a nautical N/S/E/W rose. Never put the compass on black.

Wordmark (when colored): H cyan · ō emerald · M gold · I cyan.

## Shipped PERSUADE identity (homepage)

Do not replace these. Compose with them.

| Piece | File | Job |
| ----- | ---- | --- |
| Hero | `components/home/InterviewHero.tsx` | First viewport. Category eyebrow. Locked question. Inversion. One Assess. Compass3D at hero scale. |
| Instrument | `components/home/Compass3D.tsx` wrapping `CinematicCompass.tsx` | Threshold Compass: outlined keyhole, filled gaze, rings 85/60/35, instrument ticks. Founder lock 2026-08-16. |
| Locked lines | `components/home/walk-copy.ts` | Character-exact. Do not invent sentences. |
| Lit field | `components/home/FrontDoor.tsx` + `PaperScene.tsx` | FriendFrame, WrongQuestion, Pillars, VerdictSpectrum, Steps, Clarity, NotYourBanker, CloseCta. |
| Route | `app/(marketing)/page.tsx` | InterviewHero then PaperScene then CloseCta. Native scroll. No pin. |

Locked walk-copy (verbatim):

- `Will you be okay?`
- `A Decision Companion.`
- `Everyone else tells you how. HōMI tells you if.`
- `Know when you're ready. Move when it matters.`
- `Clarity, not commission.`
- `Not yet is not no.`
- `The compass that becomes a key when you're finally ready to turn it.`

**Memorable thing (founder 2026-08-23):** both the instrument and the companion. Compass owns the hero object. Companion owns FriendFrame and the voice. Not a glow-orb, not a new landing, not a banker.

Public marketing may label the fourth verdict **NOT YET**. In-product hard-stop badge stays **DO NOT PROCEED** (ADR-001).

Public marketing never prints pillar max scores or verdict numeric bands (`brand-check` N21/N22). Qualitative names only.

## Spelling law (user-visible)

Product wordmark is **HōMI** (U+014D). Wrong spelling is an immediate fail.

On any user-visible surface (UI copy, aria, metadata, marketing pages, emails, OG, presence lines):

- Say **HōMI**, not Homie, not HOMI, not Homi (except the legal entity).
- Tagline form: **Your HōMI, not your banker.** Engine comments may keep the metaphor “homie.”
- Persona/engine keys (`"homie"` in `lib/advisor/personas.ts`, `AgentId`, CSS `homie-breathe`) may stay as internals. They must not leak as labels.

Cleared on this branch: `FrontDoor.tsx` `NotYourBanker` title is “Your HōMI, not your banker.” Advisor page metadata/body, AgentChat/roster (“HōMI coordinates”), and `lib/agents/registry.ts` display `name` are HōMI (engine ids stay `"homie"`). Remaining user-facing leak: `lib/advisor/fallback.ts` greeting still says “your homie for this decision” (API system prompts and persona keys are out of scope for this sweep).

Legal entity in `lib/brand` today: `HOMI TECHNOLOGIES LLC`. Recase to `Homi Technologies LLC` is an open founder PR (#311), not this contract’s job until it merges.

## Surface modes

### PERSUADE — marketing, assessment entry, results “moment”, share pages

- Hero is a **thesis** about decision readiness, not a feature grid.
- One primary CTA above the fold (assessment / shadow score).
- Boldness in **one** place (compass + score/verdict language). Companion is a second presence, not a second hero object.
- Motion allowed only if content is usable without it; honor `prefers-reduced-motion`.
- Sample scores must match scoring canon (e.g. 76 → ALMOST THERE). Landing-canon tests guard this.
- Dials for this surface: variance 6, motion 4, density 3. No GSAP pin/marquee on the front door (pin stages were removed).

### OPERATE — dashboard, tools results, finance, journal, admin

- **Direction A — Cockpit Linear** (locked 2026-07-26 via design-shotgun): one instrument fold, next-move dock, slim metric rail, workspace dropdown in chrome. Not multi-pill switchers. Not equal StatTile KPI walls as the hero.
- One primary job: **where do I stand, what do I do next?**
- **Signed-in Home (`/dashboard`) instrument is the build** — Path next move + hard stops lead the fold; Decision Readiness Score + verdict sit as a compact ScoreRail reading (`components/score/ScoreRail.tsx`, landed 2026-08-23). Partner/team/admin keep book/cohort pulse heroes.
- Product tabs (landed 2026-08-23): Readiness · Reality · Decide · Plan · Goals. Invest and Track are not peers; routes stay live, folded under Reality.
- Tabular / mono numbers for scores and money.
- Shared primitives: `components/operate/*` (`PageFrame`, `PageHeader`, `OperateInstrument`, `MetricRail`, `ActionDock`).
- No GSAP / scroll-jack / marquee on app chrome or dashboard.
- Glass is atmosphere under controlled contrast — not the text substrate over busy gradients.
- Equal 4-tile KPI walls must not outrank the fold instrument.
- Never say “HōMI Score” on a surface. Say **Decision Readiness Score**.

### CHROME — `HeaderShell`, `SiteHeader`, `AppHeader`, `SiteFooter`

- Dual shell is intentional: marketing vs signed-in product nav.
- Header height token: `--nav-height` (60px product density) + safe-area.
- Product bar stays **one line**: short PRIMARY (Home / Assess / Tools / More), workspace **dropdown** (never multi-pill role switcher), icon search + kbd, bell, avatar.
- Prefer content/IA fixes over rewriting mobile menu behavior.
- Preserve: vertical scroll lock only, Escape + focus return, close on nav/desktop breakpoint.
- Never `overflow-x: hidden` on `body` (breaks homepage sticky pin stages).

## Category holes (research 2026-08-23 — refuse, do not copy)

The hole HōMI fills: the hour **before** the commitment, with incomplete data, no affiliate, and waiting as a valid outcome.

| Player | What they sell | Hole they cannot fill | Never copy |
| ------ | -------------- | --------------------- | ---------- |
| Credit Karma | Approval Odds, free score, marketplace | “Will you be okay?” after the product | Odds, apply, “get my free scores,” Karma Green |
| Rocket Mortgage | The leap (qualify, unlock, day one) | Waiting as success | Pre-approved, dream home, see what I qualify for |
| NerdWallet | Which partner SKU | Whether to transact at all | Best-of, stars next to Apply, partner tickers |
| Monarch | Household OS after connect | Readiness before connect | Ember/linen, “connect accounts” as first CTA |
| Origin (useorigin.com) | RIA + AI advisor after enrollment | Pre-commitment with no client relationship | Fiduciary, CFP, “AI financial advisor” |

Steal craft, not costume: put the constraint in chrome (not footer fog); two needles survivable vs lender-max; methodology caveat before the CTA; real UI screenshots of **our** instrument, not fake dashboards.

## Skills (use as advisors, not co-authors)

| Phase              | Allowed                                                                                 |
| ------------------ | --------------------------------------------------------------------------------------- |
| Chrome             | `redesign-existing-projects`, `web-design-guidelines`, design-review                    |
| Dashboard          | redesign-existing + this contract’s OPERATE rules                                       |
| Hook               | `cro` / `copywriting`, then **one of** `frontend-design` **or** `design-taste-frontend` |
| Always after paint | brand-check, typecheck, reduced-motion smoke                                            |

**Forbidden stack:** multiple aesthetic skills on one PR · `brand-guidelines` (Anthropic) · `theme-factory` (generates off-token palettes) · unconstrained high-end on `/dashboard` · generating a new landing HTML as if the brand did not exist.
Enforced, not just documented: `.claude/settings.json` hides both skills (`skillOverrides: off`) and denies `Skill(brand-guidelines)` / `Skill(theme-factory)`.

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
- [ ] 3-second hierarchy test on dashboard (**next Path step + score reading** obvious)
- [ ] User-visible copy says HōMI, not Homie
- [ ] No invented sample metrics; landing sample scores match canon

## Phased work

1. **Chrome + formatting** — shell geometry, a11y, footer rhythm
2. **Dashboard operate** — hero above supporting stats; pillar hierarchy
3. **Landing hook** — thesis + single primary CTA, on-token craft (shipped: InterviewHero)
4. **Tools** — `ToolShell` / `ToolGrid` / `ToolResultHero` in `components/tools/ToolShell.tsx`; hub groups by job; every calculator uses shared chrome + mono results
5. **Finance / journal / credit** — metrics before inputs (finance); ToolShell + score hero (credit); eyebrow + entry density (journal)
6. **Spelling sweep** — user-visible Homie → HōMI (this file’s 2026-08-23 add)

Secondary product pages should keep matching operate hierarchy when touched.

## Decisions log

| Date | Decision | Rationale |
| ---- | -------- | --------- |
| 2026-07-26 | OPERATE = Cockpit Linear | design-shotgun lock |
| 2026-08-16 | Threshold Compass geometry lock | founder; CinematicCompass.tsx |
| 2026-08-23 | Dual memorable = compass + HōMI companion | founder; not either/or |
| 2026-08-23 | User-visible spelling always HōMI | founder; internals may keep `homie` keys |
| 2026-08-23 | Reject generic navy consultation mock | does not match GitHub identity |
| 2026-08-23 | ScoreRail + five product tabs | landed on main; OPERATE hierarchy |
