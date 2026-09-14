/**
 * Budget & Runway — local-first ledger persistence (PR 2: manual budget UI).
 *
 * Same local-first contract as the legacy snapshot (store.ts): localStorage
 * is the synchronous source of truth the UI reads and writes. Per-record
 * server sync adopts these records by their stable ids; until adoption,
 * userId is a placeholder the sync layer rewrites.
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
 *
 * Migration status (docs/ops/MONEY-LEDGER-MIGRATION.md): this module backs
 * the money SSOT. The Phase-1 dual-write hook was removed at the Phase-3
 * kill — nothing projects ledger data back into the legacy snapshot anymore.
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
import { primaryGoal } from "@/lib/finance/goal-semantics";
import { seedLedgerFromLegacyIfEmpty } from "@/lib/finance/migrate-from-legacy";

export const BUDGET_LEDGER_STORAGE_KEY = "homi:budget-ledger";
/** ms-epoch of last successful local write — freshness for CFM / Stand. */
export const BUDGET_LEDGER_STAMP_KEY = "homi:budget-ledger:updated-at";
/** Unreadable blobs are moved here, never destroyed. */
const CORRUPT_BACKUP_KEY = "homi:budget-ledger:corrupt-backup";

/**
 * 2 — goals became a list. V1 stored a single `goal`; the migration below lifts
 * it into `goals` so no saved ledger loses its goal.
 */
export const CURRENT_SCHEMA_VERSION = 2;

/** userId for records created before sign-in; rewritten when sync adopts them. */
export const LOCAL_USER_ID = "local";

export interface BudgetLedgerState {
  schemaVersion: typeof CURRENT_SCHEMA_VERSION;
  categories: FinanceCategory[];
  transactions: FinanceTransaction[];
  periods: BudgetPeriod[];
  allocations: BudgetCategoryAllocation[];
  goals: SavingsGoal[];
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
    goals: [],
  };
}

/* ------------------------------------------------------------------ */
/* Defensive loading                                                   */
/* ------------------------------------------------------------------ */

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

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

const MIGRATIONS: Record<number, (persisted: Record<string, unknown>) => Record<string, unknown>> =
  {
    1: (persisted) => {
      const { goal, ...rest } = persisted as { goal?: unknown } & Record<string, unknown>;
      const existing = Array.isArray(rest.goals) ? rest.goals : null;
      return {
        ...rest,
        schemaVersion: 2,
        goals: existing ?? (isRecord(goal) ? [goal] : []),
      };
    },
  };

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
 * back. SSR-safe.
 */
export function loadBudgetLedger(nowIso: string): BudgetLedgerState {
  if (typeof window === "undefined") return emptyBudgetLedger(nowIso);
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(BUDGET_LEDGER_STORAGE_KEY);
    if (!raw) {
      const empty = emptyBudgetLedger(nowIso);
      return seedLedgerFromLegacyIfEmpty(nowIso, empty);
    }
    let parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) throw new Error("not an object");

    let version = typeof parsed.schemaVersion === "number" ? parsed.schemaVersion : 0;
    while (version < CURRENT_SCHEMA_VERSION) {
      const migrate = MIGRATIONS[version];
      if (!migrate) break;
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
    const state: BudgetLedgerState = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      categories: categories.length > 0 ? categories : empty.categories,
      transactions: Array.isArray(p.transactions) ? p.transactions.filter(isUsableTransaction) : [],
      periods: Array.isArray(p.periods) ? p.periods.filter(isUsablePeriod) : [],
      allocations: Array.isArray(p.allocations) ? p.allocations.filter(isUsableAllocation) : [],
      goals: Array.isArray(p.goals) ? p.goals.filter(isUsableGoal) : [],
    };
    return seedLedgerFromLegacyIfEmpty(nowIso, state);
  } catch {
    try {
      if (raw !== null) window.localStorage.setItem(CORRUPT_BACKUP_KEY, raw);
    } catch {
      // Backup is best-effort.
    }
    const empty = emptyBudgetLedger(nowIso);
    return seedLedgerFromLegacyIfEmpty(nowIso, empty);
  }
}

/**
 * Persists the ledger. Returns false when the write failed (Safari private
 * mode's zero quota, storage full) — callers must disclose that, not hide it.
 */
export function saveBudgetLedger(state: BudgetLedgerState): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(BUDGET_LEDGER_STORAGE_KEY, JSON.stringify(state));
    window.localStorage.setItem(BUDGET_LEDGER_STAMP_KEY, String(Date.now()));
    return true;
  } catch {
    return false;
  }
}

/**
 * ISO timestamp of the last local ledger write, or null when never saved.
 * Never uses "now" at read time — that would fake freshness.
 */
export function budgetLedgerSavedAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stamp = window.localStorage.getItem(BUDGET_LEDGER_STAMP_KEY);
    if (!stamp) return null;
    const ms = Number.parseInt(stamp, 10);
    return Number.isFinite(ms) && ms > 0 ? new Date(ms).toISOString() : null;
  } catch {
    return null;
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
  const lastDay = new Date(y, m, 0).getDate();
  const mm = String(m).padStart(2, "0");
  return {
    periodStart: `${y}-${mm}-01`,
    periodEnd: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

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
  amountCents: MoneyCents;
  description: string;
  categoryId: string | null;
  transactionDate: string;
  userNote?: string | null;
}

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

export function listActiveGoals(state: BudgetLedgerState): SavingsGoal[] {
  return state.goals.filter((g) => g.status === "active");
}

export function activeGoal(state: BudgetLedgerState): SavingsGoal | null {
  return primaryGoal(state.goals);
}

export function upsertGoal(
  state: BudgetLedgerState,
  input: GoalInput & { id?: string },
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
  const { id, ...fields } = input;
  const existing = id ? state.goals.find((g) => g.id === id && g.status === "active") : undefined;

  if (existing) {
    return {
      ...state,
      goals: state.goals.map((g) =>
        g.id === existing.id ? { ...g, ...fields, name: fields.name.trim(), updatedAt: nowIso } : g,
      ),
    };
  }

  const goal: SavingsGoal = {
    id: newLedgerId(),
    userId: LOCAL_USER_ID,
    name: fields.name.trim(),
    goalType: fields.goalType,
    targetAmountCents: fields.targetAmountCents,
    currentAmountCents: fields.currentAmountCents,
    targetDate: fields.targetDate,
    plannedMonthlyContributionCents: fields.plannedMonthlyContributionCents,
    linkedDecisionId: null,
    linkedAccountId: null,
    status: "active",
    createdAt: nowIso,
    updatedAt: nowIso,
  };
  return { ...state, goals: [...state.goals, goal] };
}

export function archiveGoal(
  state: BudgetLedgerState,
  nowIso: string,
  goalId?: string,
): BudgetLedgerState {
  const target = goalId
    ? (state.goals.find((g) => g.id === goalId && g.status === "active") ?? null)
    : primaryGoal(state.goals);
  if (!target) return state;
  return {
    ...state,
    goals: state.goals.map((g) =>
      g.id === target.id ? { ...g, status: "archived", updatedAt: nowIso } : g,
    ),
  };
}
