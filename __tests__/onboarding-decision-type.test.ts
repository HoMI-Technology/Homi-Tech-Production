import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * F.13 regression — onboarding replay must carry decisionType.
 *
 * When a user takes an assessment anonymously and then creates an account,
 * app/(product)/onboarding/page.tsx re-posts the locally stored result to
 * POST /api/assessments. That route defaults `decision_type` to "home_buying"
 * when the field is absent, so a replay that omits it silently relabels a car
 * assessment as a home purchase — the user's own vertical, rewritten by the one
 * code path that was supposed to rescue their result.
 *
 * This is a source-text guard rather than a render test: the page is a Next.js
 * client route whose module graph (next/link, @/lib/supabase/client) is not
 * loadable under vitest. Same approach as __tests__/perf-bundle-guards.test.ts.
 */

const ONBOARDING_PAGE = join(process.cwd(), "app", "(product)", "onboarding", "page.tsx");
const RETRY_BANNER = join(process.cwd(), "components", "results", "SaveStatusBanner.tsx");

/** Source with whitespace collapsed, so these guards survive prettier reflow. */
function flat(absPath: string): string {
  return readFileSync(absPath, "utf8").replace(/\s+/g, " ");
}

describe("onboarding replay (F.13)", () => {
  it("includes decisionType in the replay POST body when the stored result has one", () => {
    expect(flat(ONBOARDING_PAGE)).toMatch(/decisionType.*local\.decisionType/);
  });

  it("does not post the legacy inputs+kind-only body", () => {
    // The exact shape the bug shipped as. Its return would re-open F.13.
    expect(flat(ONBOARDING_PAGE)).not.toContain(
      'JSON.stringify({ inputs: local.inputs, kind: local.kind ?? "full" })',
    );
  });

  it("omits decisionType rather than sending a falsy one, on both replay paths", () => {
    // Pre-F.13 localStorage records have no decisionType. Sending it explicitly
    // as null/undefined-shaped data would fail the route's zod schema and lose
    // the save entirely — strictly worse than the server default. The /results
    // retry path (F.12) posts the same payload and guards it the same way.
    const paths = [
      { file: ONBOARDING_PAGE, ref: "local" },
      { file: RETRY_BANNER, ref: "stored" },
    ];
    for (const { file, ref } of paths) {
      expect(flat(file)).toContain(
        `...(${ref}.decisionType ? { decisionType: ${ref}.decisionType } : {})`,
      );
    }
  });
});
