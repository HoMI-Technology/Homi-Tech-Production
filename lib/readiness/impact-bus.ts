/**
 * Impact bus v1 — Path step only (production).
 *
 * Honesty:
 * - Does not call computeScore.
 * - Path completion rarely moves assessment score; toast must not invent +N.
 * - completePathStep always persists; we short-circuit before calling it when
 *   the step is already done/skipped to avoid needless LWW pushes.
 *
 * Forbidden imports (v1): demo, cfm, finance, signals, react.
 */

import {
  completePathStep,
  loadReadinessPath,
  type PathStepStatus,
  type ReadinessPath,
} from "@/lib/readiness/store";
import { pathCompletionRatio } from "@/lib/readiness/progress";
import { loadLocalResult } from "@/lib/assessment/storage";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ImpactActionKind = "path_step";

export interface ScoreImpact {
  /** Schema version for session payloads */
  v: 1;
  before: number;
  after: number;
  delta: number;
  actionKind: ImpactActionKind;
  /** True when |delta| < IMPACT_EPSILON */
  immaterial: boolean;
  impactId: string;
  nextHint?: string;
  at: string;
  pathProgress?: { before: number; after: number };
  stepTitle?: string;
  reasonCode?: string;
  alreadyDone?: boolean;
}

export const IMPACT_EPSILON = 0.5;
export const LAST_IMPACT_KEY = "homi:last-impact";
/** Ignore session hydrate older than this (ms) — protects /demo shared layout */
export const IMPACT_HYDRATE_TTL_MS = 8_000;

// ---------------------------------------------------------------------------
// Session + events
// ---------------------------------------------------------------------------

export function saveLastImpact(impact: ScoreImpact): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LAST_IMPACT_KEY, JSON.stringify(impact));
    window.dispatchEvent(new CustomEvent("homi:impact", { detail: impact }));
  } catch {
    try {
      window.dispatchEvent(new CustomEvent("homi:impact", { detail: impact }));
    } catch {
      // ignore
    }
  }
}

export function loadLastImpact(): ScoreImpact | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_IMPACT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScoreImpact;
    if (parsed?.v !== 1 || parsed.actionKind !== "path_step") return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearLastImpact(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(LAST_IMPACT_KEY);
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function currentAssessmentScore(): number {
  return loadLocalResult()?.result?.score ?? 0;
}

function nextPendingHint(path: ReadinessPath | null, completedStepId: string): string {
  if (!path) return "Open Path to Ready when you want the next protective step.";
  const next = path.steps.find(
    (s) => s.id !== completedStepId && (s.status ?? "pending") === "pending",
  );
  if (!next) {
    return "Path steps complete. Reassess when life inputs change — not yet is not no.";
  }
  return `Next: ${next.title}`;
}

function buildImpactId(stepId: string, completedAt: string | null | undefined): string {
  return `path_step:${stepId}:${completedAt ?? "x"}`;
}

// ---------------------------------------------------------------------------
// Path step
// ---------------------------------------------------------------------------

/**
 * Mark a path step done (or other status) and record an honest impact.
 * Prefer status "done" from UI; skip should stay on raw completePathStep.
 */
export function completePathStepWithImpact(
  stepId: string,
  status: PathStepStatus = "done",
): { path: ReadinessPath | null; impact: ScoreImpact | null } {
  const beforePath = loadReadinessPath();
  if (!beforePath) return { path: null, impact: null };

  const step = beforePath.steps.find((s) => s.id === stepId);
  if (!step) return { path: beforePath, impact: null };

  const prior = step.status ?? "pending";
  if (prior === "done" || prior === "skipped") {
    const score = currentAssessmentScore();
    const ratio = pathCompletionRatio(beforePath);
    const impact: ScoreImpact = {
      v: 1,
      before: score,
      after: score,
      delta: 0,
      actionKind: "path_step",
      immaterial: true,
      impactId: buildImpactId(stepId, step.completedAt),
      at: new Date().toISOString(),
      pathProgress: { before: ratio, after: ratio },
      stepTitle: step.title,
      reasonCode: step.reasonCode,
      alreadyDone: true,
      nextHint: nextPendingHint(beforePath, stepId),
    };
    // No store write, no event — silence is calmer than "already marked"
    return { path: beforePath, impact };
  }

  const beforeScore = currentAssessmentScore();
  const beforeRatio = pathCompletionRatio(beforePath);

  const afterPath = completePathStep(stepId, status);
  if (!afterPath) return { path: null, impact: null };

  const afterScore = currentAssessmentScore();
  const afterRatio = pathCompletionRatio(afterPath);
  const delta = afterScore - beforeScore;
  const afterStep = afterPath.steps.find((s) => s.id === stepId);

  const impact: ScoreImpact = {
    v: 1,
    before: beforeScore,
    after: afterScore,
    delta,
    actionKind: "path_step",
    immaterial: Math.abs(delta) < IMPACT_EPSILON,
    impactId: buildImpactId(stepId, afterStep?.completedAt),
    at: new Date().toISOString(),
    pathProgress: { before: beforeRatio, after: afterRatio },
    stepTitle: afterStep?.title ?? step.title,
    reasonCode: afterStep?.reasonCode ?? step.reasonCode,
    nextHint: nextPendingHint(afterPath, stepId),
  };

  saveLastImpact(impact);
  return { path: afterPath, impact };
}

// ---------------------------------------------------------------------------
// Toast copy — Precision Empathy · Calm Authority · Radical Honesty
// ---------------------------------------------------------------------------

/**
 * Brand rules for this surface:
 * - No hype, no FOMO, no fabricated score motion.
 * - Acknowledge the protective step; point to the next one.
 * - "Not yet is not no" only when path is fully complete (natural, not forced).
 */
export function impactToastCopy(impact: ScoreImpact): {
  title: string;
  body: string;
  tone: "progress" | "flat";
} {
  if (impact.alreadyDone) {
    return {
      title: "Already complete",
      body: "This step was already locked in.",
      tone: "flat",
    };
  }

  const progress = impact.pathProgress;
  const progressMoved =
    progress != null && Math.abs(progress.after - progress.before) > 0.001;

  // Prefer progress framing even if score somehow moved — Path is not a scorer
  if (progressMoved) {
    const pct = Math.round((progress?.after ?? 0) * 100);
    const title = pct >= 100 ? "Path steps complete" : "Step locked in";
    const stepBit = impact.stepTitle ? `“${impact.stepTitle}” · ` : "";
    const body =
      pct >= 100
        ? `${stepBit}Protective homework on this path is clear. ${impact.nextHint ?? ""}`.trim()
        : `${stepBit}Path ${pct}% complete. ${impact.nextHint ?? ""}`.trim();
    return { title, body, tone: "progress" };
  }

  return {
    title: "No path progress",
    body:
      impact.nextHint ??
      "That action didn’t change path completion. When inputs move, reassess.",
    tone: "flat",
  };
}
