import { describe, expect, it } from "vitest";
import { mapHomeBuyingResponses } from "@/lib/questions/to-inputs";
import {
  proveHomeBuyingCoverage,
  hasRealBankAnswer,
} from "@/lib/questions/adaptive-home";
import {
  IncompleteHomeCoverageError,
  mapCoveredHomeBuyingResponses,
} from "@/lib/questions/coverage-map";
import type { ResponseValue } from "@/lib/questions/bank";

const EMPTY_CONFLICT = { referralSource: null, deadlineOrigin: null } as const;

const CORE_WITH_ET: Record<string, ResponseValue> = {
  fin_income: 10000,
  fin_debt_payments: 2000,
  fin_down_payment: "20_plus",
  fin_emergency_fund: "6_plus",
  fin_credit_score: "good",
  fin_savings_total: 48000,
  fin_housing_budget: "25_28",
  emo_confidence: 7,
  emo_lifestyle_ready: 8,
  emo_partner_alignment: "fully_aligned",
  emo_fomo: "genuine",
  tim_timeline: "12_24",
  tim_urgency: 5,
};

const CORE_ET_SKIPPED: Record<string, ResponseValue> = {
  fin_income: 10000,
  fin_debt_payments: 2000,
  fin_down_payment: "20_plus",
  fin_emergency_fund: "6_plus",
  fin_credit_score: "excellent",
  fin_savings_total: 48000,
  fin_housing_budget: "25_28",
  tim_timeline: "12_24",
  tim_urgency: 5,
};

describe("home buying coverage proof — mapper defaults are not answers", () => {
  it("rejects an empty response map even though the mapper emits valid AssessmentInputs", () => {
    const mapped = mapHomeBuyingResponses({}, EMPTY_CONFLICT);
    expect(mapped.debtToIncomeRatio).toBe(0);
    expect(mapped.confidenceLevel).toBe(5);
    expect(mapped.selfReportedCreditBand).toBe("skipped");

    const proof = proveHomeBuyingCoverage({}, false);
    expect(proof.complete).toBe(false);
    expect(proof.gaps).toEqual(
      expect.arrayContaining([
        "fin_income",
        "fin_down_payment",
        "fin_credit_score",
        "emo_confidence",
        "tim_timeline",
      ]),
    );
    expect(() => mapCoveredHomeBuyingResponses({}, EMPTY_CONFLICT, false)).toThrow(
      IncompleteHomeCoverageError,
    );
  });

  it("accepts real core answers and maps through mapHomeBuyingResponses", () => {
    const proof = proveHomeBuyingCoverage(CORE_WITH_ET, false);
    expect(proof.complete).toBe(true);
    expect(proof.gaps).toEqual([]);
    const { inputs } = mapCoveredHomeBuyingResponses(CORE_WITH_ET, EMPTY_CONFLICT, false);
    expect(inputs.creditScoreProvenance).toBe("band_ignored");
    expect(inputs.selfReportedCreditBand).toBe("good");
    expect(inputs.creditScore).toBe(650);
  });

  it("treats Money-confirm keys in responses as real answers, not silent defaults", () => {
    const moneySeeded: Record<string, ResponseValue> = {
      fin_income: 7200,
      fin_debt_payments: 900,
      fin_savings_total: 12000,
      fin_emergency_fund: "2_3",
      fin_down_payment: "10_14",
    };
    expect(hasRealBankAnswer(moneySeeded, "fin_income")).toBe(true);
    expect(hasRealBankAnswer({}, "fin_income")).toBe(false);
    const proof = proveHomeBuyingCoverage(moneySeeded, true);
    expect(proof.gaps).not.toContain("fin_income");
    expect(proof.gaps).toEqual(
      expect.arrayContaining(["fin_credit_score", "fin_housing_budget", "tim_timeline"]),
    );
  });

  it("ET skip requires no emo_* keys and does not fake emotional answers", () => {
    expect(proveHomeBuyingCoverage(CORE_ET_SKIPPED, true).complete).toBe(true);
    expect(
      proveHomeBuyingCoverage({ ...CORE_ET_SKIPPED, emo_confidence: 7 }, true).complete,
    ).toBe(false);
    expect(
      proveHomeBuyingCoverage({ ...CORE_ET_SKIPPED, emo_confidence: 7 }, true).gaps,
    ).toContain("emo_present_while_skipped");

    const { inputs } = mapCoveredHomeBuyingResponses(CORE_ET_SKIPPED, EMPTY_CONFLICT, true);
    expect(Object.keys(CORE_ET_SKIPPED).some((k) => k.startsWith("emo_"))).toBe(false);
    expect(inputs.lifeStability).toBe(5);
  });

  it("partner solo is a real emo_partner_alignment answer — not ET skip", () => {
    const solo = { ...CORE_WITH_ET, emo_partner_alignment: "solo" };
    const proof = proveHomeBuyingCoverage(solo, false);
    expect(proof.complete).toBe(true);
    expect(proof.emotionalSkipped).toBe(false);
    const { inputs } = mapCoveredHomeBuyingResponses(solo, EMPTY_CONFLICT, false);
    expect(inputs.partnerAlignment).toBeNull();
  });

  it("credit unknown is a real bank answer that stays band_ignored — not a skipped pillar", () => {
    const credit = { ...CORE_WITH_ET, fin_credit_score: "unknown" };
    expect(proveHomeBuyingCoverage(credit, false).complete).toBe(true);
    const { inputs } = mapCoveredHomeBuyingResponses(credit, EMPTY_CONFLICT, false);
    expect(inputs.creditScoreProvenance).toBe("band_ignored");
    expect(inputs.selfReportedCreditBand).toBe("skipped");
  });

  it("accepts emo_clarity in place of emo_lifestyle_ready when ET is on the path", () => {
    const { emo_lifestyle_ready: _dropped, ...rest } = CORE_WITH_ET;
    void _dropped;
    expect(proveHomeBuyingCoverage(rest, false).complete).toBe(false);
    expect(proveHomeBuyingCoverage({ ...rest, emo_clarity: 6 }, false).complete).toBe(true);
  });

  it("requires fin_dti_ratio when income is answered as 0 and debt is missing", () => {
    const withoutDebt: Record<string, ResponseValue> = { ...CORE_WITH_ET, fin_income: 0 };
    delete withoutDebt.fin_debt_payments;
    expect(proveHomeBuyingCoverage(withoutDebt, false).complete).toBe(false);
    expect(
      proveHomeBuyingCoverage({ ...withoutDebt, fin_dti_ratio: "20_28" }, false).complete,
    ).toBe(true);
  });
});
