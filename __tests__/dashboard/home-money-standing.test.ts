import { describe, expect, it } from "vitest";
import { COLORS } from "@/lib/brand";
import type { NamedMoneyMetrics } from "@/lib/finance/metrics";
import {
  buildHomeMoneyStandingView,
  moneyStandingAsOfLabel,
  standCashReading,
} from "@/lib/dashboard/home-money-standing";
import { PERIOD_SURPLUS_LABEL } from "@/lib/finance/metrics";

function metrics(partial: Partial<NamedMoneyMetrics> = {}): NamedMoneyMetrics {
  const {
    surplus: surplusPartial,
    runway: runwayPartial,
    evidence: evidencePartial,
    dti: dtiPartial,
    ...rest
  } = partial;

  return {
    source: "ledger",
    asOf: "2026-08-18T12:00:00.000Z",
    surplus: {
      dollars: 420,
      incomeDollars: 5000,
      expenseDollars: 4200,
      debtPaymentDollars: 380,
      formula: "income - netExpense - debtPayments",
      ...surplusPartial,
    },
    runway: {
      months: 4.2,
      liquidDollars: 8400,
      liquidSource: "emergency_goal",
      monthlyOutflowDollars: 2000,
      ...runwayPartial,
    },
    dti: {
      pct: 22,
      incomeDollars: 5000,
      debtPaymentDollars: 1100,
      ...dtiPartial,
    },
    savingsRatePct: 8,
    evidence: {
      completeness: "medium",
      sourceMode: "manual",
      monthsWithData: 2,
      uncategorizedCount: 0,
      pendingTransactionCount: 0,
      latestTransactionDate: "2026-08-17",
      hasIncome: true,
      hasExpenses: true,
      hasDebtSignal: true,
      liquidSource: "emergency_goal",
      ...evidencePartial,
    },
    periodTotals: null,
    ...rest,
  };
}

describe("moneyStandingAsOfLabel", () => {
  const now = Date.parse("2026-08-20T12:00:00.000Z");

  it("labels today / yesterday / Nd ago", () => {
    expect(moneyStandingAsOfLabel("2026-08-20T08:00:00.000Z", now)).toBe("Updated today");
    expect(moneyStandingAsOfLabel("2026-08-19T12:00:00.000Z", now)).toBe("Updated yesterday");
    expect(moneyStandingAsOfLabel("2026-08-17T12:00:00.000Z", now)).toBe("Updated 3d ago");
  });

  it("returns null when asOf is missing", () => {
    expect(moneyStandingAsOfLabel(null, now)).toBeNull();
  });
});

describe("buildHomeMoneyStandingView", () => {
  const now = Date.parse("2026-08-20T12:00:00.000Z");

  it("empty picture points at Track + bank connect", () => {
    const view = buildHomeMoneyStandingView(null, now);
    expect(view.status).toBe("empty");
    expect(view.surplusDollars).toBeNull();
    expect(view.chipLabel).toBe("No picture yet");
    expect(view.chipColor).toBe(COLORS.dim);
    expect(view.primaryHref).toBe("/money/budget");
    expect(view.secondaryHref).toBe("/connections");
    expect(view.standingLine).toMatch(/No money picture yet/i);
  });

  it("ready picture surfaces surplus, runway, liquid, and Open Money", () => {
    const view = buildHomeMoneyStandingView(metrics({}), now);
    expect(view.status).toBe("ready");
    expect(view.surplusDollars).toBe(420);
    expect(view.runwayMonths).toBe(4.2);
    expect(view.liquidDollars).toBe(8400);
    expect(view.chipLabel).toBe("Partial picture");
    expect(view.cashTempWord).toBeTruthy();
    expect(view.primaryHref).toBe("/money");
    expect(view.primaryLabel).toBe("Open Money");
    expect(view.standingLine).toMatch(/Cash flow is/i);
    expect(view.liquidNote).toMatch(/Emergency goal/i);
    expect(view.surplusLabel).toBe(PERIOD_SURPLUS_LABEL);
    expect(view.sourceLabel).toBe("Stand ledger · entered");
    expect(view.asOfLabel).toBe("Updated 2d ago");
  });

  it("Home standing and Money Stand cannot diverge under PERIOD_SURPLUS_LABEL", () => {
    const leak = metrics({
      surplus: {
        dollars: -375,
        incomeDollars: 5000,
        expenseDollars: 4975,
        debtPaymentDollars: 400,
        formula: "income - netExpense - debtPayments",
      },
      evidence: {
        completeness: "medium",
        sourceMode: "mixed",
        monthsWithData: 2,
        uncategorizedCount: 0,
        pendingTransactionCount: 0,
        latestTransactionDate: "2026-08-17",
        hasIncome: true,
        hasExpenses: true,
        hasDebtSignal: true,
        liquidSource: "emergency_goal",
      },
    });
    const home = buildHomeMoneyStandingView(leak, now);
    const stand = standCashReading(leak, now);
    expect(home.surplusLabel).toBe(PERIOD_SURPLUS_LABEL);
    expect(stand.label).toBe(PERIOD_SURPLUS_LABEL);
    expect(home.surplusDollars).toBe(stand.dollars);
    expect(home.surplusDollars).toBe(-375);
    expect(home.sourceLabel).toBe(stand.sourceLabel);
    expect(home.asOfLabel).toBe(stand.asOfLabel);
    expect(home.sourceLabel).toBe("Stand ledger · entered + linked");
  });

  it("thin completeness keeps Strengthen picture as primary", () => {
    const view = buildHomeMoneyStandingView(
      metrics({
        evidence: {
          completeness: "low",
          sourceMode: "manual",
          monthsWithData: 1,
          uncategorizedCount: 4,
          pendingTransactionCount: 0,
          latestTransactionDate: "2026-08-17",
          hasIncome: true,
          hasExpenses: true,
          hasDebtSignal: false,
          liquidSource: "missing",
        },
      }),
      now,
    );
    expect(view.primaryHref).toBe("/money/budget");
    expect(view.primaryLabel).toBe("Strengthen picture");
    expect(view.standingLine).toMatch(/Draft picture/i);
  });
});
