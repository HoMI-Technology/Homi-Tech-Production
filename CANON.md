# HōMI Brand Canon (lock)

Agents and humans treat this file as law alongside [`DESIGN.md`](DESIGN.md).  
**Propagate the existing system. Do not invent a second visual language.**

## Purpose

This is the brand **lock / pointer** document — authority chain, non-negotiables, and where the executable sources live. It is not a rewrite of DESIGN.md.

## Authority on conflict

Highest wins:

1. **Wordmark anatomy** — [`components/brand/Wordmark.tsx`](components/brand/Wordmark.tsx) (letter colors, Inter 900, tracking `-0.02em`)
2. **DESIGN.md doctrine** — surfaces, modes (PERSUADE / OPERATE / CHROME), forbidden looks
3. **Shipped rasters** — `public/icon-*-v2.*`, `public/og-v2.png`, `public/apple-touch-icon-v2.png`, `public/splash/*`
4. **Process notes elsewhere** — audits, vault notes, PR chatter (advisory only)

Executable palette + copy in [`lib/brand/index.ts`](lib/brand/index.ts) and CSS tokens in [`app/globals.css`](app/globals.css) `@theme` must stay aligned with this lock. On conflict between prose and TypeScript/CSS, fix the drift — do not invent a third palette.

## Canonical sources

| What | Where |
| ---- | ----- |
| Doctrine (modes, materials, DoD) | [`DESIGN.md`](DESIGN.md) |
| Executable brand (`BRAND`, `COLORS`, `VERDICT_META`, `PILLARS`, taglines) | [`lib/brand/index.ts`](lib/brand/index.ts) |
| Token JSON (derived lock file) | [`lib/brand/homi-tokens.json`](lib/brand/homi-tokens.json) |
| Wordmark | [`components/brand/Wordmark.tsx`](components/brand/Wordmark.tsx) |
| CSS `@theme` + glass / chrome | [`app/globals.css`](app/globals.css) |
| Enforcement | `npm run brand-check` → [`scripts/brand-check.mjs`](scripts/brand-check.mjs) |
| Key public icons | `public/icon-192-v2.png`, `public/icon-512-v2.png`, `public/icon-512-maskable-v2.png`, `public/icon-v2.svg`, `public/og-v2.png` |

## Non-negotiables

- Spelling in user-visible prose: **HōMI** (capital H, ō = U+014D, capital MI). Repo/org slugs may use HoMI / Homi (brand-check carves that out).
- Dark navy surfaces only — never light backgrounds.
- Accents: cyan `#22d3ee` · emerald `#34d399` · yellow `#facc15`.
- Verdict colors: amber `#fab633` (BUILD FIRST) · crimson `#f24822` (DO NOT PROCEED badge).
- Type: Fraunces display · Inter body · JetBrains Mono / `.score-numeral` for data. Wordmark is Inter 900 (not Fraunces).
- Verdict enum: `READY` · `ALMOST_THERE` · `BUILD_FIRST` · `NOT_YET` (badge label: **DO NOT PROCEED**).
- Forbidden: beige / purple-SaaS / Anthropic `brand-guidelines` look. No second visual language.

## Out of scope

**Post** and **OmniTerm** are outside this canon. Do not pull their visual systems into HōMI product surfaces.

## Known open gaps (not fixed by this lock)

- Icon generator tooling is not yet in-repo; shipped `public/icon-*-v2.*` rasters remain the authority for app icons.
- `components/brand/ThresholdCompass` (UI SVG) and the premium compass lockup in shipped icon/OG rasters are related but not pixel-identical — do not “fix” one by inventing a third mark.

## How to change brand

Only via an explicit brand project that updates Wordmark / DESIGN.md / `lib/brand` / `homi-tokens.json` / `globals.css` / rasters together, then passes `npm run brand-check`.
