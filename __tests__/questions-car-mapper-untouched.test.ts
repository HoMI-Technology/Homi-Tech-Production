import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { bankResponsesToInputs } from "@/lib/questions/to-inputs";
import { computeScore } from "@/lib/scoring/engine";

const MAPPER = readFileSync(resolve(process.cwd(), "lib/questions/to-inputs.ts"), "utf8");

describe("car mapper left on the live #253 path", () => {
  it("still maps low→600 and still fires CREDIT_UNDER_620 from the digit", () => {
    const inputs = bankResponsesToInputs(
      { car_fin_credit_score: "low" },
      { referralSource: null, deadlineOrigin: null },
      "car",
    );
    expect(inputs.creditScore).toBe(600);
    expect(inputs.creditScoreProvenance).toBeUndefined();
    const result = computeScore({
      ...inputs,
      debtToIncomeRatio: 0.2,
      downPaymentPercent: 0.15,
      emergencyFundMonths: 4.5,
      lifeStability: 7,
      confidenceLevel: 7,
      partnerAlignment: null,
      fomoLevel: 5,
      timeHorizonMonths: 4,
      savingsRate: 0.1,
      downPaymentProgress: 1,
    });
    expect(result.hardStops.map((h) => h.code)).toContain("CREDIT_UNDER_620");
  });

  it("keeps carCreditChoiceToScore in source (home-wedge only)", () => {
    expect(MAPPER).toContain("function carCreditChoiceToScore");
    expect(MAPPER).toContain("return 600");
    expect(MAPPER).not.toMatch(/car_fin_credit_score[\s\S]{0,80}creditBandInputs/);
  });
});
