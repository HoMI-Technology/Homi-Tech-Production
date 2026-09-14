import { describe, expect, it } from "vitest";
import {
  cadenceMonthlyMultiplier,
  forecastCashFlow,
  monthlyRuleTotalCents,
  safeToSpendCents,
  type ForecastInput,
} from "@/lib/finance/forecast";
import type { RecurringTransactionRule } from "@/lib/finance/ledger";

function rule(overrides: Partial<RecurringTransactionRule>): RecurringTransactionRule {
  return {
    id: "rule-1",
    userId: "user-1",
    type: "expense",
    amountCents: 10_000,
    description: "Rent",
    categoryId: null,
    cadence: "monthly",
    startDate: "2026-01-01",
    nextOccurrenceDate: "2026-01-01",
    endDate: null,
    generationMode: "forecast_only",
    isActive: true,
    detectionSource: "manual",
    detectionConfidence: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    deletedAt: null,
    ...overrides,
  };
}

function input(overrides: Partial<ForecastInput>): ForecastInput {
  return {
    startingBalanceCents: 100_000,
    recurringRules: [],
    trailingAverages: {
      avgMonthlyIncomeCents: null,
      avgMonthlyExpenseCents: null,
      monthsWithData: 0,
    },
    horizonDays: 31,
    asOfDate: "2026-01-01",
    ...overrides,
  };
}

describe("forecastCashFlow — known rules produce a known series", () => {
  it("applies rule occurrences on their exact dates", () => {
    const rent = rule({ id: "rent", amountCents: 200_000, startDate: "2026-01-05" });
    const pay = rule({
      id: "pay",
      type: "income",
      amountCents: 300_000,
      startDate: "2026-01-15",
    });
    const result = forecastCashFlow(
      input({ startingBalanceCents: 50_000, recurringRules: [rent, pay], horizonDays: 20 }),
    );
    expect(result.series).not.toBeNull();
    const byDate = new Map(result.series!.map((d) => [d.date, d.balanceCents]));
    expect(byDate.get("2026-01-01")).toBe(50_000);
    expect(byDate.get("2026-01-05")).toBe(-150_000);
    expect(byDate.get("2026-01-15")).toBe(150_000);
    expect(byDate.get("2026-01-20")).toBe(150_000);
  });

  it("reports the lowest projected balance and its date", () => {
    const rent = rule({ id: "rent", amountCents: 80_000, startDate: "2026-01-10" });
    const result = forecastCashFlow(
      input({ startingBalanceCents: 100_000, recurringRules: [rent], horizonDays: 10 }),
    );
    expect(result.lowestBalanceCents).toBe(20_000);
    expect(result.lowestBalanceDate).toBe("2026-01-10");
  });

  it("daysUntilNegative is the first negative day, or null when never negative", () => {
    const big = rule({ id: "big", amountCents: 150_000, startDate: "2026-01-07" });
    const goesNegative = forecastCashFlow(
      input({ startingBalanceCents: 100_000, recurringRules: [big], horizonDays: 31 }),
    );
    expect(goesNegative.daysUntilNegative).toBe(6);

    const neverNegative = forecastCashFlow(
      input({ startingBalanceCents: 1_000_000, recurringRules: [big], horizonDays: 31 }),
    );
    expect(neverNegative.daysUntilNegative).toBeNull();
  });

  it("inactive and soft-deleted rules never enter the projection", () => {
    const dead = rule({ id: "dead", isActive: false });
    const deleted = rule({ id: "gone", deletedAt: "2026-01-01T00:00:00.000Z" });
    const result = forecastCashFlow(
      input({ recurringRules: [dead, deleted], horizonDays: 10 }),
    );
    expect(result.items).toEqual([]);
    expect(result.rulesUsed).toBe(0);
  });
});

describe("forecastCashFlow — baseline estimates", () => {
  it("adds weekly baseline items labeled as estimates from trailing averages", () => {
    const result = forecastCashFlow(
      input({
        trailingAverages: {
          avgMonthlyIncomeCents: null,
          avgMonthlyExpenseCents: 52_000,
          monthsWithData: 3,
        },
        horizonDays: 14,
      }),
    );
    const estimates = result.items.filter((i) => i.source === "estimate");
    expect(estimates.length).toBe(2); // two weekly buckets
    expect(estimates[0].amountCents).toBe(12_000); // 52000*12/52
    expect(estimates.every((i) => i.ruleId === null)).toBe(true);
  });

  it("subtracts rule-covered spend from the baseline (no double counting), floored at 0", () => {
    const rent = rule({ id: "rent", amountCents: 40_000, cadence: "monthly" });
    const result = forecastCashFlow(
      input({
        recurringRules: [rent],
        trailingAverages: {
          avgMonthlyIncomeCents: null,
          avgMonthlyExpenseCents: 50_000,
          monthsWithData: 3,
        },
        horizonDays: 8,
      }),
    );
    const estimate = result.items.find((i) => i.source === "estimate");
    // baseline monthly = 50000 - 40000 = 10000 → weekly round(10000*12/52) = 2308
    expect(estimate?.amountCents).toBe(2_308);

    const overcovered = forecastCashFlow(
      input({
        recurringRules: [rule({ id: "rent", amountCents: 60_000 })],
        trailingAverages: {
          avgMonthlyIncomeCents: null,
          avgMonthlyExpenseCents: 50_000,
          monthsWithData: 3,
        },
        horizonDays: 8,
      }),
    );
    expect(overcovered.items.filter((i) => i.source === "estimate")).toEqual([]);
  });

  it("null starting balance yields honest nulls, but items still list", () => {
    const rent = rule({ id: "rent", startDate: "2026-01-05" });
    const result = forecastCashFlow(
      input({ startingBalanceCents: null, recurringRules: [rent] }),
    );
    expect(result.series).toBeNull();
    expect(result.lowestBalanceCents).toBeNull();
    expect(result.daysUntilNegative).toBeNull();
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("empty input produces an empty honest projection, not zeros-as-data", () => {
    const result = forecastCashFlow(input({ startingBalanceCents: null }));
    expect(result.series).toBeNull();
    expect(result.items).toEqual([]);
    expect(result.completeness).toBe("low");
  });
});

describe("forecastCashFlow — completeness grading + disclaimer", () => {
  it("grades high with 3+ months of history and ≥50% rule coverage", () => {
    const rent = rule({ id: "rent", amountCents: 60_000 });
    const result = forecastCashFlow(
      input({
        recurringRules: [rent],
        trailingAverages: {
          avgMonthlyIncomeCents: 200_000,
          avgMonthlyExpenseCents: 100_000,
          monthsWithData: 3,
        },
      }),
    );
    expect(result.completeness).toBe("high");
  });

  it("grades medium with some history but thin coverage", () => {
    const result = forecastCashFlow(
      input({
        trailingAverages: {
          avgMonthlyIncomeCents: null,
          avgMonthlyExpenseCents: 100_000,
          monthsWithData: 2,
        },
      }),
    );
    expect(result.completeness).toBe("medium");
  });

  it("grades low with no history and no rules", () => {
    expect(forecastCashFlow(input({})).completeness).toBe("low");
  });

  it("disclosure names rule count and months of history", () => {
    const rent = rule({ id: "rent" });
    const result = forecastCashFlow(
      input({
        recurringRules: [rent],
        trailingAverages: {
          avgMonthlyIncomeCents: null,
          avgMonthlyExpenseCents: null,
          monthsWithData: 2,
        },
      }),
    );
    expect(result.disclaimer).toContain("1 recurring rule");
    expect(result.disclaimer).toContain("2 months of recorded history");
  });

  it("no advice language in the disclaimer", () => {
    const result = forecastCashFlow(input({}));
    expect(result.disclaimer).not.toMatch(/you should|recommend|guaranteed/i);
  });
});

describe("monthlyRuleTotalCents / cadenceMonthlyMultiplier", () => {
  it("normalizes every cadence to a monthly figure", () => {
    expect(cadenceMonthlyMultiplier("weekly")).toBeCloseTo(52 / 12);
    expect(cadenceMonthlyMultiplier("biweekly")).toBeCloseTo(26 / 12);
    expect(cadenceMonthlyMultiplier("semimonthly")).toBe(2);
    expect(cadenceMonthlyMultiplier("monthly")).toBe(1);
    expect(cadenceMonthlyMultiplier("quarterly")).toBeCloseTo(1 / 3);
    expect(cadenceMonthlyMultiplier("annual")).toBeCloseTo(1 / 12);
  });

  it("sums integer cents per type, skipping inactive rules", () => {
    const rules = [
      rule({ id: "a", amountCents: 10_000, cadence: "semimonthly" }),
      rule({ id: "b", amountCents: 30_000, cadence: "quarterly" }),
      rule({ id: "c", type: "income", amountCents: 50_000 }),
      rule({ id: "d", amountCents: 99_000, isActive: false }),
    ];
    expect(monthlyRuleTotalCents(rules, "expense")).toBe(30_000);
    expect(monthlyRuleTotalCents(rules, "income")).toBe(50_000);
  });
});

describe("safeToSpendCents", () => {
  it("readyToAssign minus obligations minus buffer, integer cents", () => {
    expect(safeToSpendCents(100_000, [20_000, 30_000], 10_000)).toBe(40_000);
  });

  it("floors at zero instead of going negative", () => {
    expect(safeToSpendCents(10_000, [50_000], 10_000)).toBe(0);
  });

  it("returns null when inputs are insufficient (no false precision)", () => {
    expect(safeToSpendCents(100_000, null, 0)).toBeNull();
    expect(safeToSpendCents(1.5, [100], 0)).toBeNull();
    expect(safeToSpendCents(100_000, [100], -1)).toBeNull();
    expect(safeToSpendCents(100_000, [1.5], 0)).toBeNull();
  });

  it("a known over-assigned (negative) readyToAssign is 0, not null", () => {
    expect(safeToSpendCents(-5_000, [], 0)).toBe(0);
  });

  it("empty obligations list is a valid zero", () => {
    expect(safeToSpendCents(50_000, [], 5_000)).toBe(45_000);
  });
});
