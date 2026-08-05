import { describe, it, expect } from "vitest";
import { companionTierCopy } from "@/lib/advisor/companion-tier-copy";
import { getEntitlements } from "@/lib/entitlements";

describe("companionTierCopy (CL-09 honest free vs paid labeling)", () => {
  it("labels free tier as limited rule-based Companion with daily limit + upgrade", () => {
    const free = getEntitlements("free");
    const copy = companionTierCopy({
      advisorRealModel: free.advisorRealModel,
      advisorMessagesPerDay: free.advisorMessagesPerDay,
    });

    expect(free.advisorRealModel).toBe(false);
    expect(copy.kind).toBe("free");
    expect(copy.summary.toLowerCase()).toContain("rule-based");
    expect(copy.summary.toLowerCase()).toContain("free");
    expect(copy.summary.toLowerCase()).not.toMatch(/\bfull ai\b/);
    expect(copy.detail).toContain(`${free.advisorMessagesPerDay} messages/day`);
    expect(copy.detail?.toLowerCase()).toContain("upgrade");
    expect(copy.upgradeHref).toBe("/pricing");
    expect(copy.upgradeLabel).toBeTruthy();
  });

  it("labels paid tiers as Full AI Companion without inventing a model name", () => {
    for (const tier of ["plus", "pro", "family"] as const) {
      const paid = getEntitlements(tier);
      const copy = companionTierCopy({
        advisorRealModel: paid.advisorRealModel,
        advisorMessagesPerDay: paid.advisorMessagesPerDay,
      });

      expect(paid.advisorRealModel, `${tier} should grant real model`).toBe(true);
      expect(copy.kind).toBe("paid");
      expect(copy.summary).toBe("Full AI Companion");
      expect(copy.upgradeHref).toBeUndefined();
      // Never invent Anthropic / model product names in UI copy.
      expect(copy.summary.toLowerCase()).not.toMatch(/claude|anthropic|gpt|haiku|sonnet/);
    }
  });

  it("falls back to a sane daily count when input is invalid (still free-honest)", () => {
    const copy = companionTierCopy({
      advisorRealModel: false,
      advisorMessagesPerDay: 0,
    });
    expect(copy.kind).toBe("free");
    expect(copy.detail).toMatch(/5 messages\/day/);
  });
});
