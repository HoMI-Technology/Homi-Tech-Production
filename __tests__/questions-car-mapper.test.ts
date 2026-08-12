import { describe, it, expect } from "vitest";
import { bankResponsesToInputs } from "@/lib/questions/to-inputs";
import { computeScore } from "@/lib/scoring/engine";
import type { ResponseValue } from "@/lib/questions/bank";

const EMPTY_CONFLICT = { referralSource: null, deadlineOrigin: null } as const;

/**
 * Car fixture (Plans.md 5.7). Financial IDs + option values come from the 5.6
 * car question bank spec; emotional/timing IDs are the shared bank tags, so
 * their option values are the home-buying bank values (e.g. tim_timeline "3_6").
 */
const CAR_FIXTURE: Record<string, ResponseValue> = {
  car_fin_income: 5000,
  car_fin_debt_payments: 400,
  car_fin_vehicle_price: 25000,
  car_fin_down_payment_amount: "10_19",
  car_fin_monthly_payment: "10_15pct",
  car_fin_emergency_fund: "3to6",
  car_fin_credit_score: "good",
  car_fin_loan_term: "60",
  emo_confidence: 7,
  emo_lifestyle_ready: 7,
  emo_clarity: 6,
  emo_partner_alignment: "solo",
  emo_fomo: "mixed",
  tim_timeline: "3_6",
  tim_urgency: 5,
};

describe("car mapper (5.7)", () => {
  it("maps car fixture to a deterministic verdict", () => {
    const inputs = bankResponsesToInputs(CAR_FIXTURE, EMPTY_CONFLICT, "car");
    const result = computeScore(inputs);
    expect(result.verdict).toBeDefined();
    expect(result.score).toBeGreaterThan(0);
  });

  it("DTI > 50% fires hard stop", () => {
    const highDebt = { ...CAR_FIXTURE, car_fin_debt_payments: 3000 };
    const inputs = bankResponsesToInputs(highDebt, EMPTY_CONFLICT, "car");
    const result = computeScore(inputs);
    expect(result.hardStops.length).toBeGreaterThan(0);
    expect(result.verdict).toBe("NOT_YET");
  });

  it("runway < 1 month fires hard stop", () => {
    const noFund = { ...CAR_FIXTURE, car_fin_emergency_fund: "lt1" };
    const inputs = bankResponsesToInputs(noFund, EMPTY_CONFLICT, "car");
    const result = computeScore(inputs);
    expect(result.hardStops.length).toBeGreaterThan(0);
  });

  it("credit < 620 fires hard stop", () => {
    const lowCredit = { ...CAR_FIXTURE, car_fin_credit_score: "low" };
    const inputs = bankResponsesToInputs(lowCredit, EMPTY_CONFLICT, "car");
    const result = computeScore(inputs);
    expect(result.hardStops.length).toBeGreaterThan(0);
  });

  it("payment > 20% take-home fires hard stop via housingRatio slot", () => {
    const bigPayment = { ...CAR_FIXTURE, car_fin_monthly_payment: "over_20pct" };
    const inputs = bankResponsesToInputs(bigPayment, EMPTY_CONFLICT, "car");
    const result = computeScore(inputs);
    expect(result.hardStops.length).toBeGreaterThan(0);
    expect(result.verdict).toBe("NOT_YET");
  });
});
