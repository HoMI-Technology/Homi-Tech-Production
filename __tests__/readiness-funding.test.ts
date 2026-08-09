import { describe, expect, it } from "vitest";
import { DEFAULT_FINANCE_STATE, type FinanceState } from "@/lib/finance/store";
import { applyPathFunding, deriveFundingFromPath, type ReadinessPath } from "@/lib/readiness";

function pathWithRunwayGap(gap: number): ReadinessPath {
  return {
    id: "p1",
    version: 1,
    createdAt: "2026-07-01T00:00:00.000Z",
    assessmentCompletedAt: "2026-07-01T00:00:00.000Z",
    verdict: "NOT_YET",
    score: 40,
    bindingConstraint: "RUNWAY_UNDER_1_MONTH",
    confidence: "assessment_plus_finance",
    disclaimer: "Educational",
    mode: "build",
    calendarCommittedAt: null,
    steps: [
      {
        id: "s1",
        title: "Stabilize emergency runway to at least 1 month",
        kind: "deadline",
        daysFromNow: 3,
        reasonCode: "RUNWAY_UNDER_1_MONTH",
        href: "/tools/runway",
        notes: "Protective",
        fundingTarget: gap,
        fundingLabel: "Cash still needed for 1-month runway",
        status: "pending",
        completedAt: null,
      },
    ],
  };
}

describe("deriveFundingFromPath", () => {
  it("converts runway gap into absolute liquid savings floor", () => {
    const finance: FinanceState = {
      ...DEFAULT_FINANCE_STATE,
      liquidSavings: 2000,
      downPaymentTarget: 50000,
    };
    const suggestion = deriveFundingFromPath(pathWithRunwayGap(4000), finance);
    expect(suggestion.liquidSavingsTarget).toBe(6000);
    expect(suggestion.hasActionableDiff).toBe(true);
    expect(suggestion.lines.length).toBeGreaterThan(0);
  });

  it("applyPathFunding targets mode does not invent cash", () => {
    const finance: FinanceState = {
      ...DEFAULT_FINANCE_STATE,
      liquidSavings: 2000,
      downPaymentTarget: 50000,
    };
    const suggestion = deriveFundingFromPath(pathWithRunwayGap(4000), finance);
    const next = applyPathFunding(finance, suggestion, "targets");
    expect(next.liquidSavings).toBe(2000);
  });

  it("applyPathFunding savings_floor raises liquid when confirmed", () => {
    const finance: FinanceState = {
      ...DEFAULT_FINANCE_STATE,
      liquidSavings: 2000,
      assets: [{ id: "asset-cash", name: "Cash & savings", amount: 2000 }],
    };
    const suggestion = deriveFundingFromPath(pathWithRunwayGap(4000), finance);
    const next = applyPathFunding(finance, suggestion, "savings_floor");
    expect(next.liquidSavings).toBe(6000);
    expect(next.assets[0].amount).toBe(6000);
  });
});
