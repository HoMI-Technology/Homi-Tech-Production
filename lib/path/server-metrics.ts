import "server-only";

/**
 * Path to Ready v1 — server-side metric loading.
 *
 * Assembles the caller's finance ledger tables and derives the named metric
 * bundle from lib/finance/metrics.ts (the single import surface — Stand, CFM,
 * Path, and Companion must not invent three "honest" numbers). The result is
 * adapted into the pure generator's PathMetricsInput; null means unknown,
 * never zero.
 *
 * Returns null metrics when the finance tables are not migrated yet or hold
 * no data — the Path still generates questionnaire-only (assumption A5).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { metricsFromLedger } from "@/lib/finance/metrics";
import { FINANCE_LEDGER_INFRA_MISSING, rowToCategory, rowToTransaction } from "@/lib/finance/db-map";
import { dollarsToCents } from "@/lib/finance/money";
import type { BudgetPeriod } from "@/lib/finance/ledger";
import { CURRENT_SCHEMA_VERSION, type BudgetLedgerState } from "@/lib/finance/local-ledger";
import type {
  FinanceBudgetPeriodRow,
  FinanceCategoryRow,
  FinanceSavingsGoalRow,
  FinanceTransactionRow,
} from "@/types/database";
import type { PathGoalInput, PathMetricsInput } from "./types";

const TX_COLS =
  "id, user_id, type, status, amount_cents, currency, description, merchant_name, category_id, account_id, transaction_date, posted_at, source, external_transaction_id, recurring_rule_id, transfer_group_id, parent_transaction_id, is_excluded_from_budget, user_note, created_at, updated_at, deleted_at";
const CAT_COLS =
  "id, user_id, name, slug, category_type, essentiality, parent_category_id, is_system, is_archived, created_at, updated_at";
const PERIOD_COLS =
  "id, user_id, period_start, period_end, expected_income_cents, goal_reserve_cents, status, created_at, updated_at";
const GOAL_COLS =
  "id, user_id, name, goal_type, target_amount_cents, current_amount_cents, target_date, planned_monthly_contribution_cents, linked_decision_id, linked_account_id, status, created_at, updated_at";

export interface PathServerData {
  metrics: PathMetricsInput | null;
  goals: PathGoalInput[];
}

/** Loads ledger metrics + active goals for the path generator. */
export async function loadPathServerData(supabase: SupabaseClient): Promise<PathServerData> {
  const nowIso = new Date().toISOString();
  const asOf = nowIso.slice(0, 10);

  const [
    { data: txRows, error: txError },
    { data: catRows, error: catError },
    { data: periodRows, error: periodError },
    { data: goalRows, error: goalError },
  ] = await Promise.all([
    supabase
      .from("finance_transactions")
      .select(TX_COLS)
      .order("transaction_date", { ascending: false }),
    supabase.from("finance_categories").select(CAT_COLS),
    supabase
      .from("finance_budget_periods")
      .select(PERIOD_COLS)
      .order("period_start", { ascending: false })
      .limit(24),
    supabase
      .from("finance_savings_goals")
      .select(GOAL_COLS)
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(50),
  ]);

  const goals: PathGoalInput[] = ((goalRows ?? []) as FinanceSavingsGoalRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    goalType: r.goal_type,
    targetAmountCents: Number(r.target_amount_cents),
    currentAmountCents: Number(r.current_amount_cents),
    targetDate: r.target_date,
  }));

  for (const err of [txError, catError, periodError, goalError]) {
    if (err?.code && FINANCE_LEDGER_INFRA_MISSING.has(err.code)) {
      return { metrics: null, goals };
    }
  }

  const hasAnyData =
    (txRows && txRows.length > 0) || (periodRows && periodRows.length > 0) || goals.length > 0;
  if (!hasAnyData) return { metrics: null, goals };

  const state: BudgetLedgerState = {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    transactions: ((txRows ?? []) as FinanceTransactionRow[]).map(rowToTransaction),
    categories: ((catRows ?? []) as FinanceCategoryRow[]).map(rowToCategory),
    periods: ((periodRows ?? []) as FinanceBudgetPeriodRow[]).map((r) => ({
      id: r.id,
      userId: r.user_id,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      expectedIncomeCents:
        r.expected_income_cents === null
          ? null
          : (Number(r.expected_income_cents) as BudgetPeriod["expectedIncomeCents"]),
      goalReserveCents: Number(r.goal_reserve_cents),
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
    allocations: [],
    goals: ((goalRows ?? []) as FinanceSavingsGoalRow[]).map((r) => ({
      id: r.id,
      userId: r.user_id,
      name: r.name,
      goalType: r.goal_type,
      targetAmountCents: Number(r.target_amount_cents),
      currentAmountCents: Number(r.current_amount_cents),
      targetDate: r.target_date,
      plannedMonthlyContributionCents: Number(r.planned_monthly_contribution_cents),
      linkedDecisionId: r.linked_decision_id,
      linkedAccountId: r.linked_account_id,
      status: r.status,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })),
  };

  const named = metricsFromLedger(state, nowIso, asOf);

  const metrics: PathMetricsInput = {
    asOf,
    completeness: named.evidence.completeness,
    monthsWithData: named.evidence.monthsWithData,
    monthlyIncomeCents:
      named.dti.incomeDollars !== null && named.dti.incomeDollars > 0
        ? dollarsToCents(named.dti.incomeDollars)
        : null,
    monthlyOutflowCents:
      named.runway.monthlyOutflowDollars > 0
        ? dollarsToCents(named.runway.monthlyOutflowDollars)
        : null,
    monthlyDebtPaymentsCents:
      named.dti.debtPaymentDollars !== null ? dollarsToCents(named.dti.debtPaymentDollars) : null,
    liquidSavingsCents:
      named.runway.liquidDollars !== null ? dollarsToCents(named.runway.liquidDollars) : null,
    runwayMonths: named.runway.months,
    dtiPct: named.dti.pct,
    surplusCents: dollarsToCents(named.surplus.dollars),
  };

  return { metrics, goals };
}
