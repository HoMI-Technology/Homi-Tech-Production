import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("surface roles SSOT", () => {
  it("names the Build, reveal, checklist, and record jobs", () => {
    expect(SURFACE_ROLES.home).toMatch(/Path next move/i);
    expect(SURFACE_ROLES.path).toMatch(/Living Build/i);
    expect(SURFACE_ROLES.results).toMatch(/redirect to Home/i);
    expect(SURFACE_ROLES.plan).toMatch(/palette-only/i);
    expect(SURFACE_ROLES.report).toMatch(/record/i);
  });

  it("is imported by the readiness surfaces so comments cannot drift alone", () => {
    for (const file of [
      ["app", "(product)", "results", "page.tsx"],
      ["app", "(product)", "path", "page.tsx"],
      ["app", "(product)", "plan", "page.tsx"],
      ["app", "(product)", "dashboard", "page.tsx"],
    ] as const) {
      expect(src(...file)).toContain("@/lib/dashboard/surface-roles");
    }
  });
});
