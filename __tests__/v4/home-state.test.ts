import { describe, expect, it } from "vitest";
import { KEY_AREA_STATUS } from "@/lib/dashboard/key-areas";
import {
  HOME_V4_HOMI_PROMPTS,
  HOME_V4_PATH_CTA,
  assertAssessmentResultOnly,
  buildHomeV4View,
  homeV4KeyStatusesLegal,
} from "@/lib/v4/home-state";
import { homeV4VisualReading } from "@/lib/v4/visual-fixture";

describe("Home v4 State A + Finance GATE", () => {
  it("builds State A from AssessmentResult-shaped hard-stop + empty money", () => {
    const view = buildHomeV4View(homeV4VisualReading("hard-stop"));
    expect(view.hasAssessment).toBe(true);
    expect(view.hardStopActive).toBe(true);
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.scorePct).toBe(61);
    expect(view.pathPrimary?.title).toBe(HOME_V4_PATH_CTA);
    expect(HOME_V4_PATH_CTA).toBe("Build runway to 1 month");
    expect(view.moneyStatus).toBe("empty");
    expect(view.whatsNext.length).toBeGreaterThan(0);
    expect(view.whatsNext.length).toBeLessThanOrEqual(5);
    expect(view.keyAreas.length).toBeGreaterThan(0);
    expect(view.keyAreas.length).toBeLessThanOrEqual(6);
    expect(homeV4KeyStatusesLegal(view)).toBe(true);
    expect(view.keyAreas.every((area) => area.status !== "On track")).toBe(true);
    expect(view.keyAreas.some((area) => area.status === KEY_AREA_STATUS.needsWork)).toBe(true);
  });

  it("keeps HōMI prompts educational — no Homie cast, no second score", () => {
    const blob = JSON.stringify(HOME_V4_HOMI_PROMPTS).toLowerCase();
    expect(blob).not.toContain("homie");
    expect(blob).not.toContain("score");
    expect(assertAssessmentResultOnly("assessment_result")).toBe("assessment_result");
  });
});
