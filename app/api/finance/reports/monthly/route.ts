import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import { buildMonthlyReport, buildCategoryTrends } from "@/lib/finance/reports";
import { isInPeriod } from "@/lib/finance/calculations";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToCategory,
  rowToTransaction,
  type FinanceCategoryRow,
  type FinanceTransactionRow,
} from "@/lib/finance/db-map";
import type { FinanceBudgetPeriodRow } from "@/types/database";
import type { BudgetPeriod } from "@/lib/finance/ledger";

export const runtime = "nodejs";

const PERIOD_COLS =
  "id, user_id, period_start, period_end, expected_income_cents, goal_reserve_cents, status, household_id, created_at, updated_at";
const TX_COLS =
  "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at";

const DEFAULT_MONTHS = 6;
const MAX_MONTHS = 24;
const MAX_TRANSACTIONS = 10_000;

const DEFERRED_BODY = {
  report: { hasData: false, periods: [], topCategories: [] },
  trends: [],
  deferred: true,
};

/**
 * GET /api/finance/reports/monthly?months=N (default 6, max 24)
 *
 * Month-over-month report + category trends across the caller's most
 * recent N budget periods. Honest-empty when the caller has no periods:
 * `hasData: false`, never zero-filled months. Read-only; derived entirely
 * from the ledger. Personal scope only (own periods) — household-shared
 * periods never feed a member's private report in v1.
 */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-reports-read:${ip}`, {
    limit: 30,
    windowMs: 60_000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const url = new URL(request.url);
  const monthsRaw = Number(url.searchParams.get("months") ?? String(DEFAULT_MONTHS));
  const months = Number.isFinite(monthsRaw)
    ? Math.min(Math.max(Math.trunc(monthsRaw), 1), MAX_MONTHS)
    : DEFAULT_MONTHS;

  const { data: periodRows, error: periodError } = await supabase
    .from("finance_budget_periods")
    .select(PERIOD_COLS)
    .eq("user_id", user.id)
    .order("period_start", { ascending: false })
    .limit(months);

  if (periodError) {
    if (periodError.code && FINANCE_LEDGER_INFRA_MISSING.has(periodError.code)) {
      return NextResponse.json(DEFERRED_BODY);
    }
    const correlationId = crypto.randomUUID();
    console.error(`[finance-reports:periods:${correlationId}]`, periodError.message);
    return NextResponse.json(
      { error: "Could not load the report.", correlationId },
      { status: 500 },
    );
  }

  const periods: BudgetPeriod[] = ((periodRows ?? []) as FinanceBudgetPeriodRow[]).map(
    (row) => ({
      id: row.id,
      userId: row.user_id,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      expectedIncomeCents:
        row.expected_income_cents === null ? null : Number(row.expected_income_cents),
      goalReserveCents: Number(row.goal_reserve_cents),
      status: row.status,
      householdId: row.household_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
  );

  if (periods.length === 0) {
    // Honest empty state — no periods means no report, not a zero report.
    return NextResponse.json({
      report: buildMonthlyReport([], new Map(), []),
      trends: [],
    });
  }

  const earliestStart = periods.reduce(
    (min, p) => (p.periodStart < min ? p.periodStart : min),
    periods[0]!.periodStart,
  );
  const latestEnd = periods.reduce(
    (max, p) => (p.periodEnd > max ? p.periodEnd : max),
    periods[0]!.periodEnd,
  );

  const [{ data: txRows, error: txError }, { data: catRows, error: catError }] =
    await Promise.all([
      supabase
        .from("finance_transactions")
        .select(TX_COLS)
        .eq("user_id", user.id)
        .gte("transaction_date", earliestStart)
        .lte("transaction_date", latestEnd)
        .order("transaction_date", { ascending: true })
        .limit(MAX_TRANSACTIONS),
      supabase.from("finance_categories").select("id, user_id, name, slug, category_type, essentiality, parent_category_id, is_system, is_archived, created_at, updated_at"),
    ]);

  for (const [scope, error] of [
    ["transactions", txError],
    ["categories", catError],
  ] as const) {
    if (error) {
      if (error.code && FINANCE_LEDGER_INFRA_MISSING.has(error.code)) {
        return NextResponse.json(DEFERRED_BODY);
      }
      const correlationId = crypto.randomUUID();
      console.error(`[finance-reports:${scope}:${correlationId}]`, error.message);
      return NextResponse.json(
        { error: "Could not load the report.", correlationId },
        { status: 500 },
      );
    }
  }

  const transactions = ((txRows ?? []) as FinanceTransactionRow[]).map(rowToTransaction);
  const categories = ((catRows ?? []) as FinanceCategoryRow[]).map(rowToCategory);

  const transactionsByPeriod = new Map<string, typeof transactions>();
  for (const period of periods) {
    transactionsByPeriod.set(
      period.id,
      transactions.filter((tx) => isInPeriod(tx, period)),
    );
  }

  const report = buildMonthlyReport(periods, transactionsByPeriod, categories);
  const monthKeys = [...periods]
    .sort((a, b) => a.periodStart.localeCompare(b.periodStart))
    .map((p) => p.periodStart.slice(0, 7));
  const trends = buildCategoryTrends(transactions, categories, monthKeys);

  // Maps are not JSON-serializable; flatten per-period category spend.
  return NextResponse.json({
    report: {
      ...report,
      periods: report.periods.map((p) => ({
        ...p,
        spendByCategory: Object.fromEntries(p.spendByCategory),
      })),
    },
    trends,
  });
}
