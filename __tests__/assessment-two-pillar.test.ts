import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/scoring/engine";
import { PILLAR_MAX_POINTS, scoreToVerdict } from "@/lib/scoring/public";
import { applySkippedEmotionalReading } from "@/lib/assessment/two-pillar";
import { mapCoveredHomeBuyingResponses } from "@/lib/questions/coverage-map";
import type { ResponseValue } from "@/lib/questions/bank";

const EMPTY_CONFLICT = { referralSource: null, deadlineOrigin: null } as const;

const CORE_ET_SKIPPED: Record<string, ResponseValue> = {
  fin_income: 10000,
  fin_debt_payments: 2000,
  fin_down_payment: "20_plus",
  fin_emergency_fund: "6_plus",
  fin_credit_score: "excellent",
  fin_savings_total: 48000,
  fin_housing_budget: "25_28",
  tim_timeline: "12_24",
  tim_urgency: 5,
};

describe("2-pillar overlay when ET is skipped", () => {
  it("rescales financial + timing onto 100 and does not keep mapper emo in the official score", () => {
    const { inputs } = mapCoveredHomeBuyingResponses(CORE_ET_SKIPPED, EMPTY_CONFLICT, true);
    const three = computeScore(inputs);
    const two = applySkippedEmotionalReading(three);

    const max = PILLAR_MAX_POINTS.financial + PILLAR_MAX_POINTS.timing;
    const expected = Math.round(((three.financial.total + three.timing.total) / max) * 100 * 10) / 10;
    expect(two.score).toBe(expected);
    expect(two.score).not.toBe(three.score);
    expect(two.verdict).toBe(scoreToVerdict(expected));
    expect(two.financial.total).toBe(three.financial.total);
    expect(two.timing.total).toBe(three.timing.total);
  });
});
