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
import { HOME_DENSITY_LENSES } from "@/lib/dashboard/fold-truth";

describe("PR12 left-rail destinations", () => {
  it("locks PRIMARY Product map and SECONDARY without Finances+Money dual peers", () => {
    expect(LEFT_RAIL_PRIMARY.map((i) => [i.label, i.href])).toEqual([
      ["Home", "/dashboard"],
      ["Assessment", "/assessment"],
      ["Finances", "/money"],
      ["Plans", "/path"],
      ["Compare", "/scenarios"],
      ["Bills", "/money/bills"],
      ["Insights", "/timeline"],
      ["Learn", "/learn"],
      ["Companion", "/advisor"],
      ["Tools", "/tools"],
    ]);
    expect(LEFT_RAIL_SECONDARY.map((i) => [i.label, i.href])).toEqual([
      ["Accounts", "/connections"],
      ["Settings", "/settings"],
      ["Support", "/trust"],
    ]);
    const labels = [...LEFT_RAIL_PRIMARY, ...LEFT_RAIL_SECONDARY].map((i) => i.label);
    const hrefs = [...LEFT_RAIL_PRIMARY, ...LEFT_RAIL_SECONDARY].map((i) => i.href);
    expect(labels).toContain("Learn");
    expect(hrefs).toContain("/learn");
    expect(hrefs).not.toContain("/learning");
    for (const killed of LEFT_RAIL_KILLED_LABELS) {
      expect(labels).not.toContain(killed);
    }
    expect(labels.filter((l) => l === "Finances")).toHaveLength(1);
    expect(labels.filter((l) => l === "Money")).toHaveLength(0);
    expect(labels.filter((l) => l === "Plans")).toHaveLength(1);
    expect(labels.filter((l) => l === "Plan")).toHaveLength(0);
    expect(LEFT_RAIL_WIDTH_PX).toBeGreaterThanOrEqual(240);
    expect(LEFT_RAIL_WIDTH_PX).toBeLessThanOrEqual(256);
  });

  it("does not invent Production URLs", () => {
    const hrefs = [...LEFT_RAIL_PRIMARY, ...LEFT_RAIL_SECONDARY].map((i) => i.href);
    for (const href of hrefs) {
      expect(href.startsWith("/")).toBe(true);
      expect(href).not.toMatch(/\/stand$|\/insights$|\/learning$/);
    }
  });

  it("marks Home only on /dashboard, Tools on hub children, and Bills not Finances", () => {
    expect(isLeftRailActive("/dashboard", "/dashboard")).toBe(true);
    expect(isLeftRailActive("/assessment", "/dashboard")).toBe(false);
    expect(isLeftRailActive("/tools/fire", "/tools")).toBe(true);
    expect(isLeftRailActive("/path", "/path")).toBe(true);
    expect(isLeftRailActive("/money", "/money")).toBe(true);
    expect(isLeftRailActive("/money/budget", "/money")).toBe(true);
    expect(isLeftRailActive("/money/bills", "/money")).toBe(false);
    expect(isLeftRailActive("/money/bills", "/money/bills")).toBe(true);
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

describe("PR12 hub membership", () => {
  it("Home hub tool cards are a subset of the live hub; chrome shells are empty routes", () => {
    const hubPaths = new Set(hubLenses().map((lens) => lens.path));
    for (const lens of HOME_DENSITY_LENSES) {
      if (lens.kind === "hub") {
        expect(hubPaths.has(lens.href)).toBe(true);
      } else {
        expect(hubPaths.has(lens.href)).toBe(false);
        expect(lens.line).not.toMatch(/\$|\d{2,}/);
      }
    }
  });
});
