import { describe, expect, it } from "vitest";
import {
  V4_COMMAND_ITEMS,
  V4_KILLED_NAV_LABELS,
  V4_MOBILE_TABS,
  V4_MORE_NAV,
  V4_PRIMARY_NAV,
  V4_RAIL_WIDTH_PX,
  V4_SECONDARY_NAV,
  V4_SYSTEM_NAV,
  isV4NavActive,
} from "@/lib/layout/v4-shell";

describe("Shell v4 nav law", () => {
  it("locks the primary rail to Home · Money · Path · Compare", () => {
    expect(V4_PRIMARY_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Money",
      "Path",
      "Compare",
    ]);
    expect(V4_PRIMARY_NAV.map((item) => item.href)).toEqual([
      "/home",
      "/money",
      "/path",
      "/scenarios",
    ]);
  });

  it("sets secondary Bills · Tools · Learn and system Accounts · Settings", () => {
    expect(V4_SECONDARY_NAV.map((item) => item.label)).toEqual(["Bills", "Tools", "Learn"]);
    expect(V4_SECONDARY_NAV.map((item) => item.href)).toEqual([
      "/money/bills",
      "/tools",
      "/learn",
    ]);
    expect(V4_SYSTEM_NAV.map((item) => item.label)).toEqual(["Accounts", "Settings"]);
    expect(V4_MOBILE_TABS.map((item) => item.label)).toEqual(["Home", "Money", "Path"]);
    expect(V4_MORE_NAV.map((item) => item.label)).toEqual([
      "Compare",
      "Bills",
      "Tools",
      "Learn",
      "Accounts",
      "Settings",
    ]);
    expect(V4_MORE_NAV.some((item) => item.label === "Support")).toBe(false);
    expect(V4_KILLED_NAV_LABELS).toContain("Support");
  });

  it("keeps Assess out of the primary rail (top command only)", () => {
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Assess")).toBe(false);
    expect(V4_PRIMARY_NAV.map((item) => item.label)).not.toContain("Tools");
    expect(V4_COMMAND_ITEMS.some((item) => item.label === "Assess")).toBe(true);
  });

  it("does not treat /dashboard as Home or /money/bills as Money", () => {
    expect(isV4NavActive("/dashboard", "/home")).toBe(false);
    expect(isV4NavActive("/home", "/home")).toBe(true);
    expect(isV4NavActive("/money/accounts", "/money")).toBe(true);
    expect(isV4NavActive("/money/bills", "/money")).toBe(false);
    expect(isV4NavActive("/money/bills", "/money/bills")).toBe(true);
  });

  it("keeps rail width in the Ultra Premium 216–228 band", () => {
    expect(V4_RAIL_WIDTH_PX).toBeGreaterThanOrEqual(216);
    expect(V4_RAIL_WIDTH_PX).toBeLessThanOrEqual(228);
  });
});
