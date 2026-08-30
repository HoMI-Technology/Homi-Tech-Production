# Goal — autonomous objective runner

The text after this command is an **outcome** you own until it is achieved or
you are genuinely blocked on a decision only the user can make. It is not a
single task.

If you have native goal tools (`create_goal` / `update_goal`) and grind
planning/execution, register the goal there too and use them to drive the
run — the state file below remains the durable record either way.

Named missions exist as commands: `/homi-redesign`, `/homi-redesign-loop`,
`/homi-launch`, `/homi-test-rebuild`. When a goal overlaps one, run the
mission command instead of re-deriving its plan from scratch.

**Auto-skill rule (full access granted):** before planning, and at every
capability gap while executing, run the `auto-find-skills` skill from
`~/.cursor/skills-cursor/` to arm yourself. The `skill-library` skill there
is your gateway to the user's full 342-skill library (canonical store,
workspace SoT, Skills Operators Handbook) — reading a skill's SKILL.md IS
using it; nothing needs installing first. Arm every agent you deploy the
same way.

## 1. Record the goal

Write it to `.grok/GOAL.md` at the repo root (create the folder if needed):

```markdown
# Goal
<one-sentence objective>

## Done means
- <verifiable criterion — a test passes, a command exits 0, a page renders>

## Plan
- [ ] task 1

## Log
- <timestamp> started
```

"Done means" criteria MUST be checkable, not vibes. If the objective is too
vague to verify, ask ONE clarifying question, then proceed — never more.

## 2. Plan

Explore the codebase first (read, grep, run existing tests), then break the
goal into 3–10 concrete tasks written as checkboxes in the Plan section.

## 3. Execute until done

For each task: do it → **verify with a real check** (never mark done on
faith) → tick the box → append one Log line → re-read the goal and replan if
the remaining tasks no longer serve it.

Rules:
- Stay in scope. Side-issues go in the Log as `NOTE:`, not into the plan,
  unless they block the goal.
- Never commit or push unless the goal explicitly includes it.
- If the same task fails 3 times in a row, stop and report the blocker
  instead of thrashing.

## 4. Report

When every "Done means" criterion passes: state what was achieved with the
verification evidence, list anything noted or skipped, and append
`- <timestamp> DONE` to the Log. If blocked: say exactly what blocks you,
what you tried, and the single decision you need.

If invoked with no argument and `.grok/GOAL.md` has unchecked boxes, resume
that goal from where the Log left off.
