import { describe, it, expect } from "vitest";
import {
  shapeCalibration,
  totalResponses,
  readinessDividend,
  type CalibrationRow,
} from "@/lib/outcomes/calibration";

describe("calibration shaping", () => {
  it("fills all four verdicts in fixed order, zeroing missing ones", () => {
    const rows = shapeCalibration([
      { verdict: "READY", response_count: 3, avg_satisfaction: 4.5, positive_rate: 0.9 },
    ]);
    expect(rows.map((r) => r.verdict)).toEqual(["READY", "ALMOST_THERE", "BUILD_FIRST", "NOT_YET"]);
    expect(rows[0].response_count).toBe(3);
    expect(rows[3].response_count).toBe(0);
  });

  it("coerces string counts from the RPC into numbers", () => {
    const rows = shapeCalibration([
      // Supabase returns bigint counts as strings.
      {
        verdict: "READY",
        response_count: "12" as unknown as number,
        avg_satisfaction: "4.2" as unknown as number,
        positive_rate: "0.8" as unknown as number,
      },
    ]);
    expect(rows[0].response_count).toBe(12);
    expect(rows[0].avg_satisfaction).toBeCloseTo(4.2);
  });

  it("totals responses across verdicts", () => {
    const rows = shapeCalibration([
      { verdict: "READY", response_count: 5 },
      { verdict: "NOT_YET", response_count: 7 },
    ]);
    expect(totalResponses(rows)).toBe(12);
  });
});

describe("readiness dividend", () => {
  const make = (partial: Partial<CalibrationRow>[]) => shapeCalibration(partial);

  it("returns null until both cohorts meet the minimum", () => {
    const rows = make([
      { verdict: "READY", response_count: 2, avg_satisfaction: 4.6, positive_rate: 0.9 },
      { verdict: "NOT_YET", response_count: 10, avg_satisfaction: 3.0, positive_rate: 0.4 },
    ]);
    expect(readinessDividend(rows, 5)).toBeNull(); // READY cohort too small
  });

  it("computes the weighted waited average and delta when cohorts qualify", () => {
    const rows = make([
      { verdict: "READY", response_count: 10, avg_satisfaction: 4.5, positive_rate: 0.9 },
      { verdict: "BUILD_FIRST", response_count: 10, avg_satisfaction: 3.0, positive_rate: 0.4 },
      { verdict: "NOT_YET", response_count: 10, avg_satisfaction: 3.6, positive_rate: 0.5 },
    ]);
    const d = readinessDividend(rows, 5);
    expect(d).not.toBeNull();
    // waited weighted avg = (3.0*10 + 3.6*10) / 20 = 3.3
    expect(d!.waitedAvg).toBeCloseTo(3.3, 5);
    // delta = (4.5 - 3.3)/3.3 * 100 ≈ 36.4%
    expect(d!.deltaPct).toBeCloseTo(36.36, 1);
  });
});
