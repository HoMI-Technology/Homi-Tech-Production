/**
 * Verified cash flow contracts. What matters: Plaid's sign convention is
 * honored (positive = money OUT), pending transactions never count (their
 * amounts can still change), an empty window yields null rather than a fake
 * $0 claim, and the transaction→row mapping can't silently drop fields.
 */

import { describe, expect, it } from "vitest";
import { summarizeCashFlow } from "@/lib/plaid/cashflow";
import { mapTransactionRow } from "@/lib/plaid/sync";

describe("summarizeCashFlow", () => {
  it("honors the Plaid sign convention and rounds to cents", () => {
    const summary = summarizeCashFlow([
      { amount: -2500.005 }, // money in
      { amount: 1200.5 }, // money out
      { amount: 300 }, // money out
    ]);
    expect(summary?.income).toBe(2500.01);
    expect(summary?.expenses).toBe(1500.5);
    expect(summary?.netCashFlow).toBe(999.51);
    expect(summary?.transactionCount).toBe(3);
  });

  it("excludes pending transactions from the math and the count", () => {
    const summary = summarizeCashFlow([
      { amount: -1000, pending: false },
      { amount: 999999, pending: true },
    ]);
    expect(summary?.income).toBe(1000);
    expect(summary?.expenses).toBe(0);
    expect(summary?.transactionCount).toBe(1);
  });

  it("returns null for an empty window — never a fake verified $0", () => {
    expect(summarizeCashFlow([])).toBeNull();
    expect(summarizeCashFlow([{ amount: 50, pending: true }])).toBeNull();
  });

  it("tolerates numeric strings from Postgres and skips garbage", () => {
    const summary = summarizeCashFlow([
      { amount: "-100.25" },
      { amount: "not-a-number" as unknown as string },
    ]);
    expect(summary?.income).toBe(100.25);
    expect(summary?.transactionCount).toBe(1);
  });
});

describe("mapTransactionRow", () => {
  const item = { id: "item-row-1", user_id: "user-1" };

  it("maps every persisted field, with authorized_date as the date fallback", () => {
    const row = mapTransactionRow(item, {
      transaction_id: "t1",
      account_id: "acc_1",
      amount: 42.5,
      authorized_date: "2026-07-01",
      name: "Coffee",
      merchant_name: "Cafe",
      personal_finance_category: { primary: "FOOD_AND_DRINK" },
      pending: true,
      iso_currency_code: "USD",
    });
    expect(row.item_id).toBe("item-row-1");
    expect(row.user_id).toBe("user-1");
    expect(row.transaction_id).toBe("t1");
    expect(row.amount).toBe(42.5);
    expect(row.txn_date).toBe("2026-07-01");
    expect(row.name).toBe("Coffee");
    expect(row.merchant_name).toBe("Cafe");
    expect(row.category).toBe("FOOD_AND_DRINK");
    expect(row.pending).toBe(true);
    expect(row.iso_currency).toBe("USD");
  });

  it("defaults optional fields to null and pending to false", () => {
    const row = mapTransactionRow(item, { transaction_id: "t2", amount: -10 });
    expect(row.account_id).toBeNull();
    expect(row.txn_date).toBeNull();
    expect(row.name).toBeNull();
    expect(row.merchant_name).toBeNull();
    expect(row.category).toBeNull();
    expect(row.pending).toBe(false);
    expect(row.iso_currency).toBeNull();
  });
});
