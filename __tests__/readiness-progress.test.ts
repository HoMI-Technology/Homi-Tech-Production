import { describe, expect, it } from "vitest";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import {
  buildReadinessPath,
  computeBindingProgress,
  computePathFreshness,
  setPathStepStatus,
  pathCompletionRatio,
  summarizePathResolution,
  normalizeReadinessPath,
  ASSESSMENT_STALE_DAYS,
  type ReadinessPath,
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

  it("counts skipped as resolved but keeps the detail honest about it", () => {
    const result = computeScore({
      ...SAFE_BASE,
      lifeStability: 4,
      confidenceLevel: 4,
      partnerAlignment: 3,
      fomoLevel: 8,
      savingsRate: 0.05,
      downPaymentProgress: 0.3,
    });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    // Only exercise the soft-pillar (completion-based) branch.
    if (
      !path.bindingConstraint ||
      (path.bindingConstraint as string).startsWith("PILLAR_") === false
    ) {
      return;
    }
    const actionable = path.steps.filter((s) => s.reasonCode !== "REASSESS");
    let next = setPathStepStatus(path, actionable[0].id, "done");
    if (actionable[1]) next = setPathStepStatus(next, actionable[1].id, "skipped");
    const progress = computeBindingProgress(next, null, null);
    expect(progress.detail).not.toMatch(/steps complete/);
    if (actionable[1]) {
      expect(progress.detail).toContain("1 skipped");
    }
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

  it("normalizeReadinessPath defaults missing step href to Home Build", () => {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    const legacy = {
      ...path,
      steps: path.steps.map(({ href: _h, status: _s, completedAt: _c, ...rest }) => rest),
    };
    const normalized = normalizeReadinessPath(legacy);
    expect(normalized).not.toBeNull();
    expect(normalized!.steps.every((s) => s.href === "/dashboard")).toBe(true);
  });
});

describe("summarizePathResolution", () => {
  function fixturePath(
    statuses: Array<{ status?: "pending" | "done" | "skipped"; reassess?: boolean }>,
    mode: ReadinessPath["mode"] = "build",
  ): ReadinessPath {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });
    const base = buildReadinessPath(result, { idFactory: idFactory() });
    return {
      ...base,
      mode,
      steps: statuses.map((s, i) => ({
        ...base.steps[0],
        id: `fx-${i}`,
        reasonCode: s.reassess ? "REASSESS" : "RUNWAY_UNDER_1_MONTH",
        status: s.status ?? "pending",
        completedAt: s.status === "done" ? new Date().toISOString() : null,
      })),
    };
  }

  it("splits actionable and reassessment counts with done/skipped/pending distinct", () => {
    const summary = summarizePathResolution(
      fixturePath([
        { status: "done" },
        { status: "skipped" },
        { status: "pending" },
        { status: "pending", reassess: true },
        { status: "done", reassess: true },
        { status: "skipped", reassess: true },
      ]),
    );
    expect(summary.actionable).toEqual({ total: 3, done: 1, skipped: 1, pending: 1 });
    expect(summary.reassessment).toEqual({ total: 3, done: 1, skipped: 1, pending: 1 });
  });

  it("completedRatio counts done only; resolvedRatio counts done + skipped", () => {
    const summary = summarizePathResolution(
      fixturePath([{ status: "done" }, { status: "skipped" }, { status: "pending" }, {}]),
    );
    expect(summary.completedRatio).toBeCloseTo(1 / 4);
    expect(summary.resolvedRatio).toBeCloseTo(2 / 4);
  });

  it("keeps count consistency: total = done + skipped + pending", () => {
    const summary = summarizePathResolution(
      fixturePath([{ status: "done" }, { status: "skipped" }, {}, { reassess: true }]),
    );
    for (const bucket of [summary.actionable, summary.reassessment]) {
      expect(bucket.total).toBe(bucket.done + bucket.skipped + bucket.pending);
    }
  });

  it("zero-step path → both ratios 0, never NaN", () => {
    const summary = summarizePathResolution(fixturePath([]));
    expect(summary.completedRatio).toBe(0);
    expect(summary.resolvedRatio).toBe(0);
    expect(Number.isFinite(summary.completedRatio)).toBe(true);
    expect(Number.isFinite(summary.resolvedRatio)).toBe(true);
  });

  it("reassessment-only path → ratios 0 (no vacuous all-complete)", () => {
    const summary = summarizePathResolution(fixturePath([{ status: "done", reassess: true }]));
    expect(summary.actionable.total).toBe(0);
    expect(summary.completedRatio).toBe(0);
    expect(summary.resolvedRatio).toBe(0);
  });

  it("ready_optional maintenance path is summarized like any other", () => {
    const summary = summarizePathResolution(fixturePath([{ status: "done" }], "ready_optional"));
    expect(summary.actionable.done).toBe(1);
    expect(summary.completedRatio).toBe(1);
  });

  it("legacy missing statuses normalize to pending before summarizing", () => {
    const path = fixturePath([{}, {}]);
    const legacy = {
      ...path,
      steps: path.steps.map(({ status: _s, completedAt: _c, ...rest }) => rest),
    };
    const normalized = normalizeReadinessPath(legacy)!;
    const summary = summarizePathResolution(normalized);
    expect(summary.actionable.pending).toBe(2);
    expect(summary.completedRatio).toBe(0);
  });
});
