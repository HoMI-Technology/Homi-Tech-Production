import { describe, it, expect } from "vitest";
import {
  dollarsToCents,
  centsToDollars,
  sumCents,
  formatCentsUSD,
  isValidCents,
} from "@/lib/finance/money";
import {
  summarizePeriod,
  categoryActuals,
  runwayFromOutflow,
  projectGoal,
  isInPeriod,
} from "@/lib/finance/calculations";
import { gradeCompleteness, buildReadinessSnapshot } from "@/lib/finance/readiness-snapshot";
import type { FinanceTransaction } from "@/lib/finance/ledger";

const AUGUST = {
  periodStart: "2026-08-01",
  periodEnd: "2026-08-31",
  goalReserveCents: 0,
};

let seq = 0;
function tx(overrides: Partial<FinanceTransaction>): FinanceTransaction {
  seq += 1;
  return {
    id: `tx-${seq}`,
    userId: "user-1",
    type: "expense",
    status: "posted",
    amountCents: 10_00,
    currency: "USD",
    description: "test",
    merchantName: null,
    categoryId: "cat-groceries",
    accountId: null,
    transactionDate: "2026-08-15",
    postedAt: null,
    source: "manual",
    externalTransactionId: null,
    recurringRuleId: null,
    transferGroupId: null,
    parentTransactionId: null,
    isExcludedFromBudget: false,
    userNote: null,
    createdAt: "2026-08-15T00:00:00.000Z",
    updatedAt: "2026-08-15T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

describe("money helpers", () => {
  it("converts dollars to integer cents with half-up rounding", () => {
    expect(dollarsToCents(6500)).toBe(650_000);
    expect(dollarsToCents(146.32)).toBe(14_632);
    expect(dollarsToCents(0.005)).toBe(1);
    expect(centsToDollars(650_000)).toBe(6500);
  });

  it("rejects non-finite and out-of-range dollars", () => {
    expect(() => dollarsToCents(Number.NaN)).toThrow(RangeError);
    expect(() => dollarsToCents(Infinity)).toThrow(RangeError);
    expect(() => dollarsToCents(1e12)).toThrow(RangeError);
  });

  it("sums cents and fails loudly on fractional input", () => {
    expect(sumCents([100, 250, 1])).toBe(351);
    expect(sumCents([])).toBe(0);
    expect(() => sumCents([100, 0.5])).toThrow(RangeError);
  });

  it("formats whole and fractional amounts", () => {
    expect(formatCentsUSD(650_000)).toBe("$6,500");
    expect(formatCentsUSD(14_632)).toBe("$146.32");
    expect(formatCentsUSD(650_000, { alwaysCents: true })).toBe("$6,500.00");
    expect(formatCentsUSD(-4_000)).toBe("−$40");
  });

  it("validates cents range", () => {
    expect(isValidCents(0)).toBe(true);
    expect(isValidCents(10_000_000_000)).toBe(true);
    expect(isValidCents(10_000_000_001)).toBe(false);
    expect(isValidCents(1.5)).toBe(false);
  });
});

describe("summarizePeriod", () => {
  it("returns all zeros with no data", () => {
    const totals = summarizePeriod([], AUGUST);
    expect(totals.incomeCents).toBe(0);
    expect(totals.netExpenseCents).toBe(0);
    expect(totals.cashRemainingCents).toBe(0);
    expect(totals.freeCashCents).toBe(0);
  });

  it("handles income only", () => {
    const totals = summarizePeriod(
      [tx({ type: "income", amountCents: 650_000, categoryId: "cat-payroll" })],
      AUGUST,
    );
    expect(totals.incomeCents).toBe(650_000);
    expect(totals.cashRemainingCents).toBe(650_000);
  });

  it("handles expenses only (negative cash remaining)", () => {
    const totals = summarizePeriod([tx({ amountCents: 42_000 })], AUGUST);
    expect(totals.incomeCents).toBe(0);
    expect(totals.netExpenseCents).toBe(42_000);
    expect(totals.cashRemainingCents).toBe(-42_000);
  });

  it("nets refunds against gross spending", () => {
    const totals = summarizePeriod(
      [tx({ amountCents: 100_00 }), tx({ type: "refund", amountCents: 30_00 })],
      AUGUST,
    );
    expect(totals.grossExpenseCents).toBe(100_00);
    expect(totals.refundCents).toBe(30_00);
    expect(totals.netExpenseCents).toBe(70_00);
  });

  it("excludes transfers and adjustments from income and spending", () => {
    const totals = summarizePeriod(
      [
        tx({ type: "transfer", amountCents: 50_000, categoryId: null }),
        tx({ type: "adjustment", amountCents: 12_345, categoryId: null }),
      ],
      AUGUST,
    );
    expect(totals.incomeCents).toBe(0);
    expect(totals.netExpenseCents).toBe(0);
  });

  it("excludes pending, voided, deleted, and budget-excluded rows", () => {
    const totals = summarizePeriod(
      [
        tx({ status: "pending", amountCents: 11_00 }),
        tx({ status: "voided", amountCents: 22_00 }),
        tx({ deletedAt: "2026-08-16T00:00:00.000Z", amountCents: 33_00 }),
        tx({ isExcludedFromBudget: true, amountCents: 44_00 }),
        tx({ amountCents: 55_00 }),
      ],
      AUGUST,
    );
    expect(totals.netExpenseCents).toBe(55_00);
    expect(totals.pendingCount).toBe(1);
  });

  it("excludes transactions outside the period, inclusive of boundaries", () => {
    const july31 = tx({ transactionDate: "2026-07-31", amountCents: 1_00 });
    const aug1 = tx({ transactionDate: "2026-08-01", amountCents: 2_00 });
    const aug31 = tx({ transactionDate: "2026-08-31", amountCents: 4_00 });
    const sep1 = tx({ transactionDate: "2026-09-01", amountCents: 8_00 });
    const totals = summarizePeriod([july31, aug1, aug31, sep1], AUGUST);
    expect(totals.netExpenseCents).toBe(6_00);
    expect(isInPeriod(july31, AUGUST)).toBe(false);
    expect(isInPeriod(aug1, AUGUST)).toBe(true);
  });

  it("subtracts the goal reserve from free cash but not from spending", () => {
    const totals = summarizePeriod(
      [
        tx({ type: "income", amountCents: 650_000, categoryId: "cat-payroll" }),
        tx({ amountCents: 418_000 }),
      ],
      { ...AUGUST, goalReserveCents: 150_000 },
    );
    expect(totals.netExpenseCents).toBe(418_000);
    expect(totals.cashRemainingCents).toBe(232_000);
    expect(totals.freeCashCents).toBe(82_000);
  });

  it("lets free cash go negative when the reserve exceeds cash remaining", () => {
    const totals = summarizePeriod(
      [tx({ type: "income", amountCents: 100_000, categoryId: "cat-payroll" })],
      { ...AUGUST, goalReserveCents: 150_000 },
    );
    expect(totals.freeCashCents).toBe(-50_000);
  });

  it("counts uncategorized spending", () => {
    const totals = summarizePeriod(
      [tx({ categoryId: null }), tx({ categoryId: "cat-groceries" })],
      AUGUST,
    );
    expect(totals.uncategorizedCount).toBe(1);
  });
});

describe("categoryActuals", () => {
  it("joins actuals against plans, keeping zero-spend planned rows", () => {
    const rows = categoryActuals([tx({ categoryId: "cat-food", amountCents: 72_000 })], AUGUST, [
      { categoryId: "cat-food", plannedCents: 65_000 },
      { categoryId: "cat-housing", plannedCents: 180_000 },
    ]);
    const food = rows.find((r) => r.categoryId === "cat-food");
    const housing = rows.find((r) => r.categoryId === "cat-housing");
    expect(food?.remainingCents).toBe(-7_000);
    expect(food?.utilization).toBeCloseTo(72_000 / 65_000);
    expect(housing?.actualCents).toBe(0);
    expect(housing?.remainingCents).toBe(180_000);
  });

  it("returns null utilization for a zero-planned category with spending", () => {
    const rows = categoryActuals([tx({ categoryId: "cat-dining", amountCents: 5_000 })], AUGUST, [
      { categoryId: "cat-dining", plannedCents: 0 },
    ]);
    expect(rows[0].utilization).toBeNull();
    expect(rows[0].remainingCents).toBe(-5_000);
  });

  it("groups uncategorized spending into a null-key row without a plan", () => {
    const rows = categoryActuals([tx({ categoryId: null })], AUGUST, []);
    expect(rows).toHaveLength(1);
    expect(rows[0].categoryId).toBeNull();
    expect(rows[0].plannedCents).toBeNull();
  });

  it("can produce a net-negative category when refunds exceed expenses", () => {
    const rows = categoryActuals(
      [
        tx({ categoryId: "cat-travel", amountCents: 10_00 }),
        tx({ type: "refund", categoryId: "cat-travel", amountCents: 50_00 }),
      ],
      AUGUST,
      [],
    );
    expect(rows[0].actualCents).toBe(-40_00);
  });
});

describe("runwayFromOutflow", () => {
  it("divides savings by outflow and names the basis", () => {
    const result = runwayFromOutflow(1_800_000, 485_000, "trailing_three_month_average");
    expect(result.months).toBeCloseTo(3.711, 2);
    expect(result.basis).toBe("trailing_three_month_average");
  });

  it("returns null months on zero outflow instead of Infinity", () => {
    expect(runwayFromOutflow(1_800_000, 0, "current_month_actual").months).toBeNull();
  });
});

describe("projectGoal", () => {
  it("projects months to target at the planned pace", () => {
    const projection = projectGoal(
      {
        targetAmountCents: 1_000_000,
        currentAmountCents: 250_000,
        plannedMonthlyContributionCents: 100_000,
        targetDate: null,
      },
      "2026-08-02",
    );
    expect(projection.remainingCents).toBe(750_000);
    expect(projection.monthsToTarget).toBe(8);
  });

  it("computes the required monthly contribution for a target date", () => {
    const projection = projectGoal(
      {
        targetAmountCents: 1_000_000,
        currentAmountCents: 400_000,
        plannedMonthlyContributionCents: 0,
        targetDate: "2027-06-15",
      },
      "2026-08-02",
    );
    // 10 whole months from 2026-08 to 2027-06 → ceil(600000 / 10)
    expect(projection.requiredMonthlyCents).toBe(60_000);
    expect(projection.monthsToTarget).toBeNull();
  });

  it("treats an overfunded goal as reached, never negative", () => {
    const projection = projectGoal(
      {
        targetAmountCents: 500_000,
        currentAmountCents: 620_000,
        plannedMonthlyContributionCents: 50_000,
        targetDate: "2027-01-01",
      },
      "2026-08-02",
    );
    expect(projection.remainingCents).toBe(0);
    expect(projection.monthsToTarget).toBe(0);
    expect(projection.requiredMonthlyCents).toBe(0);
  });

  it("returns null required contribution when the target date has passed", () => {
    const projection = projectGoal(
      {
        targetAmountCents: 500_000,
        currentAmountCents: 0,
        plannedMonthlyContributionCents: 0,
        targetDate: "2026-08-01",
      },
      "2026-08-02",
    );
    expect(projection.requiredMonthlyCents).toBeNull();
  });
});

describe("readiness snapshot", () => {
  it("grades sparse manual data as low completeness", () => {
    expect(
      gradeCompleteness({
        monthsWithData: 1,
        uncategorizedCount: 3,
        expectedRecurringItemsMissing: 2,
        sourceMode: "manual",
      }),
    ).toBe("low");
  });

  it("grades reviewed multi-month linked data as high", () => {
    expect(
      gradeCompleteness({
        monthsWithData: 6,
        uncategorizedCount: 0,
        expectedRecurringItemsMissing: 0,
        sourceMode: "linked",
      }),
    ).toBe("high");
  });

  it("nulls rate fields when there is no income, instead of reporting 0%", () => {
    const snapshot = buildReadinessSnapshot({
      period: "2026-08",
      totals: summarizePeriod([tx({ amountCents: 10_00 })], AUGUST),
      expectedIncomeCents: null,
      requiredExpenseCents: 10_00,
      flexibleExpenseCents: 0,
      monthlyDebtPaymentsCents: 65_000,
      runwayMonths: null,
      activeGoal: null,
      completeness: "low",
      calculatedAt: "2026-08-02T00:00:00.000Z",
    });
    expect(snapshot.savingsRatePct).toBeNull();
    expect(snapshot.debtToIncomePct).toBeNull();
  });

  it("carries facts through without inventing a verdict", () => {
    const totals = summarizePeriod(
      [
        tx({ type: "income", amountCents: 650_000, categoryId: "cat-payroll" }),
        tx({ amountCents: 418_000 }),
      ],
      { ...AUGUST, goalReserveCents: 150_000 },
    );
    const snapshot = buildReadinessSnapshot({
      period: "2026-08",
      totals,
      expectedIncomeCents: 650_000,
      requiredExpenseCents: 300_000,
      flexibleExpenseCents: 118_000,
      monthlyDebtPaymentsCents: 65_000,
      runwayMonths: 3.8,
      activeGoal: {
        targetAmountCents: 1_000_000,
        requiredMonthlyCents: 124_000,
        actualMonthlyCents: 82_000,
      },
      completeness: "medium",
      calculatedAt: "2026-08-02T00:00:00.000Z",
    });
    expect(snapshot.freeCashCents).toBe(82_000);
    expect(snapshot.savingsRatePct).toBeCloseTo(35.7, 1);
    expect(snapshot.debtToIncomePct).toBeCloseTo(10, 5);
    expect(snapshot.activeGoalMonthlyNeedCents).toBe(124_000);
    // The snapshot is facts only — no verdict field exists to leak scoring.
    expect("verdict" in snapshot).toBe(false);
  });
});
