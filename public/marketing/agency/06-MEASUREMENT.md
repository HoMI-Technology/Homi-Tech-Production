# 06 · Measurement — activation or it did not happen

**Desk:** Strategy owns the scoreboard · Performance owns the post log · Audience owns sources  
**Live board:** [`/admin/marketing`](/admin/marketing)  
**Paper twin:** [`../gtm/WEEKLY-SCOREBOARD.md`](../gtm/WEEKLY-SCOREBOARD.md) (Week 1 / Week 2 sheets in `gtm/weeks/`)

Vanity is fuel. **Activation is the score.**

---

## North star

**Weekly activated users** = people who **completed** a Decision Readiness path that week (assessment completed / primary readiness outcome delivered).

Not: impressions, followers, waitlist-only, PH upvotes, email opens alone, “accounts created.”

Admin widgets that already exist (do not rebuild):

- Activations (7d)  
- Activations — last 30 days  
- Source of last 10 activations (first-touch UTM / ref)  
- Funnel: Waitlist → Accounts → Completed assessment → Paid  
- Full channels: [`/admin/attribution`](/admin/attribution)

**Secondary (never primary):** engaged emails (clicked or replied, 30d), waitlist adds, founder-post count, ICP conversations.

**Revenue** (Plus $9.99 · Pro $24.99 · Family $39.99 / mo) is a lagging read. Do not steer Week 3 copy at conversion if activation is still the leak.

---

## Sunday scoreboard (15–20 min)

Ritual from [`../gtm/07-WEEKLY-OS.md`](../gtm/07-WEEKLY-OS.md). Do this **every** Sunday or do not schedule a burst / amplifier.

1. Open [`/admin/marketing`](/admin/marketing) — Strategy desk.  
2. Copy numbers onto [`../gtm/WEEKLY-SCOREBOARD.md`](../gtm/WEEKLY-SCOREBOARD.md) (or the week sheet).  
3. Write the source of the last 10 activations. If they are “direct / unknown,” Publish failed UTM.  
4. Performance: which of the three posts (if any) showed up in those sources?  
5. Pick **one** experiment for next week. Kill one thing that produced no activations.  
6. Pre-pick next week’s three posts from [`../content/`](../content/) + captions in [`04-COPY-SYSTEM.md`](./04-COPY-SYSTEM.md).  
7. Guardrails: claim-law violations this week = **0** or listed.

### What you write down

| Field | Where it comes from |
|-------|---------------------|
| Activations this week | `/admin/marketing` |
| Activation rate (activations ÷ new accounts) | same |
| Waitlist total / new 7d | same + `/admin/waitlist` |
| Accounts new 7d | `/admin/marketing` |
| Engaged emails 30d | Resend dashboard (opens **or** clicks, or a reply to hello@) |
| Founder posts shipped | Performance post log |
| ICP conversations | your notes (honest) |
| Claim-law misses | Guardrails |
| Hours spent | Founder (target 10–12) |

If the sample is capped, the Strategy desk will say so — do not treat a capped number as a full census.

---

## Burst week extras (weeks 3–4)

Add a one-line burst strip to the Sunday sheet:

| Burst piece | UTM campaign | Activations attributed |
|-------------|--------------|------------------------:|
| Email 01 teaser | `launch_teaser` | |
| Email 02 live | `launch_live` | |
| Founder announcement | `launch_announce` | |
| Afford carousel | `launch_afford` | |
| Other | | |

If the strip is empty, the burst was theater. Fix UTM and the path before you add channels.

---

## Kill criteria

From the GTM lock — Strategy applies these before adding work, not after.

| If… | Kill / do this |
|-----|----------------|
| 0 ICP conversations in 7 days | Do not add a channel. Fix comments and the offer. |
| Signups without activations | Strategy desk is already `needs_you`. Fix `/assessment` friction before more posts. |
| “Are you a lender?” spike | Pause promos. Audit last 5 posts. Rewrite. |
| Any claim-law miss | Delete or edit same day. Log it. |
| Two Sundays skipped | No burst. No PH. Restart the weekly OS. |
| Amplifier proposed with an unstable activation line | **No.** Engine continues. See gate below. |
| A metric you cannot source in `/admin/marketing`, Resend, or the post log | Do not put it on the scoreboard. Especially not TAM, regret %, or a “73%” fact. |

Hours: if a desk asks for work that pushes the week past ~12 hours, Strategy cuts the desk, not the north star.

---

## Amplifier gate (weeks 9–12)

Do **not** cancel this gate. Do **not** treat Product Hunt as the launch (the launch was weeks 3–4).

| Gate | Pass look |
|------|-----------|
| Path | Founder can complete `/assessment` end-to-end this week |
| Stability | Activations are showing up from people who are not only the inner circle — or you explicitly accept “still learning” and **stay on engine** |
| List | Engaged-email heuristic in [`../gtm/02-EMAIL-LIST.md`](../gtm/02-EMAIL-LIST.md) / [`../gtm/05-AMPLIFIERS.md`](../gtm/05-AMPLIFIERS.md) (~400 if you want to compete for PH attention). Planning band, not a promise. |
| Reply capacity | Founder is actually free the amplifier morning |

Fail → more engine. Pass → PH/press as **amplifiers**, then immediately back to the weekly OS.

---

## How the Agency OS shows health

The CEO board on `/admin/marketing` already colors desks. Believe it.

| Signal | Meaning |
|--------|---------|
| Email `blocked` | No Resend — you cannot burst |
| Strategy `needs_you` + “Signups without activations” | Path friction > content problem |
| Strategy `needs_you` + sample capped | Do not over-read the number |
| Content `idle` | No AI key — templates still ship; you type |
| Publish `idle` | Correct until Founder approves copy |

Do not invent a second dashboard. If a number is not on this page or `/admin/attribution`, it is not a north-star input.

---

## Done this Sunday

- [ ] Scoreboard filled from live admin, not memory  
- [ ] Last 10 activation sources written  
- [ ] One experiment named  
- [ ] Next week’s three posts pre-picked  
- [ ] Amplifier temptation checked against the gate  
- [ ] Hours still in the 10–12 band
