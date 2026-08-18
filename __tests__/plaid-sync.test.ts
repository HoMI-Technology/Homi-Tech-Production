import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { randomBytes } from "node:crypto";
import { mapPlaidCategoryToFinanceCategory } from "@/lib/plaid/sync";

/**
 * Tests for lib/plaid/sync — the cursor discipline is where sync engines
 * corrupt data, so it gets the microscope:
 *   • cursor persisted ONLY after a has_more=false response (multi-page);
 *   • TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION restarts from the
 *     ORIGINALLY stored cursor with fresh collections (no double counting);
 *   • transactions deduped by transaction_id across pages;
 *   • financial_snapshots row inserted only when values changed;
 *   • ITEM_LOGIN_REQUIRED marks the item and never persists a cursor.
 */

const KEY = randomBytes(32).toString("base64");
const RAW_TOKEN = "access-sandbox-11111111-2222-3333-4444-555555555555";
const TODAY = new Date().toISOString().slice(0, 10);

interface Captured {
  itemUpdates: { patch: Record<string, unknown>; id: string }[];
  accountUpserts: Record<string, unknown>[][];
  snapshotInserts: Record<string, unknown>[];
  txnUpserts: Record<string, unknown>[][];
}

/** Rows the fake DB serves back. */
interface DbFixtures {
  userItemIds: string[];
  accounts: Record<string, unknown>[];
  latestSnapshot: Record<string, unknown> | null;
}

function fakeAdmin(captured: Captured, fixtures: DbFixtures) {
  const txnStore = new Map<string, Record<string, unknown>>();
  return {
    from: (table: string) => {
      if (table === "plaid_items") {
        return {
          update: (patch: Record<string, unknown>) => ({
            eq: async (_col: string, id: string) => {
              captured.itemUpdates.push({ patch, id });
              return { error: null };
            },
          }),
          select: () => ({
            eq: async () => ({
              data: fixtures.userItemIds.map((id) => ({ id })),
              error: null,
            }),
          }),
        };
      }
      if (table === "plaid_accounts") {
        return {
          upsert: async (rows: Record<string, unknown>[]) => {
            captured.accountUpserts.push(rows);
            return { error: null };
          },
          select: () => ({
            in: async () => ({ data: fixtures.accounts, error: null }),
          }),
        };
      }
      if (table === "plaid_transactions") {
        // In-memory store keyed by transaction_id — upserts/deletes mutate it,
        // the cash-flow select reads it back, mirroring the real table.
        return {
          upsert: async (rows: Record<string, unknown>[]) => {
            captured.txnUpserts.push(rows);
            for (const row of rows) txnStore.set(String(row.transaction_id), row);
            return { error: null };
          },
          delete: () => ({
            in: async (_col: string, ids: string[]) => {
              for (const id of ids) txnStore.delete(id);
              return { error: null };
            },
          }),
          select: () => ({
            eq: () => ({
              gte: async (_col: string, cutoff: string) => ({
                data: Array.from(txnStore.values()).filter(
                  (row) => typeof row.txn_date === "string" && (row.txn_date as string) >= cutoff,
                ),
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "financial_snapshots") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => ({
                  maybeSingle: async () => ({ data: fixtures.latestSnapshot, error: null }),
                }),
              }),
            }),
          }),
          insert: async (row: Record<string, unknown>) => {
            captured.snapshotInserts.push(row);
            return { error: null };
          },
        };
      }
      if (table === "finance_categories") {
        return {
          select: () => ({
            eq: async () => ({ data: [], error: null }),
          }),
        };
      }
      if (table === "finance_transactions") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                in: () => ({
                  is: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
          insert: async () => ({ error: null }),
          update: () => ({
            eq: (col?: string, val?: unknown) => {
              if (col === "id" && typeof val === "string") {
                return Promise.resolve({ error: null });
              }
              return {
                eq: () => ({
                  in: () => ({
                    is: async () => ({ error: null }),
                  }),
                }),
              };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

/** Queues Plaid responses and records each /transactions/sync request body. */
function plaidQueue(responses: { status: number; body: unknown }[]) {
  const syncRequests: Record<string, unknown>[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.endsWith("/transactions/sync")) {
      syncRequests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
      const next = responses.shift();
      if (!next) throw new Error("plaidQueue exhausted");
      return new Response(JSON.stringify(next.body), { status: next.status });
    }
    if (url.endsWith("/accounts/get")) {
      return new Response(JSON.stringify({ accounts: [] }), { status: 200 });
    }
    if (url.endsWith("/item/webhook/update")) {
      return new Response(JSON.stringify({}), { status: 200 });
    }
    throw new Error(`unexpected Plaid call: ${url}`);
  });
  return { fetchMock: fetchMock as unknown as typeof fetch, syncRequests };
}

function page(overrides: Record<string, unknown>) {
  return {
    added: [],
    modified: [],
    removed: [],
    accounts: [],
    ...overrides,
  };
}

let encryptToken: (t: string) => string;
let syncItem: typeof import("@/lib/plaid/sync").syncItem;
let syncItemToLedger: typeof import("@/lib/plaid/sync").syncItemToLedger;
let PlaidSyncError: typeof import("@/lib/plaid/sync").PlaidSyncError;

beforeEach(async () => {
  vi.stubEnv("PLAID_CLIENT_ID", "client_test");
  vi.stubEnv("PLAID_SECRET", "secret_test");
  vi.stubEnv("PLAID_TOKEN_KEY", KEY);
  ({ encryptToken } = await import("@/lib/plaid/crypto"));
  ({ syncItem, syncItemToLedger, PlaidSyncError } = await import("@/lib/plaid/sync"));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function makeItem(cursor: string | null) {
  return {
    id: "item-row-1",
    user_id: "user-1",
    item_id: "item-plaid-1",
    access_token_ct: encryptToken(RAW_TOKEN),
    transactions_cursor: cursor,
  };
}

function emptyCaptured(): Captured {
  return { itemUpdates: [], accountUpserts: [], snapshotInserts: [], txnUpserts: [] };
}

interface LedgerCaptured {
  categoriesSelect: boolean;
  existingSelects: { userId: string; ids: string[] }[];
  inserts: Record<string, unknown>[][];
  updates: { id: string; patch: Record<string, unknown> }[];
  softDeletes: { userId: string; ids: string[] }[];
}

function emptyLedgerCaptured(): LedgerCaptured {
  return {
    categoriesSelect: false,
    existingSelects: [],
    inserts: [],
    updates: [],
    softDeletes: [],
  };
}

/**
 * Fake Supabase client scoped to the ledger writes performed by
 * `syncItemToLedger`. It captures inserts, updates, soft-deletes, and the
 * existing-row lookup so tests can assert behavior without a real DB.
 */
function fakeLedgerAdmin(
  captured: LedgerCaptured,
  fixtures: {
    categories: { id: string; slug: string }[];
    existing: { id: string; external_transaction_id: string }[];
  },
) {
  return {
    from: (table: string) => {
      if (table === "finance_categories") {
        return {
          select: () => ({
            eq: async () => {
              captured.categoriesSelect = true;
              return { data: fixtures.categories, error: null };
            },
          }),
        };
      }
      if (table === "finance_transactions") {
        return {
          select: () => ({
            eq: (col: string, val: unknown) => {
              if (col === "user_id") {
                const userId = String(val);
                return {
                  eq: () => ({
                    in: (inCol: string, ids: string[]) => {
                      captured.existingSelects.push({ userId, ids });
                      const matches = fixtures.existing.filter((row) =>
                        ids.includes(row.external_transaction_id),
                      );
                      return {
                        is: async () => ({ data: matches, error: null }),
                      };
                    },
                  }),
                  in: () => ({
                    is: async () => ({ data: [], error: null }),
                  }),
                };
              }
              if (col === "source") {
                return {
                  in: (inCol: string, ids: string[]) => ({
                    is: async () => {
                      captured.softDeletes.push({ userId: String(val), ids });
                      return { error: null };
                    },
                  }),
                };
              }
              return {
                eq: () => ({
                  in: () => ({
                    is: async () => ({ data: [], error: null }),
                  }),
                }),
              };
            },
          }),
          insert: async (rows: Record<string, unknown>[]) => {
            captured.inserts.push(rows);
            return { error: null };
          },
          update: (patch: Record<string, unknown>) => ({
            eq: (col?: string, val?: unknown) => {
              if (col === "id" && typeof val === "string") {
                captured.updates.push({ id: val, patch });
                return Promise.resolve({ error: null });
              }
              if (col === "user_id") {
                return {
                  eq: () => ({
                    in: (inCol: string, ids: string[]) => ({
                      is: async () => {
                        captured.softDeletes.push({ userId: String(val), ids });
                        return { error: null };
                      },
                    }),
                  }),
                };
              }
              return {
                eq: () => ({
                  in: () => ({
                    is: async () => ({ error: null }),
                  }),
                }),
              };
            },
          }),
        };
      }
      throw new Error(`unexpected table ${table}`);
    },
  };
}

describe("syncItem cursor discipline", () => {
  it("pages while has_more, threading next_cursor, and persists the cursor ONLY after has_more=false", async () => {
    const { fetchMock, syncRequests } = plaidQueue([
      {
        status: 200,
        body: page({
          added: [{ transaction_id: "t1", amount: 25, date: TODAY }],
          accounts: [
            {
              account_id: "acc_1",
              name: "Checking",
              type: "depository",
              balances: { current: 1000, available: 900, iso_currency_code: "USD" },
            },
          ],
          next_cursor: "c1",
          has_more: true,
        }),
      },
      {
        status: 200,
        body: page({
          added: [{ transaction_id: "t2", amount: -100, date: TODAY }],
          next_cursor: "c2",
          has_more: false,
        }),
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts: [{ type: "depository", current_balance: 1000, available_balance: 900 }],
      latestSnapshot: null,
    });

    const outcome = await syncItem(admin as never, makeItem(null));

    // First call omits the cursor entirely (first-ever sync); second threads c1.
    expect(syncRequests[0].cursor).toBeUndefined();
    expect(syncRequests[1].cursor).toBe("c1");
    expect(syncRequests[0].count).toBe(500);

    // Exactly one plaid_items update, at the end, with the FINAL cursor.
    expect(captured.itemUpdates).toHaveLength(1);
    const patch = captured.itemUpdates[0].patch;
    expect(patch.transactions_cursor).toBe("c2");
    expect(patch.status).toBe("healthy");
    expect(patch.last_successful_sync).toBeTruthy();

    expect(outcome.added).toBe(2);
    expect(outcome.accountsUpdated).toBe(1);
    expect(captured.accountUpserts).toHaveLength(1);
  });

  it("sends the stored cursor on the first call when one exists", async () => {
    const { fetchMock, syncRequests } = plaidQueue([
      { status: 200, body: page({ next_cursor: "c9", has_more: false }) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts: [],
      latestSnapshot: null,
    });
    await syncItem(admin as never, makeItem("orig-cursor"));

    expect(syncRequests[0].cursor).toBe("orig-cursor");
  });

  it("restarts from the ORIGINAL cursor on TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION without double counting", async () => {
    const t1 = { transaction_id: "t1", amount: 50, date: TODAY };
    const { fetchMock, syncRequests } = plaidQueue([
      { status: 200, body: page({ added: [t1], next_cursor: "c1", has_more: true }) },
      { status: 400, body: { error_code: "TRANSACTIONS_SYNC_MUTATION_DURING_PAGINATION" } },
      // Restarted pagination — t1 arrives AGAIN, must not be double counted.
      { status: 200, body: page({ added: [t1], next_cursor: "c1b", has_more: true }) },
      {
        status: 200,
        body: page({
          added: [{ transaction_id: "t2", amount: 10, date: TODAY }],
          next_cursor: "c2",
          has_more: false,
        }),
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts: [],
      latestSnapshot: null,
    });
    const outcome = await syncItem(admin as never, makeItem("orig"));

    expect(syncRequests.map((r) => r.cursor)).toEqual(["orig", "c1", "orig", "c1b"]);
    expect(outcome.added).toBe(2); // t1 once + t2, not t1 twice
    expect(captured.itemUpdates).toHaveLength(1);
    expect(captured.itemUpdates[0].patch.transactions_cursor).toBe("c2");
  });

  it("dedupes transactions repeated across pages by transaction_id", async () => {
    const dup = { transaction_id: "t-dup", amount: 5, date: TODAY };
    const { fetchMock } = plaidQueue([
      { status: 200, body: page({ added: [dup], next_cursor: "c1", has_more: true }) },
      { status: 200, body: page({ added: [dup], next_cursor: "c2", has_more: false }) },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts: [],
      latestSnapshot: null,
    });
    const outcome = await syncItem(admin as never, makeItem(null));
    expect(outcome.added).toBe(1);
  });

  it("marks the item login_required and does NOT persist a cursor on ITEM_LOGIN_REQUIRED", async () => {
    const { fetchMock } = plaidQueue([
      { status: 400, body: { error_code: "ITEM_LOGIN_REQUIRED" } },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts: [],
      latestSnapshot: null,
    });

    await expect(syncItem(admin as never, makeItem("keep-me"))).rejects.toBeInstanceOf(
      PlaidSyncError,
    );

    expect(captured.itemUpdates).toHaveLength(1);
    expect(captured.itemUpdates[0].patch).toEqual({ status: "login_required" });
    // No cursor/last_successful_sync write happened.
    expect(captured.itemUpdates[0].patch.transactions_cursor).toBeUndefined();
  });
});

describe("syncItem snapshot math", () => {
  const accounts = [
    { type: "depository", current_balance: 1000, available_balance: 900 },
    { type: "investment", current_balance: 5000, available_balance: null },
    { type: "credit", current_balance: 200, available_balance: null },
    { type: "loan", current_balance: 300, available_balance: null },
  ];

  function txnResponses() {
    return plaidQueue([
      {
        status: 200,
        body: page({
          added: [
            // Plaid convention: negative = money IN (income), positive = OUT.
            { transaction_id: "pay", amount: -2000, date: TODAY },
            { transaction_id: "rent", amount: 500, date: TODAY },
            // Outside the 30-day window — must be ignored.
            { transaction_id: "old", amount: 999, date: "2020-01-01" },
          ],
          next_cursor: "cx",
          has_more: false,
        }),
      },
    ]);
  }

  it("inserts a snapshot with signed net worth, 30-day cash flow, and clamped savings rate", async () => {
    const { fetchMock } = txnResponses();
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts,
      latestSnapshot: null,
    });

    const outcome = await syncItem(admin as never, makeItem(null));
    expect(outcome.snapshotInserted).toBe(true);
    expect(captured.snapshotInserts).toHaveLength(1);

    const row = captured.snapshotInserts[0];
    expect(row.user_id).toBe("user-1");
    // 1000 + 5000 - 200 - 300
    expect(row.net_worth).toBe(5500);
    // income 2000, expenses 500 (the 2020 txn is outside the window)
    expect(row.net_cash_flow).toBe(1500);
    expect(row.savings_rate).toBe(0.75);
    expect(row.id).toBeTruthy(); // financial_snapshots.id has no DB default
    expect(row.completed_at).toBeTruthy();

    const state = row.state as Record<string, unknown>;
    expect(state.source).toBe("plaid_sync");
    expect(state.monthlyIncome).toBe(2000);
    expect(state.monthlyExpenses).toBe(500);
    expect(state.liquidSavings).toBe(1000);
    expect(state.totalDebt).toBe(500);
  });

  it("does NOT insert a snapshot when values match the latest row", async () => {
    const { fetchMock } = txnResponses();
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts,
      latestSnapshot: { net_worth: 5500, net_cash_flow: 1500, savings_rate: 0.75 },
    });

    const outcome = await syncItem(admin as never, makeItem(null));
    expect(outcome.snapshotInserted).toBe(false);
    expect(captured.snapshotInserts).toHaveLength(0);
    // Cursor still persisted — an unchanged snapshot is a successful sync.
    expect(captured.itemUpdates).toHaveLength(1);
    expect(captured.itemUpdates[0].patch.status).toBe("healthy");
  });

  it("clamps savings_rate to 0 when there is no income in the window", async () => {
    const { fetchMock } = plaidQueue([
      {
        status: 200,
        body: page({
          added: [{ transaction_id: "spend", amount: 250, date: TODAY }],
          next_cursor: "cy",
          has_more: false,
        }),
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts,
      latestSnapshot: null,
    });
    await syncItem(admin as never, makeItem(null));

    const row = captured.snapshotInserts[0];
    expect(row.savings_rate).toBe(0);
    expect(row.net_cash_flow).toBe(-250);
  });

  it("honors removed ids from the sync window (added then removed nets out)", async () => {
    const { fetchMock } = plaidQueue([
      {
        status: 200,
        body: page({
          added: [
            { transaction_id: "keep", amount: -100, date: TODAY },
            { transaction_id: "ghost", amount: 400, date: TODAY },
          ],
          next_cursor: "c1",
          has_more: true,
        }),
      },
      {
        status: 200,
        body: page({
          removed: [{ transaction_id: "ghost" }],
          next_cursor: "c2",
          has_more: false,
        }),
      },
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const captured = emptyCaptured();
    const admin = fakeAdmin(captured, {
      userItemIds: ["item-row-1"],
      accounts,
      latestSnapshot: null,
    });
    await syncItem(admin as never, makeItem(null));

    const row = captured.snapshotInserts[0];
    expect(row.net_cash_flow).toBe(100); // ghost's 400 expense removed
  });
});

describe("mapPlaidCategoryToFinanceCategory", () => {
  it("maps known Plaid categories to system category ids", () => {
    const slugToId = new Map([
      ["dining", "cat-dining"],
      ["housing", "cat-housing"],
      ["other-income", "cat-other-income"],
    ]);
    expect(mapPlaidCategoryToFinanceCategory("FOOD_AND_DRINK", slugToId)).toBe("cat-dining");
    expect(mapPlaidCategoryToFinanceCategory("HOUSING", slugToId)).toBe("cat-housing");
    expect(mapPlaidCategoryToFinanceCategory("INCOME", slugToId)).toBe("cat-other-income");
  });

  it("returns null for unknown or missing categories", () => {
    const slugToId = new Map([["dining", "cat-dining"]]);
    expect(mapPlaidCategoryToFinanceCategory("UNKNOWN_CATEGORY", slugToId)).toBeNull();
    expect(mapPlaidCategoryToFinanceCategory(null, slugToId)).toBeNull();
    expect(mapPlaidCategoryToFinanceCategory(undefined, slugToId)).toBeNull();
  });
});

describe("syncItemToLedger", () => {
  const categories = [
    { id: "cat-dining", slug: "dining" },
    { id: "cat-other-income", slug: "other-income" },
    { id: "cat-personal", slug: "personal" },
  ];

  function makeTxn(overrides: Record<string, unknown>) {
    return {
      transaction_id: "t-default",
      amount: 1,
      date: "2026-08-04",
      name: "Transaction",
      merchant_name: null,
      personal_finance_category: { primary: null },
      pending: false,
      ...overrides,
    };
  }

  it("inserts new rows and maps categories/amount signs", async () => {
    const captured = emptyLedgerCaptured();
    const admin = fakeLedgerAdmin(captured, { categories, existing: [] });

    const effective = new Map([
      [
        "t1",
        makeTxn({
          transaction_id: "t1",
          amount: 12.34,
          name: "Lunch",
          merchant_name: "Cafe",
          personal_finance_category: { primary: "FOOD_AND_DRINK" },
        }),
      ],
      [
        "t2",
        makeTxn({
          transaction_id: "t2",
          amount: -100,
          name: "Paycheck",
          personal_finance_category: { primary: "INCOME" },
        }),
      ],
    ]);

    await syncItemToLedger(
      admin as never,
      { id: "item-1", user_id: "user-1" },
      effective,
      new Set(),
    );

    expect(captured.categoriesSelect).toBe(true);
    expect(captured.existingSelects).toHaveLength(1);
    expect(captured.existingSelects[0].ids).toEqual(["t1", "t2"]);
    expect(captured.inserts).toHaveLength(1);
    expect(captured.inserts[0]).toHaveLength(2);
    expect(captured.updates).toHaveLength(0);
    expect(captured.softDeletes).toHaveLength(0);

    const [expenseRow, incomeRow] = captured.inserts[0];
    expect(expenseRow.external_transaction_id).toBe("t1");
    expect(expenseRow.type).toBe("expense");
    expect(expenseRow.amount_cents).toBe(1234);
    expect(expenseRow.category_id).toBe("cat-dining");
    expect(expenseRow.merchant_name).toBe("Cafe");
    expect(expenseRow.status).toBe("posted");

    expect(incomeRow.external_transaction_id).toBe("t2");
    expect(incomeRow.type).toBe("income");
    expect(incomeRow.amount_cents).toBe(10000);
    expect(incomeRow.category_id).toBe("cat-other-income");
  });

  it("updates existing rows by external_transaction_id", async () => {
    const captured = emptyLedgerCaptured();
    const admin = fakeLedgerAdmin(captured, {
      categories,
      existing: [{ id: "fin-1", external_transaction_id: "t1" }],
    });

    const effective = new Map([
      [
        "t1",
        makeTxn({
          transaction_id: "t1",
          amount: 55,
          name: "Updated lunch",
          personal_finance_category: { primary: "FOOD_AND_DRINK" },
        }),
      ],
      [
        "t2",
        makeTxn({
          transaction_id: "t2",
          amount: -25,
          name: "Refund",
          personal_finance_category: { primary: "INCOME" },
        }),
      ],
    ]);

    await syncItemToLedger(
      admin as never,
      { id: "item-1", user_id: "user-1" },
      effective,
      new Set(),
    );

    expect(captured.inserts).toHaveLength(1);
    expect(captured.inserts[0]).toHaveLength(1);
    expect(captured.inserts[0][0].external_transaction_id).toBe("t2");

    expect(captured.updates).toHaveLength(1);
    expect(captured.updates[0].id).toBe("fin-1");
    expect(captured.updates[0].patch.external_transaction_id).toBe("t1");
    expect(captured.updates[0].patch.amount_cents).toBe(5500);
    expect(captured.updates[0].patch.type).toBe("expense");
  });

  it("soft-deletes removed ids", async () => {
    const captured = emptyLedgerCaptured();
    const admin = fakeLedgerAdmin(captured, { categories, existing: [] });

    const effective = new Map([
      ["keep", makeTxn({ transaction_id: "keep", amount: 10, name: "Keep me" })],
    ]);

    await syncItemToLedger(
      admin as never,
      { id: "item-1", user_id: "user-1" },
      effective,
      new Set(["ghost"]),
    );

    expect(captured.softDeletes).toHaveLength(1);
    expect(captured.softDeletes[0].userId).toBe("user-1");
    expect(captured.softDeletes[0].ids).toEqual(["ghost"]);
  });

  it("marks pending transactions as pending with no posted_at", async () => {
    const captured = emptyLedgerCaptured();
    const admin = fakeLedgerAdmin(captured, { categories, existing: [] });

    const effective = new Map([
      ["pending", makeTxn({ transaction_id: "pending", amount: 9.99, pending: true })],
    ]);

    await syncItemToLedger(
      admin as never,
      { id: "item-1", user_id: "user-1" },
      effective,
      new Set(),
    );

    const row = captured.inserts[0][0];
    expect(row.status).toBe("pending");
    expect(row.posted_at).toBeNull();
  });

  it("maps unknown categories to null category_id", async () => {
    const captured = emptyLedgerCaptured();
    const admin = fakeLedgerAdmin(captured, { categories, existing: [] });

    const effective = new Map([
      [
        "t1",
        makeTxn({
          transaction_id: "t1",
          amount: 5,
          personal_finance_category: { primary: "WEIRD_STUFF" },
        }),
      ],
    ]);

    await syncItemToLedger(
      admin as never,
      { id: "item-1", user_id: "user-1" },
      effective,
      new Set(),
    );

    expect(captured.inserts[0][0].category_id).toBeNull();
  });
});
