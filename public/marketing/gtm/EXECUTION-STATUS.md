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
| Launch sequence **loaded & scheduled** | **Ops TODO** | Paste into `/admin/email` per `FOUNDER-30-MIN.md` |
| Engaged (clicked 30d) | **ESP TODO** | Resend open/click analytics; no in-app click store yet |
| Post-assessment capture | Shipped path | Results → plan / Path to Ready / sign-up |

## 3. Activation instrumentation
| Piece | Status | Where |
|-------|--------|-------|
| All-time completed assessments | Shipped | `/admin/marketing` funnel |
| Weekly new activations | Shipped | `/admin/marketing` MetricRail + 30d series |
| Source of last 10 activations | Shipped | `/admin/marketing` table |
| Full channel rollups | Shipped | `/admin/attribution` |
| Drop-off start → complete | Partial | Accounts vs completed; draft-start not weekly KPI yet |
| Visit → signup (web analytics) | PostHog if configured | Product analytics, not admin SQL |

## 4. Activation path (product) — **set up**
| Piece | Status |
|-------|--------|
| Assessment → results → plan / Path to Ready / save | Shipped on `/results` |
| **What next** activation path panel | **Shipped** on `/results` (ordered steps + claim line) |
| “Are you a lender?” support script | **Shipped** · `SUPPORT-ARE-YOU-A-LENDER.md` · linked in admin library |
| Friction fixes from real users | Ongoing · Sunday scoreboards |

## 5. Run the engine (ops — 2 weeks) — **set up**
| Artifact | Path |
|----------|------|
| Master runbook | [`ENGINE-2-WEEKS.md`](./ENGINE-2-WEEKS.md) |
| Founder 30-min setup | [`FOUNDER-30-MIN.md`](./FOUNDER-30-MIN.md) |
| Week 1 scoreboard | [`weeks/WEEK-1-SCOREBOARD.md`](./weeks/WEEK-1-SCOREBOARD.md) |
| Week 2 scoreboard | [`weeks/WEEK-2-SCOREBOARD.md`](./weeks/WEEK-2-SCOREBOARD.md) |

| Week action | W1 | W2 |
|-------------|----|----|
| 2–5 LinkedIn founder posts | [ ] | [ ] |
| ~10 ICP engagements/day (help first) | [ ] | [ ] |
| 1 email touch if list exists | [ ] | [ ] |
| Sunday scoreboard filled | [ ] | [ ] |
| Claim-law violations = 0 | [ ] | [ ] |

**Do not** build more graphics until both week scoreboards are checked.

## 6. Demo upgrade — **brief ready**
- [x] Shot list + VO claim-law brief · `launch/demo-video/DEMO-VO-BRIEF.md`
- [ ] Record + replace `HOMI-Demo-60s.mp4` (after engine weeks preferred)

## 7. SEO compounder — **hubs shipped**
| Piece | Status |
|-------|--------|
| Guides hub | Shipped · `/guides` |
| **Afford ≠ ready** | **Shipped** · `/guides/afford-is-not-ready` |
| **What HōMI isn’t** | **Shipped** · `/guides/what-homi-is-not` |
| CTA → assessment + UTM | **Shipped** on guide pages |
| Other spokes | Existing guides in `guides-data.ts` |

---

## Start here (founder)

1. **`FOUNDER-30-MIN.md`** — LinkedIn, first post, Resend, admin check (once)  
2. **`ENGINE-2-WEEKS.md`** — daily/weekly rhythm  
3. Sundays → `weeks/WEEK-*-SCOREBOARD.md` + `/admin/marketing`  
