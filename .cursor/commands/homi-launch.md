# HōMI Launch Track — from built to marketed and live

Run after (or interleaved with) `/homi-redesign-loop`. Mission: HōMI Tech
ready to market and pushed live everywhere. Full auto for everything that is
buildable; a clean punch list for the few things only the owner can do.

Repo: `C:\dev\apps\homi-production`. Read FIRST:
`docs/knowledge/homi-agent-knowledge.md` (compiled cross-bot knowledge —
founder rulings, fragility, canon), `CANON.md`, `GO-LIVE-CHECKLIST.md`,
`DEPLOY.md`, `docs/launch-shipped-map.md`. Zero-affiliate canon applies to
marketing surfaces too.

## Arm up (skills for this track)

Via `skill-library` / `auto-find-skills`, load per workstream:
`launch`, `launch-checklist`, `product-marketing`, `copywriting`, `cro`,
`seo`, `ai-seo`, `emails`, `core-web-vitals`, `analytics`, `launch` +
`deliver-launch-checklist` for sequencing. Marketing agents get marketing
skills; never send an unarmed agent to write copy.

## Workstream A — Product launch-readiness (buildable, do it)

1. **Metadata/SEO sweep:** 40 of 70 product pages export no `metadata`,
   including every public `/tools/*` acquisition page. Fix all crawlable
   surfaces: title/description/OG per page, sitemap coverage, structured
   data where honest. `npm run brand-check` still gates copy.
2. **Perf:** respect the Lighthouse budget fragility (see knowledge pack —
   `/tools/mortgage` has ~0.2% script headroom; import-trace before adding
   modules). Run lighthouse configs (`lighthouserc*.json`) after changes.
3. **Signed-in QA (Plans.md 5L.6):** the signed-in surface has never been
   verified end-to-end. Run it: finance, companion, subscription free+paid,
   via smoke/e2e + browser_use agents on real screens. Record results in
   Plans.md style — no row marked pass without a run.
4. **Lifecycle emails:** verify every template in `lib/email/templates.ts`
   renders and links to reachable pages (the /outcomes orphan taught us).
5. **Analytics/funnel:** confirm events fire on the redesigned surfaces
   (attribution + funnel systems in `docs/launch-shipped-map.md`).

## Workstream B — Marketing surface (buildable, do it)

1. Audit `app/(marketing)/` against the redesigned product: claims true,
   screenshots current, CTAs land on working flows, pricing matches Stripe
   reality.
2. Copy pass with `copywriting`/`cro` skills — positioning per
   `homi-orientation` rulings; never invent product claims the app can't
   demonstrate.
3. Launch assets: OG images current (`public/og-v2.png` authority),
   share cards working, `/tools/*` pages polished as acquisition funnels.
4. Draft the launch sequence with the `launch` skill: announcement copy,
   channel list, Product Hunt/social drafts → write to
   `docs/launch/launch-plan.md` for the owner to fire. Drafts only —
   **never post to external channels or social accounts yourself.**

## Workstream C — Owner punch list (NOT buildable — surface loudly)

Maintain `docs/launch/OWNER-PUNCH-LIST.md`, updated every pass, containing
ONLY things requiring the owner's hands or money, each with exact steps:

- Vercel Hobby → Pro (GO-LIVE §4 — commercial-use breach with live Stripe).
- Supabase leaked-password protection (GO-LIVE §1.5).
- Live Stripe checkout verification (zero live payments to date — needs a
  real card test).
- D10 ruling (free-tier quota counts all assessments → unexplained 402).
- C.2 impact-bus production rollout decision.
- Marketing accounts/spend, domain/DNS, actually posting the launch.

Never attempt these yourself. Never deploy to production or spend money
autonomously — prepare everything up to the button.

## Workstream D — Staged rollout, not a cliff (buildable)

There are live users and live Stripe. A total redesign does not ship as one
cutover:

1. Gate risky reworked surfaces behind the repo's existing flag pattern
   (impact-bus Production flag is the precedent — red-team verified). New
   surfaces default off in production until their route group passes QA.
2. Merge order: resilience first (error/loading boundaries — pure win, no
   flag needed) → hidden-route re-enables → per-route-group redesigns →
   role dashboard buildouts → marketing surface last (it must describe what
   is actually live).
3. Every `redesign/integration` → `main` PR states its rollback: revert
   the PR or flip the flag. If neither is true, the PR is too big — split.
4. After each production deploy: smoke against prod, watch Sentry +
   Vercel analytics for one cycle before the next merge. A regression
   found in prod pauses the merge train, not the loop.

## Definition of LAUNCH-READY (the exit gate)

- All verify gates green repo-wide; signed-in QA recorded as run and passed.
- Every crawlable page has metadata; Lighthouse budgets pass.
- Marketing surface claims verified against the working product.
- `docs/launch/launch-plan.md` complete; OWNER-PUNCH-LIST is the ONLY
  remaining work.
- A hostile final review (fresh agent) finds no concrete gap between
  "what we claim" and "what the product does".

Report exits with: what's ready, evidence, and the punch list.
