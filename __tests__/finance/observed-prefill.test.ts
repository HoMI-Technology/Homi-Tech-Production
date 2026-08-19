import { describe, expect, it } from "vitest";
import { observeLinkedPrefill } from "@/lib/finance/observed-prefill";

function iso(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

describe("observed prefill — transfers are not income", () => {
  it("excludes TRANSFER_IN from inflows and never marks verified", () => {
    const suggestion = observeLinkedPrefill(
      [
        { amount: -4000, pending: false, txnDate: iso(40), category: "INCOME" },
        { amount: -2000, pending: false, txnDate: iso(20), category: "TRANSFER_IN" },
        { amount: 800, pending: false, txnDate: iso(10), category: "LOAN_PAYMENTS" },
        { amount: 500, pending: false, txnDate: iso(5), category: "FOOD_AND_DRINK" },
      ],
      [{ type: "depository", availableBalance: 12000 }],
    );

    expect(suggestion.canVerify).toBe(false);
    expect(suggestion.transferClassificationSafe).toBe(true);
    expect(suggestion.monthlyInflows).toBeGreaterThan(0);
    expect(suggestion.suggestedDti).not.toBeNull();
    // Transfer must not inflate income. 4000 over ~40d ≈ 3000/mo, not 6000.
    expect(suggestion.monthlyInflows).toBeLessThan(4500);
  });

  it("uncategorized money-in is not treated as income and stays unverified", () => {
    const suggestion = observeLinkedPrefill(
      [
        { amount: -3000, pending: false, txnDate: iso(31), category: null },
        { amount: 400, pending: false, txnDate: iso(2), category: "LOAN_PAYMENTS" },
      ],
      [{ type: "depository", currentBalance: 8000 }],
    );

    expect(suggestion.canVerify).toBe(false);
    expect(suggestion.transferClassificationSafe).toBe(false);
    expect(suggestion.suggestedDti).toBeNull();
    expect(suggestion.monthlyInflows).toBe(0);
  });
});
