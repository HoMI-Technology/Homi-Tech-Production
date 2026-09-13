import { afterEach, describe, expect, it, vi } from "vitest";
import {
  PRODUCT_SHELL_PATH_HEADER,
  pathnameFromRequestHeaders,
  productShellFor,
  resolveProductShell,
} from "@/lib/layout/product-shell";

describe("PR13 product shell — signed-in Home cannot miss invent chrome", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("locks /dashboard + session to personal (not guest SiteHeader, not quiet bar)", () => {
    vi.stubEnv("HOMI_V4_HOME_ENABLED", "false");
    expect(productShellFor("/dashboard", true)).toBe("personal");
    expect(productShellFor("/dashboard/", true)).toBe("personal");
    expect(productShellFor("/assessment", true)).toBe("personal");
    expect(productShellFor("/tools/net-worth", true)).toBe("personal");
  });

  it("fails open to personal when the path header is missing but the user is signed in", () => {
    expect(productShellFor("", true)).toBe("personal");
    expect(productShellFor(null, true)).toBe("personal");
    expect(productShellFor(undefined, true)).toBe("personal");
  });

  it("keeps guests on marketing chrome and role trees on the quiet bar", () => {
    vi.stubEnv("HOMI_V4_HOME_ENABLED", "false");
    expect(productShellFor("/dashboard", false)).toBe("guest");
    expect(productShellFor("/pricing", false)).toBe("guest");
    expect(productShellFor("/admin", true)).toBe("role");
    expect(productShellFor("/admin/waitlist", true)).toBe("role");
    expect(productShellFor("/employee", true)).toBe("role");
    expect(productShellFor("/partner/dashboard", true)).toBe("role");
    expect(productShellFor("/team", true)).toBe("role");
  });

  it("lets client pathname upgrade to role without demoting signed-in Home to guest", () => {
    expect(resolveProductShell("personal", "/dashboard", true)).toBe("personal");
    expect(resolveProductShell("personal", "/admin", true)).toBe("role");
    expect(resolveProductShell("personal", "/dashboard", false)).toBe("guest");
    expect(resolveProductShell("guest", "/dashboard", true)).toBe("personal");
    expect(resolveProductShell("role", null, true)).toBe("role");
  });

  it("reads a forwarded path header without inventing a route", () => {
    expect(pathnameFromRequestHeaders(new Headers())).toBe("");
    expect(
      pathnameFromRequestHeaders(new Headers({ [PRODUCT_SHELL_PATH_HEADER]: "/dashboard" })),
    ).toBe("/dashboard");
    expect(
      pathnameFromRequestHeaders(new Headers({ "x-invoke-path": "/dashboard?tab=1" })),
    ).toBe("/dashboard");
    expect(PRODUCT_SHELL_PATH_HEADER).toBe("x-homi-pathname");
  });
});

describe("PR C product shell — v4 only when flag is on", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps signed-in Home on personal invent chrome while HOMI_V4_HOME_ENABLED is off", () => {
    vi.stubEnv("HOMI_V4_HOME_ENABLED", "false");
    expect(productShellFor("/home", true)).toBe("personal");
    expect(productShellFor("/home", false)).toBe("guest");
  });

  it("mounts Shell v4 for signed-in pending hosts when the flag is exact true", () => {
    vi.stubEnv("HOMI_V4_HOME_ENABLED", "true");
    expect(productShellFor("/home", true)).toBe("v4");
    expect(productShellFor("/assessment", true)).toBe("v4");
    expect(productShellFor("/path", true)).toBe("v4");
    expect(productShellFor("/money", true)).toBe("v4");
    expect(productShellFor("/scenarios", true)).toBe("v4");
    expect(productShellFor("/ask", true)).toBe("v4");
    expect(productShellFor("/money/bills", true)).toBe("v4");
    expect(productShellFor("/tools", true)).toBe("v4");
    expect(productShellFor("/learn", true)).toBe("v4");
    expect(productShellFor("/connections", true)).toBe("v4");
    expect(productShellFor("/settings", true)).toBe("v4");
    expect(productShellFor("/employee/dashboard", true)).toBe("v4");
    expect(productShellFor("/employee", true)).toBe("v4");
    expect(productShellFor("/partner/dashboard", true)).toBe("v4");
    expect(productShellFor("/partner", true)).toBe("v4");
    expect(productShellFor("/admin", true)).toBe("v4");
    expect(productShellFor("/admin/users", true)).toBe("v4");
    expect(productShellFor("/team", true)).toBe("v4");
    expect(productShellFor("/dashboard", true)).toBe("personal");
    expect(resolveProductShell("personal", "/home", true)).toBe("v4");
  });

  it("mounts Shell v4 on flag-on /home without a session (visual-fixture stills)", () => {
    vi.stubEnv("HOMI_V4_HOME_ENABLED", "true");
    expect(productShellFor("/home", false)).toBe("v4");
    expect(productShellFor("/home/", false)).toBe("v4");
    expect(productShellFor("/assessment", false)).toBe("v4");
    expect(productShellFor("/path", false)).toBe("v4");
    expect(productShellFor("/money", false)).toBe("v4");
    expect(productShellFor("/scenarios", false)).toBe("v4");
    expect(productShellFor("/ask", false)).toBe("v4");
    expect(productShellFor("/money/bills", false)).toBe("v4");
    expect(productShellFor("/tools", false)).toBe("v4");
    expect(productShellFor("/learn", false)).toBe("v4");
    expect(productShellFor("/connections", false)).toBe("v4");
    expect(productShellFor("/settings", false)).toBe("v4");
    expect(productShellFor("/employee/dashboard", false)).toBe("v4");
    expect(productShellFor("/partner/dashboard", false)).toBe("v4");
    expect(productShellFor("/admin", false)).toBe("v4");
    expect(productShellFor("/team", false)).toBe("v4");
    expect(resolveProductShell("guest", "/home", false)).toBe("v4");
    expect(productShellFor("/dashboard", false)).toBe("guest");
    expect(productShellFor("", false)).toBe("guest");
  });

  it("fails open to Shell v4 when the path header is missing but the visual fixture is on", () => {
    vi.stubEnv("HOMI_V4_HOME_ENABLED", "true");
    vi.stubEnv("HOMI_V4_VISUAL_FIXTURE", "true");
    expect(productShellFor("", false)).toBe("v4");
    expect(productShellFor(null, false)).toBe("v4");
    expect(productShellFor("/home", false)).toBe("v4");
  });
});
