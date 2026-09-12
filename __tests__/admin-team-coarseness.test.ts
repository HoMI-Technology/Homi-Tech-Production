import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Admin and team dashboards are business surfaces. Two-piece rule: they get
 * a receipt (verdict + wait counts / coarse bands), never a lookup 0–100.
 */
const ROOT = process.cwd();

function read(rel: string): string {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

const ADMIN_HOME = "app/(product)/admin/page.tsx";
const ADMIN_HOME_KPI = "lib/v4/admin-workspace.ts";
const ADMIN_ASSESSMENTS = "app/(product)/admin/assessments/page.tsx";
const TEAM = "lib/v4/team-workspace.ts";
const TEAM_PAGE = "app/(product)/team/page.tsx";
const TEAM_UI = "components/v4/team/TeamWorkspaceV4.tsx";

describe("admin overview — no cohort 0–100", () => {
  it("does not publish Avg score or sum other people's overall_score", () => {
    const src = read(ADMIN_HOME);
    expect(src).not.toMatch(/label:\s*"Avg score"/);
    expect(src).not.toMatch(/avgScore/);
    expect(src).not.toMatch(/acc \+ \(r\.overall_score/);
  });

  it("rails Users / Orgs / Assessments 7d / Waitlist instead of an average integer", () => {
    const src = read(ADMIN_HOME_KPI);
    expect(src).toMatch(/label:\s*"Users"/);
    expect(src).toMatch(/label:\s*"Orgs"/);
    expect(src).toMatch(/label:\s*"Assessments 7d"/);
    expect(src).toMatch(/label:\s*"Waitlist"/);
    expect(src).not.toMatch(/label:\s*"Wait"/);
    expect(src).not.toMatch(/label:\s*"Avg score"/);
    const home = read(ADMIN_HOME);
    expect(home).toContain("userCount");
    expect(home).toContain("orgCount");
    expect(home).toContain("assessments7d");
    expect(home).toContain("waitlistCount");
    expect(home).toContain('from("profiles")');
    expect(home).toContain('from("organizations")');
    expect(home).toContain('from("assessments")');
    expect(home).toContain('from("waitlist")');
  });
});

describe("admin assessments — receipt bands, not integers", () => {
  it("does not render raw overall_score or Avg score", () => {
    const src = read(ADMIN_ASSESSMENTS);
    expect(src).not.toMatch(/label:\s*"Avg score"/);
    expect(src).not.toMatch(/\{a\.overall_score/);
    expect(src).not.toMatch(/>Score</);
  });

  it("maps live rows through the shipped assessments builder — never READY or scoreBand theater", () => {
    const src = read(ADMIN_ASSESSMENTS);
    expect(src).toContain("buildAdminAssessmentsV4View");
    expect(src).not.toMatch(/scoreBand\(/);
    expect(src).not.toContain("VerdictBadge");
    expect(src).not.toContain("overall_score");
    expect(src).not.toMatch(/>Band</);
    expect(src).not.toMatch(/>Score</);
  });
});

describe("team dashboard — aggregate wait, not average score", () => {
  it("does not publish Avg score or average other people's integers", () => {
    for (const rel of [TEAM, TEAM_PAGE, TEAM_UI]) {
      const src = read(rel);
      expect(src).not.toMatch(/label:\s*"Avg score"/);
      expect(src).not.toMatch(/scores\.reduce/);
      expect(src).not.toMatch(/\{a\.overall_score/);
    }
  });

  it("rails aggregate coverage and stays named-individual-free", () => {
    const src = read(TEAM);
    expect(src).toContain('"Members covered"');
    expect(src).toContain('"Participation"');
    expect(src).toContain('"Org pulse"');
    expect(src).toMatch(/label:\s*TEAM_V4_KPI_MEMBERS/);
    expect(src).toMatch(/label:\s*TEAM_V4_KPI_PARTICIPATION/);
    expect(src).toMatch(/label:\s*TEAM_V4_KPI_PULSE/);
    expect(src).not.toMatch(/label:\s*"Wait"/);
    const ui = read(TEAM_UI);
    expect(ui).toContain('data-team-aggregates=""');
    expect(src).toMatch(/Individuals are not listed|No named individuals/);
    expect(read(TEAM_PAGE)).toContain("get_org_assessment_summary");
  });
});
