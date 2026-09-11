import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
  V4_SHELL_ASSESS_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
  isV4AssessPath,
  isV4CompareWorkspace,
  isV4NavActive,
  isV4PathWorkspace,
  isV4MoneyWorkspace,
  isV4AskPath,
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
    ]);
    expect(V4_MORE_NAV.map((item) => item.label)).toEqual([
      "Compare",
      "Ask HōMI",
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
    expect(V4_COMMAND_ITEMS.some((item) => item.label === "Ask HōMI")).toBe(true);
    expect(V4_PRIMARY_NAV.some((item) => item.label === "Ask HōMI")).toBe(false);
    expect(V4_SHELL_ASSESS_HREF).toBe("/assessment");
    expect(V4_SHELL_PATH_HREF).toBe("/path");
    expect(V4_SHELL_MONEY_HREF).toBe("/money");
    expect(isV4AssessPath("/assessment")).toBe(true);
    expect(isV4PathWorkspace("/path")).toBe(true);
    expect(isV4MoneyWorkspace("/money")).toBe(true);
    expect(isV4MoneyWorkspace("/money/bills")).toBe(false);
    expect(isV4CompareWorkspace("/scenarios")).toBe(true);
    expect(isV4CompareWorkspace("/path")).toBe(false);
    expect(isV4AskPath("/ask")).toBe(true);
    expect(isV4AskPath("/home")).toBe(false);
    expect(isV4NavActive("/ask", "/home")).toBe(true);
    expect(isV4NavActive("/ask", "/scenarios")).toBe(false);
    expect(isV4NavActive("/assessment", "/home")).toBe(false);
    expect(isV4NavActive("/assessment", "/path")).toBe(false);
    expect(isV4NavActive("/path", "/path")).toBe(true);
  });

  it("keeps Assess off mobile tabs and More", () => {
    expect(V4_MOBILE_TABS.map((item) => item.label)).toEqual([
      "Home",
      "Money",
      "Path",
    ]);
    expect(V4_MORE_NAV.some((item) => item.label === "Compare")).toBe(true);
    expect(V4_MOBILE_TABS.some((item) => item.label === "Compare")).toBe(false);
    expect(V4_MORE_NAV.some((item) => item.label === "Ask HōMI")).toBe(true);
    expect(V4_MOBILE_TABS.some((item) => item.label === "Ask HōMI")).toBe(false);
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

  it("shows the right HōMI column on Home, Assessment, and Ask — not Money/Path/Compare", () => {
    expect(v4ShellShowsHomiRail("/home")).toBe(true);
    expect(v4ShellShowsHomiRail("/home/next")).toBe(true);
    expect(v4ShellShowsHomiRail("/assessment")).toBe(true);
    expect(v4ShellShowsHomiRail("/ask")).toBe(true);
    expect(v4ShellShowsHomiRail("/money")).toBe(false);
    expect(v4ShellShowsHomiRail("/path")).toBe(false);
    expect(v4ShellShowsHomiRail("/scenarios")).toBe(false);
  });

  it("selected rail is a 2px cyan edge with no glow or pill", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    const start = css.indexOf(".v4-rail-link.is-active {");
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, css.indexOf("}", start) + 1);
    expect(block).toContain("inset 2px 0 0 var(--color-cyan)");
    expect(block).toContain("background: transparent");
    expect(block).toContain("border-radius: 0");
    expect(block).not.toMatch(/glow/i);
    expect(block).not.toMatch(/rgba\(34,\s*211,\s*238/);
  });

  it("Compare HōMI is a full-height column, not a floating overlay card", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    const start = css.indexOf("/* Compare HōMI is a full-height column");
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, start + 900);
    expect(block).toContain("background: transparent");
    expect(block).toContain("border-radius: 0");
    expect(block).toContain("grid-area: auto");
    expect(block).toContain("border-left: 1px solid");
    expect(block).not.toMatch(/position:\s*fixed/);
    expect(block).not.toMatch(/position:\s*absolute/);
  });

  it("Path HōMI is a full-height column, not a floating overlay card", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    const start = css.indexOf("/* Path HōMI is a full-height column");
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, start + 900);
    expect(block).toContain("background: transparent");
    expect(block).toContain("border-radius: 0");
    expect(block).toContain("grid-area: auto");
    expect(block).toContain("border-left: 1px solid");
    expect(block).not.toMatch(/position:\s*fixed/);
    expect(block).not.toMatch(/position:\s*absolute/);
  });

  it("Ask HōMI is a full-height column, not a floating overlay card", () => {
    const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
    const start = css.indexOf("/* Contextual HōMI /ask — raise the bar vs Compare");
    expect(start).toBeGreaterThan(-1);
    const block = css.slice(start, start + 2200);
    expect(block).toContain("background: transparent");
    expect(block).toContain("border-radius: 0");
    expect(block).toContain("grid-area: auto");
    expect(block).toContain("border-left: 1px solid");
    expect(block).not.toMatch(/position:\s*fixed/);
    expect(block).not.toMatch(/position:\s*absolute/);
  });
});
