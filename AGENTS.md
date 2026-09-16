# HōMI Tech — agent instructions (SSOT)

## Ultra-premium rebuild mode (2026-09-14 — read first)

The repo is in **rebuild mode**: keep the hardened spine, rebuild every surface to
the ultra-premium bar. The living plan is [`REBUILD.md`](REBUILD.md); the baseline
evidence is [`docs/audit/2026-09-14-ultra-premium-rebuild-audit.md`](docs/audit/2026-09-14-ultra-premium-rebuild-audit.md).

**Source-of-truth hierarchy (on any conflict, highest wins):**

1. **Executable TypeScript in this repo** — `lib/scoring/*`, `lib/brand/*`,
   `lib/agents/registry`.
2. **Doctrine files** — `CANON.md`, `DESIGN.md`, this file, `REBUILD.md`.
3. **Founder decision in writing** (issue or ADR).
4. **Satellite builds and Drive docs** — Grok/Kimi/Claude builds, zips, desktop
   dumps, Google Drive folders. **Advisory references only.** Port concepts;
   rewrite code. Never paste Vite/TanStack/PGlite/better-auth artifacts into
   this tree. Never restore a satellite snapshot over `main`.

**Rebuild rules:**

- One Section per PR (`docs/SECTIONS.md`); name the Section and boundary up top.
- Never touch scoring values, weights, or thresholds in a surface PR.
- Verified canon (executable, 2026-09-14): pillar weights **35/35/30**;
  verdicts boundary-inclusive **READY ≥80 · ALMOST_THERE 65–79 ·
  BUILD_FIRST 50–64 · NOT_YET 0–49**; 4 hard stops. Older numbers in Drive
  docs (40/30/30, 85/70/55, 75/60/40) are superseded — see the founder TODO in
  `lib/scoring/verdicts.ts`.
- Every rebuild PR ends with: CI green → founder review → merge → REBUILD.md
  phase table updated.

## Spend hold — read before launch, CI, or paid-plan talk

**Issue [#241](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/241) is the SSOT.** Founder lock 2026-08-16: the site is accepted as built. **Do not buy, quote-pressure, or "helpfully" upgrade** GitHub Pro, Vercel Pro, or a second Supabase project until the founder **closes #241** and says go-live / marketing / traffic.

| Deferred (children of #241) | Do not start while #241 is open |
| --- | --- |
| [#243](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/243) | GitHub Pro + protect `main` (`verify` + `e2e` only) |
| [#242](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/242) | DEV Supabase + Stripe TEST + LHCI secrets |
| [#191](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/191) | Vercel Pro + leaked-password + real-card checkout |

**Accepted today:** CORE E2E (live suites skip when Actions secrets are empty). A green `verify` is not a release. Never put production `service_role` or `sk_live_*` in Actions to fake FULL coverage. Never use production as an E2E sandbox.

If a task looks like "fix skipped tests," "enable branch protection," or `buy_pro`: stop, link #241, and ask the founder.

## Operator manual (humans + agents)

**Read and follow:** [`docs/OPERATORS-MANUAL.md`](docs/OPERATORS-MANUAL.md)

| Command                        | Purpose                                           |
| ------------------------------ | ------------------------------------------------- |
| `homi doctor`                  | Machine + auth + secrets + noise health check     |
| `homi ssot status\|pull\|push` | Windows 1:1 GitHub sync (`scripts/homi-ssot.ps1`) |
| `homi secrets`                 | E2E / LHCI GitHub secrets present?                |
| `homi hygiene`                 | Open PR policy report                             |
| `homi manual`                  | Open the Operators Manual                         |

Do **not** invent a parallel ops process. Point the user at the manual section + command.

**Release verification (any candidate SHA):** confirm [#241](https://github.com/HoMI-Technology/Homi-Tech-Production/issues/241) still open (if so, CORE is enough) →
`homi doctor` → `homi secrets` (presence only) → `homi hygiene` →
Actions `verify` + `e2e` → `node scripts/ci-coverage-report.mjs` →
`docs/ops/MIGRATIONS-SSOT.md` (never `supabase db push` production).

## Source of truth

- **GitHub:** https://github.com/HoMI-Technology/Homi-Tech-Production
- **Local only (this PC):** `C:\Users\Quality Assurance\Desktop\HoMI_Tech_Github_Build` (GitHub worktrees under `Desktop\homi-worktrees\`). Never treat Branding-Marketing copies, ultra-premium 4-root snapshots, or zips as product truth.
- **Default branch:** `main`
- **Never** treat Desktop `HoMI Tech` dumps, zips, other clones, **or Google Drive build folders** as product truth. (See the hierarchy at the top.)

### Marketing assets & GTM (canonical)

- **Path:** `public/marketing/` (served at `/marketing/…` on the live site)
- **Admin hub:** `/admin/marketing` (funnel metrics + library links)
- **Index:** `public/marketing/README.md`
- **GTM OS (7 pillars):** `public/marketing/gtm/`
- All new marketing assets (social, press, emails, demo, screenshots) land **here** and are committed to GitHub. Desktop `homi-social-kit` is a working mirror only.

## 1:1 rule (local ↔ GitHub)

1. Before work: `git pull --ff-only` on `main` (or `homi-ssot.ps1 pull`).
2. All edits happen **only** in this repo root.
3. After work: commit → push (or open PR) so GitHub matches local.
4. Do not maintain a second writable copy.

## Two machines (work PC ↔ home MacBook)

Two clones are fine. **Two clones that drift are not.** GitHub is the only bridge
between them — never copy the folder, a zip, or a Desktop dump from one machine
to the other. The rule that prevents all cross-machine duplication:

> **Pull before you touch anything. Push (or open a PR) before you walk away.**

Never leave uncommitted work on one machine and start the same thing on the
other — that forks history and creates duplicate branches.

**Sitting down (either machine):**

```bash
git checkout main && git pull --ff-only   # if this fails, you have local commits — reconcile before starting
git checkout -b feat/<thing>              # or check out the branch you already pushed
```

**Getting up / switching machines (either machine):**

```bash
git add -A && git commit -m "wip: <thing>"
git push -u origin <branch>                # push even half-done work — better on GitHub than stranded
```

On the other machine: `git fetch && git checkout <branch>`. Work follows you
through GitHub, never through a copy.

**Cross-machine gotchas:**

- **`.env.local` / secrets are gitignored** — git will never sync them. Each
  machine keeps its own copy, set up once from `.env.example`. If the app
  behaves differently on Mac vs. PC, this is almost always why.
- **One open PR per stream of work.** Land or close branches; stale branches are
  where duplicate work hides. `git fetch && git branch -r` before starting
  anything shows what's already in flight.
- **The `homi-ssot.ps1` helper is Windows-only.** On the MacBook use
  `scripts/homi-ssot.sh` (`status` / `pull` / `push`), which mirrors it.

## Who may write

| Writer                                               | May write product tree?                                  |
| ---------------------------------------------------- | -------------------------------------------------------- |
| Claude, Cursor, Codex, Kimi, Grok (in this repo cwd) | Yes, with leases / human review                          |
| EVO multi-ai-pipeline `-WorkDir` = this root         | Yes                                                      |
| Agy (Antigravity)                                    | **No** product writes — playground only; consult/read ok |
| Local Ollama models                                  | Assist only; human or primary desk applies patches here  |

## Commands

**Windows (work PC):**

```powershell
pwsh -File C:\Users\cody\ai-server\scripts\homi-ssot.ps1 status
pwsh -File C:\Users\cody\ai-server\scripts\homi-ssot.ps1 pull
pwsh -File C:\Users\cody\ai-server\scripts\homi-ssot.ps1 pipeline -Task "..."
```

**macOS (home MacBook):**

```bash
./scripts/homi-ssot.sh status              # branch, sync vs origin, dirty files, .env.local check
./scripts/homi-ssot.sh pull                # ff-only pull of the current branch
./scripts/homi-ssot.sh push "wip: message" # commit everything + push current branch, set upstream
```

## Product guardrails (verified against executable TS 2026-09-14)

The build brief now lives at `docs/archive/BUILD-BRIEF.md`; its §1 guardrails
remain binding and are carried here. Violating any of these = stop and fix.

1. **Scoring canon is frozen.** Pillars weight **35% Financial Reality /
   35% Emotional Truth / 30% Perfect Timing**. Verdict thresholds are
   **boundary-inclusive**: READY ≥ 80, ALMOST_THERE 65–79, BUILD_FIRST 50–64,
   NOT_YET 0–49. There are **4 hard stops**. Never change these numbers. If any
   UI shows a score/verdict pair that violates them, that is a bug. Never touch
   `lib/scoring/*` — executable TypeScript there is the authority (see above).
2. **Scoring stays server-authoritative.** The score is always recomputed
   server-side (`lib/scoring/engine.ts` via `/api/assessments`). Never trust a
   client-sent score. Never move scoring to the client.
3. **Brand canon.** Spelling is exactly **HōMI** (capital H, ō = U+014D,
   capital MI) in all user-visible text. Colors only: cyan `#22d3ee`, emerald
   `#34d399`, yellow `#facc15`, amber `#fab633`, crimson `#f24822`, navy
   `#0a1628`. Dark navy surfaces only — never light backgrounds. No banned
   stale claims ("50/30/20", "73%", "70%"). `npm run brand-check` enforces this
   in CI.
4. **Security posture only strengthens.** RLS stays enabled + FORCEd on every
   table. `SECURITY DEFINER` functions keep pinned `search_path`. Never delete
   or relax an RLS policy. Never expose the service-role key to the client or
   `NEXT_PUBLIC_`.
5. **Add a test for every fix that has logic.** Especially: webhook
   signature/idempotency/tier-mapping, share ownership, entitlements, and the
   verdict-canon guard (`npm run test:acceptance`).
6. **Honesty cord (carried from the Grok money planner, now binding repo-wide).**
   Never invent balances, scores, or states. Surfaces are empty-or-live.
   Unknown values render as `null`/empty, never `0`. Score states are exactly:
   `unscored` / `standing_from_ledger` / `shadow_modelled` /
   `official_assessment` — only the last is a HōMI verdict. AI explains; it
   never calculates, invents, or overrides.

## Scoped work — one Section per task

The build is vertically sliced by domain. [`docs/SECTIONS.md`](docs/SECTIONS.md)
is the SSOT map that draws the boundaries. **The rule for every agent task:**

> Read anything; **write only inside the one Section named in the task**, plus
> any shared dependency the task explicitly declares. If you believe you must
> edit **Section 0 (Scoring Core)** or **Section 8 (Platform)**, stop and ask.

Name the Section and the boundary at the top of each task, and keep the task
smaller than the Section. A task that needs to cross a boundary is the signal to
split it into two. This is what stops an agent from wandering across the whole
tree and overworking. See `docs/SECTIONS.md` for the full map and the
directory-to-Section index.

## Product notes

- Next.js app (`homi-production`): `app/`, `components/`, `lib/`, `supabase/`
- Design targets for the rebuild live in `prototypes/` (single-file HTML,
  canon-locked) — e.g. `prototypes/ultra-premium/front-door.html`
- Keep secrets out of git; use `.env.local` (gitignored)

## Agent-scrapable architecture feed + Design Doc

**Human-readable complete architecture design document** (full system architecture, detailed UI specs, integration plan with explicit tradeoffs, diagrams, risks & mitigations, evolution):  
`docs/ARCHITECTURE-DESIGN.md` (in-repo, production baseline v1.0).

Any agent can fetch the complete HōMI architecture snapshot:

```
https://homitechnology.com/architecture.json
```

Locally after `npm run architecture:gen`, the same file is served from
`public/architecture.json`. Regenerate and check drift with:

```bash
npm run architecture:gen
npm run architecture:check
```

**Authority:** executable TypeScript wins on conflict (`lib/scoring`,
`lib/brand`, `lib/agents/registry`). The feed is a derived index. The DESIGN.md + ARCHITECTURE-DESIGN.md are the human contracts.

**Consumption protocol (short):**

1. Fetch the product-domain JSON (not third-party mirrors).
2. Prefer `calculators[].route` for tool paths — never invent slugs.
3. Use real agent unlock levels from `ai_agents[].level` (Oracle is 10).
4. Treat `gaps[]` as hints; verify in-repo before scheduling work.
5. Verdict enum stays `NOT_YET`; badge label is `DO NOT PROCEED`
   (`docs/adr/001-verdict-vocabulary.md`).

In-product UI: `/agent-hub` (Agent Hub — feed URL, prompt builder, exports).

## Cursor Cloud specific instructions

Single Next.js 15 / React 19 app (`homi-production`), package manager **npm**
(only `package-lock.json`; `.npmrc` sets `legacy-peer-deps=true`), **Node 22**.
Config lives in `.cursor/environment.json` (repo file beats dashboard/personal).

Two explicit modes — bootable is not the same as isolated:

- **BUILD-SAFE** (default when no DEV Supabase trio is injected): `npm ci`,
  typecheck, unit tests, brand/architecture checks, production build, `npm run
  dev`, anonymous assessment → `POST /api/scoring` → results. Uses an inert
  local Supabase URL (`http://127.0.0.1:54321`) and **does not** write a
  service-role key. `/api/healthcheck` may report `database: error` — that is
  correct, not a reason to point at production. No production fallback.
- **FULL-STACK DEV** (only when all three dedicated DEV secrets are injected as
  an atomic set): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`. Optional Stripe **test** (`sk_test_*`) and Plaid
  **sandbox** keys may ride along. Live Stripe (`sk_live_*`), Plaid
  `production`, or the production Supabase host are refused. Partial sets fail
  closed — never mix DEV URL + missing service role.

`.env.local` is gitignored and does not survive a fresh Cloud VM.
`scripts/cloud-agent-env.sh` (start hook) reconciles it:

1. Human-authored file (no managed block) → left untouched.
2. Empty / missing → write a managed block (`# BEGIN HōMI CURSOR CLOUD MANAGED`).
3. Managed file → replace only that block; keep extra manual keys.
4. Repeated starts are idempotent. Writes are atomic (temp + rename).

**Do not** apply migrations, `supabase db push`, or seed on start.
**Do not** run live/destructive Playwright (`e2e` specs that create users)
against production. Full integration E2E only against the dedicated DEV
project. A truthy fake `SUPABASE_SERVICE_ROLE_KEY` is never written — absence
means not configured (`createAdminClient()` returns null).

Stale tmux/shell: Next loads `.env.local` on boot, so writing the managed
block beats a shell that started before secrets were injected. Restart
`npm run dev` after a mode change.

Install (snapshot) runs `npm ci` and Playwright Chromium once. Start only
reconciles env. The visible terminal is `npm run dev` on
`http://localhost:3000`.

- **Standard commands** are the `package.json` scripts (`dev`, `build`, `start`,
  `typecheck`, `test`, `test:e2e`, `brand-check`). Dev server is `npm run dev`
  on `http://localhost:3000`.
- **CI gate order** (`.github/workflows/ci.yml` job `verify`): `brand-check` →
  `architecture:check` → `tsc --noEmit` → `vitest run` → `next build` →
  public Lighthouse CI. `next.config.ts` sets `typescript.ignoreBuildErrors`
  so **`next build` is not proof of type safety** — the separate typecheck
  step is. Authenticated dashboard Lighthouse is optional and **skips** unless
  `LHCI_TEST_*` secrets exist.
- **Required GitHub check names** (from successful `main` runs): `verify`, `e2e`.
  Branch protection / rulesets are **not available** on this private repo
  without GitHub Pro — a green check is not merge enforcement until the owner
  upgrades and requires those two names.
- **Coverage mode:** `node scripts/ci-coverage-report.mjs` (also a CI step).
  CORE = anonymous/public suites. FULL = live DEV Supabase + Stripe TEST
  secrets present. A green `e2e` badge on CORE is not FULL.
- **ESLint/Prettier are deferred** (no packages, no `lint` / `format`
  scripts). Do not run `next lint` — it hangs a non-interactive shell on an
  interactive setup prompt. They are not CI gates; use `typecheck` +
  `brand-check` (+ `architecture:check`, vitest). **DEFERRED — TOOLING CLEANUP.**
  Do not add ESLint/Prettier packages while spend hold #241 is open.
- **Core flow needs no secrets to test**: the assessment (`/assessment` →
  `/results`) and the scoring engine (`POST /api/scoring` with the body shape in
  `lib/validation/assessment.ts`) run fully on placeholder env. This is the
  fastest way to smoke-test that the app works end-to-end.
- **Playwright E2E** (`npm run test:e2e`) additionally requires
  `npx playwright install chromium` (browsers are not part of `npm ci`). It
  reuses an already-running dev server on `:3000`; the 4 "live" specs self-skip
  without real Supabase/Stripe secrets, leaving 6 always-on specs (incl. the
  full assessment→verdict flow) as the gate.
- **Lighthouse** (`npm run lighthouse`) collects against a **production** server
  (`npm run start`). `next dev` overwrites `.next` with a dev build, so re-run
  `npm run build` before `npm run start`/lighthouse or `next start` errors with
  "Could not find a production build". In this container Chrome needs
  `--no-sandbox`, e.g.
  `CHROME_PATH=/usr/local/bin/google-chrome npx lhci autorun --collect.settings.chromeFlags="--no-sandbox --disable-dev-shm-usage --disable-gpu" --upload.target=filesystem`.
  Perf/LCP budget assertions can marginally fail on the throttled Cloud VM CPU
  (not a code defect); a11y/SEO/best-practices pass.

## Script-budget discipline (SEO/perf audit follow-up, 2026-08-23)

- Public routes carry a hard Lighthouse script budget (350KB, error at 360KB —
  `lighthouse-budget.json` / `lighthouserc.json`). Headroom is thin and webpack
  module-ID churn can tip it from unrelated commits.
- **Before adding any import to `app/(marketing)/**` or another budgeted
  route, trace what it pulls in.** `npm run analyze` (ANALYZE=true build, bash
  or CI — local Windows builds are SAC-blocked) emits client/server treemaps;
  diagnose regressions by import-trace, never by guessing.

## Worktree node_modules (2026-08-23)

Worktrees under C:/dev/worktrees share node_modules via Windows junctions.
NEVER run `npm install` inside a junctioned worktree: npm silently replaces
the junction with a real directory, the shared install never receives the
package, and sibling worktrees break. Install new dependencies in a worktree
with a real node_modules (or the junction's target), then recreate junctions.
