import { describe, it, expect } from "vitest";
import { holdingLabel, summarizePlaidHoldings } from "@/lib/plaid/holdings-view";

describe("summarizePlaidHoldings", () => {
  it("sums institution values and known cost basis", () => {
    const summary = summarizePlaidHoldings([
      {
        account_id: "a1",
        security_id: "s1",
        quantity: 10,
        institution_price: 25,
        institution_value: 250,
        cost_basis: 200,
        iso_currency: "USD",
        security: { name: "Vanguard Total Stock", ticker_symbol: "VTI", type: "etf" },
      },
      {
        account_id: "a1",
        security_id: "s2",
        quantity: 1,
        institution_price: 50,
        institution_value: 50,
        cost_basis: null,
        iso_currency: "USD",
        security: { name: "Cash", ticker_symbol: "USD", type: "cash" },
      },
    ]);
    expect(summary.marketValue).toBe(300);
    expect(summary.positionCount).toBe(2);
    expect(summary.costBasis).toBe(200);
  });

  it("prefers ticker then name for the row label", () => {
    expect(
      holdingLabel({
        account_id: "a",
        security_id: "sec",
        quantity: 1,
        institution_price: 1,
        institution_value: 1,
        cost_basis: null,
        iso_currency: "USD",
        security: { name: "Vanguard Total Stock", ticker_symbol: "VTI", type: "etf" },
      }),
    ).toBe("VTI");
  });
});
