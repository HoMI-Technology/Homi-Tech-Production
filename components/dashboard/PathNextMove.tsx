"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  loadReadinessPath,
  pullReadinessPath,
  bindingConstraintLabel,
  type ReadinessPath,
} from "@/lib/readiness";

/**
 * Dashboard client island: surfaces Path to Ready as the Operate-style
 * "next move" when a path exists in localStorage. Null when none — SSR-safe.
 */
export function PathNextMove() {
  const [path, setPath] = useState<ReadinessPath | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const local = loadReadinessPath();
      if (active) {
        setPath(local);
        setHydrated(true);
      }
      try {
        const remote = await pullReadinessPath();
        if (active && remote) setPath(remote);
      } catch {
        // anonymous / offline — local only
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  if (!hydrated || !path) return null;

  if (path.mode === "ready_optional") {
    return (
      <div
        className="mt-5 rounded-xl border border-emerald/30 px-4 py-3 sm:px-5"
        style={{ background: "rgba(52, 211, 153, 0.08)" }}
        role="status"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-emerald">
            Last path: READY — optional review
          </p>
          <Link
            href="/results"
            className="text-sm font-medium text-emerald/90 underline-offset-2 hover:underline"
          >
            View results
          </Link>
        </div>
      </div>
    );
  }

  // Build mode — next pending step (skip completed)
  const nextStep =
    path.steps.find((s) => (s.status ?? "pending") === "pending") ??
    path.steps[0] ??
    null;
  const constraint = bindingConstraintLabel(path.bindingConstraint);

  return (
    <div
      className="dash-action-dock mt-5"
      style={{ ["--instrument-tint" as string]: "#22d3ee" }}
      aria-label="Path to Ready next move"
    >
      <div className="min-w-0">
        <p className="dash-action-dock-label">Path to Ready</p>
        <p className="mt-1 text-xs text-dim">
          Binding: <span className="text-light/90">{constraint}</span>
        </p>
        {nextStep ? (
          <p className="dash-action-dock-title">{nextStep.title}</p>
        ) : (
          <p className="dash-action-dock-title">Review your path</p>
        )}
      </div>
      <div className="dash-action-dock-actions flex flex-wrap gap-2.5">
        {nextStep ? (
          <Link href={nextStep.href} className="btn btn-primary">
            Start step
          </Link>
        ) : (
          <Link href="/results" className="btn btn-primary">
            Open path
          </Link>
        )}
        <Link href="/calendar" className="btn btn-ghost">
          Calendar
        </Link>
        <Link href="/path" className="btn btn-ghost">
          Full path
        </Link>
      </div>
    </div>
  );
}
