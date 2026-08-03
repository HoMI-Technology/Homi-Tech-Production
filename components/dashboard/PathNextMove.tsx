"use client";

import { useCallback, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { loadLocalResult } from "@/lib/assessment/storage";
import { impactBus } from "@/lib/flags";
import {
  loadReadinessPath,
  pullReadinessPath,
  ensurePathForVerdict,
  completePathStepWithImpact,
  completePathStepGuarded,
  bindingConstraintLabel,
  derivePathHabitStage,
  pathPendingStepCount,
  isPathReturnVisit,
  pathHabitOncePerSession,
  trackPathGenerated,
  trackPathHabitImpression,
  trackPathStartStepClicked,
  trackPathStepDone,
  trackPathReturnVisit,
  type ReadinessPath,
} from "@/lib/readiness";

/**
 * Dashboard habit surface for Path to Ready.
 * Auto-ensures a path for non-READY local assessments, surfaces the binding
 * step, and supports one-click Mark done — so NOT_YET users form a path habit
 * without hunting for /results.
 */
export function PathNextMove() {
  const [path, setPath] = useState<ReadinessPath | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      let current = loadReadinessPath();

      // Habit activation: non-READY assessment without a path → generate.
      if (!current) {
        const assessment = loadLocalResult();
        const result = assessment?.result;
        if (
          result &&
          !(result.verdict === "READY" && (result.hardStops?.length ?? 0) === 0)
        ) {
          const auto = ensurePathForVerdict(
            result,
            assessment?.completedAt ?? null,
            false,
          );
          if (auto) {
            current = auto;
            if (pathHabitOncePerSession("path_generated:dashboard")) {
              trackPathGenerated({
                source: "dashboard_nudge",
                verdict: auto.verdict,
                mode: auto.mode,
                stepCount: auto.steps.length,
                auto: 1,
              });
            }
          }
        }
      }

      if (active) {
        setPath(current);
        setHydrated(true);
      }

      if (current && pathHabitOncePerSession("habit_impression:dashboard")) {
        const stage = derivePathHabitStage(current);
        trackPathHabitImpression({
          surface: "dashboard",
          stage,
          verdict: current.verdict,
        });
        if (isPathReturnVisit(current, 1) && pathHabitOncePerSession("return:dashboard")) {
          const created = Date.parse(current.createdAt);
          const ageDays = Number.isFinite(created)
            ? Math.max(1, Math.round((Date.now() - created) / 86_400_000))
            : 1;
          trackPathReturnVisit({ stage, ageDays });
        }
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

  const handleMarkDone = useCallback(() => {
    if (!path) return;
    const nextStep =
      path.steps.find((s) => (s.status ?? "pending") === "pending") ?? null;
    if (!nextStep) return;

    // Both branches run the same guarded pending → done transition against
    // the authoritative store; only the flag-on branch can publish a toast
    // impact. Done analytics fire solely on a real transition, with
    // first-resolution truth taken from the transition itself.
    const result = impactBus
      ? completePathStepWithImpact(nextStep.id)
      : completePathStepGuarded(nextStep.id);
    if (result.kind === "noop") {
      if (result.path) setPath(result.path);
      return;
    }
    setPath(result.path);
    trackPathStepDone({
      surface: "dashboard",
      reasonCode: result.transition.reasonCode,
      evidence: "manual",
      firstStep: result.transition.wasFirstResolution ? 1 : 0,
    });
  }, [path]);

  if (!hydrated) return null;

  if (!path) {
    return null;
  }

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

  const nextStep =
    path.steps.find((s) => (s.status ?? "pending") === "pending") ??
    path.steps[0] ??
    null;
  const constraint = bindingConstraintLabel(path.bindingConstraint);
  const stage = derivePathHabitStage(path);
  const pending = pathPendingStepCount(path);
  const firstPending = stage === "path_pending_first";

  return (
    <div
      className="mt-5"
      data-path-habit-stage={stage}
      aria-label="Path to Ready next move"
    >
      <div
        className="dash-action-dock"
        style={{ ["--instrument-tint" as string]: "#22d3ee" }}
      >
        <div className="min-w-0">
          <p className="dash-action-dock-label">
            {firstPending ? "Path habit · first move" : "Path to Ready"}
          </p>
          <p className="mt-1 text-xs text-dim">
            Binding: <span className="text-light/90">{constraint}</span>
            {pending > 0 ? (
              <>
                {" · "}
                <span className="score-numeral text-light/80">{pending}</span> open
              </>
            ) : null}
          </p>
          {nextStep && stage !== "path_complete" ? (
            <p className="dash-action-dock-title">{nextStep.title}</p>
          ) : (
            <p className="dash-action-dock-title">Path steps complete — reassess when life moves</p>
          )}
        </div>
        <div className="dash-action-dock-actions flex flex-wrap gap-2.5">
          {nextStep && stage !== "path_complete" ? (
            <>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleMarkDone}
              >
                Mark done
              </button>
              <Link
                href={nextStep.href}
                className="btn btn-ghost"
                onClick={() =>
                  trackPathStartStepClicked({
                    surface: "dashboard",
                    reasonCode: nextStep.reasonCode,
                  })
                }
              >
                Start step
              </Link>
            </>
          ) : (
            <Link href="/assessment" className="btn btn-primary">
              Reassess
            </Link>
          )}
          <Link href="/path" className="btn btn-ghost">
            Full path
          </Link>
        </div>
      </div>
    </div>
  );
}
