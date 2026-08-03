# Site Reorganization — Operator Handoff (2026-08-03)

All work is committed locally on a **linear stacked chain** (each branch contains all previous).
Nothing is pushed — per CLAUDE.md, the operator pushes. Every commit passed the local gate
(brand-check → architecture:check → tsc → vitest) and independent agent review; verdicts and
evidence live in `~/Desktop/kimi-workspace/docs/homi-site-reorg/` and in each commit message.

## The chain (base: main @ 427ad18)

| # | Branch | Commits | What it delivers |
|---|--------|---------|------------------|
| 1 | fix/main-typecheck-i18n-remnants | 9db3d52..cba8dea | **URGENT**: main's typecheck is red (ImpactToast imports deleted @/i18n/navigation); de-vacuated brand/boundary test gates; trinity-gap unification; Plans.md |
| 2 | chore/dead-code-sweep | aaf2270 | 13 dead files, fake heroVariant flag, analyze script, stale path comments |
| 3 | feat/nav-single-catalog | cb151e5 | one nav catalog feeds header + palette; /results in chrome; agentOs flag hoisted |
| 4 | fix/overlay-containing-block | 40fc4d1 | will-change only during page transitions (un-breaks fixed overlays) |
| 5 | docs/consolidation | 6ae19e6, 00f3600 | root docs 14→9, archives, guardrails into AGENTS.md |
| 6 | chore/route-consolidation | d0ed994 | portal stubs → redirects; /analytics folded into admin; footer completed |
| 7 | feat/ui-dedups | 3dbfff2 | ErrorBoundary/Money/NumberField/loading dedups |
| 8 | feat/tabs-primitive | d50848a | ui/Tabs + SegmentedControl; 12 bespoke switchers migrated |
| 9 | feat/btn-variants | 4bc69a2, a9733f7 | .btn-sm/.btn-danger; 74 !important patches migrated; touch keeps 44px |
| 10 | feat/toast-consolidation | e184306 | one toast queue (placement/priority); [data-priority-notice] protocol deleted |
| 11 | feat/modal-primitive | 4140b36 | ui/Modal + focus trap/scroll lock; DeleteAccountModal a11y fixed |
| 12 | feat/scenarios-merge | d62b10e | D2: Decision Lab → /scenarios#saved |
| 13 | feat/household-merge | d2dff04 | D3: /couples + /family → /household modes |
| 14 | chore/content-hubs | ff1c149 | D5: /guides hub; sitemap derives from registry; acceptance de-duped |
| 15 | chore/wave3-integration | 6fb9b00, 93e33b4 | consolidation redirects (+one-hop /es); launcher z restored |
| 16 | feat/pageframe-personal | 0537d5a | 17 pages on PageFrame; D4 readiness roles + links |
| 17 | fix/acceptance-fixtures | f7f7f16 | F.1 root-caused (stale fixture, NOT a product bug); acceptance fully green |
| 18 | refactor/brand-hex-bridge | 260a095 | lib/brand COLORS/withAlpha through 67 files; hex 291→9 in scope |

**Independent branch:** `feat/budget-runway-domain-v2` = main + 6727bfd (Budget & Runway domain
layer, 44/44 tests). Its PR's verify stays red on typecheck until branch #1 merges (base main
carries the ImpactToast bug) — merge #1 first or rebase.

## Recommended PR grouping (chain is linear; groups must merge in order)

- **PR A — Stabilize + cleanup** → push `docs/consolidation` (branches 1–5). Contains the urgent
  typecheck fix; merge first.
- **PR B — Routes + UI system wave 2** → push `feat/btn-variants` (6–9) after A merges.
- **PR C — Overlays + consolidations** → push `chore/wave3-integration` (10–15) after B.
  PR description must note: z-token CSS definitions land in 6fb9b00 but their consumers in
  4140b36 — mid-chain commits have undefined var() z-indexes (bisect hazard, final tree correct).
  Also note the CommandPalette default-order change (catalog order) and btn-sm 36px desktop height.
- **PR D — Shells + brand canon** → push `refactor/brand-hex-bridge` (16–18) after C.
  PR description must note: all 17 PageFrame-migrated pages change mobile horizontal padding
  24px→16px below the sm breakpoint (PageFrame's canonical `px-4 sm:px-6` vs the old fixed `px-6`)
  — this matches every pre-existing PageFrame surface, but spot-check one page at 375px in the
  Preview deploy. Compass canon verified untouched (byte-identical values, mark not redrawn).
- **PR E — Budget & Runway PR 1** → push `feat/budget-runway-domain-v2` any time after A.

Alternatively push every branch and open 18 stacked PRs — same order, more ceremony.

## CI expectations

- Local gate cannot run `next build` or Playwright (Smart App Control blocks @next/swc) — the
  `verify` job's build step and the e2e workflow are the remaining unverified gates. The impact-bus
  e2e gained a viewport-anchoring assertion (proves the will-change fix); expect it to run in CI.
- Acceptance suite is not a CI gate but is now fully green locally (22 pass / 8 env-skipped).

## Decisions still owned by you

1. **Task 4.4 deletions (need explicit confirmation):** three stale `.claude/worktrees/`
   (household-authz, 124-rebase, authz-reconcile) and the second writable clone
   `~/Desktop/kimi-workspace/Homi-Tech-Production` (on feat/decision-os-coherence with ~22
   uncommitted files that exist NOWHERE else — verify before deleting).
2. **C.2 impact-bus production flag:** ImpactToast's crash-on-enable is fixed in branch #1 and the
   toast now renders through the provider — after PR C merges and e2e passes, flipping
   `NEXT_PUBLIC_FF_IMPACT_BUS` in Production is safe from the code side.
3. **GO-LIVE owner items:** unchanged — §1 Resend/DNS → §3 Stripe env → §4 Vercel Pro → §5
   observability → §6 secrets (see GO-LIVE-CHECKLIST.md).

## Deferred follow-ups (tracked in Plans.md)

F.3 button tiers (btn-danger-ghost, small tier ~25 sites) · F.4 review nits (ToastProvider unit
suite, scroll-lock refcount, Escape defaultPrevented guards, ChoiceCards radio semantics) ·
F.5 brand-hex leftovers (124 lines / 28 files — personal pages + root OG images) + then a
brand-check rule banning new raw brand hex · 3.1 leftover bespoke patches.
