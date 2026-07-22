import { describe, it, expect } from "vitest";
import { formatCSV } from "@/lib/dashboard/csv";
import {
  dailySucceededCents,
  formatUsdFromCents,
  sumSucceededCents,
} from "@/lib/dashboard/revenue";

describe("admin CSV export format", () => {
  it("escapes quotes and joins headers", () => {
    const csv = formatCSV(
      ["Email", "Joined", "Role"],
      [
        { Email: 'a"b@x.com', Joined: "2026-01-01", Role: "user" },
        { Email: "c@x.com", Joined: "2026-01-02", Role: "admin" },
      ],
    );
    expect(csv.split("\n")[0]).toBe("Email,Joined,Role");
    expect(csv).toContain('"a""b@x.com"');
    expect(csv).toContain('"admin"');
  });
});

describe("revenue calculation", () => {
  it("sums only succeeded amounts in cents", () => {
    const total = sumSucceededCents([
      { amount: 2900, status: "succeeded", created_at: "2026-07-01T00:00:00Z" },
      { amount: 1000, status: "failed", created_at: "2026-07-02T00:00:00Z" },
      { amount: 4900, status: "succeeded", created_at: "2026-07-03T00:00:00Z" },
      { amount: 999, status: "refunded", created_at: "2026-07-04T00:00:00Z" },
    ]);
    expect(total).toBe(7800);
    expect(formatUsdFromCents(7800)).toMatch(/\$78/);
  });

  it("buckets daily succeeded cents", () => {
    const now = new Date("2026-07-10T12:00:00Z");
    const series = dailySucceededCents(
      [
        { amount: 100, status: "succeeded", created_at: "2026-07-10T01:00:00Z" },
        { amount: 200, status: "succeeded", created_at: "2026-07-09T01:00:00Z" },
        { amount: 999, status: "pending", created_at: "2026-07-10T02:00:00Z" },
      ],
      3,
      now,
    );
    expect(series).toHaveLength(3);
    expect(series.find((d) => d.date === "2026-07-10")?.cents).toBe(100);
    expect(series.find((d) => d.date === "2026-07-09")?.cents).toBe(200);
  });
});
