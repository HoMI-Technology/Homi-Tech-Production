import { describe, it, expect } from "vitest";
import { pageSection } from "@/lib/analytics";
import { FUNNEL_EVENTS, parseRange, rangeDays } from "@/lib/analytics/posthog";

describe("pageSection", () => {
  it("maps the root path to home", () => {
    expect(pageSection("/")).toBe("home");
  });

  it("keeps only the first path segment", () => {
    expect(pageSection("/admin/analytics")).toBe("admin");
    expect(pageSection("/shadow-score/results")).toBe("shadow-score");
  });

  it("never leaks dynamic segments (share tokens, ids)", () => {
    expect(pageSection("/share/tok_abc123XYZ")).toBe("share");
    expect(pageSection("/assessment/9f0c-1234/results")).toBe("assessment");
  });

  it("strips unsafe characters and lowercases", () => {
    // usePathname() never includes the query string, so inputs are bare paths.
    expect(pageSection("/Pricing")).toBe("pricing");
    expect(pageSection("/weird$%20path")).toBe("weird20path");
  });
});

describe("parseRange / rangeDays", () => {
  it("defaults to 30d for missing or unknown values", () => {
    expect(parseRange(undefined)).toBe("30d");
    expect(parseRange("1y")).toBe("30d");
    expect(parseRange(["7d", "30d"])).toBe("30d");
  });

  it("accepts 7d explicitly", () => {
    expect(parseRange("7d")).toBe("7d");
    expect(rangeDays("7d")).toBe(7);
    expect(rangeDays("30d")).toBe(30);
  });
});

describe("FUNNEL_EVENTS", () => {
  it("matches the product funnel order exactly", () => {
    expect(FUNNEL_EVENTS).toEqual([
      "assessment_started",
      "assessment_completed",
      "checkout_started",
      "checkout_completed",
      "share_created",
    ]);
  });
});
