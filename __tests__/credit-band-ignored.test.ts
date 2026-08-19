import { describe, expect, it } from "vitest";
import { bankResponsesToInputs } from "@/lib/questions/to-inputs";
import { computeScore } from "@/lib/scoring";
import type { ResponseValue } from "@/lib/questions/bank";

const EMPTY_CONFLICT = { referralSource: null, deadlineOrigin: null } as const;

const HOME_BASE: Record<string, ResponseValue> = {
  fin_income: 10000,
  fin_debt_payments: 2000,
  fin_down_payment: "20_plus",
  fin_emergency_fund: "6_plus",
  fin_savings_total: 48000,
  emo_confidence: 7,
  emo_lifestyle_ready: 8,
  emo_partner_alignment: "fully_aligned",
  emo_fomo: "genuine",
  tim_timeline: "12_24",
  tim_urgency: 5,
};

function scoreHomeCredit(band?: string) {
  const responses = band
    ? { ...HOME_BASE, fin_credit_score: band }
    : { ...HOME_BASE };
  const inputs = bankResponsesToInputs(responses, EMPTY_CONFLICT, "home_buying");
  return { inputs, result: computeScore(inputs) };
}

describe("Ticket 1 — home credit band does not invent a FICO", () => {
  it("excellent → creditHealth 0, no CREDIT_UNDER_620, band stored", () => {
    const { inputs, result } = scoreHomeCredit("excellent");
    expect(inputs.creditScoreProvenance).toBe("band_ignored");
    expect(inputs.selfReportedCreditBand).toBe("excellent");
    expect(inputs.creditScore).not.toBe(780);
    expect(result.financial.creditHealth).toBe(0);
    expect(result.hardStops.map((h) => h.code)).not.toContain("CREDIT_UNDER_620");
    expect(result.provenance?.credit).toBe("band_ignored");
  });

  it("good → creditHealth 0, no CREDIT_UNDER_620, band stored", () => {
    const { inputs, result } = scoreHomeCredit("good");
    expect(inputs.selfReportedCreditBand).toBe("good");
    expect(inputs.creditScore).not.toBe(730);
    expect(result.financial.creditHealth).toBe(0);
    expect(result.hardStops.map((h) => h.code)).not.toContain("CREDIT_UNDER_620");
  });

  it("poor → creditHealth 0, CREDIT_UNDER_620 fires, band stored", () => {
    const { inputs, result } = scoreHomeCredit("poor");
    expect(inputs.selfReportedCreditBand).toBe("poor");
    expect(result.financial.creditHealth).toBe(0);
    expect(result.hardStops.map((h) => h.code)).toContain("CREDIT_UNDER_620");
    expect(result.verdict).toBe("NOT_YET");
  });

  it("very_poor → creditHealth 0, CREDIT_UNDER_620 fires, band stored", () => {
    const { inputs, result } = scoreHomeCredit("very_poor");
    expect(inputs.selfReportedCreditBand).toBe("very_poor");
    expect(result.financial.creditHealth).toBe(0);
    expect(result.hardStops.map((h) => h.code)).toContain("CREDIT_UNDER_620");
  });

  it("unknown → creditHealth 0, no hard stop (today's 650 path)", () => {
    const { inputs, result } = scoreHomeCredit("unknown");
    expect(inputs.selfReportedCreditBand).toBe("skipped");
    expect(result.financial.creditHealth).toBe(0);
    expect(result.hardStops.map((h) => h.code)).not.toContain("CREDIT_UNDER_620");
  });

  it("missing credit answer → creditHealth 0, no hard stop", () => {
    const { inputs, result } = scoreHomeCredit();
    expect(inputs.selfReportedCreditBand).toBe("skipped");
    expect(result.financial.creditHealth).toBe(0);
    expect(result.hardStops.map((h) => h.code)).not.toContain("CREDIT_UNDER_620");
  });

  it("a real digit still scores when provenance is not band_ignored", () => {
    const result = computeScore({
      debtToIncomeRatio: 0.2,
      downPaymentPercent: 0.2,
      emergencyFundMonths: 6,
      creditScore: 780,
      creditScoreProvenance: "self_report_digit",
      lifeStability: 8,
      confidenceLevel: 7,
      partnerAlignment: 9,
      fomoLevel: 2,
      timeHorizonMonths: 18,
      savingsRate: 0.2,
      downPaymentProgress: 1,
    });
    expect(result.financial.creditHealth).toBe(7);
    expect(result.hardStops.map((h) => h.code)).not.toContain("CREDIT_UNDER_620");
  });
});
