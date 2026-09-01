import { describe, expect, it } from "vitest";
import { computeScore, generateNextSteps, type AssessmentInputs } from "@/lib/scoring";
import { bankResponsesToInputs } from "@/lib/questions/to-inputs";
import type { ResponseValue } from "@/lib/questions/bank";
import {
  applyHardStopCopy,
  hardStopMessage,
  hardStopNextStep,
} from "@/lib/assessment/hard-stop-copy";

const HOME: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 7,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.15,
  downPaymentProgress: 0.5,
  monthlyHousingRatio: 0.5,
};

const CAR_FIXTURE: Record<string, ResponseValue> = {
  car_fin_income: 5000,
  car_fin_debt_payments: 400,
  car_fin_vehicle_price: 25000,
  car_fin_down_payment_amount: "10_19",
  car_fin_monthly_payment: "over_20pct",
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

const EMPTY_CONFLICT = { referralSource: null, deadlineOrigin: null } as const;

function homeish(text: string): boolean {
  return /\bhomes?\b|\bhousing\b/i.test(text.replace(/take-home/gi, ""));
}

describe("hard-stop copy — home matches the frozen engine", () => {
  it("HOUSING_RATIO_OVER_45 home message is the engine string", () => {
    const engine = computeScore(HOME);
    const stop = engine.hardStops.find((s) => s.code === "HOUSING_RATIO_OVER_45");
    expect(stop).toBeDefined();
    expect(hardStopMessage("HOUSING_RATIO_OVER_45", "home_buying")).toBe(stop!.message);
  });

  it("home next-step for housing matches generateNextSteps", () => {
    const engine = computeScore(HOME);
    const steps = generateNextSteps(engine);
    expect(hardStopNextStep("HOUSING_RATIO_OVER_45", "home_buying")).toBe(steps[0]);
  });
});

describe("hard-stop copy — car never names a home", () => {
  it("car payment stop does not say home or housing", () => {
    const message = hardStopMessage("HOUSING_RATIO_OVER_45", "car");
    const next = hardStopNextStep("HOUSING_RATIO_OVER_45", "car");
    expect(homeish(message)).toBe(false);
    expect(homeish(next)).toBe(false);
    expect(message).toMatch(/20%/);
    expect(message).toMatch(/take-home/i);
  });

  it("rewrites engine housing copy on a car fixture", () => {
    const inputs = bankResponsesToInputs(CAR_FIXTURE, EMPTY_CONFLICT, "car");
    const engine = computeScore(inputs);
    expect(engine.hardStops.some((s) => s.code === "HOUSING_RATIO_OVER_45")).toBe(true);
    expect(engine.hardStops.some((s) => homeish(s.message))).toBe(true);

    const displayed = applyHardStopCopy(engine.hardStops, "car");
    expect(displayed.some((s) => s.code === "HOUSING_RATIO_OVER_45")).toBe(true);
    for (const stop of displayed) {
      expect(homeish(stop.message)).toBe(false);
    }
  });

  it("leaves home copy on home_buying", () => {
    const engine = computeScore(HOME);
    const displayed = applyHardStopCopy(engine.hardStops, "home_buying");
    expect(displayed).toEqual(engine.hardStops);
  });
});
