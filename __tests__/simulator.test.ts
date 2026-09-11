import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/scoring/engine";
import type { AssessmentInputs } from "@/lib/scoring/public";
import {
  applyDebtPayoff,
  applySavingsPlan,
  deriveAnchors,
  deriveDebtPayments,
  parseSnapshotState,
  rankLevers,
  seedBaseline,
  simulate,
  ESTIMATED_DEBT_PAYMENT_RATE,
  NEUTRAL_INPUTS,
  type SimulatorBaseline,
} from "@/lib/simulator";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A plaid_sync snapshot state exactly as lib/plaid/sync.ts writes it. */
const PLAID_STATE = {
  source: "plaid_sync",
  windowDays: 30,
  monthlyIncome: 5000,
  monthlyExpenses: 3000,
  liquidSavings: 12000,
  totalDebt: 8000,
  accountCount: 3,
};

const FINANCE_STATE = {
  monthlyIncome: 6500,
  monthlyExpenses: 4200,
  liquidSavings: 18000,
  totalDebt: 22000,
  monthlyDebtPayments: 650,
};

/** Stored inputs of a completed assessment (the engine's documented example). */
const ASSESSMENT_INPUTS: AssessmentInputs = {
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

const ANCHOR_ASSESSMENT = {
  emotional_score: 20,
  timing_score: 15,
  inputs: ASSESSMENT_INPUTS as unknown as Record<string, unknown>,
};

const ANCHORS = deriveAnchors(ANCHOR_ASSESSMENT);

function baselineOf(levers: Partial<SimulatorBaseline>): SimulatorBaseline {
  return {
    monthlyIncome: 0,
    monthlyExpenses: 0,
    liquidSavings: 0,
    totalDebt: 0,
    monthlyDebtPayments: null,
    source: "plaid_sync",
    ...levers,
  };
}

// ---------------------------------------------------------------------------
// Baseline seeding precedence
// ---------------------------------------------------------------------------

describe("seedBaseline", () => {
  it("prefers the plaid_sync snapshot over manual finance state", () => {
    const baseline = seedBaseline(PLAID_STATE, FINANCE_STATE);
    expect(baseline.source).toBe("plaid_sync");
    expect(baseline.monthlyIncome).toBe(5000);
    expect(baseline.totalDebt).toBe(8000);
    // Plaid snapshots carry balances, never payment schedules.
    expect(baseline.monthlyDebtPayments).toBeNull();
  });

  it("falls back to manual finance state when the snapshot is not plaid_sync", () => {
    const baseline = seedBaseline({ ...PLAID_STATE, source: "manual_entry" }, FINANCE_STATE);
    expect(baseline.source).toBe("manual");
    expect(baseline.monthlyIncome).toBe(6500);
    expect(baseline.monthlyDebtPayments).toBe(650);
  });

  it("falls back to manual finance state when the snapshot is malformed", () => {
    const { liquidSavings: _dropped, ...incomplete } = PLAID_STATE;
    expect(parseSnapshotState(incomplete)).toBeNull();
    expect(seedBaseline(incomplete, FINANCE_STATE).source).toBe("manual");
  });

  it("seeds zeros with source 'empty' when nothing exists", () => {
    const baseline = seedBaseline(null, null);
    expect(baseline).toEqual({
      monthlyIncome: 0,
      monthlyExpenses: 0,
      liquidSavings: 0,
      totalDebt: 0,
      monthlyDebtPayments: null,
      source: "empty",
    });
  });
});

// ---------------------------------------------------------------------------
// Anchors
// ---------------------------------------------------------------------------

describe("deriveAnchors", () => {
  it("holds emotional/timing and the unreachable financial inputs at assessment values", () => {
    expect(ANCHORS.neutral).toBe(false);
    expect(ANCHORS.emotionalScore).toBe(20);
    expect(ANCHORS.timingScore).toBe(15);
    expect(ANCHORS.creditScore).toBe(750);
    expect(ANCHORS.downPaymentPercent).toBe(0.2);
  });

  it("uses neutral placeholders (flagged) when no assessment exists", () => {
    const neutral = deriveAnchors(null);
    const reference = computeScore(NEUTRAL_INPUTS);
    expect(neutral.neutral).toBe(true);
    expect(neutral.emotionalScore).toBe(reference.emotional.total);
    expect(neutral.timingScore).toBe(reference.timing.total);
    expect(neutral.creditScore).toBe(NEUTRAL_INPUTS.creditScore);
  });
});

// ---------------------------------------------------------------------------
// Debt payments derivation
// ---------------------------------------------------------------------------

describe("deriveDebtPayments", () => {
  it("estimates payments from the balance when actual payments are unknown", () => {
    const payments = deriveDebtPayments(10000, { totalDebt: 10000, monthlyDebtPayments: null });
    expect(payments).toEqual({ amount: 10000 * ESTIMATED_DEBT_PAYMENT_RATE, estimated: true });
  });

  it("scales known payments proportionally with the balance", () => {
    const base = { totalDebt: 20000, monthlyDebtPayments: 400 };
    expect(deriveDebtPayments(10000, base)).toEqual({ amount: 200, estimated: false });
    expect(deriveDebtPayments(0, base)).toEqual({ amount: 0, estimated: false });
  });
});

// ---------------------------------------------------------------------------
// Simulation — real engine, financial pillar only
// ---------------------------------------------------------------------------

describe("simulate", () => {
  it("composes held pillars with the engine-scored financial pillar", () => {
    // income 6000, est. payments 2% of 30k = 600 → DTI 10% → 10 pts;
    // outflow 4600, savings 10000 → 2.17 months runway → 2 pts;
    // credit 750 → 7 pts; down payment 20% → 10 pts. Financial = 29.
    const baseline = baselineOf({
      monthlyIncome: 6000,
      monthlyExpenses: 4000,
      liquidSavings: 10000,
      totalDebt: 30000,
    });
    const outcome = simulate(baseline, baseline, ANCHORS);
    expect(outcome.financialScore).toBe(29);
    expect(outcome.compositeScore).toBe(29 + 20 + 15);
    expect(outcome.verdict).toBe("BUILD_FIRST");
    expect(outcome.debtPaymentsEstimated).toBe(true);
    expect(outcome.monthlyDebtPayments).toBe(600);
  });

  it("fires the runway hard-stop and forces NOT_YET regardless of the composite", () => {
    const baseline = baselineOf({
      monthlyIncome: 6000,
      monthlyExpenses: 4000,
      liquidSavings: 4000, // 0.87 months of the 4600 outflow — under the red line
      totalDebt: 30000,
    });
    const outcome = simulate(baseline, baseline, ANCHORS);
    expect(outcome.hardStops.map((s) => s.code)).toContain("RUNWAY_UNDER_1_MONTH");
    expect(outcome.verdict).toBe("NOT_YET");
  });

  it("crosses a verdict band when a lever moves the composite over a threshold", () => {
    const baseline = baselineOf({
      monthlyIncome: 6000,
      monthlyExpenses: 4000,
      liquidSavings: 10000,
      totalDebt: 30000,
    });
    const before = simulate(baseline, baseline, ANCHORS);
    // 3-6 months of runway lifts the emergency-fund read from 2 to 5 points.
    const after = simulate({ ...baseline, liquidSavings: 15000 }, baseline, ANCHORS);
    expect(before.compositeScore).toBe(64);
    expect(before.verdict).toBe("BUILD_FIRST");
    expect(after.compositeScore).toBe(67);
    expect(after.verdict).toBe("ALMOST_THERE");
  });
});

// ---------------------------------------------------------------------------
// Scenario shortcuts
// ---------------------------------------------------------------------------

describe("scenario shortcuts", () => {
  it("pays debt from savings and never pays more than debt or savings allow", () => {
    const levers = {
      monthlyIncome: 5000,
      monthlyExpenses: 3000,
      liquidSavings: 5000,
      totalDebt: 3000,
    };
    expect(applyDebtPayoff(levers, 10000)).toEqual({
      ...levers,
      liquidSavings: 2000,
      totalDebt: 0,
    });
    const thin = { ...levers, liquidSavings: 1000 };
    expect(applyDebtPayoff(thin, 2000)).toEqual({ ...thin, liquidSavings: 0, totalDebt: 2000 });
  });

  it("adds a savings plan's total to liquid savings", () => {
    const levers = {
      monthlyIncome: 5000,
      monthlyExpenses: 3000,
      liquidSavings: 5000,
      totalDebt: 3000,
    };
    expect(applySavingsPlan(levers, 500, 12).liquidSavings).toBe(11000);
    expect(applySavingsPlan(levers, -500, 12).liquidSavings).toBe(5000);
  });
});

// ---------------------------------------------------------------------------
// Lever ranking
// ---------------------------------------------------------------------------

describe("rankLevers", () => {
  it("ranks changed levers by each one's solo composite impact, largest first", () => {
    // Baseline: est. payments 1800 → DTI 30% → 7 pts; outflow 5800,
    // savings 10000 → 1.72 months → 2 pts. Financial = 26, composite 61.
    const baseline = baselineOf({
      monthlyIncome: 6000,
      monthlyExpenses: 4000,
      liquidSavings: 10000,
      totalDebt: 90000,
    });
    const levers = { ...baseline, liquidSavings: 36000, totalDebt: 30000 };
    const impacts = rankLevers(levers, baseline, ANCHORS);

    // Savings alone: 36000/5800 → 6.2 months → 8 pts (+6).
    // Debt alone: payments 600 → DTI 10% → 10 pts (+3).
    expect(impacts.map((i) => i.key)).toEqual(["liquidSavings", "totalDebt"]);
    expect(impacts[0].delta).toBe(6);
    expect(impacts[1].delta).toBe(3);
  });

  it("omits unchanged levers", () => {
    const baseline = baselineOf({
      monthlyIncome: 6000,
      monthlyExpenses: 4000,
      liquidSavings: 10000,
      totalDebt: 30000,
    });
    expect(rankLevers({ ...baseline }, baseline, ANCHORS)).toEqual([]);
  });
});
