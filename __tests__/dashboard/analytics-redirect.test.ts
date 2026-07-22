import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression: marketing analytics used a dead auth URL
 * (/auth/login?redirect=...) that does not exist. Sign-in is
 * /auth/sign-in?next=...
 */
describe("marketing analytics auth redirect", () => {
  it("sends anonymous users to /auth/sign-in?next=/analytics", () => {
    const source = readFileSync(
      resolve(process.cwd(), "app/[locale]/(marketing)/analytics/page.tsx"),
      "utf8",
    );
    expect(source).toContain('redirect("/auth/sign-in?next=/analytics")');
    expect(source).not.toContain("/auth/login");
    expect(source).not.toContain("redirect=/analytics");
  });
});
