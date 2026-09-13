/**
 * Employee v4 — operate home law.
 * Empty or live SSOT. No HeroScore. No invent $. Hard stop never On track.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { V4_ASK_PLACEHOLDER_WORKSPACE } from "@/lib/v4/assessment-walk";
import {
  EMPLOYEE_V4_EMPTY_CTA,
  EMPLOYEE_V4_EMPTY_TITLE,
  EMPLOYEE_V4_HOLD_LEAD,
  EMPLOYEE_V4_HOLD_META,
  EMPLOYEE_V4_LIVE_TITLE,
  EMPLOYEE_V4_OPEN_PATH,
  buildEmployeeV4View,
  employeeV4ForbidsHeroScore,
  employeeV4ForbidsInventedDollars,
  employeeV4ForbidsOnTrackCopy,
  employeeV4ForbidsReadyCopy,
  employeeV4VisualView,
} from "@/lib/v4/employee-workspace";
import { SYSTEM_V4_PROMPTS_MAX } from "@/lib/v4/system-surfaces";
import {
  V4_EMPLOYEE_OPERATE_NAV,
  V4_EMPLOYEE_WORKSPACE_NAV,
  V4_PRIMARY_NAV,
  isV4AskOnlyPath,
  isV4EmployeeWorkspace,
  isV4NavActive,
  isV4SystemSurfacePath,
} from "@/lib/layout/v4-shell";

function blob(view: unknown): string {
  return JSON.stringify(view);
}

describe("Employee v4 law", () => {
  it("Ask placeholder is workspace-bound and prompts stay ≤3", () => {
    expect(V4_ASK_PLACEHOLDER_WORKSPACE).toBe("Ask HōMI about this workspace...");
    const empty = employeeV4VisualView("empty");
    expect(empty.askPlaceholder).toBe(V4_ASK_PLACEHOLDER_WORKSPACE);
    expect(empty.prompts.length).toBeLessThanOrEqual(SYSTEM_V4_PROMPTS_MAX);
    expect(employeeV4VisualView("hard-stop").prompts).toHaveLength(SYSTEM_V4_PROMPTS_MAX);
    expect(employeeV4VisualView("normal").prompts).toHaveLength(SYSTEM_V4_PROMPTS_MAX);
  });

  it("empty never invents teammate lists, scores, or $", () => {
    const view = employeeV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.hasLiveWorkspace).toBe(false);
    expect(view.jobs).toEqual([]);
    expect(view.title).toBe(EMPLOYEE_V4_EMPTY_TITLE);
    expect(view.cta.label).toBe(EMPLOYEE_V4_EMPTY_CTA);
    expect(view.cta.href).toBe("#attention");
    expect(view.decisionContext).toBe("Employee");
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(employeeV4ForbidsInventedDollars(view)).toBe(true);
    expect(employeeV4ForbidsHeroScore(view)).toBe(true);
    expect(buildEmployeeV4View({ reading: null, hasLiveWorkspace: false }).kind).toBe("empty");
  });

  it("hard-stop is explain-only and never On track or READY", () => {
    const view = employeeV4VisualView("hard-stop");
    expect(view.kind).toBe("hard-stop");
    expect(view.hardStopActive).toBe(true);
    expect(view.verdictLabel).toBe("DO NOT PROCEED");
    expect(view.holdLead).toBe(EMPLOYEE_V4_HOLD_LEAD);
    expect(view.holdMeta).toBe(EMPLOYEE_V4_HOLD_META);
    expect(view.cta).toEqual({ label: EMPLOYEE_V4_OPEN_PATH, href: "/path" });
    expect(view.jobs).toEqual([]);
    expect(employeeV4ForbidsOnTrackCopy(view)).toBe(true);
    expect(employeeV4ForbidsReadyCopy(view)).toBe(true);
    expect(view.title).not.toMatch(/\bOn track\b/);
    expect(view.body).not.toMatch(/\bOn track\b/);
    expect(view.cta.label).not.toMatch(/\bOn track\b/);
    expect(view.verdictLabel).not.toMatch(/\bREADY\b/);
    expect(blob(view)).toMatch(/never On track/i);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view).toLowerCase()).not.toContain("homie");
    expect(employeeV4ForbidsHeroScore(view)).toBe(true);
  });

  it("normal is live operate chrome with quiet age and no peer-score wall", () => {
    const view = employeeV4VisualView("normal");
    expect(view.kind).toBe("normal");
    expect(view.hasLiveWorkspace).toBe(true);
    expect(view.title).toBe(EMPLOYEE_V4_LIVE_TITLE);
    expect(view.ageLabel).toBe("Synced 12m ago");
    expect(view.cta.href).toBe("#attention");
    expect(view.jobs.map((job) => job.id)).toEqual(["attention", "privacy"]);
    expect(view.jobs.find((job) => job.id === "attention")?.follow).toMatch(/empty if none/i);
    expect(view.jobs.find((job) => job.id === "privacy")?.follow).toMatch(/No peer-score listing/);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toMatch(/\b\d{1,3}\s*\/\s*100\b/);
    expect(employeeV4ForbidsHeroScore(view)).toBe(true);
    expect(
      buildEmployeeV4View({
        reading: { verdict: "ALMOST_THERE", stopCode: null, scoredAt: null },
        hasLiveWorkspace: true,
      }).ageLabel,
    ).toBe("Age unknown");
  });

  it("hard stop outranks live workspace — operate does not clear it", () => {
    const view = buildEmployeeV4View({
      reading: {
        verdict: "NOT_YET",
        stopCode: "RUNWAY_UNDER_1_MONTH",
      },
      hasLiveWorkspace: true,
    });
    expect(view.kind).toBe("hard-stop");
    expect(view.hasLiveWorkspace).toBe(false);
    expect(view.jobs).toEqual([]);
  });

  it("page is last-read only and does not reopen K2–K4 URLs", () => {
    const page = readFileSync(
      resolve(process.cwd(), "app/(product)/employee/dashboard/page.tsx"),
      "utf8",
    );
    expect(page).toContain("assertAssessmentResultOnly");
    expect(page).toContain("EmployeeWorkspaceV4");
    expect(page).not.toContain("HeroScore");
    expect(page).not.toContain("ThresholdFold");
    expect(page).not.toContain("MetricRail");
    expect(page).not.toContain("OperateHeroMeta");
    expect(page).not.toContain("PageFrame");
    expect(page).not.toContain("from(\"assessments\")");
    expect(page).not.toMatch(/HOMI_V4_EMPLOYEE/);
    expect(page).not.toContain("/partner");
    expect(page).not.toContain("/admin");
    expect(page).not.toContain("/team");
  });

  it("employee jobs are Home · Attention · Privacy on the live /employee/dashboard route", () => {
    expect(V4_EMPLOYEE_WORKSPACE_NAV.map((item) => item.label)).toEqual(["Home"]);
    expect(V4_EMPLOYEE_WORKSPACE_NAV[0]?.href).toBe("/employee/dashboard");
    expect(V4_EMPLOYEE_OPERATE_NAV.map((item) => item.label)).toEqual(["Attention", "Privacy"]);
    expect(V4_PRIMARY_NAV.some((item) => item.href === "/employee/dashboard")).toBe(false);
    expect(isV4EmployeeWorkspace("/employee/dashboard")).toBe(true);
    expect(isV4EmployeeWorkspace("/employee/dashboard/depth")).toBe(true);
    expect(isV4EmployeeWorkspace("/home")).toBe(false);
    expect(isV4NavActive("/employee/dashboard", "/home")).toBe(false);
    expect(isV4NavActive("/employee/dashboard", "/employee/dashboard")).toBe(true);
    expect(isV4NavActive("/employee/dashboard", "/employee/dashboard#attention")).toBe(false);
    expect(isV4AskOnlyPath("/employee/dashboard")).toBe(true);
    expect(isV4SystemSurfacePath("/employee/dashboard")).toBe(false);
  });
});
