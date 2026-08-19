/**
 * Observed DTI / runway suggestions from linked Plaid Inc transactions.
 *
 * Suggestions only. Transfers are stored as income by amount sign on main
 * (`syncItemToLedger`), so this classifier is heuristic. It never marks
 * DTI/runway verified — provenance stays self_report. Transfers are excluded
 * when the Plaid PFC category is TRANSFER_IN / TRANSFER_OUT. Uncategorized
 * money-in is not treated as income. No demo P50. Holdings stay manual.
 */

export const OBSERVED_PREFILL_MIN_DAYS = 30;

export const TRANSFER_CATEGORIES = new Set(["TRANSFER_IN", "TRANSFER_OUT"]);
export const INCOME_CATEGORIES = new Set(["INCOME"]);
export const OBLIGATION_CATEGORIES = new Set(["LOAN_PAYMENTS"]);

export interface ObservedTxn {
  amount: number;
  pending?: boolean | null;
  txnDate?: string | null;
  category?: string | null;
}

export interface ObservedAccount {
  type?: string | null;
  currentBalance?: number | null;
  availableBalance?: number | null;
}

export interface ObservedPrefillSuggestion {
  lookbackDays: number;
  transactionCount: number;
  spanDays: number;
  monthlyInflows: number;
  monthlyObligations: number;
  monthlySpend: number;
  liquidBalances: number;
  suggestedDti: number | null;
  suggestedRunwayMonths: number | null;
  transferClassificationSafe: boolean;
  /** Always false this packet — heuristic classifier must not flip verified. */
  canVerify: boolean;
  reason: string | null;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function isTransferCategory(category: string | null | undefined): boolean {
  return Boolean(category && TRANSFER_CATEGORIES.has(category));
}

function isIncomeCategory(category: string | null | undefined): boolean {
  return Boolean(category && INCOME_CATEGORIES.has(category));
}

function isObligationCategory(category: string | null | undefined): boolean {
  return Boolean(category && OBLIGATION_CATEGORIES.has(category));
}

function settledPosted(rows: ObservedTxn[]): ObservedTxn[] {
  return rows.filter((row) => !row.pending && Number.isFinite(Number(row.amount)));
}

function spanDays(rows: ObservedTxn[]): number {
  const dates = rows
    .map((row) => row.txnDate)
    .filter((d): d is string => typeof d === "string" && d.length >= 10)
    .sort();
  if (dates.length === 0) return 0;
  const first = Date.parse(`${dates[0]}T00:00:00Z`);
  const last = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return Math.max(1, Math.round((last - first) / 86_400_000) + 1);
}

export function liquidDepositoryBalances(accounts: ObservedAccount[]): number {
  let sum = 0;
  for (const account of accounts) {
    if (account.type !== "depository") continue;
    const value = account.availableBalance ?? account.currentBalance ?? 0;
    if (Number.isFinite(value)) sum += value;
  }
  return round2(sum);
}

export function runwayMonthsFromLiquid(input: {
  liquidBalances: number;
  earmarkedDownPayment: number;
  monthlySpend: number;
}): number | null {
  if (input.monthlySpend <= 0) return null;
  const usable = input.liquidBalances - Math.max(0, input.earmarkedDownPayment);
  return round4(usable / input.monthlySpend);
}

/**
 * Build a suggestion from already-mirrored Plaid Inc transactions.
 * Does not mark verified — confirmation is a separate user action.
 */
export function observeLinkedPrefill(
  rows: ObservedTxn[],
  accounts: ObservedAccount[],
  earmarkedDownPayment = 0,
): ObservedPrefillSuggestion {
  const settled = settledPosted(rows);
  const span = spanDays(settled);
  const transferClassificationSafe = settled.every(
    (row) => typeof row.category === "string" && row.category.trim().length > 0,
  );

  let inflow = 0;
  let obligations = 0;
  let spend = 0;
  for (const row of settled) {
    const amount = Number(row.amount);
    if (isTransferCategory(row.category)) continue;
    // Plaid: positive = money out, negative = money in.
    if (amount < 0) {
      if (isIncomeCategory(row.category)) inflow += -amount;
    } else if (amount > 0) {
      if (isObligationCategory(row.category)) obligations += amount;
      else spend += amount;
    }
  }

  const monthFactor = 30 / Math.max(span, 1);
  const monthlyInflows = round2(inflow * monthFactor);
  const monthlyObligations = round2(obligations * monthFactor);
  const monthlySpend = round2(spend * monthFactor);
  const liquidBalances = liquidDepositoryBalances(accounts);
  const suggestedDti =
    monthlyInflows > 0 ? round4(Math.min(1, monthlyObligations / monthlyInflows)) : null;
  const suggestedRunwayMonths = runwayMonthsFromLiquid({
    liquidBalances,
    earmarkedDownPayment,
    monthlySpend,
  });

  let reason: string | null =
    "Linked observations stay self-report. Transfers are written as income by sign, so this classifier will not mark DTI verified.";
  if (settled.length === 0) {
    reason = "No settled linked transactions yet.";
  } else if (span < OBSERVED_PREFILL_MIN_DAYS) {
    reason = `Need at least ${OBSERVED_PREFILL_MIN_DAYS} days of linked transactions.`;
  } else if (!transferClassificationSafe) {
    reason = "Some transactions have no category, so transfers cannot be excluded safely.";
  } else if (suggestedDti === null) {
    reason = "No classified income — transfers are not treated as income.";
  }
  const canVerify = false;

  return {
    lookbackDays: span,
    transactionCount: settled.length,
    spanDays: span,
    monthlyInflows,
    monthlyObligations,
    monthlySpend,
    liquidBalances,
    suggestedDti,
    suggestedRunwayMonths,
    transferClassificationSafe,
    canVerify,
    reason,
  };
}
