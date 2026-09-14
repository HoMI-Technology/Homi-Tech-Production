import { describe, expect, it } from "vitest";
import { computeBudgetAlerts, type BudgetAlertInput } from "@/lib/finance/alerts";
import type { EnvelopeCategoryState } from "@/lib/finance/envelope";
import type { RecurringTransactionRule } from "@/lib/finance/ledger";
import { forecastCashFlow } from "@/lib/finance/forecast";

function envelopeState(overrides: Partial<EnvelopeCategoryState>): EnvelopeCategoryState {
  return {
    categoryId: "cat-dining",
    assignedCents: 20_000,
    activityCents: 0,
    rolloverAppliedCents: 0,
    availableCents: 20_000,
    overspent: false,
    overspentCents: 0,
    utilization: 0,
    ...overrides,
  };
}

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

function input(overrides: Partial<BudgetAlertInput>): BudgetAlertInput {
  return {
    period: { id: "period-jan", periodStart: "2026-01-01", periodEnd: "2026-01-31" },
    envelopeState: [],
    recurringRules: [],
    forecast: null,
    runway: null,
    uncategorizedCount: 0,
    asOfDate: "2026-01-10",
    ...overrides,
  };
}

describe("computeBudgetAlerts — overspend", () => {
  it("flags an overspent envelope with its magnitude and a stable dedupe key", () => {
    const alerts = computeBudgetAlerts(
      input({
        envelopeState: [
          envelopeState({
            categoryId: "cat-dining",
            activityCents: 27_500,
            availableCents: -7_500,
            overspent: true,
            overspentCents: 7_500,
          }),
        ],
        categoryNames: new Map([["cat-dining", "Dining"]]),
      }),
    );
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe("overspend");
    expect(alerts[0].severity).toBe("amber");
    expect(alerts[0].categoryId).toBe("cat-dining");
    expect(alerts[0].amountCents).toBe(7_500);
    expect(alerts[0].dedupeKey).toBe("overspend:period-jan:cat-dining");
    expect(alerts[0].message).toContain("Dining");
    expect(alerts[0].message).toContain("$75");
  });

  it("does not flag envelopes at exactly zero available", () => {
    const alerts = computeBudgetAlerts(
      input({ envelopeState: [envelopeState({ activityCents: 20_000, availableCents: 0 })] }),
    );
    expect(alerts).toEqual([]);
  });
});

describe("computeBudgetAlerts — bill_due", () => {
  it("flags expense rules occurring within the 7-day window", () => {
    const rent = rule({ id: "rent", startDate: "2026-01-15", amountCents: 200_000 });
    const alerts = computeBudgetAlerts(input({ recurringRules: [rent] }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe("bill_due");
    expect(alerts[0].dedupeKey).toBe("bill_due:rr-rent-2026-01-15");
    expect(alerts[0].amountCents).toBe(200_000);
  });

  it("ignores income rules, inactive rules, and occurrences beyond the window", () => {
    const alerts = computeBudgetAlerts(
      input({
        recurringRules: [
          rule({ id: "income", type: "income", startDate: "2026-01-12" }),
          rule({ id: "off", isActive: false, startDate: "2026-01-12" }),
          rule({ id: "later", startDate: "2026-02-01" }),
        ],
      }),
    );
    expect(alerts).toEqual([]);
  });
});

describe("computeBudgetAlerts — low_runway", () => {
  it("crimson under 1 month, amber under 3, none otherwise", () => {
    const low = computeBudgetAlerts(
      input({
        runway: { months: 0.4, basis: "current_month_actual", monthlyOutflowCents: 100_000 },
      }),
    );
    expect(low[0].severity).toBe("crimson");
    expect(low[0].dedupeKey).toBe("low_runway:period-jan");

    const mid = computeBudgetAlerts(
      input({
        runway: { months: 2.3, basis: "trailing_three_month_average", monthlyOutflowCents: 100_000 },
      }),
    );
    expect(mid[0].severity).toBe("amber");
    expect(mid[0].message).toContain("2.3");

    const ok = computeBudgetAlerts(
      input({ runway: { months: 4.5, basis: "current_month_actual", monthlyOutflowCents: 1 } }),
    );
    expect(ok).toEqual([]);
  });

  it("null runway months never invents an alert", () => {
    const alerts = computeBudgetAlerts(
      input({ runway: { months: null, basis: "current_month_actual", monthlyOutflowCents: 0 } }),
    );
    expect(alerts).toEqual([]);
  });

  it("a forecast crossing zero raises low_runway with the forecast disclaimer attached", () => {
    const forecast = forecastCashFlow({
      startingBalanceCents: 10_000,
      recurringRules: [rule({ id: "big", amountCents: 20_000, startDate: "2026-01-12" })],
      trailingAverages: { avgMonthlyIncomeCents: null, avgMonthlyExpenseCents: null, monthsWithData: 0 },
      horizonDays: 31,
      asOfDate: "2026-01-10",
    });
    const alerts = computeBudgetAlerts(input({ forecast }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe("low_runway");
    expect(alerts[0].dedupeKey).toBe("low_runway:forecast:period-jan");
    expect(alerts[0].message).toContain("Projection based on");
  });
});

describe("computeBudgetAlerts — uncategorized_backlog", () => {
  it("fires at the threshold and stays quiet below it", () => {
    const at = computeBudgetAlerts(input({ uncategorizedCount: 10 }));
    expect(at[0].kind).toBe("uncategorized_backlog");
    expect(at[0].dedupeKey).toBe("uncategorized:period-jan");
    expect(computeBudgetAlerts(input({ uncategorizedCount: 9 }))).toEqual([]);
  });
});

describe("computeBudgetAlerts — rule_conflict", () => {
  it("flags two live same-type rules with same payee and near-equal amounts", () => {
    const a = rule({ id: "r-b", description: "Netflix", amountCents: 1_599 });
    const b = rule({ id: "r-a", description: "NETFLIX.", amountCents: 1_599 });
    const alerts = computeBudgetAlerts(input({ recurringRules: [a, b] }));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].kind).toBe("rule_conflict");
    expect(alerts[0].dedupeKey).toBe("rule_conflict:r-a:r-b");
  });

  it("does not flag different types, different payees, or amounts far apart", () => {
    const base = rule({ id: "r-a", description: "Netflix", amountCents: 1_599 });
    expect(
      computeBudgetAlerts(
        input({ recurringRules: [base, rule({ id: "r-b", type: "income", description: "Netflix", amountCents: 1_599 })] }),
      ),
    ).toEqual([]);
    expect(
      computeBudgetAlerts(
        input({ recurringRules: [base, rule({ id: "r-b", description: "Hulu", amountCents: 1_599 })] }),
      ),
    ).toEqual([]);
    expect(
      computeBudgetAlerts(
        input({ recurringRules: [base, rule({ id: "r-b", description: "Netflix", amountCents: 3_000 })] }),
      ),
    ).toEqual([]);
  });
});

describe("computeBudgetAlerts — honesty and tone", () => {
  it("empty inputs produce no alerts", () => {
    expect(computeBudgetAlerts(input({}))).toEqual([]);
  });

  it("dedupe keys are unique and deterministic across runs", () => {
    const state = [
      envelopeState({
        categoryId: "cat-dining",
        activityCents: 30_000,
        availableCents: -10_000,
        overspent: true,
        overspentCents: 10_000,
      }),
    ];
    const rules = [rule({ id: "rent", startDate: "2026-01-12" })];
    const first = computeBudgetAlerts(input({ envelopeState: state, recurringRules: rules }));
    const second = computeBudgetAlerts(input({ envelopeState: state, recurringRules: rules }));
    expect(first).toEqual(second);
    expect(new Set(first.map((a) => a.dedupeKey)).size).toBe(first.length);
  });

  it("messages never use advice language", () => {
    const alerts = computeBudgetAlerts(
      input({
        envelopeState: [
          envelopeState({
            categoryId: "cat-dining",
            activityCents: 30_000,
            availableCents: -10_000,
            overspent: true,
            overspentCents: 10_000,
          }),
        ],
        recurringRules: [
          rule({ id: "rent", startDate: "2026-01-12" }),
          rule({ id: "r-a", description: "Netflix", amountCents: 1_599, startDate: "2026-03-01" }),
          rule({ id: "r-b", description: "Netflix", amountCents: 1_599, startDate: "2026-03-01" }),
        ],
        runway: { months: 0.5, basis: "current_month_actual", monthlyOutflowCents: 100_000 },
        uncategorizedCount: 25,
        forecast: forecastCashFlow({
          startingBalanceCents: 10_000,
          recurringRules: [],
          trailingAverages: { avgMonthlyIncomeCents: null, avgMonthlyExpenseCents: null, monthsWithData: 0 },
          horizonDays: 31,
          asOfDate: "2026-01-10",
        }),
      }),
    );
    expect(alerts.length).toBeGreaterThanOrEqual(5);
    for (const alert of alerts) {
      expect(alert.message).not.toMatch(/you should|we recommend|i recommend|guaranteed|you must/i);
      expect(alert.title).not.toMatch(/you should|we recommend|i recommend|guaranteed|you must/i);
    }
  });
});
