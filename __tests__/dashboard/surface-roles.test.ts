/**
 * Surface-role copy is the SSOT for Home / Path / Results / Plan / Report jobs.
 * Import enforcement lives in T3 policy.
 */
import { describe, expect, it } from "vitest";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";

describe("surface roles SSOT", () => {
  it("names the Build, retired results, checklist, and record jobs", () => {
    expect(SURFACE_ROLES.home).toMatch(/verdict/i);
    expect(SURFACE_ROLES.home).toMatch(/Path\/Assess/i);
    expect(SURFACE_ROLES.home).toMatch(/below the fold/i);
    expect(SURFACE_ROLES.path).toMatch(/Living Build/i);
    expect(SURFACE_ROLES.results).toMatch(/Retired/i);
    expect(SURFACE_ROLES.plan).toMatch(/palette-only/i);
    expect(SURFACE_ROLES.report).toMatch(/record/i);
  });
});
