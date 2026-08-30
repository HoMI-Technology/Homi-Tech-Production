# Team-state packets

One file per named agent per muster: `<YYYY-MM-DD>-<agent-slug>.md`
(e.g. `2026-08-29-homi-finance.md`). Written by the `/homi-finish`
orchestrator from each agent's own report — never invented on their behalf.

Packet format:

```markdown
# <Agent name> — state packet <date>
## Locks / HOLDs (and why)
## Decisions made (my domain)
## In-flight (branch / PR / wave)
## Top gotchas
## Needs from other agents
```

Packets are canon on top of `../homi-agent-knowledge.md`: newer packet
wins over older pack entry for the same fact. Durable items get folded
into the main pack during the muster; packets older than ~a week are
history, not state.

Known standing facts at directory creation (2026-08-29): #333 is CLOSED superseded
(not merged). App UX does not carry an open-PR HOLD; the look HOLD is do-not-revive
/ do-not-match still 4b5d47ad.; Finance is locked on "Path and hard stops lead";
Brand & Design ruled "QA crop only, not a gate — Compass is the page";
Knowledge tracked live tip c1727cd (#337) before #338 merged.
