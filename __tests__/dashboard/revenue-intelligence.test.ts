/**
 * Revenue-intelligence contract (lib/dashboard/revenue). What matters:
 * - MRR is priced off the tier SSOT and is a pure list-price roll-up
 * - ARPU / conversion never divide by zero
 * - callers exclude comped accounts; the math itself trusts the counts given
 */

import { describe, it, expect } from "vitest";
import {
  TIER_MONTHLY_CENTS,
  estimatedMrrCents,
  payingCount,
  arpuCents,
  arrCents,
  paidConversionPct,
} from "@/lib/dashboard/revenue";

const counts = { plus: 10, pro: 4, family: 2 };

describe("estimatedMrrCents", () => {
  it("sums tier counts × list price from the pricing SSOT", () => {
    const expected =
      10 * TIER_MONTHLY_CENTS.plus + 4 * TIER_MONTHLY_CENTS.pro + 2 * TIER_MONTHLY_CENTS.family;
    expect(estimatedMrrCents(counts)).toBe(expected);
  });

  it("is 0 with no payers", () => {
    expect(estimatedMrrCents({ plus: 0, pro: 0, family: 0 })).toBe(0);
  });
});

describe("payingCount / arpuCents / arrCents", () => {
  it("counts all paid tiers", () => {
    expect(payingCount(counts)).toBe(16);
  });

  it("ARPU is MRR / payers, rounded", () => {
    expect(arpuCents(counts)).toBe(Math.round(estimatedMrrCents(counts) / 16));
  });

  it("ARPU is 0 when there are no payers (no divide-by-zero)", () => {
    expect(arpuCents({ plus: 0, pro: 0, family: 0 })).toBe(0);
  });

  it("ARR is MRR × 12", () => {
    expect(arrCents(counts)).toBe(estimatedMrrCents(counts) * 12);
  });
});

describe("paidConversionPct", () => {
  it("is payers / total accounts as a rounded percentage", () => {
    expect(paidConversionPct(counts, 200)).toBe(8); // 16/200 = 8%
  });

  it("is 0 when there are no accounts", () => {
    expect(paidConversionPct(counts, 0)).toBe(0);
  });
});
