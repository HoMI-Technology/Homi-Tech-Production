/**
 * Ranked horizontal bars — the "share of total" pattern used across the admin
 * dashboards (tier mix, verdict split, waitlist interests) extracted into one
 * reusable server component. Each row shows a label, its count + share, and a
 * gradient bar. Server-safe (no client JS).
 */

import { COLORS } from "@/lib/brand";

const DEFAULT_COLOR = COLORS.cyan;

export interface RankedBarRow {
  /** Row label (left side). */
  label: string;
  /** The raw count driving the bar width. */
  count: number;
  /** Optional per-row accent; falls back to the shared color. */
  color?: string;
  /** Optional secondary text shown under the label (e.g. a medium). */
  sublabel?: string;
}

export function RankedBars({
  rows,
  color = DEFAULT_COLOR,
  emptyLabel = "No data yet.",
  /** Denominator for the share %. Defaults to the sum of counts. */
  total,
  /** Format the numeric value shown on the right (default: locale integer). */
  formatValue = (n: number) => n.toLocaleString(),
}: {
  rows: RankedBarRow[];
  color?: string;
  emptyLabel?: string;
  total?: number;
  formatValue?: (n: number) => string;
}) {
  if (rows.length === 0) {
    return <p className="py-6 text-center text-sm text-dim">{emptyLabel}</p>;
  }

  const denom = total ?? rows.reduce((acc, r) => acc + r.count, 0);
  const max = Math.max(1, ...rows.map((r) => r.count));

  return (
    <div className="space-y-4">
      {rows.map((row) => {
        const c = row.color ?? color;
        const share = denom > 0 ? Math.round((row.count / denom) * 100) : 0;
        // Bar width is relative to the largest row so small channels stay visible.
        const width = Math.round((row.count / max) * 100);
        return (
          <div key={`${row.label}-${row.sublabel ?? ""}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 font-semibold text-light">
                <span
                  aria-hidden
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ background: c, boxShadow: `0 0 8px ${c}` }}
                />
                <span className="capitalize">{row.label}</span>
                {row.sublabel && (
                  <span className="text-xs font-normal lowercase text-dim">· {row.sublabel}</span>
                )}
              </span>
              <span className="score-numeral text-dim">
                {formatValue(row.count)} · {share}%
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
              <div
                className="h-full rounded-full"
                style={{ width: `${width}%`, background: `linear-gradient(90deg, ${c}99, ${c})` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
