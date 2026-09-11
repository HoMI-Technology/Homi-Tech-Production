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

Cleared: `FrontDoor.tsx` `NotYourBanker` title is “Your HōMI, not your banker.” Advisor page metadata/body, AgentChat/roster (“HōMI coordinates”), `lib/agents/registry.ts` display `name`, onboarding, planner greeting, and `lib/advisor/fallback.ts` greeting are HōMI (engine ids stay `"homie"`). API system prompts identify as “HōMI here.” Persona keys remain internals.

Legal entity in `lib/brand` today: `HOMI TECHNOLOGIES LLC`. Recase to `Homi Technologies LLC` is an open founder PR (#311), not this contract’s job until it merges.

## Surface modes

### PERSUADE — marketing, assessment entry, results “moment”, share pages

- Hero is a **thesis** about decision readiness, not a feature grid.
- One primary CTA above the fold (assessment / shadow score).
- Boldness in **one** place (compass + score/verdict language). Companion is a second presence, not a second hero object.
- Motion allowed only if content is usable without it; honor `prefers-reduced-motion`.
- Sample scores must match scoring canon (e.g. 76 → ALMOST THERE). Landing-canon tests guard this.
- Dials for this surface: variance 6, motion 4, density 3. No GSAP pin/marquee on the front door (pin stages were removed).

### OPERATE — signed-in Product v4 personal

Cockpit Linear / MetricRail hero and `/dashboard` invent-chrome are
**retired** as signed-in authority (ADR-006). Signed-in personal product is
**Product v4 / Ultra Premium**:

- Primary rail **Home · Money · Path · Compare** (Money before Path).
- Assess in the top command — not a fifth primary peer. Reject five-peer
  Tools-in-primary.
- Score ≠ Compass. Hard stops outrank. No invent $.
- `components/operate/*` leftovers are not authority.
- Finance GATE: AssessmentResult only. Free===Pro on that read.

### CHROME — dual shell (Shell v4)

Dual shell stays. KEEP marketing uses `SiteHeader` / `SiteFooter` (PERSUADE).
Product chrome is **Shell v4**: left primary four + top command + optional
right HōMI + mobile bottom four (Home · Money · Path · More).

A11y KEEP: skip link `#main`, Escape + focus return, overlay scroll lock,
`prefers-reduced-motion`, never `overflow-x: hidden` on `body`. Header height
token `--nav-height` + safe-area. DARK role trees may still mount quiet
`AppHeader` on disk; do not rebuild Home from them.

PR C stays **DRAFT** until founder APPROVE VISUAL DIRECTION on real
screenshots. `HOMI_V4_HOME_ENABLED` default false.

### Product v4 / Ultra Premium — signed-in Home + Shell (ADR-006)

- **Home is `/home`**, never `/dashboard`. `/dashboard` stays DARK.
- Identity KEEP: repo `Wordmark` + `ThresholdCompass` only. Compass is the
  shell mark, not a page hero. No Lucide brand. No Homie cast.
- Primary rail (locked): **Home · Money · Path · Compare**. Assess in the
  top command only (solid cyan). Secondary: **Bills · Tools · Learn**.
  System: **Accounts · Settings**. Mobile bottom: Home · Money · Path · More.
  No Support peer. Selected: lift + white + ~2px cyan edge.
- Home State A (first unlock): hard-stop ACTIVE + empty money. Greeting in
  the top command. Hierarchy: Decision context → Readiness hero (numeral →
  verdict → hold → action) → Decision evidence (three pillars) → Current Path
  step → Money evidence → What changed → Contextual tools (~3–4). Path CTA
  **“Build runway to 1 month”** with no glow. Pillar statuses Needs work /
  Strong / Not assessed only. Money honest empty + Connect accounts. Right
  HōMI educational prompts only — no second score. Ask HōMI is a top-command
  field.
- **Assessment is `/assessment`**, Shell v4 `main#main`, same flag. Assess is
  top-command only. Adaptive **home_buying** first. Progress is
  `{Pillar} · {n} of ~{m} this path`. Write path lands on `/home`. No guest
  official score. Fixture stills stay Preview-only
  (`HOMI_V4_VISUAL_FIXTURE`). Craft: `docs/design/ASSESSMENT_CRAFT_v4_2026-09-10.md`.
- **Path is `/path`**, Shell v4 `main#main`, same flag. Max 7 steps from
  AssessmentResult + `lib/readiness/path.ts`. Empty / hard-stop ACTIVE / normal /
  complete. Home NextPath and rail Path land here. Body deep-links Assess and
  Money only — no ledger / invent $. Compass stays in the shell. Craft:
  `docs/design/PATH_CRAFT_v4_2026-09-10.md`.
- **Money is `/money`**, Shell v4 `main#main`, same flag. Plaid + ledger reuse
  (no sync rewrite). Empty Connect / hard-stop hold (empty-or-live) / connected
  live with always-on age / stale · syncing · error honesty. Never invent $ or
  write AssessmentResult. Ask: *Ask HōMI about this financial picture...*.
  JetBrains Mono for live $ only. Craft:
  `docs/design/MONEY_CRAFT_v4_2026-09-10.md`.
- **Compare is `/scenarios`** (rail label Compare), Shell v4 `main#main`, same
  flag. Educational templates only — reuse `lib/readiness/scenario*.ts` and
  `lib/tools/scenarios.ts`. Empty / hard-stop (educational-only, never On track)
  / normal ≤3–4 approved cards / stale · error with quiet age. Never invent $
  or a second official score. Ask: *Ask HōMI about this comparison...*.
  JetBrains Mono for live SSOT numbers only. No verbose fixture meta in the fold.
  Mobile: Compare under More. Optional `/compare` aliases here. Craft:
  `docs/design/COMPARE_CRAFT_v4_2026-09-11.md`.
- **Contextual HōMI** is the Shell v4 right column (~300–340) plus Ask in the
  top command across Home / Money / Path / Compare / Assess. Explain + deep-link
  only (Path / Money / Compare / Assess / Home). Never a second score, never invent
  $, never On track under a hard stop. Optional `/ask` is a flag-gated V4_PENDING
  deep entry that opens the same surface — not a peer dashboard. Mobile: Ask/HōMI
  as a sheet or More depth, never a fifth bottom-nav peer. No Homie. No fake
  live-AI typing. Compass stays shell-only. Craft:
  `docs/design/CONTEXTUAL_HOMI_CRAFT_v4_2026-09-11.md`.
- Finance GATE: score / verdict / hard stops from **AssessmentResult only**.
- Activation: `HOMI_V4_HOME_ENABLED` default **false** (CCP / ADR-005).
  Pixel Gate: do not undraft or expose `/home` until founder APPROVE VISUAL
  DIRECTION. Screenshot set: `docs/design/v4-screenshot-set.md`.
- Tabular / mono numbers for scores. Never say “HōMI Score”. Say
  **Decision Readiness Score**.
- No GSAP / scroll-jack / marquee on app chrome. Glass is atmosphere under
  controlled contrast. Never `overflow-x: hidden` on `body`.

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
| Home v4            | SHELL_CRAFT v4 + HOME_CRAFT v4 + ADR-006 (not OPERATE cockpit)                           |
| Hook               | `cro` / `copywriting`, then **one of** `frontend-design` **or** `design-taste-frontend` |
| Always after paint | brand-check, typecheck, reduced-motion smoke                                            |

**Forbidden stack:** multiple aesthetic skills on one PR · `brand-guidelines` (Anthropic) · `theme-factory` (generates off-token palettes) · unconstrained high-end on `/dashboard` · generating a new landing HTML as if the brand did not exist.
Enforced, not just documented: `.claude/settings.json` hides both skills (`skillOverrides: off`) and denies `Skill(brand-guidelines)` / `Skill(theme-factory)`.

## Layout ownership

```
(marketing)/layout → SiteHeader + SiteFooter (PERSUADE KEEP)
(product)/layout   → Shell v4 when HOMI_V4_HOME_ENABLED + V4 path;
                     else invent-chrome / role quiet bar (DARK trees) or SiteHeader
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
| 2026-08-23 | ScoreRail + five product tabs | landed on main; OPERATE hierarchy (retired as v4 floor) |
| 2026-09-09 | Product v4 Home + Shell | ADR-006; `/home`; Pixel Gate; flag default false |
