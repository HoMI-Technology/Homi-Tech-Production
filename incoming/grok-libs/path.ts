/**
 * Path to Ready — finance-first binding-constraint sequencer for the
 * planner Path-to-Ready sequencer. Adapted from HōMI production readiness path.
 * without the full assessment engine: constraints come from live cash flow,
 * runway, DTI, and savings rate.
 *
 * Educational readiness only — not a commitment to lend or advice.
 */

export type PathStepKind = "milestone" | "deadline" | "review";
export type PathStepStatus = "pending" | "done" | "skipped";
export type PathMode = "build" | "ready_optional";

export type PathReasonCode =
  | "RUNWAY_UNDER_1_MONTH"
  | "RUNWAY_UNDER_3_MONTHS"
  | "DTI_OVER_50"
  | "DTI_HIGH"
  | "NEGATIVE_CASHFLOW"
  | "LOW_SAVINGS_RATE"
  | "EMERGENCY_FUND"
  | "DEBT_BURDEN"
  | "REASSESS"
  | "MAINTENANCE"
  | "READY_CELEBRATE";

export interface PathStep {
  id: string;
  title: string;
  kind: PathStepKind;
  daysFromNow: number;
  reasonCode: PathReasonCode;
  notes: string;
  fundingTarget: number | null;
  fundingLabel: string | null;
  status: PathStepStatus;
  completedAt: string | null;
}

export interface ReadinessPath {
  id: string;
  version: 1;
  createdAt: string;
  score: number;
  verdict: "READY" | "ALMOST" | "NOT_YET";
  bindingConstraint: PathReasonCode | null;
  confidence: "finance_live";
  disclaimer: string;
  steps: PathStep[];
  mode: PathMode;
}

export interface PathFinanceSnapshot {
  income: number;
  expenses: number;
  cashFlow: number;
  savingsRate: number;
  runwayMonths: number;
  dti: number;
  liquidCash: number;
  debtPayments: number;
  portfolioValue: number;
  netWorth: number;
  savingsGoalTarget: number;
  savingsGoalCurrent: number;
}

export const PATH_DISCLAIMER =
  "Educational readiness only — not a commitment to lend, credit approval, " +
  "or personalized financial, legal, or tax advice. Re-check numbers before " +
  "any irreversible move.";

const MAX_STEPS = 7;

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `path-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function pending(): Pick<PathStep, "status" | "completedAt"> {
  return { status: "pending", completedAt: null };
}

/** 0–100 readiness score from finance gauges (finance-only scorer). */
export function scoreFromFinance(f: PathFinanceSnapshot): number {
  let score = 40;

  // Runway (0–25)
  if (!Number.isFinite(f.runwayMonths)) score += 25;
  else if (f.runwayMonths >= 6) score += 25;
  else if (f.runwayMonths >= 3) score += 18;
  else if (f.runwayMonths >= 1) score += 8;
  else score += 0;

  // Savings rate (0–20)
  if (f.savingsRate >= 20) score += 20;
  else if (f.savingsRate >= 10) score += 14;
  else if (f.savingsRate >= 0) score += 6;
  else score += 0;

  // DTI (0–15)
  if (f.dti <= 28) score += 15;
  else if (f.dti <= 36) score += 10;
  else if (f.dti <= 43) score += 5;
  else if (f.dti <= 50) score += 2;

  // Cash flow (0–10)
  if (f.income > 0) {
    const ratio = f.cashFlow / f.income;
    if (ratio >= 0.15) score += 10;
    else if (ratio >= 0.05) score += 7;
    else if (ratio >= 0) score += 3;
  }

  // Net worth buffer (0–10)
  if (f.netWorth >= 100_000) score += 10;
  else if (f.netWorth >= 50_000) score += 7;
  else if (f.netWorth >= 0) score += 4;
  else score += 0;

  return Math.max(0, Math.min(100, Math.round(score)));
}

export function verdictFromScore(
  score: number,
  f: PathFinanceSnapshot,
): ReadinessPath["verdict"] {
  if (f.runwayMonths < 1 || f.dti > 50 || f.cashFlow < 0) return "NOT_YET";
  if (score >= 75) return "READY";
  if (score >= 55) return "ALMOST";
  return "NOT_YET";
}

export function bindingConstraintLabel(code: PathReasonCode | null): string {
  if (!code) return "Readiness gaps";
  switch (code) {
    case "RUNWAY_UNDER_1_MONTH":
      return "Emergency runway under 1 month";
    case "RUNWAY_UNDER_3_MONTHS":
      return "Runway under 3 months";
    case "DTI_OVER_50":
      return "Debt-to-income above 50%";
    case "DTI_HIGH":
      return "Elevated debt-to-income";
    case "NEGATIVE_CASHFLOW":
      return "Negative monthly cash flow";
    case "LOW_SAVINGS_RATE":
      return "Savings rate below 10%";
    case "EMERGENCY_FUND":
      return "Emergency fund gap";
    case "DEBT_BURDEN":
      return "Debt payment burden";
    case "REASSESS":
      return "Reassessment due";
    case "MAINTENANCE":
      return "Optional maintenance";
    case "READY_CELEBRATE":
      return "READY — optional review only";
    default:
      return "Readiness gaps";
  }
}

export function buildReadinessPath(
  finance: PathFinanceSnapshot,
  now: Date = new Date(),
): ReadinessPath {
  const score = scoreFromFinance(finance);
  const verdict = verdictFromScore(score, finance);
  const createdAt = now.toISOString();
  const pathId = uid();

  const base = {
    id: pathId,
    version: 1 as const,
    createdAt,
    score,
    verdict,
    confidence: "finance_live" as const,
    disclaimer: PATH_DISCLAIMER,
  };

  // READY with no hard stops
  if (
    verdict === "READY" &&
    finance.runwayMonths >= 3 &&
    finance.dti <= 36 &&
    finance.cashFlow >= 0
  ) {
    return {
      ...base,
      bindingConstraint: "READY_CELEBRATE",
      mode: "ready_optional",
      steps: [
        {
          id: uid(),
          title: "Optional 90-day readiness review",
          kind: "review",
          daysFromNow: 90,
          reasonCode: "MAINTENANCE",
          notes:
            "Finance gauges are in the READY band. No forced homework — optional review if life inputs change. " +
            PATH_DISCLAIMER,
          fundingTarget: null,
          fundingLabel: null,
          ...pending(),
        },
      ],
    };
  }

  const steps: PathStep[] = [];
  let binding: PathReasonCode | null = null;
  let day = 3;

  // Hard stops first
  if (finance.cashFlow < 0) {
    binding = "NEGATIVE_CASHFLOW";
    steps.push({
      id: uid(),
      title: "Stop negative cash flow before aspirational goals",
      kind: "deadline",
      daysFromNow: 3,
      reasonCode: "NEGATIVE_CASHFLOW",
      notes:
        "More is leaving than entering this period. Park big goals until monthly surplus is ≥ $0. " +
        PATH_DISCLAIMER,
      fundingTarget: Math.round(Math.abs(finance.cashFlow)),
      fundingLabel: "Monthly gap to close",
      ...pending(),
    });
    day = 17;
  }

  if (finance.runwayMonths < 1) {
    if (!binding) binding = "RUNWAY_UNDER_1_MONTH";
    const monthlyOut =
      finance.expenses > 0 ? finance.expenses : finance.debtPayments || 1;
    const gap = Math.max(0, Math.round(monthlyOut - finance.liquidCash));
    steps.push({
      id: uid(),
      title: "Stabilize emergency runway to at least 1 month",
      kind: "deadline",
      daysFromNow: day,
      reasonCode: "RUNWAY_UNDER_1_MONTH",
      notes:
        "Under 1 month of liquid cash covering outflow is a protective gate. Build cash for one full month of expenses. " +
        PATH_DISCLAIMER,
      fundingTarget: gap || null,
      fundingLabel: gap > 0 ? "Cash still needed for 1-month runway" : null,
      ...pending(),
    });
    day += 14;
  } else if (finance.runwayMonths < 3) {
    if (!binding) binding = "RUNWAY_UNDER_3_MONTHS";
    const monthlyOut = finance.expenses > 0 ? finance.expenses : 1;
    const target = monthlyOut * 3;
    const gap = Math.max(0, Math.round(target - finance.liquidCash));
    steps.push({
      id: uid(),
      title: "Grow runway toward 3 months of expenses",
      kind: "milestone",
      daysFromNow: day,
      reasonCode: "RUNWAY_UNDER_3_MONTHS",
      notes:
        "Three months of liquid runway is the foundation under every other goal. " +
        PATH_DISCLAIMER,
      fundingTarget: gap || null,
      fundingLabel: gap > 0 ? "Cash to reach 3-month runway" : null,
      ...pending(),
    });
    day += 14;
  }

  if (finance.dti > 50) {
    if (!binding) binding = "DTI_OVER_50";
    steps.push({
      id: uid(),
      title: "Bring debt-to-income below the protective line",
      kind: "deadline",
      daysFromNow: day,
      reasonCode: "DTI_OVER_50",
      notes:
        "DTI above 50% blocks readiness regardless of other numbers. Prioritize high-rate balances. " +
        PATH_DISCLAIMER,
      fundingTarget: null,
      fundingLabel: null,
      ...pending(),
    });
    day += 14;
  } else if (finance.dti > 36) {
    if (!binding) binding = "DTI_HIGH";
    steps.push({
      id: uid(),
      title: "Lower monthly debt burden (target DTI ≤ 36%)",
      kind: "milestone",
      daysFromNow: day,
      reasonCode: "DTI_HIGH",
      notes:
        "Debt payments compress readiness. Avalanche or snowball high-rate balances. " +
        PATH_DISCLAIMER,
      fundingTarget: null,
      fundingLabel: null,
      ...pending(),
    });
    day += 14;
  }

  if (finance.savingsRate < 10 && finance.cashFlow >= 0) {
    if (!binding) binding = "LOW_SAVINGS_RATE";
    steps.push({
      id: uid(),
      title: "Raise savings rate toward 15–20% of income",
      kind: "milestone",
      daysFromNow: day,
      reasonCode: "LOW_SAVINGS_RATE",
      notes:
        "Savings rate is the lever that moves purchase readiness. Automate a transfer on payday. " +
        PATH_DISCLAIMER,
      fundingTarget: null,
      fundingLabel: null,
      ...pending(),
    });
    day += 14;
  }

  if (
    finance.savingsGoalTarget > 0 &&
    finance.savingsGoalCurrent < finance.savingsGoalTarget * 0.5
  ) {
    if (!binding) binding = "EMERGENCY_FUND";
    const gap = Math.round(
      finance.savingsGoalTarget - finance.savingsGoalCurrent,
    );
    steps.push({
      id: uid(),
      title: "Advance emergency fund toward your target",
      kind: "milestone",
      daysFromNow: day,
      reasonCode: "EMERGENCY_FUND",
      notes:
        "Your named savings goal is under halfway. Fund it before stretching into riskier decisions. " +
        PATH_DISCLAIMER,
      fundingTarget: gap,
      fundingLabel: "Still needed for goal",
      ...pending(),
    });
    day += 14;
  }

  if (finance.debtPayments > 0 && finance.dti > 28 && steps.length < 4) {
    steps.push({
      id: uid(),
      title: "Map debt payoff order (avalanche vs snowball)",
      kind: "milestone",
      daysFromNow: day,
      reasonCode: "DEBT_BURDEN",
      notes:
        "List balances by rate and minimum. Kill the highest rate first unless motivation needs a quick win. " +
        PATH_DISCLAIMER,
      fundingTarget: null,
      fundingLabel: null,
      ...pending(),
    });
    day += 14;
  }

  // Cap + reassess
  const capped = steps.slice(0, MAX_STEPS - 1);
  const reassessDay = Math.min(
    90,
    Math.max(30, (capped[capped.length - 1]?.daysFromNow ?? 14) + 21),
  );
  capped.push({
    id: uid(),
    title: "Re-check Path to Ready with fresh numbers",
    kind: "review",
    daysFromNow: reassessDay,
    reasonCode: "REASSESS",
    notes:
      "Paths go stale. Regenerate from live ledger, banks, and portfolio before treating readiness as current. " +
      PATH_DISCLAIMER,
    fundingTarget: null,
    fundingLabel: null,
    ...pending(),
  });

  if (capped.length > 0 && capped[0]!.daysFromNow > 7) {
    capped[0] = { ...capped[0]!, daysFromNow: 7 };
  }

  if (!binding && capped.length > 0) binding = capped[0]!.reasonCode;

  return {
    ...base,
    bindingConstraint: binding,
    mode: "build",
    steps: capped.slice(0, MAX_STEPS),
  };
}

export function setPathStepStatus(
  path: ReadinessPath,
  stepId: string,
  status: PathStepStatus,
  now: Date = new Date(),
): ReadinessPath {
  return {
    ...path,
    steps: path.steps.map((s) =>
      s.id === stepId
        ? {
            ...s,
            status,
            completedAt: status === "pending" ? null : now.toISOString(),
          }
        : s,
    ),
  };
}

export function pathCompletionRatio(path: ReadinessPath): number {
  if (path.steps.length === 0) return 0;
  const done = path.steps.filter(
    (s) => s.status === "done" || s.status === "skipped",
  ).length;
  return done / path.steps.length;
}

export function pathStepDueDate(step: PathStep, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + step.daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
