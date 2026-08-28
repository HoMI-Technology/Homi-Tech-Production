import { describe, expect, it } from "vitest";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import {
  buildReadinessPath,
  formatPathEventNotes,
  parsePathMarker,
  isPathCalendarEvent,
  pathStepEventDate,
  HARD_STOP_ORDER,
  MAX_PATH_STEPS,
  FIRST_STEP_MAX_DAYS,
  bindingConstraintLabel,
  pathDisplayVerdict,
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
function idFactory(): () => string {
  return () => `id-${++seq}`;
}

describe("buildReadinessPath", () => {
  it("READY with no hard-stops → ready_optional, no forced homework pile", () => {
    const result = computeScore(SAFE_BASE);
    expect(result.verdict).toBe("READY");
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    expect(path.mode).toBe("ready_optional");
    expect(path.bindingConstraint).toBe("READY_CELEBRATE");
    expect(path.steps.length).toBeLessThanOrEqual(2);
    expect(
      path.steps.every(
        (s) =>
          s.reasonCode === "MAINTENANCE" ||
          s.reasonCode === "READY_CELEBRATE" ||
          s.daysFromNow >= 30,
      ),
    ).toBe(true);
  });

  it("orders RUNWAY hard-stop as binding constraint first", () => {
    const result = computeScore({
      ...SAFE_BASE,
      emergencyFundMonths: 0.5,
      creditScore: 600,
    });
    expect(result.hardStops.some((h) => h.code === "RUNWAY_UNDER_1_MONTH")).toBe(true);
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    expect(path.mode).toBe("build");
    expect(path.bindingConstraint).toBe("RUNWAY_UNDER_1_MONTH");
    expect(path.steps[0].reasonCode).toBe("RUNWAY_UNDER_1_MONTH");
    expect(path.steps[0].href).toBe("/tools/runway");
    expect(path.steps[0].daysFromNow).toBeLessThanOrEqual(FIRST_STEP_MAX_DAYS);
  });

  it("pathDisplayVerdict forces NOT_YET when a frozen path still carries ALMOST_THERE", () => {
    const result = computeScore({
      ...SAFE_BASE,
      emergencyFundMonths: 0.5,
    });
    expect(result.verdict).toBe("NOT_YET");
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    const leaked = { ...path, verdict: "ALMOST_THERE" as const, score: 65 };
    expect(pathDisplayVerdict(leaked)).toBe("NOT_YET");
  });

  it("respects HARD_STOP_ORDER when multiple fire", () => {
    const result = computeScore({
      ...SAFE_BASE,
      emergencyFundMonths: 0.2,
      debtToIncomeRatio: 0.55,
      creditScore: 580,
      monthlyHousingRatio: 0.5,
    });
    const codes = result.hardStops.map((h) => h.code);
    expect(codes.length).toBeGreaterThan(1);
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    const stepCodes = path.steps
      .map((s) => s.reasonCode)
      .filter((c) => (HARD_STOP_ORDER as readonly string[]).includes(c));
    // First path hard-stop should be highest priority present
    const orderedPresent = HARD_STOP_ORDER.filter((c) => codes.includes(c));
    expect(stepCodes[0]).toBe(orderedPresent[0]);
  });

  it("negative cash flow becomes first step when finance provided", () => {
    const result = computeScore({
      ...SAFE_BASE,
      // weaken a bit so not READY-only path
      savingsRate: 0.05,
      downPaymentProgress: 0.3,
      emergencyFundMonths: 3,
    });
    const path = buildReadinessPath(result, {
      idFactory: idFactory(),
      finance: {
        netCashFlow: -400,
        runwayMonths: 2,
        monthlyExpenses: 4000,
        liquidSavings: 8000,
        monthlyDebtPayments: 500,
        monthlyIncome: 4100,
      },
    });
    expect(path.confidence).toBe("assessment_plus_finance");
    expect(path.steps[0].reasonCode).toBe("NEGATIVE_CASHFLOW");
    expect(path.steps[0].href).toBe("/money");
  });

  it("assessment_only confidence when no finance snapshot", () => {
    const result = computeScore({
      ...SAFE_BASE,
      emergencyFundMonths: 2,
      savingsRate: 0.08,
      downPaymentProgress: 0.4,
    });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    expect(path.confidence).toBe("assessment_only");
  });

  it("caps steps at MAX_PATH_STEPS and always includes reassess in build mode", () => {
    const result = computeScore({
      ...SAFE_BASE,
      emergencyFundMonths: 0.5,
      debtToIncomeRatio: 0.52,
      creditScore: 600,
      monthlyHousingRatio: 0.5,
      lifeStability: 3,
      confidenceLevel: 3,
      partnerAlignment: 2,
      fomoLevel: 9,
      timeHorizonMonths: 2,
      savingsRate: 0.02,
      downPaymentProgress: 0.1,
    });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    expect(path.mode).toBe("build");
    expect(path.steps.length).toBeLessThanOrEqual(MAX_PATH_STEPS);
    expect(path.steps.some((s) => s.reasonCode === "REASSESS")).toBe(true);
  });

  it("includes disclaimer on path and educational notes", () => {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    expect(path.disclaimer.toLowerCase()).toContain("not a commitment to lend");
    expect(path.steps[0].notes.toLowerCase()).toMatch(/protect|education|lend/);
  });

  it("partner alignment step when emotional gap + low partner score", () => {
    const result = computeScore({
      ...SAFE_BASE,
      lifeStability: 4,
      confidenceLevel: 4,
      partnerAlignment: 2,
      fomoLevel: 8,
      // keep financial solid so emotional is weakest
      debtToIncomeRatio: 0.2,
      emergencyFundMonths: 8,
      creditScore: 780,
      downPaymentPercent: 0.25,
      downPaymentProgress: 0.9,
      savingsRate: 0.25,
    });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    if (path.mode === "build") {
      const hasPartner = path.steps.some((s) => s.reasonCode === "PARTNER_ALIGNMENT");
      const hasEmotional = path.steps.some(
        (s) => s.reasonCode === "PILLAR_EMOTIONAL" || s.reasonCode === "PARTNER_ALIGNMENT",
      );
      expect(hasPartner || hasEmotional).toBe(true);
    }
  });
});

describe("calendar markers", () => {
  it("round-trips path/step ids in notes", () => {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    const step = path.steps[0];
    const notes = formatPathEventNotes(path, step);
    expect(isPathCalendarEvent(notes)).toBe(true);
    expect(parsePathMarker(notes)).toEqual({ pathId: path.id, stepId: step.id });
  });

  it("pathStepEventDate uses local calendar arithmetic", () => {
    const result = computeScore({ ...SAFE_BASE, emergencyFundMonths: 0.5 });
    const path = buildReadinessPath(result, { idFactory: idFactory() });
    const from = new Date(2026, 0, 15); // Jan 15 2026 local
    const step = { ...path.steps[0], daysFromNow: 3 };
    expect(pathStepEventDate(step, from)).toBe("2026-01-18");
  });
});

describe("bindingConstraintLabel", () => {
  it("labels known codes", () => {
    expect(bindingConstraintLabel("RUNWAY_UNDER_1_MONTH")).toMatch(/runway/i);
    expect(bindingConstraintLabel("READY_CELEBRATE")).toMatch(/READY/i);
  });
});
