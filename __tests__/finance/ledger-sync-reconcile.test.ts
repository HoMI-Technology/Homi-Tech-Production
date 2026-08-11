/**
 * Reconcile is the pass that finally makes the money ledger durable, so the
 * cases pinned here are the ones that would silently lose or duplicate a row.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  localPendingDeletions,
  markTransactionDeleteSynced,
  reconcileBudgetLedger,
  SYNCED_DELETED_USER_ID,
  SYNCED_USER_ID,
} from "@/lib/finance/ledger-sync";
import {
  emptyBudgetLedger,
  loadBudgetLedger,
  saveBudgetLedger,
  LOCAL_USER_ID,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import type { FinanceCategory, FinanceTransaction } from "@/lib/finance/ledger";
import type { MoneyCents } from "@/lib/finance/money";

const NOW = "2026-08-11T00:00:00.000Z";
const ID_A = "11111111-1111-4111-8111-111111111111";
const ID_B = "22222222-2222-4222-8222-222222222222";
const FOOD_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

/**
 * The server must return the system categories or nothing can sync: an expense
 * carries a local `cat-food` id, and the push resolves it to the server UUID by
 * slug before it will POST. An empty category list is not a benign stub — it
 * blocks every expense.
 */
function serverCategories(): FinanceCategory[] {
  return [
    {
      id: FOOD_ID,
      userId: null,
      name: "Food",
      slug: "food",
      categoryType: "expense",
      essentiality: "required",
      parentCategoryId: null,
      isSystem: true,
      isArchived: false,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ];
}

function tx(
  partial: Partial<FinanceTransaction> & Pick<FinanceTransaction, "id">,
): FinanceTransaction {
  return {
    userId: LOCAL_USER_ID,
    type: "expense",
    status: "posted",
    amountCents: 1000 as MoneyCents,
    currency: "USD",
    description: "coffee",
    merchantName: null,
    categoryId: "cat-food",
    accountId: null,
    transactionDate: "2026-08-11",
    postedAt: NOW,
    source: "manual",
    externalTransactionId: null,
    recurringRuleId: null,
    transferGroupId: null,
    parentTransactionId: null,
    isExcludedFromBudget: false,
    userNote: null,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
    ...partial,
  };
}

function stubStorage(): void {
  const backing = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => backing.get(k) ?? null,
      setItem: (k: string, v: string) => void backing.set(k, v),
      removeItem: (k: string) => void backing.delete(k),
    },
  });
}

/** Records every request so we can assert what did and did not go out. */
function stubFetch(
  handler: (url: string, init?: RequestInit) => { status: number; body?: unknown },
) {
  const calls: { url: string; method: string }[] = [];
  vi.stubGlobal("fetch", (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? "GET" });
    const { status, body } = handler(url, init);
    return Promise.resolve({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(body ?? {}),
    } as Response);
  });
  return calls;
}

/** Empty server, every write accepted. */
function acceptAll(url: string) {
  if (url.includes("/categories")) return { status: 200, body: { categories: serverCategories() } };
  if (url.includes("/transactions?")) return { status: 200, body: { transactions: [] } };
  return { status: 201, body: {} };
}

function seed(transactions: FinanceTransaction[]): BudgetLedgerState {
  const state = { ...emptyBudgetLedger(NOW), transactions };
  saveBudgetLedger(state);
  return state;
}

describe("localPendingDeletions", () => {
  beforeEach(stubStorage);
  afterEach(() => vi.unstubAllGlobals());

  it("skips a row deleted before it ever synced — the server never had it", () => {
    const state = seed([tx({ id: ID_A, userId: LOCAL_USER_ID, deletedAt: NOW })]);
    expect(localPendingDeletions(state)).toHaveLength(0);
  });

  it("includes a row the server accepted and we then deleted", () => {
    const state = seed([tx({ id: ID_A, userId: SYNCED_USER_ID, deletedAt: NOW })]);
    expect(localPendingDeletions(state)).toHaveLength(1);
  });

  it("stops listing a deletion once it has been pushed", () => {
    let state = seed([tx({ id: ID_A, userId: SYNCED_USER_ID, deletedAt: NOW })]);
    state = markTransactionDeleteSynced(state, ID_A);
    expect(localPendingDeletions(state)).toHaveLength(0);
    expect(state.transactions[0]?.userId).toBe(SYNCED_DELETED_USER_ID);
  });

  it("ignores live rows", () => {
    const state = seed([tx({ id: ID_A, userId: SYNCED_USER_ID, deletedAt: null })]);
    expect(localPendingDeletions(state)).toHaveLength(0);
  });
});

describe("reconcileBudgetLedger", () => {
  beforeEach(stubStorage);
  afterEach(() => vi.unstubAllGlobals());

  it("pushes a local row and marks it so the next pass does not resend it", async () => {
    seed([tx({ id: ID_A })]);
    const calls = stubFetch(acceptAll);

    const state = await reconcileBudgetLedger(NOW);

    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
    expect(state?.transactions[0]?.userId).toBe(SYNCED_USER_ID);

    calls.length = 0;
    await reconcileBudgetLedger(NOW);
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(0);
  });

  it("pushes the deletion of a row the server still holds", async () => {
    seed([tx({ id: ID_A, userId: SYNCED_USER_ID, deletedAt: NOW })]);
    const calls = stubFetch(acceptAll);

    const state = await reconcileBudgetLedger(NOW);

    const deletes = calls.filter((c) => c.method === "DELETE");
    expect(deletes).toHaveLength(1);
    expect(deletes[0]?.url).toContain(ID_A);
    expect(state?.transactions[0]?.userId).toBe(SYNCED_DELETED_USER_ID);
  });

  /**
   * A 409 means the row is already on the server — usually a push that
   * succeeded after the local mark failed to persist. Treating it as an error
   * would retry it on every mount forever.
   */
  it("treats an existing id as done rather than retrying it forever", async () => {
    seed([tx({ id: ID_A })]);
    stubFetch((url) => {
      if (url.includes("/categories"))
        return { status: 200, body: { categories: serverCategories() } };
      if (url.includes("/transactions?")) return { status: 200, body: { transactions: [] } };
      return { status: 409, body: { error: "Transaction id already exists." } };
    });

    const state = await reconcileBudgetLedger(NOW);
    expect(state?.transactions[0]?.userId).toBe(SYNCED_USER_ID);
  });

  /**
   * Fifty pending rows and a dead session should cost one request, not fifty.
   */
  it("stops the pass on 401 instead of firing every remaining request", async () => {
    seed([tx({ id: ID_A }), tx({ id: ID_B })]);
    const calls = stubFetch((url) => {
      if (url.includes("/categories"))
        return { status: 200, body: { categories: serverCategories() } };
      if (url.includes("/transactions?")) return { status: 200, body: { transactions: [] } };
      return { status: 401, body: { error: "Not authenticated." } };
    });

    await reconcileBudgetLedger(NOW);
    expect(calls.filter((c) => c.method === "POST")).toHaveLength(1);
  });

  it("leaves a failed push pending so it goes out next time", async () => {
    seed([tx({ id: ID_A })]);
    stubFetch((url) => {
      if (url.includes("/categories"))
        return { status: 200, body: { categories: serverCategories() } };
      if (url.includes("/transactions?")) return { status: 200, body: { transactions: [] } };
      return { status: 500, body: { error: "boom" } };
    });

    const state = await reconcileBudgetLedger(NOW);
    expect(state?.transactions[0]?.userId).toBe(LOCAL_USER_ID);
  });

  /**
   * The pull asks for tombstones; a remote row that is already deleted must not
   * generate a DELETE back to the server on this or any later pass.
   */
  it("adopts a remote tombstone without echoing the delete back", async () => {
    seed([tx({ id: ID_A, userId: SYNCED_USER_ID })]);
    const calls = stubFetch((url) => {
      if (url.includes("/categories"))
        return { status: 200, body: { categories: serverCategories() } };
      if (url.includes("/transactions?")) {
        return {
          status: 200,
          body: {
            transactions: [
              tx({
                id: ID_A,
                userId: "server-uuid",
                deletedAt: "2026-08-12T00:00:00.000Z",
                updatedAt: "2026-08-12T00:00:00.000Z",
              }),
            ],
          },
        };
      }
      return { status: 200, body: {} };
    });

    const state = await reconcileBudgetLedger(NOW);

    expect(state?.transactions[0]?.deletedAt).not.toBeNull();
    expect(calls.filter((c) => c.method === "DELETE")).toHaveLength(0);
  });

  it("requests tombstones on the pull", async () => {
    seed([]);
    const calls = stubFetch(acceptAll);
    await reconcileBudgetLedger(NOW);
    expect(calls.some((c) => c.url.includes("includeDeleted=1"))).toBe(true);
  });

  it("keeps the local ledger when the session is anonymous", async () => {
    seed([tx({ id: ID_A })]);
    stubFetch(() => ({ status: 401, body: { error: "Not authenticated." } }));

    const state = await reconcileBudgetLedger(NOW);
    expect(state?.transactions).toHaveLength(1);
    expect(loadBudgetLedger(NOW).transactions).toHaveLength(1);
  });
});
