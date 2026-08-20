import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * F.13 — decisionType must travel with any local-result POST to
 * /api/assessments. The route defaults missing `decision_type` to
 * "home_buying", which would silently relabel a car assessment.
 *
 * Guests can no longer hold a full assessment locally (they are sent to
 * First Moment), so the onboarding page no longer replays a local result.
 * The live rescue path is the /results retry banner (SaveStatusBanner).
 *
 * Source-text guards (same approach as __tests__/perf-bundle-guards.test.ts).
 */

const ONBOARDING_PAGE = join(process.cwd(), "app", "(product)", "onboarding", "page.tsx");
const RETRY_BANNER = join(process.cwd(), "components", "results", "SaveStatusBanner.tsx");

/** Source with whitespace collapsed, so these guards survive prettier reflow. */
function flat(absPath: string): string {
  return readFileSync(absPath, "utf8").replace(/\s+/g, " ");
}

describe("onboarding local-result replay (removed)", () => {
  it("does not replay a local assessment into POST /api/assessments", () => {
    const page = flat(ONBOARDING_PAGE);
    expect(page).not.toContain("loadLocalResult");
    expect(page).not.toContain("/api/assessments");
    expect(page).not.toMatch(/decisionType.*local\.decisionType/);
  });
});

describe("results retry banner (F.13)", () => {
  it("includes decisionType in the retry POST body when the stored result has one", () => {
    expect(flat(RETRY_BANNER)).toMatch(/decisionType.*stored\.decisionType/);
  });

  it("does not post the legacy inputs+kind-only body", () => {
    expect(flat(RETRY_BANNER)).not.toContain(
      'JSON.stringify({ inputs: stored.inputs, kind: stored.kind ?? "full" })',
    );
  });

  it("omits decisionType rather than sending a falsy one", () => {
    // Pre-F.13 localStorage records have no decisionType. Sending it explicitly
    // as null/undefined-shaped data would fail the route's zod schema and lose
    // the save entirely — strictly worse than the server default.
    expect(flat(RETRY_BANNER)).toContain(
      "...(stored.decisionType ? { decisionType: stored.decisionType } : {})",
    );
  });
});
