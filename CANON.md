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
- CTA-only (from existing `.btn-primary`, not general accents): cyanDeep `#0ea5c4` · ctaInk `#04121c`.
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

## Amendment procedure (STUDY → PILOT → CANON)

The section above covers palette, type, and mark changes. It does not cover the more
common case: a founder-approved idea that contradicts a written prohibition. Without a
path, that idea becomes a study, gets filed, and is re-explored from scratch next
session. Six Companion sessions on 2026-08-15/16 produced forty-plus artifacts and zero
promotions. This is the path. (Unrelated to the *Decision Ladder* in ADR-002, which is
about decision verticals.)

### Three states

| State | Weight | Lives in | Signed by |
| ----- | ------ | -------- | --------- |
| **STUDY** | None. May contradict any doctrine, must say so. | `~/.gstack/projects/Homi-Tech-Production/designs/<slug>/` | Nobody. Exploring is free. |
| **PILOT** | Provisional, one named surface, expires. | A feature branch or `public/marketing/pilot/<slug>/`, with an expiry date in `approved.json` | Founder, in writing |
| **CANON** | Applies everywhere. | Doctrine files edited; assets in their normal homes | Founder, plus an amendment record |

### STUDY → PILOT — all five required

1. **Name the collision.** Every doctrine line the work contradicts, quoted verbatim
   with its file path, in `approved.json`. The existing `canon_flag` / `collisions`
   fields already do this.
2. **Argue it.** Why the prohibition should not apply to this use, or should not exist.
   Two or three sentences a reviewer can disagree with specifically.
3. **Bound the surface.** One named surface with a path. Not "the product." Not "the
   campaign."
4. **Name the revert.** The exact commit or branch that undoes it, written before the
   pilot starts.
5. **Set the expiry.** Default **60 days**. On that date it promotes or it dies. No
   silent extension.

### PILOT → CANON — all four required

1. The pilot ran its full term with no compliance incident and no unresolved Guardrails
   objection.
2. **Every contradicting doctrine file is edited in the same commit.** Not queued, not
   "in a follow-up."
3. An amendment record: what changed, why, what was rejected, what would reverse it. An
   ADR under `docs/adr/` is the normal form.
4. `npm run brand-check` and `npm run typecheck` pass, including any new rule the
   amendment implies. A boundary that gets created gets a test.

### Kill criterion

A study re-explored **three times** without reaching PILOT is archived with a written
reason. Three rounds that cannot clear gate 1 is not a design problem.

### Standing rules

- **Studies never ship by accident.** Nothing under `designs/` is a source of truth. A
  folder of uncommitted exports is not a decision.
- **A pilot is not a soft launch.** If it cannot be reverted in one commit, it is canon
  that skipped review.
- **Doctrine drift is the failure mode to watch.** The moment shipped code and a written
  rule disagree, both become unreliable. Gate 2 exists for exactly this.

First application: [`docs/adr/003-companion-character-boundary.md`](docs/adr/003-companion-character-boundary.md).
