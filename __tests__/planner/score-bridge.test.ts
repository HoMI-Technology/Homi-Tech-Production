/**
 * Planner score-bridge — pure mapper + completeness gates.
 * Network scoring is mocked; WEIGHTS must never be imported here.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildAssessmentInputs,
  bridgeCompleteness,
  scoreFromBudgetAsync,
  ScoringRequestError,
} from "@/lib/planner/score-bridge";
import {
  DEFAULT_GOAL,
  DEFAULT_READINESS_PROFILE,
} from "@/lib/planner/derived";
import type { ScoreBridgeInput } from "@/lib/planner/score-bridge";

vi.mock("@/lib/scoring/client-score", () => ({
  fetchServerScore: vi.fn(async () => ({
    result: {
      score: 72.5,
      verdict: "ALMOST_THERE",
      financial: {
        debtToIncome: 8,
        downPayment: 6,
        emergencyFund: 5,
        creditHealth: 6,
        total: 25,
      },
      emotional: {
        lifeStability: 6,
        confidenceLevel: 6,
        partnerAlignment: 6,
        fomoCheck: 5,
        total: 23,
        singleRedistribution: false,
      },
      timing: {
        timeHorizon: 8,
        savingsRate: 8,
        downPaymentProgress: 6,
        total: 22,
      },
      warnings: [],
      hardStops: [],
    },
    keyInsight: "Test insight",
    nextSteps: ["Step one"],
  })),
  ScoringRequestError: class ScoringRequestError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

function baseInput(over: Partial<ScoreBridgeInput> = {}): ScoreBridgeInput {
  return {
    transactions: [
      {
        id: "t1",
        type: "income",
        amount: 6000,
        category: "salary",
        date: "2026-08-01",
      },
      {
        id: "t2",
        type: "expense",
        amount: 2000,
        category: "housing",
        date: "2026-08-01",
      },
    ],
    accounts: [
      {
        id: "a1",
        institution: "chase",
        name: "Checking",
        type: "checking",
        mask: "0000",
        balance: 10_000,
        available: 10_000,
        currency: "USD",
        lastSyncedAt: null,
        status: "linked",
      },
    ],
    bills: [],
    holdings: [],
    netWorthItems: [],
    savingsGoal: { ...DEFAULT_GOAL, target: 12_000, current: 4_000 },
    readinessProfile: {
      ...DEFAULT_READINESS_PROFILE,
      profileComplete: true,
      creditScore: 720,
      lifeStability: 7,
      confidenceLevel: 7,
      partnerAlignment: 7,
      fomoLevel: 3,
      timeHorizonMonths: 18,
      targetHomePrice: 400_000,
      downPaymentSaved: 40_000,
    },
    ...over,
  };
}

describe("buildAssessmentInputs", () => {
  it("maps income and DTI from ledger + bills", () => {
    const inputs = buildAssessmentInputs(baseInput());
    expect(inputs.debtToIncomeRatio).toBeGreaterThanOrEqual(0);
    expect(inputs.creditScore).toBe(720);
    expect(inputs.savingsRate).toBeGreaterThan(0);
  });

  it("coerces infinite runway to 12 for scoring only", () => {
    const inputs = buildAssessmentInputs(
      baseInput({
        transactions: [
          {
            id: "t1",
            type: "income",
            amount: 5000,
            category: "salary",
            date: "2026-08-01",
          },
        ],
        accounts: [
          {
            id: "a1",
            institution: "chase",
            name: "Checking",
            type: "checking",
            mask: "1",
            balance: 50_000,
            available: 50_000,
            currency: "USD",
            lastSyncedAt: null,
            status: "linked",
          },
        ],
        bills: [],
      }),
    );
    // No expenses → infinite runway display, scoring gets 12
    expect(inputs.emergencyFundMonths).toBe(12);
  });

  it("passes null partnerAlignment for solo", () => {
    const inputs = buildAssessmentInputs(
      baseInput({
        readinessProfile: {
          ...DEFAULT_READINESS_PROFILE,
          profileComplete: true,
          creditScore: 700,
          partnerAlignment: null,
        },
      }),
    );
    expect(inputs.partnerAlignment).toBeNull();
  });
});

describe("bridgeCompleteness", () => {
  it("blocks live score until profileComplete", () => {
    const c = bridgeCompleteness(
      baseInput({
        readinessProfile: {
          ...DEFAULT_READINESS_PROFILE,
          profileComplete: false,
          creditScore: 720,
        },
      }),
    );
    expect(c.canShowLiveScore).toBe(false);
  });

  it("allows live score when profileComplete", () => {
    const c = bridgeCompleteness(baseInput());
    expect(c.canShowLiveScore).toBe(true);
  });
});

describe("scoreFromBudgetAsync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns server score when profile complete", async () => {
    const score = await scoreFromBudgetAsync(baseInput());
    expect(score.score).toBe(72.5);
    expect(score.verdict).toBe("ALMOST_THERE");
    expect(score.keyInsight).toBe("Test insight");
    expect(score.pillarPct.financial).toBeGreaterThan(0);
  });

  it("rejects when profile incomplete", async () => {
    await expect(
      scoreFromBudgetAsync(
        baseInput({
          readinessProfile: {
            ...DEFAULT_READINESS_PROFILE,
            profileComplete: false,
          },
        }),
      ),
    ).rejects.toBeInstanceOf(ScoringRequestError);
  });
});
