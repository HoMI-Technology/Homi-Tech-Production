import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("cookie policy — Brand paste", () => {
  const page = src("app", "(marketing)", "legal", "cookies", "page.tsx");

  it("admits optional PostHog, links subprocessors, and dates August 2026", () => {
    expect(page).toContain("PostHog");
    expect(page).toContain("Optional analytics");
    expect(page).toContain('href="/legal/subprocessors"');
    expect(page).toContain("Last updated: August 2026");
  });

  it("does not contain killed tracker-denial copy", () => {
    expect(page).not.toContain("zero trackers");
    expect(page).not.toContain("Zero trackers, zero ad tech");
    expect(page).not.toContain("That is the whole list");
    expect(page).not.toContain("analytics trackers");
    expect(page).not.toContain("essential only, zero trackers");
    expect(page).not.toContain("anonymous visitors use it before creating an account");
    expect(page).not.toContain(
      "most recent Shadow Score or full-assessment result, saved locally so /results and /plan work without an account",
    );
  });

  it("keeps metadata title, description, and canonical", () => {
    expect(page).toContain('title: "Cookie Policy"');
    expect(page).toContain(
      "How HōMI uses essential cookies and optional analytics. No ad tech. You can reject optional analytics anytime.",
    );
    expect(page).toContain('path: "/legal/cookies"');
  });
});
