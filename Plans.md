# HōMI Site Reorganization — Plans.md

Created: 2026-08-03
Base: `main` @ 427ad18. Full audit evidence: `~/Desktop/kimi-workspace/docs/homi-site-reorg/findings.md`.
Process: harness-plan → harness-work → harness-review. One open PR per stream (AGENTS.md).
Merge gate per PR: CI `verify` job (brand-check → architecture:check → tsc → vitest → build). Never `npm run lint`.

---

## Phase 0: Stabilize main (URGENT — typecheck is red on main today)

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 0.1 | Fix `components/readiness/ImpactToast.tsx:20` — import `usePathname` from `next/navigation` (not deleted `@/i18n/navigation`); update stale locale comment + un-mock the dead module in `ImpactToast.test.tsx` [tdd:required] | `npx tsc --noEmit` exit 0; ImpactToast tests pass without mocking `@/i18n/navigation` | - | cc:Done [9db3d52] |
| 0.2 | Fix `e2e/impact-bus.e2e.ts:3` — remove/replace deleted `./helpers/locale` import; delete orphan `e2e/.locale-en.json` | `npx tsc --noEmit` exit 0 incl. e2e; e2e suite compiles | 0.1 | cc:Done [9db3d52] |
| 0.3 | Audit vacuous tests: update dead `app/[locale]/…` paths in `__tests__/readiness-impact-boundaries.test.ts:63` and `__tests__/brand-check.test.mjs` exception list to real paths [tdd:required] | Each updated assertion demonstrably fails when its guard condition is violated (mutation-check), then passes | - | cc:Done [9db3d52] |
| 0.4 | Reconcile trinity-gap duplicates: `lib/dashboard/trinity-gap.ts` (tested, unshipped) vs inline logic in `TrinityGapAlert.tsx` (shipped, untested) — one implementation, tested, shipped | TrinityGapAlert imports the lib module; threshold behavior test passes against shipped component | - | cc:Done [9db3d52] |

**PR:** `fix/main-typecheck-i18n-remnants` (0.1–0.3); 0.4 may ride along or split.

## Phase 1: Dead code removal

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 1.1 | Delete certain-dead files: `_test`, `components/admin/{CSVExport,SystemHealth,RevenueSection}.tsx`, `components/home/CompassExplainer.tsx`, `components/layout/CSSLatentFeatures.tsx`, `components/seo/StructuredData.tsx`, `lib/assessment/derive.ts`, `hooks/useDynamicTitle.ts`, `lib/tools/prefill.ts` + its test; run `npm run architecture:gen` [tdd:skip:deletion-only] | verify-equivalent local run green; `architecture:check` passes | Phase 0 | cc:Done [aaf2270] |
| 1.2 | Remove fake flag `heroVariant` + unreachable `components/home/HeroSequence.tsx` + dead ternary in marketing page | Marketing page renders InterviewHero; verify green | 1.1 | cc:Done [aaf2270] |
| 1.3 | Hoist `NEXT_PUBLIC_FF_AGENT_OS` into `lib/flags.ts`; replace 3 raw reads (`app/api/agents/route.ts`, `lib/dashboard/palette-visibility.ts`, `lib/layout/app-nav.ts`) [tdd:required] | Single flag source; flags.test.ts covers it; existing agent tests pass | Phase 0 | cc:Done [cb151e5] |
| 1.4 | Decide `bundle-size-workflow.yml`: move into `.github/workflows/` + add devDeps, or delete with `analyze` script (recommend delete for now) | No dead workflow at root; `analyze` script consistent with decision | - | cc:Done [aaf2270] (deleted; eval:companion added) |
| 1.5 | Fix stale `app/[locale]` docblock paths: `lib/auth/protected-routes.ts`, `app/sitemap.ts`, `lib/architecture/tool-aliases.ts`, `public/sw.js`, `WelcomeBanner.tsx`, `CookieConsent.tsx`; delete local `.env.local.bak` (untracked) | grep `app/\[locale\]` returns 0 hits outside archives | - | cc:Done [aaf2270] |

**PR:** `chore/dead-code-sweep`.

## Phase 2: Information architecture & navigation (product decisions required — see Decision Sheet)

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 2.1 | Nav parity: reconcile AppHeader-More vs CommandPalette from ONE catalog (`/path`,`/household`,`/scenarios`,`/tools/preflight` missing from palette; `/plan`,`/simulator`,`/genome`,`/couples` missing from header) [tdd:required] | Single source module feeds both; parity test asserts set equality (minus deliberate exceptions list) | Phase 0 | cc:Done [cb151e5] |
| 2.2 | Expose `/results` (readiness verdict!) in AppHeader + palette | `/results` reachable from chrome; nav test passes | 2.1 | cc:Done [cb151e5] |
| 2.3 | Kill portal stubs: point marketing `/partner` + `/employee` links at `/partner/dashboard` + `/employee/dashboard`; add permanent redirects in `next.config.ts`; delete stub pages; update `protected-routes.ts` | Old URLs 308-redirect; route-protection test updated | Phase 0 | cc:Done [d0ed994] |
| 2.4 | Resolve `/analytics` orphan: fold into `/admin/marketing` (it's a strict subset) and delete, or move under `/admin` layout wall | No admin surface outside central protection list; route-protection test covers it | Phase 0 | cc:Done [d0ed994] |
| 2.5 | Scenario consolidation per decision sheet (D2): `/scenarios` vs `/tools/scenarios` vs `/decisions` | One canonical scenario surface + redirects; registry lists whatever remains under /tools | D2 | cc:Done [d62b10e] |
| 2.6 | Household consolidation per decision sheet (D3): `/household` vs `/couples` vs `/family` | Agreed target structure live + redirects | D3 | cc:Done [d2dff04] |
| 2.7 | Readiness output flow per decision sheet (D4): `/results`, `/path`, `/plan`, `/report/{id}` roles defined; orphaned `/report/{id}/path-certificate` linked or removed | Each surviving page reachable; no hard orphans | D4, 2.2 | cc:Done [0537d5a] |
| 2.8 | Content hubs per decision sheet (D5): `/blog`, `/guides`, `/learning` — one hub in chrome, others merged/redirected | No sitemap-only content hubs | D5 | cc:Done [ff1c149] |
| 2.9 | Sitemap from registry: derive `app/sitemap.ts` TOOL_SLUGS from `lib/tools/registry.ts`; add `/tools/scenarios` to registry if it survives D2 [tdd:required] | Sitemap test asserts registry parity | 2.5 | cc:Done [ff1c149] |
| 2.10 | Small orphan triage: `/artifact` (delete or add footer link its docblock claims), legal trio in footer, `/status` in footer, `/demo` entry point, agent-hub gating consistency (admin rail unconditional vs flag) | Zero hard orphans; gating consistent | Phase 0 | cc:Done [d0ed994] (/artifact stays direct-URL per AUDIT T2.8) |

**PRs:** `feat/nav-single-catalog` (2.1–2.2), `chore/route-consolidation` (2.3–2.4, 2.10), then one PR per approved consolidation (2.5–2.9).

## Phase 3: UI primitive unification (order: effort → impact)

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 3.1 | Add `.btn-sm`/`.btn-lg`/`.btn-danger`/`.btn-block` to globals.css; migrate the 132 `!important` size patches (49 files) + `!bg-crimson` destructive hacks | grep `btn.*!p[xy]-` ≈ 0; brand-check green | Phase 0 | cc:WIP [4bc69a2] (74/131 migrated; ~40 bespoke tiers + toast/finance skip-files cataloged; 36px height flagged for design review) |
| 3.2 | Toast consolidation: extend `ui/ToastProvider` with `placement`/`priority`; migrate `ImpactToast` + `SessionExpiredToast` into it; delete `[data-priority-notice]` MutationObserver protocol [tdd:required] | One toast queue; impact-bus e2e green flag-on and flag-off | 0.1, 0.2 | cc:Done [e184306] (e2e proof runs in CI) |
| 3.3 | Fix `ClientProviders.tsx` will-change containing-block bug (animate-time-only will-change) so `position:fixed` works for all overlays | CompanionWidget launcher + toasts pin to viewport on scroll (e2e assertion) | - | cc:Done [40fc4d1] (e2e proof rides with 3.2 in CI) |
| 3.4 | Build `components/ui/Tabs.tsx` (tablist + roving tabindex, seeded from finance page) + `SegmentedControl.tsx`; migrate the 12 bespoke implementations; dedup ChoiceCards vs FullAssessmentFlow | All tab UIs use primitives; a11y roles correct; axe pass on migrated pages | Phase 0 | cc:Done [d50848a] |
| 3.5 | Build `components/ui/Modal.tsx` (portal, focus trap, Escape, scroll lock) + z-index token scale; fix DeleteAccountModal a11y first; migrate 7 modal implementations [tdd:required] | DeleteAccountModal has role=dialog/trap/Escape; z-index from tokens | 3.3 | cc:Done [4140b36] |
| 3.6 | Extend `operate/PageFrame` to personal surfaces (dashboard, finance, journal, family, path, daily, calendar, connections, results…); reconcile ToolShell | Hand-rolled `mx-auto max-w-*` shells ≈ 0 on product surfaces | Phase 2 | cc:Done [0537d5a] (17 migrated; bespoke shells documented in-code) |
| 3.7 | Dedups: ErrorBoundary ×2, Money/NumberField ×2, three byte-identical loading.tsx → shared, dashboard loading.tsx onto Skeleton | One implementation each; verify green | Phase 0 | cc:Done [3dbfff2] (daily/loading + ProductLoadingSkeleton kept deliberately) |
| 3.8 | Brand hex bridge: export canonical colors from `lib/brand`; thread through SVG/imperative components (~96 files, mechanical) | New hardcoded brand hex in TSX blocked by brand-check rule | 3.1 | cc:WIP [260a095] (components+admin+marketing done, hex 291→9; rule lands after F.5) |

**PRs:** one per task (3.1 → 3.8 in order); each ≤ ~50 files, mechanical migrations split if larger.

## Phase 4: Docs & launch readiness

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 4.1 | Extract BUILD-BRIEF §1 guardrails into AGENTS.md; archive AUDIT-2026-07-08, BUILD-BRIEF, COMPANION-INTELLIGENCE-AUDIT, TOOLS-REDESIGN, LAUNCH-RUNBOOK (keep its key-file map in docs/); delete/merge LAUNCH.md into GO-LIVE-CHECKLIST | Root .md count ≤ 8; no doc contradicts shipped reality | - | cc:Done [6ae19e6] (9 incl. Plans.md) |
| 4.2 | Refresh README + DEPLOY (migration numbering, current route map); fix repo CLAUDE.md stale `Local:` path | Docs match repo state | 4.1 | cc:Done [6ae19e6] |
| 4.3 | Wire `eval/companion-honesty` to `npm run eval:companion` | Script exists and runs | - | cc:Done [aaf2270] |
| 4.4 | Clean 3 stale `.claude/worktrees/` (household-authz, 124-rebase, authz-reconcile) after verifying no unmerged work; confirm `~/Desktop/kimi-workspace/Homi-Tech-Production` clone's ~22 uncommitted files are preserved elsewhere before ANY deletion | No second writable copies; nothing lost (user confirms) | user confirm | cc:Done (user approved rescue-then-delete; 4 worktrees removed clean, branches retained; the kimi-workspace clone was already deleted before this session — nothing to rescue) |
| 4.5 | Owner-only launch items tracked (not agent work): Resend/DNS §1, Stripe env §3, Vercel Pro §4, observability §5, secrets §6 | GO-LIVE checklist boxes ticked by owner | - | cc:TODO |

## Phase 5: Decision-vertical branching (assessment)

Trigger: `lib/assessment/types.ts:11-16` — "No branching logic exists yet; this is purely a UI foundation."
Constraint (AGENTS.md guardrail 1): scoring canon frozen, **never touch `lib/scoring/*`** — branching lives in the
question bank (`decision_types` tags, already filtered by `buildAssessmentFlow`) and a per-vertical input-mapper
layer feeding the same frozen engine. Evidence: bank.ts 45×`['home_buying']`; to-inputs.ts home-only;
route.ts:107 hardcodes `decision_type: "home_buying"` on insert. Note: `journal_entries.decision_type` is a
deliberately SEPARATE vocabulary (career/purchase/investment/life — journal/page.tsx) — do not "fix" it to canon.

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 5.1 | Server-honest decision_type: POST `/api/assessments` accepts optional `decisionType` (extend `lib/validation/assessment.ts`), validated server-side against `ACTIVE_DECISION_TYPES` (allowlist, not client claim); persist it at route.ts:107 instead of the hardcode, defaulting `home_buying` when absent [tdd:required] | Inactive/unknown decisionType → 400; active type lands in `assessments.decision_type`; existing route tests green | - | cc:Done [3722a50] |
| 5.2 | Thread picker value through submit: `FullAssessmentFlow` (and shadow submit path) sends `decisionType` in the payload [tdd:required] | Completed assessment row's decision_type equals picker value | 5.1 | cc:Done [3722a50] (full flow; shadow stays home default) |
| 5.3 | Slug canon (rescoped): canon test asserting every decision-type literal in the ASSESSMENT domain (lib/assessment, lib/questions, components/assessment, app/api/assessments) ∈ `DecisionType`; journal vocabulary is separate by design and out of scope [tdd:required] | Canon test fails on foreign slug (mutation-checked); active set ⊆ canon asserted | - | cc:Done [3722a50] (mutation-checked) |
| 5.4 | DB guard: migration adding CHECK on `assessments.decision_type` ∈ 5 canon slugs (posture strengthens; RLS untouched) [tdd:skip:migration-only] | Migration applies clean; foreign-slug insert rejected | 5.1 | cc:Done [3722a50] (authoring-only, pending approval gate) |
| 5.5 | Mapper registry: refactor `lib/questions/to-inputs.ts` into per-vertical mapper dispatch keyed by `DecisionType` (home mapper behavior-identical; unmapped vertical rejected) [tdd:required] | Snapshot test: home fixture responses score identically pre/post refactor; `lib/scoring/*` diff = 0 | 5.1 | cc:TODO |
| 5.6 | Car question bank per D7/D8/D9: author `car` financial questions (price, down payment, all-in monthly cost incl. insurance); tag decision-agnostic emotional/timing questions `['home_buying','car']`; seed-SQL parity [tdd:required] | `buildAssessmentFlow('car')` yields full 3-pillar flow; bank/seed parity test green | D7, D8, D9, 5.5 | cc:TODO |
| 5.7 | Car input mapper → frozen `AssessmentInputs` (down payment % of car price; DTI incl. est. new payment; `monthlyHousingRatio` omitted — home-only guard per engine docblock) [tdd:required] | Car fixture → deterministic verdict; DTI>50% / runway<1mo / credit<620 hard stops fire; engine untouched | 5.5, 5.6 | cc:TODO |
| 5.8 | Per-vertical copy: parameterize `PILLAR_INTRO` ("Fifteen questions…"), picker hint, results/insights home-specific strings | grep home-buying copy on car results path = 0; brand-check green | 5.6 | cc:TODO |
| 5.9 | Activate: `ACTIVE_DECISION_TYPES += 'car'`; picker enables it; retire the types.ts:11-16 "no branching logic" comment; e2e full car assessment → verdict. Activation is TWO-PHASE (expand→contract, Fowler ParallelChange): deploy 1 widens the SERVER allowlist only; deploy 2 enables the picker — else rolling-deploy skew 400s (new client → old server), currently swallowed per F.12. Requires D10 answered and F.14 e2e pinning landed first | Car e2e green in CI; home e2e unchanged; two-deploy sequence documented in PR | 5.1–5.8, D10, F.14 | cc:TODO |

**PRs:** `feat/decision-type-honest-persistence` (5.1–5.4), `refactor/vertical-mapper-registry` (5.5), `feat/vertical-car` (5.6–5.9, after D7–D9 sign-off).

## Phase 5L: Launch product honesty (L1+L2 green chrome) — 2026-08-05

**DoD for "100% working website":** L1 anonymous funnel green + L2 account surfaces coherent + chrome only advertises launch surfaces + pricing promises ⊆ entitlements. **Not** all 94 routes. **Not** Vercel Pro.

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 5L.1 **CL-01** | Assessment decision-type honesty: only show active types (home_buying) or skip picker when single active; zero "Coming soon" badges on `/assessment` | No "Coming soon" in assessment UI; home_buying flow still works | - | cc:Done (feat/launch-product-honesty) |
| 5L.2 **CL-06** | Launch nav: hide incomplete More/palette product surfaces (genome, twin, trinity, signals, credit, daily, calendar, decisions; keep path/results/plan/finance/advisor/journal/household/scenarios/preflight/connections) | nav-catalog-parity green; HEADER_MORE is launch set only | - | cc:Done (feat/launch-product-honesty) |
| 5L.3 **CL-09** | Companion free vs paid labeling aligned with entitlements (Chat + widget) | Free users see rule-based/limited copy; paid sees full; no over-promise | - | cc:Done (feat/launch-product-honesty) |
| 5L.4 **CL-03** | Finance dual-path polish: real loading for dynamic tabs; demote or label legacy Cash Flow/Debt/MC/Net Worth as secondary if ledger is SoT | No blank-flash on Budget/Plan; tab labels honest | - | cc:Done (feat/launch-product-honesty) |
| 5L.5 **CL-07/08** | Connections Plaid soft-sell if unconfigured; household familySeats enforced server-side | No false bank-sync promise; invite over-cap blocked | 5L.2 | cc:TODO |
| 5L.6 | Signed-in L2 QA checklist (manual): finance, companion, subscription free+paid | Checklist results in findings | 5L.1–5L.4 | cc:TODO |

**PRs:** `feat/launch-product-honesty` (#153).

## Phase 6: Scoring server-only (founder-approved 2026-08-05 — trade-secret bright line)

Client components value-import `computeScore`/`computeShadowScore`/insight generators — engine internals ship
in the client bundle. Blast radius (verified by grep, this session): flows ×2; /results + /plan (generators);
`lib/simulator.ts` (spreads via `hooks/use-readiness.ts` + `lib/tools/readiness-bands.ts`); `lib/readiness/preflight.ts`;
`lib/household/dual-score.ts` (scoreToVerdict only); ~12 client sites value-import PILLAR_MAX_POINTS (public canon
35/35/30 — the constant is public; the curves are not). `computeShadowScore` ≡ `computeScore(SHADOW_DEFAULTS+inputs)`
(shadow.ts:20-30) and ShadowScoreFlow already builds identical padding — both flows can share /api/scoring.

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| 6.1 | Public seam: `lib/scoring/public.ts` exporting PILLAR_MAX_POINTS + scoreToVerdict (public 80/65/50 thresholds) + type re-exports; migrate all client value-import sites incl. dual-score [tdd:required] | Only flows/generators/simulator/preflight sites (6.2–6.4) still value-import non-public scoring; tsc green | - | cc:Done (#149) |
| 6.2 | Flows → server scoring: extend /api/scoring to return the full AssessmentResult (sub-factor breakdowns are public UI output) + insights; both flows await it (shadow reuses its existing padded inputs); submitting state; scoring-call failure feeds the F.12 save-status channel [tdd:required] | Zero @/lib/scoring value imports in flows; anonymous flow works (route is auth-free); parity test: API result === engine result for same inputs | 6.1 | cc:Done (refactor/scoring-server-flows) |
| 6.3 | Insights via storage (resolves F.15): StoredAssessment gains optional `insights`; flows persist API-returned insights; `mapAssessmentRowToStored` threads the DB `insights` column; /results + /plan render stored insights with one-shot /api/scoring backfill for legacy local payloads [tdd:required] | No generator imports outside server code; legacy localStorage payloads backfill, never crash | 6.2 | cc:TODO |
| 6.4 | Simulator + preflight server-side: batch endpoint (baseline + all lever variations in ONE call — per-tick round-trips would blow the 30/min scoring rate limit); migrate ScoreSimulator, use-readiness.ts, readiness-bands.ts, preflight consumers; debounce + pending UI | Zero engine value-imports anywhere in the client module graph | 6.1 | cc:TODO |
| 6.5 | Enforcement: `import "server-only"` in engine/insights/shadow/weights; vitest configs alias server-only → no-op stub; bundle proof: CI build + grep client chunks for an engine-only sentinel string absent | Poisoned modules unbuildable from client code; sentinel absent from client chunks; verify green | 6.2–6.4 | cc:TODO |

**PRs:** `refactor/scoring-server-only` (6.1–6.3), then `refactor/simulator-server-scoring` (6.4), then enforcement rides with 6.5.

## Carried threads (parallel, not blocked by phases)

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| C.1 | Budget & Runway PR 1: cherry-pick baf5ba4 (+e02a53b docs if wanted) onto fresh branch from main; open PR | verify green; PR open per plan doc ladder | Phase 0 | cc:TODO |
| C.2 | Impact bus production rollout decision (after 0.1 fix — flag-on currently crashes prod layout) | Flag flipped or explicitly deferred | 0.1, 3.2 | cc:TODO |

---

## Found during execution

| Task | Description | DoD | Depends | Status |
|------|-------------|-----|---------|--------|
| F.1 | Pre-existing acceptance failure: `__tests__/acceptance/shares-ownership.test.ts` "allows sharing an assessment the caller owns" fails on this branch AND in all three frozen `.claude/worktrees` snapshots (predates this work; not in CI verify gate). Diagnose and fix or document env dependency | Acceptance suite green locally or failure root-caused + documented | - | cc:Done [f7f7f16] (stale fixture predating share caps — ownership gate intact; NOT a product bug) |
| F.2 | Acceptance config sweeps `.claude/worktrees/**` duplicating every suite ×4 — exclude that dir in vitest.acceptance.config.ts (also mooted if 4.4 removes the worktrees) | Acceptance run contains no worktree duplicates | - | cc:Done [ff1c149] |
| F.3 | Button follow-up tiers from 3.1 review: `.btn-danger-ghost` (crimson-outline pattern, 5 patches in settings), the `!px-3 !py-1.5` small tier (~25 sites), chat-send tier; SegmentedControl disabled+selected tabbable guard; SegmentedLinkNav aria-current="page" | Remaining `!p[xy]` patches < 10 repo-wide | 3.1 | cc:Done [302286a] (7 remain, each justified in-commit) |
| F.5 | Brand-hex leftovers: 124 lines / 28 files (personal product pages, root OG images, app/layout.tsx) → COLORS/withAlpha; add withAlpha input guard or unit test; drop dead COLORS.slate alias; THEN add brand-check rule banning new raw brand hex in TSX outside lib/brand; spot-check one PageFrame page at 375px in Preview (mobile gutter 24→16px normalization) | grep brand hex in app/components (excl. lib/brand, tests) = 0; rule active | 3.8 | cc:Done [302286a] (BRANDHEX rule live in brand-check) |
| F.4 | Wave-3 review follow-ups (non-blocking): ToastProvider unit suite (placement-scoped suppression, notify-null, displacement onDismiss); useScrollLock refcount for out-of-order overlay close; Modal/useFocusTrap ignore defaultPrevented Escape + palette preventDefault; ImpactToast priority-test fetch-restore hook order; ChoiceCards → radio semantics; z-token hunk rode 6fb9b00 not 4140b36 (note in PR description, bisect hazard mid-chain) | Each item closed or explicitly waived in review | 3.2, 3.5 | cc:Done [7b2095e] (DeleteAccountModal exit-anim + Toast static rgba explicitly waived) |

| F.7 | Vercel routing: /es/* one-hop redirect rules are dead in production (earlier routing phase serves the catch-all; verified live 2026-08-03 incl. the pre-existing /es tool aliases). Two-hop works, so cosmetic — investigate deployment routes-manifest.json or drop the one-hop entries | /es/couples resolves in one hop on Vercel OR entries removed with rationale | - | cc:TODO |
| F.6 | Toast a11y hardening (from external prior-art research vs sonner/Radix/react-hot-toast): (a) verify live-region containers are persistently mounted (not injected with the toast); (b) pause timers on window blur/focus loss, not just hover (WCAG 2.2.1); (c) viewport hotkey (Radix uses F8) so keyboard users can reach toasts pre-dismiss; (d) repeat-toast re-announcement; (e) consider queueing (not dropping) suppressed lower-priority toasts — ecosystem norm is stack-with-limit (sonner visibleToasts=3). Also: framer belt-and-braces — set willChange in every variant target or onAnimationComplete fallback, and pin motion version (transitionEnd has regressed upstream twice: motion #2317, 12.31.1 changelog) | Each item closed or explicitly waived | 3.2 | cc:TODO |
| F.11 | Draft resume didn't validate decisionType: a stale/foreign slug resumed into a zero-question flow (`buildAssessmentFlow` filters to nothing), scored an empty response map locally, and the server 400 was swallowed → `loadDraft` now rejects non-active slugs [tdd:required] | Draft with canon-inactive or foreign slug → loadDraft null (tests) | 5.1 | cc:Done (this stream) |
| F.12 | Silent submit failure (pre-existing, worsens with verticals): FullAssessmentFlow + ShadowScoreFlow swallow 400/402/500 (`if (!res.ok) return`); `rescoring_locked` 402 is consumed by NO client; SessionExpiredToast patches 401 only; `router.push` races the fetch (component can unmount mid-request). Consider `lib/persistence.ts` createSyncedResource queue/flush/keepalive semantics for the save | Signed-in user sees save-failed state; 402 surfaces upgrade prompt; proof test | - | cc:TODO |
| F.13 | Onboarding replay (`app/(product)/onboarding/page.tsx:32-36`) re-posts the anonymous local result with NO decisionType → will mislabel non-home verticals as home_buying once verticals activate; blocked on StoredAssessment carrying decisionType (5.8) | Replayed row's decision_type matches the original assessment's vertical | 5.8 | cc:TODO |
| F.14 | e2e vertical-activation hazard: `e2e/helpers/assessment.ts` picks `button[role="radio"][aria-checked="false"]:not([disabled])` — today that matches nothing on the decision step (home preselected, rest disabled), but the moment a second vertical activates it will CLICK that vertical and silently switch the whole e2e. Pin the decision type by accessible name before 5.9 | Helper selects decision type explicitly, parameterized; home e2e provably stays home | before 5.9 | cc:TODO |
| F.15 | Insights render duality: `/results` + `/plan` RECOMPUTE generateKeyInsight/NextSteps client-side while `/report/[id]` (+print) renders the row's stored `insights` column — per-vertical copy must cover both paths, and stored copy already drifts from rendered whenever generators change | One documented source of truth per surface; 5.8 covers both paths | 5.8 | cc:TODO |

## Decision Sheet (product calls only the owner can make — plan proceeds on approved defaults)

- **D1 Agent OS:** ship-on, keep flag-gated, or treat as dead subtree? *(default: keep flag-gated, hoist flag — task 1.3)*
- **D2 Scenarios:** canonical surface among `/scenarios` / `/tools/scenarios` / `/decisions`? *(default: `/scenarios` canonical; `/tools/scenarios` merges into it; `/decisions` stays distinct only if rehearsal ≠ comparison)*
- **D3 Household:** merge `/couples` + `/family` into `/household`? *(default: yes — one "people" surface with modes)*
- **D4 Readiness flow:** intended journey across `/results` → `/path` → `/plan` → `/report`? *(default: keep all four, define roles, chrome exposes results+path)*
- **D5 Content:** one hub — `/guides` — with blog/learning folded in? *(default: yes)*
- **D6 Money home:** does `/finance` absorb budget/runway tool outputs as THE money surface (aligns with Budget & Runway plan)? *(default: yes — already the plan doc's direction)*
- **D7 First active vertical:** which decision type activates first? *(default: `car` — the only vertical whose finances map 1:1 onto the frozen engine inputs; career_change/education/starting_a_business need input semantics the scoring canon freezes → they stay "Coming soon" pending an ADR)*
- **D8 Bank sharing:** tag decision-agnostic emotional/timing questions with multiple `decision_types` vs. duplicating rows per vertical? *(default: shared tags — DRY, stable ordering, one edit point)*
- **D9 Car bank depth:** full 45-question parity with home vs. lean bank? *(default: lean ~24–30 — reuse emotional+timing pillars wholesale, ~8–10 car-specific financial questions; parity padding would invent filler)*
- **D10 Free-tier quota × verticals:** the free-tier gate counts ALL completed non-shadow assessments (no decision_type filter, route.ts) — one home assessment consumes the lifetime quota for every future vertical. One-total (protects rescoring upsell) vs one-per-vertical (each vertical gets a first taste)? *(default: decide at 5.9 activation; must be explicit before car ships or free users hit an unexplained 402)*

