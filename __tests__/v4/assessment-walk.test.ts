import { describe, expect, it } from "vitest";
import { DECISION_TYPE_LABELS } from "@/lib/assessment/types";
import { getQuestionById } from "@/lib/questions/flow";
import {
  V4_ASSESS_DECISION_LABEL,
  V4_ASSESS_DONE_HREF,
  V4_ASSESS_HREF,
  V4_ASSESS_MID_WALK_QUESTION_ID,
  V4_ASSESS_MID_WALK_VALUE,
  V4_ASSESS_VERTICAL,
  V4_ASSESS_VERTICALS,
  assessmentAskPlaceholder,
  assessmentHomiPrompts,
  parseV4AssessVisualState,
  v4AssessFixtureProgress,
} from "@/lib/v4/assessment-walk";
import { V4_SHELL_ASSESS_HREF, V4_SHELL_HOME_HREF } from "@/lib/layout/v4-shell";
import { POST_LOGIN_V4_HOME } from "@/lib/auth/postLoginDestination";

describe("Assessment v4 walk law", () => {
  it("locks the signed-in walk to /assessment and home_buying", () => {
    expect(V4_ASSESS_HREF).toBe("/assessment");
    expect(V4_ASSESS_HREF).toBe(V4_SHELL_ASSESS_HREF);
    expect(V4_ASSESS_VERTICAL).toBe("home_buying");
    expect(V4_ASSESS_VERTICALS).toEqual(["home_buying"]);
    expect(V4_ASSESS_DECISION_LABEL).toBe(DECISION_TYPE_LABELS.home_buying);
    expect(V4_ASSESS_DECISION_LABEL).toBe("Buying a home");
  });

  it("writes the completed read to Home SSOT, not DARK /dashboard", () => {
    expect(V4_ASSESS_DONE_HREF).toBe("/home");
    expect(V4_ASSESS_DONE_HREF).toBe(V4_SHELL_HOME_HREF);
    expect(V4_ASSESS_DONE_HREF).toBe(POST_LOGIN_V4_HOME);
  });

  it("mid-walk fixture uses a live bank id and live choice value", () => {
    const question = getQuestionById(V4_ASSESS_MID_WALK_QUESTION_ID);
    expect(question?.id).toBe("fin_down_payment");
    const options = Array.isArray(question?.options) ? question.options : [];
    expect(options.some((option) => option.value === V4_ASSESS_MID_WALK_VALUE)).toBe(true);
    expect(options.map((option) => option.label).join(" ")).not.toMatch(/5% – 10%/);
  });

  it("progress for the mid-walk bank question is path-true and never of 45", () => {
    const progress = v4AssessFixtureProgress(V4_ASSESS_MID_WALK_QUESTION_ID);
    expect(progress?.label).toMatch(/^Financial Reality · \d+ of ~\d+ this path$/);
    expect(progress?.label).not.toMatch(/of 45/);
    expect(progress?.estimate).toBe(8);
  });

  it("clarity prompts stay educational and never invent a second score", () => {
    const intro = assessmentHomiPrompts({ kind: "intro", dimension: "financial" });
    expect(intro.map((item) => item.label)).toContain("What is Financial Reality?");
    expect(intro.map((item) => item.label)).toContain("Compare without a second score");
    const mid = assessmentHomiPrompts({
      kind: "question",
      questionId: V4_ASSESS_MID_WALK_QUESTION_ID,
    });
    expect(mid.map((item) => item.label)).toContain("Why does down payment matter?");
    expect(mid.every((item) => item.href !== "/results")).toBe(true);
    expect(JSON.stringify(intro)).not.toContain("/learn");
    expect(JSON.stringify(mid)).not.toContain("/learn");
    expect(assessmentAskPlaceholder("question")).toBe("Ask HōMI about this question...");
    expect(assessmentAskPlaceholder("intro")).toBe("Ask HōMI about this decision...");
  });

  it("parses Preview-only visual stills and ignores unknown states", () => {
    expect(parseV4AssessVisualState("pillar-intro")).toBe("pillar-intro");
    expect(parseV4AssessVisualState("mid-walk")).toBe("mid-walk");
    expect(parseV4AssessVisualState("empty")).toBeNull();
    expect(parseV4AssessVisualState(null)).toBeNull();
  });
});
