/**
 * Transaction list derivation — search, filter, sort and totals.
 *
 * Pure functions, kept out of the component so the behaviour is unit-testable
 * without mounting anything. This mirrors banking-derive.ts and wealth-derive.ts,
 * and is the reason production's planner components stay presentational.
 */

import type { Transaction, TransactionType, CategoryId } from "@/lib/planner/types";

export type SortKey = "date-desc" | "date-asc" | "amount-desc" | "amount-asc";

export interface TransactionFilter {
  /** Free text over note and amount. Case-insensitive; empty means no filter. */
  query: string;
  /** null = both income and expense. */
  type: TransactionType | null;
  /** null = every category. */
  category: CategoryId | null;
  sort: SortKey;
}

export const DEFAULT_FILTER: TransactionFilter = {
  query: "",
  type: null,
  category: null,
  sort: "date-desc",
};

export interface TransactionSummary {
  count: number;
  income: number;
  expense: number;
  /** income − expense across the filtered set. */
  net: number;
}

/**
 * Matches a transaction against free text. Notes and category match on
 * substring; amounts match on *prefix*, not substring.
 *
 * Prefix is the deliberate choice: substring means typing "42" also returns a
 * £1,420 rent payment, because "1420" contains "42". People search the number
 * they remember from the start — "42" should find 42.00 and 4,200, not
 * everything with those digits buried inside.
 */
function matchesQuery(tx: Transaction, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;
  if ((tx.note ?? "").toLowerCase().includes(q)) return true;
  if (tx.category.toLowerCase().includes(q)) return true;
  const numeric = q.replace(/[^0-9.]/g, "");
  if (numeric !== "" && String(tx.amount).startsWith(numeric)) return true;
  return false;
}

export function filterTransactions(
  transactions: readonly Transaction[],
  filter: TransactionFilter,
): Transaction[] {
  const rows = transactions.filter((tx) => {
    if (filter.type !== null && tx.type !== filter.type) return false;
    if (filter.category !== null && tx.category !== filter.category) return false;
    return matchesQuery(tx, filter.query);
  });

  const sorted = [...rows];
  switch (filter.sort) {
    case "date-asc":
      sorted.sort((a, b) => a.date.localeCompare(b.date));
      break;
    case "amount-desc":
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case "amount-asc":
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case "date-desc":
    default:
      sorted.sort((a, b) => b.date.localeCompare(a.date));
      break;
  }
  return sorted;
}

/** Totals for whatever is currently on screen — not the whole ledger. */
export function summarize(transactions: readonly Transaction[]): TransactionSummary {
  let income = 0;
  let expense = 0;
  for (const tx of transactions) {
    if (tx.type === "income") income += tx.amount;
    else expense += tx.amount;
  }
  return { count: transactions.length, income, expense, net: income - expense };
}

/** True when the filter would hide anything — drives the "clear filters" affordance. */
export function isFiltered(filter: TransactionFilter): boolean {
  return filter.query.trim() !== "" || filter.type !== null || filter.category !== null;
}
