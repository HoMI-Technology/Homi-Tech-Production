import { describe, expect, it } from "vitest";
import {
  V4_MOBILE_TABS,
  V4_PRIMARY_NAV,
  V4_SECONDARY_NAV,
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

  it("keeps Tools / Settings / Support secondary and mobile Home · Money · Path", () => {
    expect(V4_SECONDARY_NAV.map((item) => item.label)).toEqual([
      "Tools",
      "Settings",
      "Support",
    ]);
    expect(V4_MOBILE_TABS.map((item) => item.label)).toEqual(["Home", "Money", "Path"]);
  });

  it("does not treat /dashboard as an active Home mark", () => {
    expect(isV4NavActive("/dashboard", "/home")).toBe(false);
    expect(isV4NavActive("/home", "/home")).toBe(true);
    expect(isV4NavActive("/money/accounts", "/money")).toBe(true);
  });
});
