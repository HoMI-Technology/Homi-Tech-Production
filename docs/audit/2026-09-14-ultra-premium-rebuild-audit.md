# HōMI File & Build Audit — Ultra-Premium Rebuild Baseline

**Date:** 2026-09-14 · **Auditor:** Kimi (full-stack desk) · **Scope:** `Homi-Tech-Production@main` (8259b11), all satellite builds (Grok / Kimi / Claude), Google Drive reference library, uploaded archives.

**Method:** GitHub API tree walk of `main`; extraction and diff of four build archives; Drive folder survey; canon values verified against **executable TypeScript** (which wins every conflict per CANON.md).

---

## 1. Executive summary

The repo is not the problem. `main` is a hardened Next.js 15 / React 19 / Supabase production app with frozen scoring canon, brand enforcement in CI, an operators manual, and a real security posture. **The drift lives around it:** 42 branches (most stale), four divergent satellite builds, and Drive docs carrying superseded numbers. The rebuild is therefore **not** a burn-down — it is a canon re-lock, a merge of three genuinely valuable satellite assets, and a sequenced, ultra-premium rebuild of the product surfaces on the existing hardened spine.

**Do not delete:** auth, Supabase/RLS, Stripe, Plaid, security middleware, `lib/scoring/*`, `lib/brand/*`, CI gates.
**Rebuild:** product surfaces (marketing front door, dashboard, money, readiness) to the ultra-premium bar, one Section per PR.
**Merge:** Grok money instrument IA + honesty cord; Kimi extraction (already repo-sourced); Drive dashboard design language.

---

## 2. Production repo inventory (`main`)

| Area | Contents | Assessment |
|---|---|---|
| `app/` | 2 route groups: `(marketing)` (19 routes), `(product)` (40 routes), `api/` (29 namespaces), plus `auth/`, `shadow/`, `share/` | Mature. Some routes are experiment-era (genome, twin, trinity, v4) — candidates for consolidation, not deletion, pending usage data |
| `components/` | 36 domains | Strong. `brand/` is canon home; some orphan/satellite components flagged by prior nightly audits |
| `lib/` | 50+ domains incl. `scoring` (frozen), `brand`, `finance`, `plaid`, `stripe`, `agents`, `readiness` | The hardened spine. Executable truth |
| `supabase/` | Migrations + RLS | Keep. FORCE RLS everywhere; never relax |
| `__tests__/`, `e2e/`, `eval/` | vitest + Playwright + companion-honesty evals | Keep and extend. CORE runs without secrets |
| CI | `brand-check` → `architecture:check` → `tsc` → `vitest` → `next build` → LHCI | Good. Branch protection deferred under #241 spend hold |
| Docs | CANON, DESIGN, AGENTS, OPERATORS-MANUAL, SECTIONS, ARCHITECTURE-DESIGN, 52KB Plans.md | Deep. AGENTS.md updated by this PR for the rebuild era |

**Quality verdict:** staff-grade infrastructure; surface layer is where "ultra premium" must land.

---

## 3. Satellite builds — what they are and what to do with them

| Build | Stack | What it actually is | Verdict |
|---|---|---|---|
| `HoMI_KIMI_Build.zip` (378 files) | — | Its `canon/` folder is a **read-only extraction of this repo's own default branch** (its MANIFEST says so). Plus a Vite planner app | **Already merged by definition.** Repo is truth; keep zip as snapshot only |
| `homi-money-grok-build-current.zip` (145 files) | TanStack Start + Vite + PGlite + better-auth | The **current money/planner vision** (handoff 2026-09-13): Stand/Track/Decide/Plan instrument, `ScoreKind` honesty cord (`unscored` / `standing_from_ledger` / `shadow_modelled` / `official_assessment`), silent-defaults ban, 35/35/30 scoring port | **MERGE concepts, not code.** Port ScoreKind + money instrument IA into `lib/finance` / `components/money` (Next.js). Never paste TanStack/Vite files into this repo |
| `HoMI_Grok_Build.zip` (286 files) | Grok Build sandbox | Same money workspace **plus sandbox debris** (`.vercel/output`, `.tanstack/tmp`, `.grok` skills, screenshots) | Reference only. Screenshots are useful design evidence; code is not portable |
| `homi-v0.1.zip` (38 files) | turbo monorepo | 2026-early agent-OS experiment (brain/memory/receipt-ledger/skill-sandbox) | Historical. Do not merge |
| Drive: `Claude HoMI Full Stack Build` | Next.js | July 2026 snapshot | Superseded by `main`. Do not restore over main |
| Drive: `PRODUCT_Dashboard_v1.0.html` | HTML | Dashboard design reference — canon palette, wordmark letter colors, hero treatment | Design input for the dashboard rebuild phase |
| `homi-money-prototype.html` | HTML | Already in repo at `prototypes/homi-money-prototype.html` (byte-identical) | In-repo prototype convention confirmed — used again by this PR |
| `HōMI_THE_COMPLETE_BOOK` + budgeting research PDFs | docs | Vision + retention research | Product canon input; no code |

---

## 4. Canon drift table (verified against executable TS)

| Topic | Executable truth (repo, wins) | Superseded / conflicting sources | Status |
|---|---|---|---|
| Pillar weights | **35 / 35 / 30** (`lib/scoring/weights.ts`, server-only) | Drive `HOMI_SKILL.md`: 40/30/30 | Resolved → repo |
| Verdict thresholds | **READY ≥80 · ALMOST 65–79 · BUILD 50–64 · NOT_YET <50** (`lib/scoring/verdicts.ts`, boundary-inclusive) | Drive `HOMI_SKILL.md`: 85/70/55; 2026-08 audit notes: 75/60/40 | Engine unchanged. `verdicts.ts` carries a **founder-decision TODO** — confirm 80/65/50 or schedule a migration for stored assessments |
| Palette | cyan `#22d3ee` · emerald `#34d399` · yellow `#facc15` · amber `#fab633` · crimson `#f24822` · navy `#0a1628` (`lib/brand/index.ts`) | Drive spec: `#06b6d4` / `#10b981` / `#0a0f1c` | Resolved → repo |
| Verdict enum / badge | `NOT_YET` enum, badge label **DO NOT PROCEED** (ADR-001) | Older "NOT YET" badge copy | Resolved → repo |
| Spelling | HōMI (ō = U+014D) everywhere user-visible | `Ho╠äMI_` mojibake folder in Drive | Cosmetic Drive cleanup only |
| Compass | Orbit/keyhole; no ticks/needle/N-S-E-W; cardinal nodes | Shipped `ThresholdCompass.tsx` had **diagonal** nodes + malformed keyhole | **Fixed in this PR** |

---

## 5. Branch hygiene (42 branches)

- **Keep:** `main`; active `feat/*` streams with open work (`feat/budget-runway-domain`, `feat/operate-honesty`, `feat/outcome-calibration`, `feat/post-login-state-router` — verify each against open PRs before touching).
- **Archive candidates (24):** all `cursor/nightly-audit-*`, `cursor/*-orphan-*`, `cursor/dead-*`, `cursor/unused-*` branches — these are machine-generated audit trails, most likely fully merged or obsolete. Delete only after confirming each tip is an ancestor of `main` (`git merge-base --is-ancestor`).
- **Rescue branches:** `rescue/*` — keep until the rebuild lands, then archive.
- **Dependabot:** merge or close; `main` overrides already pin most of these.

---

## 6. Risks carried into the rebuild

| Risk | Severity | Handling |
|---|---|---|
| Founder TODO: 80/65/50 vs 75/60/40 thresholds | High (stored assessments) | Rebuild never changes scoring values; decision queued for founder in writing |
| Giant-PR regression | High | Rebuild ships one Section per PR against `docs/SECTIONS.md`; CI gates unchanged |
| Vite/TanStack contamination from Grok builds | Medium | Hard rule: port concepts, rewrite code. No `vite.config`, no `routeTree.gen`, no PGlite in this repo |
| Fake metrics creeping into marketing | Critical | No users/revenue/testimonials claims. Drive spec's metric tables are illustrative, never copy |
| Spend hold #241 | — | Untouched. No plan upgrades, no new paid infra |

---

## 7. What this PR ships (Phase 1)

1. This audit.
2. `REBUILD.md` — the ultra-premium execution plan (phases, gates, merge map).
3. `AGENTS.md` — instructions updated for the rebuild era (source hierarchy, satellite rules, verified canon numbers).
4. `components/brand/ThresholdCompass.tsx` — rebuilt canon-perfect (cardinal nodes, true keyhole, verdict overlays, reduced-motion) + full test coverage.
5. `prototypes/ultra-premium/front-door.html` — the ultra-premium design target for the marketing front door, following the in-repo prototype convention.
