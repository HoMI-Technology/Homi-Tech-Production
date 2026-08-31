import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { computeScore, type AssessmentInputs } from "@/lib/scoring";
import {
  buildDay30SurveyRow,
  buildDecisionSnapshot,
  day30DueAt,
  isHomeDecisionType,
} from "@/lib/outcomes/decision-snapshot";
import {
  OUTCOME_TAXONOMY,
  isOutcomeTaxonomy,
  outcomeSurveyAnswerPayload,
} from "@/lib/outcomes/taxonomy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const SAMPLE_INPUTS: AssessmentInputs = {
  debtToIncomeRatio: 0.25,
  downPaymentPercent: 0.15,
  emergencyFundMonths: 4,
  creditScore: 720,
  selfReportedCreditBand: "good",
  creditScoreProvenance: "band_ignored",
  lifeStability: 7,
  confidenceLevel: 7,
  partnerAlignment: null,
  fomoLevel: 3,
  timeHorizonMonths: 9,
  savingsRate: 0.15,
  downPaymentProgress: 0.6,
};

describe("decision snapshot + day30 schedule", () => {
  it("builds the minimum snapshot the 30-day ping can read", () => {
    const snapshot = buildDecisionSnapshot({
      decisionId: "dec-1",
      score: 71.2,
      verdict: "ALMOST_THERE",
      hardStops: [{ code: "DTI_OVER_50", message: "DTI is too high" }],
      provenance: {
        dti: "self_report",
        downPayment: "ledger_earmark",
        runway: "verified",
        credit: "band_ignored",
        lookbackDays: 90,
      },
      selfReportedCreditBand: "fair",
      timestamp: "2026-08-19T12:00:00.000Z",
    });

    expect(snapshot).toEqual({
      decision_id: "dec-1",
      score: 71.2,
      verdict: "ALMOST_THERE",
      hardStops: [{ code: "DTI_OVER_50", message: "DTI is too high" }],
      provenance: {
        dti: "self_report",
        downPayment: "ledger_earmark",
        runway: "verified",
        credit: "band_ignored",
        lookbackDays: 90,
      },
      self_reported_credit_band: "fair",
      timestamp: "2026-08-19T12:00:00.000Z",
      scoring_schema_id: "readiness-engine-public-v1",
    });
  });

  it("schedules day30 at completed_at + 30 days and only for home", () => {
    const completedAt = "2026-07-20T00:00:00.000Z";
    expect(day30DueAt(completedAt)).toBe("2026-08-19T00:00:00.000Z");
    expect(buildDay30SurveyRow({ userId: "u1", assessmentId: "a1", completedAt })).toEqual({
      user_id: "u1",
      assessment_id: "a1",
      kind: "day30",
      due_at: "2026-08-19T00:00:00.000Z",
    });
    expect(isHomeDecisionType("home_buying")).toBe(true);
    expect(isHomeDecisionType(undefined)).toBe(true);
    expect(isHomeDecisionType("car")).toBe(false);
  });
});

describe("due-prompt taxonomy", () => {
  it("accepts the Gate 6 answers including dismissed no_answer", () => {
    expect(OUTCOME_TAXONOMY).toEqual([
      "moved",
      "waited",
      "lender_blocked",
      "not_okay",
      "no_answer",
    ]);
    for (const value of OUTCOME_TAXONOMY) {
      expect(isOutcomeTaxonomy(value)).toBe(true);
    }
    expect(isOutcomeTaxonomy("glad")).toBe(false);

    const saved = outcomeSurveyAnswerPayload("moved", "  closed  ", "2026-08-19T00:00:00.000Z");
    expect(saved).toEqual({
      outcome: "moved",
      notes: "closed",
      completed_at: "2026-08-19T00:00:00.000Z",
    });
    expect(outcomeSurveyAnswerPayload("no_answer", "", "2026-08-19T00:00:00.000Z").outcome).toBe(
      "no_answer",
    );
  });

  it("keeps the Home prompt on the existing card and writes only survey fields", () => {
    const prompt = src("components", "dashboard", "OutcomeSurveyPrompt.tsx");
    const taxonomy = src("lib", "outcomes", "taxonomy.ts");
    const fold = src("components", "dashboard", "ThresholdFold.tsx");
    expect(taxonomy).toContain('"moved"');
    expect(taxonomy).toContain('"waited"');
    expect(taxonomy).toContain('"lender_blocked"');
    expect(taxonomy).toContain('"not_okay"');
    expect(taxonomy).toContain('"no_answer"');
    expect(prompt).toContain("OUTCOME_TAXONOMY");
    expect(prompt).toContain("outcomeSurveyAnswerPayload");
    expect(prompt).toContain('save("no_answer")');
    expect(prompt).not.toMatch(/overall_score|computeScore|verdict:/);
    expect(fold).not.toContain("OutcomeSurveyPrompt");
    expect(fold).not.toContain("Checking in");
  });
});

describe("score-untouched", () => {
  it("recording an outcome does not change computeScore or the verdict", () => {
    const before = computeScore(SAMPLE_INPUTS);
    const answer = outcomeSurveyAnswerPayload("lender_blocked", "denied", "t");
    expect(answer).not.toHaveProperty("score");
    expect(answer).not.toHaveProperty("verdict");
    expect(answer).not.toHaveProperty("hardStops");
    const after = computeScore(SAMPLE_INPUTS);
    expect(after.score).toBe(before.score);
    expect(after.verdict).toBe(before.verdict);
    expect(after.hardStops).toEqual(before.hardStops);
    expect(after.financial).toEqual(before.financial);
    expect(after.emotional).toEqual(before.emotional);
    expect(after.timing).toEqual(before.timing);
  });

  it("persist and prompt helpers never import scoring or credit mappers", () => {
    const persist = src("lib", "outcomes", "decision-snapshot.ts");
    const taxonomy = src("lib", "outcomes", "taxonomy.ts");
    const prompt = src("components", "dashboard", "OutcomeSurveyPrompt.tsx");
    for (const file of [persist, taxonomy, prompt]) {
      expect(file).not.toMatch(/from\s+["']@\/lib\/scoring/);
      expect(file).not.toMatch(/computeScore/);
      expect(file).not.toMatch(/creditBandInputs|carCreditChoiceToScore/);
    }
  });
});
