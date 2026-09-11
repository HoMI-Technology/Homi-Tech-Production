import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/scoring/engine";
import type { AssessmentInputs } from "@/lib/scoring/public";

const BASE: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 9,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
};

describe("AssessmentResult provenance is additive", () => {
  it("defaults to self-report / digit when no honesty fields are set", () => {
    const result = computeScore(BASE);
    expect(result.provenance).toEqual({
      dti: "self_report",
      downPayment: "self_report",
      runway: "self_report",
      credit: "self_report_digit",
      lookbackDays: null,
    });
  });

  it("records band_ignored without inventing a second score", () => {
    const result = computeScore({
      ...BASE,
      creditScoreProvenance: "band_ignored",
      selfReportedCreditBand: "excellent",
    });
    expect(result.provenance?.credit).toBe("band_ignored");
    expect(result.financial.creditHealth).toBe(0);
    expect(result.score).toBeLessThan(100);
  });
});
