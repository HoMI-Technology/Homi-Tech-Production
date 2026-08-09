"use client";

import type { BindingProgress } from "@/lib/readiness";

/**
 * Binding-constraint progress instrument — OPERATE density, mono numbers.
 */
export function PathProgressHero({ progress }: { progress: BindingProgress }) {
  const pct =
    progress.ratio != null ? Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100) : null;

  const barColor = progress.cleared
    ? "bg-emerald"
    : pct != null && pct >= 60
      ? "bg-yellow"
      : "bg-crimson";

  const chipClass = progress.cleared
    ? "border-emerald/40 bg-emerald/10 text-emerald"
    : "border-crimson/40 bg-crimson/10 text-crimson";

  return (
    <div
      className="rounded-xl border border-slate-surface/70 bg-navy/40 p-4 sm:p-5"
      aria-label="Binding constraint progress"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-3xs font-semibold uppercase tracking-widest text-dim">
            Binding constraint
          </p>
          <p className="mt-1 font-display text-lg text-light sm:text-xl">{progress.label}</p>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide ${chipClass}`}
        >
          {progress.cleared ? "Gate clear" : "Gate open"}
        </span>
      </div>

      {pct != null && (
        <div className="mt-4">
          <div className="mb-1.5 flex items-end justify-between gap-2">
            <p className="score-numeral text-2xl font-semibold text-light">
              {pct}
              <span className="text-sm text-dim">%</span>
            </p>
            {progress.current != null && progress.target != null && (
              <p className="text-xs text-dim">
                <span className="score-numeral text-sm text-light">{progress.current}</span>
                {" / "}
                <span className="score-numeral text-sm text-light">{progress.target}</span>
                {progress.unit ? ` ${progress.unit}` : ""}
              </p>
            )}
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-surface"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${progress.label} progress ${pct} percent`}
          >
            <div
              className={`h-full rounded-full transition-[width] duration-500 ease-out ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      <p className="mt-3 text-sm leading-relaxed text-dim">{progress.detail}</p>
    </div>
  );
}
