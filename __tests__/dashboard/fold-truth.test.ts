import { describe, expect, it } from "vitest";
import {
  ONBOARDING_SKIP_HREF,
  buildProgressLabel,
  companionFoldLine,
  hardStopMessages,
  isNextRedirectError,
  resumeDraftCopy,
  shouldSuppressBuildPercent,
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
  it("names the build without advertising launch-hidden labs", () => {
    const line = companionFoldLine({
      hasHardStops: true,
      hasPath: true,
      hasAssessment: true,
    });
    expect(line.toLowerCase()).toContain("hard stop");
    expect(line).not.toMatch(/\/advisor|\/trinity|\/genome|talk to the companion/i);
  });

  it("points an assessed user at Path, not a lab", () => {
    const line = companionFoldLine({
      hasHardStops: false,
      hasPath: true,
      hasAssessment: true,
    });
    expect(line.toLowerCase()).toMatch(/path/);
    expect(line).not.toMatch(/\/advisor|\/trinity|\/genome/i);
  });
});

describe("onboarding skip destination", () => {
  it("lands Skip for now on the signed-in home", () => {
    expect(ONBOARDING_SKIP_HREF).toBe("/dashboard");
  });
});
