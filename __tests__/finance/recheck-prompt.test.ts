import { describe, expect, it } from "vitest";
import {
  bandsFromAssessmentInputs,
  bandsFromMoneyPicture,
  classifyDtiBand,
  crossingKey,
  detectBandCrossing,
  MONEY_RECHECK_PROMPT,
  shouldPromptRecheck,
} from "@/lib/finance/recheck-prompt";

describe("money re-check — band-cross only", () => {
  it("uses the locked prompt and does not write a score", () => {
    expect(MONEY_RECHECK_PROMPT).toBe("Your money picture changed. Re-check readiness?");
    expect(MONEY_RECHECK_PROMPT).not.toMatch(/moved|when you want/);
  });

  it("does not prompt for an intra-band DTI move", () => {
    const from = bandsFromAssessmentInputs({
      debtToIncomeRatio: 0.3,
      emergencyFundMonths: 4,
      savingsRate: 0.12,
    });
    const to = bandsFromMoneyPicture({
      dtiPercent: 34,
      emergencyFundMonths: 4.2,
      savingsRatePercent: 11,
    });
    expect(detectBandCrossing(from, to)).toBeNull();
    expect(shouldPromptRecheck(from, to)).toBeNull();
  });

  it("prompts when a scoring band actually crosses", () => {
    const from = bandsFromAssessmentInputs({
      debtToIncomeRatio: 0.4,
      emergencyFundMonths: 2,
      savingsRate: 0.06,
    });
    const to = bandsFromMoneyPicture({
      dtiPercent: 27,
      emergencyFundMonths: 2,
      savingsRatePercent: 6,
    });
    const crossing = detectBandCrossing(from, to);
    expect(crossing).not.toBeNull();
    expect(shouldPromptRecheck(from, to)).not.toBeNull();
    expect(crossingKey(crossing!)).toContain("→");
  });

  it("classifies hard-stop DTI separately from the else band", () => {
    expect(classifyDtiBand(0.48, "ratio")).toBe("dti_else");
    expect(classifyDtiBand(0.51, "ratio")).toBe("dti_hard");
  });
});
