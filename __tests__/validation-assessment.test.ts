import { describe, expect, it } from "vitest";
import { assessmentInputsSchema } from "@/lib/validation/assessment";

/** The documented canonical example from lib/scoring/engine.ts's JSDoc. */
const VALID_PAYLOAD = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.2,
  emergencyFundMonths: 6,
  creditScore: 750,
  lifeStability: 8,
  confidenceLevel: 7,
  partnerAlignment: 9,
  fomoLevel: 3,
  timeHorizonMonths: 18,
  savingsRate: 0.22,
  downPaymentProgress: 0.85,
};

describe("assessmentInputsSchema", () => {
  it("accepts a valid payload", () => {
    const parsed = assessmentInputsSchema.safeParse(VALID_PAYLOAD);
    expect(parsed.success).toBe(true);
  });

  it("accepts a valid payload with optional fields set", () => {
    const parsed = assessmentInputsSchema.safeParse({
      ...VALID_PAYLOAD,
      partnerAlignment: null,
      monthlyHousingRatio: 0.3,
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a malformed payload (out-of-range ratio and missing field)", () => {
    const parsed = assessmentInputsSchema.safeParse({
      ...VALID_PAYLOAD,
      debtToIncomeRatio: 5, // out of the 0-1 range enforced by the shared schema
      creditScore: undefined,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects values that only the previously looser schemas would have allowed", () => {
    // Prior app/api/assessments/route.ts schema allowed up to 5; the
    // consolidated schema (T1.8b) enforces the stricter 0-1 ratio bound.
    const parsed = assessmentInputsSchema.safeParse({
      ...VALID_PAYLOAD,
      savingsRate: 1.5,
    });
    expect(parsed.success).toBe(false);
  });
});
