import { describe, expect, it } from "vitest";
import {
  PRODUCT_SHELL_PATH_HEADER,
  pathnameFromRequestHeaders,
  productShellFor,
  resolveProductShell,
} from "@/lib/layout/product-shell";

describe("PR13 product shell — signed-in Home cannot miss invent chrome", () => {
  it("locks /dashboard + session to personal (not guest SiteHeader, not quiet bar)", () => {
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
  });
});
