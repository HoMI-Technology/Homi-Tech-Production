# HōMI Extraction Digest: Product Spec + Production Build

**Sources (read in full):**
- `/mnt/agents/upload/HOMI_COMPLETE_PRODUCT_SPEC.md` (275 lines) — status "PRODUCTION READY", April 2026
- `/mnt/agents/upload/PRODUCTION_BUILD_COMPLETE.md` (387 lines) — status "READY TO SHIP", April 2026

---

## 1. PRODUCT SPEC — FULL EXTRACTION

### 1.1 Product Definition
- **HōMI**: "radically honest readiness assessment platform for life's biggest decisions."
- Core loop: user answers **12 questions** about finances, emotions, timing → gets a **verdict (0–100)** plus a **concrete 90-day plan** to close readiness gaps.
- Differentiators: (a) data-backed readiness scores, not opinions; (b) collaborative (couples/families co-assess with alignment scoring); (c) actionable (specific plan per verdict); (d) outcome-focused (post-purchase satisfaction measured; algorithm optimized for real results).

### 1.2 Revenue Model (spec)
- **Free** — 1 assessment
- **Premium** — $9.99/mo
- **Partner Tier** — $19.99/mo
- **Family Tier** — $34.99/mo
- **Enterprise** — API + white-label
- (Build notes add an **Advisor Add-on +$29/mo** not present in spec — see Conflicts.)

### 1.3 Complete Feature Inventory (16 components + 4 docs)

**Phase 1: Assessment → Verdict → Email (6 components)**
1. Marketing Site — hero, features, testimonials, conversion-optimized CTA
2. Onboarding Flow — 3-screen funnel (welcome → decision type → start)
3. Assessment Flow — 12-question adaptive assessment, real-time scoring
4. Verdict Screen — score reveal, dimension breakdown, actionable insights
5. Education Hub — Financial/Emotional/Timing readiness guides
6. Dashboard — assessment history, progress tracking, explore decisions

**Phase 2: Collaboration & Account Management (3 components)**
7. Comparison Flows — home/timeline/partner comparisons, downloadable PDFs
8. Partner Tier — 2-person co-assessment + alignment scoring + shared plans
9. Dashboard & Settings — billing, notifications, privacy, GDPR controls

**Phase 3: Expansion & Scale (5 components)**
10. Email Templates — 6 drip emails (welcome, verdict, follow-up, upgrade, partner invite, reactivation)
11. Mobile Mockups — iPhone SE + iPad layouts (all Phase 1/2/3 flows)
12. Multi-Decision Support — 6 decision types (Home, Car, Investment, Education, Kids, Business)
13. Family Tier — 5-person co-assessment + alignment scoring + collaborative planning
14. Settings & Profile — 7-section account management (profile, billing, tier, notifications, privacy, integrations, account)

**Phase 4: Enterprise & Intelligence (2 components)**
15. Enterprise White-Label API — REST API, white-label UI, revenue-sharing with mortgage lenders/banks
16. Outcome Tracking System — longitudinal satisfaction surveys (Day 30/90/365) to validate algorithm & reduce regret

**Documentation (4 files):** HOMI_SKILL.md (design system: colors, typography, motion, accessibility, voice); PHASE_2_SUMMARY.md (user flows, failure modes, implementation roadmap); PRODUCTION_BUILD_COMPLETE.md (exec summary, architecture, deployment checklist); PROJECT_INDEX.html (interactive component index w/ stats).

### 1.4 Page/Screen List (from build notes, per file)
- `01 Marketing Site.html` — hero + features + testimonials + CTA
- `02 Onboarding Flow.html` — Welcome → Decision Type → Get Started; <5s to first question
- `03 Assessment Flow.html` — 12Q adaptive, progress bar, dimension breakdown (Financial/Emotional/Timing), real-time scoring
- `04 Verdict.html` — score 0–100 + label **(Not Yet / Almost There / Ready)**, dimension bar charts, top recommendation, insights, Premium upgrade CTA
- `05 Education Hub.html` — Financial (savings/debt/income), Emotional (fear/commitment/clarity), Timing (market/life changes/opportunity windows)
- `06 Dashboard.html` — latest assessment, past-assessment grid, progress tracking ("improved 9 points in 3 weeks")
- `Phase 2 - Comparison Flows.html` — Mode A compare homes, Mode B compare timelines, Mode C partner co-assessment; PDFs + shareable links
- `Phase 2 - Partner Tier.html` — invite system + email automation, partnership status dashboard, verdict comparison + alignment score, shared 90-day plan w/ ownership, permissions matrix (privacy by default)
- `Phase 2 - Dashboard & Settings.html` — history + trends, profile/password, notifications, billing/invoices, GDPR download
- `Phase 3 - Email Templates.html` — 6 emails: Welcome (Day 0), Verdict (Day 0), Follow-Up (Day 7), Upgrade (Day 14), Partner Invite ("40%+ completion rate (tested)"), Reactivation (Day 30+)
- `Phase 3 - Mobile Mockups.html` — iPhone SE 375px + iPad 768px+
- `Phase 3 - Multi-Decision Support.html` — 6 decision types, customized questions per decision, decision-specific tools (ROI calculator, lease vs. buy), phased rollout Q2–Q4
- `Phase 3 - Family Tier.html` — up to 5 people, Family Alignment Score 0–100 by dimension, shared plan w/ collaborative editing, permissions matrix, $34.99/mo, "+71% LTV impact"
- `Phase 3 - Settings & Profile.html` — sidebar nav, 7 tabs: Profile, Billing, Subscription Tier, Notifications, Privacy & Data (GDPR), Integrations (Calendar, Slack, Google Drive, Zapier), Account (2FA, login activity, deactivation)

### 1.5 User Flows (explicit)
- Onboarding funnel: welcome → decision type → start (3 screens, <5s to first question)
- Assessment: 12 adaptive questions → real-time score → verdict screen → email capture/upgrade CTA
- Email drip: Day 0 welcome, Day 0 verdict, Day 7 follow-up, Day 14 upgrade, partner invite (event-driven), Day 30+ reactivation
- Partner: invite → partner assesses → alignment score → shared 90-day plan w/ task ownership
- Outcome loop (Phase 4, spec only): surveys at Day 30/90/365 post-purchase; feed back into algorithm validation

### 1.6 Scoring Model Definition — WHAT IS ACTUALLY SPECIFIED
- 12 questions across 3 dimensions: **Financial, Emotional, Timing**
- Score range **0–100**; verdict labels: **Not Yet / Almost There / Ready**
- "Adaptive" questioning; "real-time scoring" client-side
- Partner/Family **Alignment Score (0–100)**, by dimension for Family
- **NOT specified anywhere in either file:** band thresholds (no numeric cutoffs for Ready/Almost/Not Yet), pillar/dimension weights, question text, per-question scoring, AND-gate/minimum-per-dimension rules, or the alignment-score formula. The algorithm is called "proprietary… validated with 1K+ outcomes" (spec claim) but simultaneously flagged as needing "1,000+ outcomes to validate" (risk section) — internally contradictory claim.

### 1.7 Design System Spec (both files agree, attributed to HOMI_SKILL.md)
- **Colors (as written in BOTH files):** Cyan `#06b6d4`, Emerald `#10b981`, Navy `#0a0f1c`, Slate `#e5e7eb`; build notes add: Yellow `#fcd34d`, `--homi-amber: #f59e0b`, `--homi-crimson: #dc2626`
- **Dark theme (build notes only):** bg `#0a0f1c` navy, secondary `#111827` charcoal, cards `#1f2937`, optional radial wash for heroes
- **Typography:** Inter (body, system fallback), Fraunces (display — one per page, sparingly), JetBrains Mono (numerals/scores/metrics)
- **Motion:** easing `cubic-bezier(0.16, 1, 0.3, 1)`; durations 150/300/500ms; hover, tab switch, modal transitions
- **Responsiveness:** mobile-first, tested to 320px (spec says 320–1920px; roadmap says 375–1920px); breakpoints 768px / 1200px; 44px min touch targets
- **Accessibility:** WCAG 2.1 AA, contrast/labels/keyboard nav, color never sole info channel
- **Voice:** radically honest (no hype/false promises), warm, second-person "you/your", action-oriented, empathetic to fear/doubt

### 1.8 Tech Stack Decisions (build notes)
- **Client-side only MVP:** HTML5 (semantic), CSS3 (Grid/Flexbox/gradients), **React 18 via inline JSX + Babel** (no build step), Vanilla JS
- **Persistence:** localStorage only (single device)
- **No backend, no API calls, no dependencies** for MVP; emails are static pre-designed HTML
- **Hosting targets:** Netlify / Vercel / AWS S3 + CloudFront
- **Planned backend (Phase 3+):** Node.js/Python + PostgreSQL; Stripe billing; SendGrid/Mailgun email queue; Segment/Amplitude (also GA4) analytics; OAuth (Google, Facebook, Apple Sign-In)
- **Data models named but NOT defined:** "Assessment data schema (questions, answers, scores)", "User/Partnership/Family tables" — listed as "ready for backend integration," no fields/schemas given in either file

### 1.9 Items Labeled MUST / Canonical / Status Claims
- Spec header: "✅ PRODUCTION READY"; "16 production-grade components + 4 documentation files"; "~500KB"
- Build header: "✅ READY TO SHIP"; "21 production-grade HTML/React components"; "~350KB"; manifest says 14 component files + 2 docs = 440KB total; conclusion says "All 14 components"; design section says "All 12 components" (internal count chaos — see Conflicts)
- "Production-ready, no dependencies"; "no build step required"
- Success criteria marked with ✅ checkmarks in spec (targets, not achieved results)

---

## 2. PRODUCTION BUILD NOTES — WHAT WAS ACTUALLY BUILT

### 2.1 Built (per FILE MANIFEST, all marked ✅ Complete)
| File | Size |
|---|---|
| 01 Marketing Site.html | 24KB |
| 02 Onboarding Flow.html | 18KB |
| 03 Assessment Flow.html | 28KB |
| 04 Verdict.html | 22KB |
| 05 Education Hub.html | 35KB |
| 06 Dashboard.html | 20KB |
| Phase 2 - Comparison Flows.html | 44KB |
| Phase 2 - Partner Tier.html | 31KB |
| Phase 2 - Dashboard & Settings.html | 30KB |
| Phase 3 - Email Templates.html | 25KB |
| Phase 3 - Mobile Mockups.html | 36KB |
| Phase 3 - Multi-Decision Support.html | 26KB |
| Phase 3 - Family Tier.html | 40KB |
| Phase 3 - Settings & Profile.html | 32KB |
| HOMI_SKILL.md (doc) | 14.5KB |
| PHASE_2_SUMMARY.md (doc) | 15KB |

Total claimed: 440KB, "no dependencies, no build step." Phase 1–3 marked COMPLETE ✅. Phase 2 and Phase 3 each marked COMPLETE ✅ in section headers.

### 2.2 Architecture actually delivered
- Static HTML/React-in-Babel single-file components; localStorage persistence; no backend, no auth, no real email sending, no payments, no PDF service (PDFs are in-page "downloadable" claims), no real integrations.

### 2.3 NOT done / explicitly pending (all deployment checklist boxes unchecked)
- **QA:** cross-browser, mobile, load test (1K concurrent), security audit (XSS/CSRF/injection), GDPR review, accessibility audit (axe/WAVE), Lighthouse 90+ — all `[ ]`
- **Launch infra:** production deploy, GA4 + Segment, SendGrid welcome flow, Stripe, uptime/error monitoring — all `[ ]`
- **Beta:** 100 beta users, feedback, bug-fix SLA — `[ ]`
- **Month 1:** case studies, paid ads, Partner Tier waitlist — `[ ]`
- **Next steps (explicit future work):** build backend APIs (Node/Python + PostgreSQL), Stripe integration, SendGrid automation, multi-decision rollout (Q2–Q3), Family Tier launch (Q3 — despite file being "complete"), enterprise white-label (Q4), outcome tracking (ongoing)

### 2.4 Known issues / risks acknowledged
- Algorithm accuracy unvalidated (needs longitudinal data; surveys at 30/90 days)
- 40% of solo users resist partner invites
- Feature-creep risk on multi-decision (cap at 6)
- Regulatory: must disclaim "assessment, not advice"
- Subscription fatigue; copycat competition
- **No test results reported anywhere** — zero executed tests, no QA evidence; "tested" appears only as an unsupported claim (partner-invite email "40%+ completion rate (tested)")

### 2.5 Deployment details
- Nothing deployed. Targets: Netlify/Vercel/AWS S3+CloudFront. Staging→production parity planned in spec weeks 9–10. Beta plan inconsistent (see Conflicts).

---

## 3. GAP LIST — Spec requirements NOT done + builder-unknowns

### 3.1 Spec-required but absent from build manifest
1. **Component 15: Enterprise White-Label API** — not built; only a "Q4" next-step. No REST API, no white-label UI, no revenue-share mechanics.
2. **Component 16: Outcome Tracking System** — not built; Day 30/90/365 survey system does not exist; only planned.
3. **Docs gap:** spec promises 4 docs (incl. PROJECT_INDEX.html interactive index); build manifest delivers only 2 (HOMI_SKILL.md, PHASE_2_SUMMARY.md). PROJECT_INDEX.html missing from manifest.
4. **Backend of any kind** — spec's "zero backend MVP" claim means: no accounts/auth (yet Settings screens show password mgmt, 2FA, login activity — non-functional without backend), no cross-device sync (localStorage single-device only), no real emails, no payments, no actual GDPR data download, no working partner invite delivery.
5. **Stripe billing** — all pricing pages exist but no payment processing.
6. **Email delivery** — templates exist as static HTML; no ESP integration.
7. **Analytics** — none wired.
8. **All QA/security/accessibility/performance validation** — claimed "WCAG 2.1 AA" and "tested" but audits are unchecked.

### 3.2 Unspecified items a builder still needs (not defined in EITHER file)
1. **Verdict band thresholds** — no numeric cutoffs for Ready / Almost There / Not Yet.
2. **Dimension/pillar weights** — no Financial/Emotional/Timing weighting given.
3. **The 12 questions themselves** — text, options, per-answer point values, adaptivity rules: entirely absent.
4. **Alignment score formula** (Partner + Family) — named, never defined.
5. **90-day plan generation logic** — content templates, gap→action mapping: absent.
6. **Data schemas** — assessment/user/partnership/family tables named only; no fields.
7. **Auth model** — OAuth providers named as "ready for integration" only.
8. **API surface** for enterprise — no endpoints, no versioning.
9. **PDF generation mechanism** for comparison downloads.
10. **Multi-decision question variants** — "customized questions per decision" claimed, none specified.
11. **Advisor Add-on** — appears in build pricing, undefined feature scope.
12. **Outcome survey instruments** — questions, scoring, NPS methodology undefined.

---

## 4. CONFLICTS — vs. previously extracted canon

### 4.1 Verdict bands & gating (canon: READY ≥80; ALMOST 60–79; AND-gate ≥70 on all rings)
- **Neither file states ANY numeric band thresholds or gating rule.** Only labels "Not Yet / Almost There / Ready" + 0–100 score (build, `04 Verdict` section). So: **no direct contradiction, but canon thresholds/gate are unverified by these sources** — these files cannot corroborate ≥80/60–79 or the ≥70 AND-gate. Flag: canon bands must come from another source; do not cite these files for them.

### 4.2 Pillar weights (canon: 35/35/30)
- **Absent from both files.** Dimensions are named Financial/Emotional/Timing but never weighted. **No contradiction; no corroboration.** Canon 35/35/30 remains sourced elsewhere. Note tension: canon implies unequal weights while these docs treat the three dimensions as co-equal "dimension breakdowns."

### 4.3 Brand tokens — DIRECT CONFLICT on all four canon values
| Token | Canon | Spec (line 119) | Build notes (lines 157–177) |
|---|---|---|---|
| Cyan | `#22d3ee` | **`#06b6d4`** | **`#06b6d4`** (`--cyan`) |
| Emerald | `#34d399` | **`#10b981`** | **`#10b981`** (`--emerald`) |
| Yellow | `#facc15` | (not listed) | **`#fcd34d`** (`--yellow`) |
| Navy | `#0a1628` | **`#0a0f1c`** | **`#0a0f1c`** (`--navy`, dark bg) |

Both uploaded files agree with each other (Tailwind 500/600-scale values + lighter yellow 300) and **contradict canon on every token**. Extra tokens in build not in canon: amber `#f59e0b`, crimson `#dc2626`, slate `#e5e7eb`, charcoal `#111827`, card `#1f2937`. **Resolution needed: which palette is authoritative — canon (#22d3ee/#34d399/#facc15/#0a1628) or these two docs (#06b6d4/#10b981/#fcd34d/#0a0f1c, attributed to HOMI_SKILL.md)?**

### 4.4 Internal contradictions between the two files (and within build notes)
1. **Component count:** build header "21 components" vs manifest 14 component files vs conclusion "All 14 components" vs design section "All 12 components" vs Phase-1 header "4 production-grade HTML files" listing 6. Spec says 16 + 4 docs.
2. **Total code size:** spec ~500KB vs build header ~350KB vs build manifest total 440KB vs spec footer "440KB code."
3. **Pricing:** build adds Advisor Add-on +$29/mo absent from spec revenue model.
4. **Satisfaction claims:** spec "72% overall (85%+ Ready, 50% Not Yet)" vs build outcome metric "85%+ satisfaction (post-verdict survey)" — 85% overall vs 72% overall conflict.
5. **Day-7 retention target:** spec 60% (Phase 3) vs build 45%+.
6. **Year-1 ARR @ month 12:** spec $2.16M vs build $3.78M; LTV $480 (spec headline) vs $420 (build month 12).
7. **Beta cohort:** spec "100 beta users (50 couples, 50 solo)" vs build next steps "10 couples + 20 solo users" (build week-1 checklist keeps 100).
8. **Algorithm validation:** spec moat section claims "validated with 1K+ outcomes" while spec risk section says "Need 1,000+ outcomes to validate" — claim vs. admission.
9. **"Production ready / tested"** claims vs. fully unchecked QA/security/accessibility/deployment checklists — the docs assert compliance (WCAG 2.1 AA, responsive 320px) with zero executed-audit evidence.
10. **Phase 4 in spec (Enterprise API, Outcome Tracking) is listed under "COMPLETE DELIVERABLES"** but build notes treat both as future (Q4 / ongoing) and include neither in the manifest.
