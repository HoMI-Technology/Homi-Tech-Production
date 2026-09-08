import { describe, expect, it } from "vitest";
import { hubLenses } from "@/lib/tools/registry";
import {
  LEFT_RAIL_KILLED_LABELS,
  LEFT_RAIL_PRIMARY,
  LEFT_RAIL_SECONDARY,
  LEFT_RAIL_WIDTH_PX,
  firstNameFromProfile,
  isLeftRailActive,
  isRoleOperateRoute,
  personRailIdentity,
} from "@/lib/layout/left-rail";

describe("PR10 left-rail destinations", () => {
  it("locks PRIMARY and SECONDARY live URLs and omits Learn", () => {
    expect(LEFT_RAIL_PRIMARY.map((i) => [i.label, i.href])).toEqual([
      ["Home", "/dashboard"],
      ["Assess", "/assessment"],
      ["Plan", "/path"],
      ["Money", "/money"],
      ["Compare", "/scenarios"],
      ["Tools", "/tools"],
      ["Companion", "/advisor"],
    ]);
    expect(LEFT_RAIL_SECONDARY.map((i) => [i.label, i.href])).toEqual([
      ["Accounts", "/connections"],
      ["Settings", "/settings"],
      ["Support", "/trust"],
    ]);
    const labels = [...LEFT_RAIL_PRIMARY, ...LEFT_RAIL_SECONDARY].map((i) => i.label);
    const hrefs = [...LEFT_RAIL_PRIMARY, ...LEFT_RAIL_SECONDARY].map((i) => i.href);
    expect(labels).not.toContain("Learn");
    expect(hrefs).not.toContain("/learn");
    expect(hrefs).not.toContain("/learning");
    for (const killed of LEFT_RAIL_KILLED_LABELS) {
      expect(labels).not.toContain(killed);
    }
    expect(labels.filter((l) => l === "Money")).toHaveLength(1);
    expect(labels).not.toContain("Bills");
    expect(labels).not.toContain("Insights");
    expect(labels).not.toContain("Finances");
    expect(labels).not.toContain("Plans");
    expect(LEFT_RAIL_WIDTH_PX).toBeGreaterThanOrEqual(240);
    expect(LEFT_RAIL_WIDTH_PX).toBeLessThanOrEqual(256);
  });

  it("does not invent Production URLs", () => {
    const hrefs = [...LEFT_RAIL_PRIMARY, ...LEFT_RAIL_SECONDARY].map((i) => i.href);
    for (const href of hrefs) {
      expect(href.startsWith("/")).toBe(true);
      expect(href).not.toMatch(/\/stand$|\/bills$|\/insights$|\/learn$/);
    }
  });

  it("marks Home only on /dashboard and Tools on hub children", () => {
    expect(isLeftRailActive("/dashboard", "/dashboard")).toBe(true);
    expect(isLeftRailActive("/assessment", "/dashboard")).toBe(false);
    expect(isLeftRailActive("/tools/fire", "/tools")).toBe(true);
    expect(isLeftRailActive("/path", "/path")).toBe(true);
    expect(isRoleOperateRoute("/admin")).toBe(true);
    expect(isRoleOperateRoute("/dashboard")).toBe(false);
  });

  it("formats the person footer without inventing a name", () => {
    expect(personRailIdentity("Jamie Diaz", "jamie@example.com")).toEqual({
      display: "Jamie D.",
      initials: "JD",
    });
    expect(firstNameFromProfile("Jamie Diaz", null)).toBe("Jamie");
    expect(personRailIdentity(null, "ada@example.com").display).toBe("ada");
  });
});

describe("PR10 hub membership", () => {
  it("Home tools cards are a subset of the live hub", () => {
    const hubPaths = new Set(hubLenses().map((lens) => lens.path));
    for (const href of [
      "/tools/affordability",
      "/tools/debt-payoff",
      "/tools/blind-budget",
      "/tools/monte-carlo",
      "/tools/fire",
      "/tools/roth-conversion",
    ]) {
      expect(hubPaths.has(href)).toBe(true);
    }
  });
});
