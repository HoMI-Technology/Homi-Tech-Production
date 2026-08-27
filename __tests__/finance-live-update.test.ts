// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  checkLiveScoreTriggers,
  deriveScoreInputs,
  detectScoreRelevantChanges,
  dtiBand,
  emergencyFundBand,
  savingsRateBand,
  scoreTriggerSignature,
  snapshotFromAssessmentInputs,
  snapshotFromFinanceState,
  ESTIMATED_POINTS_PER_BAND,
} from "@/lib/finance/live-update";
import { DEFAULT_FINANCE_STATE, type FinanceState } from "@/lib/finance/store";

function finance(overrides: Partial<FinanceState>): FinanceState {
  return { ...DEFAULT_FINANCE_STATE, ...overrides };
}

function seedFinance(state: Partial<FinanceState>) {
  window.localStorage.setItem("homi:finance", JSON.stringify(state));
}

function seedAssessment(inputs: Record<string, unknown> | null) {
  if (inputs === null) return;
  window.localStorage.setItem(
    "homi:last-assessment",
    JSON.stringify({
      inputs,
      result: { verdict: "ALMOST_THERE", score: 70 },
      completedAt: "2026-08-01T00:00:00.000Z",
      kind: "full",
    }),
  );
}

describe("band boundaries", () => {
  it("DTI bands split at 28 / 36 / 43 (boundary value stays in the lower band)", () => {
    expect(dtiBand(0)).toBe(0);
    expect(dtiBand(28)).toBe(0);
    expect(dtiBand(28.01)).toBe(1);
    expect(dtiBand(36)).toBe(1);
    expect(dtiBand(36.5)).toBe(2);
    expect(dtiBand(43)).toBe(2);
    expect(dtiBand(43.01)).toBe(3);
  });

  it("emergency-fund bands split at 1 / 3 / 6 months (meeting the threshold moves up)", () => {
    expect(emergencyFundBand(0)).toBe(0);
    expect(emergencyFundBand(0.99)).toBe(0);
    expect(emergencyFundBand(1)).toBe(1);
    expect(emergencyFundBand(2.99)).toBe(1);
    expect(emergencyFundBand(3)).toBe(2);
    expect(emergencyFundBand(5.99)).toBe(2);
    expect(emergencyFundBand(6)).toBe(3);
    expect(emergencyFundBand(Infinity)).toBe(3);
  });

  it("savings-rate bands split at 5 / 10 / 20 percent", () => {
    expect(savingsRateBand(-10)).toBe(0);
    expect(savingsRateBand(4.99)).toBe(0);
    expect(savingsRateBand(5)).toBe(1);
    expect(savingsRateBand(9.99)).toBe(1);
    expect(savingsRateBand(10)).toBe(2);
    expect(savingsRateBand(19.99)).toBe(2);
    expect(savingsRateBand(20)).toBe(3);
  });
});

describe("deriveScoreInputs", () => {
  it("derives DTI, runway months, and savings rate from FinanceState", () => {
    const values = deriveScoreInputs(
      finance({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        monthlyDebtPayments: 1000,
        liquidSavings: 12000,
      }),
    );
    expect(values.dtiPct).toBeCloseTo(20);
    expect(values.emergencyFundMonths).toBeCloseTo(3); // 12000 / 4000
    expect(values.savingsRatePct).toBeCloseTo(20); // (5000-3000-1000)/5000
  });

  it("returns 0 DTI / 0 savings rate when income is zero, and top-band runway when outflow is zero", () => {
    const noIncome = deriveScoreInputs(finance({ monthlyIncome: 0, monthlyDebtPayments: 500 }));
    expect(noIncome.dtiPct).toBe(0);
    expect(noIncome.savingsRatePct).toBe(0);

    const noOutflow = deriveScoreInputs(
      finance({ monthlyExpenses: 0, monthlyDebtPayments: 0, liquidSavings: 1000 }),
    );
    expect(noOutflow.emergencyFundMonths).toBe(Infinity);
    expect(snapshotFromFinanceState(finance({ monthlyExpenses: 0, monthlyDebtPayments: 0, liquidSavings: 1 })).emergencyFund).toBe(3);
  });
});

describe("snapshotFromAssessmentInputs", () => {
  it("converts engine 0-1 ratios to percent bands", () => {
    const snap = snapshotFromAssessmentInputs({
      debtToIncomeRatio: 0.3,
      emergencyFundMonths: 2,
      savingsRate: 0.08,
    });
    expect(snap).toEqual({ dti: 1, emergencyFund: 1, savingsRate: 1 });
  });

  it("returns null when any input is missing or non-finite", () => {
    expect(snapshotFromAssessmentInputs(null)).toBeNull();
    expect(snapshotFromAssessmentInputs(undefined)).toBeNull();
    expect(
      snapshotFromAssessmentInputs({ debtToIncomeRatio: 0.3, savingsRate: 0.1 }),
    ).toBeNull();
    expect(
      snapshotFromAssessmentInputs({
        debtToIncomeRatio: Number.NaN,
        emergencyFundMonths: 2,
        savingsRate: 0.1,
      }),
    ).toBeNull();
  });
});

describe("detectScoreRelevantChanges", () => {
  it("reports nothing when bands are unchanged", () => {
    const snap = { dti: 1, emergencyFund: 1, savingsRate: 1 };
    const result = detectScoreRelevantChanges(snap, { ...snap });
    expect(result.changed).toBe(false);
    expect(result.changes).toEqual([]);
    expect(result.estimatedPointImpact).toBe(0);
  });

  it("flags a worsening DTI crossing with a negative estimate", () => {
    const result = detectScoreRelevantChanges(
      { dti: 0, emergencyFund: 2, savingsRate: 2 },
      { dti: 2, emergencyFund: 2, savingsRate: 2 },
    );
    expect(result.changed).toBe(true);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]).toMatchObject({
      metric: "dti",
      oldBand: 0,
      newBand: 2,
      direction: "worsened",
      estimatedPointImpact: -2 * ESTIMATED_POINTS_PER_BAND.dti,
    });
    expect(result.estimatedPointImpact).toBe(-8);
  });

  it("flags improving runway / savings crossings with positive estimates", () => {
    const result = detectScoreRelevantChanges(
      { dti: 1, emergencyFund: 0, savingsRate: 0 },
      { dti: 1, emergencyFund: 2, savingsRate: 3 },
    );
    expect(result.changes.map((c) => c.metric)).toEqual(["emergencyFund", "savingsRate"]);
    expect(result.changes.every((c) => c.direction === "improved")).toBe(true);
    expect(result.estimatedPointImpact).toBe(
      2 * ESTIMATED_POINTS_PER_BAND.emergencyFund + 3 * ESTIMATED_POINTS_PER_BAND.savingsRate,
    );
  });

  it("nets mixed movement across metrics", () => {
    const result = detectScoreRelevantChanges(
      { dti: 2, emergencyFund: 0, savingsRate: 1 },
      { dti: 1, emergencyFund: 1, savingsRate: 1 },
    );
    expect(result.estimatedPointImpact).toBe(
      ESTIMATED_POINTS_PER_BAND.dti + ESTIMATED_POINTS_PER_BAND.emergencyFund,
    );
  });

  it("produces a stable signature keyed to the change legs", () => {
    const a = detectScoreRelevantChanges(
      { dti: 0, emergencyFund: 1, savingsRate: 1 },
      { dti: 1, emergencyFund: 1, savingsRate: 1 },
    );
    const b = detectScoreRelevantChanges(
      { dti: 0, emergencyFund: 1, savingsRate: 1 },
      { dti: 2, emergencyFund: 1, savingsRate: 1 },
    );
    expect(scoreTriggerSignature(a, "2026-08-01")).not.toBe(scoreTriggerSignature(b, "2026-08-01"));
    expect(scoreTriggerSignature(a, "2026-08-01")).toBe(scoreTriggerSignature(a, "2026-08-01"));
    expect(scoreTriggerSignature(a, "2026-08-01")).not.toBe(scoreTriggerSignature(a, "2026-09-01"));
  });
});

describe("checkLiveScoreTriggers", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns null when no assessment is stored", () => {
    seedFinance(finance({}));
    expect(checkLiveScoreTriggers()).toBeNull();
  });

  it("returns null when finance numbers were never saved (defaults are not the user's numbers)", () => {
    seedAssessment({ debtToIncomeRatio: 0.3, emergencyFundMonths: 2, savingsRate: 0.1 });
    expect(checkLiveScoreTriggers()).toBeNull();
  });

  it("returns null when the stored baseline is unreadable", () => {
    seedAssessment({ decisionType: "home" });
    seedFinance(finance({}));
    expect(checkLiveScoreTriggers()).toBeNull();
  });

  it("reports changed:false when finance numbers sit in the same bands as the assessment", () => {
    // Assessment: DTI 30% (band 1), EF 2mo (band 1), savings 8% (band 1).
    seedAssessment({ debtToIncomeRatio: 0.3, emergencyFundMonths: 2, savingsRate: 0.08 });
    // Finance: DTI 32% (band 1), runway ~2.1mo (band 1), savings 8% (band 1).
    seedFinance(
      finance({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        monthlyDebtPayments: 1600,
        liquidSavings: 9600,
      }),
    );
    const result = checkLiveScoreTriggers();
    expect(result).not.toBeNull();
    expect(result?.changed).toBe(false);
  });

  it("detects a DTI band crossing against the stored assessment", () => {
    // Assessment: DTI 30% → band 1.
    seedAssessment({ debtToIncomeRatio: 0.3, emergencyFundMonths: 2, savingsRate: 0.08 });
    // Finance now: DTI 5% → band 0 (improved). EF: 16000/(3000+250) ≈ 4.9mo → band 2 (improved). Savings: (5000-3000-250)/5000 = 35% → band 3 (improved).
    seedFinance(
      finance({
        monthlyIncome: 5000,
        monthlyExpenses: 3000,
        monthlyDebtPayments: 250,
        liquidSavings: 16000,
      }),
    );
    const result = checkLiveScoreTriggers();
    expect(result?.changed).toBe(true);
    expect(result?.changes.map((c) => c.metric)).toEqual([
      "dti",
      "emergencyFund",
      "savingsRate",
    ]);
    const dti = result?.changes.find((c) => c.metric === "dti");
    expect(dti).toMatchObject({ oldBand: 1, newBand: 0, direction: "improved" });
  });
});
