# HōMI Tech — Section Map (SSOT for scoped AI work)

**Why this file exists.** The build is large (~800 source files) but already
_vertically sliced_ by domain — the same feature name repeats across `app/`,
`lib/`, `components/`, and `__tests__/`. Nothing, however, tells an AI agent
where one slice ends and the next begins, so a task in one area drifts into
five others and "overworks." This file draws the boundaries and states the
rule that keeps each task inside one.

> **The one rule:** _one Section per task._ An agent may **read** anything in
> the repo, but may only **write** inside the Section named in the task, plus
> any shared dependency the task explicitly declares. If it believes it must
> edit **Section 0 (Scoring Core)** or **Section 8 (Platform)**, it stops and
> asks first.

Start every AI task by naming the Section and the boundary, e.g.:

> _"Work only in **Section 4 — Finance**. Do not modify Scoring (Section 0) or
> Platform (Section 8). If you think you must, stop and explain why."_

Keep the task smaller than the Section — scope to one flow ("the Plaid reconnect
handler"), not "improve finance." A whole Section is still ~100 files.

---

## The Sections

Each Section is the quartet of matching folders across the four trees. `app/`
paths omit the `(product)` / `(marketing)` route-group prefix for brevity.

### 0 · 🔒 Scoring Core — **FROZEN**

The scored assessment and its verdict. Governed by `AGENTS.md` guardrails #1–2:
weights and thresholds are canon and never change; scoring is
server-authoritative. **Read and call it; never edit it** without explicit
human sign-off.

- **app:** `assessment/`, `results/`, `report/`, `api/scoring/`, `api/assessments/`
- **lib:** `scoring/`, `assessment/`, `questions/`, `validation/`
- **components:** `assessment/`, `results/`

### 1 · Marketing / Public

The unauthenticated site and everything SEO/brand-facing.

- **app:** all of `(marketing)/*` (about, artifact, blog, guides, how-it-works,
  learning, legal, method, pricing, status, unsubscribe, waitlist, and the b2b /
  employee / partner **marketing pages**), `api/waitlist/`, root SEO files
  (`sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`,
  `twitter-image.tsx`)
- **lib:** `seo/`
- **components:** `marketing/`, `home/`, `seo/`, `learning/`

### 2 · Dashboard / Shell

The signed-in home surface and the app chrome that frames every product page.

- **app:** `dashboard/`, `daily/`, `journal/`, `calendar/`, `onboarding/`,
  `demo/`, plus app-shell chrome (`layout.tsx`, `loading.tsx`, `error.tsx`,
  `global-error.tsx`, `not-found.tsx`, `globals.css`, `fonts.ts`)
- **lib:** `dashboard/`, `layout/`, `keyboard/`, `demo/`
- **components:** `dashboard/`, `layout/`, `calendar/`, `operate/`, `pwa/`

### 3 · AI Agents / Companion

The companion ecosystem — agent logic and the surfaces that render it.

- **app:** `agents/`, `agent-hub/`, `advisor/`, `twin/`, `trinity/`, `genome/`,
  `api/agents/`, `api/advisor/`, `api/twin/`, `api/trinity/`
- **lib:** `agents/`, `advisor/`, `twin/`, `trinity/`, `genome/`, `conflict/`
- **components:** `agents/`, `companion/`, `advisor/`, `twin/`

### 4 · Finance / Integrations

Money-in and money-out: Plaid, Stripe, credit, billing, and the webhooks that
back them.

- **app:** `finance/`, `credit/`, `connections/`, `api/finance/`,
  `api/finance-state/`, `api/plaid/`, `api/billing/`, `api/checkout/`,
  `api/webhooks/`
- **lib:** `finance/`, `plaid/`, `credit/`, `stripe/`, `receipts/`
- **components:** `finance/`, `connections/`

### 5 · Planning / Decisions / Simulation

Everything downstream of the score that helps the user act: plans, decisions,
simulations, signals, and the calculator tools.

- **app:** `plan/`, `decisions/`, `simulator/`, `scenarios/`, `path/`,
  `outcomes/`, `signals/`, `calibration/`, `shadow-score/`, `tools/`,
  `api/readiness-path/`, `api/tools/`
- **lib:** `planner/`, `decisions/`, `simulator.ts`, `readiness/`, `outcomes/`,
  `signals/`, `tools/`
- **components:** `planner/`, `decisions/`, `simulator/`, `readiness/`, `tools/`

### 6 · Household / B2B / Org

Multi-person and organizational surfaces — the product-side logic (the public
marketing pages for these live in Section 1).

- **app:** `household/`, `team/`, `partner/`, `employee/`, `api/household/`
- **lib:** `household/`
- **components:** `household/`, `b2b/`

### 7 · Auth / Account / Admin / Access

Identity, settings, admin, and the access-gating layer (entitlements + flags).

- **app:** `app/auth/*`, `settings/`, `admin/`, `api/account/`, `api/admin/`
- **lib:** `auth/`, `admin/`, `entitlements.ts`, `flags.ts`
- **components:** `auth/`, `settings/`, `admin/`, `consent/`, `entitlements/`

### 8 · 🔧 Platform / Shared — **touch deliberately**

The seams every other Section depends on. A change here ripples everywhere, so
it is never a side-effect of a feature task — it is its own, declared task.

- **app:** `middleware.ts`, `api/healthcheck/`, `api/cron/`, `api/csp-report/`,
  `api/email/`, `api/push/`, `api/unsubscribe/`, `api/v1/`, and the **share
  links** surface (`app/share/`, `app/shadow/`, `api/shares/`,
  `api/shadow-shares/`)
- **lib:** `supabase/`, `env.ts`, `email/`, `push/`, `notifications/`,
  `analytics/` + `analytics.ts`, `audit.ts`, `attribution.ts`, `dates.ts`,
  `persistence.ts`, `ratelimit.ts`, `security.ts`, `architecture/`, `brand/`
- **components:** `ui/` (shared design system), `share/`, `analytics/`, `brand/`
- **repo root:** `supabase/` (migrations)
- **🔒 sub-zones:** `lib/brand` + `components/brand` are **brand canon**
  (guardrail #3, enforced by `npm run brand-check`); `lib/scoring` is Section 0.
  Treat both as read-only from here.

---

## Cross-cutting judgement calls

A few folders could sit in more than one Section. These are the decisions, so an
agent never has to guess:

| Folder | Owned by | Why |
|--------|----------|-----|
| `tools/` (calculators) | **5 · Planning** | They feed decisions/plans, not the core score. |
| `share/` + `shadow/` (link sharing) | **8 · Platform** | A generic mechanism reused by many features. |
| `brand/` | **8 · Platform** (🔒) | Cross-cutting canon; brand-check enforces it everywhere. |
| `ui/` | **8 · Platform** | The shared primitive library used by every Section. |
| `entitlements.ts` / `flags.ts` | **7 · Access** | Gate access; live with auth, not platform infra. |
| `onboarding/` | **2 · Shell** | Entry into the product surface, not part of auth. |
| `conflict/` | **3 · Agents** | Resolves competing agent guidance. |

If a task genuinely needs to cross one of these lines, that's the signal to
**split it into two tasks**, one per Section.

---

## Full directory index

Every top-level source folder, resolved to exactly one Section. Grep this when
in doubt.

| Section | `app/` | `lib/` | `components/` |
|---------|--------|--------|----------------|
| 0 Scoring 🔒 | assessment, results, report, api/scoring, api/assessments | scoring, assessment, questions, validation | assessment, results |
| 1 Marketing | (marketing)/*, api/waitlist, SEO root files | seo | marketing, home, seo, learning |
| 2 Shell | dashboard, daily, journal, calendar, onboarding, demo, app-shell chrome | dashboard, layout, keyboard, demo | dashboard, layout, calendar, operate, pwa |
| 3 Agents | agents, agent-hub, advisor, twin, trinity, genome, api/{agents,advisor,twin,trinity} | agents, advisor, twin, trinity, genome, conflict | agents, companion, advisor, twin |
| 4 Finance | finance, credit, connections, api/{finance,finance-state,plaid,billing,checkout,webhooks} | finance, plaid, credit, stripe, receipts | finance, connections |
| 5 Planning | plan, decisions, simulator, scenarios, path, outcomes, signals, calibration, shadow-score, tools, api/{readiness-path,tools} | planner, decisions, simulator.ts, readiness, outcomes, signals, tools | planner, decisions, simulator, readiness, tools |
| 6 Org | household, team, partner, employee, api/household | household | household, b2b |
| 7 Access | auth/*, settings, admin, api/{account,admin} | auth, admin, entitlements.ts, flags.ts | auth, settings, admin, consent, entitlements |
| 8 Platform 🔧 | middleware.ts, api/{healthcheck,cron,csp-report,email,push,unsubscribe,v1}, share, shadow, api/{shares,shadow-shares} | supabase, env.ts, email, push, notifications, analytics(.ts), audit.ts, attribution.ts, dates.ts, persistence.ts, ratelimit.ts, security.ts, architecture, brand 🔒 | ui, share, analytics, brand 🔒 |

_Authority note (from `AGENTS.md`): executable TypeScript wins on conflict.
This map is a routing index for **where work goes**, not a redefinition of what
any module does._
