# E2 — HōMI Product HTML Extraction Digest

Sources (read in full):
1. `About_HōMI.html` ("The Missing Piece" brand manifesto page, 533 lines)
2. `HoMI_about_IMPORTANT.html` ("Competitive Intelligence Report" styled doc, 537 lines)
3. `homi-explainer.html` ("What HōMI Is (And Why It Exists)" one-pager, 379 lines)
4. `homi_ai_advisor.html` (AI chat advisor prototype, 907 lines)
5. `homi_operating_system_production.html` (founder operating system dashboard, 2280 lines)
6. `homi_os_mobile_first.html` (mobile-first rewrite of #5, 2237 lines)
7. `homi-explainer.pdf` (PDF export of #3 — content identical; not duplicated below)

---

## 1. Product Architecture

### 1.1 The "Operating System" files (production + mobile-first)

These are **internal founder/company operating dashboards**, not consumer app screens. Same 8-module structure in both files (mobile version shortens labels and drops some content):

**Navigation structure** (`.nav-btn[data-section]` → `.section`):

| Section id | Label (desktop) | Label (mobile) | Contents |
|---|---|---|---|
| `today` | Today's Work | Today | Phase 1 (12 tasks) + Phase 2 (10 tasks) task lists + Daily Habits |
| `content` | Content Library | Content | Sub-tabs: Reddit / LinkedIn / Facebook / Email / Video Scripts (mobile: Reddit/LinkedIn/Email only) |
| `scripts` | Sales Scripts | Sales | Sub-tabs: CDFI Scripts / Objection Handling / Discovery Questions |
| `curriculum` | NOT YET Curriculum | Curriculum | 52-week transformation program architecture |
| `scoring` | Scoring System | Scoring | 3-dimension scoring framework + algorithm pseudocode |
| `financials` | Financial Model | Financials | Burn rate + unit economics live calculators, Kill Criteria table |
| `investor` | Investor Materials | Investor | 10-slide pitch deck structure, data room checklist |
| `decisions` | Decision Trees | Decisions | If/then founder protocols |

**Feature inventory:**
- Task checklists with phase progress counters (`0/12`, `0/10`), clear-completed, reset-all
- Copy-to-clipboard template library (Reddit comments, LinkedIn posts, Facebook posts, cold emails, user welcome email, YouTube script)
- CDFI target list table (Self-Help CU $1.8B, Coastal Enterprises $300M+, LISC $1.2B+, Opportunity Finance Network, Spring Bank $350M)
- Sales objection decision trees (6 objections with IF/THEN/EXAMPLE)
- Discovery question bank (Current Process / Pain Point / Qualification / Closing)
- 52-week curriculum table + sample Week 1 lessons (accordion)
- Scoring algorithm display (150+ questions noted as required; 500+ assessments for calibration)
- Burn rate calculator, LTV:CAC calculator with color-coded thresholds
- Kill Criteria dashboard (table)
- Investor pitch deck accordion + data room checklist
- Founder decision-tree protocols (pricing test, targeting reassessment, emergency fundraise, Safe Ship conflict)

### 1.2 Data model / state

No formal JS state store. State is DOM-class based.

**localStorage (mobile-first file only):**
```js
localStorage.setItem('homi-tasks', JSON.stringify(state));
// state = { [taskIndex: number]: boolean }  // completed flag per .task-item DOM order
const state = JSON.parse(localStorage.getItem('homi-tasks') || '{}');
```
Wrapped in try/catch; `loadTaskState()` runs on `DOMContentLoaded`. The desktop "production" file has `saveTaskState()` as an empty stub with comment "In production, save to localStorage or backend".

**AI advisor state (`homi_ai_advisor.html`):**
```js
const userScores = { financial: 72, emotional: 58, timing: 81 };
const conversationContext = { decisionType: 'home purchase', currentTopic: 'emotional alignment', messagesCount: 0 };
```

### 1.3 Core JS functions

**Readiness scoring (canonical, from `homi_operating_system_production.html` "Scoring System" section):**
```js
// Simplified scoring logic
function calculateReadinessScore(responses) {
  const financialScore = calculateFinancialReality(responses.financial);
  const emotionalScore = calculateEmotionalTruth(responses.emotional);
  const timingScore = calculatePerfectTiming(responses.timing);

  // Threshold check (all must be >= 70)
  if (financialScore < 70 || emotionalScore < 70 || timingScore < 70) {
    return {
      verdict: 'NOT_YET',
      composite: null, // Doesn't matter if ANY dimension fails
      dimensions: { financialScore, emotionalScore, timingScore }
    };
  }

  // Calculate weighted composite
  const composite =
    (financialScore * 0.35) +
    (emotionalScore * 0.35) +
    (timingScore * 0.30);

  return {
    verdict: 'READY',
    composite: Math.round(composite),
    dimensions: { financialScore, emotionalScore, timingScore }
  };
}
```

**Burn rate calculator (identical in both OS files):**
```js
function calculateBurn() {
  const expenses = parseFloat(document.getElementById('monthly-expenses').value) || 0;  // default 3000
  const revenue  = parseFloat(document.getElementById('monthly-revenue').value)  || 0;  // default 500
  const cash     = parseFloat(document.getElementById('current-cash').value)     || 0;  // default 15000
  const burn = expenses - revenue;
  const runway = burn > 0 ? Math.floor(cash / burn) : 999;  // 999 displayed as '∞'
  // Color: runway < 3 → text-red; < 6 → text-yellow; else text-emerald
}
```

**Unit economics:**
```js
function calculateUnitEcon() {
  const cac = 40, arpu = 22, lifespan = 8; // default input values
  const ltv = arpu * lifespan;             // 176
  const ratio = cac > 0 ? (ltv / cac).toFixed(1) : 0;  // '4.4x'
  // Color: ratio < 3 → red; < 5 → yellow; else emerald (mobile) / cyan (desktop)
}
```

**Advisor response routing (keyword match, from `homi_ai_advisor.html`):**
```js
function getResponse(input) {
  const lower = input.toLowerCase();
  if (lower.includes('uncertain') || lower.includes('not sure') || lower.includes('unsure')) return advisorResponses.uncertainty;
  if (lower.includes('emotion') || lower.includes('feel') || lower.includes('understand my')) return advisorResponses.emotions;
  if (lower.includes('holding') || lower.includes('back') || lower.includes('block')) return advisorResponses.holdingBack;
  if (lower.includes('ready') || lower.includes('decide') || lower.includes('decision')) return advisorResponses.readyToDecide;
  if (lower.includes('pressure') || lower.includes('rush') || lower.includes('urgent')) return advisorResponses.pressure;
  if (lower.includes('regret') || lower.includes('afraid') || lower.includes('fear') || lower.includes('scared')) return advisorResponses.regret;
  if (lower.includes('time') || lower.includes('long') || lower.includes('week') || lower.includes('when')) return advisorResponses.timeframe;
  if (lower.includes('step') || lower.includes('action') || lower.includes('do') || lower.includes('help')) return advisorResponses.steps;
  return advisorResponses.default;
}
```
Chat UX: typing indicator (3 dots), simulated latency `1200 + Math.random()*800` ms, greeting posted 500ms after load, Enter key sends, quick-action buttons re-inject text into input and send.

**UI utility functions (OS files):** `toggleTask`, `updatePhaseProgress`, `clearCompleted`, `resetTasks`, `switchSubTab`, `copyTemplate` (clipboard API + textarea/`execCommand` fallback in mobile version), `toggleAccordion` (closes siblings).

---

## 2. AI Advisor (`homi_ai_advisor.html`)

### 2.1 Persona & framing
- Name: **"HōMI Decision Advisor"** / message header "HōMI Advisor"; avatar glyph `◉`; user avatar `👤`
- Header badge: **"AI Advisor Active"** with pulsing emerald dot
- Input placeholder: `"Ask about your decision readiness..."`
- Score pips in header: Financial Reality 72 / Emotional Truth 58 / Perfect Timing 81 (same numbers drive all copy)
- Verdict threshold used in copy: **70** per dimension

### 2.2 Conversation flow (response library)
Each response = HTML `text` + `quickActions` array (4 suggested replies). Keys: `greeting`, `uncertainty`, `emotions`, `holdingBack`, `readyToDecide`, `pressure`, `regret`, `timeframe`, `steps`, `default`.

**Greeting (verbatim core):**
> "Hello! I'm your HōMI Decision Advisor. I've reviewed your assessment results. Your **Financial Reality** score is solid at 72, and your **Perfect Timing** is excellent at 81. However, I notice your *Emotional Truth* score is 58—below the 70 threshold. This suggests there may be some internal misalignment worth exploring. What's on your mind about this decision?"
- Quick actions: "I feel uncertain about this" / "Help me understand my emotions" / "What's holding me back?" / "Am I ready to decide?"

**Honesty guardrail copy (readyToDecide, verbatim):**
> "Based on your current scores, here's my honest assessment: *You're not quite ready.* I know that might not be what you wanted to hear. But my job isn't to tell you what feels good—it's to help you make decisions you won't regret."
> "• Decisions made without emotional alignment often lead to buyer's remorse • The gap between your timing (81) and emotions (58) suggests pressure is outpacing readiness • You deserve to feel **excited**, not just 'ready enough'"

**Other signature lines (verbatim):**
- "Uncertainty is your inner wisdom asking for more information. It's not weakness—it's intelligence."
- "The right decision rarely feels urgent." / "Real opportunities don't disappear the moment you take time to breathe."
- "You're more likely to regret decisions made under pressure than decisions made with patience."
- "Your intuition is flagging something." (holdingBack)
- Default: "my goal isn't to tell you what to do—it's to help you understand yourself well enough that the right choice becomes clear."

**Emotional Truth patterns offered (emotions flow):** "1. Values conflict — Part of you wants this, part doesn't / 2. External pressure — Others' expectations are louder than your own voice / 3. Unprocessed fear — A past experience is creating resistance"

**Timeframe guidance:** "Quick wins (1-2 weeks): have one honest conversation… write down your fears… revisit your core values. Deeper work (2-4 weeks): sit with the decision without pressure… Re-assessment in 2 weeks."

**Steps (action plan):** "Step 1: Values Clarity (Today) — Write down your top 5 values… Step 2: Fear Inventory (Tomorrow) — 'Is this fear protecting me or limiting me?' Step 3: Support Conversation (This Week)… Step 4: Quiet Reflection (Daily) — 10 minutes each day just sitting with the decision."

### 2.3 Insights side panel (320px slide-in)
- Mini rotating compass SVG (3 rings + center dot)
- Dimension bars: Financial 72 (cyan), Emotional 58 (emerald), Timing 81 (yellow)
- Insight cards: "💡 Key Insight — Your timing is excellent, but emotional alignment needs attention. This often indicates external pressure overriding internal readiness." / "🎯 Focus Area — Emotional Truth score of 58 is your primary blocker. Consider discussing this decision with someone you trust before proceeding."
- Action items checklist: "Review your values alignment worksheet" / "Have a conversation with your partner" / "Complete financial assessment" (pre-checked) / "Set a decision deadline"

---

## 3. Brand Copy (verbatim)

### 3.1 Taglines
- **"A Decision Companion"** (primary; footer of About + Competitive Report)
- **"Readiness Intelligence Platform"** (explainer header/footer)
- **"An Emotionally Intelligent Decision OS"** (LinkedIn posts)
- **"The voice nobody else provides. Now here."** (About footer)
- **"You're Not Alone — www.hōmi.com"** (About CTA)
- Letter meanings: "H (Clarity) • ō (Trust) • M (Readiness) • I (Insight)"

### 3.2 Verdicts & score messages
- "70+ on all three dimensions = **'YOU'RE READY'** / Below 70 on any dimension = **'NOT YET'** + specific transformation path"
- "Binary verdict: READY or NOT YET"
- Email verdict copy (verbatim from welcome email):
  - READY: "🎉 You're Ready! Based on your Financial Reality, Emotional Truth, and Perfect Timing scores, you're in a strong position to move forward."
  - NOT YET: "💛 You're Not Yet Ready. This isn't rejection—it's clarity." … "Every 'NOT YET' is temporary." … "Average time to READY: 6-12 months"
- Advisor soft verdict: "*You're not quite ready.*"

### 3.3 Signature aphorisms (recurring across all files)
- **"Most people don't regret what they bought. They regret WHEN they bought it."** (a.k.a. "The regrets aren't about the house. They're about the timing.")
- "The financial elite use systems that optimize for outcomes. But no system on Earth optimizes for decision readiness—the moment before a decision is made."
- "The entire credit scoring industry is built on a 1950s question: 'Will this person pay us back?' HōMI asks a 2025 question: 'Is this person ready to make this decision?'"
- "The most valuable financial technology of the next decade won't help you manage money. It will help you understand when you're ready to make decisions about money."
- "HōMI is the friend who says: 'I love you, but you're not ready yet' — and then helps you get there."
- "A voice that only wins when you win."
- "No one in that chain gets paid to tell you to wait."
- "Because there's no rush. There's only the right time."
- "Being approved doesn't mean you're ready."
- "HōMI doesn't compete with these systems. HōMI is the missing layer that comes before all of them."
- "By 2030, everyone will have a Decision Intelligence OS. We're building it first."

### 3.4 Three pillars/dimensions (names vary slightly by artifact)
- **Financial Reality** (cyan) — "Current cash flow, true affordability ratios, emergency buffer assessment, income stability trajectory" (a.k.a. "Financial Readiness — Can you afford it?")
- **Emotional Truth** (emerald) — "Values alignment with decision, stress capacity assessment, relationship/family readiness, psychological preparedness" (a.k.a. "Emotional Readiness — Are you mentally prepared?")
- **Perfect Timing** (yellow) — "Life stage appropriateness, opportunity cost analysis, market/economic context, future obligation trajectory" (a.k.a. "Market Timing — Is now the right time?")
- **Weights:** 35% / 35% / 30% (OS scoring + Facebook template + pitch deck). Note: About page says "financial strength (50%), emotional preparedness (30%), and market timing (20%)" — an older/inconsistent weighting.

### 3.5 Statistics inventory
- 73% of people who want to buy a home aren't actually ready / "73% NOT YET segment"; 27% get READY → $50–200 one-time referral; 73% get NOT YET → $180–540 LTV (3–10x higher)
- "We tell 70% of people to wait."
- FICO: 300–850, 90%+ of US lending decisions, created 1989; 41% misclassification rate; 45M credit invisible / 63.5M credit marginalized / 17M credit avoidant; median FICO in majority-minority zip codes = 34th percentile
- Aladdin: $21T AUM (~10% of world financial assets), 6,000+ computers; Bloomberg: 325,000+ users, ~$25,000/yr seat
- 63% regret major financial decisions; $2.3T market for major life decisions; decisions made 2–3 times per decade; $400,000 decision framing
- Reddit analysis post: "500+ posts: 73% have a red flag — 34% <3 months emergency fund, 28% relationship uncertainty, 19% career transition, 16% comparing to others"; happy buyers: 6+ months expenses saved after down payment, both partners excited, stable income/no big changes in 2 years
- Real estate agents: 12 "buyers"/yr, 3 close, 75% failure, 60% of time on non-converting leads
- Market: $3B → $8.3B by 2033 (16.5% CAGR); B2C $9.99–99.99/mo, B2B $500–2K/mo; Ask: $400K at $2.5M valuation
- Kill criteria: <40% completion after 100; <5% NOT YET conversion after 200; <10 subscribers by Day 75; 0 meetings after 30 cold emails; $1K MRR not hit by Day 90
- YouTube script heuristics: 6 months expenses after down payment + closing; partner excitement ≥7/10; 2+ years job stability; >20% chance life differs in 2 years = wait

### 3.6 Disclaimers / regulatory positioning
- "Establish regulatory positioning (education platform, not financial advice)" (Next Actions)
- Scoring section production note: "Full scoring implementation requires 150+ questions across all dimensions… Calibration requires 500+ user assessments with real outcomes to validate weights."
- Welcome email: "Connect with our verified lender partners (no obligation)"

---

## 4. Design Tokens

### 4.1 Colors (canonical, repeated in all files)
```css
:root {
  --cyan:    #22d3ee;  /* Financial Reality; hover #06b6d4 */
  --emerald: #34d399;  /* Emotional Truth;  hover #10b981 */
  --yellow:  #facc15;  /* Perfect Timing;   hover #eab308 */
  --navy:    #0a1628;  /* page background */
  --slate:   #1e293b;  /* card/panel background */
  --slate-600: #475569;
  --slate-700: #334155; /* borders */
  --dark:    #0f172a;  /* deepest background (advisor/explainer body) */
  --light:   #e2e8f0;  /* primary text */
  --muted:   #94a3b8;  /* secondary text (advisor uses #64748b) */
  --red:     #f87171;  /* alerts (About page also uses #ef4444) */
  --orange:  #fb923c;
}
```
Footer spec line: "Cyan #22d3ee • Emerald #34d399 • Yellow #facc15 • Navy #0a1628"

**Logo wordmark:** per-letter coloring — `H` cyan, `ō` emerald, `M` yellow, `I` cyan; font-weight 900, letter-spacing -0.02em (about page: -3px at 80px size).

**Signature gradients:**
```css
/* Brand tri-color */
linear-gradient(135deg, #22d3ee 0%, #34d399 50%, #facc15 100%);
/* Header wash */
linear-gradient(135deg, rgba(34,211,238,0.1) 0%, rgba(52,211,153,0.1) 50%, rgba(250,204,21,0.1) 100%);
/* About page background */
linear-gradient(135deg, #0a1628 0%, #0f172a 50%, #0a1628 100%);
/* Advisor avatar / send button */
linear-gradient(135deg, var(--cyan), var(--emerald));
```

### 4.2 Typography
- Fonts: **Inter** (weights 400–900; About page loads from rsms.me/inter) — product/UI; **IBM Plex Sans** (300–700) — explainer doc; mono: `'SF Mono', Monaco, monospace` / `'Monaco', monospace`
- Mobile-first fluid type scale:
```css
--text-xs: clamp(0.6875rem, 0.65rem + 0.2vw, 0.75rem);
--text-sm: clamp(0.75rem, 0.7rem + 0.25vw, 0.8125rem);
--text-base: clamp(0.875rem, 0.8rem + 0.4vw, 0.9375rem);
--text-lg: clamp(1rem, 0.9rem + 0.5vw, 1.125rem);
--text-xl: clamp(1.125rem, 1rem + 0.6vw, 1.25rem);
--text-2xl: clamp(1.25rem, 1.1rem + 0.8vw, 1.5rem);
--text-3xl: clamp(1.5rem, 1.25rem + 1.2vw, 1.875rem);
```
- line-height 1.6 (app) / 1.7 (docs); headings font-weight 700–900; body 15px base (desktop OS), 14–16px docs.

### 4.3 Spacing / radius / motion / z-index (mobile-first token set)
```css
--space-xs: 0.25rem; --space-sm: 0.5rem; --space-md: 1rem;
--space-lg: 1.5rem;  --space-xl: 2rem;  --space-2xl: 3rem;
--touch-min: 44px; --touch-comfortable: 48px;
--radius-sm: 0.375rem; --radius-md: 0.5rem; --radius-lg: 0.75rem; --radius-xl: 1rem;
--transition-fast: 150ms ease; --transition-base: 200ms ease; --transition-slow: 300ms ease;
--z-dropdown: 50; --z-sticky: 100; --z-fixed: 150; --z-modal: 200; --z-overlay: 250;
```
Breakpoints: 640px / 1024px / 1440px (mobile-first); 768px elsewhere. Meta: `theme-color #0a1628`, `apple-mobile-web-app-status-bar-style: black-translucent`.

**Animations:**
```css
@keyframes pulse { 0%,100% {opacity:1} 50% {opacity:0.5} }        /* status dot, 2s infinite */
/* Advisor badge variant adds transform scale(1.2) at 50% */
@keyframes messageIn { from {opacity:0; transform:translateY(10px)} to {opacity:1; transform:none} } /* 0.3s ease */
@keyframes typing { 0%,60%,100% {transform:translateY(0);opacity:0.4} 30% {transform:translateY(-4px);opacity:1} } /* 1.4s, delays .2s/.4s */
/* Compass rings: outer 20s CW, middle 15s CCW, inner 10s CW, linear infinite */
/* Insights panel: transform 0.3s ease slide-in; dimension bars: width 0.5s ease */
```

### 4.4 Signature component — the "Threshold Compass"
Concept: three concentric animated rings (cyan outer = Financial, emerald middle = Emotional, yellow inner = Timing) around a center **keyhole that turns into a key** when all three dimensions align (ready).

**Static mini compass (Competitive Report, 200×200 viewBox):**
```html
<circle cx="100" cy="100" r="85" stroke="#22d3ee" stroke-width="2" opacity="0.6"/>
<circle cx="100" cy="100" r="60" stroke="#34d399" stroke-width="2" opacity="0.7"/>
<circle cx="100" cy="100" r="35" stroke="#facc15" stroke-width="2" opacity="0.8"/>
<!-- keyhole: circle cx=100 cy=96 r=12 + rounded rect 94,104 12×16 rx=2, yellow stroke;
     key fill: circle r=5 + rect 97,96 6×12 -->
```

**Animated compass (About page, 200×200):** groups `.r1/.r2/.r3` rotate around `transform-origin: 100px 100px`; ring radii 85/60/35, stroke-width 2.5/2.5/3, opacity .8/.85/.9, SVG `feGaussianBlur stdDeviation=2` glow filter merged with source; marker dots at cardinal points (r=3 cyan, r=2.5 emerald); container `radial-gradient(circle, rgba(34,211,238,.12), transparent 70%)` + `drop-shadow(0 30px 70px rgba(34,211,238,0.25))`.

**Advisor mini compass (100×100 viewBox):** rings r=45/32/18, stroke-width 2, opacity .6/.7/.8, single orbiting dot on each of outer/middle rings (r=3 cyan, r=2.5 emerald), center dot r=6 yellow 0.9 opacity; classes `.ring-outer` (rotate-cw 20s), `.ring-middle` (rotate-ccw 15s), `.ring-inner` (rotate-cw 10s).

### 4.5 Other reusable components
- `.score-pip` — 32px circle, 2px colored border, tiny bold score number (advisor header)
- `.advisor-badge` — pill, cyan border/bg 0.1 alpha, pulsing emerald 8px dot
- Chat bubbles: advisor = slate bg, 16px radius with 4px bottom-left; user = cyan→emerald gradient 0.2 alpha + cyan border, 4px bottom-right; max-width 70%
- `.task-item` / `.task-checkbox` (44px touch target in mobile version) — emerald fill + navy ✓ when checked; completed = 50% opacity + line-through
- `.badge-*` — rgba(color,0.2) bg + colored text, uppercase 11px/700
- `.decision-node` — 3px cyan left border, cyan IF / emerald THEN / italic muted EXAMPLE
- `.result-box` — navy bg, 2px emerald border, 32px/900 emerald result value
- `.callout` — slate bg + 4px yellow left border (variants emerald/cyan); blockquote = cyan→emerald 0.1 gradient + cyan 0.3 border, italic
- Focus-visible: `outline: 2px solid var(--cyan); outline-offset: 2px`

---

## 5. About / Explainer Content

### 5.1 About_HōMI.html — "The Missing Piece" (brand manifesto)
Narrative structure:
1. **Opening truth:** "Every major purchase you make has one person missing from the table. Someone with no incentive to push you forward. Someone who asks only: 'Are you actually ready?'"
2. **The Problem Nobody Talks About** — 4 market cards, verbatim:
   - Real Estate: "Realtors profit when you buy. Lenders profit when you borrow. Nobody profits from your readiness."
   - Automotive: "Dealers profit when you sign. Finance companies profit from your loan. Nobody's on your side."
   - Education: "Schools profit from enrollment. Loan providers profit from debt. Your readiness is irrelevant."
   - Career: "Recruiters profit from placements. Nobody measures if YOU are ready for the jump."
   - Core problem: "Every market has a seller with incentives. None have a buyer's advocate asking one question: Are you actually ready for this?"
3. **The Missing Piece** — the four truth-telling lines, verbatim:
   - "You can afford it. But you're not emotionally ready yet. Wait."
   - "You're emotionally ready. But the market timing is wrong. Wait."
   - "Everything aligns. Now you're ready. Go."
   - "Nobody else will tell you this. But I'm on your side."
4. **HōMI Is That Missing Voice** — claims: "We measure three dimensions that matter: your financial strength (50%), emotional preparedness (30%), and market timing (20%)"; "We have zero commissions. Zero referral fees. Zero incentive to push you either way."; "We tell 70% of people to wait. Because honesty is rarer than you think."; "We measure readiness, not affordability. We validate emotions, not suppress them."; "We built a category that had to exist—because every major decision deserves this voice."
5. Logo + tagline "A Decision Companion", animated Threshold Compass, CTA "You're Not Alone / www.hōmi.com", footer "© 2025 HōMI — A Decision Companion / The voice nobody else provides. Now here."

### 5.2 homi-explainer.html/.pdf — "What HōMI Is (And Why It Exists)"
- Lead (verbatim): "HōMI is the first AI that tells you *if* you're ready to make a major life decision — not just *how* to do it. … gives you a straight answer: 'You're ready' or 'Not yet, here's what needs to happen first.'"
- Why this matters: agent/lender/seller incentive list; "No one in that chain gets paid to tell you to wait."; "It's the first advisor with zero conflict of interest."
- Stats: 63% regret major financial decisions; $2.3T market; 2–3 decisions per decade; tool gaps: "Give you data but no guidance — Zillow shows houses, doesn't tell you if you should buy / Have financial conflicts — Advisors profit when you act / Lack emotional intelligence — Spreadsheets don't know you're stressed or scared"
- Threshold Compass walkthrough: 1 Financial Readiness (cyan) / 2 Emotional Readiness (emerald) / 3 Market Timing (yellow); "If all three align, the center 'keyhole' turns into a key — you're ready."
- Roadmap example quote: "Save $8K more, wait for interest rates to drop 0.5%, and have the career stability conversation with your partner first."
- Why needed: "$400,000 decision based on gut feeling… You wouldn't let your buddy perform surgery on you just because he's enthusiastic…" ; "HōMI is the friend who says: 'I love you, but you're not ready yet' — and then helps you get there."
- Bigger vision: scales to buying a car, switching careers, starting a business, getting married, having kids, retiring early; "By 2030, everyone will have a Decision Intelligence OS. We're building it first."
- Bottom line: "one honest voice in a sea of people trying to sell you something — a voice that only wins when you win."
- Footer: "HōMI Technology LLC | Readiness Intelligence Platform | homi.com"

### 5.3 HoMI_about_IMPORTANT.html — "Competitive Intelligence Report" (Nov 2025, for Cody Short, Founder & Architect, HōMI Technology LLC)
Subtitle: "The Most Sophisticated Financial Systems on Earth—And How to Make Them Look Like Child's Play." Content = market/gap research (Aladdin, Bloomberg, FICO flaws), gap-analysis table (Financial Reality / Emotional Truth / Perfect Timing / Integration / Output / Conflict of Interest), HōMI Score spec (three 0–100 dimensions, 70 threshold, READY/NOT_YET), FICO vs HōMI comparison table ("Backward-looking→Forward-looking, Debt-focused→Decision-focused, Single dimension→Three dimensions, Punishes non-debtors→Values financial prudence, Opaque→Transparent, Rejects you→Transforms you, Profits from transactions→Profits from readiness"), NOT YET moat argument, uncopiable reasons (zero conflict of interest structure, 3-D integration, trust architecture: "Users will trust a system that says 'wait' more than one that only says 'buy.'"). Next actions: lock 3-dimension framework; 30-day Home Buying Readiness MVP sprint; validate NOT YET with 50 users; regulatory positioning as education platform; partnership convos.

### 5.4 OS content-library copy worth reusing (selection)
- **Three-question readiness framework** (Reddit "Should I Buy?" template): Financial Reality (months of expenses covered if income lost; % savings left after down payment + closing; 1–2% annual maintenance + taxes) / Emotional Truth (is this what YOU want or external pressure; partner alignment; does 3-year vision feel exciting or constraining) / Perfect Timing (life changes coming; opportunity cost; what improves vs worsens in 12 months).
- "FICO tells lenders if you'll pay. But it doesn't tell YOU if you should buy. Those are different questions."
- Poverty-finance empathy framing: "You're not behind. You're exactly where you are. The question isn't 'when will I be rich enough?' It's 'when will I be ready enough?'"
- LinkedIn FICO post: full critique list + "Is this person READY to make this decision right now?" + hashtags #fintech #decisionintelligence #FICO
- Founder story: building while at "Safe Ship" sales job; "I'm not leaving Safe Ship until HōMI hits $5K MRR."
- CDFI pitch: "Turning 'not yet' borrowers into qualified customers"; third path = keep declined borrowers engaged, transform, return when qualified; free 90-day pilot, $500–2K/mo after; pilot metrics = NOT YET→qualified conversion, default rates vs traditional, team time savings.
- YouTube: "5 Signs You're Not Ready to Buy a House": (1) emergency fund disappears after down payment; (2) partner not aligned (excitement <7/10 → pump the brakes; "you're buying an identity, not a home" for sign 4); (3) income not stable; (4) buying to keep up ("If no one knew… would you still want to do it?"); (5) major life changes within 2 years. CTA: free 10-minute assessment, "READY or NOT YET".

### 5.5 NOT YET Curriculum (52-week transformation program — "the product")
| Phase | Weeks | Focus | Deliverables |
|---|---|---|---|
| Foundation | 1–4 | Understanding gaps, transformation goals | Personal readiness audit, 90-day roadmap |
| Financial Reality | 5–16 | Cash flow, emergency fund, debt | Budget system, savings automation, debt payoff plan |
| Emotional Truth | 17–28 | Values, stress, relationship alignment | Values assessment, communication scripts, readiness journal |
| Perfect Timing | 29–40 | Life stage, opportunity cost, timing | Life timeline, financial scenarios, decision framework |
| Integration | 41–52 | Synthesis, final assessment | Certified readiness report, lender introductions |

Sample lessons: 1.1 "Understanding Your Scores" (video "Breaking Down Your HōMI Score"; reflection: which dimension +20 points in 90 days); 1.2 "The NOT YET Mindset" (video "Why Waiting Is a Superpower"; exercise: 3 past decisions — would waiting 6 months have improved outcome?).

---

## 6. Notable inconsistencies (flag for rebuild)
1. **Dimension weights:** 35/35/30 (OS scoring, pitch, Facebook) vs 50/30/20 (About page).
2. **"73% NOT YET" vs "we tell 70% to wait"** vs "63% regret" — three similar but distinct stats; keep them attributed correctly.
3. Advisor persona copy is keyword-routed canned responses, not a real LLM integration — guardrails are embedded in response text, no system prompt exists.
4. Desktop OS `saveTaskState()` is a stub; only the mobile-first file implements `homi-tasks` localStorage.
5. Compass keyhole geometry differs slightly between files (About: cy=93/rect y=103 14×18; Report: cy=96/rect y=104 12×16).
