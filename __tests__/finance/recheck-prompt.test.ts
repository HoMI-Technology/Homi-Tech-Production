// @vitest-environment jsdom

import { afterEach, describe, expect, it } from "vitest";
import {
  bandsFromAssessmentInputs,
  bandsFromMoneyPicture,
  classifyDtiBand,
  crossingKey,
  detectBandCrossing,
  dismissBandCrossing,
  MONEY_RECHECK_PROMPT,
  shouldPromptRecheck,
} from "@/lib/finance/recheck-prompt";

afterEach(() => {
  window.localStorage.clear();
});

const AT = "2026-03-15T12:00:00.000Z";

describe("money re-check — band-cross only", () => {
  it("uses the locked prompt and does not write a score", () => {
    expect(MONEY_RECHECK_PROMPT).toBe("Your money picture changed. Re-check readiness?");
    expect(MONEY_RECHECK_PROMPT).not.toMatch(/moved|when you want/);
  });

  it("hides when there is no last assessment or money is unchanged", () => {
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
    expect(shouldPromptRecheck(from, to, AT)).toBeNull();
    expect(shouldPromptRecheck(from, to, null)).toBeNull();
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
    expect(shouldPromptRecheck(from, to, AT)).not.toBeNull();
    expect(crossingKey(crossing!)).toContain("→");
  });

  it("Not now hides the same numbers until a new 45-q or score-relevant Money save", () => {
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
    const crossing = detectBandCrossing(from, to)!;
    dismissBandCrossing(crossing, AT);
    expect(shouldPromptRecheck(from, to, AT)).toBeNull();
    expect(shouldPromptRecheck(from, to, "2026-04-01T00:00:00.000Z")).not.toBeNull();
    const later = bandsFromMoneyPicture({
      dtiPercent: 20,
      emergencyFundMonths: 6,
      savingsRatePercent: 21,
    });
    expect(shouldPromptRecheck(from, later, AT)).not.toBeNull();
  });

  it("classifies hard-stop DTI separately from the else band", () => {
    expect(classifyDtiBand(0.48, "ratio")).toBe("dti_else");
    expect(classifyDtiBand(0.51, "ratio")).toBe("dti_hard");
  });
});
