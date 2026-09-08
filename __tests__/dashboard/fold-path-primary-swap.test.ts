/**
 * Guard: the fold only swaps in the runway Path step for a runway hard stop.
 *
 * `resolveFoldPathPrimary` used to key off "a hard stop is active", which
 * handed a DTI-stopped user a runway action. The fix keys off the stop code.
 * This file proves the fix behaviourally — by calling the function, not by
 * grepping the source — and lives in its own file so a conflict resolution
 * cannot drop it along with the code it protects.
 */

import { describe, expect, it } from "vitest";
import {
  FOLD_HARD_STOP_CODES,
  RUNWAY_HARD_STOP_FOLD_TITLE,
  RUNWAY_HARD_STOP_PATH_TITLE,
  resolveFoldPathPrimary,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";

const GROW_FUND = { href: "/path", title: "Grow emergency fund toward 3–6 months" };
const OTHER_STEP = { href: "/path", title: "Bring debt-to-income below the protective line" };
const RUNWAY: FoldHardStopCode = "RUNWAY_UNDER_1_MONTH";
const NON_RUNWAY = FOLD_HARD_STOP_CODES.filter((c) => c !== RUNWAY);

describe("fold Path primary — runway swap is gated on the runway stop", () => {
  it("swaps the grow-fund title for Companion fold voice under a runway stop", () => {
    expect(resolveFoldPathPrimary(GROW_FUND, RUNWAY)?.title).toBe(
      RUNWAY_HARD_STOP_FOLD_TITLE,
    );
  });

  it.each(NON_RUNWAY)("%s keeps the live Path title, never the runway step", (code) => {
    const resolved = resolveFoldPathPrimary(GROW_FUND, code);
    expect(
      resolved?.title,
      `a ${code} user was handed the runway Path step`,
    ).toBe(GROW_FUND.title);
    expect(resolved?.title).not.toBe(RUNWAY_HARD_STOP_PATH_TITLE);
    expect(resolved?.title).not.toBe(RUNWAY_HARD_STOP_FOLD_TITLE);
  });

  it("never swaps when no stop code resolves — silence beats the wrong action", () => {
    // Same posture as resolveFoldHardStopCode: unknown / missing = no invent.
    // See docs/design/baseline/VERIFIER-NOTE-F1.md.
    expect(resolveFoldPathPrimary(GROW_FUND, null)?.title).toBe(GROW_FUND.title);
    expect(resolveFoldPathPrimary(GROW_FUND, undefined)?.title).toBe(GROW_FUND.title);
  });

  it("leaves a non-grow-fund step untouched even under a runway stop", () => {
    expect(resolveFoldPathPrimary(OTHER_STEP, RUNWAY)?.title).toBe(OTHER_STEP.title);
  });

  it("swaps the Path SSOT stabilize title to Companion fold voice under a runway stop", () => {
    expect(
      resolveFoldPathPrimary(
        { href: "/tools/runway", title: RUNWAY_HARD_STOP_PATH_TITLE },
        RUNWAY,
      )?.title,
    ).toBe(RUNWAY_HARD_STOP_FOLD_TITLE);
  });

  it("passes null through", () => {
    expect(resolveFoldPathPrimary(null, RUNWAY)).toBeNull();
  });
});
