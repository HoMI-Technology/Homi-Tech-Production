import { describe, expect, it } from "vitest";

import {
  PLAID_CATEGORY_TO_SLUG,
  mapPlaidCategoryToFinanceCategory,
  mapPlaidRowToFinanceTransaction,
  buildFinanceRows,
  runBackfill,
} from "./backfill-plaid-to-ledger.mjs";

const categories = new Map([
  ["dining", "cat-dining"],
  ["housing", "cat-housing"],
  ["other-income", "cat-other-income"],
  ["personal", "cat-personal"],
]);

function makePlaidRow(overrides = {}) {
  return {
    user_id: "user-1",
    transaction_id: "tx-1",
    amount: 10,
    txn_date: "2026-08-04",
    name: "Coffee",
    merchant_name: "Cafe",
    category: "FOOD_AND_DRINK",
    pending: false,
    ...overrides,
  };
}

describe("PLAID_CATEGORY_TO_SLUG", () => {
  it("contains the same keys used by lib/plaid/sync.ts", () => {
    expect(PLAID_CATEGORY_TO_SLUG["FOOD_AND_DRINK"]).toBe("dining");
    expect(PLAID_CATEGORY_TO_SLUG["INCOME"]).toBe("other-income");
    expect(PLAID_CATEGORY_TO_SLUG["RENT_AND_UTILITIES"]).toBe("utilities");
  });
});

describe("mapPlaidCategoryToFinanceCategory", () => {
  it("maps known Plaid categories to system category ids", () => {
    expect(mapPlaidCategoryToFinanceCategory("FOOD_AND_DRINK", categories)).toBe("cat-dining");
    expect(mapPlaidCategoryToFinanceCategory("INCOME", categories)).toBe("cat-other-income");
    expect(mapPlaidCategoryToFinanceCategory("HOUSING", categories)).toBe("cat-housing");
  });

  it("returns null for unknown or missing categories", () => {
    expect(mapPlaidCategoryToFinanceCategory("UNKNOWN", categories)).toBeNull();
    expect(mapPlaidCategoryToFinanceCategory(null, categories)).toBeNull();
    expect(mapPlaidCategoryToFinanceCategory(undefined, categories)).toBeNull();
  });
});

describe("mapPlaidRowToFinanceTransaction", () => {
  const nowIso = "2026-08-04T12:00:00.000Z";

  it("maps positive Plaid amounts to expenses and negative to income", () => {
    const expense = mapPlaidRowToFinanceTransaction(makePlaidRow({ amount: 12.34 }), categories, nowIso);
    expect(expense.type).toBe("expense");
    expect(expense.amount_cents).toBe(1234);

    const income = mapPlaidRowToFinanceTransaction(makePlaidRow({ amount: -100 }), categories, nowIso);
    expect(income.type).toBe("income");
    expect(income.amount_cents).toBe(10000);
  });

  it("maps categories and falls back to null for unknowns", () => {
    const known = mapPlaidRowToFinanceTransaction(makePlaidRow({ category: "FOOD_AND_DRINK" }), categories, nowIso);
    expect(known.category_id).toBe("cat-dining");

    const unknown = mapPlaidRowToFinanceTransaction(makePlaidRow({ category: "ALIENS" }), categories, nowIso);
    expect(unknown.category_id).toBeNull();

    const missing = mapPlaidRowToFinanceTransaction(makePlaidRow({ category: null }), categories, nowIso);
    expect(missing.category_id).toBeNull();
  });

  it("marks pending rows and clears posted_at", () => {
    const pending = mapPlaidRowToFinanceTransaction(makePlaidRow({ pending: true }), categories, nowIso);
    expect(pending.status).toBe("pending");
    expect(pending.posted_at).toBeNull();

    const posted = mapPlaidRowToFinanceTransaction(makePlaidRow({ pending: false }), categories, nowIso);
    expect(posted.status).toBe("posted");
    expect(posted.posted_at).toBe(nowIso);
  });

  it("truncates description and merchant_name to 160 characters", () => {
    const longName = "a".repeat(250);
    const row = mapPlaidRowToFinanceTransaction(
      makePlaidRow({ name: longName, merchant_name: longName }),
      categories,
      nowIso,
    );
    expect(row.description).toHaveLength(160);
    expect(row.merchant_name).toHaveLength(160);
  });

  it("falls back description to merchant_name then a default", () => {
    const fromMerchant = mapPlaidRowToFinanceTransaction(
      makePlaidRow({ name: null, merchant_name: "Merchant" }),
      categories,
      nowIso,
    );
    expect(fromMerchant.description).toBe("Merchant");

    const defaultDesc = mapPlaidRowToFinanceTransaction(makePlaidRow({ name: null, merchant_name: null }), categories, nowIso);
    expect(defaultDesc.description).toBe("Plaid transaction");
  });

  it("falls back transaction_date to today when txn_date is missing", () => {
    const row = mapPlaidRowToFinanceTransaction(makePlaidRow({ txn_date: null }), categories, nowIso);
    expect(row.transaction_date).toBe("2026-08-04");
  });

  it("returns null for zero-amount rows", () => {
    expect(mapPlaidRowToFinanceTransaction(makePlaidRow({ amount: 0 }), categories, nowIso)).toBeNull();
  });

  it("throws for non-numeric amounts", () => {
    expect(() => mapPlaidRowToFinanceTransaction(makePlaidRow({ amount: "bad" }), categories, nowIso)).toThrow();
  });
});

describe("buildFinanceRows", () => {
  const nowIso = "2026-08-04T12:00:00.000Z";

  it("dedupes rows already present in the ledger", () => {
    const existing = new Set(["tx-1"]);
    const rows = [makePlaidRow({ transaction_id: "tx-1" }), makePlaidRow({ transaction_id: "tx-2" })];
    const { toInsert, skippedExisting, skippedZero } = buildFinanceRows(rows, existing, categories, nowIso);

    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].external_transaction_id).toBe("tx-2");
    expect(skippedExisting).toBe(1);
    expect(skippedZero).toBe(0);
  });

  it("skips zero-amount rows", () => {
    const rows = [makePlaidRow({ transaction_id: "tx-1", amount: 0 }), makePlaidRow({ transaction_id: "tx-2", amount: 5 })];
    const { toInsert, skippedExisting, skippedZero } = buildFinanceRows(rows, new Set(), categories, nowIso);

    expect(toInsert).toHaveLength(1);
    expect(toInsert[0].external_transaction_id).toBe("tx-2");
    expect(skippedExisting).toBe(0);
    expect(skippedZero).toBe(1);
  });
});

/**
 * Minimal fluent fake for the parts of the Supabase client that runBackfill uses.
 */
function fakeSupabase({ categories = [], existingIds = new Set(), plaidRows = [] } = {}) {
  const state = {
    categoriesSelect: false,
    existingSelects: 0,
    plaidReads: [],
    inserts: [],
  };

  function builder(table) {
    const query = { table };

    const chain = {
      select: (cols) => {
        query.select = cols;
        return chain;
      },
      eq: (col, val) => {
        query.eq = { col, val };
        return chain;
      },
      is: (col, val) => {
        query.is = { col, val };
        return chain;
      },
      not: (col, op, val) => {
        query.not = { col, op, val };
        return chain;
      },
      order: (col) => {
        query.order = col;
        return chain;
      },
      range: (from, to) => {
        query.range = { from, to };
        return chain;
      },
      insert: async (rows) => {
        state.inserts.push(rows);
        return { error: null };
      },
      then: async (resolve) => {
        if (table === "finance_categories") {
          state.categoriesSelect = true;
          return resolve({ data: categories, error: null });
        }
        if (table === "finance_transactions" && query.select === "external_transaction_id") {
          state.existingSelects += 1;
          const data = Array.from(existingIds).map((external_transaction_id) => ({ external_transaction_id }));
          return resolve({ data, error: null });
        }
        if (table === "plaid_transactions") {
          state.plaidReads.push(query.range);
          const page = plaidRows.slice(query.range.from, query.range.to + 1);
          return resolve({ data: page, error: null });
        }
        return resolve({ data: [], error: null });
      },
    };

    return chain;
  }

  return {
    from: builder,
    state,
  };
}

describe("runBackfill", () => {
  it("inserts only non-existing rows in batches and returns a summary", async () => {
    const plaidRows = [
      makePlaidRow({ transaction_id: "old-1" }),
      makePlaidRow({ transaction_id: "new-1" }),
      makePlaidRow({ transaction_id: "new-2" }),
    ];
    const { from, state } = fakeSupabase({
      categories: [
        { id: "cat-dining", slug: "dining" },
      ],
      existingIds: new Set(["old-1"]),
      plaidRows,
    });

    const summary = await runBackfill({ from });

    expect(state.categoriesSelect).toBe(true);
    expect(state.existingSelects).toBeGreaterThan(0);
    expect(state.plaidReads.length).toBeGreaterThan(0);
    expect(state.inserts).toHaveLength(1);
    expect(state.inserts[0]).toHaveLength(2);
    expect(summary.readTotal).toBe(3);
    expect(summary.skippedExisting).toBe(1);
    expect(summary.inserted).toBe(2);
    expect(summary.errors).toBe(0);
  });

  it("does not insert in dry-run mode", async () => {
    const plaidRows = [makePlaidRow({ transaction_id: "new-1" })];
    const { from, state } = fakeSupabase({
      categories: [{ id: "cat-dining", slug: "dining" }],
      existingIds: new Set(),
      plaidRows,
    });

    const summary = await runBackfill({ from }, { dryRun: true, batchSize: 500 });

    expect(state.inserts).toHaveLength(0);
    expect(summary.readTotal).toBe(1);
    expect(summary.dryRun).toBe(true);
  });
});
