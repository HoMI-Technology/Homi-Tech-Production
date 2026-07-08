import { describe, expect, it } from "vitest";
import { computeFireNumber, computeCoastFire } from "@/lib/tools/fire";
import { amortizationSummary, fullPaymentBreakdown, monthlyPayment } from "@/lib/tools/mortgage";
import { computeRothConversion } from "@/lib/tools/roth";
import { computeBlindBudget } from "@/lib/tools/blindbudget";

describe("tools/fire", () => {
  it("computes the classic FIRE number from expenses and a safe withdrawal rate", () => {
    expect(computeFireNumber(40000, 4)).toBeCloseTo(1_000_000, 5);
  });

  it("returns 0 for a non-positive safe withdrawal rate", () => {
    expect(computeFireNumber(40000, 0)).toBe(0);
    expect(computeFireNumber(40000, -2)).toBe(0);
  });

  it("marks coast-FIRE achieved when current savings already exceed the number needed today", () => {
    const result = computeCoastFire({
      annualExpenses: 30000,
      swrPercent: 4,
      currentAge: 40,
      retirementAge: 45,
      currentSavings: 5_000_000,
      expectedReturnPercent: 7,
    });
    expect(result.isCoastFire).toBe(true);
    expect(result.coastFireAge).toBe(40);
  });

  it("returns a null coast-FIRE age when there are no current savings", () => {
    const result = computeCoastFire({
      annualExpenses: 40000,
      swrPercent: 4,
      currentAge: 30,
      retirementAge: 60,
      currentSavings: 0,
      expectedReturnPercent: 7,
    });
    expect(result.coastFireAge).toBeNull();
    expect(result.isCoastFire).toBe(false);
  });

  it("needs the full FIRE number today when retirement age equals current age", () => {
    const result = computeCoastFire({
      annualExpenses: 40000,
      swrPercent: 4,
      currentAge: 50,
      retirementAge: 50,
      currentSavings: 500000,
      expectedReturnPercent: 7,
    });
    expect(result.yearsToRetirement).toBe(0);
    expect(result.coastFireNumberNeededNow).toBeCloseTo(result.fireNumber, 5);
  });
});

describe("tools/mortgage — amortization + full breakdown", () => {
  it("sums P&I, taxes/insurance, and HOA into the full monthly total", () => {
    const breakdown = fullPaymentBreakdown(400000, {
      rate: 6.5,
      termYears: 30,
      taxInsuranceRate: 0.015,
      downPayment: 80000,
      hoaMonthly: 200,
    });
    expect(breakdown.total).toBeCloseTo(
      breakdown.principalAndInterest + breakdown.taxesAndInsurance + breakdown.hoa,
      6,
    );
    expect(breakdown.hoa).toBe(200);
  });

  it("defaults HOA to 0 when omitted", () => {
    const breakdown = fullPaymentBreakdown(300000, {
      rate: 6,
      termYears: 30,
      taxInsuranceRate: 0.015,
      downPayment: 60000,
    });
    expect(breakdown.hoa).toBe(0);
  });

  it("produces a full-term amortization summary with the expected number of payments", () => {
    const loanAmount = 300000;
    const summary = amortizationSummary(loanAmount, 6, 30, new Date(2026, 0, 1));
    expect(summary.totalPayments).toBe(360);
    expect(summary.monthlyPrincipalAndInterest).toBeCloseTo(monthlyPayment(loanAmount, 6, 30), 6);
    expect(summary.totalInterestPaid).toBeGreaterThan(0);
    expect(summary.totalPaid).toBeCloseTo(summary.monthlyPrincipalAndInterest * 360, 4);
    expect(summary.payoffDate.getFullYear()).toBe(2056);
    expect(summary.payoffDate.getMonth()).toBe(0); // January, zero-indexed
  });

  it("has zero interest and zero payment for a zero loan amount", () => {
    const summary = amortizationSummary(0, 6, 30);
    expect(summary.monthlyPrincipalAndInterest).toBe(0);
    expect(summary.totalInterestPaid).toBe(0);
    expect(summary.totalPaid).toBe(0);
  });
});

describe("tools/roth — conversion education math", () => {
  it("computes today's tax cost as convertAmount times the marginal rate", () => {
    const result = computeRothConversion({
      currentBalance: 100000,
      convertAmount: 10000,
      marginalRateNowPercent: 20,
      expectedRateRetirementPercent: 22,
      yearsToHorizon: 10,
      expectedGrowthPercent: 7,
    });
    expect(result.taxCostToday).toBeCloseTo(2000, 6);
  });

  it("leaves the future value unchanged from convertAmount at a zero-year horizon", () => {
    const result = computeRothConversion({
      currentBalance: 50000,
      convertAmount: 15000,
      marginalRateNowPercent: 24,
      expectedRateRetirementPercent: 24,
      yearsToHorizon: 0,
      expectedGrowthPercent: 7,
    });
    expect(result.futureValueAtHorizon).toBeCloseTo(15000, 6);
  });

  it("computes net educational benefit as tax avoided later minus tax paid now", () => {
    const result = computeRothConversion({
      currentBalance: 100000,
      convertAmount: 20000,
      marginalRateNowPercent: 15,
      expectedRateRetirementPercent: 30,
      yearsToHorizon: 20,
      expectedGrowthPercent: 7,
    });
    expect(result.netEducationalBenefit).toBeCloseTo(result.taxAvoidedAtHorizon - result.taxCostToday, 6);
    // A lower rate now than expected in retirement should show a positive benefit here.
    expect(result.netEducationalBenefit).toBeGreaterThan(0);
  });
});

describe("tools/blindbudget — range in, range out", () => {
  it("pairs least income with highest costs for the low end of the safe-to-spend band", () => {
    const result = computeBlindBudget({
      incomeLow: 4000,
      incomeHigh: 6000,
      fixedCostsLow: 2000,
      fixedCostsHigh: 3000,
      savingsLow: 5000,
      savingsHigh: 9000,
    });
    expect(result.safeToSpendLow).toBe(4000 - 3000);
    expect(result.safeToSpendHigh).toBe(6000 - 2000);
  });

  it("never returns a negative safe-to-spend band even when costs could exceed income", () => {
    const result = computeBlindBudget({
      incomeLow: 1000,
      incomeHigh: 2000,
      fixedCostsLow: 1500,
      fixedCostsHigh: 2500,
      savingsLow: 0,
      savingsHigh: 1000,
    });
    expect(result.safeToSpendLow).toBe(0);
  });
});
