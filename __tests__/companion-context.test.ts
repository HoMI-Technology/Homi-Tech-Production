// @vitest-environment jsdom
/**
 * The Companion's cross-ecosystem context builders. The contract that
 * matters most: the Companion must never present the finance store's
 * placeholder defaults as the user's own numbers — finance context only
 * exists once the user has actually saved finance data.
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  buildCompanionContext,
  buildFinanceContext,
  buildSurfaceContext,
} from "@/lib/advisor/context";
import { DEFAULT_FINANCE_STATE, saveFinanceState } from "@/lib/finance/store";

beforeEach(() => {
  window.localStorage.clear();
});

describe("buildFinanceContext", () => {
  it("returns undefined until the user has saved finance data", () => {
    expect(buildFinanceContext()).toBeUndefined();
  });

  it("derives the money picture from saved state", () => {
    saveFinanceState({
      ...DEFAULT_FINANCE_STATE,
      monthlyIncome: 8000,
      monthlyExpenses: 5000,
      monthlyDebtPayments: 1000,
      liquidSavings: 24000,
      totalDebt: 30000,
      assets: [{ id: "a", name: "Cash", amount: 50000 }],
      liabilities: [{ id: "l", name: "Loans", amount: 30000 }],
    });

    const ctx = buildFinanceContext();
    expect(ctx).toBeDefined();
    expect(ctx?.monthlyIncome).toBe(8000);
    expect(ctx?.netCashFlow).toBe(2000); // 8000 - 5000 - 1000
    expect(ctx?.savingsRate).toBe(25); // 2000 / 8000
    expect(ctx?.runwayMonths).toBe(4); // 24000 / 6000
    expect(ctx?.dti).toBe(12.5); // 1000 / 8000
    expect(ctx?.liquidSavings).toBe(24000);
    expect(ctx?.totalDebt).toBe(30000);
    expect(ctx?.netWorth).toBe(20000); // 50000 - 30000
  });

  it("reports runway as null when there is no outflow", () => {
    saveFinanceState({
      ...DEFAULT_FINANCE_STATE,
      monthlyExpenses: 0,
      monthlyDebtPayments: 0,
    });
    expect(buildFinanceContext()?.runwayMonths).toBeNull();
  });
});

describe("buildSurfaceContext", () => {
  it("maps known routes to human labels, most specific prefix first", () => {
    expect(buildSurfaceContext("/tools/mortgage")).toBe("the mortgage calculator");
    expect(buildSurfaceContext("/tools")).toBe("the financial tools hub");
    expect(buildSurfaceContext("/finance")).toBe("the Finance Command dashboard");
  });

  it("returns undefined for unknown or missing routes", () => {
    expect(buildSurfaceContext("/settings")).toBeUndefined();
    expect(buildSurfaceContext(null)).toBeUndefined();
    expect(buildSurfaceContext(undefined)).toBeUndefined();
  });
});

describe("buildCompanionContext", () => {
  it("assembles assessment, finance, and surface without leaking defaults", () => {
    const ctx = buildCompanionContext("/finance");
    // Nothing saved: no assessment, no finance — but the surface is known.
    expect(ctx.assessment).toBeUndefined();
    expect(ctx.finance).toBeUndefined();
    expect(ctx.surface).toBe("the Finance Command dashboard");
  });
});
