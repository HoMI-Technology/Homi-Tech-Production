import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();

function src(...segments: string[]): string {
  return readFileSync(join(ROOT, ...segments), "utf8");
}

describe("onboarding skip lands on Home", () => {
  it("Skip for now navigates to the signed-in dashboard after save", () => {
    const page = src("app", "(product)", "onboarding", "page.tsx");
    expect(page).toContain("useRouter");
    expect(page).toContain("ONBOARDING_SKIP_HREF");
    expect(page).toContain("finish(ONBOARDING_SKIP_HREF)");
    expect(page).toMatch(/router\.push\(\s*next\s*\)/);
  });
});

describe("dashboard fold tells the truth about the build", () => {
  const page = src("app", "(product)", "dashboard", "page.tsx");

  it("names hard stops from the latest assessment", () => {
    expect(page).toContain("hardStopMessages");
    expect(page).toContain("hard_stops");
  });

  it("does not celebrate or percent-complete over an active hard stop", () => {
    expect(page).toContain("shouldSuppressBuildPercent");
    expect(page).toMatch(/shouldSuppressBuildPercent\([\s\S]*\)[\s\S]*VerdictCelebrate/);
  });

  it("uses Decision Readiness Score, never HōMI-Score", () => {
    expect(page).toContain("Decision Readiness Score");
    expect(page).not.toContain("HōMI-Score");
  });

  it("does not advertise launch-hidden labs on the fold", () => {
    expect(page).not.toMatch(/\/advisor/);
    expect(page).not.toMatch(/\/trinity/);
    expect(page).not.toMatch(/\/genome/);
    expect(page).not.toMatch(/Talk to the Companion/);
    expect(page).not.toMatch(/GenomeWidget/);
  });

  it("offers a draft resume ramp and fold analytics", () => {
    expect(page).toContain("DashboardResumeRamp");
    expect(page).toContain("DashboardFoldBeacon");
  });
});
