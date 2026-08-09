/**
 * Closing cost estimator — educational only.
 * Typical range band 2%–5% of purchase price (not a quote).
 */

export type ClosingCostInput = {
  homePrice: number;
  /** Extra fixed fees beyond the % band (title, inspection, etc.) */
  extraFees?: number;
};

export type ClosingCostEstimate = {
  homePrice: number;
  low: number;
  mid: number;
  high: number;
  extraFees: number;
  totalLow: number;
  totalMid: number;
  totalHigh: number;
};

function finiteNonNeg(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
}

/** Mid uses 3.5% of price — a common planning midpoint, not a market quote. */
export function estimateClosingCosts(input: ClosingCostInput): ClosingCostEstimate {
  const homePrice = finiteNonNeg(input.homePrice);
  const extraFees = finiteNonNeg(input.extraFees ?? 0);
  const low = homePrice * 0.02;
  const mid = homePrice * 0.035;
  const high = homePrice * 0.05;
  return {
    homePrice,
    low,
    mid,
    high,
    extraFees,
    totalLow: low + extraFees,
    totalMid: mid + extraFees,
    totalHigh: high + extraFees,
  };
}
