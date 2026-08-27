import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACCOUNT_THEN_ASSESSMENT_HREF } from "@/components/marketing/first-moment-copy";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("sign-up default next is /assessment", () => {
  const page = src("app", "auth", "sign-up", "page.tsx");

  it("falls back to /assessment when no ?next is given", () => {
    // First Moment already carries the product explanation, so new users go
    // straight to the 45-q — never split between /onboarding and /assessment.
    expect(page).toContain('safeNext(searchParams.get("next"), "/assessment")');
    expect(page).not.toContain('"/onboarding"');
  });

  it("First Moment handoff href matches the same destination", () => {
    expect(ACCOUNT_THEN_ASSESSMENT_HREF).toBe("/auth/sign-up?next=/assessment");
  });
});
