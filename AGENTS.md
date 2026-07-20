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
