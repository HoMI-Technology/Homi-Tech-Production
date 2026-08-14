# 05 · Creative brief — PERSUADE, then stop

**Desk:** Content (briefs) · Library (files on disk)  
**Law:** [`DESIGN.md`](../../../DESIGN.md) PERSUADE mode · `lib/brand` · `npm run brand-check`  
**Rule:** Propagate the system we have. Do not invent a second language for launch.

Launch does not need a new kit. It needs the existing kit used on purpose.

---

## PERSUADE rules (marketing pixels)

From DESIGN.md — marketing, assessment entry, results “moment,” share pages:

- Hero is a **thesis** about decision readiness, not a feature grid.
- One primary CTA above the fold (assessment / free path).
- Boldness in **one** place (compass + score/verdict language).
- Motion only if the piece works without it; honor `prefers-reduced-motion`.
- Sample scores must match scoring canon (example: 76 → ALMOST THERE). Never show a score/verdict pair that violates thresholds.

**Operate surfaces** (admin, dashboard) stay cockpit-dense. Do not dress `/admin/marketing` in campaign chrome.

---

## Palette (only these)

| Token | Hex | Job |
|-------|-----|-----|
| Navy | `#0a1628` | Surface. Dark navy only — never a light campaign background. |
| Cyan | `#22d3ee` | Primary accent, links, focus |
| Emerald | `#34d399` | READY / constructive |
| Yellow | `#facc15` | Signal / attention (sparingly) |

Also legal on product (not for new campaign invention): amber `#fab633` (BUILD FIRST), crimson `#f24822` (DO NOT PROCEED).  
Type: Fraunces display · Inter body · JetBrains Mono for numerals.  
Materials: glass, hairline, compass rings. No beige SaaS, no purple gradients, no stock house-and-smiling-couple as brand identity.

---

## What to reuse (do not remake)

| Job | Use this |
|-----|----------|
| Avatar / profile | [`../brand/avatars/homi-threshold-compass-avatar-512.png`](../brand/avatars/homi-threshold-compass-avatar-512.png) (full pack 16–1024 + SVG in the same folder) |
| LinkedIn personal cover | [`../brand/covers/homi_cover_linkedin_personal_1584x396_v1.png`](../brand/covers/homi_cover_linkedin_personal_1584x396_v1.png) |
| LinkedIn company cover | [`../brand/covers/homi_cover_linkedin_page_4200x700_v1.png`](../brand/covers/homi_cover_linkedin_page_4200x700_v1.png) |
| X header (shelf only — not primary channel) | [`../brand/covers/homi_cover_x_header_1500x500_v1.png`](../brand/covers/homi_cover_x_header_1500x500_v1.png) |
| OG / link preview | [`../brand/og/homi_og_home_1200x630_v1.png`](../brand/og/homi_og_home_1200x630_v1.png) · assessment OG in the same folder |
| Wordmark | [`../brand/logos/homi-wordmark.svg`](../brand/logos/homi-wordmark.svg) |
| Quote / pillar / founder / tip posts | [`../content/posts/`](../content/posts/) |
| Carousels | `afford-vs-ready/` · `what-homi-is/` · `pillars/` · `launch-week/` |
| Stories 9:16 | [`../content/stories/`](../content/stories/) |
| Live product proof | [`../screenshots/live/`](../screenshots/live/) |
| Demo | [`../launch/demo-video/HOMI-Demo-60s.mp4`](../launch/demo-video/HOMI-Demo-60s.mp4) + [`DEMO-VO-BRIEF.md`](../launch/demo-video/DEMO-VO-BRIEF.md) |
| PH gallery (amplifiers only) | Prefer [`../launch/product-hunt/gallery-live/`](../launch/product-hunt/gallery-live/) |

If the file exists, the brief is **caption + UTM + crop**, not a redesign.

---

## What to make (only if missing)

Make a new file when — and only when — all of these are true:

1. The week in [`03-LAUNCH-90.md`](./03-LAUNCH-90.md) has no existing asset that can carry the line.  
2. Guardrails has approved the words ([`04-COPY-SYSTEM.md`](./04-COPY-SYSTEM.md)).  
3. The piece is one thesis, navy surface, one CTA, HōMI spelled correctly.  
4. You will commit it under `public/marketing/` the same day (Library desk).

**Allowed new work (rare):**

- A crop or 1080×1350 of an existing 1080 square (same words).  
- A live screenshot refresh if the UI shipped a visible change — replace files in `screenshots/live/`, do not start a parallel “v2 campaign” folder.  
- Voice-over for the 60s demo per `DEMO-VO-BRIEF.md` (claim-clean).

**Forbidden new work:**

- A second logo, a light-mode campaign, a house-photo brand, a mascot, a “wave” HTML kit, a price card that is not Free / $9.99 / $24.99 / $39.99.  
- Graphics that show a fake score/verdict pair.  
- Any asset whose headline is a left-column phrase from the rewrite table.

---

## Image brief template (when you must make)

```
Job:        (one thesis — e.g. “Afford ≠ ready”)
Surface:    navy #0a1628
Accent:     one of cyan / emerald / yellow
Type:       Fraunces for the line, Inter for the legal close
Line:       (paste from 04-COPY-SYSTEM — do not improvise)
Legal:      Educational guidance only. (if the piece names the product)
CTA:        none on the image, or “Know When You're Ready.”
Do not:     faces as identity, house porn, rate tables, badges that say first/only
Export:     1080×1080 + 1080×1350 if needed
Commit:     public/marketing/content/posts/homi_post_<slug>_1080.png
```

---

## Wordmark spelling

User-visible text on pixels is **HōMI** (U+014D). Filenames on disk may say `homi_` — that is a path, not a headline. Do not paint `HOMI`, `HoMI`, or `Homi` on an image.

---

## Done

A creative week is done when three posts shipped from **existing** files, or one new file exists in-repo with a Library path and a Guardrails pass. A folder of uncommitted Desktop exports is not done.
