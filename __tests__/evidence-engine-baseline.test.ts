import { describe, expect, it } from "vitest";
import { buildOutcomeBaseline, baselineInsertRow } from "@/lib/outcomes/baseline";
import { reserveBandFromMonths } from "@/lib/outcomes/bands";
import { structuredOutcomeResponseSchema, outcomeSurveyStructuredPayload } from "@/lib/outcomes/structured-response";

describe("T0 baseline", () => {
  it("stores observed reserve and confidence and leaves subjective stress unknown", () => {
    const baseline = buildOutcomeBaseline({
      emergencyFundMonths: 4,
      confidenceLevel: 7,
    });
    expect(baseline.emergency_reserve_band).toBe("3_to_6");
    expect(baseline.decision_confidence).toBe(7);
    expect(baseline.financial_stress).toBeNull();
    expect(baseline.cash_margin_band).toBe("unknown");
    expect(baseline.payment_difficulty).toBe("unknown");
    expect(baseline.schema_version).toBe("outcome-baseline-v1");
    expect(baseline.scoring_schema_id).toBe("readiness-engine-public-v1");
  });

  it("does not invent a reserve band from missing months", () => {
    expect(reserveBandFromMonths(null)).toBe("unknown");
    expect(buildOutcomeBaseline({}).emergency_reserve_band).toBe("unknown");
  });

  it("writes a one-row insert keyed by assessment_id", () => {
    const row = baselineInsertRow({
      assessmentId: "a1",
      userId: "u1",
      capturedAt: "2026-08-31T00:00:00.000Z",
      fields: { emergencyFundMonths: 0.5, confidenceLevel: 2 },
    });
    expect(row.assessment_id).toBe("a1");
    expect(row.user_id).toBe("u1");
    expect(row.emergency_reserve_band).toBe("under_1");
  });
});

describe("structured checkpoint payload", () => {
  it("rejects out-of-range measurements", () => {
    expect(
      structuredOutcomeResponseSchema.safeParse({ outcome: "moved", financial_stress: 11 }).success,
    ).toBe(false);
    expect(
      structuredOutcomeResponseSchema.safeParse({ outcome: "moved", satisfaction: 0 }).success,
    ).toBe(false);
  });

  it("never includes score or verdict", () => {
    const parsed = structuredOutcomeResponseSchema.parse({ outcome: "waited", notes: "" });
    const payload = outcomeSurveyStructuredPayload(parsed, "2026-08-31T00:00:00.000Z");
    expect(payload).not.toHaveProperty("score");
    expect(payload).not.toHaveProperty("verdict");
    expect(payload).not.toHaveProperty("overall_score");
    expect(payload.outcome).toBe("waited");
    expect(payload.response_schema_version).toBe("outcome-response-v1");
  });

  it("marks no_answer as declined, not a negative outcome", () => {
    const parsed = structuredOutcomeResponseSchema.parse({ outcome: "no_answer" });
    const payload = outcomeSurveyStructuredPayload(parsed, "t");
    expect(payload.contact_state).toBe("declined");
    expect(payload.declined_at).toBe("t");
  });
});
