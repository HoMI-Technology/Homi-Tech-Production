import { describe, expect, it } from "vitest";
import { KEY_AREA_STATUS } from "@/lib/dashboard/key-areas";
import { PILLARS } from "@/lib/brand";
import {
  HOME_V4_HOMI_PROMPTS,
  HOME_V4_PATH_CTA,
  HOME_V4_TOOLS_MAX,
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
    expect(view.decisionContext).toBe("Buying a home");
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.scorePct).toBe(61);
    expect(view.pathPrimary?.title).toBe(HOME_V4_PATH_CTA);
    expect(HOME_V4_PATH_CTA).toBe("Build runway to 1 month");
    expect(view.moneyStatus).toBe("empty");
    expect(view.pillars.map((pillar) => pillar.title)).toEqual(PILLARS.map((pillar) => pillar.name));
    expect(view.pillars).toHaveLength(3);
    expect(view.tools.length).toBeGreaterThan(0);
    expect(view.tools.length).toBeLessThanOrEqual(HOME_V4_TOOLS_MAX);
    expect(homeV4KeyStatusesLegal(view)).toBe(true);
    expect(
      view.pillars.every((pillar) =>
        [KEY_AREA_STATUS.needsWork, KEY_AREA_STATUS.strong, KEY_AREA_STATUS.notAssessed].includes(
          pillar.status,
        ),
      ),
    ).toBe(true);
    expect(view.pillars.some((pillar) => pillar.status === KEY_AREA_STATUS.needsWork)).toBe(true);
    expect(view.whatChanged).toBeTruthy();
  });

  it("keeps HōMI prompts educational — no Homie cast, no second score", () => {
    const blob = JSON.stringify(HOME_V4_HOMI_PROMPTS).toLowerCase();
    expect(blob).not.toContain("homie");
    expect(blob).not.toMatch(/\bon track\b/);
    expect(HOME_V4_HOMI_PROMPTS.some((prompt) => /second score/i.test(prompt.label))).toBe(true);
    expect(assertAssessmentResultOnly("assessment_result")).toBe("assessment_result");
  });

  it("does not mint % ready on the score plate", () => {
    const view = buildHomeV4View(homeV4VisualReading("hard-stop"));
    expect(view.scorePct).toBe(61);
    expect(`${view.scorePct}`).not.toContain("%");
  });
});
