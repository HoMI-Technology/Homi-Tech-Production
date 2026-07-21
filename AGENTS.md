# HōMI Tech — agent instructions (SSOT)

## Source of truth

- **GitHub:** https://github.com/HoMI-Technology/Homi-Tech-Production
- **Local only:** `C:\Users\cody\code\Homi-Tech-Production-` (env `HOMI_SSOT`)
- **Default branch:** `main`
- **Never** treat Desktop `HoMI Tech` dumps, zips, or other clones as product truth.

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

| Writer | May write product tree? |
|--------|-------------------------|
| Claude, Cursor, Codex, Kimi, Grok (in this repo cwd) | Yes, with leases / human review |
| EVO multi-ai-pipeline `-WorkDir` = this root | Yes |
| Agy (Antigravity) | **No** product writes — playground only; consult/read ok |
| Local Ollama models | Assist only; human or primary desk applies patches here |

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

## Product notes

- Next.js app (`homi-production`): `app/`, `components/`, `lib/`, `supabase/`
- Keep secrets out of git; use `.env.local` (gitignored)

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
  that was created *before* the secrets were injected keeps the stale env and
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
- **CI gate order** (`.github/workflows/ci.yml`): `brand-check` → `tsc --noEmit`
  → `vitest run` → `next build`. Treat these four as the real pass/fail signal.
- **Do NOT rely on `npm run lint`**: there is no committed ESLint config, so
  `next lint` drops into an interactive setup prompt and hangs a non-interactive
  shell. It is intentionally not part of the CI gate; use `typecheck` +
  `brand-check` instead.
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
