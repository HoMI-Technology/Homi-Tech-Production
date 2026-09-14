/**
 * Legacy-to-ledger one-time import (the data bridge, Phase 0/2 of
 * docs/ops/MONEY-LEDGER-MIGRATION.md).
 *
 * Seeds the budget ledger from the legacy monthly-aggregate FinanceState
 * stored in localStorage without deleting the legacy data (the read fallback
 * survives the transition window).
 *
 * Idempotency contract — never double-seeds:
 *   1. A ledger with any user-created data (transactions, periods, goals) is
 *      never reseeded.
 *   2. A persistent marker (`LEGACY_MIGRATION_MARKER_KEY`, an ISO migrated-at
 *      timestamp) is written the first time the seed runs OR the first time an
 *      already-populated ledger is observed. Once the marker exists the import
 *      never runs again — so an explicit user clear of the ledger stays clear
 *      instead of resurrecting the stale legacy snapshot (Phase 2 semantics).
 *
 * Amounts cross the dollar → integer-cents boundary exactly once, via
 * dollarsToCents (lib/finance/money.ts).
 *
 * Phase 3 note: the Phase-1 dual-write helpers (projectLedgerToLegacySnapshot
 * / dualWriteLegacyFromLedger) were removed at the kill date — nothing writes
 * the legacy snapshot from app code anymore.
 */

import type { FinanceCategory } from "@/lib/finance/ledger";
import { dollarsToCents } from "@/lib/finance/money";
import type { FinanceState } from "@/lib/finance/store";
import {
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

/**
 * ISO timestamp recording that the legacy → ledger import has run (or was
 * made moot by an already-populated ledger). Its existence — not its value —
 * is the "do not seed again" signal.
 */
export const LEGACY_MIGRATION_MARKER_KEY = "homi:budget-ledger:legacy-migrated-at";

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

/** Whether the one-time import has already happened (or been made moot). */
export function hasLegacyMigrationMarker(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LEGACY_MIGRATION_MARKER_KEY) !== null;
  } catch {
    return false;
  }
}

/** Records the migrated-at stamp. Best-effort — a failed stamp write only
 * means the seed data itself (already saved) is what prevents a reseed. */
function markLegacyMigrated(nowIso: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEGACY_MIGRATION_MARKER_KEY, nowIso);
  } catch {
    // Storage may be unavailable; the seeded ledger rows are still the guard.
  }
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

  if (legacy.monthlyIncome > 0) {
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
  }

  for (const category of legacy.expenseCategories) {
    if (typeof category.amount !== "number" || category.amount <= 0) continue;
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
  return state.transactions.length > 0 || state.periods.length > 0 || state.goals.length > 0;
}

/**
 * Loads the current ledger and, if it has no user-created transactions,
 * periods, or goal, attempts to seed it from the legacy FinanceState and saves
 * the result.
 *
 * Never double-seeds: the migrated-at marker short-circuits every later call,
 * so an explicit user clear of the ledger cannot resurrect the legacy numbers.
 * A ledger that already has user data marks the import moot for the same
 * reason — the user has their own ledger life now.
 *
 * The optional `currentState` parameter lets `loadBudgetLedger` pass the
 * already-loaded empty state to avoid a recursive read.
 */
export function seedLedgerFromLegacyIfEmpty(
  nowIso: string,
  currentState?: BudgetLedgerState,
): BudgetLedgerState {
  const state = currentState ?? loadBudgetLedgerForMigration(nowIso);
  if (hasUserCreatedData(state)) {
    markLegacyMigrated(nowIso);
    return state;
  }
  if (hasLegacyMigrationMarker()) return state;

  const legacy = loadLegacyFinanceState();
  if (!legacy) return state;

  const seeded = migrateLegacyToLedger(legacy, nowIso);
  if (saveBudgetLedger(seeded)) {
    markLegacyMigrated(nowIso);
  }
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
      // Tolerates both shapes: a v1 blob still carries `goal`, v2 carries `goals`.
      goals: Array.isArray(p.goals) ? p.goals : p.goal ? [p.goal] : [],
    } as BudgetLedgerState;
  } catch {
    return emptyBudgetLedger(nowIso);
  }
}
