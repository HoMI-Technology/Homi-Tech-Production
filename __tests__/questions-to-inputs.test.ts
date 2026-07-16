import { describe, it, expect } from "vitest";
import { bankResponsesToInputs } from "@/lib/questions/to-inputs";

describe("bankResponsesToInputs", () => {
  it("derives DTI from income and debt when both are present", () => {
    const inputs = bankResponsesToInputs(
      { fin_income: 10000, fin_debt_payments: 2000 },
      { referralSource: null, deadlineOrigin: null },
    );
    expect(inputs.debtToIncomeRatio).toBeCloseTo(0.2);
  });

  it("maps credit band to a numeric score", () => {
    const inputs = bankResponsesToInputs(
      { fin_credit_score: "good" },
      { referralSource: null, deadlineOrigin: null },
    );
    expect(inputs.creditScore).toBe(730);
  });

  it("maps down payment choice to a percent", () => {
    const inputs = bankResponsesToInputs(
      { fin_down_payment: "20_plus" },
      { referralSource: null, deadlineOrigin: null },
    );
    expect(inputs.downPaymentPercent).toBeCloseTo(0.22);
  });

  it("carries conflict fields through when provided", () => {
    const inputs = bankResponsesToInputs(
      {},
      { referralSource: "lender", deadlineOrigin: "external" },
    );
    expect(inputs.referralSource).toBe("lender");
    expect(inputs.deadlineOrigin).toBe("external");
  });
});
