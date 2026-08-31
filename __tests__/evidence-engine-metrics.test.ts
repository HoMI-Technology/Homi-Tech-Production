import { describe, expect, it } from "vitest";
import {
  completionRate,
  completionRateByVerdict,
  funnelCounts,
  rateOrNull,
  type SurveyFunnelRow,
} from "@/lib/outcomes/research-metrics";
import { readinessDividend, shapeCalibration } from "@/lib/outcomes/calibration";

describe("research funnel", () => {
  const rows: SurveyFunnelRow[] = [
    {
      verdict: "READY",
      kind: "day30",
      contact_state: "completed",
      completed_at: "t",
    },
    {
      verdict: "READY",
      kind: "day30",
      contact_state: "eligible",
      completed_at: null,
    },
    {
      verdict: "NOT_YET",
      kind: "day30",
      contact_state: "declined",
      completed_at: null,
    },
  ];

  it("reports counts and rates with a denominator", () => {
    const rate = completionRate(rows);
    expect(rate.eligible).toBe(3);
    expect(rate.completed).toBe(1);
    expect(rate.completion_rate).toBeCloseTo(1 / 3);
    expect(rateOrNull(1, 0)).toBeNull();
  });

  it("does not treat declined as a completed negative outcome", () => {
    const counts = funnelCounts(rows);
    expect(counts.declined).toBe(1);
    expect(counts.completed).toBe(1);
  });

  it("splits completion rate by verdict", () => {
    const byVerdict = completionRateByVerdict(rows);
    expect(byVerdict.READY?.completed).toBe(1);
    expect(byVerdict.READY?.eligible).toBe(2);
    expect(byVerdict.NOT_YET?.completed).toBe(0);
  });
});

describe("product calibration stays observational", () => {
  it("still shapes legacy satisfaction rows", () => {
    const rows = shapeCalibration([
      { verdict: "READY", response_count: 5, avg_satisfaction: 4, positive_rate: 0.8 },
    ]);
    expect(rows[0]?.response_count).toBe(5);
  });

  it("readiness dividend stays null below the privacy floor", () => {
    const rows = shapeCalibration([
      { verdict: "READY", response_count: 4, avg_satisfaction: 5, positive_rate: 1 },
      { verdict: "NOT_YET", response_count: 4, avg_satisfaction: 2, positive_rate: 0 },
    ]);
    expect(readinessDividend(rows, 5)).toBeNull();
  });
});
