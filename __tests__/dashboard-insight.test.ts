import { describe, it, expect } from "vitest";
import {
  dashboardInsight,
  greetingForHour,
  hourInTimezone,
  movedPillar,
  verdictHeldDays,
  verdictImproved,
  type AssessmentReading,
} from "@/lib/dashboard/insight";

function reading(overrides: Partial<AssessmentReading> = {}): AssessmentReading {
  return {
    overall_score: 60,
    verdict: "BUILD_FIRST",
    financial_score: 20,
    emotional_score: 22,
    timing_score: 18,
    date: "2026-06-01T12:00:00Z",
    ...overrides,
  };
}

describe("dashboardInsight", () => {
  it("returns null with no assessments", () => {
    expect(dashboardInsight({ latest: null, previous: null, checkinsThisWeek: 0 })).toBeNull();
  });

  it("celebrates a verdict crossing upward above all other rules", () => {
    const insight = dashboardInsight({
      latest: reading({ verdict: "ALMOST_THERE", overall_score: 70, date: "2026-07-01T12:00:00Z" }),
      previous: reading({ verdict: "BUILD_FIRST", overall_score: 60 }),
      checkinsThisWeek: 7,
    });
    expect(insight).toContain("ALMOST THERE");
    expect(insight).toContain("July 1");
  });

  it("names the driver when the verdict drops", () => {
    const insight = dashboardInsight({
      latest: reading({ verdict: "BUILD_FIRST", overall_score: 60, financial_score: 12 }),
      previous: reading({ verdict: "ALMOST_THERE", overall_score: 70, financial_score: 25 }),
      checkinsThisWeek: 0,
    });
    expect(insight).toContain("BUILD FIRST");
    expect(insight).toContain("Financial Reality");
  });

  it("credits the lifting pillar on a same-verdict score rise", () => {
    const insight = dashboardInsight({
      latest: reading({ overall_score: 64, emotional_score: 30 }),
      previous: reading({ overall_score: 58, emotional_score: 20, date: "2026-05-15T12:00:00Z" }),
      checkinsThisWeek: 0,
    });
    expect(insight).toContain("up 6");
    expect(insight).toContain("May 15");
    expect(insight).toContain("Emotional Truth");
  });

  it("is honest about a score drop", () => {
    const insight = dashboardInsight({
      latest: reading({ overall_score: 55, timing_score: 10 }),
      previous: reading({ overall_score: 62, timing_score: 20 }),
      checkinsThisWeek: 0,
    });
    expect(insight).toContain("down 7");
    expect(insight).toContain("Perfect Timing");
  });

  it("marks the first measurement", () => {
    const insight = dashboardInsight({ latest: reading(), previous: null, checkinsThisWeek: 0 });
    expect(insight).toContain("first measurement");
  });

  it("prefers cadence over holding-steady when both apply", () => {
    const insight = dashboardInsight({
      latest: reading({ overall_score: 60 }),
      previous: reading({ overall_score: 60 }),
      checkinsThisWeek: 6,
    });
    expect(insight).toContain("6 check-ins");
  });

  it("falls back to holding steady on a flat repeat", () => {
    const insight = dashboardInsight({
      latest: reading({ overall_score: 60 }),
      previous: reading({ overall_score: 60, date: "2026-05-01T12:00:00Z" }),
      checkinsThisWeek: 2,
    });
    expect(insight).toContain("Holding steady at 60");
  });

  it("never invents a driver when pillar movement contradicts the direction", () => {
    // Score up but the biggest pillar move is negative → no driver clause.
    const insight = dashboardInsight({
      latest: reading({
        overall_score: 64,
        financial_score: 10,
        emotional_score: 22,
        timing_score: 18,
      }),
      previous: reading({
        overall_score: 60,
        financial_score: 25,
        emotional_score: 22,
        timing_score: 18,
      }),
      checkinsThisWeek: 0,
    });
    expect(insight).toContain("up 4");
    expect(insight).not.toContain("did the lifting");
  });
});

describe("movedPillar", () => {
  it("picks the largest absolute mover", () => {
    const result = movedPillar(
      reading({ financial_score: 20, emotional_score: 30, timing_score: 18 }),
      reading({ financial_score: 22, emotional_score: 20, timing_score: 18 }),
    );
    expect(result).toEqual({ name: "Emotional Truth", delta: 10 });
  });

  it("breaks ties in canonical pillar order", () => {
    const result = movedPillar(
      reading({ financial_score: 25, emotional_score: 27, timing_score: 18 }),
      reading({ financial_score: 20, emotional_score: 22, timing_score: 18 }),
    );
    expect(result?.name).toBe("Financial Reality");
  });

  it("returns null when pillar scores are missing", () => {
    const result = movedPillar(
      reading({ financial_score: null, emotional_score: null, timing_score: null }),
      reading({ financial_score: null, emotional_score: null, timing_score: null }),
    );
    expect(result).toBeNull();
  });
});

describe("verdictImproved", () => {
  it("detects an upward crossing", () => {
    expect(verdictImproved("READY", "ALMOST_THERE")).toBe(true);
  });
  it("rejects flat, downward, and unknown verdicts", () => {
    expect(verdictImproved("READY", "READY")).toBe(false);
    expect(verdictImproved("BUILD_FIRST", "READY")).toBe(false);
    expect(verdictImproved("READY", null)).toBe(false);
    expect(verdictImproved("BOGUS", "NOT_YET")).toBe(false);
  });
});

describe("verdictHeldDays", () => {
  const NOW = new Date("2026-07-16T12:00:00Z").getTime();

  it("walks back through the consecutive streak of the latest verdict", () => {
    const days = verdictHeldDays(
      [
        { verdict: "ALMOST_THERE", date: "2026-07-10T12:00:00Z" },
        { verdict: "ALMOST_THERE", date: "2026-06-16T12:00:00Z" },
        { verdict: "BUILD_FIRST", date: "2026-05-01T12:00:00Z" },
      ],
      NOW,
    );
    expect(days).toBe(30); // held since June 16, not July 10
  });

  it("uses the single assessment when there is no streak", () => {
    const days = verdictHeldDays([{ verdict: "READY", date: "2026-07-15T12:00:00Z" }], NOW);
    expect(days).toBe(1);
  });

  it("returns null with no assessments or no verdict", () => {
    expect(verdictHeldDays([], NOW)).toBeNull();
    expect(verdictHeldDays([{ verdict: null, date: "2026-07-15T12:00:00Z" }], NOW)).toBeNull();
  });
});

describe("greeting", () => {
  it("maps hours to daypart greetings with a neutral fallback", () => {
    expect(greetingForHour(null)).toBe("Welcome back");
    expect(greetingForHour(3)).toBe("Welcome back");
    expect(greetingForHour(9)).toBe("Good morning");
    expect(greetingForHour(13)).toBe("Good afternoon");
    expect(greetingForHour(21)).toBe("Good evening");
  });

  it("resolves the hour in the visitor's timezone, never the server's", () => {
    const now = new Date("2026-07-16T15:00:00Z"); // 11am New York, north of midnight Tokyo
    expect(hourInTimezone("America/New_York", now)).toBe(11);
    expect(hourInTimezone("Asia/Tokyo", now)).toBe(0);
  });

  it("returns null on unknown or invalid timezones", () => {
    expect(hourInTimezone(null)).toBeNull();
    expect(hourInTimezone("Not/AZone")).toBeNull();
  });
});
