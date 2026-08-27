# Claude Code — HōMI Tech

Open **only** this repository root. SSOT:

- GitHub: https://github.com/HoMI-Technology/Homi-Tech-Production
- Site: https://homitechnology.com
- Local (Windows): `C:\Users\Quality Assurance\Desktop\HoMI_Tech_Github_Build`
- Local (macOS): `/Users/cody/Desktop/Homi-Tech-Production REPO` (symlink → `~/Developer/Homi-Tech-Production`)

**Lane:** Claude Code is the **batch** writer. If Cursor or Grok already holds
`./scripts/homi-agent.sh` lease on this tree, **stop** — use a worktree under
`Desktop/homi-worktrees/` instead of writing here.

```bash
./scripts/homi-agent.sh take claude
```

`./scripts/homi-agent.sh take claude` pulls GitHub once at the start of the build. Push as you go (`./scripts/homi-ssot.sh push`). Do not run extra pulls mid-build.
After changes: leave a clean commit story; operator pushes so GitHub stays 1:1.
Do not edit Desktop archives, iCloud `HoMI_Tech` copies, or zips.
Do not edit `lib/scoring/*` (Section 0 frozen).
Read AGENTS.md for full rules. Drop the lease when done: `./scripts/homi-agent.sh drop`.
