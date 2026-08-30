# Loop — bounded iteration runner

Repeat the task given after this command until a stop condition is met.
This is an agentic loop inside the session — not a timer or cron. For true
time-based recurrence, tell the user to create an **Automation** (cron
trigger, ≥5-minute interval) whose prompt invokes this command.

Accepted forms:
- `/loop <task>` — loop until the task's natural success condition
- `/loop <N> <task>` — at most N iterations
- `/loop until <condition> <task>` — explicit stop condition

Examples: `/loop npm test and fix failures` (until green),
`/loop 5 refine the landing page copy`, `/loop until build exits 0 fix ts errors`.

**Auto-skill rule (full access granted):** at the start of the loop and at
every capability gap between passes, run `auto-find-skills` from
`~/.cursor/skills-cursor/`. The `skill-library` skill there gateways the
full 342-skill library (canonical store, workspace SoT, Skills Operators
Handbook) — read the right SKILL.md into context and follow it. Arm every
deployed agent the same way and log skill loads in your pass summaries.

## 1. Pin down the stop condition

Before the first pass, state the stop condition as something **checkable**
(exit code, failing-test count, lint output, file state). If the task has no
natural stop condition ("improve the code"), default to 3 passes and say so.

Iteration cap: default **10**, user's N overrides, hard ceiling **25** —
never exceed it without re-confirming with the user.

## 2. Iterate

Each pass:
1. **Check first** — evaluate the stop condition BEFORE doing work. If it
   already holds, stop (a zero-pass loop is a valid outcome).
2. Do one pass of the task.
3. Re-check the stop condition.
4. Emit a one-line summary: `pass 3/10 — 7 tests failing → 2 failing`.

Stop immediately when ANY of these hold:
- Stop condition met → success.
- Cap reached → report the best state achieved.
- No progress for 2 consecutive passes (same failures, same diff) → you are
  thrashing; stop and explain why.
- A pass regresses earlier progress → revert that pass, stop, report.

## 3. Report

End with: outcome (met / cap hit / stalled), passes used, what changed
overall, and — if not met — the remaining gap and your best hypothesis.

## Safety

- Never loop a destructive command (delete, reset --hard, force push,
  deploy). Refuse and explain.
- Never commit or push inside the loop unless the task explicitly says to.
- Two identical errors in a row counts as no progress — stop rather than
  retry identically.
