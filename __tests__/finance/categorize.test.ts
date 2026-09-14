import { describe, expect, it } from "vitest";
import {
  applyCategoryRules,
  normalizePayee,
  suggestRulesFromHistory,
  type CategoryRule,
} from "@/lib/finance/categorize";
import type { FinanceTransaction } from "@/lib/finance/ledger";

const rule = (
  id: string,
  matchType: CategoryRule["matchType"],
  pattern: string,
  categoryId: string,
  priority: number,
): CategoryRule => ({ id, matchType, pattern, categoryId, priority });

describe("normalizePayee", () => {
  it("case-folds, trims, collapses whitespace", () => {
    expect(normalizePayee("  Whole   FOODS ")).toBe("whole foods");
    expect(normalizePayee("AMZN MKTP US")).toBe("amzn mktp us");
  });
});

describe("applyCategoryRules", () => {
  const rules = [
    rule("r1", "payee_contains", "amzn", "cat-shopping", 10),
    rule("r2", "payee_exact", "amzn mktp us", "cat-online", 10),
    rule("r3", "payee_contains", "amzn", "cat-other", 5),
  ];

  it("pays exact beats contains at equal priority", () => {
    const hit = applyCategoryRules("AMZN MKTP US", [rules[0]!, rules[1]!]);
    expect(hit!.id).toBe("r2");
  });

  it("lower priority number wins regardless of match type", () => {
    const hit = applyCategoryRules("amzn mktp us", rules);
    expect(hit!.id).toBe("r3"); // priority 5 beats 10
  });

  it("contains matches substrings case-insensitively", () => {
    const hit = applyCategoryRules("AMZN MKTP US*2V3", [rule("x", "payee_contains", "amzn", "c", 1)]);
    expect(hit!.id).toBe("x");
  });

  it("returns null for no match or empty payee", () => {
    expect(applyCategoryRules("nothing", rules)).toBeNull();
    expect(applyCategoryRules("   ", rules)).toBeNull();
  });

  it("is deterministic under shuffled input", () => {
    const a = applyCategoryRules("amzn mktp us", rules);
    const b = applyCategoryRules("amzn mktp us", [...rules].reverse());
    expect(a!.id).toBe(b!.id);
  });

  it("breaks full ties by pattern then id", () => {
    const tied = [
      rule("rb", "payee_exact", "cafe", "cat-b", 1),
      rule("ra", "payee_exact", "cafe", "cat-a", 1),
    ];
    expect(applyCategoryRules("cafe", tied)!.id).toBe("ra");
  });
});

describe("suggestRulesFromHistory", () => {
  let seq = 0;
  const mtx = (payee: string, categoryId: string | null, overrides: Partial<FinanceTransaction> = {}): FinanceTransaction => {
    seq += 1;
    return {
      id: `t${seq}`,
      userId: "u",
      type: "expense",
      status: "posted",
      amountCents: 100,
      currency: "USD",
      description: payee,
      merchantName: null,
      categoryId,
      accountId: null,
      transactionDate: "2026-01-10",
      postedAt: null,
      source: "manual",
      externalTransactionId: null,
      recurringRuleId: null,
      transferGroupId: null,
      parentTransactionId: null,
      isExcludedFromBudget: false,
      userNote: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
      deletedAt: null,
      ...overrides,
    };
  };

  it("suggests a rule at ≥3 identical categorizations, labeled as suggestion", () => {
    const txs = [
      mtx("Whole Foods", "groceries"),
      mtx("whole foods", "groceries"),
      mtx("WHOLE FOODS", "groceries"),
    ];
    const { suggestions, conflicts } = suggestRulesFromHistory(txs);
    expect(conflicts).toEqual([]);
    expect(suggestions).toEqual([
      {
        matchType: "payee_exact",
        pattern: "whole foods",
        categoryId: "groceries",
        occurrences: 3,
        isSuggestion: true,
      },
    ]);
  });

  it("does not suggest below the threshold", () => {
    const { suggestions } = suggestRulesFromHistory([mtx("cafe", "dining"), mtx("cafe", "dining")]);
    expect(suggestions).toEqual([]);
  });

  it("reports conflicts instead of majority-voting", () => {
    const txs = [
      mtx("market", "groceries"),
      mtx("market", "groceries"),
      mtx("market", "dining"),
    ];
    const { suggestions, conflicts } = suggestRulesFromHistory(txs);
    expect(suggestions).toEqual([]);
    expect(conflicts).toEqual([
      { pattern: "market", categoryCounts: { groceries: 2, dining: 1 } },
    ]);
  });

  it("ignores plaid-sourced, pending, voided, deleted, and uncategorized rows", () => {
    const txs = [
      mtx("cafe", "dining", { source: "plaid" }),
      mtx("cafe", "dining", { status: "pending" }),
      mtx("cafe", "dining", { status: "voided" }),
      mtx("cafe", "dining", { deletedAt: "2026-01-02T00:00:00Z" }),
      mtx("cafe", null),
      mtx("cafe", "dining"),
    ];
    const { suggestions } = suggestRulesFromHistory(txs);
    expect(suggestions).toEqual([]); // only 1 qualifying row
  });

  it("uses merchantName over description when present", () => {
    const txs = [
      mtx("ignored", "dining", { merchantName: "Real Cafe" }),
      mtx("ignored", "dining", { merchantName: "real cafe" }),
      mtx("ignored", "dining", { merchantName: "REAL CAFE" }),
    ];
    const { suggestions } = suggestRulesFromHistory(txs);
    expect(suggestions[0]!.pattern).toBe("real cafe");
  });

  it("respects a custom threshold", () => {
    const txs = [mtx("gym", "personal"), mtx("gym", "personal")];
    expect(suggestRulesFromHistory(txs, 2).suggestions).toHaveLength(1);
  });
});
