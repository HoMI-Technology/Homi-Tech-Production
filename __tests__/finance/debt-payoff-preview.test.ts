import { describe, expect, it } from "vitest";
import {
  DEBT_PAYOFF_NOT_SCORE,
  DTI_BETTER_BAND,
  DTI_WORSE_BAND,
  HARD_STOP_REMAINS,
  RUNWAY_BETTER_BAND,
  RUNWAY_WORSE_BAND,
  debtPayoffPreviewLines,
} from "@/lib/finance/debt-payoff-preview";

const LOCKED = new Set([
  DEBT_PAYOFF_NOT_SCORE,
  DTI_BETTER_BAND,
  DTI_WORSE_BAND,
  HARD_STOP_REMAINS,
  RUNWAY_BETTER_BAND,
  RUNWAY_WORSE_BAND,
]);

describe("debt-payoff preview — locked shapes", () => {
  it("always names that this is not the Decision Readiness Score", () => {
    const lines = debtPayoffPreviewLines({
      monthlyIncome: null,
      currentMonthlyDebt: null,
      remainingMonthlyDebt: null,
      currentRunwayMonths: null,
      projectedRunwayMonths: null,
    });
    expect(lines).toEqual([DEBT_PAYOFF_NOT_SCORE]);
  });

  it("uses better / worse / hard-stop shapes without points or 0–100", () => {
    const better = debtPayoffPreviewLines({
      monthlyIncome: 8000,
      currentMonthlyDebt: 3600,
      remainingMonthlyDebt: 0,
      currentRunwayMonths: 2,
      projectedRunwayMonths: 6,
    });
    expect(better).toContain(DEBT_PAYOFF_NOT_SCORE);
    expect(better).toContain(DTI_BETTER_BAND);
    expect(better).toContain(RUNWAY_BETTER_BAND);
    for (const line of better) {
      expect(LOCKED.has(line)).toBe(true);
      expect(line).not.toMatch(/\+7|0–100|0-100|\b28\b|\b36\b/);
    }

    const hard = debtPayoffPreviewLines({
      monthlyIncome: 4000,
      currentMonthlyDebt: 2400,
      remainingMonthlyDebt: 2200,
      currentRunwayMonths: 0.5,
      projectedRunwayMonths: 0.4,
    });
    expect(hard).toContain(HARD_STOP_REMAINS);

    const worse = debtPayoffPreviewLines({
      monthlyIncome: 8000,
      currentMonthlyDebt: 800,
      remainingMonthlyDebt: 4000,
      currentRunwayMonths: 6,
      projectedRunwayMonths: 2,
    });
    expect(worse).toContain(DTI_WORSE_BAND);
    expect(worse).toContain(RUNWAY_WORSE_BAND);
  });
});
