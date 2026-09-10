import { COLORS } from "@/lib/brand";
import type { Temperature } from "@/lib/planner/types";

/** Gauge temperature → brand hex (chart strokes only). */
export const TEMP_HEX: Record<Temperature, string> = {
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
  amber: COLORS.amber,
  crimson: COLORS.crimson,
};

/** en-US USD. 0 decimals for KPIs, 2 for rows. */
export function fmt(n: number, decimals = 0): string {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}
