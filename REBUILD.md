# HōMI Ultra-Premium Rebuild — Execution Plan

**Status:** LIVING DOCUMENT · **Started:** 2026-09-14 · **Audit baseline:** [`docs/audit/2026-09-14-ultra-premium-rebuild-audit.md`](docs/audit/2026-09-14-ultra-premium-rebuild-audit.md)

> One phrase: **keep the hardened spine, rebuild every surface to the ultra-premium bar, merge the three satellite assets that earned it — one Section per PR, CI green or it doesn't land.**

---

## 0. Non-negotiables during the rebuild

1. **Executable TypeScript wins.** `lib/scoring/*`, `lib/brand/*`, `lib/agents/registry` are authority. Never change scoring values, weights, or thresholds as part of a surface rebuild.
2. **Satellite builds are advisory.** Grok/Kimi/Claude builds, Drive docs, and zips are references. Port concepts; rewrite code in this repo's stack (Next.js 15 App Router + React 19 + TS strict + Tailwind v4 + Supabase). **No Vite/TanStack/PGlite/better-auth artifacts in this tree.**
3. **One Section per PR** per `docs/SECTIONS.md`. A rebuild PR names its Section and its boundary at the top.
4. **CI gates unchanged:** `brand-check` → `architecture:check` → `tsc --noEmit` → `vitest run` → `next build`. `next build` is not type safety.
5. **Spend hold #241 untouched.** No plan upgrades, no new paid services, no marketing/traffic pushes.
6. **Honesty cord everywhere:** never invent balances, scores, or states; empty-or-live; unknown → `null`, never `0`; AI explains, never calculates.
7. **Ultra-premium bar:** dark navy only, canon palette, Inter/Fraunces/JetBrains Mono, compass per spec, macro-whitespace, spring-physics motion (`cubic-bezier(0.32,0.72,0,1)`), transform/opacity-only animation, `prefers-reduced-motion` respected, mobile collapse below 768px.

---

## 1. Target architecture (unchanged spine)

```
app/            Next.js 15 App Router — (marketing) / (product) / api
components/     domain UI — brand/ is canon home
lib/            scoring (frozen) · brand · finance · readiness · agents · supabase · stripe · plaid
supabase/       migrations + RLS (FORCE on every table)
prototypes/     design targets (single-file HTML, canon-locked) — the rebuild's visual spec
```

The rebuild changes **how the product looks, feels, and flows** — not the auth/payments/data/security layers that already pass audit.

---

## 2. Phases

| Phase | Section(s) | Deliverable | Gate |
|---|---|---|---|
| **P1 — Canon re-lock** (this PR) | Cross-cutting | Audit, updated AGENTS.md, this plan, canon-perfect ThresholdCompass + tests, ultra-premium front-door prototype | CI green; founder reads audit |
| **P2 — Front door** | Marketing | Rebuild `app/(marketing)` from `prototypes/ultra-premium/front-door.html`: hero (question → inversion → compass), pillars, verdict spectrum (qualitative only — rules N21/N22), steps, close. Lighthouse script budget ≤350KB holds | CI + LHCI + screenshot review |
| **P3 — Assessment & verdict** | Assessment/Score | Shadow Score → full assessment → verdict reveal rebuilt around the compass; verdict overlay states (READY pulse / ALMOST pulse / BUILD halo / NOT_YET halo) | acceptance suite incl. verdict-canon guard |
| **P4 — Money instrument** | Money | Port Grok planner's **Stand/Track/Decide/Plan** IA + **ScoreKind honesty cord** into `components/money` + `lib/finance`; ledger-backed, empty-or-live; no TanStack code | finance tests + RLS audit |
| **P5 — Dashboard** | Dashboard | Rebuild `/dashboard` from `PRODUCT_Dashboard_v1.0.html` design language + real data only | loads real data, no mock states |
| **P6 — Retire & consolidate** | Platform | Fold experiment-era surfaces (genome/twin/trinity/v4) behind flags or remove per usage data; archive stale branches per audit §5 | architecture:check + full suite |

Each phase ends with: commit → PR → CI green → founder review → merge → update this file's phase table.

---

## 3. Merge map (satellites → repo)

| Source asset | Destination | Form |
|---|---|---|
| Grok `ScoreKind` honesty cord (`unscored` / `standing_from_ledger` / `shadow_modelled` / `official_assessment`) | `lib/finance/score-kind.ts` + surface badges | Rewrite in TS strict, with tests |
| Grok money instrument (Stand/Track/Decide/Plan) | `components/money/` IA | Rewrite as Next.js server/client components |
| Grok screenshots (`screenshots/*.png`) | design review for P4 | Evidence only |
| Kimi `canon/` extraction | — | Nothing to do: it **is** this repo |
| Drive `PRODUCT_Dashboard_v1.0.html` | P5 design input | Design reference |
| Drive `Claude HoMI Full Stack Build` | — | Superseded; do not restore |
| `homi-v0.1` agent-OS monorepo | — | Historical; informs `lib/agents` thinking only |

---

## 4. Open founder decisions (blocking nothing, queued in writing)

1. **Verdict thresholds:** engine ships 80/65/50 (boundary-inclusive); 2026-08 audit notes cite 75/60/40. Confirm engine values or approve a stored-assessment migration. See `lib/scoring/verdicts.ts` TODO.
2. **Branch purge:** approve deletion of the 24 archive-candidate branches in audit §5 after ancestry check.
3. **Experiment-era surfaces** (genome / twin / trinity / v4): keep, flag, or retire — decided at P6 with usage data.

---

## 5. Definition of done — every rebuild PR

- [ ] CI green (all five gates) on the PR head
- [ ] `brand-check` passes — HōMI spelling, palette, no banned claims
- [ ] No scoring/weights/threshold literals touched
- [ ] Reduced-motion + 768px collapse verified
- [ ] Honesty cord: no invented data, empty-or-live states
- [ ] Tests for every logic change; screenshots for every surface change
- [ ] This file's phase table updated
