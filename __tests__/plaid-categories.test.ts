import { describe, expect, it } from "vitest";
import {
  analyzeTransactionCategories,
  categorySignalsForPath,
} from "@/lib/plaid/categories";

describe("analyzeTransactionCategories", () => {
  it("detects subscription-like recurring outflows", () => {
    const rows = [
      { amount: 15.99, pending: false, merchant_name: "Netflix", category: "Subscription" },
      { amount: 15.99, pending: false, merchant_name: "Netflix", category: "Subscription" },
      { amount: 15.99, pending: false, merchant_name: "Netflix", category: "Subscription" },
      { amount: 42, pending: false, merchant_name: "Random Cafe", category: "Food and Drink" },
      { amount: -2000, pending: false, merchant_name: "Payroll", category: "Income" },
    ];
    const intel = analyzeTransactionCategories(rows, 90);
    expect(intel).not.toBeNull();
    expect(intel!.recurring.some((r) => /netflix/i.test(r.name))).toBe(true);
    expect(intel!.subscriptionDragMonthly).toBeGreaterThan(0);
    const signals = categorySignalsForPath(intel);
    expect(signals.hasSubscriptionLoad || intel!.subscriptionDragMonthly > 0).toBe(true);
  });

  it("returns null for empty settled set", () => {
    expect(analyzeTransactionCategories([], 90)).toBeNull();
  });
});
