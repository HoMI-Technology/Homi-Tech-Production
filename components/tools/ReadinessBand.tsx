/**
 * ReadinessBand — the Phase 5 magnitude indicator on a lens result.
 *
 * Renders the band and direction of a hypothetical's readiness impact —
 * never the number, never the weights — with the honesty flags (neutral
 * anchors / estimated debt) and a deep link to the Score Simulator for
 * the full lever picture.
 */

"use client";

import { Link } from "@/i18n/navigation";
import type { ReadinessImpact } from "@/lib/tools/readiness-bands";

function accent(impact: ReadinessImpact): string {
  if (impact.hardStop) return "#ef4444";
  if (impact.direction === "up") return "#34d399";
  if (impact.direction === "flat") return "#94a3b8";
  return impact.band === "large" ? "#ef4444" : "#facc15";
}

export function ReadinessBand({ impact }: { impact: ReadinessImpact }) {
  const color = accent(impact);
  return (
    <div className="glass p-5" style={{ borderLeft: `2px solid ${color}` }}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-light">Readiness impact</h2>
        {impact.band && (
          <span
            className="rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{ borderColor: `${color}55`, color }}
          >
            {impact.band} shift {impact.direction === "down" ? "down" : "up"}
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-dim">{impact.line}</p>
      {(impact.neutral || impact.debtEstimated) && (
        <p className="mt-2 text-xs leading-relaxed text-dim/70">
          {impact.neutral
            ? "No assessment on file — this uses neutral placeholders for the parts of readiness money can't move. "
            : ""}
          {impact.debtEstimated ? "Debt payments are estimated from your balances. " : ""}
          The full picture needs your real anchors.
        </p>
      )}
      <Link href="/simulator" className="mt-3 inline-block text-xs font-medium text-cyan hover:underline">
        Explore the levers in the Score Simulator →
      </Link>
    </div>
  );
}
