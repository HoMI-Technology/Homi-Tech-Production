import { describe, expect, it } from "vitest";
import {
  HOME_FOLD_INSTRUMENT,
  foldPathPrimary,
  foldRunwayLabel,
  ONBOARDING_SKIP_HREF,
  COMPANION_ESCALATION_HREF,
  COMPANION_FOLD_LINES,
  buildProgressLabel,
  companionFoldLine,
  companionPresenceState,
  hardStopMessages,
  homeFoldSentence,
  isNextRedirectError,
  pathStepCounts,
  resumeDraftCopy,
  shouldPaintDashSpectrum,
  shouldSuppressBuildPercent,
  weakestMeasuredPillar,
} from "@/lib/dashboard/fold-truth";

describe("isNextRedirectError", () => {
  it("recognizes Next.js redirect control-flow errors", () => {
    expect(isNextRedirectError({ digest: "NEXT_REDIRECT;replace;/first-moment;307" })).toBe(
      true,
    );
  });

  it("does not treat a real failure as a redirect", () => {
    expect(isNextRedirectError(new Error("supabase down"))).toBe(false);
    expect(isNextRedirectError(null)).toBe(false);
    expect(isNextRedirectError({ digest: "NEXT_NOT_FOUND" })).toBe(false);
  });
});

describe("shouldSuppressBuildPercent", () => {
  it("suppresses completion chrome when any hard stop is active", () => {
    expect(shouldSuppressBuildPercent(1)).toBe(true);
    expect(shouldSuppressBuildPercent(3)).toBe(true);
  });

  it("allows step counts when there is no hard stop", () => {
    expect(shouldSuppressBuildPercent(0)).toBe(false);
  });
});

describe("shouldPaintDashSpectrum", () => {
  it("hides the 4-band spectrum when a hard stop is active", () => {
    expect(shouldPaintDashSpectrum(1)).toBe(false);
    expect(shouldPaintDashSpectrum(3)).toBe(false);
  });

  it("allows the 4-band spectrum when there is no hard stop", () => {
    expect(shouldPaintDashSpectrum(0)).toBe(true);
  });
});

describe("hardStopMessages", () => {
  it("extracts human messages and drops empty rows", () => {
    expect(
      hardStopMessages([
        { code: "dti", message: "DTI is above 50%." },
        { code: "blank", message: "   " },
        { code: "runway", message: "Emergency runway is under 1 month." },
      ]),
    ).toEqual(["DTI is above 50%.", "Emergency runway is under 1 month."]);
  });

  it("returns an empty list for missing or malformed payloads", () => {
    expect(hardStopMessages(null)).toEqual([]);
    expect(hardStopMessages("nope")).toEqual([]);
    expect(hardStopMessages([{ code: "dti" }])).toEqual([]);
  });
});

describe("buildProgressLabel", () => {
  it("names steps completed against the current path only", () => {
    expect(buildProgressLabel({ done: 4, total: 7, hardStopCount: 0 })).toBe("4 of 7");
  });

  it("returns null when a hard stop is active — never a percent over a stop", () => {
    expect(buildProgressLabel({ done: 2, total: 7, hardStopCount: 1 })).toBeNull();
  });

  it("returns null when there is no path yet", () => {
    expect(buildProgressLabel({ done: 0, total: 0, hardStopCount: 0 })).toBeNull();
  });
});

describe("resumeDraftCopy", () => {
  it("offers a resume when a started draft exists", () => {
    const copy = resumeDraftCopy({ index: 12, decisionType: "home_buying" });
    expect(copy).not.toBeNull();
    expect(copy?.href).toBe("/assessment");
    expect(copy?.label.toLowerCase()).toContain("resume");
    expect(copy?.body.toLowerCase()).toContain("where you left");
  });

  it("returns null when there is no draft", () => {
    expect(resumeDraftCopy(null)).toBeNull();
  });
});

describe("companionFoldLine", () => {
  it("emits only the four locked presence strings", () => {
    expect(
      companionFoldLine({ hasHardStops: true, hasPath: true, hasAssessment: true }),
    ).toBe(COMPANION_FOLD_LINES.hardStop);
    expect(
      companionFoldLine({ hasHardStops: false, hasPath: true, hasAssessment: true }),
    ).toBe(COMPANION_FOLD_LINES.pathGuide);
    expect(
      companionFoldLine({ hasHardStops: false, hasPath: false, hasAssessment: true }),
    ).toBe(COMPANION_FOLD_LINES.assessmentOnly);
    expect(
      companionFoldLine({ hasHardStops: false, hasPath: false, hasAssessment: false }),
    ).toBe(COMPANION_FOLD_LINES.firstRun);
  });

  it("never advertises labs or a fold chat invite", () => {
    const lines = Object.values(COMPANION_FOLD_LINES);
    expect(new Set(lines).size).toBe(4);
    for (const line of lines) {
      expect(line).not.toMatch(/\/advisor|\/trinity|\/genome|talk to the companion/i);
      expect(line).not.toMatch(/limited time|upgrade now|everyone|banker/i);
    }
  });

  it("maps hard stops and path to Guardian / Path Guide presence", () => {
    expect(
      companionPresenceState({ hasHardStops: true, hasPath: true, hasAssessment: true }),
    ).toBe("hard_stop_guardian");
    expect(
      companionPresenceState({ hasHardStops: false, hasPath: true, hasAssessment: true }),
    ).toBe("path_guide");
  });

  it("documents escalation off the fold", () => {
    expect(COMPANION_ESCALATION_HREF).toBe("/advisor");
  });
});

describe("onboarding skip destination", () => {
  it("lands Skip for now on the signed-in home", () => {
    expect(ONBOARDING_SKIP_HREF).toBe("/dashboard");
  });
});

describe("HOME_FOLD_INSTRUMENT", () => {
  it("keeps the Threshold Compass as the fold instrument", () => {
    expect(HOME_FOLD_INSTRUMENT).toBe("threshold");
  });
});

describe("foldRunwayLabel", () => {
  it("prints last AssessmentResult months, or an em dash", () => {
    expect(foldRunwayLabel(0.5)).toBe("0.5 mo");
    expect(foldRunwayLabel(12)).toBe("12 mo");
    expect(foldRunwayLabel(null)).toBe("—");
    expect(foldRunwayLabel(undefined)).toBe("—");
  });
});

describe("foldPathPrimary", () => {
  it("picks the first pending step and skips REASSESS", () => {
    expect(
      foldPathPrimary([
        {
          title: "Stabilize emergency runway to at least 1 month",
          href: "/tools/runway",
          status: "pending",
          reasonCode: "RUNWAY_UNDER_1_MONTH",
        },
        { title: "Reassess readiness", href: "/assessment", status: "pending", reasonCode: "REASSESS" },
      ]),
    ).toEqual({
      title: "Stabilize emergency runway to at least 1 month",
      href: "/tools/runway",
    });
  });

  it("returns null when there is no pending step", () => {
    expect(foldPathPrimary([])).toBeNull();
    expect(foldPathPrimary(null)).toBeNull();
  });
});

describe("pathStepCounts", () => {
  it("counts actionable steps and ignores REASSESS rows", () => {
    expect(
      pathStepCounts([
        { reasonCode: "DTI", status: "done" },
        { reasonCode: "RUNWAY", status: "pending" },
        { reasonCode: "REASSESS", status: "pending" },
      ]),
    ).toEqual({ done: 1, total: 2 });
  });

  it("returns zeros for missing payloads", () => {
    expect(pathStepCounts(null)).toEqual({ done: 0, total: 0 });
    expect(pathStepCounts([])).toEqual({ done: 0, total: 0 });
  });
});

describe("weakestMeasuredPillar", () => {
  it("names the softest measured pillar", () => {
    expect(
      weakestMeasuredPillar({ financial: 12, emotional: 28, timing: 20 }),
    ).toBe("financial");
  });

  it("does not treat a skipped Emotional Truth (null) as a zeroed ring", () => {
    expect(
      weakestMeasuredPillar({ financial: 22, emotional: null, timing: 18 }),
    ).toBe("timing");
  });

  it("returns null when no pillar was measured", () => {
    expect(
      weakestMeasuredPillar({ financial: null, emotional: null, timing: null }),
    ).toBeNull();
  });
});

describe("homeFoldSentence", () => {
  it("lets a hard stop outrank the weak-pillar line", () => {
    const line = homeFoldSentence({
      hardStopCount: 1,
      weakestPillar: "financial",
      hasPath: true,
      hasAssessment: true,
    });
    expect(line.toLowerCase()).toContain("hard stop");
    expect(line).not.toMatch(/Financial Reality/i);
  });

  it("names the softest measured pillar when there is no hard stop", () => {
    expect(
      homeFoldSentence({
        hardStopCount: 0,
        weakestPillar: "timing",
        hasPath: true,
        hasAssessment: true,
      }),
    ).toBe("Perfect Timing is the softest pillar on this read.");
  });
});
