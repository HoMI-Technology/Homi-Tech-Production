import { describe, expect, it } from "vitest";
import {
  FREE_TIER_LOCKED_MESSAGE,
  FREE_TIER_QUOTA_POLICY,
  freeTierOverflowAfterInsert,
  freeTierQuotaExceeded,
} from "@/lib/assessment/free-tier-quota";

describe("D10 free-tier quota — one per vertical", () => {
  it("is the one_per_vertical policy", () => {
    expect(FREE_TIER_QUOTA_POLICY).toBe("one_per_vertical");
  });

  it("lets a free user take a first assessment in a vertical", () => {
    expect(
      freeTierQuotaExceeded({ unlimitedRescoring: false, completedCountForVertical: 0 }),
    ).toBe(false);
  });

  it("locks re-scoring the same vertical on free", () => {
    expect(
      freeTierQuotaExceeded({ unlimitedRescoring: false, completedCountForVertical: 1 }),
    ).toBe(true);
  });

  it("does not lock Plus+", () => {
    expect(
      freeTierQuotaExceeded({ unlimitedRescoring: true, completedCountForVertical: 9 }),
    ).toBe(false);
  });

  it("rolls back only when a vertical already has more than one row", () => {
    expect(
      freeTierOverflowAfterInsert({ unlimitedRescoring: false, completedCountForVertical: 1 }),
    ).toBe(false);
    expect(
      freeTierOverflowAfterInsert({ unlimitedRescoring: false, completedCountForVertical: 2 }),
    ).toBe(true);
  });

  it("names the per-decision rule in the lock copy", () => {
    expect(FREE_TIER_LOCKED_MESSAGE).toMatch(/per decision/i);
    expect(FREE_TIER_LOCKED_MESSAGE).not.toMatch(/one full assessment(?! per)/i);
  });
});
