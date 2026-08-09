import { describe, expect, it } from "vitest";
import {
  anyNeedsAttention,
  goalProgress,
  goalProjection,
  latestSync,
  netWorthDelta,
  netWorthTrend,
  snapshotLiquidSavings,
  syncedAgo,
  type ItemReading,
  type SnapshotReading,
} from "@/lib/dashboard/financial-position";

/** Query order: completed_at descending — newest first, like the dashboard. */
const SNAPSHOTS: SnapshotReading[] = [
  {
    net_worth: 42000,
    net_cash_flow: 800,
    savings_rate: 0.16,
    completed_at: "2026-07-14T12:00:00Z",
    state: null,
  },
  {
    net_worth: "40500",
    net_cash_flow: 650,
    savings_rate: 0.13,
    completed_at: "2026-07-01T12:00:00Z",
    state: null,
  },
  {
    net_worth: 41000,
    net_cash_flow: 700,
    savings_rate: 0.14,
    completed_at: "2026-06-15T12:00:00Z",
    state: null,
  },
];

const NOW = new Date("2026-07-15T12:00:00Z").getTime();

describe("netWorthTrend", () => {
  it("returns the series oldest → newest, coercing numeric strings", () => {
    expect(netWorthTrend(SNAPSHOTS)).toEqual([41000, 40500, 42000]);
  });

  it("is empty-safe", () => {
    expect(netWorthTrend([])).toEqual([]);
  });
});

describe("netWorthDelta", () => {
  it("reports movement vs. the previous snapshot", () => {
    expect(netWorthDelta(SNAPSHOTS)).toEqual({ delta: 1500, tone: "up" });
  });

  it("reports a drop with a down tone", () => {
    expect(netWorthDelta(SNAPSHOTS.slice(1))).toEqual({ delta: -500, tone: "down" });
  });

  it("returns null with fewer than two snapshots", () => {
    expect(netWorthDelta(SNAPSHOTS.slice(0, 1))).toBeNull();
  });
});

describe("syncedAgo", () => {
  it("renders hour-level freshness", () => {
    expect(syncedAgo("2026-07-15T10:00:00Z", NOW)).toBe("Synced 2h ago");
  });

  it("renders minute-level freshness", () => {
    expect(syncedAgo("2026-07-15T11:15:00Z", NOW)).toBe("Synced 45m ago");
  });

  it("renders day-level freshness and 'just now'", () => {
    expect(syncedAgo("2026-07-12T12:00:00Z", NOW)).toBe("Synced 3d ago");
    expect(syncedAgo("2026-07-15T11:59:40Z", NOW)).toBe("Synced just now");
  });

  it("handles never-synced and malformed timestamps", () => {
    expect(syncedAgo(null, NOW)).toBe("Not yet synced");
    expect(syncedAgo("not-a-date", NOW)).toBe("Not yet synced");
  });
});

describe("attention + latest sync", () => {
  const items: ItemReading[] = [
    {
      id: "i1",
      institution_name: "First Bank",
      status: "healthy",
      last_successful_sync: "2026-07-15T10:00:00Z",
    },
    {
      id: "i2",
      institution_name: "Credit Union",
      status: "login_required",
      last_successful_sync: "2026-07-10T10:00:00Z",
    },
  ];

  it("flags attention when any item is not healthy", () => {
    expect(anyNeedsAttention(items)).toBe(true);
    expect(anyNeedsAttention([items[0]])).toBe(false);
    expect(anyNeedsAttention([])).toBe(false);
  });

  it("finds the most recent successful sync across items", () => {
    expect(latestSync(items)).toBe("2026-07-15T10:00:00Z");
    expect(latestSync([])).toBeNull();
  });
});

describe("snapshotLiquidSavings", () => {
  it("reads liquid savings from a plaid_sync state", () => {
    expect(snapshotLiquidSavings({ source: "plaid_sync", liquidSavings: 12500 })).toBe(12500);
  });

  it("returns null for other sources or missing figures", () => {
    expect(snapshotLiquidSavings({ source: "manual", liquidSavings: 12500 })).toBeNull();
    expect(snapshotLiquidSavings({ source: "plaid_sync" })).toBeNull();
    expect(snapshotLiquidSavings(null)).toBeNull();
  });
});

describe("goalProgress", () => {
  it("computes clamped progress", () => {
    expect(goalProgress(60000, 15000)).toEqual({ ratio: 0.25, saved: 15000, remaining: 45000 });
    expect(goalProgress(60000, 90000)).toEqual({ ratio: 1, saved: 90000, remaining: 0 });
    expect(goalProgress(0, 5000)).toEqual({ ratio: 0, saved: 5000, remaining: 0 });
  });
});

describe("goalProjection", () => {
  it("projects the month the target is reached at the current cash flow", () => {
    const projection = goalProjection(60000, 54000, 1000, NOW);
    expect(projection?.months).toBe(6);
    expect(projection?.label).toBe("January 2027");
  });

  it("omits the projection rather than guess", () => {
    // No cash-flow data at all.
    expect(goalProjection(60000, 10000, null, NOW)).toBeNull();
    // Zero or negative cash flow can never reach the target.
    expect(goalProjection(60000, 10000, 0, NOW)).toBeNull();
    expect(goalProjection(60000, 10000, -200, NOW)).toBeNull();
    // Already met — the card says so instead of projecting.
    expect(goalProjection(60000, 60000, 1000, NOW)).toBeNull();
    // A trivial surplus must not claim a date decades out.
    expect(goalProjection(600000, 0, 5, NOW)).toBeNull();
  });
});
