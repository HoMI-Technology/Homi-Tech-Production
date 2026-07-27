/**
 * Attribution roll-up contract (lib/dashboard/attribution). What matters:
 * - channel derivation follows the precedence utm_source > partner > referral > direct
 * - every helper tolerates the loose jsonb shape (missing/non-string fields)
 * - counts are deterministic: sorted by count desc, key asc; direct is never
 *   counted as "attributed"
 */

import { describe, it, expect } from "vitest";
import {
  deriveChannel,
  isAttributed,
  countBy,
  channelCounts,
  sourceMediumBreakdown,
  attributionCoverage,
  channelConversion,
  dimension,
  DIRECT_CHANNEL,
} from "@/lib/dashboard/attribution";

describe("deriveChannel", () => {
  it("prefers utm_source, lowercased", () => {
    expect(deriveChannel({ utm_source: "Google", utm_medium: "cpc" })).toBe("google");
  });

  it("maps a partner invite ref to 'partner'", () => {
    expect(deriveChannel({ ref: "ptr_abc12345" })).toBe("partner");
  });

  it("maps any other ref to 'referral'", () => {
    expect(deriveChannel({ ref: "a-friend" })).toBe("referral");
  });

  it("falls back to direct for empty/garbage snapshots", () => {
    expect(deriveChannel(null)).toBe(DIRECT_CHANNEL);
    expect(deriveChannel({})).toBe(DIRECT_CHANNEL);
    expect(deriveChannel({ utm_source: "   " })).toBe(DIRECT_CHANNEL);
    expect(deriveChannel({ utm_source: 42 } as never)).toBe(DIRECT_CHANNEL);
  });
});

describe("isAttributed / dimension", () => {
  it("treats any utm_* or ref as attributed, direct as not", () => {
    expect(isAttributed({ utm_medium: "email" })).toBe(true);
    expect(isAttributed({ ref: "x" })).toBe(true);
    expect(isAttributed({ landing: "/" })).toBe(false);
    expect(isAttributed(null)).toBe(false);
  });

  it("extracts a lowercased dimension or undefined", () => {
    expect(dimension({ utm_campaign: "Launch-Q1" }, "utm_campaign")).toBe("launch-q1");
    expect(dimension({}, "utm_source")).toBeUndefined();
  });
});

describe("countBy / channelCounts", () => {
  it("counts and sorts by count desc then key asc, dropping undefined keys", () => {
    const rows = [
      { utm_campaign: "b" },
      { utm_campaign: "a" },
      { utm_campaign: "a" },
      { landing: "/" }, // no campaign → dropped
    ];
    expect(countBy(rows, (r) => dimension(r, "utm_campaign"))).toEqual([
      { key: "a", count: 2 },
      { key: "b", count: 1 },
    ]);
  });

  it("honours the top cap", () => {
    const rows = [{ ref: "x" }, { utm_source: "google" }, { utm_source: "google" }];
    expect(channelCounts(rows, 1)).toEqual([{ key: "google", count: 2 }]);
  });

  it("includes direct in channel counts", () => {
    expect(channelCounts([{}, {}, { utm_source: "meta" }])).toEqual([
      { key: "direct", count: 2 },
      { key: "meta", count: 1 },
    ]);
  });
});

describe("sourceMediumBreakdown", () => {
  it("pairs source and medium, filling (none) for a missing medium, skipping direct", () => {
    const rows = [
      { utm_source: "google", utm_medium: "cpc" },
      { utm_source: "google", utm_medium: "cpc" },
      { utm_source: "meta" }, // medium missing
      {}, // direct → skipped
    ];
    expect(sourceMediumBreakdown(rows)).toEqual([
      { source: "google", medium: "cpc", count: 2 },
      { source: "meta", medium: "(none)", count: 1 },
    ]);
  });
});

describe("attributionCoverage", () => {
  it("is the attributed share, 0 for an empty set", () => {
    expect(attributionCoverage([])).toBe(0);
    expect(attributionCoverage([{ utm_source: "x" }, {}, {}, {}])).toBe(0.25);
  });
});

describe("channelConversion", () => {
  it("counts signups and paid per channel with a rounded pct, sorted by signups", () => {
    const profiles = [
      { attribution: { utm_source: "google" }, subscription_tier: "pro" },
      { attribution: { utm_source: "google" }, subscription_tier: "free" },
      { attribution: { utm_source: "google" }, subscription_tier: "free" },
      { attribution: { ref: "ptr_abc12345" }, subscription_tier: "family" },
      { attribution: null, subscription_tier: "free" },
    ];
    expect(channelConversion(profiles)).toEqual([
      { channel: "google", signups: 3, paid: 1, paidPct: 33 },
      { channel: "direct", signups: 1, paid: 0, paidPct: 0 },
      { channel: "partner", signups: 1, paid: 1, paidPct: 100 },
    ]);
  });
});
