import { describe, expect, it } from "vitest";
import { buildReadinessPath } from "@/lib/readiness";
import { exportPathMarkdown, exportPathJson } from "@/lib/readiness/export";
import { computeScore } from "@/lib/scoring/engine";
import type { AssessmentInputs } from "@/lib/scoring/public";

const SAFE: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 0.5,
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

describe("path export", () => {
  it("exports markdown with disclaimer and steps", () => {
    const path = buildReadinessPath(computeScore(SAFE));
    const md = exportPathMarkdown(path);
    expect(md).toMatch(/Path to Ready/);
    expect(md).toMatch(/Disclaimer|Educational|commitment to lend/i);
    expect(md.length).toBeGreaterThan(100);
  });

  it("exports valid JSON envelope", () => {
    const path = buildReadinessPath(computeScore(SAFE));
    const parsed = JSON.parse(exportPathJson(path)) as { path: { id: string } };
    expect(parsed.path.id).toBe(path.id);
  });
});
