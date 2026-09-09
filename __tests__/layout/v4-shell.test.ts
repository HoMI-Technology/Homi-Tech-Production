import { describe, expect, it } from "vitest";
import {
  V4_COMMAND_HEIGHT_PX,
  V4_COMMAND_ITEMS,
  V4_HOMI_RAIL_WIDTH_PX,
  V4_KILLED_NAV_LABELS,
  V4_MOBILE_TABS,
  V4_MORE_NAV,
  V4_PRIMARY_NAV,
  V4_RAIL_WIDTH_PX,
  V4_SECONDARY_NAV,
  V4_SYSTEM_NAV,
  isV4NavActive,
  v4ShellShowsHomiRail,
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
    expect(V4_MOBILE_TABS.map((item) => item.label)).toEqual([
      "Home",
      "Money",
      "Path",
      "Compare",
    ]);
    expect(V4_MORE_NAV.map((item) => item.label)).toEqual([
      "Bills",
      "Tools",
      "Learn",
      "Accounts",
      "Settings",
    ]);
    expect(V4_MORE_NAV.some((item) => item.label === "Support")).toBe(false);
    expect(V4_KILLED_NAV_LABELS).toContain("Support");
  });

  it("locks Money before Path on the primary rail", () => {
    const labels = V4_PRIMARY_NAV.map((item) => item.label);
    expect(labels.indexOf("Money")).toBeLessThan(labels.indexOf("Path"));
    expect(labels.indexOf("Money")).toBe(1);
    expect(labels.indexOf("Path")).toBe(2);
  });

  it("keeps Assess out of the primary rail (top command only)", () => {
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Assess")).toBe(false);
    expect(V4_PRIMARY_NAV.map((item) => item.label)).not.toContain("Tools");
    expect(V4_COMMAND_ITEMS.some((item) => item.label === "Assess")).toBe(true);
  });

  it("keeps Assess off mobile tabs and More", () => {
    expect(V4_MOBILE_TABS.map((item) => item.label)).toEqual([
      "Home",
      "Money",
      "Path",
      "Compare",
    ]);
    expect(V4_MORE_NAV.some((item) => item.label === "Assess")).toBe(false);
    expect(V4_MOBILE_TABS.some((item) => item.label === "Assess")).toBe(false);
  });

  it("does not treat /dashboard as Home or /money/bills as Money", () => {
    expect(isV4NavActive("/dashboard", "/home")).toBe(false);
    expect(isV4NavActive("/home", "/home")).toBe(true);
    expect(isV4NavActive("/money/accounts", "/money")).toBe(true);
    expect(isV4NavActive("/money/bills", "/money")).toBe(false);
    expect(isV4NavActive("/money/bills", "/money/bills")).toBe(true);
  });

  it("keeps Ultra Premium geometry bands", () => {
    expect(V4_RAIL_WIDTH_PX).toBeGreaterThanOrEqual(216);
    expect(V4_RAIL_WIDTH_PX).toBeLessThanOrEqual(228);
    expect(V4_HOMI_RAIL_WIDTH_PX).toBeGreaterThanOrEqual(300);
    expect(V4_HOMI_RAIL_WIDTH_PX).toBeLessThanOrEqual(340);
    expect(V4_COMMAND_HEIGHT_PX).toBeGreaterThanOrEqual(60);
    expect(V4_COMMAND_HEIGHT_PX).toBeLessThanOrEqual(68);
    expect(V4_RAIL_WIDTH_PX).toBe(222);
    expect(V4_HOMI_RAIL_WIDTH_PX).toBe(320);
    expect(V4_COMMAND_HEIGHT_PX).toBe(64);
  });

  it("shows the right HōMI column only on Home", () => {
    expect(v4ShellShowsHomiRail("/home")).toBe(true);
    expect(v4ShellShowsHomiRail("/home/next")).toBe(true);
    expect(v4ShellShowsHomiRail("/money")).toBe(false);
    expect(v4ShellShowsHomiRail("/path")).toBe(false);
  });
});
