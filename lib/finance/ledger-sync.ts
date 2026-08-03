/**
 * Budget & Runway PR 4 — per-record local ↔ server sync for the manual ledger.
 *
 * Local-first: localStorage remains the synchronous UI source. This module
 * pulls/pushes in the background once the user is signed in and
 * `financeLedgerSync` is on. Server tables/APIs are PR 3
 * (`/api/finance/transactions`, `/api/finance/categories`).
 *
 * Category bridge: local system categories use stable slug ids (`cat-housing`);
 * the server seeds UUID ids. Before push/pull we map by slug so expenses keep
 * their plan bars. User-custom categories are left local-only until a later
 * categories write API lands.
 *
 * Anonymous sessions: pull/push no-op on 401 (same posture as lib/persistence).
 */

import type { FinanceCategory, FinanceTransaction } from "@/lib/finance/ledger";
import {
  type BudgetLedgerState,
  LOCAL_USER_ID,
  loadBudgetLedger,
  saveBudgetLedger,
} from "@/lib/finance/local-ledger";
import { financeLedgerSync } from "@/lib/flags";
import type { MoneyCents } from "@/lib/finance/money";

export type RemoteTransaction = FinanceTransaction;
export type RemoteCategory = FinanceCategory;

/** Pure: index system categories by slug (server or local). */
export function systemCategorySlugMap(
  categories: ReadonlyArray<FinanceCategory>,
): Map<string, string> {
  const map = new Map<string, string>();
  for (const c of categories) {
    if (c.isSystem) map.set(c.slug, c.id);
  }
  return map;
}

/**
 * Rewrite local system category ids to server UUIDs (matched by slug) and
 * retarget transaction.categoryId. Non-system / unknown slugs keep their ids.
 */
export function adoptServerCategoryIds(
  state: BudgetLedgerState,
  remoteCategories: ReadonlyArray<FinanceCategory>,
): BudgetLedgerState {
  const remoteBySlug = systemCategorySlugMap(remoteCategories);
  const localBySlug = systemCategorySlugMap(state.categories);
  const idRewrite = new Map<string, string>();
  for (const [slug, localId] of localBySlug) {
    const remoteId = remoteBySlug.get(slug);
    if (remoteId && remoteId !== localId) idRewrite.set(localId, remoteId);
  }
  if (idRewrite.size === 0) return state;

  const categories = state.categories.map((c) => {
    const nextId = idRewrite.get(c.id);
    return nextId ? { ...c, id: nextId } : c;
  });
  // Prefer server metadata for system rows when both exist.
  const byId = new Map(categories.map((c) => [c.id, c]));
  for (const remote of remoteCategories) {
    if (remote.isSystem) byId.set(remote.id, remote);
  }

  const transactions = state.transactions.map((tx) => {
    if (!tx.categoryId) return tx;
    const next = idRewrite.get(tx.categoryId);
    return next ? { ...tx, categoryId: next } : tx;
  });

  const allocations = state.allocations.map((a) => {
    const next = idRewrite.get(a.categoryId);
    return next ? { ...a, categoryId: next } : a;
  });

  return {
    ...state,
    categories: [...byId.values()],
    transactions,
    allocations,
  };
}

/**
 * LWW merge of remote transactions into local by id (updatedAt ISO compare).
 * Soft-deleted remote rows win when newer so multi-device delete converges.
 */
export function mergeRemoteTransactions(
  local: ReadonlyArray<FinanceTransaction>,
  remote: ReadonlyArray<FinanceTransaction>,
): FinanceTransaction[] {
  const byId = new Map<string, FinanceTransaction>();
  for (const tx of local) byId.set(tx.id, tx);
  for (const tx of remote) {
    const existing = byId.get(tx.id);
    if (!existing) {
      byId.set(tx.id, tx);
      continue;
    }
    if (tx.updatedAt >= existing.updatedAt) byId.set(tx.id, tx);
  }
  return [...byId.values()];
}

/** Local manual rows not yet known to the server (heuristic: userId still local). */
export function localPendingManualTransactions(
  state: BudgetLedgerState,
): FinanceTransaction[] {
  return state.transactions.filter(
    (tx) =>
      tx.source === "manual" &&
      tx.deletedAt === null &&
      (tx.userId === LOCAL_USER_ID || tx.userId === "local"),
  );
}

export interface PushCreateBody {
  id: string;
  idempotencyKey: string;
  type: FinanceTransaction["type"];
  amountCents: MoneyCents;
  description: string;
  categoryId: string | null;
  transactionDate: string;
  userNote: string | null;
  isExcludedFromBudget: boolean;
}

export function toPushCreateBody(tx: FinanceTransaction): PushCreateBody {
  // Idempotency key is stable for the life of the local id so retries are safe.
  return {
    id: tx.id,
    idempotencyKey: `local-tx-${tx.id}`,
    type: tx.type,
    amountCents: tx.amountCents,
    description: tx.description,
    categoryId: tx.categoryId,
    transactionDate: tx.transactionDate,
    userNote: tx.userNote,
    isExcludedFromBudget: tx.isExcludedFromBudget,
  };
}

async function fetchJson(
  input: RequestInfo,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const res = await fetch(input, init);
  const body = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, body };
}

/**
 * Pull categories + transactions, adopt server system category ids, LWW-merge
 * transactions, persist. No-op when the flag is off or the session is anonymous.
 */
export async function pullBudgetLedgerFromServer(
  nowIso: string,
): Promise<BudgetLedgerState | null> {
  if (!financeLedgerSync || typeof window === "undefined") return null;

  const [catRes, txRes] = await Promise.all([
    fetchJson("/api/finance/categories"),
    fetchJson("/api/finance/transactions?limit=100"),
  ]);

  if (catRes.status === 401 || txRes.status === 401) return null;
  // Deferred / missing tables: keep local only.
  if (!catRes.ok || !txRes.ok) return null;

  const remoteCategories =
    ((catRes.body as { categories?: FinanceCategory[] } | null)?.categories ??
      []) as FinanceCategory[];
  const remoteTx =
    ((txRes.body as { transactions?: FinanceTransaction[]; deferred?: boolean } | null)
      ?.transactions ?? []) as FinanceTransaction[];
  if ((txRes.body as { deferred?: boolean } | null)?.deferred) return null;

  let local = loadBudgetLedger(nowIso);
  local = adoptServerCategoryIds(local, remoteCategories);
  const mergedTx = mergeRemoteTransactions(local.transactions, remoteTx);
  const next: BudgetLedgerState = { ...local, transactions: mergedTx };
  saveBudgetLedger(next);
  return next;
}

/**
 * Resolve a local system category id (`cat-housing`) to the server UUID via
 * a fresh categories GET. Returns the input unchanged when already a UUID.
 */
async function resolveCategoryIdForPush(
  categoryId: string | null,
): Promise<string | null> {
  if (!categoryId) return null;
  if (/^[0-9a-f-]{36}$/i.test(categoryId)) return categoryId;
  const slug = categoryId.startsWith("cat-") ? categoryId.slice(4) : null;
  if (!slug) return null;
  const catRes = await fetchJson("/api/finance/categories");
  if (!catRes.ok) return null;
  const remote =
    ((catRes.body as { categories?: FinanceCategory[] } | null)?.categories ??
      []) as FinanceCategory[];
  return systemCategorySlugMap(remote).get(slug) ?? null;
}

/**
 * Push a single local manual transaction. Maps `cat-*` system category ids to
 * server UUIDs by slug when needed. Returns status for the caller.
 */
export async function pushManualTransaction(
  tx: FinanceTransaction,
): Promise<"ok" | "auth" | "deferred" | "error"> {
  if (!financeLedgerSync || typeof window === "undefined") return "ok";

  let categoryId = tx.categoryId;
  if (tx.type === "expense") {
    categoryId = await resolveCategoryIdForPush(tx.categoryId);
    if (!categoryId) return "error";
  } else if (categoryId && !/^[0-9a-f-]{36}$/i.test(categoryId)) {
    categoryId = await resolveCategoryIdForPush(categoryId);
  }

  const body = toPushCreateBody({ ...tx, categoryId });
  // Server create schema requires client UUID ids.
  if (!/^[0-9a-f-]{36}$/i.test(body.id)) return "error";

  const res = await fetchJson("/api/finance/transactions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  });

  if (res.status === 401) return "auth";
  if (res.status === 202) return "deferred";
  if (res.status === 201 || res.status === 200) return "ok";
  return "error";
}

/** Soft-delete on the server (idempotent). */
export async function pushSoftDeleteTransaction(
  transactionId: string,
): Promise<"ok" | "auth" | "deferred" | "error"> {
  if (!financeLedgerSync || typeof window === "undefined") return "ok";
  if (!/^[0-9a-f-]{36}$/i.test(transactionId)) return "error";

  const res = await fetchJson(`/api/finance/transactions/${transactionId}`, {
    method: "DELETE",
    keepalive: true,
  });
  if (res.status === 401) return "auth";
  if (res.status === 202) return "deferred";
  if (res.ok) return "ok";
  return "error";
}

/**
 * After a successful push, stamp userId away from LOCAL so we do not re-POST.
 * Remote user id is not required for local calculations.
 */
export function markTransactionSynced(
  state: BudgetLedgerState,
  transactionId: string,
  serverUserId = "server",
): BudgetLedgerState {
  return {
    ...state,
    transactions: state.transactions.map((tx) =>
      tx.id === transactionId ? { ...tx, userId: serverUserId } : tx,
    ),
  };
}

/**
 * Best-effort: pull, then push any still-local manual rows. Safe to call on
 * Budget tab mount; failures leave local state intact.
 */
export async function reconcileBudgetLedger(
  nowIso: string,
): Promise<BudgetLedgerState | null> {
  if (!financeLedgerSync) return null;
  let state = (await pullBudgetLedgerFromServer(nowIso)) ?? loadBudgetLedger(nowIso);

  for (const tx of localPendingManualTransactions(state)) {
    const result = await pushManualTransaction(tx);
    if (result === "ok") {
      state = markTransactionSynced(state, tx.id);
      saveBudgetLedger(state);
    }
  }
  return state;
}
