import { describe, it, expect } from "vitest";
import { mapAssessmentRowToStored } from "@/lib/assessment/remote";
import type { AssessmentRow } from "@/types/database";

const baseRow = {
  id: "00000000-0000-4000-8000-000000000001",
  overall_score: 84,
  verdict: "READY" as const,
  is_shadow: false,
  completed_at: "2026-08-05T00:00:00.000Z",
  created_at: "2026-08-05T00:00:00.000Z",
  inputs: {
    debtToIncomeRatio: 0.25,
    downPaymentPercent: 0.2,
    emergencyFundMonths: 6,
    creditScore: 750,
    lifeStability: 8,
    confidenceLevel: 7,
    partnerAlignment: 7,
    fomoLevel: 3,
    timeHorizonMonths: 18,
    savingsRate: 0.15,
    downPaymentProgress: 0.5,
  },
  sub_scores: {
    financial: {
      debtToIncome: 8,
      downPayment: 8,
      emergencyFund: 8,
      creditHealth: 7,
      total: 31,
    },
    emotional: {
      lifeStability: 8,
      confidenceLevel: 7,
      partnerAlignment: 7,
      fomoCheck: 6,
      total: 28,
      singleRedistribution: false,
    },
    timing: { timeHorizon: 8, savingsRate: 8, downPaymentProgress: 8, total: 24 },
  },
  hard_stops: [],
  insights: null,
} as unknown as AssessmentRow;

describe("mapAssessmentRowToStored insights (6.3)", () => {
  it("threads insights when present on the row", () => {
    const row = {
      ...baseRow,
      insights: { keyInsight: "hello", nextSteps: ["a", "b"] },
    } as unknown as AssessmentRow;
    const stored = mapAssessmentRowToStored(row);
    expect(stored?.insights).toEqual({ keyInsight: "hello", nextSteps: ["a", "b"] });
  });

  it("omits insights when missing (legacy rows)", () => {
    const stored = mapAssessmentRowToStored(baseRow);
    expect(stored).not.toBeNull();
    expect(stored?.insights).toBeUndefined();
  });

  it("returns null for is_shadow rows — they are not a Decision Readiness Score", () => {
    const stored = mapAssessmentRowToStored({ ...baseRow, is_shadow: true });
    expect(stored).toBeNull();
  });
});
