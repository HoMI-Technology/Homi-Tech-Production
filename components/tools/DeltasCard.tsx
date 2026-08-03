/**
 * DeltasCard — "what this changes for you" on a lens result panel.
 *
 * Renders precomputed MetricDelta rows (lib/tools/deltas.ts) with canon
 * temperature colors. Radical honesty by construction: a harmful move
 * renders exactly as prominently as a helpful one, and the card accent
 * follows the WORST resulting temperature so a bad trade is never
 * visually buried by a good one.
 */

"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics";
import type { MetricDelta } from "@/lib/tools/deltas";
import { worstDeltaTemperature } from "@/lib/tools/deltas";
import type { Temperature } from "@/lib/finance/store";
import { COLORS } from "@/lib/brand";

const TEMP_COLOR: Record<Temperature, string> = {
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
  amber: COLORS.amber,
  crimson: COLORS.crimson,
};

function formatValue(v: number, unit: MetricDelta["unit"]): string {
  if (!Number.isFinite(v)) return "6+";
  return unit === "months" ? `${v} mo` : `${Math.round(v)}%`;
}

export function DeltasCard({ deltas, lensId }: { deltas: MetricDelta[]; lensId?: string }) {
  // Phase 2 instrumentation: fire once per mount, not per slider tick.
  const viewedRef = useRef(false);
  useEffect(() => {
    if (viewedRef.current || deltas.length === 0) return;
    viewedRef.current = true;
    track("lens_delta_viewed", {
      lens: lensId ?? "unknown",
      worst: worstDeltaTemperature(deltas),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (deltas.length === 0) return null;
  const accent = TEMP_COLOR[worstDeltaTemperature(deltas)];

  return (
    <div className="glass p-6" style={{ borderLeft: `2px solid ${accent}` }}>
      <h2 className="font-semibold text-light">What this changes for you</h2>
      <p className="mt-1 text-xs text-dim">
        Your saved numbers, before and after this payment. Educational context — not advice.
      </p>
      <div className="mt-5 space-y-4">
        {deltas.map((d) => (
          <div key={d.metric} className="flex items-center justify-between gap-4">
            <span className="text-sm text-dim">{d.label}</span>
            <span className="flex items-center gap-2 text-sm">
              <span className="score-numeral text-dim">{formatValue(d.from, d.unit)}</span>
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden
                className="text-dim"
              >
                <path d="M2 8h11m0 0L9 4m4 4l-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span
                className="score-numeral font-semibold"
                style={{ color: TEMP_COLOR[d.toTemperature] }}
              >
                {formatValue(d.to, d.unit)}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
