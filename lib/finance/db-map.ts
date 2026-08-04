/**
 * Snake_case ↔ domain mappers for finance_ledger tables (PR 3).
 * Keep pure — no I/O — so route tests can assert shape without a DB.
 *
 * Row types centralized in @/types/database.ts for cross-ledger unification
 * (payments, plaid, email_sends, finance_*). See docs/finance-model-unification.md.
 * Only mappers + cents helper live here.
 */

import type {
  FinanceCategoryRow,
  FinanceTransactionRow,
} from "@/types/database";
import type {
  FinanceCategory,
  FinanceTransaction,
} from "@/lib/finance/ledger";
import type { MoneyCents } from "@/lib/finance/money";

export type { FinanceCategoryRow, FinanceTransactionRow };

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
