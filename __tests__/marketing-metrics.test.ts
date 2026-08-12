import { describe, expect, it } from "vitest";
import {
  MIN_COHORT_N,
  MARKETING_SAMPLE_CAP,
  cohortActivatedCount,
  cohortActivationRatePct,
  completionEventsInWindow,
  dailyUniqueActivatedSeries,
  isAtSampleCap,
  sortBySeverity,
  uniqueActivatedUsers,
  uniqueEverActivated,
} from "@/lib/admin/marketing-metrics";

const windowStart = new Date("2026-08-05T00:00:00.000Z");

describe("uniqueActivatedUsers", () => {
  it("counts distinct users with a completion in window", () => {
    const rows = [
      { user_id: "a", completed_at: "2026-08-10T12:00:00.000Z", created_at: "2026-08-10T12:00:00.000Z" },
      { user_id: "a", completed_at: "2026-08-11T12:00:00.000Z", created_at: "2026-08-11T12:00:00.000Z" },
      { user_id: "b", completed_at: "2026-08-09T12:00:00.000Z", created_at: "2026-08-09T12:00:00.000Z" },
      { user_id: "c", completed_at: "2026-08-01T12:00:00.000Z", created_at: "2026-08-01T12:00:00.000Z" },
    ];
    const set = uniqueActivatedUsers(rows, windowStart);
    expect(set.size).toBe(2);
    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(true);
    expect(set.has("c")).toBe(false);
  });

  it("ignores null user_id", () => {
    const rows = [
      { user_id: null, completed_at: "2026-08-10T12:00:00.000Z", created_at: "2026-08-10T12:00:00.000Z" },
    ];
    expect(uniqueActivatedUsers(rows, windowStart).size).toBe(0);
  });
});

describe("completionEventsInWindow", () => {
  it("counts events not unique users", () => {
    const rows = [
      { user_id: "a", completed_at: "2026-08-10T12:00:00.000Z", created_at: "2026-08-10T12:00:00.000Z" },
      { user_id: "a", completed_at: "2026-08-11T12:00:00.000Z", created_at: "2026-08-11T12:00:00.000Z" },
    ];
    expect(completionEventsInWindow(rows, windowStart)).toBe(2);
    expect(uniqueActivatedUsers(rows, windowStart).size).toBe(1);
  });
});

describe("cohortActivationRatePct", () => {
  it("returns null when n is below MIN_COHORT_N", () => {
    expect(cohortActivationRatePct(2, 3)).toBeNull();
    expect(MIN_COHORT_N).toBe(5);
  });

  it("returns integer percent when n is large enough", () => {
    expect(cohortActivationRatePct(2, 10)).toBe(20);
    expect(cohortActivationRatePct(0, 10)).toBe(0);
  });

  it("returns null for zero denominator", () => {
    expect(cohortActivationRatePct(0, 0)).toBeNull();
  });
});

describe("cohortActivatedCount", () => {
  it("counts new accounts who ever completed", () => {
    const newAccounts = [
      { id: "a", created_at: "2026-08-10T00:00:00.000Z" },
      { id: "b", created_at: "2026-08-10T00:00:00.000Z" },
      { id: "old", created_at: "2026-07-01T00:00:00.000Z" },
    ];
    const completed = new Set(["a", "c"]);
    expect(cohortActivatedCount(newAccounts, completed, windowStart)).toBe(1);
  });
});

describe("isAtSampleCap", () => {
  it("flags when row count hits cap", () => {
    expect(isAtSampleCap(MARKETING_SAMPLE_CAP)).toBe(true);
    expect(isAtSampleCap(MARKETING_SAMPLE_CAP - 1)).toBe(false);
  });
});

describe("sortBySeverity", () => {
  it("orders critical before warn before info before ok", () => {
    const items = [
      { id: "ok", severity: "ok" as const },
      { id: "warn", severity: "warn" as const },
      { id: "crit", severity: "critical" as const },
      { id: "info", severity: "info" as const },
    ];
    expect(sortBySeverity(items).map((i) => i.id)).toEqual(["crit", "warn", "info", "ok"]);
  });

  it("keeps stable order within the same severity", () => {
    const items = [
      { id: "w1", severity: "warn" as const },
      { id: "w2", severity: "warn" as const },
    ];
    expect(sortBySeverity(items).map((i) => i.id)).toEqual(["w1", "w2"]);
  });
});

describe("dailyUniqueActivatedSeries", () => {
  it("counts unique users per UTC day", () => {
    const since = new Date("2026-08-10T00:00:00.000Z");
    const rows = [
      { user_id: "a", completed_at: "2026-08-10T12:00:00.000Z", created_at: "2026-08-10T12:00:00.000Z" },
      { user_id: "a", completed_at: "2026-08-10T18:00:00.000Z", created_at: "2026-08-10T18:00:00.000Z" },
      { user_id: "b", completed_at: "2026-08-10T15:00:00.000Z", created_at: "2026-08-10T15:00:00.000Z" },
    ];
    const series = dailyUniqueActivatedSeries(rows, since, 2);
    expect(series[0]?.count).toBe(2);
  });
});

describe("uniqueEverActivated", () => {
  it("counts all-time unique completers in sample", () => {
    const rows = [
      { user_id: "a", completed_at: "2026-08-10T12:00:00.000Z", created_at: "2026-08-10T12:00:00.000Z" },
      { user_id: "a", completed_at: "2026-08-11T12:00:00.000Z", created_at: "2026-08-11T12:00:00.000Z" },
      { user_id: "b", completed_at: "2026-08-09T12:00:00.000Z", created_at: "2026-08-09T12:00:00.000Z" },
    ];
    expect(uniqueEverActivated(rows)).toBe(2);
  });
});
