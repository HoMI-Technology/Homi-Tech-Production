"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadReadinessPath,
  pathHabitOncePerSession,
  trackPathFirstStepNudge,
  type ReadinessPath,
} from "@/lib/readiness";

/**
 * Surfaces when a build path has no completed steps.
 * Anti plan-dopamine: push the first protective action.
 * (Dashboard prefers PathNextMove as the primary habit surface.)
 */
export function FirstStepNudge() {
  const [path, setPath] = useState<ReadinessPath | null>(null);
  const [show, setShow] = useState(false);
  const [ageHours, setAgeHours] = useState(0);

  useEffect(() => {
    const p = loadReadinessPath();
    setPath(p);
    if (!p || p.mode !== "build") return;
    const pending = p.steps.filter((s) => (s.status ?? "pending") === "pending");
    const anyDone = p.steps.some(
      (s) => (s.status ?? "pending") === "done" || (s.status ?? "pending") === "skipped",
    );
    if (anyDone || pending.length === 0) return;
    const created = Date.parse(p.createdAt);
    if (!Number.isFinite(created)) return;
    const hours = (Date.now() - created) / 3_600_000;
    if (hours >= 0) {
      setAgeHours(Math.max(0, Math.round(hours * 10) / 10));
      setShow(true);
      if (pathHabitOncePerSession("first_step_nudge")) {
        trackPathFirstStepNudge({ ageHours: Math.round(hours) });
      }
    }
  }, []);

  if (!show || !path) return null;
  const next =
    path.steps.find((s) => (s.status ?? "pending") === "pending") ?? path.steps[0];

  return (
    <div
      className="glass mt-4 border border-cyan/40 p-4 sm:p-5"
      role="status"
      aria-label="First path step nudge"
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan">
        First move
      </p>
      <p className="mt-1 font-display text-lg text-light">
        Your path is waiting — start the binding step
      </p>
      <p className="mt-1 text-sm text-dim">
        {next?.title ?? "Open your Path to Ready"}
        {ageHours >= 2 ? ` · path is ${ageHours}h old` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {next && (
          <Link href={next.href} className="btn btn-primary btn-sm">
            Start step
          </Link>
        )}
        <Link href="/path" className="btn btn-ghost btn-sm">
          Full path
        </Link>
      </div>
    </div>
  );
}
