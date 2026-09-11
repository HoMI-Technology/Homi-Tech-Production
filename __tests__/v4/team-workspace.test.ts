/**
 * Team v4 — aggregate home law.
 * Live SSOT only. No HeroScore. No invent $. No Ask/Companion. No /team/dashboard.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  TEAM_V4_EMPTY_TITLE,
  TEAM_V4_HONESTY,
  TEAM_V4_KPI_MEMBERS,
  TEAM_V4_KPI_PARTICIPATION,
  TEAM_V4_KPI_PULSE,
  TEAM_V4_LIVE_TITLE,
  TEAM_V4_REFRESH_CTA,
  TEAM_V4_RETRY_CTA,
  TEAM_V4_STALE_TITLE,
  buildTeamV4View,
  teamV4ForbidsHeroScore,
  teamV4ForbidsInventedDollars,
  teamV4VisualView,
} from "@/lib/v4/team-workspace";
import {
  V4_PRIMARY_NAV,
  V4_TEAM_WORKSPACE_NAV,
  isV4NavActive,
  isV4QuietCommandPath,
  isV4TeamWorkspace,
} from "@/lib/layout/v4-shell";

function blob(view: unknown): string {
  return JSON.stringify(view);
}

describe("Team v4 law", () => {
  it("empty headline is No team yet — never a Clarity question CTA", () => {
    const view = teamV4VisualView("empty");
    expect(view.kind).toBe("empty");
    expect(view.title).toBe(TEAM_V4_EMPTY_TITLE);
    expect(view.kpis).toEqual([]);
    expect(view.cta?.label).toBe(TEAM_V4_REFRESH_CTA);
    expect(view.cta?.label).not.toMatch(/\?$/);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toContain("HeroScore");
    expect(blob(view)).not.toContain("Clarity");
    expect(blob(view)).not.toContain("AttentionStrip");
    expect(teamV4ForbidsInventedDollars(view)).toBe(true);
    expect(teamV4ForbidsHeroScore(view)).toBe(true);
    expect(
      buildTeamV4View({
        orgConnected: false,
        memberCount: 0,
        assessmentCount: 0,
        fetchFailed: false,
      }).kind,
    ).toBe("empty");
  });

  it("normal paints live aggregate rails only — Members covered · Participation · Org pulse", () => {
    const view = teamV4VisualView("normal");
    expect(view.kind).toBe("normal");
    expect(view.title).toBe(TEAM_V4_LIVE_TITLE);
    expect(view.honesty).toBe(TEAM_V4_HONESTY);
    expect(view.kpis.map((kpi) => kpi.label)).toEqual([
      TEAM_V4_KPI_MEMBERS,
      TEAM_V4_KPI_PARTICIPATION,
      TEAM_V4_KPI_PULSE,
    ]);
    expect(view.kpis.every((kpi) => kpi.label.length > 0 && kpi.value.length > 0)).toBe(true);
    expect(view.cta).toBeNull();
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toContain("Avg score");
    expect(blob(view)).not.toContain("/team/dashboard");
    expect(teamV4ForbidsHeroScore(view)).toBe(true);
  });

  it("stale retries without inventing metrics", () => {
    const view = teamV4VisualView("stale");
    expect(view.kind).toBe("stale");
    expect(view.title).toBe(TEAM_V4_STALE_TITLE);
    expect(view.kpis).toEqual([]);
    expect(view.cta?.label).toBe(TEAM_V4_RETRY_CTA);
    expect(blob(view)).not.toMatch(/\$\d/);
    expect(blob(view)).not.toContain("HeroScore");
  });

  it("shell is aggregate Home only — no Ask, no Assess, no /team/dashboard", () => {
    expect(V4_TEAM_WORKSPACE_NAV.map((item) => item.href)).toEqual(["/team"]);
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Team")).toBe(false);
    expect(isV4TeamWorkspace("/team")).toBe(true);
    expect(isV4NavActive("/team", "/home")).toBe(false);
    expect(isV4QuietCommandPath("/team")).toBe(true);
    const page = readFileSync(resolve(process.cwd(), "app/(product)/team/page.tsx"), "utf8");
    expect(page).not.toContain("/team/dashboard");
    expect(page).not.toContain("AttentionStrip");
    expect(page).toContain("isV4HomeEnabled");
    const command = readFileSync(
      resolve(process.cwd(), "components/layout/v4/V4TopCommand.tsx"),
      "utf8",
    );
    expect(command).toContain("isV4QuietCommandPath");
    expect(command).toContain("No Ask · Companion off");
  });
});
