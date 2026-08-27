import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The guest-result rescue must exist, run shell-wide, and run exactly once.
 *
 * The gap: a guest completes the assessment, the background POST returns 401,
 * and save-status records `unauthenticated`. That is correct at the time —
 * local-only is the expected anonymous experience, and SaveStatusBanner
 * deliberately renders nothing for it. But nothing revisits that decision when
 * the same person signs in, so the result stays in localStorage, the account
 * looks unscored, and post-login routing sends them to /assessment to redo work
 * they already did.
 *
 * Source-text guards rather than render tests: the module graph around the
 * product shell (next/link, @/lib/supabase/client) is not loadable under
 * vitest. Same approach as __tests__/perf-bundle-guards.test.ts.
 */

const REPLAY = join(process.cwd(), "components", "assessment", "LocalResultReplay.tsx");
const PRODUCT_LAYOUT = join(process.cwd(), "app", "(product)", "layout.tsx");
const ONBOARDING = join(process.cwd(), "app", "(product)", "onboarding", "page.tsx");

/** Source with whitespace collapsed, so these guards survive prettier reflow. */
function flat(absPath: string): string {
  return readFileSync(absPath, "utf8").replace(/\s+/g, " ");
}

describe("guest-result replay", () => {
  it("is mounted on the signed-in product shell, not on a single page", () => {
    // Page-level was the original bug: it lived on /onboarding, which nothing
    // routes to, so it only ran for users who happened to pass through.
    const layout = flat(PRODUCT_LAYOUT);
    expect(layout).toContain("LocalResultReplay");
    expect(layout).toMatch(/user && <LocalResultReplay \/>/);
  });

  it("carries decisionType so a replay cannot relabel the vertical (F.13)", () => {
    // POST /api/assessments defaults decision_type to home_buying when absent,
    // which would rewrite a car assessment as a home purchase.
    expect(flat(REPLAY)).toContain(
      "...(stored.decisionType ? { decisionType: stored.decisionType } : {})",
    );
  });

  it("skips a result already on the account, so it cannot double-post", () => {
    expect(flat(REPLAY)).toContain("stored.serverId");
    expect(flat(REPLAY)).toContain("attachServerId");
  });

  it("reports through save-status so SaveStatusBanner stays honest", () => {
    // Without this a 402 from the replay would be invisible: the banner reads
    // save-status, not this component.
    const src = flat(REPLAY);
    expect(src).toContain("recordSaveStatus");
    expect(src).toContain("statusFromResponse");
  });

  it("does not live on /onboarding any more", () => {
    // Two live replays would double-save for anyone passing through onboarding.
    const onboarding = flat(ONBOARDING);
    expect(onboarding).not.toContain("/api/assessments");
    expect(onboarding).not.toContain("loadLocalResult");
  });
});
