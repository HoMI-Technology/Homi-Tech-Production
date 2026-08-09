/**
 * Shared Plaid item sync — used by the webhook (SYNC_UPDATES_AVAILABLE) and
 * the manual POST /api/plaid/sync route.
 *
 * Cursor discipline (/transactions/sync):
 *   • First call uses the stored `plaid_items.transactions_cursor` (omitted
 *     entirely on first-ever sync), count 500.
 *   • While `has_more`, each response's `next_cursor` feeds the NEXT call.
 *   • The cursor is PERSISTED only after a response with has_more=false —
 *     never mid-pagination, so a crash mid-loop replays the same window
 *     instead of dropping transactions.
 *   • On Plaid error TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION the whole
 *     loop restarts from the ORIGINALLY stored cursor with fresh collections.
 *
 * Transactions are PERSISTED (migration 00024): every sync window's
 * added/modified transactions are upserted into plaid_transactions and
 * removed ones deleted, so 30-day cash flow is computed from the full stored
 * history — incremental windows no longer under-report (the former Session-2
 * limitation). All persistence is idempotent, so a replayed window is safe.
 *
 * All writes go through the service-role client (plaid_items/plaid_accounts/
 * plaid_transactions have no authenticated write policies). The decrypted
 * access token lives only inside this function and is never logged.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlaidCredentials, plaidFetch } from "@/lib/plaid/client";
import { decryptToken } from "@/lib/plaid/crypto";

/** Subset of a plaid_items row the sync engine needs. */
export interface SyncableItem {
  id: string;
  user_id: string;
  item_id: string;
  access_token_ct: string;
  transactions_cursor: string | null;
}

export class PlaidSyncError extends Error {
  constructor(
    message: string,
    readonly plaidErrorCode?: string,
  ) {
    super(message);
    this.name = "PlaidSyncError";
  }
}

interface PlaidTransaction {
  transaction_id: string;
  account_id?: string;
  /** Plaid convention: positive = money OUT of the account, negative = money IN. */
  amount: number;
  date?: string;
  authorized_date?: string | null;
  name?: string | null;
  merchant_name?: string | null;
  personal_finance_category?: { primary?: string | null } | null;
  pending?: boolean;
  iso_currency_code?: string | null;
}

/**
 * Maps one Plaid transaction to a plaid_transactions row. Exported pure for
 * tests — the mapping is where a silent field drift would corrupt cash flow.
 */
export function mapTransactionRow(
  item: Pick<SyncableItem, "id" | "user_id">,
  txn: PlaidTransaction,
): Record<string, unknown> {
  return {
    item_id: item.id,
    user_id: item.user_id,
    account_id: txn.account_id ?? null,
    transaction_id: txn.transaction_id,
    amount: txn.amount,
    txn_date: txn.date ?? txn.authorized_date ?? null,
    name: txn.name ?? null,
    merchant_name: txn.merchant_name ?? null,
    category: txn.personal_finance_category?.primary ?? null,
    pending: txn.pending ?? false,
    iso_currency: txn.iso_currency_code ?? null,
    updated_at: new Date().toISOString(),
  };
}

interface PlaidSyncAccount {
  account_id: string;
  name?: string;
  mask?: string | null;
  type?: string;
  subtype?: string | null;
  balances?: {
    current?: number | null;
    available?: number | null;
    iso_currency_code?: string | null;
  };
}

interface TransactionsSyncResponse {
  added?: PlaidTransaction[];
  modified?: PlaidTransaction[];
  removed?: { transaction_id: string }[];
  accounts?: PlaidSyncAccount[];
  next_cursor?: string | null;
  has_more?: boolean;
}

export interface SyncOutcome {
  added: number;
  modified: number;
  removed: number;
  accountsUpdated: number;
  snapshotInserted: boolean;
}

const PAGE_SIZE = 500;
const MAX_MUTATION_RESTARTS = 3;
const CASH_FLOW_WINDOW_DAYS = 30;

/** Maps Plaid `personal_finance_category.primary` values to finance ledger system category slugs. */
const PLAID_CATEGORY_TO_SLUG: Record<string, string> = {
  BANK_FEES: "other",
  ENTERTAINMENT: "entertainment",
  FOOD_AND_DRINK: "dining",
  GENERAL_MERCHANDISE: "personal",
  GENERAL_SERVICES: "personal",
  GIFTS_AND_DONATIONS: "giving",
  GOVERNMENT_AND_NON_PROFIT: "giving",
  HOME_IMPROVEMENT: "housing",
  HOUSING: "housing",
  INSURANCE: "insurance",
  LOAN_PAYMENTS: "debt-payments",
  MEDICAL: "healthcare",
  PERSONAL_CARE: "personal",
  RENT_AND_UTILITIES: "utilities",
  TRANSPORTATION: "transportation",
  TRAVEL: "travel",
  EDUCATION: "other",
  INCOME: "other-income",
};

/**
 * Returns the UUID of the closest system finance category for a Plaid primary
 * category, or `null` when no good match exists.
 */
export function mapPlaidCategoryToFinanceCategory(
  plaidCategory: string | null | undefined,
  slugToId: Map<string, string>,
): string | null {
  if (!plaidCategory) return null;
  const slug = PLAID_CATEGORY_TO_SLUG[plaidCategory];
  if (!slug) return null;
  return slugToId.get(slug) ?? null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Signed contribution of one account to net worth: debts count negative. */
function accountNetWorthContribution(type: string | null | undefined, balance: number): number {
  return type === "credit" || type === "loan" ? -balance : balance;
}

/**
 * Runs a full sync for one item: pull transactions per the cursor discipline,
 * refresh plaid_accounts balances, recompute the user's financial snapshot,
 * then mark the item healthy and persist the cursor.
 *
 * Throws PlaidSyncError on failure — the item's cursor is left untouched so
 * the next sync replays the same window (all writes are idempotent upserts).
 */
export async function syncItem(admin: SupabaseClient, item: SyncableItem): Promise<SyncOutcome> {
  const credentials = getPlaidCredentials();
  if (!credentials) {
    throw new PlaidSyncError("Plaid is not configured.");
  }

  // Held only for the duration of the Plaid calls below; never logged.
  const accessToken = decryptToken(item.access_token_ct);
  const originalCursor = item.transactions_cursor;

  let added = new Map<string, PlaidTransaction>();
  let modified = new Map<string, PlaidTransaction>();
  let removedIds = new Set<string>();
  let accountsById = new Map<string, PlaidSyncAccount>();
  let finalCursor: string | null = null;
  let restarts = 0;

  restart: for (;;) {
    // Fresh collections every (re)start — a restart must not double-count.
    added = new Map();
    modified = new Map();
    removedIds = new Set();
    accountsById = new Map();
    let cursor = originalCursor;

    for (;;) {
      const body: Record<string, unknown> = { access_token: accessToken, count: PAGE_SIZE };
      if (cursor) body.cursor = cursor;

      const res = await plaidFetch("/transactions/sync", body, credentials);
      if (!res.ok) {
        let errorCode: string | undefined;
        try {
          errorCode = ((await res.json()) as { error_code?: string }).error_code;
        } catch {
          // Non-JSON error body — treat as unknown.
        }
        if (errorCode === "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION") {
          restarts += 1;
          if (restarts > MAX_MUTATION_RESTARTS) {
            throw new PlaidSyncError(
              "Transactions kept mutating during pagination; giving up for this run.",
              errorCode,
            );
          }
          // Restart the ENTIRE loop from the originally stored cursor.
          continue restart;
        }
        if (errorCode === "ITEM_LOGIN_REQUIRED") {
          await admin.from("plaid_items").update({ status: "login_required" }).eq("id", item.id);
        }
        throw new PlaidSyncError("Plaid /transactions/sync failed.", errorCode);
      }

      const data = (await res.json()) as TransactionsSyncResponse;
      // Dedupe by transaction_id across pages (Maps keep the latest copy).
      for (const txn of data.added ?? []) added.set(txn.transaction_id, txn);
      for (const txn of data.modified ?? []) modified.set(txn.transaction_id, txn);
      for (const removed of data.removed ?? []) removedIds.add(removed.transaction_id);
      for (const account of data.accounts ?? []) accountsById.set(account.account_id, account);

      cursor = data.next_cursor ?? null;
      if (!data.has_more) {
        finalCursor = cursor;
        break restart;
      }
    }
  }

  // Balances: prefer the accounts embedded in sync responses; fall back to a
  // /accounts/get read when Plaid sent none (possible on an empty delta).
  if (accountsById.size === 0) {
    try {
      const res = await plaidFetch("/accounts/get", { access_token: accessToken }, credentials);
      if (res.ok) {
        const data = (await res.json()) as { accounts?: PlaidSyncAccount[] };
        for (const account of data.accounts ?? []) accountsById.set(account.account_id, account);
      }
    } catch {
      // Best-effort — stale balances beat a failed sync.
    }
  }

  if (accountsById.size > 0) {
    const rows = Array.from(accountsById.values()).map((account) => ({
      item_id: item.id,
      account_id: account.account_id,
      name: account.name ?? "Account",
      mask: account.mask ?? null,
      type: account.type ?? "other",
      subtype: account.subtype ?? null,
      current_balance: account.balances?.current ?? null,
      available_balance: account.balances?.available ?? null,
      iso_currency: account.balances?.iso_currency_code ?? null,
    }));
    const { error } = await admin.from("plaid_accounts").upsert(rows, { onConflict: "account_id" });
    if (error) {
      throw new PlaidSyncError(`plaid_accounts upsert failed: ${error.message}`);
    }
  }

  // Persist this window's transactions BEFORE recomputing the snapshot, so
  // cash flow reads the full stored history including today's changes.
  // Effective set: added, overridden by modified, minus removed.
  const effective = new Map(added);
  for (const [id, txn] of modified) effective.set(id, txn);
  for (const id of removedIds) effective.delete(id);

  if (effective.size > 0) {
    const rows = Array.from(effective.values()).map((txn) => mapTransactionRow(item, txn));
    for (let i = 0; i < rows.length; i += PAGE_SIZE) {
      const { error } = await admin
        .from("plaid_transactions")
        .upsert(rows.slice(i, i + PAGE_SIZE), { onConflict: "transaction_id" });
      if (error) {
        throw new PlaidSyncError(`plaid_transactions upsert failed: ${error.message}`);
      }
    }
  }
  if (removedIds.size > 0) {
    const { error } = await admin
      .from("plaid_transactions")
      .delete()
      .in("transaction_id", Array.from(removedIds));
    if (error) {
      throw new PlaidSyncError(`plaid_transactions delete failed: ${error.message}`);
    }
  }

  // Mirror the effective Plaid window into the new finance ledger tables.
  await syncItemToLedger(admin, item, effective, removedIds);

  const snapshotInserted = await recomputeSnapshot(admin, item.user_id);

  // Persist the cursor ONLY now — after has_more=false and all writes landed.
  const nowIso = new Date().toISOString();
  const { error: cursorError } = await admin
    .from("plaid_items")
    .update({
      transactions_cursor: finalCursor,
      cursor_updated_at: nowIso,
      last_successful_sync: nowIso,
      status: "healthy",
    })
    .eq("id", item.id);
  if (cursorError) {
    throw new PlaidSyncError(`plaid_items cursor persist failed: ${cursorError.message}`);
  }

  return {
    added: added.size,
    modified: modified.size,
    removed: removedIds.size,
    accountsUpdated: accountsById.size,
    snapshotInserted,
  };
}

/**
 * Mirrors one sync window's effective Plaid transactions into `finance_transactions`
 * and soft-deletes any rows matching the Plaid-removed ids. System categories are
 * fetched once per sync and mapped by slug.
 */
/**
 * Mirrors one sync window's effective Plaid transactions into `finance_transactions`
 * and soft-deletes any rows matching the Plaid-removed ids. Exported for testing.
 */
export async function syncItemToLedger(
  admin: SupabaseClient,
  item: Pick<SyncableItem, "id" | "user_id">,
  effective: Map<string, PlaidTransaction>,
  removedIds: Set<string>,
): Promise<void> {
  const { data: categories, error: catError } = await admin
    .from("finance_categories")
    .select("id, slug")
    .eq("is_system", true);
  if (catError) {
    throw new PlaidSyncError(`finance_categories lookup failed: ${catError.message}`);
  }
  const slugToId = new Map<string, string>(
    (categories ?? []).map((c: { id: string; slug: string }) => [c.slug, c.id]),
  );

  const effectiveTxns = Array.from(effective.values());
  const nowIso = new Date().toISOString();

  // Load existing active finance_transactions to decide insert vs update.
  // We do not use `.upsert({ onConflict })` because the dedupe index is partial.
  const existingByExternal = new Map<string, { id: string }>();
  if (effectiveTxns.length > 0) {
    const externalIds = effectiveTxns.map((t) => t.transaction_id);
    const { data: existing, error: existingError } = await admin
      .from("finance_transactions")
      .select("id, external_transaction_id")
      .eq("user_id", item.user_id)
      .eq("source", "plaid")
      .in("external_transaction_id", externalIds)
      .is("deleted_at", null);
    if (existingError) {
      throw new PlaidSyncError(
        `finance_transactions existing lookup failed: ${existingError.message}`,
      );
    }
    for (const row of existing ?? []) {
      if (row.external_transaction_id) {
        existingByExternal.set(row.external_transaction_id, { id: row.id as string });
      }
    }
  }

  const toInsert: Record<string, unknown>[] = [];
  const toUpdate: { id: string; patch: Record<string, unknown> }[] = [];

  for (const txn of effectiveTxns) {
    const isPending = txn.pending ?? false;
    const amount = txn.amount;
    const type = amount > 0 ? "expense" : "income";
    const amountCents = Math.round(Math.abs(amount) * 100);
    const description = (txn.name ?? txn.merchant_name ?? "Plaid transaction")
      .toString()
      .slice(0, 160);
    const merchantName = txn.merchant_name ? String(txn.merchant_name).slice(0, 160) : null;
    const categoryId = mapPlaidCategoryToFinanceCategory(
      txn.personal_finance_category?.primary,
      slugToId,
    );
    const txnDate = txn.date ?? txn.authorized_date ?? new Date().toISOString().slice(0, 10);

    const patch = {
      user_id: item.user_id,
      source: "plaid",
      external_transaction_id: txn.transaction_id,
      status: isPending ? "pending" : "posted",
      type,
      amount_cents: amountCents,
      currency: "USD",
      transaction_date: txnDate,
      posted_at: isPending ? null : nowIso,
      description,
      merchant_name: merchantName,
      category_id: categoryId,
      is_excluded_from_budget: false,
      updated_at: nowIso,
    };

    const existing = existingByExternal.get(txn.transaction_id);
    if (existing) {
      toUpdate.push({ id: existing.id, patch });
    } else {
      toInsert.push({ id: crypto.randomUUID(), ...patch });
    }
  }

  for (let i = 0; i < toInsert.length; i += PAGE_SIZE) {
    const { error } = await admin
      .from("finance_transactions")
      .insert(toInsert.slice(i, i + PAGE_SIZE));
    if (error) {
      throw new PlaidSyncError(`finance_transactions insert failed: ${error.message}`);
    }
  }

  for (let i = 0; i < toUpdate.length; i += PAGE_SIZE) {
    const batch = toUpdate.slice(i, i + PAGE_SIZE);
    for (const { id, patch } of batch) {
      const { error } = await admin.from("finance_transactions").update(patch).eq("id", id);
      if (error) {
        throw new PlaidSyncError(`finance_transactions update failed: ${error.message}`);
      }
    }
  }

  if (removedIds.size > 0) {
    const { error } = await admin
      .from("finance_transactions")
      .update({ deleted_at: nowIso, updated_at: nowIso })
      .eq("user_id", item.user_id)
      .eq("source", "plaid")
      .in("external_transaction_id", Array.from(removedIds))
      .is("deleted_at", null);
    if (error) {
      throw new PlaidSyncError(`finance_transactions soft-delete failed: ${error.message}`);
    }
  }
}

/**
 * Recomputes the user's financial snapshot from ALL their synced accounts
 * (across items) plus the FULL stored transaction history's last 30 days
 * (plaid_transactions — no longer just the current sync window), and INSERTS
 * a new financial_snapshots row only when the headline values actually
 * changed versus the latest row. `state` mirrors the Finance dashboard's
 * overview inputs (lib/finance/store FinanceState) with provenance fields so
 * a Plaid-derived snapshot is distinguishable from a manually entered one.
 */
async function recomputeSnapshot(admin: SupabaseClient, userId: string): Promise<boolean> {
  const { data: itemRows, error: itemsError } = await admin
    .from("plaid_items")
    .select("id")
    .eq("user_id", userId);
  if (itemsError) {
    throw new PlaidSyncError(`plaid_items lookup failed: ${itemsError.message}`);
  }
  const itemIds = (itemRows ?? []).map((row: { id: string }) => row.id);
  if (itemIds.length === 0) return false;

  const { data: accounts, error: accountsError } = await admin
    .from("plaid_accounts")
    .select("type, current_balance, available_balance")
    .in("item_id", itemIds);
  if (accountsError) {
    throw new PlaidSyncError(`plaid_accounts lookup failed: ${accountsError.message}`);
  }

  let netWorth = 0;
  let liquidSavings = 0;
  let totalDebt = 0;
  for (const account of accounts ?? []) {
    const balance = account.current_balance ?? account.available_balance ?? 0;
    netWorth += accountNetWorthContribution(account.type, balance);
    if (account.type === "depository") liquidSavings += balance;
    if (account.type === "credit" || account.type === "loan") totalDebt += balance;
  }

  // 30-day cash flow from the FULL stored history (pending excluded — those
  // amounts can still change or vanish).
  const cutoffDate = new Date(Date.now() - CASH_FLOW_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const { data: txnRows, error: txnError } = await admin
    .from("plaid_transactions")
    .select("amount, pending")
    .eq("user_id", userId)
    .gte("txn_date", cutoffDate);
  if (txnError) {
    throw new PlaidSyncError(`plaid_transactions lookup failed: ${txnError.message}`);
  }

  let income = 0;
  let expenses = 0;
  for (const txn of txnRows ?? []) {
    if (txn.pending) continue;
    const amount = Number(txn.amount);
    if (!Number.isFinite(amount)) continue;
    // Plaid convention: positive amount = money OUT, negative = money IN.
    if (amount < 0) income += -amount;
    else expenses += amount;
  }

  const netCashFlow = round2(income - expenses);
  const savingsRate = income > 0 ? round2(Math.min(1, Math.max(0, netCashFlow / income))) : 0;
  const roundedNetWorth = round2(netWorth);

  const { data: latest } = await admin
    .from("financial_snapshots")
    .select("net_worth, net_cash_flow, savings_rate")
    .eq("user_id", userId)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const unchanged =
    latest &&
    round2(Number(latest.net_worth)) === roundedNetWorth &&
    round2(Number(latest.net_cash_flow)) === netCashFlow &&
    round2(Number(latest.savings_rate)) === savingsRate;
  if (unchanged) return false;

  const nowIso = new Date().toISOString();
  const { error: insertError } = await admin.from("financial_snapshots").insert({
    id: crypto.randomUUID(),
    user_id: userId,
    state: {
      source: "plaid_sync",
      windowDays: CASH_FLOW_WINDOW_DAYS,
      monthlyIncome: round2(income),
      monthlyExpenses: round2(expenses),
      liquidSavings: round2(liquidSavings),
      totalDebt: round2(totalDebt),
      accountCount: (accounts ?? []).length,
    },
    net_worth: roundedNetWorth,
    net_cash_flow: netCashFlow,
    savings_rate: savingsRate,
    completed_at: nowIso,
  });
  if (insertError) {
    throw new PlaidSyncError(`financial_snapshots insert failed: ${insertError.message}`);
  }
  return true;
}
