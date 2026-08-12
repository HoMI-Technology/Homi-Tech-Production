# HōMI Social Kit — Publish Checklist

**Owner:** Founder (Chike)  
**Kit root:** `Desktop\homi-social-kit`  
**Version:** v1

## Day-of multi-platform update

| # | Platform | Avatar | Cover / banner | Notes |
|---|----------|--------|----------------|-------|
| 1 | X / Twitter | `02-avatars/…-512.png` | `03-covers/…x_header…` | Check avatar dead zone |
| 2 | LinkedIn personal | 512 avatar or photo | `…linkedin_personal…` | |
| 3 | LinkedIn company Page | 512 | `…linkedin_page…` | Different from personal |
| 4 | Facebook Page | 512 | JPG lean cover | |
| 5 | Instagram | 512 | n/a (use posts) | Square + portrait in `05-posts` |
| 6 | YouTube | 1024 | `…youtube…` | Confirm safe band on phone |
| 7 | GitHub org/user | 512 | n/a | Set social preview image in repo settings |
| 8 | Discord / Slack | 256 | n/a | |
| 9 | TikTok | 512 | n/a | |
| 10 | Website OG | n/a | `04-link-previews/homi_og_home_…` | Wire `og:image`; version filenames on change |

## After upload

- [ ] Desktop + mobile preview per channel  
- [ ] Meta Sharing Debugger / LinkedIn Post Inspector for OG  
- [ ] Spelling **HōMI** with macron everywhere  
- [ ] No never-say language in bios  
- [ ] Expect avatar CDN lag 24–48h  

## Regenerate assets

```powershell
$py = "$env:LOCALAPPDATA\hermes\hermes-agent\venv\Scripts\python.exe"
& $py "$env:USERPROFILE\Desktop\homi-social-kit\scripts\build_social_kit.py"
```

## Rollback

Avatars: `Desktop\homi-profile\backup\`  
Covers: re-run generator or keep prior `*_v1` files before overwriting as `v2`.
