import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * F.13 — decisionType must travel with any local-result POST to
 * /api/assessments. The route defaults missing `decision_type` to
 * "home_buying", which would silently relabel a car assessment.
 *
 * Guests can no longer hold a full assessment locally (they are sent to
 * First Moment), so the onboarding page no longer replays a local result.
 * The live POST is FullAssessmentFlow. The unmounted SaveStatusBanner retry
 * UI was removed (nightly audit 2026-09-11 area Q).
 *
 * Source-text guards (same approach as __tests__/perf-bundle-guards.test.ts).
 */

const ONBOARDING_PAGE = join(process.cwd(), "app", "(product)", "onboarding", "page.tsx");
const FULL_FLOW = join(process.cwd(), "components", "assessment", "FullAssessmentFlow.tsx");
const DEAD_RETRY_BANNER = join(process.cwd(), "components", "results", "SaveStatusBanner.tsx");

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

describe("full assessment save POST (F.13)", () => {
  it("does not keep the unmounted SaveStatusBanner retry UI", () => {
    expect(existsSync(DEAD_RETRY_BANNER)).toBe(false);
  });

  it("includes decisionType in the live POST body", () => {
    expect(flat(FULL_FLOW)).toMatch(/JSON\.stringify\(\s*\{\s*inputs,\s*kind:\s*"full",\s*decisionType/);
  });

  it("does not post the legacy inputs+kind-only body", () => {
    expect(flat(FULL_FLOW)).not.toContain(
      'JSON.stringify({ inputs: stored.inputs, kind: stored.kind ?? "full" })',
    );
  });
});
