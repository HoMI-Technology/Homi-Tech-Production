import { describe, expect, it } from "vitest";
import {
  buildCategoryTrends,
  buildMonthlyReport,
  csvEscape,
  exportTransactionsCsv,
  formatCsvAmount,
  gradeCompleteness,
} from "@/lib/finance/reports";
import type { FinanceCategory, FinanceTransaction } from "@/lib/finance/ledger";

let seq = 0;
function tx(overrides: Partial<FinanceTransaction>): FinanceTransaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    userId: "u1",
    type: "expense",
    status: "posted",
    amountCents: 1000,
    currency: "USD",
    description: "d",
    merchantName: null,
    categoryId: null,
    accountId: null,
    transactionDate: "2026-01-15",
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
}

const cat = (id: string, name: string): FinanceCategory => ({
  id,
  userId: null,
  name,
  slug: id,
  categoryType: "expense",
  essentiality: "flexible",
  parentCategoryId: null,
  isSystem: true,
  isArchived: false,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

const P1 = { id: "p1", periodStart: "2026-01-01", periodEnd: "2026-01-31" };
const P2 = { id: "p2", periodStart: "2026-02-01", periodEnd: "2026-02-28" };

describe("buildMonthlyReport", () => {
  it("is honest-empty with zero periods", () => {
    const report = buildMonthlyReport([], new Map(), []);
    expect(report.hasData).toBe(false);
    expect(report.periods).toEqual([]);
    expect(report.completeness).toBe("empty");
  });

  it("computes income, spend, net, savings rate per period", () => {
    const txs = [
      tx({ type: "income", amountCents: 500000, transactionDate: "2026-01-05" }),
      tx({ amountCents: 200000, categoryId: "groceries", transactionDate: "2026-01-10" }),
      tx({ type: "refund", amountCents: 5000, categoryId: "groceries", transactionDate: "2026-01-12" }),
    ];
    const report = buildMonthlyReport([P1], new Map([[P1.id, txs]]), [cat("groceries", "Groceries")]);
    expect(report.hasData).toBe(true);
    const p = report.periods[0]!;
    expect(p.incomeCents).toBe(500000);
    expect(p.netExpenseCents).toBe(195000);
    expect(p.netCents).toBe(305000);
    expect(p.savingsRate).toBeCloseTo(305000 / 500000);
  });

  it("returns null savings rate when income is zero", () => {
    const report = buildMonthlyReport([P1], new Map([[P1.id, [tx({})]]]), []);
    expect(report.periods[0]!.savingsRate).toBeNull();
  });

  it("excludes pending, voided, deleted, excluded, transfers from totals", () => {
    const txs = [
      tx({ amountCents: 100, status: "pending" }),
      tx({ amountCents: 100, status: "voided" }),
      tx({ amountCents: 100, deletedAt: "2026-01-02T00:00:00Z" }),
      tx({ amountCents: 100, isExcludedFromBudget: true }),
      tx({ amountCents: 100, type: "transfer" }),
      tx({ amountCents: 300, categoryId: "dining" }),
    ];
    const report = buildMonthlyReport([P1], new Map([[P1.id, txs]]), []);
    expect(report.periods[0]!.netExpenseCents).toBe(300);
    expect(report.periods[0]!.pendingCount).toBe(1);
  });

  it("computes top categories with MoM deltas, sorted by current spend", () => {
    const jan = [
      tx({ amountCents: 10000, categoryId: "dining", transactionDate: "2026-01-10" }),
      tx({ amountCents: 40000, categoryId: "groceries", transactionDate: "2026-01-11" }),
    ];
    const feb = [
      tx({ amountCents: 25000, categoryId: "dining", transactionDate: "2026-02-10" }),
      tx({ amountCents: 30000, categoryId: "groceries", transactionDate: "2026-02-11" }),
      tx({ amountCents: 9000, categoryId: "travel", transactionDate: "2026-02-12" }),
    ];
    const report = buildMonthlyReport(
      [P2, P1], // deliberately unsorted
      new Map([
        [P1.id, jan],
        [P2.id, feb],
      ]),
      [cat("dining", "Dining"), cat("groceries", "Groceries"), cat("travel", "Travel")],
    );
    expect(report.periods[0]!.periodId).toBe("p1");
    const top = report.topCategories;
    expect(top.map((t) => t.categoryId)).toEqual(["groceries", "dining", "travel"]);
    expect(top[0]).toMatchObject({ currentCents: 30000, previousCents: 40000, deltaCents: -10000 });
    expect(top[1]).toMatchObject({ deltaCents: 15000 });
    expect(top[2]).toMatchObject({ previousCents: 0, deltaCents: 9000 });
  });

  it("first period has null previousCents/deltaCents", () => {
    const report = buildMonthlyReport(
      [P1],
      new Map([[P1.id, [tx({ amountCents: 500, categoryId: "dining" })]]]),
      [],
    );
    expect(report.topCategories[0]!.previousCents).toBeNull();
    expect(report.topCategories[0]!.deltaCents).toBeNull();
  });

  it("grades completeness with uncategorized/pending disclosure", () => {
    const txs = [
      tx({ categoryId: "dining" }),
      tx({ categoryId: null }), // uncategorized posted
      tx({ status: "pending" }),
    ];
    const report = buildMonthlyReport([P1], new Map([[P1.id, txs]]), []);
    expect(report.uncategorizedCount).toBe(1);
    expect(report.pendingCount).toBe(1);
    expect(["partial", "mostly_complete"]).toContain(report.completeness);
  });
});

describe("gradeCompleteness", () => {
  it("grades empty/partial/complete", () => {
    expect(gradeCompleteness({ periodCount: 0, uncategorizedCount: 0, pendingCount: 0, postedCount: 0 })).toBe("empty");
    expect(gradeCompleteness({ periodCount: 2, uncategorizedCount: 0, pendingCount: 0, postedCount: 5 })).toBe("complete");
    expect(gradeCompleteness({ periodCount: 2, uncategorizedCount: 1, pendingCount: 0, postedCount: 100 })).toBe("mostly_complete");
    expect(gradeCompleteness({ periodCount: 2, uncategorizedCount: 5, pendingCount: 5, postedCount: 10 })).toBe("partial");
  });
});

describe("buildCategoryTrends", () => {
  it("buckets monthly cents per category with MoM and 3-month average", () => {
    const txs = [
      tx({ amountCents: 10000, categoryId: "dining", transactionDate: "2026-01-05" }),
      tx({ amountCents: 20000, categoryId: "dining", transactionDate: "2026-02-05" }),
      tx({ amountCents: 30000, categoryId: "dining", transactionDate: "2026-03-05" }),
      tx({ type: "refund", amountCents: 5000, categoryId: "dining", transactionDate: "2026-03-06" }),
    ];
    const trends = buildCategoryTrends(txs, [cat("dining", "Dining")], ["2026-03", "2026-01", "2026-02"]);
    const dining = trends.find((t) => t.categoryId === "dining")!;
    expect(dining.points.map((p) => p.amountCents)).toEqual([10000, 20000, 25000]);
    expect(dining.points.map((p) => p.month)).toEqual(["2026-01", "2026-02", "2026-03"]);
    expect(dining.momChangeCents).toBe(5000);
    expect(dining.threeMonthAverageCents).toBe(Math.round(55000 / 3));
  });

  it("excludes pending/voided/deleted/excluded rows and out-of-window months", () => {
    const txs = [
      tx({ amountCents: 100, categoryId: "dining", status: "pending" }),
      tx({ amountCents: 100, categoryId: "dining", status: "voided" }),
      tx({ amountCents: 100, categoryId: "dining", deletedAt: "2026-01-01T00:00:00Z" }),
      tx({ amountCents: 100, categoryId: "dining", isExcludedFromBudget: true }),
      tx({ amountCents: 100, categoryId: "dining", transactionDate: "2025-12-31" }),
      tx({ amountCents: 700, categoryId: "dining", transactionDate: "2026-01-15" }),
    ];
    const trends = buildCategoryTrends(txs, [], ["2026-01"]);
    expect(trends[0]!.points[0]!.amountCents).toBe(700);
    expect(trends[0]!.momChangeCents).toBeNull();
    expect(trends[0]!.threeMonthAverageCents).toBeNull();
  });

  it("groups uncategorized spend under its own row", () => {
    const trends = buildCategoryTrends([tx({ amountCents: 42 })], [], ["2026-01"]);
    expect(trends[0]!.categoryId).toBe("uncategorized");
    expect(trends[0]!.categoryName).toBe("Uncategorized");
  });

  it("returns empty when nothing qualifies", () => {
    expect(buildCategoryTrends([tx({ type: "transfer" })], [], ["2026-01"])).toEqual([]);
  });
});

describe("csvEscape / formatCsvAmount", () => {
  it("quotes commas, quotes, newlines and doubles embedded quotes", () => {
    expect(csvEscape("plain")).toBe("plain");
    expect(csvEscape("a,b")).toBe('"a,b"');
    expect(csvEscape('she said "hi"')).toBe('"she said ""hi"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    expect(csvEscape("carriage\rreturn")).toBe('"carriage\rreturn"');
    expect(csvEscape("")).toBe("");
  });

  it("formats cents as fixed two-decimal dollars with sign", () => {
    expect(formatCsvAmount(123456)).toBe("1234.56");
    expect(formatCsvAmount(-900)).toBe("-9.00");
    expect(formatCsvAmount(5)).toBe("0.05");
    expect(formatCsvAmount(0)).toBe("0.00");
  });
});

describe("exportTransactionsCsv", () => {
  it("emits header plus sorted rows with signed amounts", () => {
    const csv = exportTransactionsCsv(
      [
        tx({ id: "b", amountCents: 2500, type: "expense", transactionDate: "2026-01-10", merchantName: "Cafe, Inc." }),
        tx({ id: "a", amountCents: 100000, type: "income", transactionDate: "2026-01-05", description: "Payroll" }),
        tx({ id: "c", amountCents: 300, type: "refund", transactionDate: "2026-01-11", categoryId: "dining" }),
      ],
      [cat("dining", "Dining")],
    );
    const lines = csv.split("\n");
    expect(lines[0]).toBe("date,payee,category,type,amount,status,source");
    expect(lines[1]).toBe("2026-01-05,Payroll,,income,1000.00,posted,manual");
    expect(lines[2]).toBe('2026-01-10,"Cafe, Inc.",,expense,-25.00,posted,manual');
    expect(lines[3]).toBe("2026-01-11,d,Dining,refund,3.00,posted,manual");
    expect(csv.endsWith("\n")).toBe(true);
  });

  it("excludes soft-deleted rows, keeps pending/voided disclosed", () => {
    const csv = exportTransactionsCsv(
      [
        tx({ id: "x", deletedAt: "2026-01-02T00:00:00Z" }),
        tx({ id: "y", status: "pending" }),
        tx({ id: "z", status: "voided" }),
      ],
      [],
    );
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3); // header + pending + voided
    expect(lines[1]).toContain(",pending,");
    expect(lines[2]).toContain(",voided,");
  });

  it("escapes payee fields containing quotes and newlines", () => {
    const csv = exportTransactionsCsv(
      [tx({ id: "q", merchantName: 'Joe "Big"\nDiner', transactionDate: "2026-01-03" })],
      [],
    );
    expect(csv).toContain('"Joe ""Big""\nDiner"');
  });
});
