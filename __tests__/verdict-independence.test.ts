import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { outcomeSurveyStructuredPayload } from "@/lib/outcomes/structured-response";
import { outcomeSurveyAnswerPayload } from "@/lib/outcomes/taxonomy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

const FORBIDDEN = [
  "affiliatePayout",
  "referralPayout",
  "partnerCommission",
  "sponsoredPlacement",
  "conversionProbability",
  "lenderEconomics",
];

describe("verdict independence", () => {
  it("does not list commercial fields on scoring inputs", () => {
    const engine = src("lib", "scoring", "engine.ts");
    for (const name of FORBIDDEN) {
      expect(engine).not.toContain(name);
    }
  });

  it("survey payloads cannot patch assessment score or verdict", () => {
    const structured = outcomeSurveyStructuredPayload(
      { outcome: "moved", notes: "" },
      "t",
    );
    const legacy = outcomeSurveyAnswerPayload("moved", "ok", "t");
    for (const payload of [structured, legacy]) {
      expect(payload).not.toHaveProperty("score");
      expect(payload).not.toHaveProperty("verdict");
      expect(payload).not.toHaveProperty("overall_score");
      expect(payload).not.toHaveProperty("hard_stops");
    }
  });

  it("the survey API updates outcome_surveys only", () => {
    const route = src("app", "api", "outcomes", "surveys", "route.ts");
    expect(route).toContain('from("outcome_surveys")');
    expect(route).not.toMatch(/from\("assessments"\)\.update/);
    expect(route).not.toMatch(/overall_score/);
  });
});
