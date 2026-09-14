import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/ratelimit";
import {
  FINANCE_LEDGER_INFRA_MISSING,
  rowToCategory,
  rowToRecurringRule,
  rowToTransaction,
  type FinanceCategoryRow,
  type FinanceRecurringRuleRow,
  type FinanceTransactionRow,
} from "@/lib/finance/db-map";
import type { FinanceBudgetAllocationRow, FinanceBudgetPeriodRow } from "@/types/database";
import type { BudgetCategoryAllocation, BudgetPeriod } from "@/lib/finance/ledger";
import { summarizePeriod } from "@/lib/finance/calculations";
import { computeEnvelopeState } from "@/lib/finance/envelope";
import { forecastCashFlow } from "@/lib/finance/forecast";
import { computeBudgetAlerts, type BudgetAlert } from "@/lib/finance/alerts";

export const runtime = "nodejs";

const TX_COLS =
  "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at";

const RULE_COLS =
  "id, user_id, type, amount_cents, description, category_id, cadence, start_date, next_occurrence_date, end_date, generation_mode, is_active, detection_source, detection_confidence, created_at, updated_at, deleted_at";

const INSIGHT_COLS =
  "id, user_id, agent_id, type, title, body, severity, action_label, action_href, dismissed_at, created_at, updated_at";

const bodySchema = z
  .object({
    /** Date-only reference day; defaults to the server's current date. */
    asOfDate: z.iso.date().optional(),
    /** Forecast horizon feeding bill_due context. */
    horizonDays: z.number().int().min(7).max(92).default(31),
  })
  .strict()
  .default({ horizonDays: 31 });

function serverError(scope: string, message: string | undefined) {
  const correlationId = crypto.randomUUID();
  console.error(`[finance-alerts:${scope}:${correlationId}]`, message);
  return NextResponse.json(
    { error: "Could not compute budget alerts right now.", correlationId },
    { status: 500 },
  );
}

interface AlertContext {
  alerts: BudgetAlert[];
  deferred: boolean;
}

async function buildAlertContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  asOfDate: string,
  horizonDays: number,
): Promise<AlertContext | { error: NextResponse }> {
  // Current open period containing asOfDate.
  const { data: periodRows, error: periodError } = await supabase
    .from("finance_budget_periods")
    .select(
      "id, user_id, period_start, period_end, expected_income_cents, goal_reserve_cents, status, created_at, updated_at",
    )
    .eq("user_id", userId)
    .eq("status", "open")
    .lte("period_start", asOfDate)
    .gte("period_end", asOfDate)
    .limit(1);

  if (periodError) {
    if (periodError.code && FINANCE_LEDGER_INFRA_MISSING.has(periodError.code)) {
      return { alerts: [], deferred: true };
    }
    return { error: serverError("period-read", periodError.message) };
  }

  const periodRow = (periodRows ?? [])[0] as FinanceBudgetPeriodRow | undefined;

  if (!periodRow) {
    // No open period: an honest empty result, not invented zeros.
    return { alerts: [], deferred: false };
  }

  const period: BudgetPeriod = {
    id: periodRow.id,
    userId: periodRow.user_id,
    periodStart: periodRow.period_start,
    periodEnd: periodRow.period_end,
    expectedIncomeCents:
      periodRow.expected_income_cents === null ? null : Number(periodRow.expected_income_cents),
    goalReserveCents: Number(periodRow.goal_reserve_cents),
    status: periodRow.status,
    createdAt: periodRow.created_at,
    updatedAt: periodRow.updated_at,
  };

  const [allocRes, txRes, ruleRes, catRes] = await Promise.all([
    supabase
      .from("finance_budget_allocations")
      .select("id, budget_period_id, category_id, planned_cents, rollover_mode, created_at, updated_at")
      .eq("budget_period_id", period.id),
    supabase
      .from("finance_transactions")
      .select(TX_COLS)
      .eq("user_id", userId)
      .gte("transaction_date", period.periodStart)
      .lte("transaction_date", period.periodEnd)
      .limit(500),
    supabase
      .from("finance_recurring_rules")
      .select(RULE_COLS)
      .eq("user_id", userId)
      .is("deleted_at", null)
      .eq("is_active", true)
      .limit(100),
    supabase
      .from("finance_categories")
      .select(
        "id, user_id, name, slug, category_type, essentiality, parent_category_id, is_system, is_archived, created_at, updated_at",
      )
      .or(`user_id.eq.${userId},is_system.eq.true`)
      .limit(200),
  ]);

  for (const res of [allocRes, txRes, ruleRes, catRes]) {
    if (res.error) {
      if (res.error.code && FINANCE_LEDGER_INFRA_MISSING.has(res.error.code)) {
        return { alerts: [], deferred: true };
      }
      return { error: serverError("context-read", res.error.message) };
    }
  }

  const allocations = (allocRes.data ?? []) as FinanceBudgetAllocationRow[];
  const domainAllocations: BudgetCategoryAllocation[] = allocations.map((row) => ({
    id: row.id,
    budgetPeriodId: row.budget_period_id,
    categoryId: row.category_id,
    plannedCents: Number(row.planned_cents),
    rolloverMode: row.rollover_mode,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  const transactions = ((txRes.data ?? []) as FinanceTransactionRow[]).map(rowToTransaction);
  const rules = ((ruleRes.data ?? []) as FinanceRecurringRuleRow[]).map(rowToRecurringRule);
  const categories = ((catRes.data ?? []) as FinanceCategoryRow[]).map(rowToCategory);
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  const totals = summarizePeriod(transactions, period);
  const envelopeState = computeEnvelopeState(period, domainAllocations, transactions);

  // Balance is not knowable server-side; the forecast runs with a null
  // starting balance (honest nulls downstream) and trailing averages left
  // unknown. Rules still drive bill_due alerts.
  const forecast = forecastCashFlow({
    startingBalanceCents: null,
    recurringRules: rules,
    trailingAverages: {
      avgMonthlyIncomeCents: null,
      avgMonthlyExpenseCents: null,
      monthsWithData: 0,
    },
    horizonDays,
    asOfDate,
  });

  const alerts = computeBudgetAlerts({
    period,
    envelopeState,
    recurringRules: rules,
    forecast,
    runway: null,
    uncategorizedCount: totals.uncategorizedCount,
    asOfDate,
    categoryNames,
  });

  return { alerts, deferred: false };
}

/** Map alert severity onto the finance_insights type/severity shape. */
function toInsightShape(alert: BudgetAlert) {
  return {
    agent_id: "analyst" as const,
    type: alert.severity === "amber" || alert.severity === "crimson" ? "nudge" : "signal",
    title: alert.title,
    body: alert.message,
    severity: alert.severity,
  };
}

/** GET /api/finance/alerts — computed alerts for the current period, not persisted. */
export async function GET(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-alerts-read:${ip}`, { limit: 60, windowMs: 60_000 });
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
  const asOfDate = url.searchParams.get("asOfDate") ?? new Date().toISOString().slice(0, 10);

  const context = await buildAlertContext(supabase, user.id, asOfDate, 31);
  if ("error" in context) return context.error;
  if (context.deferred) {
    return NextResponse.json({ alerts: [], deferred: true });
  }
  return NextResponse.json({ alerts: context.alerts });
}

/**
 * POST /api/finance/alerts — computes the current alert set and persists it
 * into finance_insights. Idempotent: an alert is inserted only when no
 * undismissed insight with the same deterministic title exists, so re-runs
 * never duplicate undismissed alerts. (A dismissed alert may resurface —
 * dismissal acknowledges, it does not silence the fact.)
 */
export async function POST(request: Request) {
  const ip = getClientIp(request);
  const { allowed } = await rateLimit(`finance-alerts-write:${ip}`, { limit: 30, windowMs: 60_000 });
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

  let json: unknown = {};
  if (request.headers.get("content-length") !== "0") {
    try {
      const text = await request.text();
      json = text ? JSON.parse(text) : {};
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request.", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const asOfDate = parsed.data.asOfDate ?? new Date().toISOString().slice(0, 10);
  const context = await buildAlertContext(supabase, user.id, asOfDate, parsed.data.horizonDays);
  if ("error" in context) return context.error;
  if (context.deferred) {
    return NextResponse.json({ deferred: true, persisted: 0, skipped: 0 }, { status: 202 });
  }

  const { data: existing, error: existingError } = await supabase
    .from("finance_insights")
    .select(INSIGHT_COLS)
    .eq("user_id", user.id)
    .is("dismissed_at", null);

  if (existingError) {
    if (existingError.code && FINANCE_LEDGER_INFRA_MISSING.has(existingError.code)) {
      return NextResponse.json({ deferred: true, persisted: 0, skipped: 0 }, { status: 202 });
    }
    return serverError("insights-read", existingError.message);
  }

  const liveTitles = new Set(
    ((existing ?? []) as Array<{ title: string }>).map((row) => row.title),
  );

  let persisted = 0;
  let skipped = 0;
  for (const alert of context.alerts) {
    if (liveTitles.has(alert.title)) {
      skipped += 1;
      continue;
    }
    const shape = toInsightShape(alert);
    const { error: insertError } = await supabase.from("finance_insights").insert({
      user_id: user.id,
      agent_id: shape.agent_id,
      type: shape.type,
      title: shape.title,
      body: shape.body,
      severity: shape.severity,
      action_label: null,
      action_href: null,
    });
    if (insertError) {
      if (insertError.code && FINANCE_LEDGER_INFRA_MISSING.has(insertError.code)) {
        return NextResponse.json({ deferred: true, persisted: 0, skipped: 0 }, { status: 202 });
      }
      return serverError("persist", insertError.message);
    }
    liveTitles.add(alert.title);
    persisted += 1;
  }

  return NextResponse.json({ alerts: context.alerts, persisted, skipped });
}
