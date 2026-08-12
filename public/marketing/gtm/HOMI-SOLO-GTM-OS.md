# HōMI Solo Founder GTM Operating System (v1)

**Owner:** Founder (Chike “Wally” Wali)  
**Entity:** HOMI TECHNOLOGIES LLC  
**Product:** HōMI — Decision Companion / Decision Readiness Intelligence™  
**Site:** https://homitechnology.com  
**Doctrine:** Blow up through **trust + activation + owned audience**, not through approval theater or FOMO.  
**Status:** v1.1 — founder decisions locked 2026-08-12; see `EXECUTION-STATUS.md`.

**Source of truth:** `public/marketing/` in Homi-Tech-Production (this tree).  
**Live:** https://homitechnology.com/marketing/  
**Admin hub:** https://homitechnology.com/admin/marketing  

Ultra-premium 7 pillars (same folder):
1. `01-ACTIVATION.md` · 2. `02-EMAIL-LIST.md` · 3. `03-FOUNDER-CHANNEL.md` · 4. `04-AFFORD-NE-READY.md` · 5. `05-AMPLIFIERS.md` · 6. `06-CLAIM-LAW.md` · 7. `07-WEEKLY-OS.md`

---

## 0. How to use this document

1. Fill **Section 1 (decisions)** in 30 minutes — without this, the OS is abstract.  
2. Run **Section 6 (weekly cadence)** every week without negotiation.  
3. Check **Section 7 (scoreboard)** every Sunday (15 min).  
4. Use **Section 8 (kill criteria)** before adding channels.  
5. Never violate **Section 2 (claim law)** for growth.

---

## 1. Founder decisions (locked 2026-08-12)

> Locked so the OS is runnable. Override only with an explicit founder edit + date.

| Decision | Answer | Notes |
|----------|--------|-------|
| **Primary ICP (one sentence)** | People facing a major financial commitment (home-buying wedge first) who feel “maybe I can afford it — but I’m not sure I’ll be okay after.” | Decision readiness seekers, not rate shoppers |
| **Anti-ICP (who we refuse to optimize for)** | Rate shoppers; “get me approved / pre-qualified”; people who want HōMI as a lender, broker, or credit-score replacement | Claim-law hard reject |
| **Primary public channel (90 days)** | **LinkedIn founder profile** (Chike “Wally” Wali) | Matches content calendar fuel; company Page is reshare only |
| **Secondary channel only** | **Owned email list** (waitlist + accounts) | Always on; never “another social” as primary |
| **North-star metric (90 days)** | **Weekly activated users** (completed Decision Readiness assessment) | Vanity is fuel only |
| **Secondary metrics** | Engaged emails (clicked or replied, 30d); source of last 10 activations | Admin: `/admin/marketing` + `/admin/attribution` |
| **Hours/week for GTM** | **10–12 hrs** | ~5–7 hrs LinkedIn pillar + rest email / users / product friction |
| **PH goal this quarter?** | **No** | Gate: ~400 engaged emails + stable activation; revisit after engine weeks |
| **Press email** | **hello@homitechnology.com** (interim) | Same from-address as Resend transactional; add dedicated `press@` later if needed |
| **Pricing line for one-pager** | Free Decision Readiness path · **Plus $9.99** · **Pro $24.99** · **Family $39.99** / month | SHIPPED Stripe tiers (`lib/stripe/tiers.ts`) |

---

## 2. Claim law (HōMI bright lines)

### Never say (marketing, product UI, support, PH, ads)
- Approved / pre-approved / pre-qualified / you qualify  
- Guaranteed / risk-free / will buy a home by DATE  
- HōMI replaces your credit score  
- Our lenders / best deal / unlock your dream home / don’t wait — prices are rising  
- Bank-level / military-grade security  
- This is financial advice  

### Always prefer
- Educational guidance only  
- Decision readiness / readiness signal  
- Afford ≠ ready  
- Not yet is not no  
- Build First is the map  
- Not a lender / not a credit score replacement  

### Testimonial rule
- Prefer **process** stories (“helped me think clearly”) over **outcome flex** (“bought a house in 90 days”) unless you can disclose what a typical user experiences.  
- No fake reviews, no incentives conditioned on 5 stars.  
- Disclose paid partnerships clearly.

### Review ritual (before every campaign)
1. Read copy once for never-say.  
2. Would a reasonable person think we underwrite credit? If yes → rewrite.  
3. Any number → need a source file or remove.  
4. Founder final OK on pocketbook claims.

---

## 3. What “blow up the right way” means here

| Level | Metric | Right-way | Wrong-way |
|-------|--------|-----------|-----------|
| L1 Attention | Reach, PH rank | Accurate problem framing spreads | “HōMI gets you mortgages” misread |
| L2 Capture | Email / signup | Engaged list, clicks | Huge cold list, dead |
| L3 Activation | Completes readiness path | Users finish / return | Bounce after hype |
| L4 Retention | Return / build-first actions | Habit of clarity | One-and-done |
| L5 Revenue | Paid (when live) | WTP for clarity | Complaints / refunds |
| L6 Authority | Press, partners, citations | Language adopted cleanly | Compliance scare |

**Primary focus months 0–3: L2 → L3 → L4.**  
L1 is fuel. L5 follows product value. L6 follows consistency.

---

## 4. Engine vs amplifiers

```text
ENGINE (weekly)
├── Email (owned)
├── One founder public channel
├── One compounding content stream (SEO or deep tutorials)
└── User conversations (support = R&D)

AMPLIFIERS (milestones)
├── Product Hunt / directories
├── Press kit outreach
└── Paid only after conversion works

GUARDS
├── Claim law
├── Community ethics (90/10)
└── Product activation quality
```

---

## 5. Asset map (canonical — under `public/marketing/`)

| Growth job | Location |
|------------|----------|
| Avatars / covers | `brand/avatars/`, `brand/covers/` |
| Logos / OG | `brand/logos/`, `brand/og/` |
| Posts / carousels / stories | `content/posts/`, `content/carousels/`, `content/stories/` |
| Captions / calendars | `content/copy/` |
| Launch Day ops | `gtm/LAUNCH_DAY.md` |
| Emails 1–4 | `launch/emails/` |
| Press kit | `launch/press-kit/` |
| Live screenshots | `screenshots/live/` + `launch/product-screens/` |
| PH gallery (live UI) | `launch/product-hunt/gallery-live/` |
| Demo 60s | `launch/demo-video/HOMI-Demo-60s.mp4` |
| FAQ / one-pager PDF | `launch/press-kit/pdf/` |
| This OS + 7 pillars | `gtm/` |

Desktop `homi-social-kit` is a working mirror only — **commit here**.

**Do not build more graphics until weekly engine runs for 2 weeks.**

---

## 6. Weekly cadence (default 12 hours)

| Block | Hours | Actions | Assets to use |
|------:|------:|---------|---------------|
| Metrics | 1.5 | Which source → activation? Kill vanity | Analytics |
| Create | 5 | 1 anchor + derivatives | Carousels, founder cards, CAPTIONS |
| Distribute | 2.5 | Post + 10 ICP engagements + 5 community answers | Primary channel |
| Conversations | 2 | User calls / support themes → content backlog | Notes |
| Email | 1 | Nurture or reply to list | `emails/` |

### Minimum viable week (6 hours)
- 2h community answers (no spam links)  
- 2h founder post batch  
- 1–2h outreach / email  
- 1h product fix from feedback  

### Content themes (rotate)
1. Afford ≠ ready  
2. Three pillars  
3. Not yet / Build First  
4. What HōMI is / isn’t  
5. Founder story  
6. How to start (product path)

---

## 7. Scoreboard (Sunday 15 min)

| Metric | This week | Last week | Note |
|--------|-----------|-----------|------|
| New engaged emails | | | |
| Signups | | | |
| Activations (completed path) | | | |
| Activation rate | | | |
| Source of last 10 activations | | | |
| User conversations | | | |
| Anchor content shipped | | | |
| Claim violations | 0 / ! | | Must stay 0 |
| “Are you a lender?” support hits | | | High = messaging fix |

---

## 8. Kill criteria (protect solo energy)

| If this is true for 90 days… | Then do this |
|------------------------------|--------------|
| Primary channel: 0 ICP activations | Switch channel OR rewrite offer |
| List grows but activation &lt; X% (set X) | Fix product path before more traffic |
| PH spike, no retention | Product problem; no more spikes |
| Community bans / backlash | Stop promo; return to pure value |
| Any claim complaint | Pause campaigns; audit copy |

---

## 9. 90-day phases

### Days 0–30 — Foundation
- Fill Section 1 decisions  
- Email tool live; sequence loaded  
- Primary channel chosen; 3–5 posts/week  
- Real product demo VO (upgrade slideshow)  
- Press email filled; one-pager pricing line  
- Goal: 50–150 engaged emails; ≥5 user conversations  

### Days 30–60 — Engine
- 1 long-form/week (SEO readiness hub/spoke)  
- Daily engagement on primary channel  
- 2h/week community answers  
- Soft launch to list  
- Goal: first steady activations from known sources  

### Days 60–90 — Double-down + optional spike
- Kill dead channels  
- PH only if ≥~400 engaged + activation stable  
- Use `LAUNCH_DAY.md` with pre-scheduled posts  
- Goal: 3–20 deeply engaged or paying users *if* ICP hypothesis correct (planning range, not promise)  

---

## 10. Channel playbooks (short)

### Email
- Capture everywhere (site, PH, content)  
- Sequence: teaser → live → how to start → what we aren’t  
- Prefer click rate over open rate as engagement signal  

### Founder LinkedIn/X
- Problem-first posts; 1 CTA max  
- Comment on ICP posts without links first  
- Personal &gt; company page early  

### Communities
- 90% answer, 10% mention product (if allowed)  
- Never DM distressed users with pitches  
- Mine questions → blog/SEO  

### SEO
- Hub: decision readiness / home readiness  
- Spokes: afford vs ready, should I wait (framework), rent vs buy (assumptions labeled), checklists  
- Tools: “estimate based on your inputs — not a lender quote”  
- Expect 6–18 months to compound  

### Product Hunt
- Prerequisite: product works + ~400 engaged  
- Assets: gallery-live screens + demo  
- Optimize for email/signup, not rank pride  
- Founder replies all day  

### Paid
- Only after organic activation proven  
- Never approval-language creatives  

---

## 11. Risk register

| Risk | Severity | Mitigation |
|------|----------|------------|
| Mispositioned as lender | Critical | Claim law + FAQ + support scripts |
| Solo burnout on launch day | High | Pre-schedule; reply-only day |
| PH without audience | High | 400 engaged rule |
| SEO lag frustration | Medium | Parallel founder channel |
| Fake social proof temptation | Critical | Ban; legal risk |
| Affiliate gravity | Critical | Zero-affiliate doctrine |

---

## 12. Monthly review questions

1. Did activations grow, or only vanity metrics?  
2. What did the last 5 users say in their words?  
3. Which one channel earned keep?  
4. Any claim near-misses?  
5. What product friction blocked activation?  
6. What one experiment next month?

---

## 13. Change log

- v1.1 (2026-08-12) — Locked §1 founder decisions; linked execution status, support script, admin weekly activations.
- v1 (2026-08-12) — Initial Solo GTM OS from research + HōMI CANON + existing kit inventory.
