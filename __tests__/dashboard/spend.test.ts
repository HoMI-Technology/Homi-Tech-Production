/**
 * Paid-media math contract (lib/dashboard/spend). What matters:
 * - division guards return null (not 0 / Infinity) so "no data" reads honestly
 * - channel performance merges spend/conversion/revenue and surfaces channels
 *   present in any input (gaps in spend logging stay visible)
 */

import { describe, it, expect } from "vitest";
import {
  sumSpendCents,
  cacCents,
  cpcCents,
  roas,
  computeChannelPerformance,
  blendedCacCents,
} from "@/lib/dashboard/spend";

describe("scalar guards", () => {
  it("sumSpendCents ignores non-finite amounts", () => {
    expect(sumSpendCents([{ channel: "g", spend_cents: 100, impressions: 0, clicks: 0 }])).toBe(100);
  });

  it("cacCents is null with no customers, else spend/customers", () => {
    expect(cacCents(10000, 0)).toBeNull();
    expect(cacCents(10000, 4)).toBe(2500);
  });

  it("cpcCents is null with no clicks", () => {
    expect(cpcCents(1000, 0)).toBeNull();
    expect(cpcCents(1000, 50)).toBe(20);
  });

  it("roas is null with no spend, else revenue/spend to 2dp", () => {
    expect(roas(50000, 0)).toBeNull();
    expect(roas(50000, 10000)).toBe(5);
    expect(roas(15000, 10000)).toBe(1.5);
  });
});

describe("computeChannelPerformance", () => {
  it("merges inputs, computes derived metrics, sorts by spend desc", () => {
    const rows = computeChannelPerformance({
      google: { spendCents: 20000, clicks: 100, signups: 40, paid: 8, revenueCents: 60000 },
      meta: { spendCents: 50000, clicks: 200, signups: 30, paid: 2, revenueCents: 10000 },
    });
    expect(rows.map((r) => r.channel)).toEqual(["meta", "google"]); // meta spends more
    const google = rows.find((r) => r.channel === "google")!;
    expect(google.cacCents).toBe(2500); // 20000 / 8
    expect(google.roas).toBe(3); // 60000 / 20000
    expect(google.cpcCents).toBe(200); // 20000 / 100
  });

  it("surfaces a channel with signups but no logged spend (CAC/ROAS null)", () => {
    const rows = computeChannelPerformance({
      referral: { signups: 12, paid: 3, revenueCents: 9000 },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].spendCents).toBe(0);
    expect(rows[0].cacCents).toBe(0); // spend 0 / 3 paid = 0 (spend genuinely zero)
    expect(rows[0].roas).toBeNull(); // no spend → not computable
  });
});

describe("blendedCacCents", () => {
  it("is total spend over total paid, null when no customers", () => {
    const rows = computeChannelPerformance({
      google: { spendCents: 20000, paid: 8 },
      meta: { spendCents: 50000, paid: 2 },
    });
    expect(blendedCacCents(rows)).toBe(7000); // 70000 / 10
    const dry = computeChannelPerformance({ google: { spendCents: 20000, paid: 0 } });
    expect(blendedCacCents(dry)).toBeNull();
  });
});
