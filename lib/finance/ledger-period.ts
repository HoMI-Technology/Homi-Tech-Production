/**
 * Ledger period helpers — which budget period is open, what income it assumes,
 * and what of it was debt service.
 *
 * These lived in lib/advisor/finance-context.ts because the Companion context
 * was their first consumer. They are pure ledger arithmetic with nothing
 * advisor-specific in them, and lib/finance/metrics.ts needs them too — so
 * importing them from the advisor module inverted the layering and pulled the
 * whole Companion layer (signal builders, nudges, prompt shaping, ~21KB) into
 * every client bundle that touches metrics, including each /tools/* lens page.
 *
 * They belong to the finance layer. Both consumers import them from here.
 */

import type { BudgetPeriod } from "@/lib/finance/ledger";
import { ensurePeriodFor, type BudgetLedgerState } from "@/lib/finance/local-ledger";
import { isInPeriod } from "@/lib/finance/calculations";

export function monthFromDate(dateOnly: string): string {
  return dateOnly.slice(0, 7);
}

export function previousMonths(nowDate: string, count: number): string[] {
  const [y, m] = nowDate.split("-").map(Number);
  const months: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const total = y * 12 + (m - 1) - i;
    const yy = Math.floor(total / 12);
    const mm = (total % 12) + 1;
    months.push(`${yy}-${String(mm).padStart(2, "0")}`);
  }
  return months;
}

export function isAlive(tx: { deletedAt: string | null; status: string }): boolean {
  return tx.deletedAt === null && tx.status !== "voided";
}

export function isBudgetIncome(tx: {
  type: string;
  status: string;
  deletedAt: string | null;
}): boolean {
  return tx.type === "income" && tx.status === "posted" && isAlive(tx);
}

export function isBudgetExpense(tx: {
  type: string;
  status: string;
  deletedAt: string | null;
  isExcludedFromBudget: boolean;
}): boolean {
  return tx.type === "expense" && tx.status === "posted" && !tx.isExcludedFromBudget && isAlive(tx);
}

export function currentOpenPeriod(
  state: BudgetLedgerState,
  nowDate: string,
  nowIso: string,
): BudgetPeriod {
  const existing = state.periods.find(
    (p) => p.periodStart <= nowDate && p.periodEnd >= nowDate && p.status === "open",
  );
  if (existing) return existing;
  const { period } = ensurePeriodFor(state, nowDate, nowIso);
  return period;
}

function trailingIncomeCents(
  transactions: BudgetLedgerState["transactions"],
  nowDate: string,
  months: number,
): { avgMonthlyCents: number; monthsWithData: number } {
  const targetMonths = previousMonths(nowDate, months);
  const sums = new Map<string, number>();
  for (const tx of transactions) {
    if (!isBudgetIncome(tx)) continue;
    const month = monthFromDate(tx.transactionDate);
    if (!targetMonths.includes(month)) continue;
    sums.set(month, (sums.get(month) ?? 0) + tx.amountCents);
  }
  let total = 0;
  for (const month of targetMonths) {
    total += sums.get(month) ?? 0;
  }
  return { avgMonthlyCents: Math.round(total / months), monthsWithData: sums.size };
}

export function monthlyIncomeCents(
  state: BudgetLedgerState,
  period: BudgetPeriod,
  nowDate: string,
): { incomeCents: number; basis: "period_expected" | "trailing_three_month_average" } {
  if (period.expectedIncomeCents !== null && period.expectedIncomeCents > 0) {
    return { incomeCents: period.expectedIncomeCents, basis: "period_expected" };
  }
  const { avgMonthlyCents } = trailingIncomeCents(state.transactions, nowDate, 3);
  return { incomeCents: avgMonthlyCents, basis: "trailing_three_month_average" };
}

export function debtPaymentsCents(
  transactions: BudgetLedgerState["transactions"],
  period: Pick<BudgetPeriod, "periodStart" | "periodEnd">,
): number {
  // V1 ledger has no dedicated liability type, so the canonical "debt-payments"
  // expense category is the closest honest signal for monthly debt service.
  return transactions
    .filter(
      (tx) =>
        isBudgetExpense(tx) && tx.categoryId === "cat-debt-payments" && isInPeriod(tx, period),
    )
    .reduce((sum, tx) => sum + tx.amountCents, 0);
}
