import { describe, it, expect } from "vitest";
import {
  mapHoldingRow,
  mapInvestmentTransactionRow,
  mapSecurityRow,
} from "@/lib/plaid/investments";

describe("mapSecurityRow", () => {
  it("keeps ticker and figi and does not require CUSIP", () => {
    const row = mapSecurityRow({
      security_id: "sec_1",
      name: "Vanguard Total Stock",
      ticker_symbol: "VTI",
      type: "etf",
      subtype: "etf",
      figi: "BBG000B9XRY4",
      is_cash_equivalent: false,
      close_price: 250.1,
      cusip: null,
      isin: null,
    });
    expect(row.security_id).toBe("sec_1");
    expect(row.ticker_symbol).toBe("VTI");
    expect(row.figi).toBe("BBG000B9XRY4");
    expect(row).not.toHaveProperty("cusip");
  });
});

describe("mapHoldingRow", () => {
  it("keys a position on account_id + security_id", () => {
    const row = mapHoldingRow(
      { id: "item-uuid", user_id: "user-uuid" },
      {
        account_id: "acc_ira",
        security_id: "sec_1",
        quantity: 10,
        institution_price: 25,
        institution_value: 250,
        cost_basis: 200,
        iso_currency_code: "USD",
      },
    );
    expect(row).toMatchObject({
      item_id: "item-uuid",
      user_id: "user-uuid",
      account_id: "acc_ira",
      security_id: "sec_1",
      quantity: 10,
      institution_value: 250,
    });
  });
});

describe("mapInvestmentTransactionRow", () => {
  it("preserves Plaid investment sign (buy positive, sale negative)", () => {
    const buy = mapInvestmentTransactionRow(
      { id: "item-uuid", user_id: "user-uuid" },
      {
        investment_transaction_id: "inv_1",
        account_id: "acc_ira",
        security_id: "sec_1",
        date: "2026-08-01",
        name: "BUY VTI",
        amount: 250,
        quantity: 1,
        price: 250,
        fees: 0,
        type: "buy",
        subtype: "buy",
        iso_currency_code: "USD",
      },
    );
    expect(buy.amount).toBe(250);
    expect(buy.investment_transaction_id).toBe("inv_1");
  });
});
