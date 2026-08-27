import { describe, expect, it } from "vitest";
import { scoreToVerdict } from "@/lib/scoring/public";
import {
  bandProgress,
  daysAgo,
  freshestIso,
  moneyFreshnessLabel,
  scoreFromLabel,
} from "@/lib/dashboard/score-progress";

const DAY_MS = 1000 * 60 * 60 * 24;
const NOW = new Date("2026-08-20T12:00:00Z");

describe("bandProgress", () => {
  it("stays pinned to the public verdict seam — thresholds are never redeclared", () => {
    // The public thresholds (READY >= 80 / ALMOST_THERE >= 65 / BUILD_FIRST >= 50)
    // are stated in AGENTS.md and pinned by __tests__/scoring-public.test.ts; these
    // expectations hold exactly as long as that seam does.
    for (const score of [0, 25, 49, 50, 64, 65, 79, 80, 100]) {
      expect(bandProgress(score).verdict).toBe(scoreToVerdict(score));
    }
  });

  it("names the next band and its exact cost from mid-band", () => {
    const p = bandProgress(60);
    expect(p.verdict).toBe("BUILD_FIRST");
    expect(p.floor).toBe(50);
    expect(p.next).toEqual({ verdict: "ALMOST_THERE", threshold: 65, pointsNeeded: 5 });
  });

  it("crossing cost is 1 point from just below a boundary", () => {
    expect(bandProgress(64).next).toEqual({
      verdict: "ALMOST_THERE",
      threshold: 65,
      pointsNeeded: 1,
    });
    expect(bandProgress(79).next).toEqual({
      verdict: "READY",
      threshold: 80,
      pointsNeeded: 1,
    });
    expect(bandProgress(49).next).toEqual({
      verdict: "BUILD_FIRST",
      threshold: 50,
      pointsNeeded: 1,
    });
  });

  it("NOT_YET floors at 0", () => {
    const p = bandProgress(12);
    expect(p.verdict).toBe("NOT_YET");
    expect(p.floor).toBe(0);
  });

  it("READY has no next band", () => {
    for (const score of [80, 91, 100]) {
      expect(bandProgress(score).next).toBeNull();
    }
  });

  it("clamps out-of-range input instead of drifting off the scale", () => {
    expect(bandProgress(-4).verdict).toBe("NOT_YET");
    expect(bandProgress(140).verdict).toBe("READY");
    expect(bandProgress(140).next).toBeNull();
  });
});

describe("moneyFreshnessLabel", () => {
  it("never-saved says so instead of faking recency", () => {
    expect(moneyFreshnessLabel(null, NOW)).toBe("Money data not saved yet");
    expect(moneyFreshnessLabel("not-a-date", NOW)).toBe("Money data not saved yet");
  });

  it("saved today reads current", () => {
    expect(moneyFreshnessLabel("2026-08-20T08:00:00Z", NOW)).toBe("Money data current");
    expect(moneyFreshnessLabel("2026-08-19T13:00:00Z", NOW)).toBe("Money data current");
  });

  it("older data states its age in days, singular and plural", () => {
    expect(moneyFreshnessLabel("2026-08-19T11:00:00Z", NOW)).toBe("Money data 1 day old");
    expect(moneyFreshnessLabel("2026-08-10T12:00:00Z", NOW)).toBe("Money data 10 days old");
  });

  it("a future stamp is treated as current, not negative-age nonsense", () => {
    expect(moneyFreshnessLabel("2026-08-21T12:00:00Z", NOW)).toBe("Money data current");
  });
});

describe("daysAgo", () => {
  it("returns null on missing or garbage input", () => {
    expect(daysAgo(null, NOW)).toBeNull();
    expect(daysAgo("garbage", NOW)).toBeNull();
  });

  it("counts whole days", () => {
    expect(daysAgo(new Date(NOW.getTime() - 3 * DAY_MS).toISOString(), NOW)).toBe(3);
  });
});

describe("freshestIso", () => {
  it("picks the newest valid stamp", () => {
    expect(
      freshestIso("2026-08-01T00:00:00Z", "2026-08-15T00:00:00Z", "2026-08-10T00:00:00Z"),
    ).toBe("2026-08-15T00:00:00Z");
  });

  it("skips nulls and garbage; null when nothing was ever saved", () => {
    expect(freshestIso(null, "junk", null)).toBeNull();
    expect(freshestIso(null, "2026-01-01T00:00:00Z")).toBe("2026-01-01T00:00:00Z");
    expect(freshestIso()).toBeNull();
  });
});

describe("scoreFromLabel", () => {
  it("formats the assessment date", () => {
    expect(scoreFromLabel("2026-08-01T12:00:00Z")).toBe("Score from Aug 1, 2026");
  });

  it("returns null without a usable date", () => {
    expect(scoreFromLabel(null)).toBeNull();
    expect(scoreFromLabel("not-a-date")).toBeNull();
  });
});
