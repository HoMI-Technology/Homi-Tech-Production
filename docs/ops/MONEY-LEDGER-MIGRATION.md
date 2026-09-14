# Money ledger migration — dual-write kill plan

**Status:** Phase 3 shipped on `feat/ledger-foundation` (kill date 2026-09-15 met in code)
**Owner:** Product eng

## Goal

One money SoT: **budget ledger** (`homi:budget-ledger` + server `finance_*` tables).
Legacy `homi:finance` (`FinanceState`) is read-only fallback during the transition window.

## Phases

| Phase                  | Behavior                                                                              | Exit criteria                             | Shipped state |
| ---------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------- | ------------- |
| **0** (done)           | CFM prefers ledger when real picture; else legacy                                     | metrics module live                       | ✅ `lib/finance/metrics.ts` live; `buildCfm` prefers the ledger; `lens_prefilled.source` tracks ledger \| legacy (`hooks/use-lens-prefill.ts`) |
| **1** dual-write       | `saveBudgetLedger` also projects a legacy snapshot for old clients                    | 14 days no legacy-only users in analytics | ✅ **Closed without dual-write.** The projection helpers existed (`migrate-from-legacy.ts`) but were never invoked by app code — no app surface wrote `homi:finance`, so no live dual SoT ever formed. Helpers removed at Phase 3. The "14 days" analytics gate was overtaken by the kill date; see Risks. |
| **2** read ledger only | `buildCfm` ignores legacy if ledger key exists (even empty after explicit user clear) | CFM tests green                           | ✅ `buildCfm` returns honest empty (`null`) when the ledger key exists without a real picture; legacy is consulted only when the ledger key has never existed. A migrated-at marker (`homi:budget-ledger:legacy-migrated-at`) makes the one-time import fire exactly once, so an explicit clear never resurrects legacy numbers. Tests: `__tests__/finance/cfm-ledger-only.test.ts`. |
| **3** kill             | Stop writing `homi:finance`; remove Finance page body                                 | Kill date + 30 days redirects only        | ✅ Legacy write path removed from app code: PUT `/api/finance-state` answers 410 (GET stays for the transition window / import); `lib/finance/store.ts` marked `@deprecated`; `app/(product)/finance/` no longer exists (Money lives at `/money`). |

## Kill date (target)

**2026-09-15** — met in code on this branch. The >5% legacy-only analytics check could not be run from the repo; before merging to production, confirm the count of `hasSavedFinanceState && !hasSavedBudgetLedger` sessions in analytics. If it is above 5%, the read fallback (GET + `buildCfm` legacy path for never-ledger clients) still covers them — only *writes* are gone.

## Data bridge (legacy → ledger import)

- **Client:** `lib/finance/migrate-from-legacy.ts` — one-time localStorage seed, idempotent via the migrated-at marker + the never-reseed-a-filled-book rule. Integer cents via `dollarsToCents`; zero/empty legacy is an honest no-op.
- **Server:** `scripts/migrate-user-finance-state-to-ledger.mjs` — one-time `user_finance_state` → `finance_*` import (`source: "migration"` rows). Idempotent via a per-user marker in `finance_mutation_idempotency` (`legacy-migration-v1`); rows existing without a marker are reported as CONFLICT for manual review, never topped up.

## Dual-write (phase 1) implementation note (historical)

The planned shape was:

```ts
// projectLegacyFromLedger(state) → FinanceState monthly aggregates
// saveFinanceState(projected) — only while phase <= 1
```

It was never wired into app code and the helpers were deleted at the kill.
We never reversed dual-write (legacy write → ledger) after real transactions.

## Observability

- `lens_prefilled.source` = ledger | legacy ✅ (plus `completeness` and `hasDebtSignal`)
- `cfm_source` — not added separately; `CanonicalFinancialModel.meta.source` carries the same fact and `lens_prefilled.source` reports it at the point of use.
- Count of `hasSavedFinanceState && !hasSavedBudgetLedger` — **owner action in analytics** before/after merge.
