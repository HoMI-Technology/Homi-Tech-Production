import { describe, it, expect } from "vitest";
import {
  bankResponsesToInputs,
  mapHomeBuyingResponses,
  UnmappedDecisionTypeError,
} from "@/lib/questions/to-inputs";
import { computeScore } from "@/lib/scoring";
import type { ResponseValue } from "@/lib/questions/bank";
import type { DecisionType } from "@/lib/assessment/types";

const EMPTY_CONFLICT = { referralSource: null, deadlineOrigin: null } as const;

/** Rich home-buying fixture used for mapper + score-parity DoD (Plans.md 5.5). */
const HOME_FIXTURE_RESPONSES: Record<string, ResponseValue> = {
  fin_income: 10000,
  fin_debt_payments: 2000,
  fin_down_payment: "20_plus",
  fin_emergency_fund: "6_plus",
  fin_credit_score: "excellent",
  fin_savings_total: 48000,
  fin_housing_budget: "25_28",
  emo_confidence: 7,
  emo_lifestyle_ready: 8,
  emo_partner_alignment: "fully_aligned",
  emo_fomo: "genuine",
  tim_timeline: "12_24",
  tim_urgency: 5,
};

describe("bankResponsesToInputs", () => {
  it("derives DTI from income and debt when both are present", () => {
    const inputs = bankResponsesToInputs(
      { fin_income: 10000, fin_debt_payments: 2000 },
      EMPTY_CONFLICT,
      "home_buying",
    );
    expect(inputs.debtToIncomeRatio).toBeCloseTo(0.2);
  });

  it("stores the credit band and does not map good→730 or award 5 credit points", () => {
    const inputs = bankResponsesToInputs(
      { fin_credit_score: "good" },
      EMPTY_CONFLICT,
      "home_buying",
    );
    expect(inputs.creditScoreProvenance).toBe("band_ignored");
    expect(inputs.selfReportedCreditBand).toBe("good");
    expect(inputs.creditScore).not.toBe(730);
    const result = computeScore(inputs);
    expect(result.financial.creditHealth).toBe(0);
  });

  it("maps down payment choice to a percent", () => {
    const inputs = bankResponsesToInputs(
      { fin_down_payment: "20_plus" },
      EMPTY_CONFLICT,
      "home_buying",
    );
    expect(inputs.downPaymentPercent).toBeCloseTo(0.22);
  });

  it("carries conflict fields through when provided", () => {
    const inputs = bankResponsesToInputs(
      {},
      { referralSource: "lender", deadlineOrigin: "external" },
      "home_buying",
    );
    expect(inputs.referralSource).toBe("lender");
    expect(inputs.deadlineOrigin).toBe("external");
  });

  it("dispatches home_buying to the home mapper (behavior-identical)", () => {
    const viaRegistry = bankResponsesToInputs(
      HOME_FIXTURE_RESPONSES,
      { referralSource: "me", deadlineOrigin: "mine" },
      "home_buying",
    );
    const viaHome = mapHomeBuyingResponses(HOME_FIXTURE_RESPONSES, {
      referralSource: "me",
      deadlineOrigin: "mine",
    });
    expect(viaRegistry).toEqual(viaHome);
  });

  it("hard-rejects unmapped decision verticals (no home fallthrough)", () => {
    // "car" moved out of this list in 5.7 — it now has a registered mapper.
    const unmapped: DecisionType[] = ["career_change", "education", "starting_a_business"];
    for (const decisionType of unmapped) {
      expect(() =>
        bankResponsesToInputs(HOME_FIXTURE_RESPONSES, EMPTY_CONFLICT, decisionType),
      ).toThrow(UnmappedDecisionTypeError);
      try {
        bankResponsesToInputs(HOME_FIXTURE_RESPONSES, EMPTY_CONFLICT, decisionType);
      } catch (err) {
        expect(err).toBeInstanceOf(UnmappedDecisionTypeError);
        expect((err as UnmappedDecisionTypeError).decisionType).toBe(decisionType);
      }
    }
  });
});

describe("home fixture score parity (Plans.md 5.5 DoD)", () => {
  it("maps the home fixture to frozen AssessmentInputs", () => {
    const inputs = bankResponsesToInputs(
      HOME_FIXTURE_RESPONSES,
      { referralSource: "me", deadlineOrigin: "mine" },
      "home_buying",
    );

    expect(inputs).toEqual({
      debtToIncomeRatio: 0.2,
      downPaymentPercent: 0.22,
      emergencyFundMonths: 8,
      creditScore: 650,
      creditScoreProvenance: "band_ignored",
      selfReportedCreditBand: "excellent",
      lifeStability: 8,
      confidenceLevel: 7,
      partnerAlignment: 9,
      fomoLevel: 2,
      timeHorizonMonths: 18,
      savingsRate: 0.2,
      downPaymentProgress: 1,
      monthlyHousingRatio: 0.265,
      referralSource: "me",
      deadlineOrigin: "mine",
      dtiProvenance: "self_report",
      downPaymentProvenance: "self_report",
      runwayProvenance: "self_report",
    });
  });

  it("scores the home fixture identically via the frozen engine", () => {
    // Score via computeScore in-test (server-only stubbed by vitest). Proves
    // mapper output → engine is stable without editing lib/scoring/*.
    const inputs = bankResponsesToInputs(
      HOME_FIXTURE_RESPONSES,
      { referralSource: "me", deadlineOrigin: "mine" },
      "home_buying",
    );
    const result = computeScore(inputs);

    expect(result.hardStops).toEqual([]);
    expect({
      score: result.score,
      verdict: result.verdict,
      financial: result.financial.total,
      emotional: result.emotional.total,
      timing: result.timing.total,
    }).toEqual({
      score: 86,
      verdict: "READY",
      financial: 28,
      emotional: 28,
      timing: 30,
    });
    expect(result.financial.creditHealth).toBe(0);
  });
});
