# HōMI FINISH — master goal + loop for the named agent team

Register this as your goal (`create_goal`) and run it as a grind loop until
the exit gate passes. Full auto for everything buildable; HOLDs and the
owner punch list are the only brakes. Mission: **finish HōMI Tech — every
feature, dashboard, flow, button, and piece of logic — to launch-ready.**

## Step 0, every pass — sync and situational awareness

1. `git fetch origin`; base ALL work on `origin/main` (local checkouts go
   stale in hours; on 2026-08-29 the local main was 89 commits behind and
   parked on a feature branch). Per HoMI Knowledge, production live tip was
   `c1727cd` (#337) on 2026-08-29 — re-confirm the live tip each pass.
2. Read the LATEST message in each team channel before acting (see roster
   below). **A standing HOLD is law** — e.g. Product's HOLD on #333 via App
   UX — until the CEO/owner lifts it. Never bulldoze a hold; queue around it.
3. Read `docs/knowledge/homi-agent-knowledge.md` (+ `-otherbots.md`),
   `docs/design/redesign-audit-seed.md` (honor its staleness alert),
   `docs/design/baseline/README.md`, and the loop state file
   `docs/design/redesign-loop-state.md` (create from the template in
   `/homi-redesign-loop` if absent).

## Step 0.5 — Knowledge muster (every run; refresh when >1 day old)

The named agents hold knowledge that exists ONLY in their conversations.
Before the first work pass, message EVERY roster agent and collect a state
packet: current locks/HOLDs and why, decisions made in their domain,
in-flight work and its branch/PR, top-3 known gotchas, and what they need
from other agents. Commit each packet to
`docs/knowledge/team-state/<date>-<agent-slug>.md` and fold anything
durable into `docs/knowledge/homi-agent-knowledge.md`. This is how the
team's accumulated knowledge reaches subagents and cloud agents — an agent
that skips the muster is working blind and will re-litigate settled
decisions. If a roster agent is unreachable this session, say so to the
user and proceed on the packets already in `docs/knowledge/team-state/`.

## The team — route by domain, respect the protocol

**ALL work is delegated through the NAMED roster below** — anonymous
subagents may exist only underneath a named agent's task, never as a
parallel chain of command. Their message conventions (tips, packets, waves
W1…, "not a gate", "Locked") are the coordination protocol — use it.

- **CEO** — decisions only: punch-list approvals, direction calls, lifting
  HOLDs, D10/C.2-class rulings. Escalate with a one-screen brief and a
  recommendation; never a wall of context.
- **HoMI Knowledge** — source of truth: live tip, packet state, premise
  re-verification. Route every "what is current?" question here first, and
  file durable learnings back to it AND to `docs/knowledge/`.
- **HoMI Brand & Design** — canon enforcement (CANON.md, compass lock,
  tokens, verdict colors) and design review. **First action: deliver
  Baseline 001** (`docs/design/baseline/` — the founder's "this is
  horrible" verdict on the #335–#337 ThresholdFold, with 8 enumerated
  defects) so the fold's next iteration answers it. QA crops are review
  input, not a gate — their words.
- **HoMI Product** — scope, waves, holds. Confirms what each wave (W1…)
  contains; owns "extra constraints only" rulings.
- **HoMI Finance** — money engines, score/path/hard-stop logic. Their lock
  stands: "Path and hard stops lead" — score never zeroed, gates override.
  All money-engine de-dup work (4 engines, M7) routes here.
- **HoMI App UX** — signed-in surfaces; current holder of the #333 HOLD.
  Owns the ThresholdFold defect fixes once Brand & Design signs the
  direction.
- **HoMI Marketing** — `/homi-launch` workstreams A/B: SEO/metadata, copy
  truth-audit, launch plan drafts. Never posts externally; drafts only.
- **HoMI Tech Dev** — implementation muscle: cloud agents per route group
  on `redesign/<group>` branches → `redesign/integration` → PRs to main
  (CI `verify` is the merge gate). Machine law: local `npm run build`
  fails BY DESIGN (Smart App Control blocks @next/swc) — build/e2e prove
  in CI/cloud only.
- **Personal Assistant** — owner comms: maintains
  `docs/launch/OWNER-PUNCH-LIST.md` and surfaces exactly what only the
  founder can do (Vercel Pro, live Stripe card test, Supabase password
  protection, D10, C.2, posting the launch).

Every delegated brief names: the origin/main base SHA, which skills to
read (local agents: `skill-library` + `auto-find-skills`; cloud agents:
paste distilled skill content — they can only see the repo), the state
file rows owned, and the verify gates that apply.

## The work — tracks, in priority order

1. **Baseline 001 response** — fix the 8 ThresholdFold defects on top of
   #335–#337 (Brand & Design direction → App UX build → pixels judged
   against the baseline PNG). No fold iteration without a before/after.
2. **`/homi-redesign-loop`** — the grinder over every `app/(product)/`
   route group: audit → fix → verify → hostile self-audit, per its
   concurrency and branch rules. Re-derive the hidden-routes list from
   origin/main's nav-catalog (it GREW — "life labs" added); each hidden
   route gets a re-enable-with-redesign or formally-retire ruling
   (Product decides, CEO signs).
3. **Missing pieces** — build out skeletal role dashboards
   (partner/employee/team/advisor), `/decisions` server persistence,
   orphan routes (`/outcomes`, `/calibration`) wired into chrome, every
   dead or lying button made real or deleted.
4. **`/homi-test-rebuild`** — the 5-tier test mission, sequenced per its
   sibling rules (never same directory as an active redesign batch; its
   T3 policy rules land early because they enforce laws the other tracks
   must obey).
5. **`/homi-launch`** — metadata/SEO, signed-in QA (Plans.md 5L.6 — never
   run; run it), marketing truth audit, staged rollout behind flags,
   launch plan, owner punch list.

## Standing law (from the knowledge pack — non-negotiable)

Zero-affiliate. Never redraw the compass mark. Dark navy only; locked
palette; verdict enum and colors per CANON. "Decision Readiness Score" —
never "HōMI-Score" on surfaces (naming law #313). `lib/scoring/weights.ts`
is a C2 trade-secret boundary. Score displayed even under hard stops,
never zeroed. Pixels decide visual claims — render before reporting.
Sensitivity proofs for rebuilt tests (AP1: never soften an assertion).
Never deploy to production, spend money, or post externally from the loop.

## Exit gate (the ONLY "done")

Two consecutive full passes with zero new defects AND no concrete hostile-
audit criticism AND `/homi-launch`'s LAUNCH-READY gate green AND every team
channel reporting its domain clear — leaving ONLY the owner punch list.
Then the Personal Assistant delivers the final report: what was built,
evidence, the punch list, and the launch plan awaiting the founder's send.

Stall rules: same defect surviving 3 attempts → STUCK, move on, report.
No progress for 2 passes → stop and report honestly. 25-pass ceiling.
When blocked on a decision: brief the CEO channel, keep working everything
else; stop fully only when ALL remaining work is blocked or owner-only.
