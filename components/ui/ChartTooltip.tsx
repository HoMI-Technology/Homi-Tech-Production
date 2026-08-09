"use client";

import { COLORS } from "@/lib/brand";
import { formatCurrency } from "@/lib/tools/format";

type TooltipPayloadItem = {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: { fill?: string };
};

/** Shared dark tooltip for all Recharts charts — glass surface, brand text tokens. */
export function ChartTooltip({
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
  const f = format ?? ((n: number) => formatCurrency(n, { decimals: 0 }));
  return (
    <div className="rounded-xl border border-slate-surface/60 bg-navy-light/95 px-3 py-2 shadow-xl backdrop-blur">
      {label !== undefined && label !== "" && (
        <p className="mb-1.5 text-2xs font-semibold uppercase tracking-widest text-dim">
          {String(label)}
        </p>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color ?? item.payload?.fill ?? COLORS.dim }}
            />
            <span className="text-xs text-dim">{item.name}</span>
            <span className="score-numeral ml-auto pl-4 text-xs text-light">
              {typeof item.value === "number" ? f(item.value) : item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
