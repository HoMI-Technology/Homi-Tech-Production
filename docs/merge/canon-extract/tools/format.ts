/** Shared formatting helpers for the tools vertical. */

export function formatCurrency(value: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 0;
  if (!Number.isFinite(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function formatCompactCurrency(value: number, opts: { minDecimals?: number } = {}): string {
  if (!Number.isFinite(value)) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
    minimumFractionDigits: opts.minDecimals ?? 0,
  }).format(value);
}

/**
 * Money for stat-tile hero numerals: full dollars under $100k, compact with
 * exactly one decimal ("$123.5K", "-$250.0K", "$1.2M") at or above — six-figure
 * strings overflow the tiles in the dashboard's 2-column mobile grid, and the
 * fixed decimal keeps negative and positive magnitudes symmetric.
 */
export function formatCurrencyTile(value: number): string {
  if (!Number.isFinite(value)) return "$0";
  return Math.abs(value) >= 100_000 ? formatCompactCurrency(value, { minDecimals: 1 }) : formatCurrency(value);
}

export function formatPercent(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "0%";
  return `${value.toFixed(decimals)}%`;
}

export function formatMonths(months: number): string {
  const m = Math.round(months);
  if (m < 12) return `${m} month${m === 1 ? "" : "s"}`;
  const years = Math.floor(m / 12);
  const rem = m % 12;
  if (rem === 0) return `${years} year${years === 1 ? "" : "s"}`;
  return `${years}y ${rem}mo`;
}
