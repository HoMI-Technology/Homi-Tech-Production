"use client";

import { fmt } from "@/lib/planner/palette";
import { COLORS } from "@/lib/brand";

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { fill?: string };
};

/** Shared dark tooltip for planner Recharts charts. */
export default function ChartTooltip({
  active,
  label,
  payload,
  format,
}: {
  active?: boolean;
  label?: string | number;
  payload?: TooltipPayloadItem[];
  format?: (n: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const f = format ?? ((n: number) => fmt(n));
  return (
    <div className="rounded-xl border border-line bg-navy/95 px-3 py-2 shadow-xl backdrop-blur">
      {label !== undefined && label !== "" && (
        <p className="mb-1.5 text-xs uppercase tracking-wide text-dim">
          {String(label)}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{
                backgroundColor:
                  item.color ?? item.payload?.fill ?? COLORS.dim,
              }}
            />
            <span className="text-xs text-dim">{item.name}</span>
            <span className="ml-auto pl-4 score-numeral text-xs text-light">
              {typeof item.value === "number" ? f(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
