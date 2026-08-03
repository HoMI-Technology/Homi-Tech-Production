/**
 * Snake_case ↔ domain mappers for finance_ledger tables (PR 3).
 * Keep pure — no I/O — so route tests can assert shape without a DB.
 */

import type {
  FinanceCategory,
  FinanceTransaction,
  TransactionSource,
  TransactionStatus,
  TransactionType,
  CategoryEssentiality,
} from "@/lib/finance/ledger";
import type { MoneyCents } from "@/lib/finance/money";

export type FinanceTransactionRow = {
  id: string;
  user_id: string;
  type: TransactionType;
  status: TransactionStatus;
  amount_cents: number | string;
  currency: "USD";
  description: string;
  merchant_name: string | null;
  category_id: string | null;
  account_id: string | null;
  transaction_date: string;
  posted_at: string | null;
  source: TransactionSource;
  external_transaction_id: string | null;
  recurring_rule_id: string | null;
  transfer_group_id: string | null;
  parent_transaction_id: string | null;
  is_excluded_from_budget: boolean;
  user_note: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type FinanceCategoryRow = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string;
  category_type: "income" | "expense";
  essentiality: CategoryEssentiality;
  parent_category_id: string | null;
  is_system: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

function cents(value: number | string): MoneyCents {
  return Number(value) as MoneyCents;
}

export function rowToTransaction(row: FinanceTransactionRow): FinanceTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    status: row.status,
    amountCents: cents(row.amount_cents),
    currency: "USD",
    description: row.description,
    merchantName: row.merchant_name,
    categoryId: row.category_id,
    accountId: row.account_id,
    transactionDate: row.transaction_date,
    postedAt: row.posted_at,
    source: row.source,
    externalTransactionId: row.external_transaction_id,
    recurringRuleId: row.recurring_rule_id,
    transferGroupId: row.transfer_group_id,
    parentTransactionId: row.parent_transaction_id,
    isExcludedFromBudget: row.is_excluded_from_budget,
    userNote: row.user_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

export function rowToCategory(row: FinanceCategoryRow): FinanceCategory {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    slug: row.slug,
    categoryType: row.category_type,
    essentiality: row.essentiality,
    parentCategoryId: row.parent_category_id,
    isSystem: row.is_system,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Postgres/PostgREST codes meaning the PR-3 migration is not applied yet. */
export const FINANCE_LEDGER_INFRA_MISSING = new Set([
  "42P01", // undefined_table
  "PGRST205", // table not in schema cache
]);
