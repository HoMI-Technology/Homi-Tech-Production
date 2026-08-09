import { describe, it, expect } from "vitest";
import type { FinanceCategory, FinanceTransaction } from "@/lib/finance/ledger";
import {
  adoptServerCategoryIds,
  localPendingManualTransactions,
  mergeRemoteTransactions,
  systemCategorySlugMap,
  toPushCreateBody,
  markTransactionSynced,
} from "@/lib/finance/ledger-sync";
import {
  emptyBudgetLedger,
  LOCAL_USER_ID,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import type { MoneyCents } from "@/lib/finance/money";

function tx(
  partial: Partial<FinanceTransaction> & Pick<FinanceTransaction, "id" | "updatedAt">,
): FinanceTransaction {
  return {
    userId: LOCAL_USER_ID,
    type: "expense",
    status: "posted",
    amountCents: 100 as MoneyCents,
    currency: "USD",
    description: "x",
    merchantName: null,
    categoryId: "cat-housing",
    accountId: null,
    transactionDate: "2026-08-03",
    postedAt: "2026-08-03T00:00:00.000Z",
    source: "manual",
    externalTransactionId: null,
    recurringRuleId: null,
    transferGroupId: null,
    parentTransactionId: null,
    isExcludedFromBudget: false,
    userNote: null,
    createdAt: partial.updatedAt,
    deletedAt: null,
    ...partial,
  };
}

describe("systemCategorySlugMap / adoptServerCategoryIds", () => {
  it("maps local cat-* system ids onto server UUIDs by slug", () => {
    const now = "2026-08-03T00:00:00.000Z";
    const local = emptyBudgetLedger(now);
    local.transactions = [
      tx({
        id: "11111111-1111-4111-8111-111111111111",
        updatedAt: now,
        categoryId: "cat-housing",
      }),
    ];
    const remoteCats: FinanceCategory[] = [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        userId: null,
        name: "Housing",
        slug: "housing",
        categoryType: "expense",
        essentiality: "required",
        parentCategoryId: null,
        isSystem: true,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
    const adopted = adoptServerCategoryIds(local, remoteCats);
    expect(adopted.transactions[0]?.categoryId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(systemCategorySlugMap(adopted.categories).get("housing")).toBe(
      "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    );
  });
});

describe("mergeRemoteTransactions", () => {
  it("keeps the newer updatedAt and adds remote-only rows", () => {
    const older = tx({
      id: "11111111-1111-4111-8111-111111111111",
      updatedAt: "2026-08-01T00:00:00.000Z",
      description: "old",
    });
    const newer = tx({
      id: "11111111-1111-4111-8111-111111111111",
      updatedAt: "2026-08-03T00:00:00.000Z",
      description: "new",
      userId: "server-user",
    });
    const remoteOnly = tx({
      id: "22222222-2222-4222-8222-222222222222",
      updatedAt: "2026-08-02T00:00:00.000Z",
      description: "remote",
    });
    const merged = mergeRemoteTransactions([older], [newer, remoteOnly]);
    expect(merged).toHaveLength(2);
    expect(merged.find((t) => t.id === older.id)?.description).toBe("new");
    expect(merged.find((t) => t.id === remoteOnly.id)?.description).toBe("remote");
  });
});

describe("localPendingManualTransactions / markTransactionSynced", () => {
  it("lists only local-user manual rows and clears them after mark", () => {
    const now = "2026-08-03T00:00:00.000Z";
    let state: BudgetLedgerState = emptyBudgetLedger(now);
    state = {
      ...state,
      transactions: [
        tx({ id: "11111111-1111-4111-8111-111111111111", updatedAt: now }),
        tx({
          id: "22222222-2222-4222-8222-222222222222",
          updatedAt: now,
          userId: "server-user",
        }),
      ],
    };
    expect(localPendingManualTransactions(state)).toHaveLength(1);
    state = markTransactionSynced(state, "11111111-1111-4111-8111-111111111111");
    expect(localPendingManualTransactions(state)).toHaveLength(0);
  });
});

describe("toPushCreateBody", () => {
  it("builds a stable idempotency key from the local id", () => {
    const body = toPushCreateBody(
      tx({ id: "11111111-1111-4111-8111-111111111111", updatedAt: "2026-08-03T00:00:00.000Z" }),
    );
    expect(body.idempotencyKey).toBe("local-tx-11111111-1111-4111-8111-111111111111");
    expect(body.amountCents).toBe(100);
  });
});
