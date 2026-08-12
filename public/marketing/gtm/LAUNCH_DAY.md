# HōMI Launch Day — Do this list in order

**Kit folder:** `Desktop\homi-social-kit`  
**Owner:** Founder (Chike)  
**Rule:** Educational guidance only. Never say approved / guaranteed / pre-qualified / “replaces your credit score.”

---

## Before you start (5 min)

- [ ] Site is live and opens: **https://homitechnology.com** (or your real URL)
- [ ] Product Hunt page ready to submit / go live (if using PH today)
- [ ] Have logins for: **X · LinkedIn (personal + company) · Instagram · Product Hunt**
- [ ] Open this folder in Explorer: `Desktop\homi-social-kit`

---

## Part A — Brand setup (once, if not done yet)

Do these first so every post looks consistent.

| # | Where | What to upload | Exact file |
|---|--------|----------------|------------|
| A1 | **Every brand account** avatar | Profile photo | `02-avatars\homi-threshold-compass-avatar-512.png` |
| A2 | **X** header | Banner | `03-covers\homi_cover_x_header_1500x500_v1.png` |
| A3 | **LinkedIn company Page** logo + cover | Logo = avatar 512; Cover = | `03-covers\homi_cover_linkedin_page_4200x700_v1.png` |
| A4 | **LinkedIn personal** cover (optional) | Cover | `03-covers\homi_cover_linkedin_personal_1584x396_v1.png` |
| A5 | **Instagram** profile photo | Avatar | same as A1 |
| A6 | **GitHub** (if public org) | Avatar + social preview | Avatar A1; preview `04-link-previews\homi_github_social_1280x640_v1.jpg` |
| A7 | **Website** (eng / you) | Link preview image | `04-link-previews\homi_og_home_1200x630_v1.jpg` as `og:image` |

**Bios (copy-paste):** `07-copy\BIOS.md`

---

## Part B — Product Hunt (only if launching on PH today)

| # | Step | Exact file / text |
|---|------|-------------------|
| B1 | Thumbnail | `09-launch\product-hunt\homi_ph_thumb_compass_240.png` |
| B2 | Gallery image 1 | `09-launch\product-hunt\homi_ph_01_hero.png` |
| B3 | Gallery image 2 | `09-launch\product-hunt\homi_ph_02_problem.png` |
| B4 | Gallery image 3 | `09-launch\product-hunt\homi_ph_03_solution.png` |
| B5 | Gallery image 4 | `09-launch\product-hunt\homi_ph_04_not.png` |
| B6 | Gallery image 5 | `09-launch\product-hunt\homi_ph_05_cta.png` |
| B7 | Tagline + description + first comment | Open `07-copy\PRODUCT_HUNT_LAUNCH.md` and paste |
| B8 | Submit / schedule PH | Note your live PH URL here: ________________ |

If **not** on Product Hunt: skip Part B. Use website URL only.

---

## Part C — Launch Day posts (in this order)

### 1) Company announcement (do first)

| | |
|--|--|
| **Where** | LinkedIn **company Page** + **X** brand account |
| **Image** | `05-posts\homi_post_launch_announcement_1080.png` |
| **Alt image (link card)** | `05-posts\homi_post_launch_announcement_1200x627.png` |
| **Caption** | |

```
Introducing HōMI — Decision Readiness Intelligence.

Know When You're Ready before the commitment you can't undo.

Educational guidance only. Not a lender. Not a credit score replacement.

→ [your website]
→ [Product Hunt link if live]
```

- [ ] Posted company LinkedIn  
- [ ] Posted X  

---

### 2) Founder personal post (do second)

| | |
|--|--|
| **Where** | **Your** LinkedIn + optional personal X |
| **Image** | `05-posts\homi_post_founder_launch_1080.png` |
| **Caption** | From `07-copy\FOUNDER_VOICE.md` → **founder_launch** |

```
Launching HōMI is not about more pressure to buy.

It's about more permission to wait when waiting is wise.

Know When You're Ready.
[website] · [PH link if live]

— Chike "Wally" Wali
```

- [ ] Posted personal LinkedIn  
- [ ] Optional: personal X  

---

### 3) Launch carousel (do third)

| | |
|--|--|
| **Where** | LinkedIn company (document/carousel) and/or Instagram |
| **Images** | `05-posts\carousels\launch-week\` → upload **01.png → 05.png** in order |
| **Caption** | From `07-copy\CAROUSELS.md` → **Launch week** |

```
We're opening HōMI for early explorers.

Not more pressure to buy — more permission to wait when waiting is wise.

Swipe: problem → what you get → how to try → join us.

Educational guidance only.
[website / PH]
```

- [ ] Posted carousel  

---

### 4) Stories (optional, same day)

| Story file | Text overlay idea |
|------------|-------------------|
| `06-stories\homi_story_launch_day_1080x1920.png` | “We're live” + link sticker |
| `06-stories\homi_story_launch_try_1080x1920.png` | “Curious, not pressured” |
| `06-stories\homi_story_launch_link_1080x1920.png` | Link → website or PH |

- [ ] IG stories posted  
- [ ] Optional: LinkedIn/Facebook story if you use them  

---

## Part D — After you post (same day)

- [ ] Reply to every early comment (PH + LinkedIn + X) within a few hours  
- [ ] Pin the company announcement on X / LinkedIn if the platform allows  
- [ ] Share PH link (if any) once in a short follow-up, not spam  
- [ ] Screenshot live posts into a folder for your records (optional)  

---

## Part E — Tomorrow (D+1) — already prepared

| Who | Image | Copy |
|-----|--------|------|
| Founder | `homi_post_founder_why_1080.png` | `FOUNDER_VOICE.md` → founder_why |
| Company | `carousels\afford-vs-ready\` 01–05 | `CAROUSELS.md` → Afford vs Ready |

Full week: `07-copy\LAUNCH_WEEK_CALENDAR.md`

---

## Quick file map (Launch Day only)

```
02-avatars\homi-threshold-compass-avatar-512.png
03-covers\homi_cover_x_header_1500x500_v1.png
03-covers\homi_cover_linkedin_page_4200x700_v1.png
04-link-previews\homi_og_home_1200x630_v1.jpg
05-posts\homi_post_launch_announcement_1080.png
05-posts\homi_post_founder_launch_1080.png
05-posts\carousels\launch-week\01.png … 05.png
06-stories\homi_story_launch_*.png
09-launch\product-hunt\homi_ph_*.png
```

---

## If something is missing

Regenerate launch graphics:

```powershell
& "$env:LOCALAPPDATA\hermes\hermes-agent\venv\Scripts\python.exe" `
  "$env:USERPROFILE\Desktop\homi-social-kit\scripts\build_launch_content.py"
```

---

## Also ready in `09-launch/` (use anytime)

| Asset | Path |
|-------|------|
| 60s demo video | `09-launch\demo-video\HOMI-Demo-60s.mp4` |
| Press kit | `09-launch\press-kit\` |
| One-pager PDF | `09-launch\press-kit\pdf\HOMI-One-Pager-Partners-Investors.pdf` |
| FAQ PDF | `09-launch\press-kit\pdf\HOMI-FAQ.pdf` |
| Live product screens | `09-launch\press-kit\product-screens\homi_live_*.png` |
| PH gallery (live UI) | `09-launch\product-hunt\gallery-live\` |
| 4 launch emails | `09-launch\emails\` |

## Done when

- [ ] Avatar + key covers live  
- [ ] Company announcement posted  
- [ ] Founder post posted  
- [ ] Carousel posted  
- [ ] PH live **or** intentionally skipped  
- [ ] Link to product works  

**That’s Launch Day.**
