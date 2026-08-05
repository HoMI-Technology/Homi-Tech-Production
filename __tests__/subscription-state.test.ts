import { describe, expect, it } from "vitest";
import { hasActivePaidSubscription } from "@/lib/stripe/subscription-state";

describe("hasActivePaidSubscription", () => {
  it("is false for free tier", () => {
    expect(hasActivePaidSubscription("free", "active")).toBe(false);
    expect(hasActivePaidSubscription(null, null)).toBe(false);
    expect(hasActivePaidSubscription(undefined, "active")).toBe(false);
  });

  it("is true for paid tiers with active-like statuses", () => {
    expect(hasActivePaidSubscription("plus", "active")).toBe(true);
    expect(hasActivePaidSubscription("pro", "trialing")).toBe(true);
    expect(hasActivePaidSubscription("family", "cancelling")).toBe(true);
    expect(hasActivePaidSubscription("plus", "past_due")).toBe(true);
    expect(hasActivePaidSubscription("pro", "unpaid")).toBe(true);
    expect(hasActivePaidSubscription("plus", "incomplete")).toBe(true);
  });

  it("treats paid tier with missing status as active (fail closed)", () => {
    expect(hasActivePaidSubscription("plus", null)).toBe(true);
    expect(hasActivePaidSubscription("plus", "")).toBe(true);
  });

  it("is false for paid tier after cancel", () => {
    expect(hasActivePaidSubscription("plus", "cancelled")).toBe(false);
    expect(hasActivePaidSubscription("pro", "canceled")).toBe(false);
  });
});
