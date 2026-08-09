/**
 * Legacy-to-ledger migration stub (Phase 1).
 *
 * Seeds the budget ledger from the legacy monthly-aggregate FinanceState
 * stored in localStorage without deleting the legacy data. The ledger becomes
 * the new source of truth only after the user interacts with it; until then
 * the legacy snapshot remains intact.
 */

import type { FinanceCategory } from "@/lib/finance/ledger";
import { centsToDollars, dollarsToCents } from "@/lib/finance/money";
import { DEFAULT_FINANCE_STATE, type FinanceState } from "@/lib/finance/store";
import { metricsFromLedger } from "@/lib/finance/metrics";
import {
  activeGoal,
  addManualTransaction,
  BUDGET_LEDGER_STORAGE_KEY,
  emptyBudgetLedger,
  ensurePeriodFor,
  saveBudgetLedger,
  todayDateOnly,
  type BudgetLedgerState,
  upsertGoal,
} from "@/lib/finance/local-ledger";

/** LocalStorage keys that may hold a legacy FinanceState blob. */
export const LEGACY_FINANCE_STATE_KEYS = [
  "homi_state",
  "homi:finance-state",
  "user_finance_state",
  "homi:finance",
];

function isFinanceStateShape(value: unknown): value is Partial<FinanceState> {
  return (
    typeof value === "object" &&
    value !== null &&
    "monthlyIncome" in value &&
    typeof (value as Record<string, unknown>).monthlyIncome === "number" &&
    "monthlyExpenses" in value &&
    typeof (value as Record<string, unknown>).monthlyExpenses === "number" &&
    Array.isArray((value as Record<string, unknown>).expenseCategories)
  );
}

/** Tries each legacy key and returns the first valid FinanceState, or null. */
export function loadLegacyFinanceState(): FinanceState | null {
  if (typeof window === "undefined") return null;
  for (const key of LEGACY_FINANCE_STATE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as unknown;
      if (!isFinanceStateShape(parsed)) continue;
      return parsed as FinanceState;
    } catch {
      // Key unreadable or not JSON — try the next one.
    }
  }
  return null;
}

const LEGACY_CATEGORY_SLUGS: Record<string, string> = {
  "rent mortgage": "housing",
  rent: "housing",
  mortgage: "housing",
  food: "groceries",
  groceries: "groceries",
  transportation: "transportation",
  transport: "transportation",
  utilities: "utilities",
  "everything else": "other",
  other: "other",
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findSystemCategory(
  categories: readonly FinanceCategory[],
  name: string,
): FinanceCategory | undefined {
  const normalized = normalizeName(name);
  const slug = LEGACY_CATEGORY_SLUGS[normalized];
  if (slug) {
    return categories.find((c) => c.slug === slug && c.categoryType === "expense");
  }
  return categories.find(
    (c) =>
      c.categoryType === "expense" &&
      (normalizeName(c.name) === normalized || c.slug === normalized.replace(/\s+/g, "-")),
  );
}

/**
 * Converts a legacy monthly-aggregate state into a seeded ledger.
 *
 * - System categories are kept from the empty ledger seed.
 * - A calendar-month period is created for the current month.
 * - Monthly income becomes a posted income transaction.
 * - Each expense category becomes a posted expense transaction.
 * - A savings goal is created when a down-payment target or liquid savings exist.
 */
export function migrateLegacyToLedger(legacy: FinanceState, nowIso: string): BudgetLedgerState {
  const today = todayDateOnly(new Date(nowIso));
  let state = emptyBudgetLedger(nowIso);
  const { state: withPeriod, period } = ensurePeriodFor(state, today, nowIso);
  state = withPeriod;

  state = {
    ...state,
    periods: state.periods.map((p) =>
      p.id === period.id ? { ...p, expectedIncomeCents: dollarsToCents(legacy.monthlyIncome) } : p,
    ),
  };

  state = addManualTransaction(
    state,
    {
      type: "income",
      amountCents: dollarsToCents(legacy.monthlyIncome),
      description: "Monthly income",
      categoryId: "cat-payroll",
      transactionDate: period.periodStart,
    },
    nowIso,
  );

  for (const category of legacy.expenseCategories) {
    const mapped = findSystemCategory(state.categories, category.name);
    state = addManualTransaction(
      state,
      {
        type: "expense",
        amountCents: dollarsToCents(category.amount),
        description: category.name,
        categoryId: mapped?.id ?? "cat-other",
        transactionDate: period.periodStart,
      },
      nowIso,
    );
  }

  if (legacy.downPaymentTarget > 0 || legacy.liquidSavings > 0) {
    const isHome = legacy.downPaymentTarget > 0;
    state = upsertGoal(
      state,
      {
        name: isHome ? "Down payment" : "Emergency reserve",
        goalType: isHome ? "home" : "emergency_reserve",
        targetAmountCents: dollarsToCents(isHome ? legacy.downPaymentTarget : legacy.liquidSavings),
        currentAmountCents: dollarsToCents(legacy.liquidSavings),
        plannedMonthlyContributionCents: 0,
        targetDate: null,
      },
      nowIso,
    );
  }

  return state;
}

function hasUserCreatedData(state: BudgetLedgerState): boolean {
  return state.transactions.length > 0 || state.periods.length > 0 || state.goal !== null;
}

/**
 * Phase-1 dual-write: project ledger monthly aggregates back to legacy
 * FinanceState so old readers stay coherent until kill date (see
 * docs/ops/MONEY-LEDGER-MIGRATION.md). Never invents precision — uses period
 * metrics only.
 */
export function projectLedgerToLegacySnapshot(
  state: BudgetLedgerState,
  nowIso: string,
): FinanceState {
  const m = metricsFromLedger(state, nowIso, null);
  const goal = activeGoal(state);
  return {
    ...DEFAULT_FINANCE_STATE,
    monthlyIncome: m.surplus.incomeDollars,
    monthlyExpenses: m.surplus.expenseDollars,
    liquidSavings: m.runway.liquidDollars ?? 0,
    totalDebt: 0,
    monthlyDebtPayments: m.surplus.debtPaymentDollars,
    downPaymentTarget: goal?.goalType === "home" ? centsToDollars(goal.targetAmountCents) : 0,
    assets: [],
    liabilities: [],
  };
}

/**
 * After a successful ledger save, mirror aggregates into legacy FinanceState.
 * Kill after 2026-09-15 (docs/ops/MONEY-LEDGER-MIGRATION.md).
 */
export function dualWriteLegacyFromLedger(state: BudgetLedgerState): void {
  if (typeof window === "undefined") return;
  try {
    // Dynamic import of store write avoids hard cycle at module init.
    void import("@/lib/finance/store").then(({ saveFinanceState }) => {
      saveFinanceState(projectLedgerToLegacySnapshot(state, new Date().toISOString()));
    });
  } catch {
    // Best-effort dual-write.
  }
}

/**
 * Loads the current ledger and, if it has no user-created transactions,
 * periods, or goal, attempts to seed it from the legacy FinanceState and saves
 * the result.
 *
 * The optional `currentState` parameter lets `loadBudgetLedger` pass the
 * already-loaded empty state to avoid a recursive read.
 */
export function seedLedgerFromLegacyIfEmpty(
  nowIso: string,
  currentState?: BudgetLedgerState,
): BudgetLedgerState {
  const state = currentState ?? loadBudgetLedgerForMigration(nowIso);
  if (hasUserCreatedData(state)) return state;

  const legacy = loadLegacyFinanceState();
  if (!legacy) return state;

  const seeded = migrateLegacyToLedger(legacy, nowIso);
  saveBudgetLedger(seeded);
  return seeded;
}

/** Lightweight localStorage read used only by the migration helper. */
function loadBudgetLedgerForMigration(nowIso: string): BudgetLedgerState {
  if (typeof window === "undefined") return emptyBudgetLedger(nowIso);
  try {
    const raw = window.localStorage.getItem(BUDGET_LEDGER_STORAGE_KEY);
    if (!raw) return emptyBudgetLedger(nowIso);
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return emptyBudgetLedger(nowIso);
    const p = parsed as Record<string, unknown>;
    return {
      schemaVersion: typeof p.schemaVersion === "number" ? p.schemaVersion : 1,
      categories: Array.isArray(p.categories) ? (p.categories as FinanceCategory[]) : [],
      transactions: Array.isArray(p.transactions) ? p.transactions : [],
      periods: Array.isArray(p.periods) ? p.periods : [],
      allocations: Array.isArray(p.allocations) ? p.allocations : [],
      goal: p.goal ?? null,
    } as BudgetLedgerState;
  } catch {
    return emptyBudgetLedger(nowIso);
  }
}
