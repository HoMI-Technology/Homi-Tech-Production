/**
 * Auto-complete path steps when live signals clear the gate.
 * Pure: returns a new path; never invents assessment verdicts.
 */

import type { AssessmentResult } from "@/lib/scoring";
import {
  setPathStepStatus,
  type PathFinanceSnapshot,
  type PathReasonCode,
  type PathStep,
  type ReadinessPath,
} from "./path";

export interface AutoCompleteResult {
  path: ReadinessPath;
  completedStepIds: string[];
  reasons: string[];
}

function hardStopCleared(
  result: AssessmentResult | null,
  code: PathReasonCode,
): boolean {
  if (!result) return false;
  if (!["RUNWAY_UNDER_1_MONTH", "DTI_OVER_50", "HOUSING_RATIO_OVER_45", "CREDIT_UNDER_620"].includes(code)) {
    return false;
  }
  return !result.hardStops.some((h) => h.code === code);
}

function shouldAutoComplete(
  step: PathStep,
  result: AssessmentResult | null,
  finance: PathFinanceSnapshot | null,
): string | null {
  if ((step.status ?? "pending") !== "pending") return null;

  switch (step.reasonCode) {
    case "RUNWAY_UNDER_1_MONTH":
      if (hardStopCleared(result, "RUNWAY_UNDER_1_MONTH")) {
        return "Runway hard-stop cleared on latest assessment.";
      }
      if (finance?.runwayMonths != null && finance.runwayMonths >= 1) {
        return `Finance runway ~${finance.runwayMonths.toFixed(1)} months ≥ 1.`;
      }
      return null;
    case "DTI_OVER_50":
      if (hardStopCleared(result, "DTI_OVER_50")) {
        return "DTI hard-stop cleared on latest assessment.";
      }
      if (
        finance &&
        finance.monthlyIncome > 0 &&
        (finance.monthlyDebtPayments / finance.monthlyIncome) * 100 <= 50
      ) {
        return "Finance DTI is at or below 50%.";
      }
      return null;
    case "HOUSING_RATIO_OVER_45":
      if (hardStopCleared(result, "HOUSING_RATIO_OVER_45")) {
        return "Housing-ratio hard-stop cleared on latest assessment.";
      }
      return null;
    case "CREDIT_UNDER_620":
      if (hardStopCleared(result, "CREDIT_UNDER_620")) {
        return "Credit hard-stop cleared on latest assessment.";
      }
      return null;
    case "NEGATIVE_CASHFLOW":
      if (finance && finance.netCashFlow >= 0) {
        return "Monthly cash flow is no longer negative.";
      }
      return null;
    default:
      return null;
  }
}

/**
 * Mark pending steps done when finance/assessment signals clear them.
 * Does not touch REASSESS / soft pillar steps without evidence.
 */
export interface CategoryAutoSignals {
  /** Bank-linked subscription-like monthly drag */
  subscriptionDragMonthly?: number;
  /** True when dining/food is a heavy outflow category */
  diningHeavy?: boolean;
}

export function autoCompletePathFromSignals(
  path: ReadinessPath,
  result: AssessmentResult | null,
  finance: PathFinanceSnapshot | null,
  now: Date = new Date(),
  categories?: CategoryAutoSignals | null,
): AutoCompleteResult {
  let next = path;
  const completedStepIds: string[] = [];
  const reasons: string[] = [];

  for (const step of path.steps) {
    const reason = shouldAutoComplete(step, result, finance);
    if (!reason) continue;
    next = setPathStepStatus(next, step.id, "done", now);
    completedStepIds.push(step.id);
    reasons.push(`${step.title}: ${reason}`);
  }

  // Category-aware: if subscription drag is low and a soft "capacity" note step exists — no auto done.
  // Dining-heavy does not auto-complete; it only informs capacity UI.
  if (categories?.subscriptionDragMonthly != null && categories.subscriptionDragMonthly < 20) {
    // no-op: low drag is informational for path UI, not a step completer
  }

  return { path: next, completedStepIds, reasons };
}
