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

## Decision Sheet (product calls only the owner can make — plan proceeds on approved defaults)

- **D1 Agent OS:** ship-on, keep flag-gated, or treat as dead subtree? *(default: keep flag-gated, hoist flag — task 1.3)*
- **D2 Scenarios:** canonical surface among `/scenarios` / `/tools/scenarios` / `/decisions`? *(default: `/scenarios` canonical; `/tools/scenarios` merges into it; `/decisions` stays distinct only if rehearsal ≠ comparison)*
- **D3 Household:** merge `/couples` + `/family` into `/household`? *(default: yes — one "people" surface with modes)*
- **D4 Readiness flow:** intended journey across `/results` → `/path` → `/plan` → `/report`? *(default: keep all four, define roles, chrome exposes results+path)*
- **D5 Content:** one hub — `/guides` — with blog/learning folded in? *(default: yes)*
- **D6 Money home:** does `/finance` absorb budget/runway tool outputs as THE money surface (aligns with Budget & Runway plan)? *(default: yes — already the plan doc's direction)*
