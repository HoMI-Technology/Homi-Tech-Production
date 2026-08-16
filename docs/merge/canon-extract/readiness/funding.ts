/**
 * Path ↔ Finance funding coupling.
 * Path steps with fundingTarget become cockpit targets the user can apply.
 * Never invents amounts — only uses step funding fields + current finance.
 */

import type { FinanceState } from "@/lib/finance/store";
import type { ReadinessPath, PathStep } from "./path";

export interface PathFundingSuggestion {
  /** Absolute liquid savings floor (runway / emergency). */
  liquidSavingsTarget: number | null;
  /** Suggested down-payment target from path steps. */
  downPaymentTarget: number | null;
  /** Human-readable lines for UI. */
  lines: string[];
  /** True when at least one suggestion differs from current finance. */
  hasActionableDiff: boolean;
}

function pendingFundingSteps(path: ReadinessPath): PathStep[] {
  return path.steps.filter(
    (s) =>
      (s.status ?? "pending") === "pending" &&
      s.fundingTarget != null &&
      s.fundingTarget > 0,
  );
}

/**
 * Derive funding targets from the active path relative to current finance.
 * Runway steps store "cash still needed" → absolute floor = current + gap.
 */
export function deriveFundingFromPath(
  path: ReadinessPath,
  finance: FinanceState,
): PathFundingSuggestion {
  const lines: string[] = [];
  let liquidSavingsTarget: number | null = null;
  let downPaymentTarget: number | null = null;

  for (const step of pendingFundingSteps(path)) {
    const target = step.fundingTarget as number;
    if (
      step.reasonCode === "RUNWAY_UNDER_1_MONTH" ||
      /runway|emergency/i.test(step.title)
    ) {
      const absolute = Math.round(finance.liquidSavings + target);
      if (liquidSavingsTarget == null || absolute > liquidSavingsTarget) {
        liquidSavingsTarget = absolute;
      }
      lines.push(
        `${step.title}: liquid savings floor ~$${absolute.toLocaleString("en-US")} ` +
          `(need +$${target.toLocaleString("en-US")} from current).`,
      );
    } else if (
      /down.?payment/i.test(step.title) ||
      /down.?payment/i.test(step.fundingLabel ?? "")
    ) {
      if (downPaymentTarget == null || target > downPaymentTarget) {
        downPaymentTarget = Math.round(target);
      }
      lines.push(
        `${step.title}: down-payment target ~$${Math.round(target).toLocaleString("en-US")}.`,
      );
    } else if (step.reasonCode === "PILLAR_FINANCIAL") {
      const absolute = Math.round(finance.liquidSavings + target);
      if (liquidSavingsTarget == null || absolute > liquidSavingsTarget) {
        liquidSavingsTarget = absolute;
      }
      lines.push(
        `${step.title}: savings target ~$${absolute.toLocaleString("en-US")}.`,
      );
    }
  }

  const hasActionableDiff =
    (liquidSavingsTarget != null &&
      liquidSavingsTarget > finance.liquidSavings + 1) ||
    (downPaymentTarget != null &&
      Math.abs(downPaymentTarget - finance.downPaymentTarget) > 1);

  return {
    liquidSavingsTarget,
    downPaymentTarget,
    lines,
    hasActionableDiff,
  };
}

/**
 * Apply path funding onto finance state.
 * - targets: update downPaymentTarget only (does not invent cash)
 * - savings_floor: also raise liquidSavings when user confirms they hold it
 */
export function applyPathFunding(
  finance: FinanceState,
  suggestion: PathFundingSuggestion,
  mode: "targets" | "savings_floor" = "targets",
): FinanceState {
  const next: FinanceState = {
    ...finance,
    expenseCategories: finance.expenseCategories.map((c) => ({ ...c })),
    assets: finance.assets.map((a) => ({ ...a })),
    liabilities: finance.liabilities.map((l) => ({ ...l })),
  };

  if (suggestion.downPaymentTarget != null) {
    next.downPaymentTarget = suggestion.downPaymentTarget;
  }

  if (
    mode === "savings_floor" &&
    suggestion.liquidSavingsTarget != null &&
    suggestion.liquidSavingsTarget > next.liquidSavings
  ) {
    next.liquidSavings = suggestion.liquidSavingsTarget;
    const cash = next.assets.find((a) => /cash|saving/i.test(a.name));
    if (cash) {
      next.assets = next.assets.map((a) =>
        a.id === cash.id
          ? { ...a, amount: suggestion.liquidSavingsTarget! }
          : a,
      );
    }
  }

  return next;
}
