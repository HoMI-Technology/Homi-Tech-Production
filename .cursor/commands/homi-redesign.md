# HōMI Total Dashboard Redesign — autonomous, multi-agent, anti-slop

You are rebuilding the entire HōMI product surface — every dashboard, for every
user type — to shipped-product quality. Full auto mode: do not stop to ask
permission for work inside this scope. You own the outcome.

Repo: `HoMI-Technology/Homi-Tech-Production` (local: `C:\dev\apps\homi-production`).
Product surface: everything under `app/(product)/` — dashboard, money, assessment,
results, path, plan, report, admin, advisor, employee, partner, household, team,
agents, agent-hub, journal, timeline, scenarios, simulator, twin, trinity, trust,
signals, shadow-score, genome, credit, calendar, calibration, connections, daily,
decisions, demo, onboarding, outcomes, settings, tools.

**SYNC FIRST:** `git fetch origin`; base all work on `origin/main` (the
local checkout was 89 commits stale on 2026-08-29 and the repo receives
commits hourly from other agent streams — an upstream draft may already be
doing your work; build on it, never parallel-invent).

**Knowledge first:** `docs/knowledge/homi-agent-knowledge.md` is the
compiled memory of every bot that has worked on HōMI — founder rulings,
fragility traps (Lighthouse headroom, CI constraints), architecture truths
(money-engine duplication, sync coverage). Read it before anything else and
make every deployed agent read it; append durable learnings back to it.

## Law (read these FIRST, before any design or code)

1. `CANON.md` + `DESIGN.md` — brand law. **Propagate the existing system; never
   invent a second visual language.** Dark navy surfaces only. Accents cyan
   `#22d3ee` / emerald `#34d399` / yellow `#facc15`; CTA cyanDeep `#0ea5c4`.
   Verdict enum `READY · ALMOST_THERE · BUILD_FIRST · NOT_YET` with amber
   `#fab633` / crimson `#f24822`. Fraunces display, Inter body, JetBrains Mono
   for data. Spelling **HōMI** (ō = U+014D) in prose.
2. `lib/brand/index.ts` + `app/globals.css` `@theme` — executable brand. On
   conflict with prose, fix the drift; never add a third palette.
3. **Never redraw the compass mark.** `components/brand/CinematicCompass.tsx`,
   `Compass3D.tsx`, and `globals.css` win over anything you'd generate.
4. `AGENTS.md`, `Plans.md`, `docs/SECTIONS.md`, `docs/launch-shipped-map.md` —
   what exists, what's planned, what shipped.
5. Zero-affiliate canon: no affiliate links, referral monetization, or
   third-party product placement on any surface.
6. Forbidden looks: beige, purple-SaaS, generic template dashboards, emoji-as-UI,
   lorem placeholder anything.

## Skills — arm yourself and your agents before working

Capability you lack is a skill to find, not a reason to produce worse output.

- **Installed skills first.** Check `~/.cursor/skills-cursor/` (notably
  `review`, `review-security`, `create-subagent`, `automate`, `babysit`) and
  the canonical store `~/.agents/skills/`. Load the relevant SKILL.md into
  context before the phase that needs it.
- **HōMI-specific know-how** lives in `C:\dev\kimi-workspace\skills\` — read
  `homi-orientation/SKILL.md` and `homi-product-ui/SKILL.md` before any
  design or copy decision; they hold founder rulings and product-UI law that
  override generic taste.
- **Missing capability → discover on demand:** run
  `npx skills find <query>` (e.g. "dashboard design", "dead code", "nextjs
  audit", "accessibility"), install the best match into the canonical store
  (`~/.agents/skills/`), then copy or junction it into
  `~/.cursor/skills-cursor/<name>/` so every agent in the team can load it.
  Install what the task needs, when it needs it — do not pre-load packs.
- **Skills Operators Handbook** — the master catalog of the user's 342
  installed skills (496 pages):
  `C:\Users\Quality Assurance\Desktop\kimi-workspace\outputs\2026-08-29-skills-operators-handbook.pdf`
  (copy also at `Desktop\skills-operators-handbook.pdf`). When choosing which
  skill fits a job, consult it before searching externally — the capability
  usually already exists locally.
- **`grok-ecosystem-map`** skill (junctioned at
  `~/.cursor/skills-cursor/grok-ecosystem-map/`) — load it when reasoning
  about Grok/xAI tooling, running Grok agents outside the app, or choosing
  community tools for the agent team. Official repos first; community
  proxies are tools, not xAI products.
- You have FULL access to all of these. When you deploy an agent, tell it
  WHICH skills to read for its area. An unarmed agent produces slop.

## Orchestration mechanics (use your real tools)

- Register this mission with your goal tools (`create_goal` / `update_goal`)
  and use grind planning/execution for the long haul.
- Fan out **subagents** with the Task tool — `explore` for research sweeps,
  `bash`/`shell` for audits and verify gates, `browser_use` for rendering and
  clicking every screen, `debug` for dead-logic hunts, `custom` for design
  review. Run them in parallel (the local cap is ~16 running) and in the
  background with `await` when phases can overlap. Send follow-up messages to
  running subagents instead of restarting them.
- For repo-scale build work, launch **cloud agents** on
  `HoMI-Technology/Homi-Tech-Production` (one per route group, named clearly,
  based off the working branch), then poll status in batches, read
  transcripts, and collect their PRs. Stop any agent that drifts off-canon.
- This command's text does not persist between your messages — the state
  files in `docs/design/` are the durable memory. Write to them religiously.

## Phase 1 — Research (agents out)

Deploy parallel agents (cloud agents on the repo and/or subagents), one per
area, each returning a structured report — never one agent skimming everything:

- **Route auditor(s):** for each `app/(product)/` route group: does it render,
  what state is real vs mocked, which buttons/handlers are dead (onClick with
  no effect, links to nowhere, disabled-forever states), which functions are
  unreachable or duplicated, loading/error/empty states present or missing.
- **Design auditor:** every screen vs CANON/DESIGN — spacing, hierarchy,
  token drift, off-palette colors, inconsistent components, wall-of-text.
- **User-type walker:** walk the app as each persona (new user, returning,
  admin, advisor, employee, partner, household member, team) and record where
  each journey dead-ends.
- **External researcher:** current best-in-class decision/finance dashboard
  patterns — for structure and information density ideas ONLY, never for
  visual language.

Merge all reports into `docs/design/redesign-audit.md`: a ranked defect and
gap inventory with file paths. Every claim verified in-code — `gaps[]` style
hints are hypotheses until confirmed.

Start from `docs/design/redesign-audit-seed.md` — a pre-verified inventory
(nine launch-hidden routes behind `lib/layout/nav-catalog.ts`, orphaned
`/outcomes`/`/calibration`, 3-of-70 error boundaries, skeletal
partner/employee/team dashboards, `/decisions` localStorage-only, the F.15
insights-drift decide-first warning). Re-verify, then extend — don't
rediscover.

## Phase 2 — Plan

Write `docs/design/redesign-plan.md`: per route group — keep / restyle /
rebuild / build-missing, ordered by user impact. Missing pieces get built,
not stubbed: a button either works or does not exist.

## Phase 3 — Build

Work the plan. Rules while building:

- Real data paths only. If the backend piece is missing, build it (route
  handler, Supabase query, whatever the gap is) — no `// TODO` handlers, no
  `console.log` buttons, no fake numbers presented as real.
- Delete dead logic when you remove its last caller; never leave orphans.
- Reuse existing components (`components/`) before creating new ones; new
  ones must consume the token system, not hardcode colors.
- Small coherent commits per route group, Conventional Commits. Never push
  to `main` — branch + PR; main's `verify` check is the merge gate.

## Phase 4 — Verify (all must pass, every route group)

```
npm run typecheck && npm run lint && npm run test
npm run brand-check
npm run smoke        (npm run test:e2e for touched flows)
```

**Machine constraint (do not fight it):** Smart App Control blocks
`@next/swc` on this machine — `npm run build` fails locally BY DESIGN.
The build and e2e gate is CI on the PR (`verify` check). Local agents run
the gates above; cloud agents (clean Linux env) run the full chain
including build. Never "fix" the local build failure by touching SWC/babel
config.

Then **render the pixels**: load each redesigned screen in a real visible
browser and look at it before claiming it's done. Never judge visuals from
code or from a hidden tab.

## Phase 5 — Self-audit (mandatory, not optional polish)

Assume the current output is NOT the best possible. Run a hostile review pass
over your own work — ideally a fresh agent with no attachment to the code:

- Name the 3 weakest screens and WHY. Rebuild them.
- Re-run the Phase 1 dead-button/dead-logic sweep on your own output.
- Score every screen against DESIGN.md; anything below shipped-quality goes
  back to Phase 3.
- Only when a full hostile pass produces no concrete criticism does the
  phase end.

## Exit report

What was rebuilt, what was built new, what was deleted, verification output,
and an honest list of anything still short of best-possible with why.

Run `/homi-redesign-loop` to keep grinding this to zero on auto.
