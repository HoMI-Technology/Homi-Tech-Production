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
 * KNOWN LIMITATION (deliberate, Session 2): there is no transactions table
 * yet, so snapshot cash-flow math uses only the transactions returned by the
 * CURRENT sync window (plus account balances, which are authoritative). After
 * the first full sync, later incremental windows may contain few or zero
 * transactions and the 30-day cash-flow read will under-report until full
 * transaction persistence lands in a later session.
 *
 * All writes go through the service-role client (plaid_items/plaid_accounts
 * have no authenticated write policies). The decrypted access token lives
 * only inside this function and is never logged.
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

  const snapshotInserted = await recomputeSnapshot(admin, item.user_id, added, modified, removedIds);

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
 * Recomputes the user's financial snapshot from ALL their synced accounts
 * (across items) plus this sync window's transactions, and INSERTS a new
 * financial_snapshots row only when the headline values actually changed
 * versus the latest row. `state` mirrors the Finance dashboard's overview
 * inputs (lib/finance/store FinanceState) with provenance fields so Session 3
 * can tell a Plaid-derived snapshot from a manually entered one.
 */
async function recomputeSnapshot(
  admin: SupabaseClient,
  userId: string,
  added: Map<string, PlaidTransaction>,
  modified: Map<string, PlaidTransaction>,
  removedIds: Set<string>,
): Promise<boolean> {
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

  // Effective window transactions: added, overridden by modified, minus removed.
  const effective = new Map(added);
  for (const [id, txn] of modified) effective.set(id, txn);
  for (const id of removedIds) effective.delete(id);

  const cutoff = new Date(Date.now() - CASH_FLOW_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  let income = 0;
  let expenses = 0;
  for (const txn of effective.values()) {
    const dateStr = txn.date ?? txn.authorized_date;
    if (!dateStr) continue;
    const txnDate = new Date(`${dateStr}T00:00:00Z`);
    if (Number.isNaN(txnDate.getTime()) || txnDate < cutoff) continue;
    // Plaid convention: positive amount = money OUT, negative = money IN.
    if (txn.amount < 0) income += -txn.amount;
    else expenses += txn.amount;
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
