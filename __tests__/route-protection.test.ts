import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect } from "vitest";
import {
  PUBLIC_PRODUCT_ROUTES,
  PROTECTED_PRODUCT_ROUTES,
  PARTIALLY_PROTECTED_PRODUCT_ROUTES,
  isProtectedPath,
} from "@/lib/auth/protected-routes";

const PRODUCT_DIR = join(process.cwd(), "app", "(product)");

/** Every route-group directory under app/(product). */
function productRouteDirs(): string[] {
  return readdirSync(PRODUCT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

describe("route-protection classification", () => {
  const classified = new Set<string>([
    ...PUBLIC_PRODUCT_ROUTES,
    ...PROTECTED_PRODUCT_ROUTES,
    ...PARTIALLY_PROTECTED_PRODUCT_ROUTES,
  ]);

  it("classifies every (product) route directory — no route ships unclassified", () => {
    const unclassified = productRouteDirs().filter((r) => !classified.has(r));
    expect(
      unclassified,
      `Unclassified app/(product) routes: ${unclassified.join(", ")}. ` +
        `Add each to PUBLIC_PRODUCT_ROUTES or PROTECTED_PRODUCT_ROUTES in lib/auth/protected-routes.ts.`,
    ).toEqual([]);
  });

  it("never classifies a route as both public and protected", () => {
    for (const r of PUBLIC_PRODUCT_ROUTES) {
      expect(PROTECTED_PRODUCT_ROUTES as readonly string[]).not.toContain(r);
    }
  });

  it("gates every protected product route (root and sub-paths)", () => {
    for (const r of PROTECTED_PRODUCT_ROUTES) {
      expect(isProtectedPath(`/${r}`)).toBe(true);
      expect(isProtectedPath(`/${r}/anything`)).toBe(true);
    }
  });

  it("leaves public product routes open", () => {
    for (const r of PUBLIC_PRODUCT_ROUTES) {
      expect(isProtectedPath(`/${r}`)).toBe(false);
      expect(isProtectedPath(`/${r}/deep/link`)).toBe(false);
    }
  });

  it("gates only the /dashboard sub-path of partially-protected routes", () => {
    expect(isProtectedPath("/partner")).toBe(false);
    expect(isProtectedPath("/partner/dashboard")).toBe(true);
    expect(isProtectedPath("/employee")).toBe(false);
    expect(isProtectedPath("/employee/dashboard")).toBe(true);
    // Legacy /portal stubs are gone — next.config.ts 308s them to /dashboard
    // before middleware runs, so the prefixes list no longer carries them.
    expect(isProtectedPath("/team")).toBe(true);
  });

  it("does not gate a route that merely shares a name prefix", () => {
    // "/twinkle" must not be caught by the "/twin" prefix.
    expect(isProtectedPath("/twinkle")).toBe(false);
    expect(isProtectedPath("/reporting")).toBe(false);
  });

  it("protects the previously-orphaned product routes (regression guard)", () => {
    for (const r of [
      "twin",
      "trinity",
      "decisions",
      "signals",
      "credit",
      "finance",
      "genome",
      // "couples" and "family" merged into /household (D3) — household
      // stays in PROTECTED_PRODUCT_ROUTES, asserted via the full-list test.
      "household",
      "simulator",
    ]) {
      expect(isProtectedPath(`/${r}`)).toBe(true);
    }
  });
});
