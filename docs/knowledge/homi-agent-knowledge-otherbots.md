# HoMI knowledge swept from other AI assistants' stores (Grok / Kimi / workspace)

**Purpose:** Durable HoMI/HōMI product knowledge found in Grok Build, Kimi, and kimi-workspace
memory/knowledge stores that is not in this repo. Compiled 2026-08-29.
**Merge candidates into `homi-agent-knowledge.md` after human/orchestrator review.**
Items marked STALE-SUSPECT reference known-retired eras (Desktop repo paths, HoMI_Tech_Github_Build,
ultra-premium 4-root) — verify against origin/main before trusting.

## Partner access / legal canon (strongest corpus — 2026-08-26/28, Kimi superpowers vault)

- Binding product decision: companies never get a "Homi score" or lookup API — only a hosted consent
  session that mints an audience-bound receipt, verified with `homi_live_`/`homi_test_` keys +
  `Homi-Purpose: educational_guidance`; the 0–100 never appears on partner JSON, partner dashboard
  rows, or anonymous `/share`; HōMI is not a CRA in this entity; affiliate READY-lead marketplaces
  forbidden; live self-serve keys gated on counsel + KYB. (C:\Users\Quality Assurance\Desktop\kimi-workspace\docs\superpowers\specs\2026-08-26-partner-readiness-ssot.md)
- Coarseness invariant (non-negotiable): public `/share` must always show less-or-equal information
  than the partner API. As of 2026-08-26 production VIOLATES this — API returns bands but
  `/share/[token]` renders anonymous integer 0–100 + "HōMI-Score" via `get_shared_assessment`
  granted EXECUTE to anon; Slack unfurl counts as furnishing. (same SSOT, §B–C)
  - **PARTIALLY STALE, corrected 2026-08-30.** The naming half no longer holds:
    `app/share/[token]/page.tsx` at `3bfe729` says **"Decision Readiness Score"**
    in both the aria-label and the caption, per the Marketing state packet's grep.
    **The coarseness question itself is NOT resolved by that** — whether the page
    still exposes a 0–100 integer where the API returns bands is a separate check
    nobody has run at this SHA, and it remains a founder-facing legal item.
- Legal reasoning on record: FCRA §603(d)/§604 "used or expected to be used" test; *Kidd v. Thomson
  Reuters* — disclaimers lose, operational gates (credential, contract, monitor, cut off) win;
  Instant Checkmate analogs; consent ≠ CRA exemption; California DROP live 2026-08-01. Eligibility
  purpose strings must 404 (not 403-with-a-menu). (same SSOT §C; ...partner-readiness-receipt-rfc.md)
- Partner receipt v1 payload (RFC default, founder gate 1/2/3 UNANSWERED as of 2026-08-26): verdict +
  scoreBand + pillar bands + `purpose` + `scoreName: "Decision Readiness"` + `notFor:
  ["credit","employment","housing","insurance"]`; no `overall_score`. If counsel demands
  attestation-only, strip verdict/bands from the wire without adding lookup. (SSOT §D; RFC)
- Uncommitted work existed on worktree `Desktop/homi-worktrees/partner-receipt-api`
  (`feat/partner-receipt-api`): purpose-lock on `GET /api/v1/receipts/:token` (tests 18/18) — coded,
  not committed; audience bind (`aud`), 404 collapse, 32-hex token min, `POST /api/v1/share-sessions`,
  `/developers` preview, JWKS all NOT built. (SSOT §E–F)
- Two-piece architecture ruling (2026-08-28): Piece 1 = consumer Plaid **Inc.** Link/Transactions +
  Homie (never Plaid Check, which is the CRA product); Piece 2A = hosted session → educational
  receipt. Lender "should we proceed" eligibility API is out of Homi-Tech (deferred separate CRA
  entity); no dual-use integer (CFPB 2017 Equifax/TransUnion analog). Plaid merchant strings are
  untrusted prompt-injection input to Homie — pass category totals, not raw memos. (C:\Users\Quality Assurance\Desktop\kimi-workspace\docs\superpowers\specs\2026-08-28-two-piece-homi-legal-design.md)
- Canon phrasing locked: Homie is the only voice (five specialists have no public mouths); never-say
  list: approved / you qualify / you should buy now / guaranteed / financial advice / "replaces your
  credit score"; crisis state never visible to partners. (same file §2.3)
- Vault mirrors: decision + pattern records at Desktop\kimi-workspace\vault\decisions\2026-08-26--partner-readiness-receipt.md
  and vault\patterns\consumer-initiated-readiness-receipt.md (SSOT wins on drift).

## Launch completeness (2026-08-05 audit — dev workspace docs)

- Launch definition of done: "100% working" = anonymous funnel loop L1 green + authenticated loop L2
  green + chrome only advertises green surfaces + pricing promises ⊆ entitlements — NOT all 94 routes.
  Anonymous assessment is first-class (client-scored, `localStorage` key `homi:last-assessment`,
  background POST /api/assessments 401s by design). (C:\dev\kimi-workspace\docs\HOMI-LAUNCH-ROUTE-MATRIX.md)
- P0 honesty issues logged 2026-08-05: assessment showed 4 inactive decision types as "Coming soon"
  (`ACTIVE_DECISION_TYPES=["home_buying"]`); nav marketed unfinished Labs surfaces (agents, genome,
  twin, trinity, signals, credit, daily, calendar); finance dual-path (ledger vs legacy tabs) named
  the top money-trust risk — "pick one default, don't dual-truth". Verify current state before reuse.
  (same file, Parts 4–9)
- Recommended launch nav frozen in that doc (Part 10) plus a signed-in QA protocol (3 account tiers,
  stop conditions) that was never executed in that session. (same file §9.3)

## Brand / icon pipeline (2026-07-29, Kimi vault — mostly not in repo)

- Wordmark canon: Inter 900, letterSpacing −0.02em (NOT Fraunces — a Fraunces icon wordmark was built
  and retracted; `Wordmark.tsx` inherits body font = Inter). Letter colors H cyan #22d3ee ·
  ō emerald #34d399 · M gold #facc15 · I cyan; shipped og-v2.png once violated this (M and I both
  gold). (C:\dev\kimi-workspace\vault\decisions\2026-07-29--homi-icon-system-redesign.md)
- Gotcha: `@fontsource-variable/fraunces` splits by unicode-range — `latin` renders ō (U+014D) as
  tofu, `latin-ext` the inverse; neither subset can set "HōMI" alone; bbox checks report false
  success on .notdef. Repo ships `public/fonts/inter-omacron.woff2` (U+014C-014D only) for this.
  (same decision + C:\dev\kimi-workspace\vault\patterns\icon-pipeline.md)
- Gotcha: `public/sw.js` precaches icon/OG URLs cache-first — reusing `-v2` filenames requires bumping
  `CACHE_VERSION` (was bumped homi-v4 → homi-v5) or returning visitors keep old art forever. (same decision)
- Icon direction locked 2026-07-29: D3 = "Depth & Materiality" (radial-gradient ground, variable ring
  weights cyan 2.5/emerald 2/gold 1.5, colored bloom, fine grain); geometry constants: 200-unit box,
  ring radii 85/60/35. Open debt as of that date: generator lives OUTSIDE the repo
  (`Desktop\HoMI-Icon-Assets\build_brand_assets.py` + `verify_assets.py`, rollback
  `restore_original_assets.ps1`) — assets unreproducible from repo (M3), and in-product
  `ThresholdCompass.tsx` diverges visually from the icon stroke hierarchy (M4). (same decision)
  STALE-SUSPECT on path only: repo cited as `~/Desktop/HoMI_Tech_Github_Build` (known-stale local
  clone); asset facts refer to the production repo's public/ files.

## Plaid setup facts (2026-08-18, Desktop workspace docs)

- Vercel project `homi-platform` (team `homi-tech`): PLAID_CLIENT_ID/SECRET/ENV/TOKEN_KEY set on
  Production + Preview but MISSING from Development — `vercel env pull` won't include Plaid locally;
  `PLAID_ENV=sandbox`; link token sends neither `webhook` nor `redirect_uri`; intended webhook URL
  https://homitechnology.com/api/plaid/webhook. (C:\Users\Quality Assurance\Desktop\kimi-workspace\docs\2026-08-18-plaid-setup\findings.md)
- Plaid account: signed up 2026-05-04 as Cody Short / info@homitechnology.com; Pay As You Go
  submitted, production access requested same week, no approval email found as of 2026-08-18; unread
  AE check-in from Ankita Bhat (abhat@plaid.com) dated 2026-07-14; priced Transactions $0.30 /
  refresh $0.12 — do not publish as marketing. (same file)
- `HOMI_APP_build` is a different/older Vercel app with placeholder Plaid values — ignore. (same file)

## Site/repo governance gotchas (2026-08-03 audit — dev workspace docs; reorg PRs #131–#135 merged since, re-verify)

- `npm run lint` hangs and is NOT a gate — real gates are the CI `verify` job: brand-check →
  architecture:check → tsc --noEmit → vitest run → next build; E2E separate. Never
  `supabase db push` (migration ledger diverged: 139 remote vs 42 local rows); reachable Supabase is
  production — no destructive Playwright. (C:\dev\kimi-workspace\docs\homi-site-reorg\findings.md)
- Launch-blocker owner items as of 2026-08-03: Resend/email DNS (sender hardcoded
  `hello@homitechnology.com` in 3 files), Stripe env vars in Vercel, Vercel Pro, observability,
  secrets. Design canon: three surface modes PERSUADE / OPERATE ("Cockpit Linear" locked) / CHROME
  (dual shell intentional). (same file)
- UI-debt inventory (2026-08-03 severity audit): 7 independent modal implementations (no shared focus
  trap; DeleteAccountModal a11y defect), 12 bespoke tab implementations (only finance/page.tsx
  a11y-correct), 440 hardcoded brand hex in 96 TSX files, 3 byte-identical loading.tsx, duplicate
  ErrorBoundary/Money/CSVExport; recommended unification order starts with `.btn` size/danger CSS
  variants. Partially addressed by reorg waves — treat as checklist, not current truth. (same file)

## Budget & Runway binding decisions (2026-08-02, dev workspace docs)

- Money = integer cents everywhere (`lib/finance/money.ts` sole float↔cent bridge, $100M ceiling
  mirrored in Zod); five transaction types (income/expense/transfer/refund/adjustment) — transfers
  are never spending, refunds reduce net category spend; vocabulary is deliberately split (income,
  net expenses, cash remaining, goal reserve, free cash) — never one "remaining".
  (C:\dev\kimi-workspace\docs\budget-runway-plan.md)

## Stale-era records (kept for provenance — do NOT act on)

- STALE-SUSPECT: 2026-05-30 "ultra-premium extraction" plan chose extract-and-elevate the Vite SPA +
  Hono over Next.js — entire premise superseded by Homi-Tech-Production (Next.js 15); durable brand
  bits it carries: Unicode ō = U+014D everywhere, Threshold Compass as canonical brand artifact,
  7 AI agent personas, `lib/brand/guidelines.ts` as brand SSOT. (C:\Users\Quality Assurance\.kimi\plans\ravager-black-canary-domino.md)
- STALE-SUSPECT: Kimi ultra-premium memory anchor mandates the 4-root
  Homi-Ultra-Premium-Production-v1.0 deliverable + 5-criteria framework; its own 2026-08-16 decision
  log records the correction: 4-root tree gutted, github HoMI-Technology/homi → 404, SHIPPED product
  is Homi-Tech-Production, and legacy extraction docs publish scoring weights 40/35/25 + READY≥75 vs
  SHIPPED 35/35/30 + thresholds 80/65/50 — the weight mismatch is the one durable fact worth keeping.
  Founder D-SSOT choice (restore / product-only / archive+product) recorded as open 2026-08-16.
  (C:\dev\kimi-workspace\skills\homi-ultra-premium-continuation\references\architecture-tension-decision-log.md; ...\Homi-Memory-Anchor.md; C:\dev\kimi-workspace\vault\homi\Homi-Context.md)
- STALE-SUSPECT: homi-fix-playbook skill is self-labeled LEGACY (retired HoMI-Technology/homi Vite
  SPA, archived 2026-08-02, local archive ~/Desktop/kimi-workspace/archive/homi-project); applying it
  to Homi-Tech-Production would delete app/. Verified misdirection risk 2026-08-02. Same for
  vault/stack/homi-project.md (Vite/Hono/tRPC/Drizzle stack notes = legacy repo only).
  (C:\dev\kimi-workspace\skills\homi-fix-playbook\SKILL.md; C:\dev\kimi-workspace\vault\stack\homi-project.md)

## Sync hazard

- The Kimi copies of homi-orientation (canon.md) are OLDER than ~/.claude/skills copies — they lack
  the 2026-08-23 spelling law (user-visible copy says HōMI, never Homie/homie) and the 2026-08-16
  Threshold Compass founder lock. Claude copies win; Kimi-side skills need a re-sync.
  (C:\dev\kimi-workspace\skills\homi-orientation\references\canon.md vs C:\Users\Quality Assurance\.claude\skills\homi-orientation\)

## Sources swept with no HoMI signal (do not re-sweep)

- `C:\Users\Quality Assurance\.grok\memtrace\` = performance-sampling telemetry jsonl only, zero HoMI
  content; no GROK.md or memory .md under .grok (only product CHANGELOG/README); .grok\sessions are
  session logs (skipped per rules).
- `C:\Users\Quality Assurance\.kimi\` has no memory/vault/MEMORY.md; plans\ held 2 HoMI files (both
  captured above / stale-era); user-history\*.jsonl are session logs (skipped).
- `Desktop\kimi-workspace\docs\x-post-archive\` — no posts mention HoMI.
- Real Kimi memory vault is `C:\dev\kimi-workspace\vault\` (Memory.md itself calls HoMI "home
  automation / IoT" — wrong and stale; the homi/, decisions/, patterns/ subdirs carry the value).
