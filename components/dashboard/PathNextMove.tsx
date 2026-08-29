"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchLatestStoredAssessment } from "@/lib/assessment/latest";
import { COLORS } from "@/lib/brand";
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
export function PathNextMove({ variant = "default" }: { variant?: "default" | "fold" }) {
  const [path, setPath] = useState<ReadinessPath | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      let current = loadReadinessPath();

      // Habit activation: non-READY assessment without a path → generate.
      if (!current) {
        const assessment = await fetchLatestStoredAssessment();
        const result = assessment?.result;
        if (result && !(result.verdict === "READY" && (result.hardStops?.length ?? 0) === 0)) {
          const auto = ensurePathForVerdict(result, assessment?.completedAt ?? null, false);
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
    const nextStep = path.steps.find((s) => (s.status ?? "pending") === "pending") ?? null;
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
        className={variant === "fold" ? undefined : "mt-5"}
        role="status"
        data-path-fold-hero={variant === "fold" ? "" : undefined}
      >
        <div
          className={`dash-action-dock${variant === "fold" ? " !mt-0" : ""}`}
          style={{ ["--instrument-tint" as string]: COLORS.emerald }}
        >
          <div className="min-w-0">
            <p className="dash-action-dock-label">Path to Ready</p>
            <p className="dash-action-dock-title">READY — optional review</p>
          </div>
          <div className="dash-action-dock-actions flex flex-wrap gap-2.5">
            <Link
              href="/path"
              className="btn btn-primary"
              data-path-fold-primary={variant === "fold" ? "" : undefined}
            >
              Review Path
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const nextStep =
    path.steps.find((s) => (s.status ?? "pending") === "pending") ?? path.steps[0] ?? null;
  const constraint = bindingConstraintLabel(path.bindingConstraint);
  const stage = derivePathHabitStage(path);
  const pending = pathPendingStepCount(path);
  const firstPending = stage === "path_pending_first";

  return (
    <div
      className={variant === "fold" ? undefined : "mt-5"}
      data-path-habit-stage={stage}
      data-path-fold-hero={variant === "fold" ? "" : undefined}
      aria-label="Path to Ready next move"
    >
      <div
        className={`dash-action-dock${variant === "fold" ? " !mt-0" : ""}`}
        style={{ ["--instrument-tint" as string]: COLORS.cyan }}
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
            variant === "fold" ? (
              <Link
                href={nextStep.href}
                className="btn btn-primary"
                data-path-fold-primary=""
                onClick={() =>
                  trackPathStartStepClicked({
                    surface: "dashboard",
                    reasonCode: nextStep.reasonCode,
                  })
                }
              >
                {nextStep.title}
              </Link>
            ) : (
              <>
                <button type="button" className="btn btn-primary" onClick={handleMarkDone}>
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
            )
          ) : (
            <Link
              href="/assessment"
              className="btn btn-primary"
              data-path-fold-primary={variant === "fold" ? "" : undefined}
            >
              Reassess
            </Link>
          )}
          {variant === "fold" ? null : (
            <Link href="/path" className="btn btn-ghost">
              Full path
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
