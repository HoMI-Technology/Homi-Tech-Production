/**
 * Budget & Runway — local-first ledger persistence (PR 2: manual budget UI).
 *
 * Same local-first contract as the legacy snapshot (store.ts): localStorage
 * is the synchronous source of truth the UI reads and writes. Per-record
 * server sync is a later PR (behind FINANCE_LEDGER_ENABLED) and will adopt
 * these records by their stable ids; until then userId is a placeholder the
 * sync layer rewrites on adoption.
 *
 * Loading is defensive (the Actual-Budget lesson — a version/shape mismatch
 * must degrade, never crash): the persisted envelope carries a schemaVersion
 * with a forward-only migration chain, every row is shape-checked before it
 * can reach the pure calculation layer (which throws loudly on corrupt
 * cents), and an unreadable blob is preserved under a backup key rather
 * than destroyed.
 *
 * localStorage is treated as a cache, not an archive: Safari private mode
 * rejects writes (quota 0) and iOS ITP evicts storage after 7 days without
 * interaction — saveBudgetLedger therefore reports failure instead of
 * swallowing it, and the UI is expected to disclose it.
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

export const BUDGET_LEDGER_STORAGE_KEY = "homi:budget-ledger";
/** Unreadable blobs are moved here, never destroyed. */
const CORRUPT_BACKUP_KEY = "homi:budget-ledger:corrupt-backup";

export const CURRENT_SCHEMA_VERSION = 1;

/** userId for records created before sign-in; rewritten when sync adopts them. */
export const LOCAL_USER_ID = "local";

export interface BudgetLedgerState {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  periods: BudgetPeriod[];
  allocations: BudgetCategoryAllocation[];
  /** V1: at most one goal; a non-active status reads as "no goal" in the UI. */
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
    schemaVersion: CURRENT_SCHEMA_VERSION,
    categories: seedCategories(nowIso),
    transactions: [],
    periods: [],
    allocations: [],
    goal: null,
  };
}

/* ------------------------------------------------------------------ */
/* Defensive loading                                                   */
/* ------------------------------------------------------------------ */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Row-level shape guards. Full Zod validation lives server-side
 * (lib/finance/validation.ts); these lighter checks exist because a single
 * corrupted amount would make sumCents throw at render time and blank the
 * tab. Rows that fail are dropped from the working set — the original blob
 * is what the corrupt-backup key preserves.
 */
function isUsableTransaction(tx: unknown): tx is FinanceTransaction {
  return (
    isRecord(tx) &&
    typeof tx.id === "string" &&
    typeof tx.type === "string" &&
    typeof tx.status === "string" &&
    typeof tx.amountCents === "number" &&
    isValidCents(tx.amountCents) &&
    typeof tx.description === "string" &&
    typeof tx.transactionDate === "string" &&
    DATE_ONLY.test(tx.transactionDate) &&
    (tx.categoryId === null || typeof tx.categoryId === "string") &&
    (tx.deletedAt === null || typeof tx.deletedAt === "string")
  );
}

function isUsablePeriod(p: unknown): p is BudgetPeriod {
  return (
    isRecord(p) &&
    typeof p.id === "string" &&
    typeof p.periodStart === "string" &&
    DATE_ONLY.test(p.periodStart) &&
    typeof p.periodEnd === "string" &&
    DATE_ONLY.test(p.periodEnd) &&
    typeof p.goalReserveCents === "number" &&
    isValidCents(p.goalReserveCents)
  );
}

function isUsableAllocation(a: unknown): a is BudgetCategoryAllocation {
  return (
    isRecord(a) &&
    typeof a.id === "string" &&
    typeof a.budgetPeriodId === "string" &&
    typeof a.categoryId === "string" &&
    typeof a.plannedCents === "number" &&
    isValidCents(a.plannedCents)
  );
}

function isUsableGoal(g: unknown): g is SavingsGoal {
  return (
    isRecord(g) &&
    typeof g.id === "string" &&
    typeof g.name === "string" &&
    typeof g.targetAmountCents === "number" &&
    isValidCents(g.targetAmountCents) &&
    typeof g.currentAmountCents === "number" &&
    isValidCents(g.currentAmountCents) &&
    typeof g.plannedMonthlyContributionCents === "number" &&
    isValidCents(g.plannedMonthlyContributionCents) &&
    (g.targetDate === null || (typeof g.targetDate === "string" && DATE_ONLY.test(g.targetDate)))
  );
}

/**
 * Forward-only migration chain keyed by the version being upgraded FROM
 * (the Zustand-persist pattern). Version 1 is current, so the map is empty;
 * a future v2 adds `1: (state) => ...`.
 */
const MIGRATIONS: Record<number, (persisted: Record<string, unknown>) => Record<string, unknown>> =
  {};

/** Whether the user has saved any real ledger data (vs. the empty seed). */
export function hasSavedBudgetLedger(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(BUDGET_LEDGER_STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

/**
 * Loads the ledger from localStorage; empty seeded state when absent.
 * Unreadable JSON is preserved under the corrupt-backup key before falling
 * back. A schemaVersion NEWER than this build (user came back on an old
 * deploy) is loaded best-effort through the same row guards rather than
 * discarded. SSR-safe.
 */
export function loadBudgetLedger(nowIso: string): BudgetLedgerState {
  if (typeof window === "undefined") return emptyBudgetLedger(nowIso);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(BUDGET_LEDGER_STORAGE_KEY);
    if (!raw) return emptyBudgetLedger(nowIso);
    let parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error("not an object");

    let version = typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 0;
    while (version < CURRENT_SCHEMA_VERSION) {
      const migrate = MIGRATIONS[version];
      if (!migrate) break; // unknown ancient shape — row guards decide below
      parsed = migrate(parsed as Record<string, unknown>);
      version += 1;
      if (!isRecord(parsed)) throw new Error("migration produced non-object");
    }

    const p = parsed as Record<string, unknown>;
    const empty = emptyBudgetLedger(nowIso);
    const categories = Array.isArray(p.categories)
      ? p.categories.filter(
          (c): c is FinanceCategory =>
            isRecord(c) && typeof c.id === "string" && typeof c.name === "string",
        )
      : [];
    return {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      categories: categories.length > 0 ? categories : empty.categories,
      transactions: Array.isArray(p.transactions) ? p.transactions.filter(isUsableTransaction) : [],
      periods: Array.isArray(p.periods) ? p.periods.filter(isUsablePeriod) : [],
      allocations: Array.isArray(p.allocations) ? p.allocations.filter(isUsableAllocation) : [],
      goal: isUsableGoal(p.goal) ? p.goal : null,
    };
  } catch {
    try {
      if (raw !== null) window.localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // Backup is best-effort; the fallback below still applies.
    }
    return emptyBudgetLedger(nowIso);
  }
}

/**
 * Persists the ledger. Returns false when the write failed (Safari private
 * mode's zero quota, storage full) — callers must disclose that, not hide
 * it: a budget that silently stops saving is worse than no budget.
 */
export function saveBudgetLedger(state: BudgetLedgerState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(BUDGET_LEDGER_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
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

/**
 * Fraction of the period elapsed as of `dateOnly`, clamped to [0, 1] —
 * the honesty basis for pacing markers ("month in progress" is compared
 * against elapsed days, never the whole month).
 */
export function elapsedFraction(
  period: Pick<BudgetPeriod, "periodStart" | "periodEnd">,
  dateOnly: string,
): number {
  const startDay = Number(period.periodStart.slice(8, 10));
  const endDay = Number(period.periodEnd.slice(8, 10));
  const totalDays = endDay - startDay + 1;
  if (totalDays <= 0) return 1;
  if (dateOnly < period.periodStart) return 0;
  if (dateOnly > period.periodEnd) return 1;
  const day = Number(dateOnly.slice(8, 10));
  return Math.min(1, Math.max(0, (day - startDay + 1) / totalDays));
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
      p.id === budgetPeriodId ? { ...p, goalReserveCents, updatedAt: nowIso } : p,
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

/** The goal the UI should show — a non-active goal reads as "no goal". */
export function activeGoal(state: BudgetLedgerState): SavingsGoal | null {
  return state.goal && state.goal.status === "active" ? state.goal : null;
}

/**
 * Creates or updates the single v1 goal. An archived goal is replaced by a
 * fresh record (new id) rather than resurrected, so its history stays
 * meaningful to the future sync layer.
 */
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
    throw new RangeError(`Invalid planned contribution: ${input.plannedMonthlyContributionCents}`);
  }
  const existing = activeGoal(state);
  const goal: SavingsGoal = existing
    ? {
        ...existing,
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

/**
 * Archives the active goal — the reversible exit from the one-goal model.
 * The record is kept (status "archived"), not deleted; the UI then reads
 * "no goal" via activeGoal().
 */
export function archiveGoal(state: BudgetLedgerState, nowIso: string): BudgetLedgerState {
  const existing = activeGoal(state);
  if (!existing) return state;
  return {
    ...state,
    goal: { ...existing, status: "archived", updatedAt: nowIso },
  };
}
