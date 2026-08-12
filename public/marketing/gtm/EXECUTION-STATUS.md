# GTM execution status

**Updated:** 2026-08-12  
**SoT:** `public/marketing/` · Admin: `/admin/marketing`

Track the 7 workstreams. Checkboxes = founder/ops reality, not wishful code.

---

## 1. Founder decisions
- [x] ICP + anti-ICP locked (`HOMI-SOLO-GTM-OS.md` §1)
- [x] Primary channel = LinkedIn founder (90 days)
- [x] Hours = 10–12 / week
- [x] PH this quarter = **No**
- [x] Press email interim = hello@homitechnology.com
- [x] Pricing line = Free path · Plus $9.99 · Pro $24.99 · Family $39.99 / mo

## 2. Email engine
| Piece | Status | Where |
|-------|--------|-------|
| ESP | Resend (code-ready) | `lib/email/send.ts` · needs `RESEND_API_KEY` live |
| From address | `hello@homitechnology.com` | Domain auth must pass SPF/DKIM in Resend |
| Waitlist → confirm email | Shipped | `POST /api/waitlist` → template `waitlist` |
| Welcome on signup | Shipped | `maybeSendWelcomeEmail` |
| Verdict email post-assessment | Shipped | `sendVerdictEmailForAssessment` |
| Broadcast campaigns | Shipped admin UI | `/admin/email` |
| Launch sequence 01–04 as markdown | Assets ready | `/marketing/launch/emails/` |
| Launch sequence **loaded & scheduled** | **Ops TODO** | Paste into `/admin/email` per `launch/emails/README.md` |
| Engaged (clicked 30d) | **ESP TODO** | Resend open/click analytics; no in-app click store yet |
| Post-assessment capture | Shipped path | Results → sign-up / plan (prefer account over waitlist) |

## 3. Activation instrumentation
| Piece | Status | Where |
|-------|--------|-------|
| All-time completed assessments | Shipped | `/admin/marketing` funnel |
| Weekly new activations | **Shipped (this pass)** | `/admin/marketing` MetricRail + 30d series |
| Source of last 10 activations | **Shipped (this pass)** | `/admin/marketing` table |
| Full channel rollups | Shipped | `/admin/attribution` |
| Drop-off start → complete | Partial | Accounts vs completed; “started draft” not a first-class weekly KPI yet |
| Visit → signup (web analytics) | PostHog if configured | Product analytics, not admin SQL |

## 4. Activation path (product)
| Piece | Status |
|-------|--------|
| Assessment → results → plan / Build First CTAs | Shipped on `/results` |
| “Are you a lender?” support script | **Shipped** · `SUPPORT-ARE-YOU-A-LENDER.md` |
| Friction fixes from real users | Ongoing · use Sunday scoreboard + conversations |

## 5. Run the engine (ops — 2 weeks)
| Week action | W1 | W2 |
|-------------|----|----|
| 2–5 LinkedIn founder posts | [ ] | [ ] |
| ~10 ICP engagements/day (help first) | [ ] | [ ] |
| 1 email touch if list exists | [ ] | [ ] |
| Sunday `WEEKLY-SCOREBOARD.md` | [ ] | [ ] |
| Claim-law violations = 0 | [ ] | [ ] |

**Do not** build more graphics until both weeks are checked.

## 6. Demo upgrade
- [ ] Replace slideshow `HOMI-Demo-60s.mp4` with real product VO/screen capture  
- Keep claim law in voiceover (not a lender / educational only)

## 7. SEO compounder (Days 30–60)
| Piece | Status |
|-------|--------|
| Guides hub | Shipped · `/guides` |
| Afford / timing / emotional spokes | Partial · see `guides-data.ts` |
| Explicit “afford ≠ ready” + “what HōMI isn’t” hubs | Optional next content PR |
| CTA to assessment on every guide | Verify on page templates |

---

## This week’s founder checklist (minimum)

1. Upload LinkedIn avatar + personal cover from `/marketing/brand/`  
2. Post first founder piece from `content/posts/` + `CAPTIONS.md`  
3. Confirm Resend domain green; send one test waitlist email  
4. Load launch emails 01–04 as drafts in `/admin/email` (do not blast until list is warm)  
5. Open `/admin/marketing` Sunday and fill scoreboard from real numbers  
