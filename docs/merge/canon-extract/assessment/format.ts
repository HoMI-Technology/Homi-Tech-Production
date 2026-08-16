/** Formatting helpers shared across the assessment flows. */

/** Formats a number with thousands commas, e.g. 125000 -> "125,000". Empty string passes through. */
export function formatNumber(value: number | string): string {
  if (value === "" || value === null || value === undefined) return "";
  const num = typeof value === "string" ? Number(value.replace(/,/g, "")) : value;
  if (Number.isNaN(num)) return "";
  return num.toLocaleString("en-US");
}

/** Strips commas and non-numeric characters (keeps digits and a single leading decimal point). */
export function parseNumber(value: string): number {
  const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

/** Clamps a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Converts a 1-10 (or arbitrary min/max) slider value into a --fill percentage for .homi-slider. */
export function sliderFillPercent(value: number, min: number, max: number): number {
  if (max === min) return 0;
  return ((value - min) / (max - min)) * 100;
}

export interface ScoreDelta {
  /** e.g. "+4 since Jun 12", "-3 since Jun 12", "Unchanged since Jun 12" */
  text: string;
  tone: "up" | "down" | "flat";
}

/**
 * Computes the display badge for score movement vs. a previous assessment.
 * Pure function — no formatting library dependency beyond Intl.DateTimeFormat.
 */
export function formatScoreDelta(current: number, previous: number, previousDate: string): ScoreDelta {
  const diff = Math.round(current) - Math.round(previous);
  const date = new Date(previousDate);
  const dateLabel = Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const suffix = dateLabel ? ` since ${dateLabel}` : "";

  if (diff === 0) {
    return { text: `Unchanged${suffix}`, tone: "flat" };
  }
  if (diff > 0) {
    return { text: `+${diff}${suffix}`, tone: "up" };
  }
  return { text: `${diff}${suffix}`, tone: "down" };
}
