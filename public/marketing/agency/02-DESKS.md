# 02 · Desks — staff the org that already exists

The Marketing Agency OS has **ten desks**. They are coded in `lib/admin/agency-fleet.ts` and rendered by `AgencyDesks` on [`/admin/marketing`](/admin/marketing). Hash-link to a desk: `#desk-strategy`, `#desk-content`, …

**Do not invent a parallel org.** If a job does not fit a desk below, it is either Strategy (decide) or it does not ship this week.

**Time box:** ~10–12 hours/week **across** these desks. Launch burst (weeks 3–4) may run 12. Amplifiers do not get extra hours until the engine is green.

| Hours (typical week) | Desks |
|---------------------:|-------|
| 1.5 | Strategy + Performance (Sunday scoreboard) |
| 4 | Content + Calendar |
| 2.5 | Publish + founder replies (distribution) |
| 1–1.5 | Email |
| 1 | Audience + Competitive (notes, not research theater) |
| 0.5 | Guardrails (pre-publish) |
| 0.5 | Library (commit assets if any) |

---

## 1. Strategy — Chief of staff

**Board mandate:** North star, weekly scorecard, GTM lock, kill criteria.  
**Panel:** [`/admin/marketing#desk-strategy`](/admin/marketing#desk-strategy)

| | |
|--|--|
| **Weekly job** | Open the Sunday scorecard. Read activations (7d), source of last 10, waitlist vs accounts. Pick **one** experiment. Confirm we are still on LinkedIn founder + owned email. Write the week’s mission in one sentence that a Content intern could execute. |
| **Launch-week job** | Lock the burst window (72 hours): email 02 send time, founder announcement time, company reshare time, UTM campaign slug. Kill any extra channel that showed up in a draft. Confirm PH is **off** the burst unless Measurement says the amplifier gate already passed (it will not, in weeks 3–4). |
| **Done when** | Scoreboard filled from live `/admin/marketing` numbers (not memory). One experiment named. Hours still ≤ 12. Kill criteria checked ([`06-MEASUREMENT.md`](./06-MEASUREMENT.md)). |

Fuel: [`../gtm/07-WEEKLY-OS.md`](../gtm/07-WEEKLY-OS.md) · [`../gtm/WEEKLY-SCOREBOARD.md`](../gtm/WEEKLY-SCOREBOARD.md)

---

## 2. Content — Creative lead

**Board mandate:** Founder posts, captions, image briefs, claim-clean copy.  
**Panel:** [`#desk-content`](/admin/marketing#desk-content)

| | |
|--|--|
| **Weekly job** | Pull **three** slots (Mon / Wed / Fri) from existing files — do not design new carousels. Default fuel: [`../content/copy/CAPTIONS.md`](../content/copy/CAPTIONS.md) + [`../content/copy/FOUNDER_VOICE.md`](../content/copy/FOUNDER_VOICE.md). Rewrite any byline that names a person to **Founder**. Run every line through [`04-COPY-SYSTEM.md`](./04-COPY-SYSTEM.md). Draft in the Social Content Studio; leave AI drafts in the approval queue. |
| **Launch-week job** | Assemble the burst kit from assets that already exist: announcement image, founder-why, afford ≠ ready carousel, what-HōMI-is carousel, launch-week slides. Write three claim-clean captions + one reply bank (lender misread). No new “launch brand system.” |
| **Done when** | Three posts have image path + caption + UTM campaign slug + Guardrails check. Nothing in the queue uses a banned headline or CTA. |

Reuse first: [`../content/posts/`](../content/posts/) · [`../content/carousels/`](../content/carousels/)

---

## 3. Calendar — Publisher

**Board mandate:** 30-day themes, Mon/Wed/Fri cadence, slot ownership.  
**Panel:** [`#desk-calendar`](/admin/marketing#desk-calendar)

| | |
|--|--|
| **Weekly job** | Load the Theme Calendar. Own Mon / Wed / Fri on the **LinkedIn founder** profile. Company Page is reshare-only. Optional fourth slot only if the first three shipped and replies are current. |
| **Launch-week job** | Replace the normal theme week with the burst grid in [`03-LAUNCH-90.md`](./03-LAUNCH-90.md) weeks 3–4. Put exact clock times next to each slot (Founder’s timezone). Hold Saturday for replies, not a sixth post. |
| **Done when** | Every slot has an owner (Founder), an asset path, and a campaign slug. No Instagram/TikTok/YouTube primary slots. |

Fuel: [`../gtm/ENGINE-2-WEEKS.md`](../gtm/ENGINE-2-WEEKS.md) · [`../content/copy/CONTENT_CALENDAR_2_WEEKS.md`](../content/copy/CONTENT_CALENDAR_2_WEEKS.md)

---

## 4. Audience — Insights

**Board mandate:** Verdict mix, channels, waitlist demand → content backlog.  
**Panel:** [`#desk-audience`](/admin/marketing#desk-audience)

| | |
|--|--|
| **Weekly job** | Read Audience Insights: verdict mix (READY / ALMOST THERE / BUILD FIRST / DO NOT PROCEED), inbound channel, waitlist notes. Turn **one** pattern into a Content backlog card (example: many BUILD FIRST → ship the Build First quote, not a hype announcement). |
| **Launch-week job** | Tag every burst link with UTM so Audience can read the burst, not “direct / unknown.” After the burst, list the top two questions people actually asked. Those become Week 5 posts. |
| **Done when** | One insight → one backlog item. No invented personas. Anti-ICP inbound (“can you get me a rate?”) is logged as a claim-law smell, not a feature request. |

---

## 5. Email — Lifecycle

**Board mandate:** Owned list, launch drip, campaigns, Resend health.  
**Panel:** [`#desk-email`](/admin/marketing#desk-email) · composer: [`/admin/email`](/admin/email)

| | |
|--|--|
| **Weekly job** | If Resend is blocked, that is the only job (desk status will say so). Otherwise: grow the list via the waitlist + personal founder notes; do **not** blast a cold file. Check unsubscribes. One value touch **or** 5 personal notes — not both plus a promo. |
| **Launch-week job** | Load the four existing drafts — do not rewrite the sequence: [`../launch/emails/01-teaser.md`](../launch/emails/01-teaser.md) → `02-live.md` → `03-how-to-start.md` → `04-what-homi-isnt.md`. Subjects from those files only (or a [`04-COPY-SYSTEM.md`](./04-COPY-SYSTEM.md) subject). Send 01 before the burst, 02 on burst morning, 03 and 04 on the published lag. |
| **Done when** | Four campaigns exist as drafts or sent in `/admin/email`. List-Unsubscribe intact. Zero never-say in subjects. Automated welcome / verdict / waitlist templates were **not** rebuilt. |

How to load: [`../launch/emails/README.md`](../launch/emails/README.md)

---

## 6. Performance — Analytics

**Board mandate:** Post log, LinkedIn CSV import, what to double down on.  
**Panel:** [`#desk-performance`](/admin/marketing#desk-performance)

| | |
|--|--|
| **Weekly job** | Log the three posts (URL, slug, date). Import LinkedIn CSV if you have it. Mark which post produced **activations**, not just impressions. Tell Strategy what to repeat. |
| **Launch-week job** | Daily log for the burst (email clicks + LinkedIn + site). UTM campaign = the burst slug. Do not optimize the burst mid-flight for vanity. |
| **Done when** | Post log is current. Sunday can answer: which piece created activations? If none, that is a finding — write it down. |

---

## 7. Competitive — Intel

**Board mandate:** Hand-logged competitor hooks → gaps HōMI can own.  
**Panel:** [`#desk-competitive`](/admin/marketing#desk-competitive)

| | |
|--|--|
| **Weekly job** | Hand-log **three** hooks you actually saw (approval theater, afford-only calculator, fear-of-missing-the-rate). No scraping. For each: the HōMI gap we own (readiness / four verdicts / zero affiliate). |
| **Launch-week job** | Freeze new intel. Do not spend burst hours on a swipe file. If a competitor launches the same week, do not reply in-kind — ship our one-liner. |
| **Done when** | Three hooks logged **or** an explicit “no new hooks this week.” Zero copy that names us as “the only platform.” |

---

## 8. Publish — Distribution

**Board mandate:** Webhook / Zapier handoff when copy is CEO-approved.  
**Panel:** [`#desk-publish`](/admin/marketing#desk-publish)

| | |
|--|--|
| **Weekly job** | Nothing ships without Founder approval. If a webhook is configured, use it only after the approval queue is green. Otherwise: paste to LinkedIn founder by hand. Company Page reshare after the personal post, not before. |
| **Launch-week job** | Run the burst order: site path live → email 02 → founder LinkedIn → company reshare. Every public URL carries UTM (`utm_source`, `utm_medium`, `utm_campaign`). Build links with the UTM tool on `/admin/marketing`. |
| **Done when** | Approved copy is live on the intended surface. Webhook was not used to bypass the queue. Replies started within two hours of the founder post. |

Canonical assessment link shape:

```
https://homitechnology.com/assessment?utm_source=linkedin&utm_medium=social&utm_campaign=YYYYMMDD_slug
```

---

## 9. Guardrails — Compliance

**Board mandate:** Claim law, never-say, “are you a lender?” scripts.  
**Panel:** [`#desk-guardrails`](/admin/marketing#desk-guardrails)

| | |
|--|--|
| **Weekly job** | Pre-publish ritual on every post and email (see below). Spot-check the last five public lines. If “are you a lender?” spiked, pause promos and audit. |
| **Launch-week job** | Read the entire burst kit in one sitting: subjects, captions, OG, pinned comment, first reply. Keep [`../gtm/SUPPORT-ARE-YOU-A-LENDER.md`](../gtm/SUPPORT-ARE-YOU-A-LENDER.md) in the clipboard. |
| **Done when** | Zero never-say in shipped copy. Ritual signed (Founder initials on the scoreboard). Any miss is edited or deleted the same day. |

### Pre-publish ritual (every piece)

1. Read once for never-say ([`../gtm/06-CLAIM-LAW.md`](../gtm/06-CLAIM-LAW.md) + rewrite table in [`04-COPY-SYSTEM.md`](./04-COPY-SYSTEM.md)).
2. Would a reasonable person think we underwrite credit? → rewrite.
3. Any number → in-repo source or delete.
4. Testimonials: process over miracle. No fake or paid-for-stars social proof.
5. Founder OK on pocketbook claims.

---

## 10. Library — Brand ops

**Board mandate:** Assets, GTM docs, press, demos — `public/marketing` is source of truth.  
**Panel:** [`#desk-library`](/admin/marketing#desk-library)

| | |
|--|--|
| **Weekly job** | If something new was made, commit it under `public/marketing/` (not a Desktop dump). Confirm Library links on this page still open. Do not upload a second avatar set. |
| **Launch-week job** | Verify the burst kit paths resolve on the live site (`/marketing/content/...`, `/marketing/launch/emails/...`, `/marketing/brand/...`). Press PDFs stay on the shelf until amplifiers (weeks 9–12). |
| **Done when** | Every slot in the week points at a real path in this repo. Desktop kits were not treated as source of truth. |

---

## CEO rule

You approve. Agents draft. A desk that is `blocked` (Email without Resend) or `needs_you` (signups without activations) outranks a new carousel. Work the red desk first.
