import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MAX_PATH_STEPS } from "@/lib/readiness/path";
import { V4_SHELL_ASSESS_HREF, V4_SHELL_MONEY_HREF, V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";
import { V4_ASK_PLACEHOLDER_PATH } from "@/lib/v4/assessment-walk";
import { RUNWAY_HARD_STOP_FOLD_TITLE } from "@/lib/dashboard/fold-truth";
import {
  PATH_V4_EMPTY_BODY,
  PATH_V4_EMPTY_TITLE,
  PATH_V4_HOMI_PROMPTS,
  PATH_V4_REASSESS_TITLE,
  V4_PATH_MAX_STEPS,
  buildPathV4View,
  parseV4PathVisualState,
  pathV4ForbidsOnTrackCopy,
  pathV4ForbidsReadyCopy,
  pathV4StepCta,
  pathV4VisualView,
} from "@/lib/v4/path-workspace";

describe("Path v4 workspace law", () => {
  it("locks the workspace to /path and the same max-7 engine cap", () => {
    expect(V4_SHELL_PATH_HREF).toBe("/path");
    expect(V4_PATH_MAX_STEPS).toBe(7);
    expect(V4_PATH_MAX_STEPS).toBe(MAX_PATH_STEPS);
  });

  it("deep-links Assess and Money only", () => {
    expect(pathV4StepCta("RUNWAY_UNDER_1_MONTH")).toEqual({
      label: "Open",
      href: V4_SHELL_MONEY_HREF,
    });
    expect(pathV4StepCta("REASSESS")).toEqual({
      label: "Assess",
      href: V4_SHELL_ASSESS_HREF,
    });
    expect(pathV4StepCta("CREDIT_UNDER_620")).toBeNull();
    expect(pathV4StepCta("READY_CELEBRATE")).toBeNull();
    expect(pathV4StepCta(null)).toBeNull();
  });

  it("empty state has an Assess CTA and no invented steps", () => {
    const view = pathV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.steps).toEqual([]);
    expect(view.holdLead).toBeNull();
    expect(view.verdictLabel).toBeNull();
    expect(PATH_V4_EMPTY_TITLE).toBe("Path appears after a read.");
    expect(PATH_V4_EMPTY_BODY).toMatch(/never invent filler/);
  });

  it("hard-stop ACTIVE is a hold, never On track or READY, and does not pad to 7", () => {
    const view = pathV4VisualView("hard-stop");
    expect(view.kind).toBe("hard-stop");
    expect(view.hardStopActive).toBe(true);
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.holdLead).toBe("Runway is the hold.");
    expect(view.holdMeta).toMatch(/Hard stop · runway/i);
    expect(view.holdMeta).toMatch(/Under 1 month/);
    expect(view.steps.length).toBeGreaterThan(0);
    expect(view.steps.length).toBeLessThanOrEqual(MAX_PATH_STEPS);
    expect(view.steps.length).toBeLessThan(7);
    expect(view.steps[0]?.title).toBe(RUNWAY_HARD_STOP_FOLD_TITLE);
    expect(view.steps[0]?.cta?.href).toBe(V4_SHELL_MONEY_HREF);
    expect(view.steps.some((step) => step.title === PATH_V4_REASSESS_TITLE)).toBe(true);
    expect(pathV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(pathV4ForbidsReadyCopy(view)).toBe(true);
    const blob = JSON.stringify(view);
    expect(blob).not.toMatch(/\bOn track\b/);
    expect(blob).not.toMatch(/\bREADY\b/);
    expect(blob).not.toMatch(/\$\d/);
  });

  it("normal and complete stay honest and never invent filler", () => {
    const normal = pathV4VisualView("normal");
    expect(normal.kind).toBe("normal");
    expect(normal.hardStopActive).toBe(false);
    expect(normal.verdictLabel).toBeNull();
    expect(normal.steps.length).toBeLessThanOrEqual(MAX_PATH_STEPS);
    expect(normal.steps.length).toBeLessThan(7);

    const complete = pathV4VisualView("complete");
    expect(complete.kind).toBe("complete");
    expect(complete.steps.length).toBe(1);
    expect(complete.steps.every((step) => step.status !== "pending")).toBe(true);
    expect(complete.steps.every((step) => step.cta === null)).toBe(true);
  });

  it("clarity prompts stay educational and never invent a second score", () => {
    const labels = PATH_V4_HOMI_PROMPTS.map((item) => item.label);
    expect(labels).toContain("What is my next Path step?");
    expect(labels).toContain("Why does Path stop at seven?");
    expect(labels).toContain("Compare without a second score");
    expect(JSON.stringify(PATH_V4_HOMI_PROMPTS).toLowerCase()).not.toContain("homie");
    expect(JSON.stringify(PATH_V4_HOMI_PROMPTS)).not.toContain("/learn");
    expect(PATH_V4_HOMI_PROMPTS.every((item) => item.href !== "/results")).toBe(true);
  });

  it("binds Ask HōMI to this path, not a generic overlay prompt", () => {
    expect(V4_ASK_PLACEHOLDER_PATH).toBe("Ask HōMI about this path...");
  });

  it("parses Preview-only visual stills and ignores unknown states", () => {
    expect(parseV4PathVisualState("empty")).toBe("empty");
    expect(parseV4PathVisualState("hard-stop")).toBe("hard-stop");
    expect(parseV4PathVisualState("complete")).toBe("complete");
    expect(parseV4PathVisualState("pillar-intro")).toBeNull();
    expect(parseV4PathVisualState(null)).toBeNull();
  });

  it("reassess copy matches the path-rules engine", () => {
    const src = readFileSync(resolve(process.cwd(), "lib/readiness/path.ts"), "utf8");
    expect(src).toContain(`title: "${PATH_V4_REASSESS_TITLE}"`);
  });

  it("does not pad stored steps to seven", () => {
    const view = buildPathV4View({
      decisionType: "home_buying",
      verdict: "BUILD_FIRST",
      stopCode: null,
      steps: [
        { id: "a", title: "Keep the runway above one month.", status: "pending", reasonCode: "PILLAR_FINANCIAL" },
        { id: "b", title: PATH_V4_REASSESS_TITLE, status: "pending", reasonCode: "REASSESS" },
      ],
    });
    expect(view.kind).toBe("normal");
    expect(view.steps).toHaveLength(2);
  });
});
