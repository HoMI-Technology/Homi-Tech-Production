# HōMI Tech — agent instructions (SSOT)

## Source of truth

- **GitHub:** https://github.com/HoMI-Technology/Homi-Tech-Production-
- **Local only:** `C:\Users\cody\code\Homi-Tech-Production-` (env `HOMI_SSOT`)
- **Default branch:** `main`
- **Never** treat Desktop `HoMI Tech` dumps, zips, or other clones as product truth.

## 1:1 rule (local ↔ GitHub)

1. Before work: `git pull --ff-only` on `main` (or `homi-ssot.ps1 pull`).
2. All edits happen **only** in this repo root.
3. After work: commit → push (or open PR) so GitHub matches local.
4. Do not maintain a second writable copy.

## Who may write

| Writer | May write product tree? |
|--------|-------------------------|
| Claude, Cursor, Codex, Kimi, Grok (in this repo cwd) | Yes, with leases / human review |
| EVO multi-ai-pipeline `-WorkDir` = this root | Yes |
| Agy (Antigravity) | **No** product writes — playground only; consult/read ok |
| Local Ollama models | Assist only; human or primary desk applies patches here |

## Commands

```powershell
pwsh -File C:\Users\cody\ai-server\scripts\homi-ssot.ps1 status
pwsh -File C:\Users\cody\ai-server\scripts\homi-ssot.ps1 pull
pwsh -File C:\Users\cody\ai-server\scripts\homi-ssot.ps1 pipeline -Task "..."
```

## Product notes

- Next.js app (`homi-production`): `app/`, `components/`, `lib/`, `supabase/`
- Keep secrets out of git; use `.env.local` (gitignored)
