/**
 * Home fold truth — hard stops, hold sentences, and path primaries stay server-canon.
 */
import { describe, expect, it } from "vitest";
import {
  HOME_FOLD_INSTRUMENT,
  CASH_EMPTY_LABEL,
  FOLD_CONNECTIONS_HREF,
  FOLD_CONNECT_ACCOUNTS_LABEL,
  FOLD_MONEY_HREF,
  foldScoreAgeCrop,
  foldScoreAgeLine,
  foldHardStopEyebrowParts,
  MONEY_WAIT_LINE,
  FOLD_HARD_STOP_PRECEDENCE,
  foldHardStopEyebrow,
  foldHardStopOverrideLine,
  foldHoldClose,
  foldHoldLead,
  foldHomeHoldSentence,
  foldDensityPathTitles,
  foldPathPrimary,
  foldRunwayLabel,
  hardStopCodes,
  hardStopEyebrow,
  homeHoldSentence,
  ONBOARDING_SKIP_HREF,
  COMPANION_ESCALATION_HREF,
  COMPANION_FOLD_LINES,
  HOME_COMPANION_GUIDANCE,
  HOME_COMPANION_TAGLINE,
  HOME_DENSITY_LENSES,
  HOME_DENSITY_OPEN_PATH_HREF,
  HOME_DENSITY_VIEW_ALL_TOOLS_HREF,
  homeJourneyStages,
  RUNWAY_HARD_STOP_FOLD_TITLE,
  RUNWAY_HARD_STOP_PATH_TITLE,
  buildProgressLabel,
  companionFoldLine,
  companionPresenceState,
  hardStopMessages,
  homeFoldSentence,
  isNextRedirectError,
  leadingFoldHardStopCode,
  pathStepCounts,
  resolveFoldPathPrimary,
  resumeDraftCopy,
  shouldPaintDashSpectrum,
  shouldSuppressBuildPercent,
  weakestMeasuredPillar,
} from "@/lib/dashboard/fold-truth";
import { hubLenses } from "@/lib/tools/registry";

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
  it("names under-1-month runway instead of printing tenths", () => {
    expect(foldRunwayLabel(0.5)).toBe("Under 1 month");
    expect(foldRunwayLabel(0)).toBe("Under 1 month");
    expect(foldRunwayLabel(1)).toBe("1.0 mo");
    expect(foldRunwayLabel(12)).toBe("12 mo");
    expect(foldRunwayLabel(null)).toBe("\u2014");
    expect(foldRunwayLabel(undefined)).toBe("\u2014");
  });
});

describe("foldDensityPathTitles", () => {
  it("takes at most five pending Path SSOT titles and never invents money", () => {
    expect(
      foldDensityPathTitles([
        {
          title: "Stabilize emergency runway to at least 1 month",
          href: "/tools/runway",
          status: "pending",
        },
        { title: "Grow emergency fund toward 3–6 months", href: "/tools/runway", status: "done" },
        { title: "Lower monthly debt burden (target DTI ≤ 36%)", href: "/tools/debt-payoff", status: "pending" },
        { title: "Household alignment session (budget ceiling + deal-breakers)", href: "/household", status: "pending" },
        { title: "A fourth pending title", href: "/path", status: "pending" },
        { title: "A fifth pending title", href: "/path", status: "pending" },
        { title: "A sixth pending title", href: "/path", status: "pending" },
      ]),
    ).toEqual([
      "Stabilize emergency runway to at least 1 month",
      "Lower monthly debt burden (target DTI ≤ 36%)",
      "Household alignment session (budget ceiling + deal-breakers)",
      "A fourth pending title",
      "A fifth pending title",
    ]);
  });

  it("does not invent dollar or points chrome", () => {
    const titles = foldDensityPathTitles([
      { title: "Stabilize emergency runway to at least 1 month", status: "pending" },
    ]);
    expect(titles.join(" ")).not.toMatch(/\$|\+pts|\+points/i);
    expect(foldDensityPathTitles([])).toEqual([]);
    expect(foldDensityPathTitles(null)).toEqual([]);
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

  it("prefers a pending runway hard-stop step over a later 3–6 month grow-fund title", () => {
    expect(
      foldPathPrimary([
        {
          title: "Grow emergency fund toward 3–6 months",
          href: "/tools/runway",
          status: "pending",
          reasonCode: "PILLAR_FINANCIAL",
        },
        {
          title: "Stabilize emergency runway to at least 1 month",
          href: "/tools/runway",
          status: "pending",
          reasonCode: "RUNWAY_UNDER_1_MONTH",
        },
      ]),
    ).toEqual({
      title: RUNWAY_HARD_STOP_PATH_TITLE,
      href: "/tools/runway",
    });
  });

  it("returns null when there is no pending step", () => {
    expect(foldPathPrimary([])).toBeNull();
    expect(foldPathPrimary(null)).toBeNull();
  });
});

describe("Baseline 001 fold-truth copy", () => {
  it("splits the cause token so only runway/DTI/housing/credit can take crimson", () => {
    expect(foldHardStopEyebrowParts("Hard stop · runway.")).toEqual({
      lead: "Hard stop · ",
      accent: "runway.",
    });
    expect(foldHardStopEyebrowParts("Hard stop.")).toEqual({
      lead: "Hard stop.",
      accent: null,
    });
  });

  it("locks hard-stop eyebrow + hold sentence in sentence case", () => {
    expect(hardStopEyebrow).toBe("Hard stop · runway.");
    expect(hardStopEyebrow).not.toBe("Hard stop · Runway");
    expect(homeHoldSentence).toBe("Runway is the hold. Build the fund before anything else.");
    expect(hardStopEyebrow).not.toBe(hardStopEyebrow.toUpperCase());
    expect(CASH_EMPTY_LABEL).toBe("Connect accounts to see cash.");
    expect(MONEY_WAIT_LINE).toBe("Accounts aren't connected yet.");
    expect(FOLD_CONNECT_ACCOUNTS_LABEL).toBe("Connect accounts");
    expect(FOLD_CONNECTIONS_HREF).toBe("/connections");
    expect(FOLD_MONEY_HREF).toBe("/money");
    expect(foldScoreAgeCrop("2026-08-29T12:00:00.000Z")).toBe("from Aug 29");
    expect(foldScoreAgeLine(61, "2026-08-29T12:00:00.000Z")).toBe("from Aug 29");
    expect(foldScoreAgeLine(61, "2026-03-15T12:00:00.000Z")).toBe("from Mar 15");
    expect(foldScoreAgeLine(61, "2026-08-29T12:00:00.000Z")).not.toMatch(/August|March/);
    expect(foldScoreAgeLine(61, "2026-08-29T12:00:00.000Z")).not.toMatch(/\.$/);
    expect(foldScoreAgeLine(61, "2026-08-29T12:00:00.000Z")).not.toMatch(/^61/);
    expect(foldScoreAgeLine(null, "2026-08-29T12:00:00.000Z")).toBeNull();
    expect(foldScoreAgeLine(61, null)).toBeNull();
    expect(foldScoreAgeLine(61, "not-a-date")).toBeNull();
    expect(foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH")).toBe(
      "61 — runway is a hard stop.",
    );
    expect(foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH")).not.toMatch(
      /35\s*[·/]\s*35/,
    );
    expect(foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH")).not.toMatch(/50/);
    expect(foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH")).not.toMatch(/45%/);
    expect(foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH")).not.toMatch(/620/);
    expect(foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH")).not.toMatch(
      /1 month/,
    );
    expect(foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH")).not.toMatch(/0\.5/);
    expect(HOME_DENSITY_LENSES).toHaveLength(6);
    expect(HOME_DENSITY_LENSES.map((l) => l.href)).toEqual([
      "/tools/net-worth",
      "/tools/emergency-fund",
      "/tools/affordability",
      "/tools/debt-payoff",
      "/tools/blind-budget",
      "/tools/monte-carlo",
    ]);
    const hubPaths = new Set(hubLenses().map((lens) => lens.path));
    for (const lens of HOME_DENSITY_LENSES) {
      if (lens.kind === "hub") {
        expect(hubPaths.has(lens.href)).toBe(true);
      } else {
        expect(hubPaths.has(lens.href)).toBe(false);
      }
      expect(lens.line.trim().split(/\s+/).length).toBeLessThanOrEqual(8);
      expect(lens.line).not.toMatch(/10,000|10000|\$|\+pts/i);
    }
    expect(HOME_DENSITY_OPEN_PATH_HREF).toBe("/path");
    expect(HOME_DENSITY_VIEW_ALL_TOOLS_HREF).toBe("/tools");
    expect(HOME_COMPANION_TAGLINE).toBe("Here to help you see clearly");
    expect(HOME_COMPANION_GUIDANCE).toBe("Local guidance · not live AI");
    const heldJourney = homeJourneyStages({ hasAssessment: true, hardStopActive: true });
    expect(heldJourney.map((s) => [s.id, s.label, s.tone])).toEqual([
      ["assessment", "Assess", "done"],
      ["build", "Build", "current"],
      ["prepare", "Prepare", "next"],
      ["buy", "Buy", "future"],
    ]);
    expect(heldJourney.map((s) => s.hint).join(" ")).not.toMatch(/On track|READY/i);
    expect(homeJourneyStages({ hasAssessment: false, hardStopActive: false })[0].tone).toBe(
      "next",
    );
    expect(RUNWAY_HARD_STOP_PATH_TITLE).toBe("Stabilize emergency runway to at least 1 month");
    expect(RUNWAY_HARD_STOP_FOLD_TITLE).toBe("Build runway to 1 month");
  });

  it("keeps RUNWAY_UNDER_1_MONTH copy on the Baseline 001 constants", () => {
    expect(foldHardStopEyebrow("RUNWAY_UNDER_1_MONTH")).toBe(hardStopEyebrow);
    expect(foldHomeHoldSentence("RUNWAY_UNDER_1_MONTH")).toBe(homeHoldSentence);
    expect(foldHoldLead(homeHoldSentence)).toBe("Runway is the hold.");
    expect(foldHoldClose(homeHoldSentence)).toBe("Build the fund before anything else.");
    expect(`${foldHoldLead(homeHoldSentence)} ${foldHoldClose(homeHoldSentence)}`).toBe(
      homeHoldSentence,
    );
    expect(foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH")).toBe(
      "61 — runway is a hard stop.",
    );
    expect(foldHardStopEyebrow(null)).toBe("Hard stop.");
    expect(foldHomeHoldSentence(undefined)).toBeNull();
    expect(foldHardStopOverrideLine(61)).toBe("61 — hard stop.");
    const runwayOverride = foldHardStopOverrideLine(61, "RUNWAY_UNDER_1_MONTH");
    expect(runwayOverride).not.toMatch(/50/);
    expect(runwayOverride).not.toMatch(/45%/);
    expect(runwayOverride).not.toMatch(/620/);
    expect(runwayOverride).not.toMatch(/1 month/);
    expect(runwayOverride).not.toMatch(/0\.5/);
  });

  it("swaps the stored grow-fund Path title only for RUNWAY_UNDER_1_MONTH", () => {
    const growFund = {
      href: "/tools/runway",
      title: "Grow emergency fund toward 3–6 months",
    } as const;
    expect(resolveFoldPathPrimary(growFund, "RUNWAY_UNDER_1_MONTH")).toEqual({
      href: "/tools/runway",
      title: RUNWAY_HARD_STOP_FOLD_TITLE,
    });
    expect(resolveFoldPathPrimary(growFund, "DTI_OVER_50")?.title).toBe(growFund.title);
    expect(resolveFoldPathPrimary(growFund, "HOUSING_RATIO_OVER_45")?.title).toBe(
      growFund.title,
    );
    expect(resolveFoldPathPrimary(growFund, "CREDIT_UNDER_620")?.title).toBe(
      growFund.title,
    );
    expect(resolveFoldPathPrimary(growFund, null)?.title).toBe(growFund.title);
    expect(resolveFoldPathPrimary(growFund, undefined)?.title).toBe(growFund.title);
    expect(
      resolveFoldPathPrimary(
        { href: "/tools/runway", title: RUNWAY_HARD_STOP_PATH_TITLE },
        "RUNWAY_UNDER_1_MONTH",
      )?.title,
    ).toBe(RUNWAY_HARD_STOP_FOLD_TITLE);
  });
});

describe("F1 hard-stop copy by stop code", () => {
  /** Path titles are SSOT in lib/readiness/path.ts — already live, do not rewrite. */
  const F1_FOUR_LINES = [
    {
      code: "RUNWAY_UNDER_1_MONTH",
      eyebrow: "Hard stop · runway.",
      hold: "Runway is the hold. Build the fund before anything else.",
      pathTitle: "Stabilize emergency runway to at least 1 month",
      override: "61 — runway is a hard stop.",
    },
    {
      code: "DTI_OVER_50",
      eyebrow: "Hard stop · DTI.",
      hold: "DTI is the hold. Bring the debt load down before anything else.",
      pathTitle: "Bring debt-to-income below the protective line",
      override: "61 — DTI is a hard stop.",
    },
    {
      code: "HOUSING_RATIO_OVER_45",
      eyebrow: "Hard stop · housing.",
      hold: "Housing is the hold. Re-scope the payment before anything else.",
      pathTitle: "Re-scope housing so payment stays under 45% of income",
      override: "61 — housing is a hard stop.",
    },
    {
      code: "CREDIT_UNDER_620",
      eyebrow: "Hard stop · credit.",
      hold: "Credit is the hold. Rebuild before anything else.",
      pathTitle: "Rebuild credit above the 620 protective floor",
      override: "61 — credit is a hard stop.",
    },
  ] as const;

  const OVERRIDE_CUTOFF_LEAKS = [/50/, /45%/, /620/, /1 month/, /0\.5/] as const;

  function assertOverrideHasNoCutoffs(line: string): void {
    for (const leak of OVERRIDE_CUTOFF_LEAKS) {
      expect(line).not.toMatch(leak);
    }
  }

  it.each(F1_FOUR_LINES)(
    "locks $code eyebrow / hold / Path title / override",
    (row) => {
      expect(foldHardStopEyebrow(row.code)).toBe(row.eyebrow);
      expect(foldHomeHoldSentence(row.code)).toBe(row.hold);
      expect(foldHardStopOverrideLine(61, row.code)).toBe(row.override);
      assertOverrideHasNoCutoffs(foldHardStopOverrideLine(61, row.code));
      if (row.code === "RUNWAY_UNDER_1_MONTH") {
        expect(row.eyebrow).toBe(hardStopEyebrow);
        expect(row.hold).toBe(homeHoldSentence);
        expect(row.pathTitle).toBe(RUNWAY_HARD_STOP_PATH_TITLE);
        expect(foldHardStopOverrideLine(61, row.code)).toBe(
          "61 — runway is a hard stop.",
        );
      }
    },
  );

  it("extracts known codes from the same rows as hardStopMessages", () => {
    expect(
      hardStopCodes([
        { code: "DTI_OVER_50", message: "DTI is above 50%." },
        { code: "blank", message: "   " },
        { code: "RUNWAY_UNDER_1_MONTH", message: "Emergency runway is under 1 month." },
        { code: "CREDIT_UNDER_620" },
      ]),
    ).toEqual(["DTI_OVER_50", "RUNWAY_UNDER_1_MONTH"]);
    expect(hardStopCodes(null)).toEqual([]);
  });

  it("keeps Path + hard-stop precedence when multiple codes fire", () => {
    expect(FOLD_HARD_STOP_PRECEDENCE).toEqual([
      "RUNWAY_UNDER_1_MONTH",
      "DTI_OVER_50",
      "HOUSING_RATIO_OVER_45",
      "CREDIT_UNDER_620",
    ]);
    expect(
      leadingFoldHardStopCode(["CREDIT_UNDER_620", "DTI_OVER_50", "RUNWAY_UNDER_1_MONTH"]),
    ).toBe("RUNWAY_UNDER_1_MONTH");
    expect(leadingFoldHardStopCode(["CREDIT_UNDER_620", "HOUSING_RATIO_OVER_45"])).toBe(
      "HOUSING_RATIO_OVER_45",
    );
    expect(leadingFoldHardStopCode(["CREDIT_UNDER_620", "DTI_OVER_50"])).toBe("DTI_OVER_50");
    expect(leadingFoldHardStopCode(["CREDIT_UNDER_620"])).toBe("CREDIT_UNDER_620");
    expect(leadingFoldHardStopCode([])).toBeNull();
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
