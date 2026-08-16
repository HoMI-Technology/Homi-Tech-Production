# G — HōMI Skill Definition Files: Technical Extraction Digest

**Sources (all read in full):**
1. `HōMI_Claude_Design_Skill.rtf` (7.3KB, RTF parsed through markup) — Claude Design scaffold, "warm-editorial" light theme
2. `SKILL.md` (1.8KB, YAML-frontmatter skill manifest `name: homi-design`) — dark-theme production design skill entrypoint
3. `HOMI_SKILL.md` (14.7KB, v1.0, "Last updated April 2026") — Design & Build Skill, dark theme
4. `HOMI_FINANCE_SKILL.md` (29KB) — "Complete Technical Reference," 23 calculators + 6 tax strategies
5. `HOMI_FINANCE_SKILL_EXPERT.md` (76KB) — "Expert Technical Specification," deepest scoring/validation/API/DB spec

---

## 1. SKILL INVENTORY & RELATIONSHIPS

| File | Type | Purpose | Trigger/Invocation | Key content |
|---|---|---|---|---|
| `SKILL.md` | Design skill manifest | Entrypoint for `homi-design` skill; points to README.md, `assets/`, `colors_and_type.css`, `ui_kits/` | `user-invocable: true`; invoked when generating branded interfaces/assets (prototypes or prod Next.js/React/Tailwind v4) | 5 non-negotiables (wordmark, verdict colors, voice, dark canvas, Threshold Compass) |
| `HOMI_SKILL.md` | Design & Build Skill (full) | Complete brand/design/product reference; mirrors `colors_and_type.css`; asset root `/projects/48ea50f7-ca60-499f-ac97-4eefe5c3a78e/` | Same design workflow; also defines the 9-question assessment + verdict scoring | Full token system, voice rules, iconography, assessment framework, product phases, business numbers |
| `HōMI_Claude_Design_Skill.rtf` | Claude Design prompt (paste-in scaffold for claude.ai/design) | Scaffolds HōMI in Claude Design from "warm-editorial family" of `awesome-claude-design`; hero feature = **Weekly Mirror** (Sunday 8pm, one sentence from Emotional Pattern Graph + spend signal) | Pasted into a Claude Design project | Complete alternative design system (cream/terracotta, serif-first, light theme) |
| `HOMI_FINANCE_SKILL.md` | Finance skill reference | "Decision Readiness Intelligence™ engine" — all calculators/algorithms "from the audited codebase" | Embedded as `HōMIFinanceEngine` JS class | 50/30/20 scoring, 23 calculators, 6 tax strategies, Monte Carlo, tax tables, data schema |
| `HOMI_FINANCE_SKILL_EXPERT.md` | Finance skill expert spec | "Production-ready, research-backed" specification with justifications, edge cases, validation, API contract, DB schema | Backend + frontend implementation contract | Same 50/30/20 core with full derivation, input validation, outcome tracking, deployment checklist |

**Relationship/supersession:**
- The two **finance** files are the same system at two depths: EXPERT is the superset (adds component derivations, edge cases, validation, API/DB, outcome tracking). Where they conflict, **EXPERT appears canonical** (it explains and corrects; see Roth cap 50K vs 105K below).
- The two **dark design** files (`SKILL.md`, `HOMI_SKILL.md`) are one system: `SKILL.md` is the manifest, `HOMI_SKILL.md` the README it points to. Production canonical token file = `app/tokens.css`.
- The **RTF** is a *competing, incompatible* design system (see §3 conflicts). It self-declares different score weights (35/35/30 "locked v2026.04-r1+") and a different hero feature (Weekly Mirror). It is a Claude Design scaffold, not the production skill.

---

## 2. DESIGN SKILL (RTF) — FULL EXTRACTION

Title: "HōMI — DESIGN.md for Claude Design". Tuned from warm-editorial family in `awesome-claude-design`, "locked to HōMI's brand typography."

### 2.0 Product context
- Hero feature: **Weekly Mirror** — Sunday 8pm local, "one brutal-but-caring sentence per user about their week," built from Emotional Pattern Graph + spend signal. Tone: honest, intimate, never performative. "UI must feel like a quiet voice across the kitchen table, not a SaaS dashboard."
- Decision anchor: *does this help the user receive the Mirror?*

### 2.1 Atmosphere
Warm editorial; human, considered, slightly literary; not tech-startup sterile / luxury cold / productivity-app chipper. Generous whitespace, slow rhythm, long-form reading first-class, "numbers feel weighed, not flashed." Mood: calm, earnest, tactile, deliberate, patient, true.

### 2.2 Color tokens (verbatim)
```
--bg-primary:      #f4f3ee   /* cream — page */
--bg-secondary:    #eeede6   /* surface lift */
--bg-inverse:      #191817   /* near-black, inverse sections */
--text-primary:    #191817   /* ink */
--text-secondary:  #5a554e   /* warm gray */
--text-muted:      #8a847a
--accent:          #c96442   /* terracotta — HōMI primary */
--accent-hover:    #b55738
--accent-soft:     #e89268   /* illustrations, soft callouts */
--border:          #d8d3c8
--success:         #6b7a3d   /* moss — financial reality OK */
--warning:         #c98a42   /* honey — drift signal */
--danger:          #a53e2a   /* clay-red — Mirror reckoning only */
```
**Color rules:** One accent per viewport. Never tint body text with accent. `--danger` reserved for Mirror's hardest sentences; form errors use `--warning`.

### 2.3 Typography ("LOCKED — do not substitute")
Google Fonts link: `Inter:wght@400;500;600;700` + `Fraunces:opsz,wght@9..144,600;9..144,700;9..144,900` + `JetBrains+Mono:wght@400;700`.
```css
--font-sans:  'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-serif: 'Fraunces', Georgia, serif;
--font-mono:  'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
body                       { font-family: var(--font-sans); }
h1, h2, .display, .mirror  { font-family: var(--font-serif); }
.score, .num, code, pre    { font-family: var(--font-mono); }
```
- Display/Mirror/headlines: Fraunces 600–900, opsz 9..144, letter-spacing −1.5% at large sizes, `text-wrap: balance`.
- Body: Inter 400, line-height 1.6, measure 65–72ch, `text-wrap: pretty`.
- UI/labels: Inter 500, letter-spacing +2%, uppercase only for eyebrow labels.
- HōMI-Score numerals: JetBrains Mono 700. "Never Inter tabular. Never substituted."
- **Type scale (modular 1.25):** 13 / 15 / 17 / 21 / 26 / 32 / 40 / 50 / 62 / 78
- **Banned substitutes (artifacts and prod):** Geist, Satoshi, SF Pro, Helvetica, Arial, Roboto, Open Sans, Times, Courier New, Monaco, system defaults.

### 2.4 Component specs
- **Buttons:** Primary = terracotta fill, cream text, radius 6px, padding 10/18, Inter 500; hover `--accent-hover`; no lift, no shadow. Secondary = 1px `--border`, ink text, transparent fill; hover `--bg-secondary`. Ghost = ink text, underline on hover.
- **Cards:** bg `--bg-secondary`, no border, no shadow, radius 8px, padding 24. Hover: subtle `--border` appears; no transform/scale.
- **Inputs:** 1px `--border`, radius 6px, padding 10/14. Focus: 2px `--accent` outline + 2px offset. No glow shadows.
- **Navigation:** horizontal, underline-on-hover; active = accent underline; no pill backgrounds.
- **Tables:** zebra rows on `--bg-secondary`; headers JetBrains Mono, uppercase, tracked wide.
- **HōMI-Score chip:** bg `--bg-inverse`, cream foreground; score JetBrains Mono 700; three-component breakdown (**Financial 35 / Emotional 35 / Timing 30**) as thin horizontal bar in `--accent` / `--accent-soft` / `--success`.
- **Mirror sentence:** Fraunces 700 at 40–62px; single line if possible; `--text-primary` on `--bg-primary`; margin 96px above/below; no card, no border, no quotation marks.

### 2.5 Layout
- Max content width: 680px long-form; 1180px app shells.
- 12-column grid, 24px gutters.
- Vertical rhythm: 8px baseline; heading top-margin 2× line-height; section break = 96px.
- Asymmetry encouraged on editorial pages (pull-quotes float, margin sidenotes).
- Mirror page: single-column, centered, sentence anchored at **vertical 38%** ("golden-ratio sympathy, not center").

### 2.6 Depth & elevation
Flat by default, no drop shadows. Depth from surface color shifts, 1px `--border` lines, type-weight contrast. Sole exception — modals: `0 8px 24px rgba(25, 24, 23, 0.08)`.

### 2.7 Motion
- Duration 200–300ms; easing `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo).
- Animate `transform` and `opacity` only; never width/height/top/left.
- Mirror reveal: 800ms fade-up from `translateY(12px)`, once per session.
- `prefers-reduced-motion`: drop all non-essential motion to 0ms.

### 2.8 Voice in UI copy
Second person, present tense, contractions OK. Short sentences. **Never exclamation marks; never "Oops!"; never "Awesome!"** Empty states honest: "Nothing here yet." not "Let's get started!" Errors name the cause: "We couldn't reach Plaid." not "Something went wrong."

### 2.9 Do / Don't
**Do:** let the page breathe; trust serif headlines for emotional work; reserve terracotta for what matters now; set numbers in JetBrains Mono.
**Don't:** gradients, glows, or glassmorphism; emoji in product UI; hover animation for its own sake; Mirror sentence inside a card ("It is not a notification").

### 2.10 Reference block
- Repo: `~/Desktop/awesome-claude-design` (warm-editorial family)
- Brand fonts source of truth: `~/Desktop/HōMI_Canonical/` (**locked v2026.04-r1+**)
- Score weighting: **Financial Reality 35 / Emotional Truth 35 / Perfect Timing 30 (locked)**

---

## 3. DARK DESIGN SYSTEM (`SKILL.md` + `HOMI_SKILL.md`) — FULL EXTRACTION

### 3.1 `SKILL.md` manifest (frontmatter + rules)
- `name: homi-design`; `user-invocable: true`; description: branded interfaces/assets for production or prototypes.
- Workflow: read README.md; for visual artifacts copy from `assets/`, build static HTML, always `@import colors_and_type.css`; for production (Next.js/React/Tailwind v4) canonical token file is `app/tokens.css` ("this skill mirrors it"). If invoked bare, ask what to build and act as expert designer outputting HTML artifacts or production code.
- **5 non-negotiables:**
  1. Wordmark always **HōMI** with macron-o (U+014D); letter colors H-cyan / ō-emerald / M-yellow / I-cyan; weight 900.
  2. Never substitute verdict colors `--homi-amber #fab633` and `--homi-crimson #f24822` with Tailwind reds/oranges.
  3. Voice: radically honest, warm, second-person; no corporate jargon; no "synergy / leverage / optimize".
  4. Dark canvas only — `--navy #0a1628` canonical background. **No light mode.**
  5. Threshold Compass (three rings + keyhole) is the brand visual; reuse `assets/threshold-compass-static.svg` or animated variant, never redraw.

### 3.2 Product frame (`HOMI_SKILL.md`)
- "First AI that tells you whether you're ready for a major life decision." Three dimensions scored (Financial/Emotional/Timing) → four-state verdict. Core belief: every party profits from YES; HōMI has zero conflicts.
- Hero decision: home buying. Roadmap: cars, investments, education, business, life decisions.
- Business model: D2C SaaS + enterprise white-label + referral revenue. Taglines: "Your homie, not your banker." / "Clarity, not commission."

### 3.3 Three dimensions (Threshold Compass)
| Dimension | Color | Inputs | Weight |
|---|---|---|---|
| Financial Readiness | Cyan #22d3ee (outer ring) | income, savings, debt, DTI, credit, emergency reserves | **40%** |
| Emotional Readiness | Emerald #34d399 (middle ring) | intrinsic motivation, external pressure, confidence, hesitation clarity, relationship stability | **30%** |
| Timing Readiness | Yellow #facc15 (inner ring) | market conditions, rates, job stability, life events, urgency, seasonality | **30%** |

### 3.4 Verdict states (dark system)
| Verdict | Score | Emoji | Color |
|---|---|---|---|
| 🔑 Ready | 85–100 | 🔑 | Emerald #34d399 |
| 🔓 Almost There | 70–84 | 🔓 | Yellow #facc15 |
| 🔒 Build First | 55–69 | 🔒 | Amber #fab633 |
| 🚫 Not Yet | 0–54 | 🚫 | Crimson #f24822 |

Amber/crimson trademark-pending, NOT Tailwind defaults; exact hex required. Roadmap: if verdict <85, generate a 90-day plan (biggest lever, per-dimension needle-movers, actionable steps, milestones).

### 3.5 Voice & tone
Do: "you/your"; mix short punchy with longer sentences; contractions; lead with human problem; temperature metaphor (cool = ready, hot = stop). Don't: sound like a bank; jargon unexplained; promise specific financial outcomes; "synergy/leverage/optimize"; **never write "HoMI" — macron mandatory**. Canonical voice lines include: "You're not ready yet. And that's the most valuable thing anyone will tell you this year." / "Your Financial Reality score is 72. Here's exactly what that means and what moves the needle."

### 3.6 Visual system tokens
**Tier 1 logo colors (full-saturation):** `--cyan #22d3ee`, `--emerald #34d399`, `--yellow #facc15`.
**Tier 2 verdict colors:** emerald #34d399 / yellow #facc15 / `--homi-amber #fab633` / `--homi-crimson #f24822`.
**Tier 3 surfaces/text:** `--navy #0a1628` (bg), `--navy-light #0f172a` (elevation), `--slate #1e293b` (cards), `--slate-light #334155` (borders), `--text-primary #e2e8f0` (14:1 on navy), `--text-secondary #94a3b8`.

**Typography:** Inter (95% of text, weights 300–900); Fraunces (display only, 5% max, one per viewport, 400–700); JetBrains Mono (score numerals, `font-variant-numeric: tabular-nums`).
Type scale (px): 11 / 13 / 15 / 17 / 20 / 24 / 30 / 36 / 48 / 60 / 88.
Letter-spacing: ≥60px → −2 to −3px; 36–60px → −1 to −2px; <36px → 0; uppercase eyebrows +1–2px.
Weights: 900 logo-only; body 400; headlines 600–700; CTA 600.

**Backgrounds (canonical, verbatim CSS):**
```css
background:
  radial-gradient(ellipse 80% 60% at 15% 20%, rgba(34,211,238,0.05), transparent 60%),
  radial-gradient(ellipse 80% 60% at 85% 80%, rgba(52,211,153,0.04), transparent 60%),
  var(--navy);
```
Optional 1px cyan grid at opacity 0.03 on heroes. Never plain black/white/AI-startup gradients. Photography rare; cool, calm, daylight, lightly desaturated; never warm sunsets/grain.

**Animation:** easing `cubic-bezier(0.16, 1, 0.3, 1)`; durations fast 150ms / base 300ms / slow 500ms. Signature motions: Threshold Compass rings — outer 20s CW, middle 15s CCW, inner 10s CW, harmonic alignment every 60s; Score Orb spring counter (stiffness 40, damping 20), 2s sweep on first reveal; hover = opacity 0.9 + glow (primary buttons) or border shift + faint tint (cards), **never scale**; press = opacity 0.85, no scale-down. Respects `prefers-reduced-motion`.

**Borders/corners:** default `1px solid var(--slate)` or `rgba(34,211,238,0.1)`; verdict cards 2–3px verdict-color border; radius scale 8/12/16/20/24/9999; buttons pill 9999px; cards 16–24px.

**Shadows/glows (verbatim):**
```css
--shadow-cyan: 0 0 30px rgba(34,211,238,0.35);
--shadow-emerald: 0 0 30px rgba(52,211,153,0.35);
--shadow-yellow: 0 0 30px rgba(250,204,21,0.35);
```
On active CTAs, Score Orb, compass keyhole. No inner shadows; drop-shadow alpha < 0.4.

**Glassmorphism (sparing, full cards only):**
```css
background: rgba(30,41,59,0.6);
backdrop-filter: blur(16px);
border: 1px solid rgba(<color>,0.15);
```

**Cards:** default = slate bg, 1px rgba(255,255,255,0.05) border, radius 24px, padding 32–48px. Verdict = 3px verdict-color border, bg rgba(verdict,0.05), centered. Dimension = 64px score ring left, label + score + weighted contribution right, bg rgba(dim,0.06) + border rgba(dim,0.12).

**Layout:** marketing max-width 1152px (`max-w-6xl`); app max-width 1280px; section padding `py-16 md:py-24 lg:py-32`; sticky nav 64px, `backdrop-filter: blur(16px)`, bg rgba(2,6,23,0.85). Responsive 320px → 1920px.

**States table:** button hover = opacity 0.9 + `var(--shadow-cyan)`; card hover = brighter border + slight bg lift; link hover = cyan→emerald; active = opacity 0.85; focus-visible = `outline: 2px solid var(--cyan); outline-offset: 2px`; disabled = opacity 0.5, no pointer events.

### 3.7 Iconography
Lucide React, stroke 2 (occasionally 2.2), sizes 16/18/20/24/32. CDN fallback: `https://unpkg.com/lucide-static@latest/icons/<name>.svg`. Scoring icons: Shield (financial), Heart (emotional), Clock (timing). Verdict emoji 🔑🔓🔒🚫 are "part of the system." Logo assets: `threshold-compass-static.svg`, `threshold-compass-animated.svg`, `logo-H1.webp`, `homi-avatar-2000.png`. No decorative emoji; no unicode geometric bullets (use Lucide ChevronRight/ArrowRight).

### 3.8 Content rules
No filler; ask before adding sections/copy; no "data slop"; avoid AI-slop tropes (aggressive gradients, emoji outside verdict glyphs, left-border accent containers, SVG-drawn imagery — use placeholders and ask; avoid Roboto / Fraunces everywhere / system fonts as primary).

### 3.9 Assessment framework (design-skill scoring — note divergence)
9 questions, 3 per dimension, each 0–100; dimension = average of its 3:
- Financial (40%): monthly gross household income; DTI; job/income stability (1–5)
- Emotional (30%): want (1–5); external pressure (1–5); hesitation clarity (1–5)
- Timing (30%): market conditions (1–5 or external data); life stability (1–5); timeline urgency (1–5)

**Verdict score = (Financial × 0.40) + (Emotional × 0.30) + (Timing × 0.30)** → mapped to 85/70/55 thresholds.

### 3.10 Product phases & business numbers
- Phase 1 (complete): marketing site, 9-question assessment (localStorage resume), verdict (score orb, 90-day plan, shareable), 6-email campaign (verification → deeper dive → education → upgrade → reassessment → cart recovery).
- Phase 2: comparison flows (buy now vs wait 12mo), partner tier (co-assessments, alignment score), dashboard, settings.
- Phase 3: multi-decision, API/white-label, native mobile, AI chat.
- Market: TAM $2.3T, SAM $340B, SOM(Y5) $12B. Traction: 847 waitlist, 24.6M impressions, 4.7% engagement, 47% email open rate. Pricing: Free / Premium $9.99/mo / Enterprise $49K+/yr. LTV(Y1 Premium) $120, target CAC $8, LTV:CAC 15x. Founder: Cody Short.
- Brand mantra: "The compass that becomes a key when you're finally ready to turn it."

---

## 4. FINANCE SKILLS — CORE SCORING (both files)

### 4.1 Three-ring synthesis (BOTH finance files agree)
```
Overall Score = (Financial × 0.50) + (Emotional × 0.30) + (Timing × 0.20)
```
**Verdict thresholds (finance files):** 80+ ✓ READY · 70–79 ⏳ ALMOST (6-month runway) · 60–69 🔧 BUILD (return in 12 months) · <60 ⛔ NOT YET.
Weight justification (EXPERT): Financial foundational (Lusardi & Mitchell 2014); Emotional drives follow-through — high-Financial/low-Emotional users show **3.2× higher regret** (Kahneman & Tversky 1979); Timing amplifies (Ariely & Wertenbroch 2002). Weights "derived from 10,000+ user outcomes."

### 4.2 Financial Reality (50%)
Base-file JS (verbatim logic): +15 if income>0; +20 if cashFlow>0; savings rate ≥15→+15, ≥10→+10; liquid > expenses×0.5→+20, > ×0.25→+10; totalAssets > expenses×6→+20, > ×3→+10; DTI <20→+10, <36→+5; clamp 0–100.

**EXPERT canonical component model (0–100):**
1. **Cash flow (max 20):** income > expenses → 15; positive cash flow this year → +5. Side-gig income counts only with 2+ years stable history.
2. **Savings rate (max 15):** ≥15%→15 · 10–14%→10 · 5–9%→5 · <5%→0. Formula `((Income − Expenses)/Income)×100`. High-income edge case: use discretionary savings.
3. **Emergency buffer (max 20):** liquid ≥ 6 months → 20 · ≥ 3 → 15 · ≥ 1 → 10 · < 1 → 0. Liquid = cash/checking/savings, money market, taxable brokerage; excludes retirement accounts, home equity, stocks <30 days old; asset correlated >0.7 with income counts at 50%.
4. **Total asset position (max 20):** ≥6× annual expenses → 20 · ≥3× → 15 · ≥1× → 10 · <1× → 0. Includes liquid + 401k/IRA + Roth + home equity; excludes cars, collectibles, future earnings; illiquid art counted at 30%.
5. **DTI (max 15):** <20%→15 · 20–36%→10 · 36–43%→5 · >43%→0. Debt = mortgage, car, student (min payment), CC minimums, child support; excludes utilities/insurance/taxes. **Lender maxima: conventional 43%, FHA 50%, VA 60%.**
`score = min(100, max(0, Σ components))`

**Validation rules (EXPERT, verbatim behavior):** income <0 error; income >$10M warning; expenses >5× income critical; debts <0 error; liquid > total assets error; monthly debts >2× monthly income → flag underreported income; age <18 error; retirementAge ≤ currentAge error; desire outside 1–10 error. Returns `{isValid, errors, warnings, criticals}`.

**Financial interpretation bands:** 85–100 excellent · 70–84 solid · 60–69 adequate-but-tight · 50–59 vulnerable · <50 crisis.

**DTI analysis bands (base file):** healthy <20 · acceptable 20–36 · caution 36–43 · not yet >43. DTI Ratio calculator: housing ratio <28%, total <36%, caution 36–43%.

**Emergency fund tiers (base):** optimal 6+ mo · acceptable 3–6 · minimum 1–3 · risk <1. Emergency Fund Planner: minimum 3×, recommended 6×, optimal 9× monthly expenses.

### 4.3 Emotional Truth (30%)
Base JS: `desireComponent = (desire/10)*50`; `pressureComponent = max(0,(10−pressure)/10)*30`; `stabilityComponent = (stability/10)*20`; round, clamp 100.
EXPERT equivalent (normalized 0–100 then weighted 0.50/0.30/0.20): `EMOTIONAL = desirePts×0.5 + pressurePts×0.3 + stabilityPts×0.2`. Worked example: Desire 8, Pressure 3, Stability 7 → 80, 70, 70 → **75**.
**Internal inconsistency (EXPERT):** nonlinear lookup tables are given (Desire 9→85, 10→100; Stability 2→11 … 10→100, i.e. (s−1)/9×100) but the formal formula right below is linear (/10×100). The linear formula is the implemented one.
Scales: Desire 1–10 (9–10 authentic intrinsic; 1–2 primarily external); Pressure 0–10 (0–2 self-directed; 9–10 coerced); Stability 1–10 (five sub-dimensions: employment, relationship, health, housing, family changes). Research claims: motivation mismatch → 63% regret; external pressure → 42% reversal within 18 months; instability amplifies poor decisions 3.7×. User distributions: pressure 0–2 = 25%, 3–4 = 45%, 5–6 = 22%, 7–10 = 8%; stability 8–10 = 35%, 6–7 = 40%, 4–5 = 20%, 1–3 = 5%.

**Behavioral Genome — 9 formulas (identical in both files, verbatim):**
```
Loss Aversion:        50 + (stress×3) + (pressure×2)
Time Perception:      (10−stress)×8 + (stability×2)
Confidence:           (desire×6) + ((10−pressure)×4)
Volatility Tolerance: 100 − (stress×5) − (pressure×3)
Regret Asymmetry:     40 + (pressure×4) + (stress×2)
Social Proof:         (pressure×8) + ((10−desire)×2)
Narrative Bias:       50 + (desire×3) − (stability×2)
Agency:               (desire×5) + (stability×3) + ((10−pressure)×2)
Outcome Bias:         30 + ((10−stress)×4) + savingsRate
```
Diagnostic only, not verdict-determining.

### 4.4 Perfect Timing (20%)
Both files identical: `stressPoints = ((10−stress)/10)×30`; `stabilityPoints = (stability/10)×30`; `baseScore = 40`; `TIMING = base + stress + stability`, clamp 100. Worked example: Stress 4, Stability 7 → 40+18+21 = **79**. Base 40 exists to avoid NOT-YET for people in temporary stress. Stress bands: 0–2 minimal, 3–4 low, 5–6 moderate, 7–8 high, 9–10 crisis (pause). Claimed outcomes: stable triad (job+marriage+health) → 84% success; unstable triad → 23%.

### 4.5 "The First No" (5-question mini assessment, base file)
Questions: decision type; cost band (<$10K/$10–50K/$50–200K/>$200K); emergency fund status; desire vs pressure; life stability. Scoring: emergency fund 30 pts, genuine desire 25, life stability 25, baseline 20 = 100. **Verdict at 70+: READY; <70 NOT YET ("73% receive this").**

### 4.6 Verdict empirics (EXPERT §3.2, §7.3)
- 73% of users receive NOT YET (intentional).
- Satisfaction at 1 year: NOT YET + waited = 84%; NOT YET + proceeded = 31%; READY = 91%.
- Verdict accuracy table: READY {proceeded 0.94, satisfied 0.91}; ALMOST {0.68, 0.72}; BUILD {0.42, 0.68}; NOT YET {0.23, 0.84}.
- Measured weight impacts: financial 0.47 (target 0.50), emotional 0.34 (target 0.30), timing 0.19 (target 0.20) — "weights are pretty accurate."
- Dimension importance for satisfaction: emotional 0.58 > financial 0.41 > timing 0.25.
- Counterfactuals (ignored verdict): ignoreREADY regret 0.31; ignoreALMOST 0.51; ignoreNOT_YET 0.42.

---

## 5. FINANCE SKILLS — CALCULATOR LIBRARY (23 total)

### 5.1 Home buying suite (8)
**Affordability (both files; EXPERT adds rules):**
```
monthlyRate = (interestRate/100)/12;  numPayments = loanTerm×12
paymentFactor = r(1+r)^n / ((1+r)^n − 1)
maxPayment = (monthlyIncome × 0.43) − monthlyDebts
maxLoan = maxPayment / paymentFactor
maxHome = maxLoan / (1 − downPaymentPercent/100)   [EXPERT; base adds downPaymentAvailable instead]
```
Defaults: rate 6.5% (range 2–12%), term 30yr (15/20/30), down 3–50%. Verdict: DTI <30% READY · 30–43% CAUTION · >43% NOT YET.
**Lender rules (EXPERT):** front-end 28% max; back-end 43% (FHA 50%, VA 60%); credit <620 reduced qualification; min down 3% conventional / 3.5% FHA / 0% VA; **PMI triggers <20% down; PMI = loan × 0.005 annual** (EXPERT elsewhere: "typically 0.4–0.9%", removable at 78% LTV). Edge cases: recent job change → reduce income 30%; self-employed → 2-year average × 0.75 haircut.

**Rent vs. Buy (10-yr):** home appreciation default 3% (`homePrice × 1.03^yr`), rent increase 2.5%, investment return 7%, cap-gains 15%, maintenance 1% of value/yr. Base file: `equityAfter = homeValue×1.03^10 − loan×0.70`; rent scenario `downPayment × 1.07^10`. Break-even year N where buyEquity(N) = rentInvestmentValue(N); >10yrs "BUY doesn't win", <0 "RENT cheaper long-term". Heuristics: <3yr stay → rent wins; 20+yr → buy wins; high state tax → buy more valuable; TX/FL/WA → rent relatively cheaper.

**Mortgage (advanced):** standard amortization; first payment ≈75% interest, last ≈99% principal; property tax "most states $1–2 per $100 assessed" (Harris County TX ≈$0.68/$100; CA Prop 13 = 1% of purchase); insurance national avg $1,200–1,500/yr; PMI as above.

**DTI analysis:** housing <28%, total <36%, caution 36–43%.
**Down Payment Planner (verbatim):** `monthlyAddition = (annualIncome × savingsRate/100)/12; monthsNeeded = ceil(target/monthlyAddition)`; recommend "Proceed within 2 years" if <24 months else "Build more runway".
**Refinance:** break-even, rate-reduction scenarios, closing-cost recovery. **HELOC:** max 80% LTV, prime+spread, IO vs amortized. **Rental:** cap rate, cash-on-cash, 1031 exchange.

### 5.2 Auto & transport (3)
Auto loan: standard payment formula; TCO example $20K car @7%/60mo → **$50,700 true cost** ($23,700 payments + $3,700 interest + $8,400 insurance @$140/mo + $10,800 gas @$180/mo + $6,000 maintenance @$100/mo + $1,200 registration) = $0.28/mile over 180K miles. Lease vs buy: overage $0.15–0.25/mile; >18K mi/yr → buy; <8K → lease. Cash vs finance decision tree: APR ≤3% → finance & invest (4% arbitrage at 7% assumed); liquid <6 months EF → don't use cash; APR >5% & credit >750 → negotiate; no EF → cash only.

### 5.3 Investment suite (6)
Compound: `FV = P(1+r/100)^years`. Retirement: `fiTarget = annualExpenses × 25` (4% SWR); iterate `balance = balance×(1+returnRate) + annualSavings`. 401(k): `baseLimit = 23500` (comment says "2024" — actually the 2025 limit; flag), `catchUpAge = 50`, `catchUpAmount = 7500`. Roth IRA: phase-out, conversion, 5-year rule. ROI: `CAGR = (final/initial)^(1/years) − 1`. FIRE: `fiNumber = expenses×25`; loop to 50yr cap. **Note bug:** base FIRE code sets `annualSavings = currentAssets + (annualExpenses/(1−savingsRate))` — dimensionally wrong (adds stock to flow).

### 5.4 Life & budget (6)
Net worth: assets = taxable+taxDeferred+roth+homeEquity+other; liabilities = mortgage+car+CC+student. Emergency fund: 3×/6×/9× monthly expenses. Debt payoff: iterate interest, cap 600 months (50 yrs). Inflation: `purchasingPower = amount/(1+inflationRate)^years`. Marriage tax: singleTax(inc1)+singleTax(inc2) − mfjTax(combined).

---

## 6. TAX STRATEGIES (6) & TAX TABLES

### 6.1 Roth Conversion Optimizer
Base file: `optimalConversion = min(bracketRoom, taxDeferred×0.10, 50000)` — **EXPERT changes cap to 105000** ("tax code practical limit"); EXPERT is canonical. Mechanics: `bracketRoom = nextBracketThreshold − AGI`; state adjustment `effectiveStateRoom = bracketRoom/(1+stateTaxRate)` (e.g. CA 9.3%: $41,950/1.093 = $38,400); `conversionTax = conversion × (federalBracket + stateTaxRate)`; break-even years = `conversionTax / (conversion × (0.35 − currentBracket))` (e.g. $40K at 24%+9.3% → $13,320 tax, 3-yr break-even vs assumed 35% future). Pro-rata rule: `proRataTax = (NonRothBalance/TotalIRA)×conversionAmount`; workaround = roll Trad IRA into 401k. Backdoor Roth $6,500; mega backdoor $40,500 after-tax. 5-year ladder example: $40K/42K/44K/46K/48K = $220K converted, ~$70K tax, ~$100–150K saved. Pay tax with external funds. File Form 8606.

### 6.2 Social Security claiming
Multipliers: 62 → PIA×0.70; 67 → ×1.00; 70 → ×1.24. PIA $2,500 example: $1,750/$2,500/$3,100; lifetime to 85: $483,000 / $540,000 / $558,000. Break-evens: 62v67 → 78 (EXPERT also says 67 beats 62 at 80); 67v70 → 82; 62v70 → 80–81. Strategy: live <78 → 62; 78–85 → 67; 85+ → 70. Earnings limit $23,400 (2024): −$1 per $2 earned before FRA. GPO: spousal reduced by 2/3 of government pension. Up to 85% of SS taxable; provisional income = AGI + ½SS + tax-exempt interest. Decision tree (verbatim logic): longevity <78 → 62; wealth >$2M → 70; <$100K → 67; spouse 5+ yrs younger → 70; similar-age married → higher earner 70 / lower 67; divorced (10yr married, 2yr divorced, ex 62+) → ex's record at 62, own at 70; GPO → 70; default → 67.

### 6.3 IRMAA (MFJ brackets, verbatim)
```
max $206,000 → Part B $174.70, Part D $7.70
max $258,000 → $244.60 / $19.70
max $322,000 → $349.20 / $33.30
max $386,000 → $453.80 / $53.80
max $750,000 → $558.40 / $74.20
∞            → $593.70 / $81.00
annualIRMAA = (partB + partD) × 12
```
(Single brackets noted but not listed.)

### 6.4 Widow's penalty
`annualPenalty = singleTax(income) − mfjTax(income)`; mitigations: Roth conversions before widowhood, delay SS (survivor benefit), draw Roth first after status change.

### 6.5 Tax-loss harvesting
Net loss → `currentYearDeduction = min(3000, netLoss)`; carryForward remainder; wash sale = 30 days before AND after (wait 31+ days).

### 6.6 QCD
Eligible at age ≥70.5. RMD divisors (verbatim): 72:27.4, 73:26.5, 74:25.5, 75:24.6, 76:23.7, 77:22.9, 78:22.0, 79:21.1, 80:20.2. `rmd = iraBalance/divisors[age]`; `optimalQCD = min(charityGoal, rmd, 105000)`; QCD satisfies RMD without raising taxable income.

### 6.7 Federal brackets 2024 (verbatim)
Single: 10% to 11,600 · 12% to 47,150 · 22% to 100,525 · 24% to 191,950 · 32% to 243,725 · 35% to 609,350 · 37% above.
MFJ: 10% to 23,200 · 12% to 94,300 · 22% to 201,050 · 24% to 383,900 · 32% to 487,450 · 35% to 731,200 · 37% above.

### 6.8 State top rates 2024 (verbatim, all 50 + DC-absent)
AL .05, AK 0, AZ .025, AR .044, CA .133, CO .044, CT .0699, DE .066, FL 0, GA .0549, HI .11, ID .058, IL .0495, IN .0305, IA .057, KS .057, KY .045, LA .0425, ME .0715, MD .0575, MA .05, MI .0425, MN .0985, MS .05, MO .0495, MT .0675, NE .0664, NV 0, NH 0, NJ .1075, NM .059, NY .109, NC .0475, ND .025, OH .035, OK .0475, OR .099, PA .0307, RI .0599, SC .064, SD 0, TN 0, TX 0, UT .0465, VT .0875, VA .0575, WA 0, WV .065, WI .0765, WY 0.

---

## 7. INTELLIGENCE LAYER (base file; EXPERT adds failure modes)

### 7.1 Monte Carlo (10,000 sims, verbatim parameters)
Box-Muller normal; **mean return 7%, volatility 15%**; annual loop `balance = balance×(1 + 0.07 + randomNormal()×0.15) + annualSavings`, floor at 0; success = final ≥ fiTarget; outputs p10/p50/p90 paths + successRate. Interpretation: ≥90% very confident · 80–90 confident · 70–80 reasonable · 60–70 risky · <60 high risk.
EXPERT failure modes: normal-dist underestimates fat tails (use student-t; +3–5% failures); crisis correlation→1 (drops success 10–15%); behavioral (non-)rebalancing; sequence-of-returns (±20% swing by entry year); inflation volatility 1–8%; reactive spending (−20% in down years raises success 5–10%).

### 7.2 Quantum Readiness Field (verbatim)
`overall = F×0.5 + E×0.3 + T×0.2`; `proceedNow = clamp(15,95, overall + (rand−0.5)×10)`; `wait6Mo = clamp(20,95, overall+5+(rand−0.5)×8)`; `wait12Mo = clamp(25,95, overall+10+(rand−0.5)×6)`. **Build concern: uses Math.random() — non-deterministic verdicts.**

### 7.3 Trinity Engine
Analyst (financial logic), Guardian (emotional), Advocate (opportunity/timing). CONVERGENCE → proceed; DIVERGENCE → fix gaps first.

### 7.4 Temporal Twin (verbatim messages)
If ready — 5y: "You made the right call. The decision becomes a foundation stone." 10y: "The courage you showed opened doors I couldn't have imagined." 20y: "The compound effects created genuine freedom. The preparation was worth it."
If not — 5y: "Thank you for pausing. The foundation you're building becomes the launchpad." 10y: "The patience you showed meant the transition happened smoothly when ready." 20y: "You gave me the gift of a strong start. The delay was an investment."

### 7.5 Advisor conflict scores (verbatim)
Commission-Based 85 high · Insurance Agent 82 high · Bank Proprietary 78 high · Robo-Advisor 35 medium · Fee-Only Fiduciary 15 low · **HōMI 0 none** ("Profits when YOU make good decisions").

### 7.6 Action plan rules
financial <70 → high-priority "Increase Emergency Fund" (target 6 months); emotional <70 → high "Clarify Your Why"; timing <70 → medium "Stabilize First". Sorted by priority.

---

## 8. DATA SCHEMAS & API (EXPERT §8, base §13)

- **localStorage:** key `homi_ultimate_v1`; schema: currentAge, retirementAge, filingStatus ('single'|'mfj'|'mfs'|'hoh'), userState, annualIncome, annualExpenses, monthlyDebts, monthlyRent, savingsRate(0–100), taxable, taxDeferred, rothBalance, homeEquity, ssMonthly, emotionalDesire(1–10), externalPressure(0–10), stressLevel(0–10), lifeStability(1–10), decisions[] {description, reasoning, timestamp ISO-8601, verdict 'ready'|'notyet'|'build'|'stop'}.
- **API:** `POST /api/v1/financial/assess` — request {income, expenses, monthlyDebts, liquidAssets, totalAssets, currentAge, retirementAge, desire, externalPressure, lifeStability, stressLevel, state, decisionType, decisionAmount}; response {scores{financial, emotional, timing, overall}, verdict{badge, headline, narrative, gaps[], actionPlan[]}, calculators{home_affordability{maxPrice, maxLoan, monthlyPayment, dti}}, comparison{your_score, user_percentile, same_age_percentile}}. Errors 400/401/429/500.
- **SQL:** `decision_baselines` (id UUID, user_id encrypted, decision_type, decision_amount, 4 scores, verdict, user_age, user_income encrypted, context JSONB, user_narrative encrypted); `decision_followups` (baseline_id FK, decided_to_proceed, satisfaction_1_10, regret_score_1_10, financial_impact, emotional_impact, unexpected_costs encrypted, followup_narrative encrypted); `outcome_analytics` (verdict, decision_type, total_users, proceeded_percent, average_satisfaction, regret_percent).
- **1-year follow-up survey:** verbatim 5-part instrument (decision status 6 options; satisfaction 1–10 + financial/emotional impact; non-proceed reasons; what-would-have-helped; free-text on assessment accuracy).
- **Deployment:** rate limit 100 assessments/user/day; TLS 1.3+; encryption at rest; audit logging; 3-year deletion on request; WCAG 2.1 AA; offline mode; 100K concurrent users expected year 2.

---

## 9. BUILD IMPLICATIONS — CANONICAL vs SUPERSEDED, CONFLICTS, GAPS

### 9.1 Scoring-weight conflict (THREE different systems)
- Design/marketing skill (`HOMI_SKILL.md`): **40/30/20→no, 40/30/30** with verdicts at 85/70/55.
- Both finance skills: **50/30/20** with verdicts at 80/70/60.
- RTF design skill: **35/35/30 "locked v2026.04-r1+"**.
→ **Unresolved three-way conflict.** The finance EXPERT file justifies 50/30/20 with outcome data (measured 0.47/0.34/0.19), making it the best-evidenced candidate; but the RTF claims its 35/35/30 split is the newer "locked" canonical (v2026.04-r1+), and the shipped-product skill (HOMI_SKILL.md, April 2026, "Phase 1 COMPLETE — Live now") uses 40/30/30 + 85/70/55. **Decision needed before build; no file reconciles them.**

### 9.2 Conflicts with previously extracted constants
| Constant (prior extraction) | These skill files | Verdict |
|---|---|---|
| DTI ≤28/36/43 | Finance skills match: 28 front-end, 36 acceptable ceiling, 43 back-end max (FHA 50, VA 60); scoring tiers <20/20–36/36–43/>43 | **Consistent** |
| Savings rate ≥20/10/0 | Finance skills use **≥15→full, 10–14→partial, 5–9→low, <5→0** | **CONFLICT** — skills never use a 20% tier |
| Runway ≥6/3/1 | Identical tiers (6/3/1 months → 20/15/10/0 pts) | **Consistent** |
| Credit→rate: 800+=5.625%, 740–779=6.00% | **Absent** from all skill files. Only: default rate 6.5%, credit <620 reduced qualification, >750 "negotiate rate down" | **MISSING here** — rate tables live elsewhere |
| PMI 0.75–1.0% | EXPERT: PMI = loan×**0.005** (0.5%) annually; "typically 0.4–0.9%" | **CONFLICT** — lower than prior 0.75–1.0% |
| FHA MIP 1.75% upfront + 0.85% annual | **Absent** — only FHA 3.5% down / 50% DTI max mentioned | **MISSING here** |

### 9.3 Design-system conflict (fatal if unresolved)
- `SKILL.md` non-negotiable #4: **dark canvas only, #0a1628, no light mode.** RTF: light cream `#f4f3ee` primary, near-black only for inverse sections.
- RTF bans gradients/glows/glassmorphism; HOMI_SKILL.md mandates radial-gradient washes, brand glows, glass cards.
- RTF bans emoji in product UI; HOMI_SKILL.md mandates verdict emoji 🔑🔓🔒🚫 "part of the system."
- Fonts: both lock Inter/Fraunces/JetBrains Mono, but roles invert (RTF = serif-led editorial; dark system = Inter 95%, Fraunces 5% max). Type scales differ (1.25 modular 13–78 vs 11–88). Letter-spacing specs differ.
- Motion: same easing `cubic-bezier(0.16,1,0.3,1)` but different durations (200–300ms vs 150/300/500ms).
- Verdict colors differ entirely (terracotta/moss/honey/clay vs emerald/yellow/amber #fab633/crimson #f24822).
- Hero concept differs: Weekly Mirror (RTF) vs Threshold Compass assessment/verdict (dark skills).
→ The RTF describes a **different product iteration** (Mirror-centric, editorial). It is NOT reconcilable with the dark production skill without a ruling. `SKILL.md`'s "app/tokens.css is canonical" + HOMI_SKILL.md's "Phase 1 COMPLETE — Live now" make the **dark system the production canonical**; RTF should be treated as an exploratory Claude Design scaffold unless the lead rules otherwise.

### 9.4 Finance file internal issues
- Roth conversion cap: base file 50,000 vs EXPERT 105,000 → use EXPERT (it also uses 105,000 for QCD, matching real tax code).
- EXPERT emotional/timing lookup tables (nonlinear, (x−1)/9×100) contradict the implemented linear formulas (/10×100) → implement the linear formulas.
- Base FIRE calculator `annualSavings` expression is dimensionally wrong (adds currentAssets to a flow) → fix before porting.
- 401(k) limit 23,500 labeled "2024" — actually the 2025 figure (2024 = 23,000) → mislabeled constant.
- Quantum Readiness Field injects `Math.random()` into displayed verdict probabilities → replace with deterministic model.
- Base affordability function references undefined `downPaymentAvailable`/`estimatedPayment` (scoping bugs) → EXPERT's `maxHome = maxLoan/(1−down%)` is the corrected form.
- Monte Carlo lacks fat tails, correlation regime, sequence risk — EXPERT itself lists these as known failure modes with quantified impacts.

### 9.5 What's missing across all skill files
- Credit-score→rate matrix, FHA MIP, PMI 0.75–1.0% band (per prior constants — sourced elsewhere).
- IRMAA single-filer brackets (only MFJ given).
- State property-tax table (only TX Harris County + CA Prop 13 examples).
- Emotional/timing question instrumentation at 1–5 scale (design skill) vs 1–10 scale (finance skills) — **scale mismatch in the assessment contract** (9 questions 1–5 in HOMI_SKILL.md vs desire 1–10/pressure 0–10/stability 1–10/stress 0–10 in finance skills).
- No implementation of Trinity Engine, Behavioral Genome → verdict coupling (declared diagnostic-only).
- Weight/threshold arbitration (see 9.1) and assessment-scale arbitration (above) are the two blocking decisions.

### 9.6 Recommended canon for build
1. **Scoring engine:** EXPERT finance file (50/30/20, 80/70/60/<60, component model §4.2–4.4, validation rules) — best justified and most complete.
2. **Design:** `SKILL.md` + `HOMI_SKILL.md` dark system, `app/tokens.css` tokens; RTF quarantined as alternate-concept reference (its voice rules §2.8 and "numbers feel weighed" principle are portable and worth keeping).
3. **Constants:** adopt skill-file PMI 0.5% (or reconcile with prior 0.75–1.0% — needs ruling); keep prior DTI 28/36/43 and runway 6/3/1 (consistent); savings-rate tiers need ruling (15/10/5 in skills vs 20/10/0 prior); import credit→rate + FHA MIP from whichever prior extraction owns them.
