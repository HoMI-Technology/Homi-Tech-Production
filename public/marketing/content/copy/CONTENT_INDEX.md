# Content index — what to post with what

## Brand setup (once)
| Need | Folder | File |
|------|--------|------|
| Profile photo | `02-avatars` | `…-512.png` |
| X banner | `03-covers` | `…x_header…` |
| LinkedIn banner | `03-covers` | personal or page file |
| Link share image | `04-link-previews` | `homi_og_home_…jpg` |

## Ongoing posts
| Idea | Folder | Example file |
|------|--------|----------------|
| Quote cards | `05-posts` | `homi_post_quote_*_1080.png` |
| Pillar education | `05-posts` | `homi_post_pillar_*` |
| Tips | `05-posts` | `homi_post_tip_*` |
| Carousel — pillars | `05-posts/carousel-pillars` | `01`–`05` |
| Carousel — afford vs ready | `05-posts/carousels/afford-vs-ready` | `01`–`05` |
| Carousel — what HōMI is | `05-posts/carousels/what-homi-is` | `01`–`05` |
| Carousel — launch week | `05-posts/carousels/launch-week` | `01`–`05` |
| Founder-voice | `05-posts` | `homi_post_founder_*` |
| Stories | `06-stories` | `homi_story_*` |
| Product Hunt gallery | `09-launch/product-hunt` | `homi_ph_*` |
| Captions | `07-copy` | `CAPTIONS.md` · `CAROUSELS.md` · `FOUNDER_VOICE.md` · `PRODUCT_HUNT_LAUNCH.md` |
| 2-week plan | `07-copy` | `CONTENT_CALENDAR_2_WEEKS.md` |
| Launch week plan | `07-copy` | `LAUNCH_WEEK_CALENDAR.md` |

## Rebuild more graphics
```powershell
$py = "$env:LOCALAPPDATA\hermes\hermes-agent\venv\Scripts\python.exe"
& $py "$env:USERPROFILE\Desktop\homi-social-kit\scripts\build_content_pack.py"
& $py "$env:USERPROFILE\Desktop\homi-social-kit\scripts\build_launch_content.py"
```
