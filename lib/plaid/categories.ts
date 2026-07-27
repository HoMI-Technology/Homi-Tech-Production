/**
 * Plaid category intelligence — recurring detection + path auto-complete signals.
 * Educational capacity awareness only. NOT a cancel-concierge or bill-negotiation product.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export const CATEGORY_WINDOW_DAYS = 90;

export interface CategorySpend {
  category: string;
  /** Monthly-ish average outflow (USD positive). */
  monthlyEstimate: number;
  /** Distinct merchant/name keys contributing. */
  merchantCount: number;
  transactionCount: number;
}

export interface RecurringCandidate {
  key: string;
  name: string;
  category: string;
  /** Median absolute amount when amount > 0 (outflow). */
  amount: number;
  /** Occurrences in window. */
  count: number;
  /** Estimated monthly drag. */
  monthlyEstimate: number;
  /** Heuristic: subscription-like if count >= 2 and stable amount. */
  subscriptionLike: boolean;
}

export interface CategoryIntelligence {
  windowDays: number;
  categories: CategorySpend[];
  recurring: RecurringCandidate[];
  /** Sum of subscription-like monthly estimates. */
  subscriptionDragMonthly: number;
  /** Top outflow categories for path signals. */
  topOutflowCategories: string[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function monthFactor(windowDays: number): number {
  return 30 / Math.max(windowDays, 1);
}

/**
 * Pure: detect recurring outflows from transaction rows.
 */
export function analyzeTransactionCategories(
  rows: Array<{
    amount: number | string;
    pending?: boolean | null;
    name?: string | null;
    merchant_name?: string | null;
    category?: string | null;
  }>,
  windowDays = CATEGORY_WINDOW_DAYS,
): CategoryIntelligence | null {
  const settled = rows.filter((r) => !r.pending);
  if (settled.length === 0) return null;

  const catTotals = new Map<string, { sum: number; count: number; merchants: Set<string> }>();
  const byKey = new Map<string, { amounts: number[]; category: string; name: string }>();

  for (const row of settled) {
    const amount = Number(row.amount);
    if (!Number.isFinite(amount) || amount <= 0) continue; // outflows only
    const category = (row.category || "Uncategorized").trim() || "Uncategorized";
    const merchant = (row.merchant_name || row.name || "Unknown").trim();
    const key = `${category}::${merchant.toLowerCase()}`;

    const cat = catTotals.get(category) ?? {
      sum: 0,
      count: 0,
      merchants: new Set<string>(),
    };
    cat.sum += amount;
    cat.count += 1;
    cat.merchants.add(merchant);
    catTotals.set(category, cat);

    const rec = byKey.get(key) ?? { amounts: [], category, name: merchant };
    rec.amounts.push(amount);
    byKey.set(key, rec);
  }

  const categories: CategorySpend[] = Array.from(catTotals.entries())
    .map(([category, v]) => ({
      category,
      monthlyEstimate: round2(v.sum * monthFactor(windowDays)),
      merchantCount: v.merchants.size,
      transactionCount: v.count,
    }))
    .sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);

  const recurring: RecurringCandidate[] = [];
  for (const [key, v] of byKey) {
    if (v.amounts.length < 2) continue;
    const sorted = [...v.amounts].sort((a, b) => a - b);
    const mid = sorted[Math.floor(sorted.length / 2)];
    const mean = v.amounts.reduce((s, x) => s + x, 0) / v.amounts.length;
    const variance =
      v.amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / v.amounts.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
    const subscriptionLike =
      v.amounts.length >= 2 && cv < 0.25 && mid >= 3 && mid <= 500;
    const monthlyEstimate = round2(
      mid * Math.min(v.amounts.length, 3) * monthFactor(windowDays) * (30 / 30),
    );
    // Better monthly: occurrences / (window/30) * median
    const months = windowDays / 30;
    const monthly = round2((v.amounts.length / Math.max(months, 0.5)) * mid);

    recurring.push({
      key,
      name: v.name,
      category: v.category,
      amount: round2(mid),
      count: v.amounts.length,
      monthlyEstimate: monthly,
      subscriptionLike,
    });
  }
  recurring.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate);

  const subscriptionDragMonthly = round2(
    recurring
      .filter((r) => r.subscriptionLike)
      .reduce((s, r) => s + r.monthlyEstimate, 0),
  );

  return {
    windowDays,
    categories,
    recurring: recurring.slice(0, 40),
    subscriptionDragMonthly,
    topOutflowCategories: categories.slice(0, 8).map((c) => c.category),
  };
}

/**
 * Load + analyze the signed-in user's transactions (owner RLS select).
 */
export async function getCategoryIntelligence(
  supabase: SupabaseClient,
  windowDays = CATEGORY_WINDOW_DAYS,
): Promise<CategoryIntelligence | null> {
  try {
    const cutoff = new Date(Date.now() - windowDays * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const { data, error } = await supabase
      .from("plaid_transactions")
      .select("amount, pending, name, merchant_name, category")
      .gte("txn_date", cutoff);
    if (error || !data) return null;
    return analyzeTransactionCategories(data, windowDays);
  } catch {
    return null;
  }
}

/**
 * Map category intelligence into path auto-complete / capacity signals.
 */
export function categorySignalsForPath(intel: CategoryIntelligence | null): {
  subscriptionDragMonthly: number;
  hasSubscriptionLoad: boolean;
  debtServiceHeavy: boolean;
  diningHeavy: boolean;
  notes: string[];
} {
  if (!intel) {
    return {
      subscriptionDragMonthly: 0,
      hasSubscriptionLoad: false,
      debtServiceHeavy: false,
      diningHeavy: false,
      notes: [],
    };
  }
  const notes: string[] = [];
  const cats = intel.categories.map((c) => c.category.toLowerCase());
  const debtServiceHeavy = cats.some(
    (c) => c.includes("loan") || c.includes("payment") || c.includes("credit"),
  );
  const diningHeavy = intel.categories.some(
    (c) =>
      /food|restaurant|dining|coffee/i.test(c.category) &&
      c.monthlyEstimate > 400,
  );
  if (intel.subscriptionDragMonthly >= 50) {
    notes.push(
      `Subscription-like recurring ~$${intel.subscriptionDragMonthly.toFixed(0)}/mo (capacity drag — review on /path; we do not cancel for you).`,
    );
  }
  if (diningHeavy) {
    notes.push("Dining/food is a top outflow category — cash-flow path step may apply.");
  }
  return {
    subscriptionDragMonthly: intel.subscriptionDragMonthly,
    hasSubscriptionLoad: intel.subscriptionDragMonthly >= 50,
    debtServiceHeavy,
    diningHeavy,
    notes,
  };
}
