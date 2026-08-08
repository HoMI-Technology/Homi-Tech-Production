# Money ledger migration — dual-write kill plan

**Status:** Active (2026-08-08)  
**Owner:** Product eng  

## Goal

One money SoT: **budget ledger** (`homi:budget-ledger` + server `finance_*` tables).  
Legacy `homi:finance` (`FinanceState`) is read-only fallback until kill date.

## Phases

| Phase | Behavior | Exit criteria |
|-------|----------|---------------|
| **0** (now) | CFM prefers ledger when real picture; else legacy | metrics module live |
| **1** dual-write | `saveBudgetLedger` also projects a legacy snapshot for old clients | 14 days no legacy-only users in analytics |
| **2** read ledger only | `buildCfm` ignores legacy if ledger key exists (even empty after explicit user clear) | CFM tests green |
| **3** kill | Stop writing `homi:finance`; remove Finance page body | Kill date + 30 days redirects only |

## Kill date (target)

**2026-09-15** — remove legacy write path unless metrics show >5% sessions still legacy-only.

## Dual-write (phase 1) implementation note

When writing the ledger, optionally:

```ts
// projectLegacyFromLedger(state) → FinanceState monthly aggregates
// saveFinanceState(projected) — only while phase <= 1
```

Do **not** reverse dual-write (legacy write → ledger) after user has real transactions — that reintroduces dual SoT.

## Observability

- `lens_prefilled.source` = ledger | legacy  
- `cfm_source` (optional)  
- Count of `hasSavedFinanceState && !hasSavedBudgetLedger`
