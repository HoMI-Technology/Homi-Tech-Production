/**
 * Binding-constraint progress + path freshness.
 * Pure helpers — no I/O. Numbers only from assessment + optional finance.
 */

import type { AssessmentResult, HardStopCode } from "@/lib/scoring/engine";
import {
  bindingConstraintLabel,
  type PathFinanceSnapshot,
  type PathReasonCode,
  type ReadinessPath,
} from "./path";

export interface BindingProgress {
  code: PathReasonCode | null;
  label: string;
  /** e.g. current runway months or DTI % — null when unknown */
  current: number | null;
  target: number | null;
  unit: string | null;
  /** 0–1 capped; null when not computable */
  ratio: number | null;
  cleared: boolean;
  detail: string;
}

export interface PathFreshness {
  assessmentAgeDays: number | null;
  financeAgeDays: number | null;
  pathAgeDays: number | null;
  /** True when assessment or path is older than thresholds */
  isStale: boolean;
  reasons: string[];
}

/** Assessment older than this → treat path as stale for big moves. */
export const ASSESSMENT_STALE_DAYS = 90;
/** Path older than this without reassess → nudge regenerate. */
export const PATH_STALE_DAYS = 90;

function daysSinceIso(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const days = Math.floor((now.getTime() - t) / 86_400_000);
  if (days < 0 || days > 3650) return null;
  return days;
}

function hardStopPresent(result: AssessmentResult, code: HardStopCode): boolean {
  return result.hardStops.some((h) => h.code === code);
}

/**
 * Progress against the binding constraint using live assessment + optional finance.
 * Prefer finance runway/DTI when confidence is assessment_plus_finance style snapshot.
 */
export function computeBindingProgress(
  path: ReadinessPath | null,
  result: AssessmentResult | null,
  finance: PathFinanceSnapshot | null,
): BindingProgress {
  const code = path?.bindingConstraint ?? null;
  const label = bindingConstraintLabel(code);

  if (!code || code === "READY_CELEBRATE" || code === "MAINTENANCE") {
    return {
      code,
      label,
      current: null,
      target: null,
      unit: null,
      ratio: 1,
      cleared: true,
      detail: "No protective gate is blocking this path.",
    };
  }

  if (code === "RUNWAY_UNDER_1_MONTH") {
    const fromFinance =
      finance?.runwayMonths != null && Number.isFinite(finance.runwayMonths)
        ? finance.runwayMonths
        : null;
    // Assessment uses emergency fund months as the scorer input
    const current = fromFinance;
    const target = 1;
    const cleared = result
      ? !hardStopPresent(result, "RUNWAY_UNDER_1_MONTH")
      : current != null && current >= target;
    const ratio =
      current != null && target > 0 ? Math.min(1, Math.max(0, current / target)) : cleared ? 1 : 0;
    return {
      code,
      label,
      current: current != null ? Math.round(current * 10) / 10 : null,
      target,
      unit: "months",
      ratio,
      cleared,
      detail:
        current != null
          ? `Runway ~${(Math.round(current * 10) / 10).toFixed(1)} of ${target} month protective floor.`
          : cleared
            ? "Runway hard-stop is clear on the latest assessment."
            : "Runway under 1 month — open Finance or reassess to measure progress.",
    };
  }

  if (code === "DTI_OVER_50") {
    const dti =
      finance && finance.monthlyIncome > 0
        ? (finance.monthlyDebtPayments / finance.monthlyIncome) * 100
        : null;
    const target = 50;
    const cleared = result ? !hardStopPresent(result, "DTI_OVER_50") : dti != null && dti <= target;
    // Progress: lower DTI is better — map 80%+ → 0, 50% → 1
    const ratio =
      dti != null ? Math.min(1, Math.max(0, (80 - dti) / (80 - target))) : cleared ? 1 : 0;
    return {
      code,
      label,
      current: dti != null ? Math.round(dti * 10) / 10 : null,
      target,
      unit: "% DTI",
      ratio,
      cleared,
      detail:
        dti != null
          ? `Debt-to-income ~${(Math.round(dti * 10) / 10).toFixed(1)}% (protective line ${target}%).`
          : cleared
            ? "DTI hard-stop is clear on the latest assessment."
            : "DTI above 50% — use debt payoff tools, then reassess.",
    };
  }

  if (code === "HOUSING_RATIO_OVER_45") {
    const cleared = result ? !hardStopPresent(result, "HOUSING_RATIO_OVER_45") : false;
    return {
      code,
      label,
      current: null,
      target: 45,
      unit: "% housing",
      ratio: cleared ? 1 : 0,
      cleared,
      detail: cleared
        ? "Housing-cost hard-stop is clear."
        : "Housing cost above 45% of income — re-scope affordability, then reassess.",
    };
  }

  if (code === "CREDIT_UNDER_620") {
    const cleared = result ? !hardStopPresent(result, "CREDIT_UNDER_620") : false;
    return {
      code,
      label,
      current: null,
      target: 620,
      unit: "score",
      ratio: cleared ? 1 : 0,
      cleared,
      detail: cleared
        ? "Credit hard-stop is clear."
        : "Credit under 620 — rebuild on-time history, then reassess.",
    };
  }

  if (code === "NEGATIVE_CASHFLOW") {
    const flow = finance?.netCashFlow ?? null;
    const cleared = flow != null ? flow >= 0 : false;
    const ratio =
      flow == null
        ? 0
        : flow >= 0
          ? 1
          : Math.min(1, Math.max(0, 1 + flow / Math.max(1, Math.abs(flow) * 2)));
    return {
      code,
      label,
      current: flow != null ? Math.round(flow) : null,
      target: 0,
      unit: "USD/mo surplus",
      ratio: cleared ? 1 : ratio,
      cleared,
      detail:
        flow != null
          ? flow >= 0
            ? `Monthly surplus ~$${Math.round(flow).toLocaleString("en-US")}.`
            : `Short ~$${Math.abs(Math.round(flow)).toLocaleString("en-US")} each month.`
          : "Save finance numbers to track cash-flow progress.",
    };
  }

  // Soft pillars / partner / reassess — resolution-based if path present.
  // Done and skipped both count as "resolved" for gate progress, but the
  // user-facing detail keeps them distinct — skipped is not complete.
  if (path) {
    const summary = summarizePathResolution(path);
    const { done, skipped, total } = summary.actionable;
    const resolved = done + skipped;
    const ratio = total > 0 ? resolved / total : 0;
    return {
      code,
      label,
      current: resolved,
      target: Math.max(1, total),
      unit: "steps resolved",
      ratio,
      cleared: total > 0 && ratio >= 1,
      detail:
        skipped > 0
          ? `${done} of ${total} protective steps done · ${skipped} skipped.`
          : `${done} of ${Math.max(1, total)} protective steps done.`,
    };
  }

  return {
    code,
    label,
    current: null,
    target: null,
    unit: null,
    ratio: null,
    cleared: false,
    detail: "Generate a path to track this constraint.",
  };
}

export function computePathFreshness(
  path: ReadinessPath | null,
  opts?: {
    financeSavedAt?: string | null;
    now?: Date;
  },
): PathFreshness {
  const now = opts?.now ?? new Date();
  const assessmentAgeDays = daysSinceIso(path?.assessmentCompletedAt ?? null, now);
  const financeAgeDays = daysSinceIso(opts?.financeSavedAt ?? null, now);
  const pathAgeDays = daysSinceIso(path?.createdAt ?? null, now);
  const reasons: string[] = [];

  if (assessmentAgeDays != null && assessmentAgeDays > ASSESSMENT_STALE_DAYS) {
    reasons.push(
      `Assessment is ${assessmentAgeDays} days old — re-score before treating readiness as current.`,
    );
  }
  if (pathAgeDays != null && pathAgeDays > PATH_STALE_DAYS) {
    reasons.push(`This path is ${pathAgeDays} days old — regenerate from a fresh assessment.`);
  }
  if (financeAgeDays != null && financeAgeDays > ASSESSMENT_STALE_DAYS) {
    reasons.push(
      `Finance numbers are ${financeAgeDays} days old — update the cockpit for honest targets.`,
    );
  }

  return {
    assessmentAgeDays,
    financeAgeDays,
    pathAgeDays,
    isStale: reasons.length > 0,
    reasons,
  };
}

/** Per-category step status counts. Done and skipped are distinct states. */
export interface PathStatusCounts {
  total: number;
  done: number;
  skipped: number;
  pending: number;
}

/**
 * Honest resolution summary for a Path.
 * - Actionable = every step whose reasonCode is not REASSESS.
 * - completedRatio counts done only; resolvedRatio counts done + skipped.
 * - Zero actionable steps → both ratios are 0 (never vacuously "complete").
 */
export interface PathResolutionSummary {
  actionable: PathStatusCounts;
  reassessment: PathStatusCounts;
  completedRatio: number;
  resolvedRatio: number;
}

function countStatuses(steps: ReadinessPath["steps"]): PathStatusCounts {
  let done = 0;
  let skipped = 0;
  let pending = 0;
  for (const step of steps) {
    const status = step.status ?? "pending";
    if (status === "done") done += 1;
    else if (status === "skipped") skipped += 1;
    else pending += 1;
  }
  return { total: steps.length, done, skipped, pending };
}

export function summarizePathResolution(path: ReadinessPath): PathResolutionSummary {
  const actionable = countStatuses(path.steps.filter((s) => s.reasonCode !== "REASSESS"));
  const reassessment = countStatuses(path.steps.filter((s) => s.reasonCode === "REASSESS"));
  return {
    actionable,
    reassessment,
    completedRatio: actionable.total > 0 ? actionable.done / actionable.total : 0,
    resolvedRatio:
      actionable.total > 0 ? (actionable.done + actionable.skipped) / actionable.total : 0,
  };
}

/**
 * Resolved ratio (done + skipped over non-REASSESS steps) — display it as
 * "resolved", never "complete": skipped steps count toward this number.
 */
export function pathCompletionRatio(path: ReadinessPath): number {
  const steps = path.steps.filter((s) => s.reasonCode !== "REASSESS");
  if (steps.length === 0) {
    const all = path.steps;
    if (all.length === 0) return 1;
    const done = all.filter((s) => (s.status ?? "pending") !== "pending").length;
    return done / all.length;
  }
  const done = steps.filter((s) => (s.status ?? "pending") !== "pending").length;
  return done / steps.length;
}
