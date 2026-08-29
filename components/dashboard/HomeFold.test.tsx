// @vitest-environment jsdom

/**
 * HomeFold is a barrel for ThresholdFold. Behavior lives in ThresholdFold.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { HomeFold } from "./HomeFold";
import { ThresholdFold } from "./ThresholdFold";

describe("HomeFold barrel", () => {
  it("re-exports the Threshold Compass fold — not a card stack", () => {
    expect(HomeFold).toBe(ThresholdFold);
  });
});
