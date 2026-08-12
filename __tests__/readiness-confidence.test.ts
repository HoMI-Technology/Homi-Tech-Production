import { describe, expect, it } from "vitest";
import {
  BAND_FACTOR,
  computeDataQualityConfidence,
  displayedScoreFromRaw,
  ageDaysFromIso,
} from "@/lib/readiness/confidence";

describe("displayedScoreFromRaw — display dampening only", () => {
  it("uses displayedScore = round(raw × (0.7 + 0.3·factor))", () => {
    expect(displayedScoreFromRaw(100, 1)).toBe(100);
    expect(displayedScoreFromRaw(100, 2 / 3)).toBe(Math.round(100 * (0.7 + 0.3 * (2 / 3))));
    expect(displayedScoreFromRaw(100, 1 / 3)).toBe(Math.round(100 * (0.7 + 0.3 * (1 / 3))));
    expect(displayedScoreFromRaw(71, BAND_FACTOR.medium)).toBe(
      Math.round(71 * (0.7 + 0.3 * BAND_FACTOR.medium)),
    );
  });

  it("never invents scores outside 0–100 and clamps bad factors", () => {
    expect(displayedScoreFromRaw(150, 1)).toBe(100);
    expect(displayedScoreFromRaw(-10, 1)).toBe(0);
    expect(displayedScoreFromRaw(80, 2)).toBe(80);
    expect(displayedScoreFromRaw(80, -1)).toBe(Math.round(80 * 0.7));
  });
});

describe("ageDaysFromIso", () => {
  const now = Date.parse("2026-08-12T12:00:00.000Z");

  it("returns whole days for plausible stamps", () => {
    expect(ageDaysFromIso("2026-08-12T00:00:00.000Z", now)).toBe(0);
    expect(ageDaysFromIso("2026-08-02T12:00:00.000Z", now)).toBe(10);
  });

  it("returns null for missing, unparseable, future, or epoch-adjacent stamps", () => {
    expect(ageDaysFromIso(null, now)).toBeNull();
    expect(ageDaysFromIso("not-a-date", now)).toBeNull();
    expect(ageDaysFromIso("2026-08-20T00:00:00.000Z", now)).toBeNull();
    expect(ageDaysFromIso("1970-01-01T00:00:00.000Z", now)).toBeNull();
  });
});

describe("computeDataQualityConfidence", () => {
  it("is high only with a fresh assessment and a money picture", () => {
    const dq = computeDataQualityConfidence({
      rawScore: 71,
      assessmentAgeDays: 5,
      hasFinance: true,
      financeAgeDays: 3,
      hasCredit: true,
      creditScore: 720,
    });
    expect(dq.band).toBe("high");
    expect(dq.factor).toBe(1);
    expect(dq.rawScore).toBe(71);
    expect(dq.displayedScore).toBe(71);
    expect(dq.isDampened).toBe(false);
    expect(dq.pathMode).toBe("assessment_plus_finance");
    expect(dq.reasons.some((r) => r.includes("current"))).toBe(true);
    expect(dq.dataQuality.some((l) => l.includes("self-reported"))).toBe(true);
  });

  it("drops one band without a money picture (medium + dampened)", () => {
    const dq = computeDataQualityConfidence({
      rawScore: 80,
      assessmentAgeDays: 2,
      hasFinance: false,
    });
    expect(dq.band).toBe("medium");
    expect(dq.pathMode).toBe("assessment_only");
    expect(dq.isDampened).toBe(true);
    expect(dq.displayedScore).toBe(displayedScoreFromRaw(80, BAND_FACTOR.medium));
    expect(dq.gaps.some((g) => g.id === "finance_missing")).toBe(true);
  });

  it("is low when assessment is stale and money picture is missing", () => {
    const dq = computeDataQualityConfidence({
      rawScore: 90,
      assessmentAgeDays: 120,
      hasFinance: false,
    });
    expect(dq.band).toBe("low");
    expect(dq.displayedScore).toBe(displayedScoreFromRaw(90, BAND_FACTOR.low));
    expect(dq.gaps.some((g) => g.id === "assessment_stale")).toBe(true);
    expect(dq.gaps.some((g) => g.id === "finance_missing")).toBe(true);
  });

  it("treats finance older than 30 days as a freshness degradation", () => {
    const dq = computeDataQualityConfidence({
      rawScore: 70,
      assessmentAgeDays: 5,
      hasFinance: true,
      financeAgeDays: 45,
    });
    expect(dq.band).toBe("medium");
    expect(dq.reasons.some((r) => r.includes("30 days"))).toBe(true);
    expect(dq.gaps.some((g) => g.id === "finance_stale")).toBe(true);
  });

  it("labels verified money when financeVerified is true — never invents numbers", () => {
    const dq = computeDataQualityConfidence({
      rawScore: 66,
      assessmentAgeDays: 1,
      hasFinance: true,
      financeAgeDays: 0,
      financeVerified: true,
    });
    expect(dq.dataQuality.some((l) => l.includes("verified"))).toBe(true);
    expect(dq.dataQuality.every((l) => !/\$\d/.test(l))).toBe(true);
  });

  it("keeps rawScore canonical even when displayed is dampened", () => {
    const dq = computeDataQualityConfidence({
      rawScore: 71.4,
      assessmentAgeDays: null,
      hasFinance: false,
    });
    expect(dq.rawScore).toBe(71);
    expect(dq.displayedScore).toBeLessThan(dq.rawScore);
    expect(dq.band).toBe("low");
  });
});
