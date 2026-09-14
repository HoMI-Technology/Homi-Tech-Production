/**
 * Budget & Runway — Phase 2 reports & trends (pure).
 *
 * Pure arithmetic over the ledger domain types: no I/O, no clock reads.
 * Every function is deterministic over its inputs so the same ledger
 * always renders the same report.
 *
 * Honesty rules honored here:
 *   - <1 period of data → honest-empty report (hasData: false), never
 *     zero-filled tables pretending to be a report.
 *   - savings rate and MoM deltas are null when the denominator is zero —
 *     no Infinity%, no invented baselines.
 *   - completeness is graded and disclosed (uncategorized + pending
 *     counts), matching summarizePeriod's inclusion conventions: only
 *     posted, alive, non-excluded rows count toward income/spending.
 */

import { sumCents, type MoneyCents } from "@/lib/finance/money";
import {
  countsAsIncome,
  countsAsRefund,
  countsAsSpending,
  isInPeriod,
} from "@/lib/finance/calculations";
import type {
  BudgetPeriod,
  FinanceCategory,
  FinanceTransaction,
} from "@/lib/finance/ledger";

/* ------------------------------------------------------------------ */
/* Shared helpers                                                      */
/* ------------------------------------------------------------------ */

/** Signed spend contribution of one transaction (expense +, refund −). */
function signedSpend(tx: FinanceTransaction): number | null {
  if (countsAsSpending(tx)) return tx.amountCents;
  if (countsAsRefund(tx)) return -tx.amountCents;
  return null;
}

/** Report completeness mirrors the ledger's disclosure, not a score. */
export type CompletenessGrade = "complete" | "mostly_complete" | "partial" | "empty";

export function gradeCompleteness(input: {
  periodCount: number;
  uncategorizedCount: number;
  pendingCount: number;
  postedCount: number;
}): CompletenessGrade {
  if (input.periodCount === 0 || input.postedCount === 0) return "empty";
  const dirty = input.uncategorizedCount + input.pendingCount;
  if (dirty === 0) return "complete";
  // Ratio against everything seen, so 1 pending row in 200 still grades well.
  const total = input.postedCount + input.pendingCount;
  return dirty / Math.max(1, total) <= 0.1 ? "mostly_complete" : "partial";
}

/* ------------------------------------------------------------------ */
/* Monthly report                                                      */
/* ------------------------------------------------------------------ */

export interface MonthlyPeriodReport {
  periodId: string;
  periodStart: string;
  periodEnd: string;
  incomeCents: MoneyCents;
  netExpenseCents: MoneyCents;
  /** income − netExpense; signed (negative = spent more than earned). */
  netCents: MoneyCents;
  /** net ÷ income; null when income is zero (no false precision). */
  savingsRate: number | null;
  pendingCount: number;
  uncategorizedCount: number;
  /** Net spend per category for this period (expenses − refunds). */
  spendByCategory: ReadonlyMap<string, MoneyCents>;
}

export interface CategoryDelta {
  categoryId: string;
  /** Name from the category table; null when the category is unknown. */
  categoryName: string | null;
  currentCents: MoneyCents;
  previousCents: MoneyCents | null;
  /** current − previous; null when there is no prior period to compare. */
  deltaCents: MoneyCents | null;
}

export interface MonthlyReport {
  /** False when fewer than one period has data — render the empty state. */
  hasData: boolean;
  /** Oldest → newest. */
  periods: MonthlyPeriodReport[];
  /** Largest spenders in the newest period, with MoM deltas. */
  topCategories: CategoryDelta[];
  completeness: CompletenessGrade;
  /** Disclosed denominators behind the grade. */
  uncategorizedCount: number;
  pendingCount: number;
}

const TOP_CATEGORY_LIMIT = 5;

/**
 * Builds a month-over-month report from explicit budget periods and the
 * transactions that fall inside each. `transactionsByPeriod` is keyed by
 * period id; a missing key means zero transactions (an honest empty
 * month), not an error.
 *
 * Periods are sorted oldest → newest regardless of input order so the MoM
 * deltas always read forward in time.
 */
export function buildMonthlyReport(
  periods: readonly Pick<BudgetPeriod, "id" | "periodStart" | "periodEnd">[],
  transactionsByPeriod: ReadonlyMap<string, readonly FinanceTransaction[]>,
  categories: readonly Pick<FinanceCategory, "id" | "name">[],
): MonthlyReport {
  const ordered = [...periods].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  if (ordered.length === 0) {
    return {
      hasData: false,
      periods: [],
      topCategories: [],
      completeness: "empty",
      uncategorizedCount: 0,
      pendingCount: 0,
    };
  }

  let totalUncategorized = 0;
  let totalPending = 0;
  let totalPosted = 0;

  const reports: MonthlyPeriodReport[] = ordered.map((period) => {
    const txs = transactionsByPeriod.get(period.id) ?? [];
    const inPeriod = txs.filter((tx) => isInPeriod(tx, period));

    const incomeCents = sumCents(inPeriod.filter(countsAsIncome).map((tx) => tx.amountCents));
    let netExpenseCents = 0;
    const spendByCategory = new Map<string, number>();
    for (const tx of inPeriod) {
      const signed = signedSpend(tx);
      if (signed === null) continue;
      netExpenseCents += signed;
      if (tx.categoryId !== null) {
        spendByCategory.set(tx.categoryId, (spendByCategory.get(tx.categoryId) ?? 0) + signed);
      }
    }

    const pendingCount = inPeriod.filter(
      (tx) => tx.status === "pending" && tx.deletedAt === null,
    ).length;
    const uncategorizedCount = inPeriod.filter(
      (tx) =>
        (countsAsSpending(tx) || countsAsRefund(tx)) && tx.categoryId === null,
    ).length;
    const postedCount = inPeriod.filter((tx) => tx.status === "posted" && tx.deletedAt === null).length;

    totalPending += pendingCount;
    totalUncategorized += uncategorizedCount;
    totalPosted += postedCount;

    const netCents = incomeCents - netExpenseCents;
    return {
      periodId: period.id,
      periodStart: period.periodStart,
      periodEnd: period.periodEnd,
      incomeCents,
      netExpenseCents,
      netCents,
      savingsRate: incomeCents > 0 ? netCents / incomeCents : null,
      pendingCount,
      uncategorizedCount,
      spendByCategory,
    };
  });

  const latest = reports[reports.length - 1]!;
  const previous = reports.length > 1 ? reports[reports.length - 2]! : null;

  const topCategories: CategoryDelta[] = [...latest.spendByCategory.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, TOP_CATEGORY_LIMIT)
    .map(([categoryId, currentCents]) => {
      // A prior period with no activity in this category is a real 0; only
      // a missing prior period makes the delta null.
      const previousCents =
        previous !== null ? (previous.spendByCategory.get(categoryId) ?? 0) : null;
      return {
        categoryId,
        categoryName: nameById.get(categoryId) ?? null,
        currentCents,
        previousCents,
        deltaCents: previousCents !== null ? currentCents - previousCents : null,
      };
    });

  return {
    hasData: true,
    periods: reports,
    topCategories,
    completeness: gradeCompleteness({
      periodCount: ordered.length,
      uncategorizedCount: totalUncategorized,
      pendingCount: totalPending,
      postedCount: totalPosted,
    }),
    uncategorizedCount: totalUncategorized,
    pendingCount: totalPending,
  };
}

/* ------------------------------------------------------------------ */
/* Category trends                                                     */
/* ------------------------------------------------------------------ */

export interface CategoryTrendPoint {
  /** Month key "YYYY-MM". */
  month: string;
  amountCents: MoneyCents;
}

export interface CategoryTrend {
  categoryId: string;
  categoryName: string | null;
  /** One point per requested month, oldest → newest; 0 when the category
   * saw no qualifying activity that month (a real zero, not a gap in the
   * series). */
  points: CategoryTrendPoint[];
  /** last month − prior month; null with fewer than two months. */
  momChangeCents: MoneyCents | null;
  /** Mean of the last three months (integer cents, rounded half-up);
   * null with fewer than three months. */
  threeMonthAverageCents: MoneyCents | null;
}

/**
 * Monthly net spend per category over the given month keys ("YYYY-MM",
 * any order — sorted here). Uses summarizePeriod's inclusion rules:
 * pending, voided, soft-deleted, and budget-excluded rows never count;
 * refunds net against expenses.
 *
 * Returns only categories with any qualifying activity in the window, plus
 * the "uncategorized" bucket under categoryId null.
 */
export function buildCategoryTrends(
  transactions: readonly FinanceTransaction[],
  categories: readonly Pick<FinanceCategory, "id" | "name">[],
  months: readonly string[],
): CategoryTrend[] {
  const orderedMonths = [...new Set(months)].sort();
  const nameById = new Map(categories.map((c) => [c.id, c.name]));

  // month -> categoryId|null -> cents
  const buckets = new Map<string, Map<string | null, number>>();
  for (const month of orderedMonths) buckets.set(month, new Map());

  for (const tx of transactions) {
    const signed = signedSpend(tx);
    if (signed === null) continue;
    const month = tx.transactionDate.slice(0, 7);
    const bucket = buckets.get(month);
    if (!bucket) continue; // outside the requested window
    bucket.set(tx.categoryId, (bucket.get(tx.categoryId) ?? 0) + signed);
  }

  const categoryKeys = new Set<string | null>();
  for (const bucket of buckets.values()) {
    for (const key of bucket.keys()) categoryKeys.add(key);
  }

  const trends: CategoryTrend[] = [];
  for (const categoryId of categoryKeys) {
    const points: CategoryTrendPoint[] = orderedMonths.map((month) => ({
      month,
      amountCents: buckets.get(month)!.get(categoryId) ?? 0,
    }));
    const last = points[points.length - 1];
    const prior = points.length > 1 ? points[points.length - 2] : undefined;
    trends.push({
      categoryId: categoryId ?? "uncategorized",
      categoryName: categoryId !== null ? (nameById.get(categoryId) ?? null) : "Uncategorized",
      points,
      momChangeCents:
        last !== undefined && prior !== undefined ? last.amountCents - prior.amountCents : null,
      threeMonthAverageCents:
        points.length >= 3
          ? Math.round(
              points.slice(-3).reduce((sum, p) => sum + p.amountCents, 0) / 3,
            )
          : null,
    });
  }

  // Largest most-recent-month spend first for deterministic rendering.
  return trends.sort((a, b) => {
    const la = a.points[a.points.length - 1]?.amountCents ?? 0;
    const lb = b.points[b.points.length - 1]?.amountCents ?? 0;
    return lb - la || a.categoryId.localeCompare(b.categoryId);
  });
}

/* ------------------------------------------------------------------ */
/* CSV export (RFC 4180)                                               */
/* ------------------------------------------------------------------ */

/**
 * RFC-4180 escaping: quote any field containing a comma, quote, CR, or LF;
 * double embedded quotes. Numbers and ISO dates pass through unquoted.
 */
export function csvEscape(field: string): string {
  if (/[",\r\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

/** Cents → fixed two-decimal dollar string with sign ("1234.56", "-9.00"). */
export function formatCsvAmount(cents: MoneyCents): string {
  const negative = cents < 0;
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const remainder = String(abs % 100).padStart(2, "0");
  return `${negative ? "-" : ""}${dollars}.${remainder}`;
}

export const TRANSACTION_CSV_HEADER = [
  "date",
  "payee",
  "category",
  "type",
  "amount",
  "status",
  "source",
] as const;

/**
 * Exports transactions as an RFC-4180 CSV string (LF line endings, header
 * row first). Rows are sorted by date then id for a stable file.
 *
 * Amount sign convention: expenses are negative, everything else positive —
 * the file is for spreadsheets, where a signed column sums correctly. The
 * ledger's positive-magnitude convention is restored on import, not here.
 * Transfers keep their magnitude and sign by type so the file round-trips:
 * expense → −amount; income/refund/adjustment → +amount; transfer → +amount
 * (the transfer's counter-leg is a separate row).
 *
 * Soft-deleted rows are excluded; pending and voided rows are included and
 * disclosed via the status column.
 */
export function exportTransactionsCsv(
  transactions: readonly FinanceTransaction[],
  categories: readonly Pick<FinanceCategory, "id" | "name">[],
): string {
  const nameById = new Map(categories.map((c) => [c.id, c.name]));
  const rows = transactions
    .filter((tx) => tx.deletedAt === null)
    .slice()
    .sort(
      (a, b) =>
        a.transactionDate.localeCompare(b.transactionDate) || a.id.localeCompare(b.id),
    );

  const lines: string[] = [TRANSACTION_CSV_HEADER.join(",")];
  for (const tx of rows) {
    const signed = tx.type === "expense" ? -tx.amountCents : tx.amountCents;
    const fields = [
      tx.transactionDate,
      csvEscape(tx.merchantName ?? tx.description),
      csvEscape(tx.categoryId !== null ? (nameById.get(tx.categoryId) ?? "") : ""),
      tx.type,
      formatCsvAmount(signed),
      tx.status,
      tx.source,
    ];
    lines.push(fields.join(","));
  }
  return lines.join("\n") + "\n";
}
