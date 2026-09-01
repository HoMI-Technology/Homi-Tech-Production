# HoMI Agent Knowledge Pack

**Purpose:** compiled cross-bot knowledge so ANY agent — including cloud agents that only see
this repo — inherits it. Compiled 2026-08-29 from local memory files, the `homi-orientation`
skill (+ its references), and the `homi-product-ui` skill.

**Every item is a dated snapshot, not live state.** Before asserting anything here as fact,
re-verify against current code and GitHub — the repo wins over this file, and this file wins
over older docs. Source file named in parentheses after each item.

---

## Founder rulings & canon

- **Zero-affiliate is permanent canon** (ETH_001-002, one-way door, founder-confirmed
  2026-08-05): no lender/insurance/broker referral fees, ever. Revenue = subscriptions +
  advisor/institutional SaaS only. (homi-orientation SKILL.md; state-and-plan.md)
- **Precedence algorithm for conflicts:** 1) founder's latest explicit statement (flag CANON
  contradictions, don't silently comply) → 2) SHIPPED code (verify in repo, not docs) →
  3) CANON (newest dated wins) → 4) SPEC → SCENARIO/LEGACY never override anything.
  Unresolvable → founder decision queue; never guess on CANON questions. (homi-orientation SKILL.md)
- **Naming law (founder-locked in DESIGN.md #313, 2026-08-23):** say **Decision Readiness
  Score**, never "HōMI Score" on any surface; spelling is **HōMI** (real ō, U+014D), never
  Homie/Homi user-visibly. Global sweep SHIPPED (#316, #324): 53 files, fold-wiring test
  flipped to enforce the new name. This SUPERSEDES the earlier 2026-08-05/08-10 ruling that
  kept the "HōMI-Score" label. Compass is the **Threshold Compass**, never "HōMI Compass".
  (homi-orientation-skill.md; references/canon.md)
- **D7–D9 signed by founder 2026-08-05:** D7 first active decision vertical = **car**;
  D8 = **shared bank tags** on decision-agnostic emotional/timing questions; D9 = **lean
  ~24–30-question bank** (~8–10 car-specific financial + reused pillars). **D10 resolved
  2026-09-01 (ADR-004): one completed assessment per vertical on free**; re-score of the
  same vertical is Plus+. 402 code stays `rescoring_locked`. 5.9 phase 2 (picker)
  is live: `ACTIVE_DECISION_TYPES = ['home_buying','car']`. **ADR-002:** car hard
  stops stay mapper-side (DTI / runway / credit through frozen engine slots;
  `over_20pct` → `monthlyHousingRatio = 0.46`). Do not unfreeze `lib/scoring/*`.
  (homi-decision-verticals.md; docs/adr/002-car-vertical-hard-stops.md;
  docs/adr/004-free-tier-quota-per-vertical.md)
- **Scoring canon frozen (SHIPPED):** pillars Financial Reality 35 / Emotional Truth 35 /
  Perfect Timing 30; verdicts READY ≥80 · ALMOST_THERE 65–79 · BUILD_FIRST 50–64 ·
  NOT_YET 0–49 (badge: DO NOT PROCEED); four home hard stops force NOT_YET (DTI >50%,
  housing >45% gross, runway <1 month, credit <620). Changes require ADR + founder
  sign-off. Never touch `lib/scoring/*` for vertical branching — verticals use question-bank
  tags + per-vertical mappers into the same `AssessmentInputs`. (references/canon.md)
- **AI explains; deterministic server code scores.** Never let AI/UI calculate, estimate,
  round "for feel," or override a score, DTI, runway, or verdict. Display only values
  returned by `/api/scoring`; no score digit tickers (crossfade of the final value only).
  (homi-product-ui SKILL.md)
- **Scoring internals are C2 trade secret** (post-*Alice*, patents won't protect them):
  `lib/scoring/*` is `server-only`, weights in `lib/scoring/core/weights.ts`, public surface
  = `lib/scoring/public.ts` (`PILLAR_MAX_POINTS` + `scoreToVerdict` + types). Repo is
  PRIVATE since 2026-08-05. Never value-import the engine client-side; never paste weights
  into UI copy/READMEs/marketing. The `scoreToVerdict` split between `engine.ts` and
  `public.ts` is deliberate — do not "de-duplicate" it. (homi-money-duplication-audit.md;
  homi-production-rebuild.md; references/bright-lines.md)
- **FCRA wall:** readiness outputs must never be furnished for lending/employment/housing
  eligibility decisions; consent is NOT a safe harbor. Market "readiness," never "improve
  your credit" (CROA). No fabricated metrics/testimonials/user counts anywhere (FTC 16 CFR
  465 + §5) — SCENARIO numbers (e.g. "73% wait rate", the financial model) are internal-only.
  (references/bright-lines.md; homi-product-ui SKILL.md)
- **Never-say list** (canon.md table): approved / you qualify / you should buy now /
  guaranteed / bank-level / this is financial advice / replaces your credit score /
  pre-approved / our lenders / don't wait — prices are rising. Educational-guidance
  disclaimer (`BRAND.disclaimer` in `lib/brand/guidelines.ts`) on every score/verdict
  surface. No urgency/scarcity CRO on Homie or verdicts. (references/canon.md; homi-product-ui)
- **Safety Canon is CONSTITUTIONAL** and wins over "Stop Mode" variants. Minimal set is
  SHIPPED (`lib/advisor/crisis.ts`, `lib/advisor/prompt-safety.ts`, crisis eval cases,
  word-locked 988 reply). Pre-Tier-0 rule: any explicit distress statement gets the
  empathetic response + 988 even as a single signal. Never therapy language or treating
  distress text as scoring data. (references/bright-lines.md; state-and-plan.md)
- **Other 2026-08-05 conflict-ledger rulings:** shipped scoring/pricing win over all doc
  variants (50/30/20 weights, binary-verdict PRD = LEGACY); Go/AWS architecture report =
  reference only; Kalshi/event-contract doc = separate venture, out of scope; financial
  model = SCENARIO (rebuild at 3–5% conversion before investor use); Finance v2 → port
  into `/tools` as Pro-tier. (homi-orientation-skill.md; state-and-plan.md)
- **Brand tokens (do not invent a parallel palette):** navy field `#0a1628` (never black),
  cyan `#22d3ee`, emerald `#34d399` (READY), gold `#facc15` (ALMOST), orange `#fb923c`
  (BUILD FIRST), red `#ef4444` (DO NOT PROCEED); Inter UI / Fraunces display (≤5%) /
  JetBrains Mono for scores. Third-party design/taste skills may change craft, never
  identity, math, or claims — if one conflicts with canon, ignore it. (homi-product-ui SKILL.md)
- **Never redraw the Threshold Compass from a description** (founder lock 2026-08-16).
  Authority order: `components/home/CinematicCompass.tsx` + `Compass3D.tsx` + `app/globals.css`
  (what users see, wins) → `components/brand/ThresholdCompass.tsx` (96px mark) → brand-folder
  SVG. Ban: nautical N/S/E/W rose + needle; compass never on black; `components/home/`
  already implements the whole landing page — check before designing anything visual.
  (homi-compass-source-of-truth.md; references/canon.md)
- **Decision Ladder vision (founder, 2026-08-05):** readiness for every financial decision —
  Micro (pull-only Companion answer) → Considered (car/vacation, short assessment) → Major
  (home/business, full assessment, built). Micro-verdicts show consequences; the user
  decides — never command "don't buy this" (advice-line exposure). (state-and-plan.md;
  references/bright-lines.md)

## Architecture truths

- **Canonical repo:** `C:/dev/apps/homi-production` (branch `main`) → GitHub
  `HoMI-Technology/Homi-Tech-Production` (repo ID 1293946116; the trailing-hyphen remote
  URL is a working 301 alias — don't "fix" it). Single Next.js 15 / React 19 App Router
  app. Stale paths to ignore: `HoMI_Tech_Github_Build`, Desktop paths, `Homi-Ultra-Premium-*`,
  the 4-root structure. Operator pushes; agents leave clean commits. (homi-production-rebuild.md)
- **Scale snapshot (2026-08-10):** ~93 product routes, 27 API routes, 37 DB tables, 14
  calculators, 146 test files; required CI check on main is `verify`. (state-and-plan.md)
- **Money engines duplication (audited 2026-08-09; partially fixed via PR #176):** four
  parallel engines — `lib/finance/store.ts` (legacy floats), `lib/finance/ledger.ts` +
  `local-ledger.ts` (integer cents, the SoT), `lib/planner/derived.ts`, `lib/tools/cfm.ts`.
  Governing spec: `docs/superpowers/specs/2026-08-08-money-reality-unification-design.md`
  (M1–M6 shipped; **M7 "retire classic chrome" open** — all user-visible duplication lives
  there). Measure against that spec; do not invent a fresh plan. (homi-money-duplication-audit.md)
- **`totalNetWorth` exists twice by design:** planner's (object, correct math) and legacy's
  (number, one caller in `assembleFinance`'s spec-sanctioned fallback). Different inputs,
  unmergeable — do NOT "promote and delete". Still open as of 2026-08-09: `liquidSavings`
  under-reports for non-emergency-reserve goals. (homi-money-duplication-audit.md)
- **CFM duplicated:** keep `lib/tools/cfm.ts` (overlay + coverage + tests); `lib/planner/cfm.ts`
  has 3 importers, only `estimateHousingPayment` worth saving. Formatters disagree 3 ways
  (`lib/tools/format.ts` vs `lib/finance/money.ts` vs `lib/assessment/format.ts`). Same-named
  components (ImpactToast/NumberField/ThresholdCompass) are NOT byte-identical — merging is
  real refactoring; `components/brand/ThresholdCompass` is canonical (23 importers).
  Legacy-store debt = exactly 13 shipping files. (homi-money-duplication-audit.md)
- **The calculators are NOT duplicated** — mortgage/refinance/roth/apr/heloc/fire/montecarlo/
  loanprograms are single clean implementations. Duplication is a layer beneath. (homi-money-duplication-audit.md)
- **Feature flags:** `lib/flags.ts` exports only `agentOs` (off) and `impactBus` (LIVE in
  Production, red-team verified). `NEXT_PUBLIC_FF_BUDGET_LEDGER` and `…_FINANCE_LEDGER_SYNC`
  no longer exist — the ledger ships unflagged, gated only by data presence
  (`hasSavedBudgetLedger()`). Do not look for a kill switch. (budget-runway-feature.md;
  homi-money-duplication-audit.md; homi-impact-bus-pr127.md)
- **Budget & Runway sync coverage (wired 2026-08-11, #189/#190/#192):** transactions and
  goals sync (PUT with explicit id = upsert on `(id, user_id)`); **budget periods,
  allocations, and transaction edits are still local-only** (edits need a dirty marker the
  userId convention can't express). Sync marker: row `userId` = `LOCAL_USER_ID` (never
  pushed) / `"server"` / `"server-deleted"`. (budget-runway-feature.md)
- **Planner lives on main** at `app/(product)/money/budget` (merged 2026-08-10 via #167/
  #183/#184/#185; 41 `components/planner/*` + `lib/planner/*` files). `/finance` is deleted;
  `/finance` → `/money/budget` 308 redirect exists in `next.config.ts` — don't re-add.
  9 planner directories existed on disk as of 2026-08-09 — collapse to one eventually.
  (homi-budget-planner-standalone.md; homi-money-duplication-audit.md; state-and-plan.md)
- **Decision verticals (Plans.md Phase 5):** 5.1–5.9 done. Server allowlist and picker
  both include `car`. D10 resolved (ADR-004, one-per-vertical). ADR-002 records car
  hard stops as mapper-side. `journal_entries.decision_type` is a deliberately
  SEPARATE vocabulary (career/purchase/investment/life) — never "fix" it to assessment
  canon. Career/education/business verticals do NOT map — stay "Coming soon" pending ADR.
  (homi-decision-verticals.md; docs/adr/002-car-vertical-hard-stops.md;
  docs/adr/004-free-tier-quota-per-vertical.md)
- **Scoring server-only refactor LANDED on main** (verified 2026-08-10): engine/weights/
  insights/shadow/public all guarded; `client-score.ts` is type-only + POSTs `/api/scoring`.
  Fact worth reusing: `computeShadowScore ≡ computeScore(SHADOW_DEFAULTS + inputs)` — both
  flows can share `/api/scoring`. Simulator needs a BATCH endpoint (per-tick calls would
  blow the 30/min scoring rate limit). (state-and-plan.md; homi-decision-verticals.md)
- **Tier/entitlement mapping is defined in code:** `lib/entitlements.ts` +
  `lib/stripe/tiers.ts` (Stripe $9.99/$24.99/$39.99 SHIPPED). Read those, don't guess.
  (state-and-plan.md; homi-orientation SKILL.md)
- **Launch state:** code-side launch merged; remaining blockers are owner-only per
  `GO-LIVE-CHECKLIST.md` (Resend/DNS, Stripe live env, Vercel Pro, PostHog/Sentry keys,
  Upstash/`CRON_SECRET` — crons silently dead without it). Google Search Console verified
  2026-08-23 via `public/google1fb30ef1d9b35f25.html` — **never delete that file**.
  CSP nonces deliberately NOT done (would force dynamic rendering on static marketing
  pages); revisit only hash-based. (homi-production-rebuild.md; homi-site-reorg.md)
- **Six-agent model:** Homie (sole user-facing voice, never pressures conversion) · Reality
  Check · Gut Check (not therapy) · Timing Advisor · Finance Planner · Guardrail/Auditor
  (cannot be bypassed). Background agents compute daily, **speak at most weekly**.
  (references/canon.md; references/bright-lines.md)

## Fragility & gotchas

- **Lighthouse budget on `/tools/mortgage` has ~0.2% headroom** (asserts script size
  ≤ 358400, measured ~357.5KB on 2026-08-09). Unrelated commits tip it via Next.js
  deterministic module-ID churn — adding an export to a server-only module the page never
  imports moved it +847 bytes. When the budget fails: **trace the import graph first** and
  ask if the changed module is even reachable; don't hypothesize about webpack. Only the
  `lighthouse` check catches this class; `verify`/`e2e` stay green. Also near the 0.85
  perf floor: `/how-it-works` (0.83), `/pricing` (0.84), `/tools`, `/shadow-score`, root LCP/TBT.
  (homi-lighthouse-budget-fragility.md)
- **The QA machine cannot run `next build`/`next dev`** — Windows Smart App Control blocks
  `@next/swc-win32-x64-msvc` (exit 255), so no local builds or Playwright e2e. **GitHub
  Actions (`verify` + `e2e`) is the build/e2e gate**; typecheck/vitest/brand/architecture
  run locally. Bundle questions must be answered in CI. (homi-machine-constraints.md)
- **The repo is NOT prettier-clean — never run `prettier --write`** (formatting one file
  turned a ~15-line edit into a 421-line diff; ~890 files fail `--check` on Windows CRLF).
  The config doesn't describe actual formatting and CI doesn't enforce it. Match surrounding
  style by hand; verify with `git diff --stat` vs `--stat -w`. PR #169 (2026-08-08) was a
  repo-wide Prettier sweep, so raw line counts/diffs are worthless for judging drift.
  (homi-machine-constraints.md; homi-money-duplication-audit.md)
- **Verify pixels first (feedback rule):** render a visual before proposing it; never trust
  paint/frame metrics from a hidden tab (Chrome throttles rAF to zero — three "performance
  bugs" were phantoms); read supplied brand/source folders COMPLETELY before designing —
  the brand folder contained verbatim compass markup and a reference render.
  (feedback-verify-pixels-first.md)
- **Background-tab CDP hangs:** `Runtime.evaluate` with `await`/setTimeout hangs (45s) on
  backgrounded preview tabs — use synchronous evals and re-poll. Related: the planner's
  `AnimatedNumber` counters never settle in a hidden tab, so money figures screenshot
  mid-count — verify money numbers in code, not from a hidden tab. framer-motion
  `AnimatePresence mode="wait"` wedges in background tabs — use enter-only animations for
  step flows. (homi-machine-constraints.md; homi-money-duplication-audit.md;
  homi-budget-planner-standalone.md)
- **A merge is not a deploy:** Vercel occasionally drops a push webhook silently (2026-08-11,
  PR #188 — no deployment record at all while `verify` passed). Confirm every merge by
  matching `/api/healthcheck`'s `version` field to the merge SHA (the path is
  `/api/healthcheck`; `/api/health` 404s into the marketing shell with a 200). Fix: empty
  commit on main. Piping stdin to `vercel env add` stores an EMPTY value — always use
  `--value <v>`, then `vercel env pull` and inspect. (homi-machine-constraints.md)
- **PowerShell 5.1 `Get-Content`/`Set-Content` corrupts UTF-8-no-BOM repo files** (mojibake
  on `—`/`ō`, adds BOM on write). Use Edit/Write tools or `[IO.File]::ReadAllText/WriteAllText`
  with `UTF8Encoding($false)`. (homi-machine-constraints.md)
- **`npx` run with cwd inside the repo rewrites the repo's manifest** (injected `overrides`
  into package.json during a read-only search on 2026-08-10); stray npm/npx also strips
  `libc` fields from package-lock. Run `npx` from a temp dir; `git status` the repo before
  committing. (homi-machine-constraints.md)
- **Supabase session TZ is UTC** — anything keying off `current_date` (advisor quota RPCs in
  migrations 00013/00030) rolls at 00:00Z = 8:00 PM US Eastern in summer. Founder is
  Eastern, so a user's quota "day" ends mid-evening local. Also: migration
  `00034_profile_field_locks.sql` must NOT be applied; never `supabase db push` over full
  history; RLS enabled AND FORCEd on every table; Plaid merchant strings are
  prompt-injection surface — sanitize before any LLM call. (homi-machine-constraints.md;
  references/bright-lines.md)
- **Known pre-existing bug (found 2026-08-03):** `components/layout/ClientProviders.tsx`
  keeps permanent inline `will-change: transform, opacity` on the page-transition motion.div,
  making it the containing block for fixed descendants — CompanionWidget's launcher and
  SessionExpiredToast pin to the page instead of the viewport. ImpactToast escapes via
  `createPortal(document.body)`. (homi-impact-bus-pr127.md)
- **Dead-code sweeps must resolve dynamic `import()` and barrels** or they delete working
  code: `CompanionWidget.tsx` (dynamic import in CompanionHost), `motion-features.ts`
  (pinned by perf-bundle-guards test), and the `index.ts` barrels are all falsely flagged
  by naive scanners. (homi-money-duplication-audit.md)
- **Fonts:** fontsource latin subsets lack U+014C/014D (Ō/ō) — production ships omacron
  subset woff2s in `public/fonts`; don't reinvent. (homi-budget-planner-standalone.md)
- **Always fetch and compare against `origin/main`, not local main** — a local main 98
  commits stale caused a wrong "this code never shipped" conclusion. (homi-rescue-branch-handoff.md)
- **Local pairing tooling exists** (`duo` PowerShell shell: Grok drafts → Claude reviews;
  `grok-build` rejects `--effort`; headless grok edits need `--always-approve`) — local-machine
  only, irrelevant to cloud agents. (homi-duo-shell.md)

## History that explains the present

- **Site reorg (2026-08-03):** PRs #131–#135 merged; branch protection added — `main`
  requires the `verify` status check. Explains why every PR must pass `verify`. (homi-site-reorg.md)
- **Impact Bus (PR #127, 2026-08-03):** hardened and staged behind a flag, later merged via
  the reorg chain; the `impactBus` flag is live in Production. (homi-impact-bus-pr127.md; homi-site-reorg.md)
- **Planner merge (2026-08-10):** a standalone Vite/React planner prototype was merged into
  production main as `/money/budget` (#167/#183/#184/#185); its client-side scoring export
  (`lib/score.ts` with WEIGHTS) was deliberately discarded — never resurrect it.
  (homi-budget-planner-standalone.md; homi-money-duplication-audit.md)
- **Money de-dup PR #176 (2026-08-09):** removed 3 dead modules, unified the 4 byte-identical
  temperature gauges into `lib/finance/temperature.ts`, fixed the net-worth-$0 ledger bug
  (`buildFinanceContextFromLedger` hardcoded `totalDebt = 0`). (homi-money-duplication-audit.md)
- **Rescue branch (resolved 2026-08-16):** `rescue/homi-unified-staged-20260815` is
  archive-only — the planner code it holds shipped to origin/main in evolved form; only
  process artifacts (docs/, prototype, staging) are unique. Keep the branch, never merge or
  force-push it. Rescue branches (`rescue/*`) are an established convention in this repo.
  (homi-rescue-branch-handoff.md)
- **Repo went private (2026-08-05)** after the C2 trade-secret exposure (client bundle
  leaked scoring); the server-only refactor that followed landed by 2026-08-10.
  (homi-production-rebuild.md; state-and-plan.md)
- **Naming sweep (2026-08-23):** "HōMI-Score" → "Decision Readiness Score" shipped
  product-wide (#316/#324) after an earlier guard test had deliberately enforced the old
  name — any older doc/memory saying "keep HōMI-Score" is superseded. (homi-orientation-skill.md)
