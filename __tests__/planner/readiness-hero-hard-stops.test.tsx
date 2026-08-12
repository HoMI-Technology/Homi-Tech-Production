// @vitest-environment jsdom
/**
 * Track ReadinessHero — hard-stop chip + HardStopBanner (score-bridge SSOT).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import type { AssessmentResult } from "@/lib/scoring/public";
import type { PlannerScore } from "@/lib/planner/score-bridge";
import { DEFAULT_READINESS_PROFILE } from "@/lib/planner/derived";

const assessmentWithStops: AssessmentResult = {
  score: 45,
  verdict: "NOT_YET",
  financial: {
    debtToIncome: 0,
    downPayment: 0,
    emergencyFund: 0,
    creditHealth: 0,
    total: 0,
  },
  emotional: {
    lifeStability: 0,
    confidenceLevel: 0,
    partnerAlignment: 0,
    fomoCheck: 0,
    total: 0,
    singleRedistribution: false,
  },
  timing: {
    timeHorizon: 0,
    savingsRate: 0,
    downPaymentProgress: 0,
    total: 0,
  },
  hardStops: [
    {
      code: "RUNWAY_UNDER_1_MONTH",
      message: "Emergency runway under one month.",
    },
  ],
  warnings: [],
};

const assessmentClear: AssessmentResult = {
  ...assessmentWithStops,
  score: 72,
  verdict: "ALMOST_THERE",
  hardStops: [],
};

function makePlannerScore(assessment: AssessmentResult): PlannerScore {
  return {
    score: assessment.score,
    verdict: assessment.verdict,
    pillarPct: { financial: 40, emotional: 50, timing: 60 },
    hardStops: assessment.hardStops,
    warnings: assessment.warnings,
    keyInsight: "Protective read from live planner inputs.",
    nextSteps: ["Build runway first."],
    result: {
      score: assessment.score,
      verdict: assessment.verdict,
      pillars: {
        financial: { key: "financial", total: 14, max: 35, factors: [] },
        emotional: { key: "emotional", total: 17, max: 35, factors: [] },
        timing: { key: "timing", total: 18, max: 30, factors: [] },
      },
      hardStops: assessment.hardStops,
      warnings: assessment.warnings,
    },
    assessment,
    completeness: {
      profileComplete: true,
      hasMoneySignal: true,
      canShowLiveScore: true,
    },
  };
}

const scoreFromBudgetAsync = vi.fn();

vi.mock("@/lib/planner/score-bridge", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/planner/score-bridge")>();
  return {
    ...actual,
    scoreFromBudgetAsync: (...args: unknown[]) => scoreFromBudgetAsync(...args),
  };
});

vi.mock("@/lib/planner/store", () => {
  const state = {
    transactions: [
      {
        id: "t1",
        type: "income" as const,
        amount: 5000,
        category: "salary" as const,
        date: "2026-08-01",
      },
    ],
    accounts: [],
    bills: [],
    holdings: [],
    netWorthItems: [],
    savingsGoal: { name: "Emergency fund", target: 10_000, current: 500 },
    readinessProfile: { ...DEFAULT_READINESS_PROFILE, profileComplete: true, creditScore: 700 },
    setReadinessProfile: vi.fn(),
  };
  const usePlannerStore = (sel: (s: typeof state) => unknown) => sel(state);
  usePlannerStore.getState = () => state;
  return { usePlannerStore };
});

beforeEach(() => {
  scoreFromBudgetAsync.mockReset();
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockReturnValue({
      matches: true,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const reality = {
  income: 5000,
  expenses: 4000,
  cashFlow: 1000,
  savingsRate: 20,
  runwayMonths: 0.4,
  dti: 10,
  debtPayments: 500,
  liquidCash: 1600,
  temps: {
    cashFlow: "emerald" as const,
    savingsRate: "emerald" as const,
    runway: "crimson" as const,
    dti: "emerald" as const,
  },
};

describe("ReadinessHero hard stops", () => {
  it("shows hard-stop chip and HardStopBanner when score.hardStops is non-empty", async () => {
    scoreFromBudgetAsync.mockResolvedValue(makePlannerScore(assessmentWithStops));
    const { ReadinessHero } = await import("@/components/planner/ReadinessHero");
    render(
      <ReadinessHero reality={reality} portfolioValue={0} netWorth={1600} billsOpen={200} />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("readiness-hard-stop-chip")).toBeTruthy();
    });
    expect(screen.getByTestId("readiness-hard-stop-chip").textContent).toMatch(/hard stop/i);
    expect(screen.getByTestId("readiness-hard-stop-banner")).toBeTruthy();
    expect(screen.getByText("A red line, not a rejection.")).toBeTruthy();
    expect(screen.getByText("Emergency runway under one month.")).toBeTruthy();
  });

  it("hides hard-stop chrome when score.hardStops is empty", async () => {
    scoreFromBudgetAsync.mockResolvedValue(makePlannerScore(assessmentClear));
    const { ReadinessHero } = await import("@/components/planner/ReadinessHero");
    render(
      <ReadinessHero reality={reality} portfolioValue={0} netWorth={1600} billsOpen={200} />,
    );

    await waitFor(() => {
      expect(screen.getByText("Live instrument")).toBeTruthy();
    });
    expect(screen.queryByTestId("readiness-hard-stop-chip")).toBeNull();
    expect(screen.queryByTestId("readiness-hard-stop-banner")).toBeNull();
    expect(screen.queryByText("A red line, not a rejection.")).toBeNull();
  });
});
