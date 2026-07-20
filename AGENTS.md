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

## Domains (owned, DNS at GoDaddy)

HōMI Tech owns **three** domains — always treat **`homitechnology.com` as canonical**:

| Domain | Role |
|--------|------|
| `homitechnology.com` | **PRIMARY / canonical** — the Vercel app + the verified Resend sending domain (`from: hello@homitechnology.com`, `lib/email/send.ts`) |
| `homitechnology.co` | secondary — should 301-redirect to `homitechnology.com` (Vercel) |
| `hōmi.com` = punycode `xn--hmi-qxa.com` | short ō-brand — should 301-redirect to `homitechnology.com` (Vercel). The `ō` is real, **not** a typo; the Resend account login is `info@xn--hmi-qxa.com`. |

- Canonical URL is centralized in `NEXT_PUBLIC_SITE_URL` (fallback `https://homitechnology.com`). Keep it set to the canonical host in Vercel prod; the app is **domain-agnostic — do NOT hardcode a domain** in code.
- Auth redirects are built from `window.location.origin`, so **Supabase Auth + Google OAuth redirect allowlists must include all three hosts** or sign-in/OAuth/magic-link/password-reset breaks on the non-canonical domains.
- Each domain is a separate Resend domain with its own DKIM key; a redirect domain can still send email (redirect uses `@`/`www`, email uses `send`/`resend._domainkey` — different DNS names, no conflict).
- Also owned at GoDaddy but **NOT** part of HōMI: `promptingit.co`, `rapidcarex.com`, `closer-os.com`.
