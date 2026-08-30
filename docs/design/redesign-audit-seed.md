# Redesign Audit — Seed (verified 2026-08-29)

> ## ⚠ STALENESS ALERT — read first (added 2026-08-29, same day)
> This seed was compiled against a local checkout later found to be **89
> commits behind origin/main** (and parked on `feat/companion-v4-motes`).
> Re-verification against origin/main corrects four items:
>
> 1. **Item 3–4 (error/loading boundaries) is LARGELY CLOSED upstream:**
>    origin/main has 19 `error.tsx` and 22 `loading.tsx` under
>    `app/(product)/` (was 3/15). Re-audit coverage, don't rebuild it.
> 2. **The `finance/ThresholdCompass` "HōMI-Score" naming violation is
>    ALREADY FIXED on origin/main.** The component still has zero product
>    importers — only tests pin it (`finance-packet-copy-lock`,
>    `finance/threshold-compass`, `layout/app-sidebar` tests) — so the
>    disposition question is now "retire test-pinned dead component or
>    re-adopt it", coordinated with `/homi-test-rebuild`'s ledger.
> 3. **Hidden routes GREW:** nav-catalog on origin/main adds a
>    "Launch-hidden life labs" category on top of the insight labs.
>    Re-derive the full list from origin/main's `lib/layout/nav-catalog.ts`.
> 4. **A dashboard redesign is ALREADY IN FLIGHT upstream:** draft commits
>    #335 "dashboard unification — Path-led HōMI fold", #336 "AppSidebar
>    HōMI rail", #337 "signed-in first screen is the Threshold Compass",
>    introducing `components/dashboard/ThresholdFold.tsx` (+ HomeFold,
>    DashSpectrum, PathNextMove…). The founder's Baseline 001 screenshot
>    matches THIS work (see baseline README). Any loop pass must build on
>    (or consciously supersede) #335–#337 — never parallel-invent a fourth
>    dashboard.
>
> **Standing law: every mission pass starts with `git fetch origin` and
> bases on `origin/main`. The local checkout is not trustworthy.**
> Items below not corrected above still held on stale main; re-verify
> against origin/main before acting on any of them.

Pre-verified gap landscape for `/homi-redesign` and `/homi-redesign-loop`.
Every item below was confirmed in-code on this date. Re-verify before acting;
do not re-run the discovery sweep from scratch while these are open.

**Premise correction:** this repo has almost no conventional rot — 1 TODO
total (`lib/scoring/engine.ts:47`), zero `href="#"`, zero empty onClick.
The gaps are structural. Redesign effort goes to surfaces and resilience,
not marker cleanup.

## Ranked

1. **Nine built routes launch-hidden from all chrome (~2,600 LOC dark).**
   `lib/layout/nav-catalog.ts` — `/simulator`, `/decisions`, `/signals`,
   `/twin`, `/trinity`, `/genome`, `/calendar` (588 LOC), `/daily` (561),
   `/credit` (507) have `palette: false` and no header entry (Plans.md
   5L.2/CL-06). Re-enable (with redesign) or formally retire each.
   The nav catalog is the single lever.

2. **Hard orphans:** `/outcomes` (329 LOC, only inbound link is a lifecycle
   email — `lib/email/templates.ts:163`) and `/calibration` (173 LOC, real
   RPC, linked only from `/outcomes:152`). Wire into chrome or fold into
   `/timeline`.

3. **Error boundaries: 3 of 70 routes.** Only dashboard, money, money/budget
   have `error.tsx`. Add group-level `app/(product)/error.tsx` (+ per-route
   where flows differ). One file covers 67 routes.

4. **Loading states: 15 of 70 routes.** Missing on all 17 `/tools/*`
   calculators, all `/admin/*`, `/report/[id]/*`, `/path` (664 LOC), more.
   Group-level `loading.tsx` + per-route skeletons for heavy screens.

5. **Role dashboards lopsided:** `partner/` (372 LOC, 0 components, 0 API
   routes), `employee/` (264/0/0), `team/` (216/0/0), `advisor/` (25 LOC
   wrapper) vs `admin/` (3,546 route LOC + 6,374 component LOC). Build the
   thin roles out to real dashboards. `admin/marketing/page.tsx` (1,093 LOC
   monolith) needs decomposition.

6. **`/decisions` has zero server persistence** — pure client +
   `localStorage` (`lib/decisions/state.ts`). Everything lost on device
   change. Add API + Supabase persistence like `/twin`, `/trinity`.

7. **F.15 insights render duality (Plans.md, cc:TODO):** `/results` and
   `/plan` recompute insights client-side; `/report/[id]` renders the stored
   column — drift amplifies with every generator change. **Resolve the SoT
   BEFORE redesigning any of those three surfaces.**

8. **40 of 70 pages export no `metadata`** — including every public
   `/tools/*` acquisition page. SEO/crawl surface.

9. **Genuinely thin screens:** `app/(product)/agents/page.tsx` →
   `AgentRoster` with a non-focusable `cursor-not-allowed` div
   (`components/agents/AgentRoster.tsx:113`, no aria-disabled);
   `household/page.tsx` is 68 LOC of tab chrome only.

10. **Statically disabled with no in-app enabling path:**
    `components/admin/WebhookPublisher.tsx:142` (out-of-band approval),
    assessment decision-type cards (`ChoiceCards.tsx:106`,
    `FullAssessmentFlow.tsx:67` — gated on Plans.md 5.9 / D10: free-tier
    quota counts ALL assessments → unexplained 402 for free users).

## Known blocked / decide-first (park under BLOCKED, don't guess)

- 5L.6 — signed-in L2 QA never run end-to-end (needs owner).
- C.2 — impact-bus production rollout undecided.
- D10 — decision-type quota ruling (blocks assessment card enablement).
- GO-LIVE §4 / §1.5 — Vercel Hobby plan, Supabase leaked-password
  protection: owner-only infrastructure items.
