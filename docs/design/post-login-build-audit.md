---
title: Post-login audit — let users experience their build
source: Claude Code (design audit, two-lens review)
date: 2026-08-17
revision: 6 — 2026-08-20 state-based post-login + surface roles + results→Build CTAs
status: design — phases 00–06 landed; phase 03 state routing + surface-role SSOT + results primary CTA closed on this branch; phase 07 remainder (full /results merge) still open
surface: post-login (`/dashboard`, `/path`, `/plan`, `/results`, `/onboarding`)
sections: Section 2 (Dashboard / Shell) primary — no writes to Section 0 or 8
related: DESIGN.md, CANON.md, COMPANION-ECOSYSTEM.md, docs/SECTIONS.md
---

# Post-login audit — let users experience their build

## The finding, in one line

**The build already exists. It is just not on stage.**

Nearly every component required to let a user experience their build is already in
this repo — path generation, completion ratio, binding constraint, impact tracking,
hard stops, and a Companion that already reads all of it. They are built, tested,
and disconnected from the one screen everybody lands on.

That reframing matters, because it changes the cost, the risk, and the sequencing.
A redesign needs doctrine amendments and founder sign-off before anything ships.
Wiring existing modules into an existing surface can start immediately and collides
with nothing until phase 04.

**This is a wiring problem wearing a redesign costume.**

### Implementation status (2026-08-20)

Phases 00–03 landed in [#252](https://github.com/HoMI-Technology/Homi-Tech-Production/pull/252) (`feat(dashboard): tell the truth about the build on Home`). That PR wired hard-stop fold truth, Path as step counts (no percent over a stop), the resume ramp, `dashboard_fold_viewed`, onboarding skip → `/dashboard`, and the `/assessment` `NEXT_REDIRECT` rethrow. Scoring was not changed.

**2026-08-20 correctness pass (this branch):**

| Item | Finding | State |
| --- | --- | --- |
| Empty Home Assess → marketing `/first-moment` | F1 residue | **Closed** — signed-in empty preset uses `SIGNED_IN_ASSESS_HREF` (`/assessment`) |
| Unreachable `loadLocalResult` replay in onboarding | F5 | **Closed** — deleted |
| Companion fold line on Home | F6 / phase 05 | **Closed** — server text via `companionFoldLine`, no chat graph |
| Workspace switcher unreachable in live shell | shell drift | **Closed** — `DashboardSwitcher` mounted in `AppSidebar` footer |
| Employee hub empty → Shadow Score | signed-in CTA honesty | **Closed** — Assess → `/assessment` |
| Contextual quick-action first-run led with Shadow Score | tools IA | **Closed** — `/assessment`, `/money`, `/path` |
| Money tools discovery from Home | tools IA | Partial — Home fold links **Money picture** → `/money` |
| `onboarding_completed` still write-only | F5 | Open — not used for redirects (unsafe without backfill) |
| State-based post-login routing | F1 / phase 03 | **Closed** — `resolvePostLoginDestination`: explicit `?next=` wins; bare sign-in → Assess if unscored, Home if scored |
| Fold inversion (build hero, score to rail) | F7 / phase 04 | **Closed** — `HOME_FOLD_INSTRUMENT = "build"`; DESIGN.md 3-second test amended |
| Step ledger of completed Path moves | F9 / phase 06 | **Closed** — `PathStepLedger` on Home (suppressed over hard stops) |
| Collapse `/plan` + `/results` | F8 / phase 07 | **Partial** — `/results` reveal-only (Path card removed); chrome/emails/notifications/report → Build; full route deletion still open |
| Home fold premium identity | visual / brand | **Closed** — `dash-instrument` chrome, in-fold `Wordmark` + eyebrow, Companion `panel-focus`, Path dock language, ledger kicker |
| Signed-in Shadow Score as product close | tools IA | **Closed** — removed from ⌘K; Twin/Trinity empties → Assess; QuickActionGrid stripped |

This file stays the audit. It does not replace the product PR.

> **A note on file and line references.** Every path and line number in this document is as of the audit date, **2026-08-17**. `app/(product)/dashboard/page.tsx` has since been rewritten twice — by #252 and then by #257, which moved the fold into `components/dashboard/HomeFold.tsx` and cut the page from ~709 lines to 132. The findings and the reasoning stand; the coordinates do not. Re-locate before acting on any line reference here.

---

## Method, and what this audit is not

| Did | Did not |
| --- | --- |
| Read the post-login route tree, product layout, chrome, nav catalog | No analytics, funnel data, or retention numbers |
| Traced auth → redirect → landing for both sign-in and sign-up | No user research or usability testing |
| Read dashboard / results / path / plan / onboarding end to end | No screen-reader accessibility pass |
| Traced the Companion host, widget, and context spine | Did not deep-read the 16 tool calculators or 11 admin pages |
| Grepped instrumentation, hard-stop handling, persistence | Did not test on a real mobile device |
| Counted routes and nav entries directly rather than estimating | **Never reached the authenticated dashboard** — see below |
| **Ran the app** (rev 3): `npm ci`, `next dev`, `next build`, `next start`, driven with Playwright | |

**The observational pass (rev 3).** Revisions 1 and 2 were read entirely from
source. Rev 3 installs, builds, and runs the app, and drives it with a browser.
Scope limit, stated plainly: **the authenticated dashboard was never observed.**
The only reachable Supabase project is production (per AGENTS.md), and creating a
user there to look at a dashboard is not an acceptable way to run an audit. So
every dashboard-specific finding (F1, F2, F4, F6, F7, F9, F10) remains
code-verified, not observed. What the browser could reach — the guest funnel and
the public product routes — was observed directly.

Browsing was strictly read-only: public routes only, no sign-in, no writes. The
one button clicked (`Skip for now`) cannot write while signed out, because its
handler is guarded by `if (user)`.

**Confidence labels.** _Observed_ = executed in a browser against a running
build. _Verified_ = the code path was traced and the claim follows directly.
_Inferred_ = strong code evidence, never executed. Severity remains a
prioritisation hypothesis rather than a measurement — which is itself finding F3.

### What the observational pass returned

| Check | Result |
| --- | --- |
| `/dashboard` as a guest → `/auth/sign-in?next=%2Fdashboard` | CONFIRMED |
| `/results` as a guest → "No results yet", no 4-band verdict painted | CONFIRMED |
| Onboarding "Skip for now" performs no navigation | **CONFIRMED — F5 upgraded to observed** |
| Guests cannot reach the full assessment (rev 2's retraction) | CONFIRMED — but via a broken mechanism, see **F11** |

`next build` also completed successfully (exit 0), which independently establishes
that the tree compiles — something CI has been unable to report since
2026-08-16T23:34Z.

---

## Corrections to revision 1

- **Retracted.** Rev 1 claimed an anonymous user could take the assessment and lose
  it on sign-in. False. `app/(product)/assessment/page.tsx:23` sends guests to First
  Moment, and `saveLocalResult` refuses shadow-kind payloads
  (`lib/assessment/storage.ts:141`), so a guest cannot hold a score-shaped local
  result at all. The finding does not exist. **Rev 3 confirms this in a browser** —
  a guest aiming at `/assessment` does land on `/first-moment`. The retraction was
  correct; the *mechanism* delivering it is not (F11).
- **Overstated.** "70 product pages" as evidence of bloat is misleading — it includes
  16 tool calculators, 11 admin pages, and 4 report views. Consumer-reachable is
  **36**; the rail shows **14**.
- **Missed.** Rev 1 audited "experience your build through HōMI" without opening the
  Companion, which COMPANION-ECOSYSTEM.md calls "the connective tissue of the whole
  product." It already reads the path (`lib/advisor/context.ts:183`). That single
  fact reframes the recommendation.

---

## The structural fact

`/assessment` is classified public so middleware will not bounce guests to sign-in,
but the page redirects them to First Moment. **Every HōMI account is therefore
created before its first measurement exists.** The real first-run sequence:

1. Sign up → `safeNext` default → `/onboarding`
2. Onboarding, three steps
3. "Skip for now" → writes a flag, **navigates nowhere**
4. Or "Assess" → 45 questions, ~5 minutes, no partial credit
5. Abandon → `/dashboard` → greeting + one empty card

The dashboard is not the front door — the intended path routes *around* it. That
makes it **the abandonment catch-basin**: the people who land there are the ones who
did not finish, or who came back intending to. The highest-intent, highest-risk
cohort in the product, served a greeting and a card.

---

## What already exists

| Capability | Built | On the dashboard |
| --- | --- | --- |
| Readiness path generation (`lib/readiness/path.ts`) | Yes | Client only |
| `pathCompletionRatio()` (`lib/readiness/progress.ts:315`) | Yes | Never shown |
| Binding-constraint sequencing | Yes | Below fold |
| Step completion with impact | Yes | No receipt |
| Hard stops (`lib/scoring/engine.ts:714`, `path.ts:556`) | Yes | Absent |
| Server path persistence (`/api/readiness-path`, Zod) | Yes | Not queried |
| Companion reading the path (`lib/advisor/context.ts:183`, `:213`) | Yes | Behind a click |
| `assessments.decision_type` | Yes | Sidebar only |
| **Analytics on the landing surface** | **No** | **Zero events** |

Eight of nine capabilities are built and unwired. The ninth — instrumentation — is
genuinely missing, and it is why nobody has noticed the other eight.

---

## Findings

### F1 · CRITICAL · Verified — The abandonment catch-basin is a dead end

Every module below the hero is gated on a completed assessment, so abandoners get a
greeting and one card.

```
app/(product)/assessment/page.tsx:23   if (!user) redirect(PRIMARY_CLOSE_HREF)
app/(product)/dashboard/page.tsx:474   {latest && ( … )}   ← rail, pillars, history, timeline, actions
app/(product)/dashboard/page.tsx:460   <EmptyState preset="dashboard" />
lib/assessment/draft.ts:73             export function loadDraft(maxStepIndex = 64)  ← never called from the dashboard
```

The sharpest detail: **their answers are still on the device.**
`lib/assessment/draft.ts` persists the in-progress assessment to `localStorage` under
`homi:assessment-draft`, with a loader that takes a step index. The dashboard never
calls it, and renders "One measurement and this page comes alive" instead.

**Fix:** the empty state becomes a resume ramp — read `loadDraft()` and lead with
where they stopped. Cheapest activation fix in the document; no new data model.

### F2 · CRITICAL · Verified — Hard stops are invisible on the landing surface

The engine forces `NOT_YET` when a hard stop is detected; the path generator emits
dedicated hard-stop steps. The dashboard never references `hardStops`.

```
lib/scoring/engine.ts:714    const verdict = hardStops.length > 0 ? "NOT_YET" : baseVerdict
lib/readiness/path.ts:556    steps.push(hardStopStep(stops[i], d, finance, idFactory))
app/(product)/dashboard/page.tsx   grep "hardStop" → no matches
```

A user with DTI over 50% sees "34 · DO NOT PROCEED" with no statement of what is
blocking them. The one interpretation that would help exists in the data and is
never rendered.

**Fix:** name hard stops on the landing surface, above everything. Also a
prerequisite for any progress UI — see R2.

### F3 · CRITICAL · Verified — The landing surface has zero instrumentation

27 distinct analytics events exist in the product. None fire from the dashboard tree.
`PageViewBeacon` gives a section-level page view and nothing else.

```
grep track(" in app/(product)/dashboard, components/dashboard, lib/dashboard → 0 results
components/analytics/PageViewBeacon.tsx:25   track("page_viewed", { section })
```

Every finding here, including the severity ordering, is an argument rather than a
measurement — because the product cannot currently produce the measurement.

**Fix:** ships **before** any redesign. Cheapest item on the list, and the only one
that makes the others falsifiable.

### F4 · HIGH · Verified — The build is client-only and below the fold

`PathNextMove` hydrates from `localStorage`, then pulls the server copy. New device →
no build at first paint. It renders after the instrument, under the fold.

**Fix:** the page already runs six parallel server queries in one `Promise.all`.
Make it seven. Highest value-to-risk change in the document.

### F5 · HIGH · **Observed** — Onboarding carries three vestigial mechanisms

- **Dead button.** No `useRouter`, no `redirect`, anywhere in the file. "Skip for
  now" writes a flag and leaves the user on step 3.
- **Write-only flag.** `onboarding_completed` is written (`:23`) and read nowhere in
  app code.
- **Unreachable replay.** The local-assessment rescue at `:27` cannot fire — guests
  can no longer take an assessment.

**Observed in a browser (rev 3).** Loaded `/onboarding`, advanced to step 3, clicked
"Skip for now", waited 3 seconds:

```
url  http://localhost:3000/onboarding → http://localhost:3000/onboarding
h1   "Where do you want to start?"    → "Where do you want to start?"
```

Nothing moves. This is no longer an inference from a missing import — it is the
observed behaviour of the button.

**Fix:** navigate on skip; read the flag or drop the column; delete the replay. The
first is a bug fix, not a design decision.

### F11 · MEDIUM · **Observed** — The guest guard on `/assessment` swallows its own redirect

Found only by running the app; three passes of reading the source missed it.

```ts
try {
  const user = await getCachedUser();
  if (!user) redirect(PRIMARY_CLOSE_HREF);   // throws NEXT_REDIRECT
} catch {                                     // ← and this catches it
  redirect(PRIMARY_CLOSE_HREF);
}
```

`redirect()` signals by throwing. The bare `catch` swallows that throw — the classic
Next.js footgun. Instrumenting the handler proved it directly:

```
[PROBE] user = null -> will redirect: true
[PROBE] catch fired, digest = NEXT_REDIRECT;replace;/first-moment;307
GET /assessment 200
```

The intended 307 never reaches the client. Instead the guest gets a **200**, the
page streams, and a client-side navigation bounces them to `/first-moment`.

**Measured in production mode** (`next build && next start`) — not dev, because dev
timings are not trustworthy:

| Path | Status | Bytes | Time to `/first-moment` |
| --- | --- | --- | --- |
| `/assessment` (broken guard) | 200 | 66 KB | **401 ms** |
| `/first-moment` (direct) | 200 | 66 KB | 114 ms |

**Correcting my own first read:** in `next dev` this looked catastrophic — 5–8
seconds of a "Finding your bearings…" screen. That was a dev artifact. In a
production build the user-visible cost is roughly **290 ms** and one wasted 66 KB
round trip. Real, but not dramatic. Reporting the dev number as the finding would
have been the kind of overstatement rev 2 had to correct elsewhere.

The durable cost is not the delay, it is what crawlers get:

```html
<title>The Full Assessment · HōMI</title>
<link rel="canonical" href="https://…/assessment" />
```

A **self-referential canonical on a 200 page that redirects every human away.** The
canonical asserts `/assessment` is the indexable destination for a URL no signed-out
visitor can stay on.

Guest-reachable entries into this path: the `/results` empty state, `/path` (×2),
`/tools/preflight`, and `/onboarding`. The primary marketing nav is correctly wired
— `SiteHeader`'s "Assessment" item points at `PRIMARY_CLOSE_HREF`, not
`/assessment` — which is why this is medium and not high.

**Fix:** move the guard's `redirect()` outside the `try`, or call
`unstable_rethrow(e)` first in the `catch`. One line. The `catch` is presumably
there to handle a Supabase failure, which is reasonable — it just must not eat the
control-flow throw.

### F6 · HIGH · Verified — The Companion knows the build; the page it sits on does not

`buildCompanionContext()` assembles assessment, finance, credit, surface **and path**
— verdict, mode, confidence, step count, plus a coach pack. It renders as a 56px orb,
mounted after `requestIdleCallback`, opening the real widget on click.

The idle-gating is well-reasoned (it keeps the advisor graph off the Lighthouse
script budget) and should not be undone. But the one component that understands the
user's build is hidden behind a click, on a page that does not mention the build.

**Fix:** one server-rendered Companion line on the dashboard — static text from the
same context, no chat graph, no bundle cost. Opening the panel stays a click;
*being present* stops being one.

### F7 · MEDIUM · Verified — The score outranks the build; metrics measure attendance

Fold: compass, `HeroScore` (`:350`), verdict chip, spectrum, dock (`:403`). Rail
(`:477-529`): Verdict held · Strongest · Check-ins 7d · Journal — three of four are
attendance. DESIGN.md's "3-second hierarchy test (score + next step obvious)" encodes
the current priority as the standard.

**Fix:** build in the fold, score in the rail with its delta. Replace the weakest
attendance cell with progress in **steps** ("4 of 7"), not a percentage — see R3.

### F8 · MEDIUM · Verified — Four surfaces own one story

The nine-line "Surface roles (D4)" comment is duplicated verbatim at
`app/(product)/results/page.tsx:27` and `app/(product)/path/page.tsx:56`. A boundary
that must be restated in two files to hold is not a boundary.

**Fix:** two surfaces — **the Build** (living, absorbing `/path` and `/plan`) and
**the Record** (`/report/{id}`). `/results` becomes the reveal transition. Last in
the sequence: it is the only one that touches routing.

### F9 · MEDIUM · Verified — Nothing shows cause and effect

`VerdictCelebrate` fires only on a verdict *band* improvement (`:23`) — possibly a
once-per-user event. Completing a path step produces no dashboard receipt.

**Fix:** a ledger of completed steps and what each moved. The impact plumbing exists
behind the `impactBus` flag — this is surfacing, not inventing.

### F10 · LOW · Inferred — The Snapshot aside is mobile dead weight

It repeats Held / Strongest / Pulse 7d / Journal from the rail above. Below 1024px
the grid collapses to one column, so it stacks after pillars, history, financial
position, and the timeline.

```
app/globals.css:2888   .dash-body-grid { display: grid; gap: 1.5rem }   ← 1 col default
app/globals.css:2892   @media (min-width: 1024px) { … 1fr 17.5rem; }
app/globals.css:2904   @media (min-width: 1024px) { .dash-side-stack { position: sticky } }
```

Marked *inferred* — never rendered at mobile width, so lived severity may be lower.

**Fix:** render at `lg` and above only.

---

## Three directions, and why one wins

### A — Fix the plumbing, keep the instrument

Server-render the path, add hard stops and progress, instrument everything. Change no
hierarchy.

- **+** Zero doctrine collision; ships immediately; every change independently revertible.
- **−** Does not answer the question asked. The build is still a module on a grade page.
- **Verdict:** correct as phase one. Insufficient as an answer.

### B — Companion-first, the mote leads

Post-login opens as a conversation; structure is secondary.

- **+** Strongest brand differentiation; the context spine already supports it.
- **−** Conversation is a poor medium for "how far along am I."
- **−** Collides head-on with OPERATE density doctrine.
- **−** Quota-gated and LLM-dependent — a degraded state leaves no page underneath.
- **Verdict:** rejected as primary. The failure mode is fatal.

### C — Structure leads, the mote narrates **(recommended)**

The build is the fold. The Companion adds one server-rendered sentence of
interpretation. The score is a reading on the rail.

- **+** Degrades cleanly — remove the mote line and a complete page remains.
- **+** Satisfies OPERATE density while sounding like HōMI.
- **+** Reached *through* direction A, so phase one is not wasted work.
- **−** Needs DESIGN.md's 3-second test amended (phase 04).
- **Verdict:** chosen. The only direction where every phase is independently shippable
  and the end state answers the question.

---

## How the proposal fails

### R1 — It becomes a guilt machine

Progress invites streaks; streaks invite nudges; nudges invite the engagement-farming
pattern HōMI's brand explicitly refuses.

**Mitigation:** no streaks, no red for inactivity. A stalled build reads neutral. Ban
copy implying the user is behind — "the build is where you left it," never "you have
not built in 12 days."

### R2 — A progress bar over a hard stop is actively harmful

"You're 43% built" above an unaddressed DTI-over-50 tells the user the build completes
if they keep going. It does not. The engine forces `NOT_YET` precisely because the
answer is *stop*.

**Mitigation:** hard rule — when `hardStops.length > 0`, suppress completion
percentage, streaks, and celebration entirely. Render structure so the block is
visible, blocked course in crimson above everything. **This gets a test** (AGENTS.md
rule 5).

### R3 — False precision in the completion number

"43%" implies a fixed-length, equal-weight sequence. Steps are generated per verdict
and binding constraint; a regenerated path moves the number with no user action.

**Mitigation:** express progress in **steps completed** ("4 of 7"), against the
current path only. If the path regenerates, say so rather than letting a number move
silently.

### R4 — Couples and verticals break the singular "your build"

`/household`, couples alignment, and partner path notes exist and appear nowhere on
the dashboard. `decision_type` supports multiple verticals (`home_buying`, `car` are
server-active).

**Mitigation:** scope phase one to single-user, single-decision and say so. Design the
build header to accept a decision switcher and a second participant from the start,
even if neither ships initially.

---

## Every state the fold must handle

| State | What the fold shows | Progress UI |
| --- | --- | --- |
| No assessment, no draft | What HōMI will tell you; two-minute path to a first read | Suppressed |
| Assessment abandoned mid-flow | Resume ramp — where you stopped, how much is left | Questions only |
| Hard stop present | The blocked course, named, above everything | **Suppressed — R2** |
| NOT_YET / BUILD_FIRST, no hard stop | Courses, binding constraint, next course | Steps completed |
| ALMOST_THERE | Same, remaining gap named explicitly | Steps completed |
| READY | The decision, not the build — the build is finished | Replaced by the record |
| Path stale vs. latest assessment | Structure, flagged stale, regenerate action | Frozen until reconciled |
| Assessment query failed | Existing `LoadErrorPanel` — never first-run copy | Suppressed |
| New device, no local path | Server-rendered build (what F4 buys) | Steps completed |
| Phase 0 freeze active | Freeze screen — unchanged, takes precedence | Not rendered |

Six of these ten currently render the same greeting-plus-empty-card or the same score
hero. The design work is mostly in the states; the happy path is the only one the
current dashboard treats as real.

---

## Sequencing

| Phase | Work | Closes | Doctrine risk | Status |
| --- | --- | --- | --- | --- |
| 00 | Instrument the dashboard: empty-state impression, next-move click, activation funnel, return cadence | F3 | None | Landed in #252 (`dashboard_fold_viewed`; remaining funnel events still thin) |
| 01 | Bug fixes, no design content: navigate on skip; read or drop `onboarding_completed`; delete unreachable replay; hide Snapshot below `lg`; un-swallow the `/assessment` redirect | F5, F10, F11 | None | **Partly landed in #252** — skip navigation and the `NEXT_REDIRECT` rethrow shipped (F5 limb 1, F11). Still open: `onboarding_completed` remains write-only, the unreachable replay is still in `onboarding/page.tsx`, and the Snapshot aside is still ungated (**F10 untouched**) |
| 02 | Server-render the path into the existing `Promise.all`; surface hard stops; steps-completed in the rail | F2, F4, F7 (part) | None — additive | Landed in #252 |
| 03 | Resume ramp for abandoned assessments; state-based post-login routing | F1 | Low | **Landed** — resume ramp in #252; `resolvePostLoginDestination` on sign-in + `/auth/callback` (explicit `?next=` wins; bare → Assess/Home by assessment state) |
| 04 | Invert the fold — build hero, score to rail. **Edits DESIGN.md's 3-second test in the same commit** | F7 | **PILOT required** | **Landed** — HomeFold `data-home-build-hero` + score rail; DESIGN.md / ARCHITECTURE-DESIGN.md hierarchy text updated |
| 05 | One server-rendered Companion line on the build | F6 | Low | **Landed** — `data-companion-fold-line` on HomeFold |
| 06 | The ledger — completed steps with impact | F9 | None | **Landed** — `PathStepLedger` (titles of done steps; suppressed over hard stops) |
| 07 | Collapse `/plan` and `/results` into the Build; re-point nav catalog + parity test | F8 | Medium — routing | **Partial** — `/plan` + `/results` palette-only; Path in Measure journey; chrome CTAs → Home/Path; full `/results` merge still open |

Phases 00–03 contain **no design decisions at all**. They close both critical findings
plus two highs without requiring anyone's taste to agree. If nothing else here is
accepted, those four still stand.

Phase 04 is the only doctrine contradiction. Under CANON.md it needs the collision
quoted verbatim, the argument, one bounded surface (`/dashboard`), a named revert
commit written before the pilot starts, and a 60-day expiry — or straight to CANON
with DESIGN.md edited in the same commit.

---

## How we know it worked

| Claim | Metric | Kills the change if |
| --- | --- | --- |
| The empty dashboard leaks users | % of empty-state impressions → assessment start within 7d | Already above ~60% |
| A resume ramp recovers abandoners | Completion rate for users with a saved draft | No lift after 4 weeks at volume |
| The build drives return visits | D7/D30 return rate; steps completed per returning user | Return flat while steps rise — that's a chore |
| Hard-stop clarity helps | Action rate on hard-stop copy vs. abandonment after seeing it | Abandonment rises |
| The Companion line earns its place | Companion open rate from dashboard, before vs. after | No change — it's decoration |

### Tests this implies

- **Hard-stop suppression guard** — a path with `hardStops.length > 0` must never
  render completion percentage, streak, or celebration. Most important test in the set.
- **State matrix coverage** — one assertion per row above, so a new state cannot
  silently fall back to the score hero.
- **Server-path parity** — server-rendered and client-hydrated build must agree, or
  the page flashes a different build on hydration.
- **Nav catalog parity** — already exists; phase 07 must not break it.
- **Verdict canon guard** — unchanged, but re-run: the fold now renders
  verdict-derived structure.

---

## What gets cut

- The greeting as headline. The decision is the headline.
- The Snapshot aside on mobile.
- Two of four attendance metrics.
- `/plan` and `/results` as destinations.
- The unreachable onboarding replay, and `onboarding_completed` if it stays unread.
- The duplicated nine-line surface-roles comment.

---

## Open questions — founder calls

1. **Is the dashboard meant to be the post-login home at all?** The intended first-run
   path routes around it. If `/path` is the real home, several findings collapse into
   "point the door at the right room" and phase 04 gets much cheaper.
2. **Is a 45-question assessment with no partial credit the right first ask** when the
   account already exists? The Shadow Score is a two-minute read sitting outside the
   first-run flow entirely.
3. **Should the build be per-decision or per-person?** With `home_buying` and `car`
   both server-active, "your build" needs an owner before the hero is designed around it.
4. **Does DESIGN.md's 3-second test change, or does the dashboard stay a score page?**
   This is the actual decision. It is a doctrine amendment, so it is the founder's to
   make — not an agent's.
5. **Does any of this move while #241 is open?** Phases 00–03 are code-only and cost
   nothing, but instrumentation implies analytics volume — check that against the spend
   hold before phase 00, not after.

---

## Boundaries respected

- No changes to `lib/scoring/*`, verdict thresholds, pillar weights, or the four hard
  stops. Scoring canon is frozen and stays frozen — this audit asks only that hard
  stops be *shown*, never redefined.
- No new palette, typeface, or visual language. Every proposed element uses existing
  tokens and existing `components/operate/*` primitives. Navy surfaces only.
- The Companion's idle-gating and interaction-gated import are deliberately preserved
  — the proposed dashboard line is server-rendered text, not the chat graph, so the
  Lighthouse script budget is unaffected.
- Phase 04 touches DESIGN.md doctrine and is flagged for STUDY → PILOT → CANON rather
  than assumed. Phase 07 touches routing and the nav parity test.
- Nothing here starts work deferred behind #241. No purchase, no plan upgrade, no
  branch protection.
