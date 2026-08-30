# HōMI Redesign Loop — auto mode, grind to zero

Run the `/homi-redesign` mission as a self-auditing loop with an agent team,
fully autonomous. Do not ask permission for in-scope work. The loop's core
belief: **the current state is never the best possible output** — every pass
must either find and fix concrete weakness, or prove none remains.

Repo: `C:\dev\apps\homi-production`. Law: `CANON.md`, `DESIGN.md`,
`lib/brand/index.ts`, `app/globals.css` — see `/homi-redesign` for the full
rules; they all apply here.

**SYNC FIRST — before knowledge, before anything:** `git fetch origin` and
base every pass on **`origin/main`**, never the local checkout (found 89
commits stale on a feature branch on 2026-08-29 — this repo receives
commits hourly from other agent streams). If origin/main moved since the
last pass, re-verify any seed/state item you're about to act on. An
upstream draft series may already be doing your work (#335–#337 dashboard
unification was) — build on it or consciously supersede it via the state
file; never parallel-invent.

**Knowledge first:** read `docs/knowledge/homi-agent-knowledge.md` before
pass 1 and make every deployed agent read it — it is the compiled memory of
every bot that has worked on HōMI (founder rulings, fragility traps,
architecture truths). Cloud agents can ONLY know what's in the repo, so when
you learn something durable during a pass, append it there.

## State file

Keep `docs/design/redesign-loop-state.md` in the repo:

```markdown
# Redesign Loop State
pass: N
## Open defects (ranked)
- [ ] <route> — <defect> — <file:line>
## Fixed this run
## Hostile-review findings still open
## Log
- pass N: <found X, fixed Y, verify green/red>
```

Resume from it if it exists — never restart the audit from scratch when
state is present. This command's text is injected per message and does not
persist — the state file IS the loop's memory.

**Concurrency rules (prevent self-inflicted conflicts):**
- The orchestrator (you) is the ONLY writer of the state file. Subagents
  and cloud agents write their findings to their own file under
  `docs/design/reports/<pass>-<agent-name>.md`; you merge into state.
- Branch strategy: integration branch `redesign/integration` off `main`.
  Each cloud agent gets its own branch `redesign/<route-group>` off the
  integration branch, one route group per agent — never two agents on one
  route group, never an agent touching shared components (`components/`,
  `lib/`) without claiming the file in the state file first.
- PRs flow: agent branch → `redesign/integration` (you review + merge) →
  periodic `redesign/integration` → `main` PRs where CI's `verify` check
  and the human gate live. Rebase agent branches after each integration
  merge; stale agents get stopped and respawned, not force-pushed.

## Team mechanics

- Register the mission with `create_goal` / `update_goal`; use grind
  planning/execution to drive passes.
- Audit sweeps = parallel background subagents (`explore` for route walks,
  `debug` for dead logic, `browser_use` to actually render and click every
  screen, `bash` for grep/verify work) — collect with `await`, follow up on
  running agents instead of respawning.
- Fix batches at repo scale = cloud agents on
  `HoMI-Technology/Homi-Tech-Production`, one per route group, clearly
  named, off the working branch; batch-poll status, read transcripts, gather
  PRs, stop anything drifting off-canon.
- True time-based recurrence is the app's **Automations** feature (cron
  trigger, ≥5-minute interval) — if the user wants this loop firing on a
  schedule unattended, tell them once to create an Automation whose prompt
  is `/homi-redesign-loop`, then keep working the current pass.

## Skills (standing rule for every pass)

Before each pass — and whenever an agent hits a capability gap mid-pass —
arm the team:

- Check installed skills: `~/.cursor/skills-cursor/` and `~/.agents/skills/`.
- Read HōMI law-skills from `C:\dev\kimi-workspace\skills\`
  (`homi-orientation`, `homi-product-ui`) before design/copy decisions.
- Gap with no installed skill → `npx skills find <query>`, install the best
  match to `~/.agents/skills/`, copy/junction into `~/.cursor/skills-cursor/`,
  then use it. Log the install in the state file so later passes reuse it.
- Consult the **Skills Operators Handbook** (342 skills, 496 pages) at
  `C:\Users\Quality Assurance\Desktop\kimi-workspace\outputs\2026-08-29-skills-operators-handbook.pdf`
  when picking skills — the capability usually already exists locally.
  `grok-ecosystem-map` (in `~/.cursor/skills-cursor/`) covers Grok/xAI
  tooling choices for the agent team. Full access to both is granted.
- Every deployed agent gets told which skills to read for its area.

## Each pass

**0. Seed (first pass only).** `docs/design/redesign-audit-seed.md` holds a
verified gap inventory (dated — re-verify items before acting). Load it into
the state file as the initial ranked list instead of auditing from scratch.
Read `docs/design/baseline/README.md` — it holds founder-reviewed
screenshots of the CURRENT product with verdicts ("this is horrible" is the
verdict on Baseline 001, the verdict/score screen — 8 enumerated defects).
Pass 1 also captures a baseline screenshot of every product route into
`docs/design/baseline/` (browser_use, real render). **No redesign counts as
done without a before/after pair against its baseline** — the hostile audit
judges the pixels, not the diff.
Honor its decide-first warnings (F.15 before touching /results, /plan,
/report; BLOCKED items go straight to the BLOCKED heading).

**1. Audit sweep (agents out, parallel).** Deploy agents per area, not one
agent for everything:
- dead-interaction hunter: empty onClick, href="#", buttons that can never
  enable, handlers with no effect, unreachable/duplicated functions
- route walker per user type (new, returning, admin, advisor, employee,
  partner, household, team): where does each journey dead-end or lie
- design auditor: token drift, off-palette color, hierarchy/spacing slop,
  wall-of-text, inconsistent components across screens
- missing-piece finder: features referenced by nav/copy/Plans.md that don't
  exist or are stubbed
Merge findings into the state file, ranked by user impact. Verify every
claim in-code before it enters the list.

**2. Fix batch.** Take the top-ranked defects (a coherent batch, roughly one
route group). Build the real thing — no stubs, no mocked numbers, delete
dead logic with its last caller, reuse existing components, consume tokens.

**3. Verify gates (all green or the batch is not done):**
```
npm run typecheck && npm run lint && npm run test
npm run brand-check && npm run smoke
```
(`npm run build` FAILS locally by design — Smart App Control blocks
@next/swc. Build + e2e are verified by CI on the PR. Cloud agents may run
the full chain. Never patch SWC config to force a local build.)
Then render the changed screens in a real visible browser and look at them.
Pixels, not code review, decide visual claims.

**4. Hostile self-audit.** A fresh agent (or a deliberate cold re-read)
attacks the batch: what is the weakest thing shipped this pass, what would a
staff designer reject, what button did we just add that lies? Findings go
back on the ranked list — they do not get argued away.

**5. Log and continue.** Update the state file, commit the batch on the
working branch (Conventional Commits; PR to main when a route group is
whole — main's `verify` check gates the merge; never push main directly).

## Sibling mission — `/homi-test-rebuild` (coordinate, don't collide)

The test-architecture rebuild (`/homi-test-rebuild`, 76 files across six
`__tests__/` dirs, 5-tier plan, its own phases and gates) runs alongside
this loop. Rules of engagement:

- **Never both on one directory at once.** A test-rebuild batch on
  `__tests__/planner/` and a redesign agent rewriting `components/planner/`
  simultaneously guarantees churn and AP1 pressure (assertion softening).
  The orchestrator sequences: redesign a route group to acceptance FIRST,
  then let the test batch rebuild against the settled components — or
  vice versa — never interleaved.
- **Consume its outputs:** `docs/ops/product-defects.md` (defects its
  rebuilt tests expose) feeds this loop's ranked list;
  `docs/ops/test-rebuild-ledger.md` tells you which suites are mid-flight.
- **Shared invariants, one owner:** its T3 policy rules (`naming-law`,
  `route-state-coverage`, `locked-palette`, `nav-catalog-parity`) enforce
  the same laws this loop builds toward. When the loop fixes a gap
  (error/loading boundaries, naming violations like the dead
  `finance/ThresholdCompass`), note it in the ledger so the policy rule
  confirms rather than re-discovers it.

## Stop conditions (the ONLY ways out)

- **Done:** two consecutive full passes where the audit sweep finds zero new
  defects AND the hostile self-audit produces no concrete criticism AND the
  `/homi-launch` LAUNCH-READY gate passes (metadata/SEO complete, signed-in
  QA recorded, marketing claims verified, launch plan written, only the
  owner punch list remains). "Screens look good" is not done — HōMI ready
  to market and go live is done. Then write the exit report
  (built/rebuilt/deleted/verification evidence) and the honest remainder
  list.
  When redesign passes go quiet but launch work remains, switch passes to
  the `/homi-launch` workstreams — same loop, same state file, same rules.
- **Blocked:** something only the user can decide (spend money, delete user
  data, product-direction call, credentials). Park it in the state file
  under a `BLOCKED:` heading, continue with everything else, and only stop
  fully when ALL remaining work is blocked.
- **Thrashing:** the same defect survives 3 fix attempts → mark it
  `STUCK:` with what was tried, move on; report all STUCK items at exit.

Hard ceiling: 25 passes without hitting Done → stop and report state
honestly. Never loop destructive commands; never deploy to production from
inside the loop.
