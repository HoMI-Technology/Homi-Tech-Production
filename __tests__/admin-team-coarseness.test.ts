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
const ADMIN_ASSESSMENTS = "app/(product)/admin/assessments/page.tsx";
const TEAM = "app/(product)/team/page.tsx";

describe("admin overview — no cohort 0–100", () => {
  it("does not publish Avg score or sum other people's overall_score", () => {
    const src = read(ADMIN_HOME);
    expect(src).not.toMatch(/label:\s*"Avg score"/);
    expect(src).not.toMatch(/avgScore/);
    expect(src).not.toMatch(/acc \+ \(r\.overall_score/);
  });

  it("rails Wait (BUILD FIRST + not yet) instead of an average integer", () => {
    const src = read(ADMIN_HOME);
    expect(src).toMatch(/label:\s*"Wait"/);
    expect(src).toMatch(/BUILD_FIRST/);
    expect(src).toMatch(/NOT_YET/);
  });
});

describe("admin assessments — receipt bands, not integers", () => {
  it("does not render raw overall_score or Avg score", () => {
    const src = read(ADMIN_ASSESSMENTS);
    expect(src).not.toMatch(/label:\s*"Avg score"/);
    expect(src).not.toMatch(/\{a\.overall_score/);
    expect(src).not.toMatch(/>Score</);
  });

  it("maps through the SHIPPED receipt band helper", () => {
    const src = read(ADMIN_ASSESSMENTS);
    expect(src).toMatch(/scoreBand\(/);
    expect(src).toContain('from "@/lib/receipts"');
    expect(src).toMatch(/>Band</);
  });
});

describe("team dashboard — aggregate wait, not average score", () => {
  it("does not publish Avg score or average other people's integers", () => {
    const src = read(TEAM);
    expect(src).not.toMatch(/label:\s*"Avg score"/);
    expect(src).not.toMatch(/scores\.reduce/);
    expect(src).not.toMatch(/\{a\.overall_score/);
  });

  it("rails Wait and stays aggregate-only", () => {
    const src = read(TEAM);
    expect(src).toMatch(/label:\s*"Wait"/);
    expect(src).toContain('data-team-aggregates=""');
    expect(src).toMatch(/Individuals are not listed|No named individuals/);
  });
});
