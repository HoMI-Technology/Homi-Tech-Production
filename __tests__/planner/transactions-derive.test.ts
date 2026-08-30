/**
 * Transaction filters and summaries operate on the booked list only.
 */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTER,
  filterTransactions,
  isFiltered,
  summarize,
  type TransactionFilter,
} from "@/components/planner/transactions/transactions-derive";
import type { Transaction } from "@/lib/planner/types";

function tx(over: Partial<Transaction> & { id: string }): Transaction {
  return {
    type: "expense",
    amount: 100,
    category: "food",
    date: "2026-08-01",
    ...over,
  } as Transaction;
}

const ROWS: Transaction[] = [
  tx({ id: "a", note: "Weekly shop", amount: 82.5, date: "2026-08-03", category: "food" }),
  tx({ id: "b", note: "Rent", amount: 1420, date: "2026-08-01", category: "housing" }),
  tx({
    id: "c",
    note: "Paycheck",
    amount: 4200,
    date: "2026-08-02",
    type: "income",
    category: "salary",
  }),
  tx({ id: "d", note: "Train pass", amount: 42, date: "2026-07-28", category: "transport" }),
];

const f = (over: Partial<TransactionFilter> = {}): TransactionFilter => ({
  ...DEFAULT_FILTER,
  ...over,
});

describe("filterTransactions", () => {
  it("defaults to newest first", () => {
    expect(filterTransactions(ROWS, f()).map((t) => t.id)).toEqual(["a", "c", "b", "d"]);
  });

  it("sorts by amount in both directions", () => {
    expect(filterTransactions(ROWS, f({ sort: "amount-desc" })).map((t) => t.id)).toEqual([
      "c",
      "b",
      "a",
      "d",
    ]);
    expect(filterTransactions(ROWS, f({ sort: "amount-asc" }))[0].id).toBe("d");
  });

  it("searches notes case-insensitively", () => {
    expect(filterTransactions(ROWS, f({ query: "rent" })).map((t) => t.id)).toEqual(["b"]);
  });

  it("searches by category name too", () => {
    expect(filterTransactions(ROWS, f({ query: "transport" })).map((t) => t.id)).toEqual(["d"]);
  });

  /** People search the number they remember, not a formatted string. */
  it("matches the digits typed against the amount", () => {
    const ids = filterTransactions(ROWS, f({ query: "42" })).map((t) => t.id);
    expect(ids).toContain("d"); // 42
    expect(ids).toContain("c"); // 4200
    expect(ids).not.toContain("b");
  });

  it("filters by type and category independently", () => {
    expect(filterTransactions(ROWS, f({ type: "income" })).map((t) => t.id)).toEqual(["c"]);
    expect(filterTransactions(ROWS, f({ category: "housing" })).map((t) => t.id)).toEqual(["b"]);
  });

  it("combines filters", () => {
    expect(filterTransactions(ROWS, f({ type: "expense", query: "42" })).map((t) => t.id)).toEqual([
      "d",
    ]);
  });

  it("returns nothing rather than everything when nothing matches", () => {
    expect(filterTransactions(ROWS, f({ query: "zzzz" }))).toEqual([]);
  });

  it("does not mutate the input array", () => {
    const before = ROWS.map((t) => t.id);
    filterTransactions(ROWS, f({ sort: "amount-asc" }));
    expect(ROWS.map((t) => t.id)).toEqual(before);
  });
});

describe("summarize", () => {
  it("totals the rows it is given, not the whole ledger", () => {
    const s = summarize(filterTransactions(ROWS, f({ type: "expense" })));
    expect(s.count).toBe(3);
    expect(s.income).toBe(0);
    expect(s.expense).toBe(1544.5);
    expect(s.net).toBe(-1544.5);
  });

  it("nets income against expense", () => {
    const s = summarize(ROWS);
    expect(s.income).toBe(4200);
    expect(s.net).toBe(4200 - 1544.5);
  });

  it("handles an empty set without NaN", () => {
    expect(summarize([])).toEqual({ count: 0, income: 0, expense: 0, net: 0 });
  });
});

describe("isFiltered", () => {
  it("is false for the default filter, including its sort", () => {
    expect(isFiltered(DEFAULT_FILTER)).toBe(false);
    expect(isFiltered(f({ sort: "amount-asc" }))).toBe(false);
  });

  it("ignores whitespace-only queries", () => {
    expect(isFiltered(f({ query: "   " }))).toBe(false);
  });

  it("is true when anything narrows the set", () => {
    expect(isFiltered(f({ query: "rent" }))).toBe(true);
    expect(isFiltered(f({ type: "income" }))).toBe(true);
    expect(isFiltered(f({ category: "food" }))).toBe(true);
  });
});
