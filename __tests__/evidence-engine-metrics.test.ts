import { describe, expect, it } from "vitest";
import {
  completionRate,
  completionRateByVerdict,
  funnelCounts,
  levelBNotebook,
  rateOrNull,
  type LevelBObservation,
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

describe("Level B notebook", () => {
  const rows: LevelBObservation[] = [
    {
      verdict: "READY",
      kind: "day30",
      contact_state: "completed",
      completed_at: "t",
      scoring_schema_id: "readiness-engine-public-v1",
      decision_type: "home_buying",
      baseline_present: true,
      financial_stress: null,
      emergency_reserve_band: "3_to_6",
      cash_margin_band: "unknown",
      payment_difficulty: "unknown",
      unexpected_expense_resilience: "unknown",
      decision_confidence: 7,
      survey_financial_stress: 4,
      survey_decision_state: "waited",
    },
    {
      verdict: "BUILD_FIRST",
      kind: "day30",
      contact_state: "eligible",
      completed_at: null,
      scoring_schema_id: "readiness-engine-public-v1",
      decision_type: "home_buying",
      baseline_present: false,
      financial_stress: null,
      emergency_reserve_band: null,
      cash_margin_band: null,
      payment_difficulty: null,
      unexpected_expense_resilience: null,
      decision_confidence: null,
      survey_financial_stress: null,
      survey_decision_state: null,
    },
  ];

  it("reports sample size, rates with denominators, and missingness", () => {
    const report = levelBNotebook(rows);
    expect(report.disclaimer).toMatch(/Observational only/);
    expect(report.sample_size.checkpoint_rows).toBe(2);
    expect(report.sample_size.completed_surveys).toBe(1);
    expect(report.sample_size.baselines_present).toBe(1);
    expect(report.sample_size.baselines_missing).toBe(1);
    expect(report.response_rate.eligible).toBe(2);
    expect(report.response_rate.completed).toBe(1);
    expect(report.response_rate.completion_rate).toBeCloseTo(0.5);
    const stress = report.missingness.find((m) => m.field === "financial_stress");
    expect(stress?.missing).toBe(2);
    expect(stress?.missing_rate).toBe(1);
    const reserve = report.missingness.find((m) => m.field === "emergency_reserve_band");
    expect(reserve?.observed).toBe(1);
    expect(reserve?.missing).toBe(1);
  });

  it("returns a null rate when there are no rows", () => {
    const report = levelBNotebook([]);
    expect(report.response_rate.completion_rate).toBeNull();
    expect(report.sample_size.checkpoint_rows).toBe(0);
  });
});
