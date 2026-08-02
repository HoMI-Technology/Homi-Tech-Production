import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression: marketing analytics used a dead auth URL
 * (/auth/login?redirect=...) that does not exist. Sign-in goes through
 * signInRedirect("/analytics").
 */
describe("marketing analytics auth redirect", () => {
  it("sends anonymous users through signInRedirect(/analytics)", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/(marketing)/analytics/page.tsx"),
      "utf8",
    );
    expect(source).toContain('signInRedirect("/analytics")');
    expect(source).not.toContain("/auth/login");
    expect(source).not.toContain("redirect=/analytics");
  });
});
