// @vitest-environment jsdom
/**
 * Hand-off prefill contract: calculators seed from the user's SAVED numbers
 * only — never from the finance store's illustrative defaults.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { getToolPrefill } from "@/lib/tools/prefill";
import { saveFinanceState, DEFAULT_FINANCE_STATE } from "@/lib/finance/store";

beforeEach(() => {
  window.localStorage.clear();
});

describe("getToolPrefill", () => {
  it("returns null until finance data is saved — defaults never masquerade", () => {
    expect(getToolPrefill()).toBeNull();
  });

  it("maps saved numbers into calculator seeds", () => {
    saveFinanceState({
      ...DEFAULT_FINANCE_STATE,
      monthlyIncome: 8000,
      monthlyExpenses: 5000,
      monthlyDebtPayments: 1000,
      liquidSavings: 24000,
      totalDebt: 30000,
    });
    const prefill = getToolPrefill();
    expect(prefill?.annualIncome).toBe(96000);
    expect(prefill?.monthlyOutflow).toBe(6000);
    expect(prefill?.monthlyDebtPayments).toBe(1000);
    expect(prefill?.liquidSavings).toBe(24000);
  });
});
