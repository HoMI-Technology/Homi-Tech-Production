/**
 * T3 route-state-coverage — fetching page.tsx files keep loading.tsx +
 * error.tsx once they have them. Current gaps are listed in
 * docs/ops/product-defects.md; a new gap fails this test.
 *
 * Overlap: none at root. This rule is new.
 */
import { describe, expect, it } from "vitest";
import { fetchingPagesMissingState } from "../../support/policy/route-state";

/** Logged gaps as of 2026-08-30 — shrink only. See docs/ops/product-defects.md. */
export const ROUTE_STATE_GAPS = [
  "app/(marketing)/first-moment/page.tsx",
  "app/(product)/admin/activity/page.tsx",
  "app/(product)/admin/ad-spend/page.tsx",
  "app/(product)/admin/assessments/page.tsx",
  "app/(product)/admin/attribution/page.tsx",
  "app/(product)/admin/email/page.tsx",
  "app/(product)/admin/marketing/page.tsx",
  "app/(product)/admin/organizations/page.tsx",
  "app/(product)/admin/page.tsx",
  "app/(product)/admin/users/page.tsx",
  "app/(product)/admin/waitlist/page.tsx",
  "app/(product)/assessment/page.tsx",
  "app/(product)/calibration/page.tsx",
  "app/(product)/connections/oauth/page.tsx",
  "app/(product)/employee/dashboard/page.tsx",
  "app/(product)/genome/page.tsx",
  "app/(product)/partner/dashboard/page.tsx",
  "app/(product)/path/page.tsx",
  "app/(product)/report/[id]/credential/page.tsx",
  "app/(product)/report/[id]/page.tsx",
  "app/(product)/report/[id]/path-certificate/page.tsx",
  "app/(product)/report/[id]/print/page.tsx",
  "app/(product)/settings/page.tsx",
  "app/(product)/settings/subscription/page.tsx",
  "app/(product)/team/page.tsx",
  "app/(product)/tools/page.tsx",
  "app/auth/forgot-password/page.tsx",
  "app/auth/reset-password/page.tsx",
  "app/auth/sign-in/page.tsx",
  "app/auth/sign-up/page.tsx",
  "app/shadow/[token]/page.tsx",
  "app/share/[token]/page.tsx",
] as const;

describe("route-state-coverage", () => {
  it("fetching pages either have loading+error or are a logged gap", () => {
    const missing = fetchingPagesMissingState();
    const logged = [...ROUTE_STATE_GAPS].sort();
    expect(
      missing,
      "route-state-coverage: new fetching page missing loading.tsx/error.tsx — add siblings or log the gap in docs/ops/product-defects.md",
    ).toEqual(logged);
  });
});
