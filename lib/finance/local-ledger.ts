/**
 * Budget & Runway — local-first ledger persistence (PR 2: manual budget UI).
 *
 * Same local-first contract as the legacy snapshot (store.ts): localStorage
 * is the synchronous source of truth the UI reads and writes. Per-record
 * server sync is a later PR (behind FINANCE_LEDGER_ENABLED) and will adopt
 * these records by their stable ids; until then userId is a placeholder the
 * sync layer rewrites on adoption.
 *
 * SSR-safe: every storage read/write is guarded behind `typeof window`.
 * Mutation helpers are pure (state in → state out) so they test without a
 * DOM and so React state updates stay referentially honest.
 */

import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  type BudgetCategoryAllocation,
  type BudgetPeriod,
  type FinanceCategory,
  type FinanceTransaction,
  type SavingsGoal,
  type TransactionType,
} from "@/lib/finance/ledger";
import { isValidCents, type MoneyCents } from "@/lib/finance/money";

const STORAGE_KEY = "homi:budget-ledger";

/** userId for records created before sign-in; rewritten when sync adopts them. */
export const LOCAL_USER_ID = "local";

export interface BudgetLedgerState {
  schemaVersion: 1;
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  periods: BudgetPeriod[];
  allocations: BudgetCategoryAllocation[];
  /** V1: at most one goal (see SavingsGoal docs in ledger.ts). */
  goal: SavingsGoal | null;
}

export function newLedgerId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  // Non-cryptographic fallback for environments without Web Crypto — these
  // ids only need local uniqueness until the sync layer assigns real ones.
  return `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * System categories seeded with deterministic slug-derived ids, so a re-seed
 * after clearing storage maps old transactions onto the same categories and
 * the future sync layer can match system categories by slug.
 */
export function seedCategories(nowIso: string): FinanceCategory[] {
  const base = {
    userId: null,
    parentCategoryId: null,
    isSystem: true,
    isArchived: false,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return [
    ...DEFAULT_EXPENSE_CATEGORIES.map((c) => ({
      ...base,
      id: `cat-${c.slug}`,
      name: c.name,
      slug: c.slug,
      categoryType: "expense" as const,
      essentiality: c.essentiality,
    })),
    ...DEFAULT_INCOME_CATEGORIES.map((c) => ({
      ...base,
      id: `cat-${c.slug}`,
      name: c.name,
      slug: c.slug,
      categoryType: "income" as const,
      essentiality: "unclassified" as const,
    })),
  ];
}

export function emptyBudgetLedger(nowIso: string): BudgetLedgerState {
  return {
    schemaVersion: 1,
    categories: seedCategories(nowIso),
    transactions: [],
    periods: [],
    allocations: [],
    goal: null,
  };
}

/** Whether the user has saved any real ledger data (vs. the empty seed). */
export function hasSavedBudgetLedger(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/** Loads the ledger from localStorage; empty seeded state when absent. SSR-safe. */
export function loadBudgetLedger(nowIso: string): BudgetLedgerState {
  if (typeof window === "undefined") return emptyBudgetLedger(nowIso);
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyBudgetLedger(nowIso);
    const parsed = JSON.parse(raw) as Partial<BudgetLedgerState>;
    const empty = emptyBudgetLedger(nowIso);
    return {
      schemaVersion: 1,
      categories:
        Array.isArray(parsed.categories) && parsed.categories.length > 0
          ? parsed.categories
          : empty.categories,
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      periods: Array.isArray(parsed.periods) ? parsed.periods : [],
      allocations: Array.isArray(parsed.allocations) ? parsed.allocations : [],
      goal: parsed.goal ?? null,
    };
  } catch {
    return emptyBudgetLedger(nowIso);
  }
}

/** Persists the ledger. Fails silently when storage is unavailable. */
export function saveBudgetLedger(state: BudgetLedgerState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private-browsing quota etc. — the in-memory state still works.
  }
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

/** Today in the user's local calendar as YYYY-MM-DD — never UTC-derived. */
export function todayDateOnly(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Inclusive calendar-month bounds containing the given date-only string. */
export function monthBoundsFor(dateOnly: string): {
  periodStart: string;
  periodEnd: string;
} {
  const [y, m] = dateOnly.split("-").map(Number);
  // Date(y, m, 0) is the last day of month m (1-based). Only the day-of-month
  // is read, so the local-time construction cannot shift the result.
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    periodStart: `${y}-${mm}-01`,
    periodEnd: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/* ------------------------------------------------------------------ */
/* Pure mutations                                                      */
/* ------------------------------------------------------------------ */

/**
 * Returns the open period covering `dateOnly`, creating the calendar-month
 * period when none exists. Existing periods are never modified — history is
 * never rewritten.
 */
export function ensurePeriodFor(
  state: BudgetLedgerState,
  dateOnly: string,
  nowIso: string,
): { state: BudgetLedgerState; period: BudgetPeriod } {
  const bounds = monthBoundsFor(dateOnly);
  const existing = state.periods.find(
    (p) => p.periodStart === bounds.periodStart && p.periodEnd === bounds.periodEnd,
  );
  if (existing) return { state, period: existing };
  const period: BudgetPeriod = {
    id: newLedgerId(),
    userId: LOCAL_USER_ID,
    ...bounds,
    expectedIncomeCents: null,
    goalReserveCents: 0,
    status: "open",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return { state: { ...state, periods: [...state.periods, period] }, period };
}

export interface ManualTransactionInput {
  type: TransactionType;
  /** Positive magnitude; the type carries the direction. */
  amountCents: MoneyCents;
  description: string;
  categoryId: string | null;
  transactionDate: string;
  userNote?: string | null;
}

/**
 * Appends a manual posted transaction, enforcing the same invariants as
 * transactionCreateSchema: positive in-range cents, expenses categorized,
 * transfers never categorized.
 */
export function addManualTransaction(
  state: BudgetLedgerState,
  input: ManualTransactionInput,
  nowIso: string,
): BudgetLedgerState {
  if (!isValidCents(input.amountCents) || input.amountCents <= 0) {
    throw new RangeError(`Invalid transaction amount: ${input.amountCents}`);
  }
  if (input.type === "expense" && input.categoryId === null) {
    throw new Error("Expense transactions require a category.");
  }
  if (input.type === "transfer" && input.categoryId !== null) {
    throw new Error("Transfers are not categorized spending.");
  }
  const tx: FinanceTransaction = {
    id: newLedgerId(),
    userId: LOCAL_USER_ID,
    type: input.type,
    status: "posted",
    amountCents: input.amountCents,
    currency: "USD",
    description: input.description.trim(),
    merchantName: null,
    categoryId: input.categoryId,
    accountId: null,
    transactionDate: input.transactionDate,
    postedAt: nowIso,
    source: "manual",
    externalTransactionId: null,
    recurringRuleId: null,
    transferGroupId: null,
    parentTransactionId: null,
    isExcludedFromBudget: false,
    userNote: input.userNote?.trim() || null,
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
  };
  return { ...state, transactions: [...state.transactions, tx] };
}

/** Soft delete — the row leaves every calculation but stays for audit. */
export function softDeleteTransaction(
  state: BudgetLedgerState,
  transactionId: string,
  nowIso: string,
): BudgetLedgerState {
  return {
    ...state,
    transactions: state.transactions.map((tx) =>
      tx.id === transactionId && tx.deletedAt === null
        ? { ...tx, deletedAt: nowIso, updatedAt: nowIso }
        : tx,
    ),
  };
}

/**
 * Upserts a category's planned amount for a period. Zero or negative planned
 * removes the allocation — "planned nothing" and "no plan" read the same to
 * a v1 manual budget, and dropping the row keeps categoryActuals honest
 * about which categories were actually planned.
 */
export function setPlannedAllocation(
  state: BudgetLedgerState,
  budgetPeriodId: string,
  categoryId: string,
  plannedCents: MoneyCents,
  nowIso: string,
): BudgetLedgerState {
  const rest = state.allocations.filter(
    (a) => !(a.budgetPeriodId === budgetPeriodId && a.categoryId === categoryId),
  );
  if (plannedCents <= 0) return { ...state, allocations: rest };
  if (!isValidCents(plannedCents)) {
    throw new RangeError(`Invalid planned amount: ${plannedCents}`);
  }
  const existing = state.allocations.find(
    (a) => a.budgetPeriodId === budgetPeriodId && a.categoryId === categoryId,
  );
  const allocation: BudgetCategoryAllocation = existing
    ? { ...existing, plannedCents, updatedAt: nowIso }
    : {
        id: newLedgerId(),
        budgetPeriodId,
        categoryId,
        plannedCents,
        rolloverMode: "none",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
  return { ...state, allocations: [...rest, allocation] };
}

/** Sets the cash intentionally reserved for goals this period. */
export function setGoalReserve(
  state: BudgetLedgerState,
  budgetPeriodId: string,
  goalReserveCents: MoneyCents,
  nowIso: string,
): BudgetLedgerState {
  if (goalReserveCents < 0 || !isValidCents(goalReserveCents)) {
    throw new RangeError(`Invalid goal reserve: ${goalReserveCents}`);
  }
  return {
    ...state,
    periods: state.periods.map((p) =>
      p.id === budgetPeriodId
        ? { ...p, goalReserveCents, updatedAt: nowIso }
        : p,
    ),
  };
}

export interface GoalInput {
  name: string;
  goalType: SavingsGoal["goalType"];
  targetAmountCents: MoneyCents;
  currentAmountCents: MoneyCents;
  plannedMonthlyContributionCents: MoneyCents;
  targetDate: string | null;
}

/** Creates or updates the single v1 goal. */
export function upsertGoal(
  state: BudgetLedgerState,
  input: GoalInput,
  nowIso: string,
): BudgetLedgerState {
  if (!isValidCents(input.targetAmountCents) || input.targetAmountCents <= 0) {
    throw new RangeError(`Invalid goal target: ${input.targetAmountCents}`);
  }
  if (!isValidCents(input.currentAmountCents) || input.currentAmountCents < 0) {
    throw new RangeError(`Invalid goal balance: ${input.currentAmountCents}`);
  }
  if (
    !isValidCents(input.plannedMonthlyContributionCents) ||
    input.plannedMonthlyContributionCents < 0
  ) {
    throw new RangeError(
      `Invalid planned contribution: ${input.plannedMonthlyContributionCents}`,
    );
  }
  const goal: SavingsGoal = state.goal
    ? {
        ...state.goal,
        ...input,
        name: input.name.trim(),
        updatedAt: nowIso,
      }
    : {
        id: newLedgerId(),
        userId: LOCAL_USER_ID,
        name: input.name.trim(),
        goalType: input.goalType,
        targetAmountCents: input.targetAmountCents,
        currentAmountCents: input.currentAmountCents,
        targetDate: input.targetDate,
        plannedMonthlyContributionCents: input.plannedMonthlyContributionCents,
        linkedDecisionId: null,
        linkedAccountId: null,
        status: "active",
        createdAt: nowIso,
        updatedAt: nowIso,
      };
  return { ...state, goal };
}
