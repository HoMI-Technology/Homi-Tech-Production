import { describe, it, expect } from "vitest";
import { checkedInToday, contextualActionHrefs } from "@/lib/dashboard/context-actions";
import { formatCurrencyTile } from "@/lib/tools/format";

describe("contextualActionHrefs", () => {
  it("leads first-run users to the shortest path to a score", () => {
    expect(
      contextualActionHrefs({ hasAssessment: false, weakestPillar: null, checkedInToday: false }),
    ).toEqual(["/shadow-score", "/assessment", "/money"]);
  });

  it("leads with the weakest-pillar instrument, then launch surfaces", () => {
    expect(
      contextualActionHrefs({
        hasAssessment: true,
        weakestPillar: "emotional",
        checkedInToday: false,
      }),
    ).toEqual(["/advisor", "/path", "/journal"]);
  });

  it("routes each pillar to its instrument", () => {
    expect(
      contextualActionHrefs({
        hasAssessment: true,
        weakestPillar: "financial",
        checkedInToday: true,
      }),
    ).toEqual(["/money/decide", "/path", "/journal"]);
    expect(
      contextualActionHrefs({ hasAssessment: true, weakestPillar: "timing", checkedInToday: true }),
    ).toEqual(["/path", "/journal", "/plan"]);
  });

  it("never features launch-hidden lab fillers", () => {
    const hrefs = contextualActionHrefs({
      hasAssessment: true,
      weakestPillar: "timing",
      checkedInToday: false,
    });
    for (const banned of ["/daily", "/signals", "/simulator", "/trinity", "/genome"]) {
      expect(hrefs).not.toContain(banned);
    }
  });

  it("always returns exactly three unique hrefs", () => {
    const result = contextualActionHrefs({
      hasAssessment: true,
      weakestPillar: null,
      checkedInToday: true,
    });
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
  });
});

describe("checkedInToday", () => {
  const NOW = new Date("2026-07-16T20:00:00");

  it("matches same-calendar-day check-ins", () => {
    expect(checkedInToday("2026-07-16T08:00:00", NOW)).toBe(true);
  });

  it("rejects yesterday, null, and garbage", () => {
    expect(checkedInToday("2026-07-15T23:59:00", NOW)).toBe(false);
    expect(checkedInToday(null, NOW)).toBe(false);
    expect(checkedInToday("not-a-date", NOW)).toBe(false);
  });
});

describe("formatCurrencyTile", () => {
  it("keeps full dollars under $100k", () => {
    expect(formatCurrencyTile(84_250)).toBe("$84,250");
    expect(formatCurrencyTile(-4_500)).toBe("-$4,500");
  });

  it("compacts six figures and up so tiles never overflow", () => {
    expect(formatCurrencyTile(123_456)).toBe("$123.5K");
    expect(formatCurrencyTile(1_234_567)).toBe("$1.2M");
    expect(formatCurrencyTile(-250_000)).toBe("-$250.0K");
  });

  it("degrades to $0 on non-finite input", () => {
    expect(formatCurrencyTile(Number.NaN)).toBe("$0");
  });
});
