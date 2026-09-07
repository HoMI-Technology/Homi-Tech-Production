"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { JobDepthFrame } from "@/components/layout/JobDepthFrame";
import { PathWorkbench } from "@/components/readiness/PathWorkbench";
import { useLatestAssessment } from "@/hooks/use-latest-assessment";
import {
  loadReadinessPath,
  pullReadinessPath,
  saveReadinessPath,
  generatePathFromResult,
  completePathStep,
  completePathStepWithImpact,
  completePathStepGuarded,
  computePathFreshness,
  getFinanceSavedAtForPath,
  reconcilePathWithSignals,
  PATH_DISCLAIMER,
  MAX_PATH_STEPS,
  derivePathHabitStage,
  pathPendingStepCount,
  pathHabitOncePerSession,
  trackPathPageViewed,
  trackPathHabitImpression,
  trackPathStepDone,
  bindingConstraintLabel,
  type ReadinessPath,
} from "@/lib/readiness";
import { impactBus } from "@/lib/flags";
import { track } from "@/lib/analytics";
import { Phase0FreezeScreen } from "@/components/advisor/Phase0FreezeScreen";
import { usePhase0Freeze } from "@/hooks/usePhase0Freeze";
import { SURFACE_ROLES } from "@/lib/dashboard/surface-roles";

// Surface role SSOT — living Build over time.
void SURFACE_ROLES.path;

/**
 * Path to Ready — finite workbench on live `/path`.
 * Binding constraint first. Money plan/budget stay depth, not a second Path.
 */
export default function PathPage() {
  const freeze = usePhase0Freeze();
  const { assessment: latestAssessment } = useLatestAssessment();
  const [path, setPath] = useState<ReadinessPath | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoMsg, setAutoMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      const reconciled = reconcilePathWithSignals();
      if (reconciled.completedStepIds.length > 0 && active) {
        setPath(reconciled.path);
        setAutoMsg(reconciled.reasons.join(" "));
        track("path_auto_completed", {
          count: reconciled.completedStepIds.length,
        });
      } else {
        const local = loadReadinessPath();
        if (active) setPath(local);
      }
      try {
        const remote = await pullReadinessPath();
        if (active && remote) setPath(remote);
      } catch {
        // local only
      }
      if (active) setHydrated(true);
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!hydrated || !path) return;
    if (!pathHabitOncePerSession("path_page_viewed")) return;
    const stage = derivePathHabitStage(path);
    trackPathPageViewed({
      stage,
      pendingSteps: pathPendingStepCount(path),
      mode: path.mode,
    });
    trackPathHabitImpression({
      surface: "path_page",
      stage,
      verdict: path.verdict,
    });
  }, [hydrated, path]);

  const freshness = useMemo(
    () =>
      computePathFreshness(path, {
        financeSavedAt: getFinanceSavedAtForPath(),
      }),
    [path],
  );

  const handleGenerate = useCallback(() => {
    const stored = latestAssessment;
    if (!stored) {
      setError("Take an assessment first — Path is built from your readiness score.");
      return;
    }
    const next = generatePathFromResult(stored.result, stored.completedAt, {
      decisionType: stored.decisionType,
    });
    saveReadinessPath(next);
    setPath(next);
    setError(null);
    track("path_generated", { verdict: next.verdict, surface: "path_page" });
  }, [latestAssessment]);

  const handleComplete = useCallback((stepId: string) => {
    const result = impactBus ? completePathStepWithImpact(stepId) : completePathStepGuarded(stepId);
    if (result.kind === "noop") {
      if (result.path) setPath(result.path);
      return;
    }
    setPath(result.path);
    trackPathStepDone({
      surface: "path_page",
      reasonCode: result.transition.reasonCode,
      evidence: "manual",
      firstStep: result.transition.wasFirstResolution ? 1 : 0,
    });
  }, []);

  const handleSkip = useCallback((stepId: string) => {
    const next = completePathStep(stepId, "skipped");
    if (next) setPath(next);
  }, []);

  if (freeze.status === "pending" || !hydrated) {
    return (
      <JobDepthFrame job="path" width="path">
        <ProductLoadingSkeleton label="Loading path" />
      </JobDepthFrame>
    );
  }

  if (freeze.status === "frozen" && freeze.record) {
    return <Phase0FreezeScreen record={freeze.record} />;
  }

  if (!path) {
    const hasAssessment = !!latestAssessment;
    return (
      <JobDepthFrame job="path" width="path">
        <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
          Path · live route depth · max {MAX_PATH_STEPS}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-light">Path to Ready</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">
          Finite build workbench. One next step. Budget and goals stay depth — not a KPI wall.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          {hasAssessment ? (
            <button type="button" className="btn btn-primary" onClick={handleGenerate}>
              Generate from last assessment
            </button>
          ) : (
            <Link href="/assessment" className="btn btn-primary">
              Take the assessment
            </Link>
          )}
        </div>
        {error && (
          <p className="mt-4 text-sm text-crimson" role="alert">
            {error}
          </p>
        )}
        <p className="mt-8 text-xs leading-relaxed text-dim">{PATH_DISCLAIMER}</p>
      </JobDepthFrame>
    );
  }

  return (
    <JobDepthFrame job="path" width="path">
      <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-dim">
        Path · live route depth · max {MAX_PATH_STEPS}
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-light">Path to Ready</h1>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-dim">
        Finite build workbench. One next step. Budget and goals stay depth — not a KPI wall.
      </p>

      {freshness.isStale && (
        <div className="mt-6 rounded-xl border border-amber/40 bg-amber/10 px-4 py-3" role="status">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber">Path may be stale</p>
          <ul className="mt-1 list-inside list-disc text-sm text-light">
            {freshness.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
          <button type="button" className="btn btn-ghost mt-3 btn-xs text-sm" onClick={handleGenerate}>
            Regenerate from last assessment
          </button>
        </div>
      )}

      {autoMsg && (
        <p className="mt-4 text-sm text-emerald" role="status">
          Auto-updated: {autoMsg}
        </p>
      )}

      <div className="mt-8">
        <PathWorkbench
          steps={path.steps}
          bindingLabel={bindingConstraintLabel(path.bindingConstraint)}
          onComplete={handleComplete}
          onSkip={handleSkip}
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-crimson" role="alert">
          {error}
        </p>
      )}

      <p className="mt-8 text-xs leading-relaxed text-dim">{path.disclaimer || PATH_DISCLAIMER}</p>
    </JobDepthFrame>
  );
}
