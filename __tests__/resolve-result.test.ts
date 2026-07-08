import { describe, it, expect } from "vitest";
import { pickResult } from "@/lib/assessment/resolveResult";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import type { StoredAssessment } from "@/lib/assessment/storage";

const BASE_INPUTS: AssessmentInputs = {
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

function makeStored(completedAt: string, overrides: Partial<StoredAssessment> = {}): StoredAssessment {
  return {
    inputs: BASE_INPUTS,
    result: computeScore(BASE_INPUTS),
    completedAt,
    kind: "full",
    ...overrides,
  };
}

describe("pickResult", () => {
  it("returns local when local is newer than remote", () => {
    const local = makeStored("2026-07-08T12:00:00.000Z");
    const remote = makeStored("2026-07-01T12:00:00.000Z");
    expect(pickResult(local, remote)).toBe(local);
  });

  it("returns remote when remote is newer than local", () => {
    const local = makeStored("2026-07-01T12:00:00.000Z");
    const remote = makeStored("2026-07-08T12:00:00.000Z");
    expect(pickResult(local, remote)).toBe(remote);
  });

  it("returns remote when local is null", () => {
    const remote = makeStored("2026-07-08T12:00:00.000Z");
    expect(pickResult(null, remote)).toBe(remote);
  });

  it("returns local when remote is null", () => {
    const local = makeStored("2026-07-08T12:00:00.000Z");
    expect(pickResult(local, null)).toBe(local);
  });

  it("returns null when both are null", () => {
    expect(pickResult(null, null)).toBeNull();
  });

  it("returns local on a timestamp tie", () => {
    const timestamp = "2026-07-08T12:00:00.000Z";
    const local = makeStored(timestamp);
    const remote = makeStored(timestamp);
    expect(pickResult(local, remote)).toBe(local);
  });
});
