/**
 * Path to Ready v1 — deterministic path generator.
 *
 * Input  = the recorded diagnosis (verdict + hard-stops + pillar snapshot,
 *          exactly as the scoring engine stored them), named ledger metrics
 *          with their completeness grade, active savings goals, and a date.
 * Output = an ordered Build Path: binding constraint first, hard-stop
 *          resolution milestones chained by depends_on, goal-bridged savings
 *          milestones, and an evidence milestone when the data is thin.
 *
 * Hard rules:
 *   - Never recomputes a score, verdict, or hard stop. The verdict enters
 *     as input and is copied verbatim into the diagnosis.
 *   - Never invents an amount: missing inputs → null amount +
 *     `insufficient_data` provenance.
 *   - Deterministic: same input → identical output, including ids and dates.
 *   - Neutral, educational wording only.
 *
 * Pure; no I/O; no clock access (asOfDate is injected).
 */

import {
  assessmentProvenance,
  goalProvenance,
  insufficientDataProvenance,
  metricProvenance,
} from "./confidence";
import { orderedHardStops, resolveBindingConstraint, weakestPillar } from "./constraints";
import type {
  GeneratedPath,
  GeneratePathInput,
  MilestoneProvenance,
  PathGoalInput,
  PathHardStopCode,
  PathMetricsInput,
  PathMilestoneDraft,
  PathPillarKey,
} from "./types";

/** Date-only plus N days, pure UTC arithmetic (deterministic). */
export function addDaysDateOnly(dateOnly: string, days: number): string {
  const [y, m, d] = dateOnly.split("-").map((s) => Number(s));
  const ms = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Deterministic milestone id from sort order. Stable across runs for identical input. */
function milestoneId(sortOrder: number): string {
  return `path-m${String(sortOrder).padStart(2, "0")}`;
}

/** Hard-stop milestone targets land 30 days apart, first at +30. */
const HARD_STOP_BASE_DAYS = 30;
/** Evidence milestone: 90 days to record three months of transactions. */
const EVIDENCE_DAYS = 90;
/** READY-mode optional review. */
const READY_REVIEW_DAYS = 90;

const DTI_LINE_PCT = 50;

interface HardStopTarget {
  targetAmountCents: number | null;
  fundingSource: MilestoneProvenance;
}

/**
 * Derives a funding target for a hard stop ONLY from real recorded metrics.
 * Missing input → null amount with insufficient_data provenance.
 */
function hardStopTarget(code: PathHardStopCode, metrics: PathMetricsInput | null): HardStopTarget {
  switch (code) {
    case "DTI_OVER_50": {
      // Monthly debt-service reduction needed to reach the recorded 50% line:
      // debtPayments − 0.5 × income. Both must be recorded.
      if (
        metrics &&
        metrics.monthlyDebtPaymentsCents !== null &&
        metrics.monthlyIncomeCents !== null &&
        metrics.monthlyIncomeCents > 0
      ) {
        const excess =
          metrics.monthlyDebtPaymentsCents - Math.round((DTI_LINE_PCT / 100) * metrics.monthlyIncomeCents);
        if (excess > 0) {
          return {
            targetAmountCents: excess,
            fundingSource: metricProvenance({
              metric: "dti",
              valueCents: metrics.monthlyDebtPaymentsCents,
              completeness: metrics.completeness,
            }),
          };
        }
      }
      return { targetAmountCents: null, fundingSource: insufficientDataProvenance("dti") };
    }
    case "RUNWAY_UNDER_1_MONTH": {
      // Cash still needed for one month of recorded outflow.
      if (
        metrics &&
        metrics.monthlyOutflowCents !== null &&
        metrics.monthlyOutflowCents > 0 &&
        metrics.liquidSavingsCents !== null
      ) {
        const gap = metrics.monthlyOutflowCents - metrics.liquidSavingsCents;
        if (gap > 0) {
          return {
            targetAmountCents: gap,
            fundingSource: metricProvenance({
              metric: "runway",
              valueCents: metrics.monthlyOutflowCents,
              completeness: metrics.completeness,
            }),
          };
        }
      }
      return { targetAmountCents: null, fundingSource: insufficientDataProvenance("runway") };
    }
    case "HOUSING_RATIO_OVER_45":
      // The ledger does not record the contemplated housing cost; no honest
      // dollar target exists. The milestone exists; the amount does not.
      return { targetAmountCents: null, fundingSource: insufficientDataProvenance("housing_ratio") };
    case "CREDIT_UNDER_620":
      // Credit rebuilding has no dollar target.
      return { targetAmountCents: null, fundingSource: assessmentProvenance() };
  }
}

// Hard-stop titles mirror lib/readiness/path.ts verbatim (one title canon).
const HARD_STOP_COPY: Record<
  PathHardStopCode,
  { title: string; description: string; toolSlug: string | null }
> = {
  DTI_OVER_50: {
    title: "Bring debt-to-income below the protective line",
    description:
      "The assessment recorded a debt-to-income ratio above 50%. " +
      "The target, when shown, is the monthly debt-service reduction that reaches the line, " +
      "derived from your recorded income and debt payments. " +
      "This is the constraint to resolve first.",
    toolSlug: "debt-payoff",
  },
  HOUSING_RATIO_OVER_45: {
    title: "Re-scope housing so payment stays under 45% of income",
    description:
      "The assessment recorded a housing cost above 45% of monthly income. " +
      "No dollar target is set because the ledger does not record this cost — " +
      "use the affordability lens to see the tiers against your recorded income.",
    toolSlug: "affordability",
  },
  RUNWAY_UNDER_1_MONTH: {
    title: "Stabilize emergency runway to at least 1 month",
    description:
      "The assessment recorded less than one month of expenses set aside. " +
      "The target, when shown, is the cash gap to one month of your recorded outflow. " +
      "This gate protects every later step.",
    toolSlug: "runway",
  },
  CREDIT_UNDER_620: {
    title: "Rebuild credit above the 620 protective floor",
    description:
      "The assessment recorded credit below 620. " +
      "On-time payment history and lower utilization are the recorded levers. " +
      "No dollar target applies to this gate.",
    toolSlug: null,
  },
};

function hardStopMilestone(
  code: PathHardStopCode,
  sortOrder: number,
  dependsOn: string | null,
  metrics: PathMetricsInput | null,
  asOfDate: string,
  index: number,
): PathMilestoneDraft {
  const copy = HARD_STOP_COPY[code];
  const target = hardStopTarget(code, metrics);
  return {
    id: milestoneId(sortOrder),
    title: copy.title,
    description: copy.description,
    kind: "hard_stop",
    targetDate: addDaysDateOnly(asOfDate, HARD_STOP_BASE_DAYS * (index + 1)),
    targetAmountCents: target.targetAmountCents,
    fundingSource: target.fundingSource,
    toolSlug: copy.toolSlug,
    dependsOn,
    sortOrder,
    status: "pending",
  };
}

function goalToolSlug(goal: PathGoalInput): string | null {
  if (goal.goalType === "home") return "down-payment";
  if (goal.goalType === "emergency_reserve") return "runway";
  return null;
}

function goalMilestone(
  goal: PathGoalInput,
  sortOrder: number,
  dependsOn: string | null,
  metrics: PathMetricsInput | null,
): PathMilestoneDraft {
  const remaining = goal.targetAmountCents - goal.currentAmountCents;
  const hasTarget = remaining > 0;
  return {
    id: milestoneId(sortOrder),
    title: `Fund “${goal.name}”`,
    description: hasTarget
      ? "The target is the recorded gap between this goal's target and its recorded balance. " +
        "It updates as the goal is funded."
      : "This goal has no recorded remaining gap, so no amount is set.",
    kind: "savings",
    targetDate: goal.targetDate,
    targetAmountCents: hasTarget ? remaining : null,
    fundingSource: hasTarget
      ? { ...goalProvenance({
          valueCents: remaining,
          completeness: metrics ? metrics.completeness : null,
        }), goalId: goal.id }
      : { ...insufficientDataProvenance("savings_goal"), goalId: goal.id },
    toolSlug: goalToolSlug(goal),
    dependsOn,
    sortOrder,
    status: "pending",
  };
}

function pillarMilestone(
  pillar: PathPillarKey,
  sortOrder: number,
  dependsOn: string | null,
  metrics: PathMetricsInput | null,
  asOfDate: string,
): PathMilestoneDraft {
  if (pillar === "financial") {
    // Emergency reserve toward one month of recorded outflow, when known.
    const outflow = metrics?.monthlyOutflowCents ?? null;
    const liquid = metrics?.liquidSavingsCents ?? null;
    const gap = outflow !== null && outflow > 0 && liquid !== null ? outflow - liquid : null;
    return {
      id: milestoneId(sortOrder),
      title: "Build the emergency reserve toward one month of outflow",
      description:
        "Financial Reality is the lowest recorded dimension. " +
        "Runway depth is the foundation under the other goals. " +
        (gap !== null && gap > 0
          ? "The target is the recorded gap to one month of outflow."
          : "No amount is set until enough ledger data exists."),
      kind: "savings",
      targetDate: addDaysDateOnly(asOfDate, 60),
      targetAmountCents: gap !== null && gap > 0 ? gap : null,
      fundingSource:
        gap !== null && gap > 0 && metrics
          ? metricProvenance({
              metric: "runway",
              valueCents: outflow,
              completeness: metrics.completeness,
            })
          : insufficientDataProvenance("runway"),
      toolSlug: "runway",
      dependsOn,
      sortOrder,
      status: "pending",
    };
  }
  if (pillar === "emotional") {
    return {
      id: milestoneId(sortOrder),
      title: "Alignment and pressure check-in",
      description:
        "Emotional Truth is the lowest recorded dimension. " +
        "A written check-in on why this decision and why now keeps the timeline yours. " +
        "If a partner shares this decision, record the alignment state on the path.",
      kind: "timing",
      targetDate: addDaysDateOnly(asOfDate, 30),
      targetAmountCents: null,
      fundingSource: assessmentProvenance(),
      toolSlug: null,
      dependsOn,
      sortOrder,
      status: "pending",
    };
  }
  return {
    id: milestoneId(sortOrder),
    title: "Give the decision more calendar room",
    description:
      "Perfect Timing is the lowest recorded dimension. " +
      "A longer horizon lowers the cost of waiting for the other gates to clear.",
    kind: "timing",
    targetDate: addDaysDateOnly(asOfDate, 30),
    targetAmountCents: null,
    fundingSource: assessmentProvenance(),
    toolSlug: null,
    dependsOn,
    sortOrder,
    status: "pending",
  };
}

function evidenceMilestone(
  sortOrder: number,
  metrics: PathMetricsInput | null,
  asOfDate: string,
): PathMilestoneDraft {
  const months = metrics?.monthsWithData ?? 0;
  return {
    id: milestoneId(sortOrder),
    title: "Record three months of transactions",
    description:
      `The ledger currently holds ${months} month${months === 1 ? "" : "s"} of activity. ` +
      "Three months of recorded transactions raise the confidence cap on every target on this path. " +
      "Sharper data is itself a milestone.",
    kind: "evidence",
    targetDate: addDaysDateOnly(asOfDate, EVIDENCE_DAYS),
    targetAmountCents: null,
    fundingSource: insufficientDataProvenance("completeness"),
    toolSlug: null,
    dependsOn: null,
    sortOrder,
    status: "pending",
  };
}

function readyReviewMilestone(sortOrder: number, asOfDate: string): PathMilestoneDraft {
  return {
    id: milestoneId(sortOrder),
    title: "Optional 90-day readiness review",
    description:
      "The last recorded assessment landed in the READY band. " +
      "No required steps — re-run the assessment only if life inputs change.",
    kind: "timing",
    targetDate: addDaysDateOnly(asOfDate, READY_REVIEW_DAYS),
    targetAmountCents: null,
    fundingSource: assessmentProvenance(),
    toolSlug: null,
    dependsOn: null,
    sortOrder,
    status: "pending",
  };
}

/**
 * Generates the ordered Build Path. Deterministic: milestone ids, dates,
 * amounts, and ordering are pure functions of the input.
 */
export function generatePath(input: GeneratePathInput): GeneratedPath {
  const binding = resolveBindingConstraint(input.hardStops, input.pillars);
  const version = input.version ?? 1;

  const diagnosis: GeneratedPath["diagnosis"] = {
    verdict: input.verdict,
    hardStops: input.hardStops,
    pillars: input.pillars,
    metricsAsOf: input.metrics?.asOf ?? null,
    generatedAt: input.asOfDate,
    assessmentId: input.assessmentId ?? null,
  };

  // READY with no hard-stops: a map with one optional review, never homework.
  if (input.verdict === "READY" && input.hardStops.length === 0) {
    return {
      version,
      bindingConstraint: binding,
      diagnosis,
      milestones: [readyReviewMilestone(1, input.asOfDate)],
    };
  }

  const milestones: PathMilestoneDraft[] = [];
  let sort = 0;
  let previousId: string | null = null;

  // 1. Hard-stop resolution milestones, binding constraint first, chained.
  const stops = orderedHardStops(input.hardStops);
  stops.forEach((stop, index) => {
    sort += 1;
    const m = hardStopMilestone(stop.code, sort, previousId, input.metrics, input.asOfDate, index);
    milestones.push(m);
    previousId = m.id;
  });

  // 2. Pillar milestone when no hard stop fired (weakest dimension first).
  if (stops.length === 0) {
    sort += 1;
    const m = pillarMilestone(
      weakestPillar(input.pillars),
      sort,
      previousId,
      input.metrics,
      input.asOfDate,
    );
    milestones.push(m);
    previousId = m.id;
  }

  // 3. Savings milestones bridged to active goals, chained after the gates.
  for (const goal of input.goals) {
    sort += 1;
    const m = goalMilestone(goal, sort, previousId, input.metrics);
    milestones.push(m);
    previousId = m.id;
  }

  // 4. Evidence milestone when the data cannot yet support confident targets.
  if (input.metrics === null || input.metrics.completeness !== "high") {
    sort += 1;
    milestones.push(evidenceMilestone(sort, input.metrics, input.asOfDate));
  }

  return { version, bindingConstraint: binding, diagnosis, milestones };
}
