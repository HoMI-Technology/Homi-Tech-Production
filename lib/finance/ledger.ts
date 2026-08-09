/**
 * Budget & Runway — ledger domain types (PR 1: domain foundation).
 *
 * The legacy finance snapshot (store.ts) records monthly estimates; this
 * ledger records individual financial events. The two coexist during the
 * staged migration: the snapshot stays authoritative until a user opts in
 * to transaction mode, at which point summary numbers become derived from
 * these records (see calculations.ts) and the snapshot fields become a
 * read-only legacy estimate.
 *
 * Types only — no persistence, no React, no side effects. The Supabase
 * schema (a later PR) mirrors these shapes in snake_case.
 */

import type { MoneyCents } from "@/lib/finance/money";

/**
 * A two-type income/expense model fails quickly: transfers double-count
 * credit-card payments, refunds masquerade as income, and migrations have
 * no honest way to record corrections. Five types keep the arithmetic
 * truthful.
 */
export type TransactionType = "income" | "expense" | "transfer" | "refund" | "adjustment";

export type TransactionSource = "manual" | "plaid" | "recurring_rule" | "migration";

/** Plaid transactions arrive pending before posting; only posted rows count. */
export type TransactionStatus = "posted" | "pending" | "voided";

export interface FinanceTransaction {
  id: string;
  userId: string;

  type: TransactionType;
  status: TransactionStatus;

  /** Positive magnitude in cents; the type carries the direction. */
  amountCents: MoneyCents;
  currency: "USD";

  description: string;
  merchantName: string | null;
  categoryId: string | null;
  accountId: string | null;

  /** Date-only (YYYY-MM-DD) in the user's frame — budget months are never
   * derived from UTC timestamps. */
  transactionDate: string;
  postedAt: string | null;

  source: TransactionSource;
  /** Provider ID for imported rows — the dedupe key on re-import. */
  externalTransactionId: string | null;
  recurringRuleId: string | null;

  /** Both legs of an internal transfer share a group ID. */
  transferGroupId: string | null;
  /** Refunds may point at the purchase they reverse. */
  parentTransactionId: string | null;

  isExcludedFromBudget: boolean;
  userNote: string | null;

  createdAt: string;
  updatedAt: string;
  /** Soft delete — excluded from every calculation, preserved for audit. */
  deletedAt: string | null;
}

/**
 * Essentiality is a four-state classification, not a boolean — HōMI does
 * not get to decide that a user's childcare or family-support payment is
 * "discretionary". The user may reclassify any category.
 */
export type CategoryEssentiality = "required" | "important" | "flexible" | "unclassified";

export interface FinanceCategory {
  id: string;
  /** Null for system defaults shared by all users. */
  userId: string | null;

  name: string;
  slug: string;
  categoryType: "income" | "expense";
  essentiality: CategoryEssentiality;

  parentCategoryId: string | null;

  isSystem: boolean;
  /** Archived categories keep their historical transactions and labels. */
  isArchived: boolean;

  createdAt: string;
  updatedAt: string;
}

/**
 * An explicit period record preserves what the user planned at the time.
 * Without it, editing a category limit rewrites history and closing a
 * month is impossible.
 */
export interface BudgetPeriod {
  id: string;
  userId: string;
  /** Inclusive date-only bounds (YYYY-MM-DD). */
  periodStart: string;
  periodEnd: string;
  expectedIncomeCents: MoneyCents | null;
  /** Cash the user has intentionally reserved for goals this period. */
  goalReserveCents: MoneyCents;
  status: "open" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategoryAllocation {
  id: string;
  budgetPeriodId: string;
  categoryId: string;
  plannedCents: MoneyCents;
  rolloverMode: "none" | "positive_only" | "full";
  createdAt: string;
  updatedAt: string;
}

/**
 * V1 goal model: manual current balance plus planned contribution. Linked
 * accounts (V2) and an allocation ledger (V3) come later — a goal
 * contribution is a cash allocation, never spending.
 */
export interface SavingsGoal {
  id: string;
  userId: string;

  name: string;
  goalType: "emergency_reserve" | "home" | "vehicle" | "education" | "family" | "travel" | "custom";

  targetAmountCents: MoneyCents;
  currentAmountCents: MoneyCents;

  targetDate: string | null;
  plannedMonthlyContributionCents: MoneyCents;

  linkedDecisionId: string | null;
  linkedAccountId: string | null;

  status: "active" | "paused" | "completed" | "archived";

  createdAt: string;
  updatedAt: string;
}

/**
 * A recurring rule is a plan, not a transaction. V1 rules are
 * forecast-only: they surface expected items the user confirms or an
 * import satisfies — auto-posting would duplicate the forecasted rent and
 * the imported rent.
 */
export interface RecurringTransactionRule {
  id: string;
  userId: string;

  type: "income" | "expense";
  amountCents: MoneyCents;
  description: string;
  categoryId: string | null;

  cadence: "weekly" | "biweekly" | "semimonthly" | "monthly" | "quarterly" | "annual";

  startDate: string;
  nextOccurrenceDate: string;
  endDate: string | null;

  generationMode: "forecast_only" | "create_pending";

  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}

/** Default expense categories seeded for every user (isSystem: true). */
export const DEFAULT_EXPENSE_CATEGORIES: ReadonlyArray<{
  slug: string;
  name: string;
  essentiality: CategoryEssentiality;
}> = [
  { slug: "housing", name: "Housing", essentiality: "required" },
  { slug: "utilities", name: "Utilities", essentiality: "required" },
  { slug: "groceries", name: "Groceries", essentiality: "required" },
  { slug: "dining", name: "Dining", essentiality: "flexible" },
  { slug: "transportation", name: "Transportation", essentiality: "required" },
  { slug: "insurance", name: "Insurance", essentiality: "required" },
  { slug: "healthcare", name: "Healthcare", essentiality: "required" },
  { slug: "debt-payments", name: "Debt payments", essentiality: "required" },
  { slug: "family-childcare", name: "Family & childcare", essentiality: "important" },
  { slug: "subscriptions", name: "Subscriptions", essentiality: "flexible" },
  { slug: "personal", name: "Personal", essentiality: "flexible" },
  { slug: "entertainment", name: "Entertainment", essentiality: "flexible" },
  { slug: "travel", name: "Travel", essentiality: "flexible" },
  { slug: "giving", name: "Giving", essentiality: "important" },
  { slug: "other", name: "Other", essentiality: "unclassified" },
];

/** Default income categories seeded for every user (isSystem: true). */
export const DEFAULT_INCOME_CATEGORIES: ReadonlyArray<{
  slug: string;
  name: string;
}> = [
  { slug: "payroll", name: "Payroll" },
  { slug: "commission", name: "Commission" },
  { slug: "contract-income", name: "Contract income" },
  { slug: "business-income", name: "Business income" },
  { slug: "benefits", name: "Benefits" },
  { slug: "other-income", name: "Other income" },
];
