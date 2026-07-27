import { describe, expect, it } from "vitest";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import {
  buildReadinessPath,
  computeBindingProgress,
  computePathFreshness,
  setPathStepStatus,
  pathCompletionRatio,
  normalizeReadinessPath,
  ASSESSMENT_STALE_DAYS,
} from "@/lib/readiness";

const SAFE_BASE: AssessmentInputs = {
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
  monthlyHousingRatio: 0.3,
};

let seq = 0;
const idFactory = () => () => `id-${++seq}`;

describe("computeBindingProgress", () => {
  it("reports runway progress from finance snapshot", () => {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.4 });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    const progress = computeBindingProgress(path, result, {
      netCashFlow: 200,
      runwayMonths: 0.5,
      monthlyExpenses: 4000,
      liquidSavings: 2000,
      monthlyDebtPayments: 0,
      monthlyIncome: 6000,
    });
    expect(progress.code).toBe("RUNWAY_UNDER_1_MONTH");
    expect(progress.cleared).toBe(false);
    expect(progress.current).toBe(0.5);
    expect(progress.target).toBe(1);
    expect(progress.ratio).toBe(0.5);
  });

  it("marks gate clear when hard-stop absent after reassess", () => {
    const blocked = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.4 });
    const path = buildReadinessPath(blocked, { idFactory: idFactory() });
    const clear = computeScore(SAFE_BASE);
    const progress = computeBindingProgress(path, clear, {
      netCashFlow: 500,
      runwayMonths: 6,
      monthlyExpenses: 3000,
      liquidSavings: 20000,
      monthlyDebtPayments: 200,
      monthlyIncome: 7000,
    });
    expect(progress.cleared).toBe(true);
  });
});

describe("computePathFreshness", () => {
  it("flags stale assessment", () => {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });
    const old = new Date();
    old.setDate(old.getDate() - (ASSESSMENT_STALE_DAYS + 10));
    const path = buildReadinessPath(result, {
      idFactory: idFactory(),
      assessmentCompletedAt: old.toISOString(),
      now: new Date(),
    });
    // createdAt is now; force old assessment only
    const freshness = computePathFreshness(
      { ...path, assessmentCompletedAt: old.toISOString() },
      { now: new Date() },
    );
    expect(freshness.isStale).toBe(true);
    expect(freshness.reasons.some((r) => /assessment/i.test(r))).toBe(true);
  });
});

describe("step completion", () => {
  it("setPathStepStatus marks done and pathCompletionRatio rises", () => {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    expect(path.steps[0].status).toBe("pending");
    const next = setPathStepStatus(path, path.steps[0].id, "done");
    expect(next.steps[0].status).toBe("done");
    expect(next.steps[0].completedAt).toBeTruthy();
    expect(pathCompletionRatio(next)).toBeGreaterThan(pathCompletionRatio(path));
  });

  it("normalizeReadinessPath fills missing status for legacy paths", () => {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    const legacy = {
      ...path,
      steps: path.steps.map(({ status: _s, completedAt: _c, ...rest }) => rest),
      calendarCommittedAt: undefined,
    };
    const normalized = normalizeReadinessPath(legacy);
    expect(normalized).not.toBeNull();
    expect(normalized!.steps.every((s) => s.status === "pending")).toBe(true);
    expect(normalized!.calendarCommittedAt).toBeNull();
  });
});
