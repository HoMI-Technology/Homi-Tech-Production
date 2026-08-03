"use client";

import Link from "next/link";
import {
  bindingConstraintLabel,
  type ReadinessPath,
} from "@/lib/readiness";

export function PathCommitBanner({
  path,
  onRefresh,
  refreshing,
  showPathOnly,
  onTogglePathOnly,
  committed,
}: {
  path: ReadinessPath;
  onRefresh: () => void;
  refreshing: boolean;
  showPathOnly: boolean;
  onTogglePathOnly: () => void;
  /** True after a successful commit this session */
  committed?: boolean;
}) {
  const stepCount = path.steps.length;
  const focus = bindingConstraintLabel(path.bindingConstraint);

  return (
    <div
      className="mt-4 rounded-xl border border-cyan/25 bg-cyan/5 p-4 sm:p-5"
      role="region"
      aria-label="Path to Ready on calendar"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-display text-lg text-light">Path to Ready</p>
          <p className="mt-1 text-sm leading-relaxed text-dim">
            Focus: <span className="text-light">{focus}</span>
            {stepCount > 0 ? (
              <>
                {" "}
                · {stepCount} step{stepCount === 1 ? "" : "s"}
              </>
            ) : (
              <> · optional review only</>
            )}
          </p>
          {committed && (
            <p className="mt-2 text-sm text-emerald" role="status">
              Path to Ready is on your calendar
            </p>
          )}
          <p className="mt-2 text-xs leading-relaxed text-dim">
            Protective milestones from your latest readiness path — not a judgment,
            a plan.
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="flex flex-wrap gap-2">
            {stepCount > 0 && (
              <button
                type="button"
                className="btn btn-ghost"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh path milestones on calendar"
              >
                {refreshing ? "Updating…" : "Refresh path milestones"}
              </button>
            )}
            <Link
              href="/results"
              className="btn btn-ghost"
              aria-label="Back to assessment results"
            >
              View results
            </Link>
          </div>
          {stepCount > 0 && (
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-dim">
              <input
                type="checkbox"
                checked={showPathOnly}
                onChange={onTogglePathOnly}
                className="rounded border-slate-high"
                aria-label="Show path events only"
              />
              Show path only
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
