"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildClientDataQuality } from "@/lib/readiness/collect-data-quality";
import type { DataQualityBand, DataQualityConfidence } from "@/lib/readiness/confidence";
import { COLORS } from "@/lib/brand";

export type DataQualityChipProps = {
  rawScore: number;
  assessmentCompletedAt?: string | null;
  className?: string;
};

const BAND_LABEL: Record<DataQualityBand, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

const BAND_STYLE: Record<DataQualityBand, { border: string; bg: string; color: string }> = {
  high: {
    border: "border-emerald/40",
    bg: "bg-emerald/10",
    color: COLORS.emerald,
  },
  medium: {
    border: "border-yellow/40",
    bg: "bg-yellow/10",
    color: COLORS.yellow,
  },
  low: {
    border: "border-amber/40",
    bg: "bg-amber/10",
    color: COLORS.amber,
  },
};

/**
 * E4 data-quality / confidence chip for /results.
 * Shows completeness × freshness honesty; optional display dampening.
 * Raw HōMI-Score in the hero stays canonical — this never replaces it.
 */
export function DataQualityChip({
  rawScore,
  assessmentCompletedAt = null,
  className = "",
}: DataQualityChipProps) {
  const [dq, setDq] = useState<DataQualityConfidence | null>(null);

  useEffect(() => {
    setDq(buildClientDataQuality(rawScore, assessmentCompletedAt));
  }, [rawScore, assessmentCompletedAt]);

  if (!dq) {
    return (
      <div
        className={`mt-4 w-full max-w-md animate-pulse rounded-xl border border-slate-surface/50 bg-navy/20 px-4 py-3 ${className}`}
        aria-hidden
      />
    );
  }

  const style = BAND_STYLE[dq.band];
  const confidenceGaps = dq.gaps.filter((g) => g.id !== "credit_missing");
  const softGaps = dq.gaps.filter((g) => g.id === "credit_missing");

  return (
    <div
      className={`mt-4 w-full max-w-md rounded-xl border border-slate-surface/60 bg-navy/30 px-4 py-3 text-left ${className}`}
      data-data-quality={dq.band}
      data-path-mode={dq.pathMode}
      aria-label="Data quality confidence"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${style.border} ${style.bg}`}
          style={{ color: style.color }}
        >
          Data quality · {BAND_LABEL[dq.band]}
        </span>
        <span className="text-3xs font-semibold uppercase tracking-wide text-dim">
          {dq.pathMode === "assessment_plus_finance" ? "Assessment + finance" : "Assessment only"}
        </span>
      </div>

      <p className="mt-2 text-xs leading-relaxed text-dim">
        Completeness and freshness of what backs this read — not how sure you feel. The HōMI-Score
        above is the raw record
        {dq.isDampened ? (
          <>
            ; a cautious context view shows{" "}
            <span className="score-numeral text-light">{dq.displayedScore}</span> until gaps close.
            Display dampening only — the raw score stays canonical.
          </>
        ) : (
          <>.</>
        )}
      </p>

      {(confidenceGaps.length > 0 || softGaps.length > 0) && (
        <div className="mt-3 border-t border-slate-surface/50 pt-3">
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">Gaps</p>
          <ul className="mt-1.5 space-y-1.5">
            {confidenceGaps.map((gap) => (
              <li key={gap.id} className="text-sm text-light">
                {gap.href ? (
                  <Link
                    href={gap.href}
                    className="text-cyan underline-offset-2 hover:underline"
                  >
                    {gap.label}
                  </Link>
                ) : (
                  gap.label
                )}
              </li>
            ))}
            {softGaps.map((gap) => (
              <li key={gap.id} className="text-sm text-dim">
                {gap.href ? (
                  <Link
                    href={gap.href}
                    className="text-cyan/80 underline-offset-2 hover:underline"
                  >
                    {gap.label}
                  </Link>
                ) : (
                  gap.label
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
