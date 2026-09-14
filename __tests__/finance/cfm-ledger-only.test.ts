// @vitest-environment jsdom
/**
 * CFM Phase-2 contract (docs/ops/MONEY-LEDGER-MIGRATION.md): once the
 * budget-ledger key exists it is the only money source — legacy is ignored
 * even when the ledger is empty after an explicit user clear.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { buildCfm, ledgerHasRealPicture } from "@/lib/tools/cfm";
import { saveFinanceState, DEFAULT_FINANCE_STATE } from "@/lib/finance/store";
import {
  addManualTransaction,
  emptyBudgetLedger,
  saveBudgetLedger,
  BUDGET_LEDGER_STORAGE_KEY,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import { LEGACY_MIGRATION_MARKER_KEY } from "@/lib/finance/migrate-from-legacy";

beforeEach(() => {
  window.localStorage.clear();
});

describe("buildCfm Phase 2 — ledger-only reads once the key exists", () => {
  it("returns null until finance data is saved — defaults never masquerade", () => {
    expect(buildCfm()).toBeNull();
  });

  it("reads legacy only when the ledger key has never existed", () => {
    saveFinanceState({ ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000 });
    const cfm = buildCfm();
    expect(cfm).not.toBeNull();
    expect(cfm!.meta.source).toBe("legacy");
    expect(cfm!.core.monthlyIncome).toEqual({ value: 8000, source: "self-reported" });
  });

  it("prefers a real budget ledger over the legacy finance snapshot", () => {
    saveFinanceState({ ...DEFAULT_FINANCE_STATE, monthlyIncome: 1000 });
    const nowIso = new Date().toISOString();
    const thisMonth = `${nowIso.slice(0, 7)}-01`;
    let ledger: BudgetLedgerState = emptyBudgetLedger(nowIso);
    ledger = addManualTransaction(
      ledger,
      {
        type: "income",
        amountCents: 900_000,
        description: "Paycheck",
        categoryId: "cat-payroll",
        transactionDate: thisMonth,
      },
      nowIso,
    );
    expect(saveBudgetLedger(ledger)).toBe(true);
    expect(ledgerHasRealPicture(ledger)).toBe(true);

    const cfm = buildCfm();
    expect(cfm).not.toBeNull();
    expect(cfm!.meta.source).toBe("ledger");
    // $9,000 from ledger cents — not the $1,000 legacy snapshot.
    expect(cfm!.core.monthlyIncome.value).toBe(9000);
  });

  it("one-time import turns a first-contact legacy user into a ledger picture", () => {
    // No ledger key yet; legacy present. First buildCfm touches the ledger,
    // which seeds from legacy — so the source flips to ledger, not legacy.
    saveFinanceState({ ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000 });
    window.localStorage.setItem(BUDGET_LEDGER_STORAGE_KEY, JSON.stringify(
      emptyBudgetLedger(new Date().toISOString()),
    ));
    const cfm = buildCfm();
    expect(cfm).not.toBeNull();
    expect(cfm!.meta.source).toBe("ledger");
    expect(cfm!.core.monthlyIncome.value).toBe(8000);
  });

  it("an explicitly cleared ledger reads as honest empty — legacy never resurrects", () => {
    saveFinanceState({ ...DEFAULT_FINANCE_STATE, monthlyIncome: 8000 });
    const nowIso = new Date().toISOString();

    // Simulate: import ran once (marker set), then the user cleared the ledger.
    window.localStorage.setItem(LEGACY_MIGRATION_MARKER_KEY, nowIso);
    expect(saveBudgetLedger(emptyBudgetLedger(nowIso))).toBe(true);

    expect(buildCfm()).toBeNull();
    expect(window.localStorage.getItem(LEGACY_MIGRATION_MARKER_KEY)).not.toBeNull();
  });

  it("completeness travels with ledger-derived numbers", () => {
    const nowIso = new Date().toISOString();
    const thisMonth = `${nowIso.slice(0, 7)}-01`;
    let ledger = emptyBudgetLedger(nowIso);
    ledger = addManualTransaction(
      ledger,
      {
        type: "expense",
        amountCents: 50_000,
        description: "Groceries",
        categoryId: "cat-groceries",
        transactionDate: thisMonth,
      },
      nowIso,
    );
    saveBudgetLedger(ledger);
    const cfm = buildCfm();
    expect(cfm).not.toBeNull();
    expect(cfm!.meta.completeness).toBe("low");
    expect(cfm!.meta.hasDebtSignal).toBe(false);
    expect(cfm!.core.totalDebt.source).toBe("missing");
  });
});
