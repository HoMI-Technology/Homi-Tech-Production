/**
 * Verified cash flow — the Companion's first VERIFIED data source. Reads the
 * signed-in user's stored bank transactions (plaid_transactions, RLS
 * owner-scoped select) and summarizes the last N days. This is the moment the
 * confidence labels start earning their keep: everything else in the
 * Companion's context is self-reported; this block is bank-linked.
 *
 * Best-effort contract like the rest of the advisor stack: any failure
 * returns null and the Companion simply doesn't claim verified data.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const VERIFIED_WINDOW_DAYS = 30;

export interface VerifiedCashFlow {
  windowDays: number;
  /** Money in over the window (USD, positive). */
  income: number;
  /** Money out over the window (USD, positive). */
  expenses: number;
  /** income - expenses. */
  netCashFlow: number;
  /** Settled (non-pending) transactions summarized. */
  transactionCount: number;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Summarizes rows into a VerifiedCashFlow. Pure and exported for tests.
 * Pending transactions are excluded — their amounts can still change.
 */
export function summarizeCashFlow(
  rows: Array<{ amount: number | string; pending?: boolean | null }>,
  windowDays = VERIFIED_WINDOW_DAYS,
): VerifiedCashFlow | null {
  let income = 0;
  let expenses = 0;
  let count = 0;
  for (const row of rows) {
    if (row.pending) continue;
    const amount = Number(row.amount);
    if (!Number.isFinite(amount)) continue;
    count += 1;
    // Plaid convention: positive amount = money OUT, negative = money IN.
    if (amount < 0) income += -amount;
    else expenses += amount;
  }
  if (count === 0) return null;
  return {
    windowDays,
    income: round2(income),
    expenses: round2(expenses),
    netCashFlow: round2(income - expenses),
    transactionCount: count,
  };
}

/**
 * Loads the signed-in user's verified cash flow for the last
 * VERIFIED_WINDOW_DAYS. Null when the user has no linked bank, no settled
 * transactions in the window, or on any error.
 */
export async function getVerifiedCashFlow(
  supabase: SupabaseClient,
): Promise<VerifiedCashFlow | null> {
  try {
    const cutoffDate = new Date(Date.now() - VERIFIED_WINDOW_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await supabase
      .from("plaid_transactions")
      .select("amount, pending")
      .gte("txn_date", cutoffDate);
    if (error || !data) return null;
    return summarizeCashFlow(data);
  } catch {
    return null;
  }
}
