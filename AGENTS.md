# HōMI Tech — agent instructions (SSOT)

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

**Release verification (any candidate SHA):** `homi doctor` (machine) →
`homi secrets` (E2E/LHCI presence, never values) → `homi hygiene` (open PRs) →
GitHub Actions for that SHA (`verify` + `e2e`) →
`node scripts/ci-coverage-report.mjs` (CORE vs FULL) →
`docs/ops/MIGRATIONS-SSOT.md` (do not `supabase db push` production).

## Source of truth

- **GitHub:** https://github.com/HoMI-Technology/Homi-Tech-Production
- **Local only (this PC):** `C:\Users\Quality Assurance\Desktop\HoMI_Tech_Github_Build` (GitHub worktrees under `Desktop\homi-worktrees\`). Never treat Branding-Marketing copies, ultra-premium 4-root snapshots, or zips as product truth.
- **Default branch:** `main`
- **Never** treat Desktop `HoMI Tech` dumps, zips, or other clones as product truth.

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

## Product guardrails (extracted from BUILD-BRIEF §1, 2026-08-03)

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
Dependencies are refreshed automatically by the startup update script (`npm ci`),
so you should not need to install them manually.

- **`.env.local` is required and gitignored**, so it does not persist across
  fresh Cloud VMs — recreate it if the app can't find Supabase vars. The CI
  placeholder Supabase values (see `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.github/workflows/ci.yml`) plus
  `NEXT_PUBLIC_SITE_URL=http://localhost:3000` and any non-empty
  `SUPABASE_SERVICE_ROLE_KEY` are enough for lint/typecheck/test/build and to
  run the app. Every other integration (Stripe, Plaid, Anthropic, Resend,
  Sentry, Upstash, PostHog, web-push) degrades gracefully when unset. Real
  login/DB persistence and the live E2E specs need a real Supabase project.
- **When real Supabase secrets are provided as VM env secrets**
  (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`), copy them into `.env.local` so the dev server
  reads them reliably. **Gotcha:** a dev server launched inside a `tmux` session
  that was created _before_ the secrets were injected keeps the stale env and
  logs in fail with "Something went wrong"; writing the values into `.env.local`
  (which Next always loads) sidesteps this — or recreate the tmux server. The
  authenticated Supabase MCP server can apply migrations / query the DB directly.
- **The reachable Supabase project is the live/production project** (real
  `profiles`, `waitlist`, etc.), not a throwaway. Per `e2e/README.md`, do NOT run
  the destructive live Playwright suite (it creates/deletes auth users) against
  it — use a dedicated test project for that. Self-cleaning single-user checks
  (admin `create` → sign in → admin `delete`) are fine for smoke-testing auth.
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
- **Do NOT rely on `npm run lint`**: there is no committed ESLint config, so
  `next lint` drops into an interactive setup prompt and hangs a non-interactive
  shell. It is intentionally not part of the CI gate; use `typecheck` +
  `brand-check` instead. **DEFERRED — TOOLING CLEANUP.**
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
