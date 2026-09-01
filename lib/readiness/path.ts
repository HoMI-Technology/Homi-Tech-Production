/**
 * Path to Ready — pure binding-constraint path generator.
 *
 * Scorer owns truth (`AssessmentResult`). This module only sequences
 * protective next steps. Never invents verdicts or quotes finance defaults.
 *
 * Spec: docs/superpowers/specs/2026-07-27-path-to-ready-design.md
 */

import type { AssessmentResult, HardStopCode, Verdict } from "@/lib/scoring/engine";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import { hardStopPathNotes, hardStopPathTitle } from "@/lib/assessment/hard-stop-copy";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PathStepKind = "milestone" | "deadline" | "review";

export type PathReasonCode =
  | HardStopCode
  | "PILLAR_FINANCIAL"
  | "PILLAR_EMOTIONAL"
  | "PILLAR_TIMING"
  | "NEGATIVE_CASHFLOW"
  | "PARTNER_ALIGNMENT"
  | "REASSESS"
  | "MAINTENANCE"
  | "READY_CELEBRATE";

export type PathConfidence = "assessment_only" | "assessment_plus_finance";

export type PathMode = "build" | "ready_optional";

export type PathStepStatus = "pending" | "done" | "skipped";

export interface PathStep {
  id: string;
  title: string;
  kind: PathStepKind;
  /** Offset from generation day; first step must be ≤ 7. */
  daysFromNow: number;
  reasonCode: PathReasonCode;
  /** Internal product route (no locale prefix). */
  href: string;
  /** Protective, educational voice — never shaming. */
  notes: string;
  fundingTarget: number | null;
  fundingLabel: string | null;
  /** Completion — defaults to pending for legacy paths. */
  status: PathStepStatus;
  completedAt: string | null;
}

export interface ReadinessPath {
  id: string;
  version: 1;
  createdAt: string;
  assessmentCompletedAt: string | null;
  verdict: Verdict;
  score: number;
  bindingConstraint: PathReasonCode | null;
  confidence: PathConfidence;
  disclaimer: string;
  steps: PathStep[];
  mode: PathMode;
  /** ISO when steps were written to the decision calendar (null if not). */
  calendarCommittedAt: string | null;
}

/** Optional finance snapshot — only pass when the user has saved finance data. */
export interface PathFinanceSnapshot {
  netCashFlow: number;
  runwayMonths: number | null;
  monthlyExpenses: number;
  liquidSavings: number;
  monthlyDebtPayments: number;
  monthlyIncome: number;
}

export interface BuildReadinessPathOptions {
  assessmentCompletedAt?: string | null;
  finance?: PathFinanceSnapshot | null;
  /** Injected for tests. */
  now?: Date;
  idFactory?: () => string;
  /** Vertical for hard-stop titles (ADR-002). Defaults to home. */
  decisionType?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Hard-stop priority: fix solvency before credit/housing optics. */
export const HARD_STOP_ORDER: readonly HardStopCode[] = [
  "RUNWAY_UNDER_1_MONTH",
  "DTI_OVER_50",
  "HOUSING_RATIO_OVER_45",
  "CREDIT_UNDER_620",
] as const;

export const PATH_DISCLAIMER =
  "Educational readiness only — not a commitment to lend, credit approval, " +
  "or personalized financial, legal, or tax advice. Re-run the assessment " +
  "before any irreversible move.";

export const MAX_PATH_STEPS = 7;
export const FIRST_STEP_MAX_DAYS = 7;

const PATH_MARKER_PREFIX = "<!--homi-path:";
const PATH_MARKER_SUFFIX = "-->";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defaultId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `path-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function stepId(idFactory: () => string): string {
  return idFactory();
}

function pendingFields(): Pick<PathStep, "status" | "completedAt"> {
  return { status: "pending", completedAt: null };
}

/** Normalize legacy localStorage paths missing status / calendarCommittedAt. */
export function normalizeReadinessPath(raw: unknown): ReadinessPath | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Partial<ReadinessPath>;
  if (p.version !== 1 || !Array.isArray(p.steps) || typeof p.id !== "string") {
    return null;
  }
  const steps: PathStep[] = p.steps.map((s, i) => {
    const step = s as Partial<PathStep>;
    return {
      id: typeof step.id === "string" ? step.id : `legacy-${i}`,
      title: String(step.title ?? "Step"),
      kind: (step.kind as PathStep["kind"]) ?? "milestone",
      daysFromNow: typeof step.daysFromNow === "number" ? step.daysFromNow : 0,
      reasonCode: (step.reasonCode as PathReasonCode) ?? "REASSESS",
      href: typeof step.href === "string" ? step.href : "/dashboard",
      notes: typeof step.notes === "string" ? step.notes : "",
      fundingTarget: typeof step.fundingTarget === "number" ? step.fundingTarget : null,
      fundingLabel: typeof step.fundingLabel === "string" ? step.fundingLabel : null,
      status:
        step.status === "done" || step.status === "skipped" || step.status === "pending"
          ? step.status
          : "pending",
      completedAt: typeof step.completedAt === "string" ? step.completedAt : null,
    };
  });
  return {
    id: p.id,
    version: 1,
    createdAt: typeof p.createdAt === "string" ? p.createdAt : new Date().toISOString(),
    assessmentCompletedAt:
      typeof p.assessmentCompletedAt === "string" ? p.assessmentCompletedAt : null,
    verdict: (p.verdict as Verdict) ?? "NOT_YET",
    score: typeof p.score === "number" ? p.score : 0,
    bindingConstraint: (p.bindingConstraint as PathReasonCode | null) ?? null,
    confidence:
      p.confidence === "assessment_plus_finance" ? "assessment_plus_finance" : "assessment_only",
    disclaimer: typeof p.disclaimer === "string" ? p.disclaimer : PATH_DISCLAIMER,
    steps,
    mode: p.mode === "ready_optional" ? "ready_optional" : "build",
    calendarCommittedAt: typeof p.calendarCommittedAt === "string" ? p.calendarCommittedAt : null,
  };
}

/** Mark a step done/skipped; returns new path (immutable). */
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

function hardStopCodes(result: AssessmentResult): HardStopCode[] {
  const present = new Set(result.hardStops.map((h) => h.code));
  return HARD_STOP_ORDER.filter((code) => present.has(code));
}

function pillarPcts(result: AssessmentResult): {
  financial: number;
  emotional: number;
  timing: number;
} {
  return {
    financial: (result.financial.total / PILLAR_MAX_POINTS.financial) * 100,
    emotional: (result.emotional.total / PILLAR_MAX_POINTS.emotional) * 100,
    timing: (result.timing.total / PILLAR_MAX_POINTS.timing) * 100,
  };
}

function weakestPillar(result: AssessmentResult): "financial" | "emotional" | "timing" {
  const p = pillarPcts(result);
  const ranked: Array<["financial" | "emotional" | "timing", number]> = [
    ["financial", p.financial],
    ["emotional", p.emotional],
    ["timing", p.timing],
  ];
  ranked.sort((a, b) => a[1] - b[1]);
  return ranked[0][0];
}

// ---------------------------------------------------------------------------
// Step builders
// ---------------------------------------------------------------------------

function hardStopStep(
  code: HardStopCode,
  daysFromNow: number,
  finance: PathFinanceSnapshot | null | undefined,
  idFactory: () => string,
  decisionType: string = "home_buying",
): PathStep {
  const id = stepId(idFactory);
  switch (code) {
    case "RUNWAY_UNDER_1_MONTH": {
      const monthly =
        finance && finance.monthlyExpenses + finance.monthlyDebtPayments > 0
          ? finance.monthlyExpenses + finance.monthlyDebtPayments
          : null;
      const gap =
        monthly != null && finance
          ? Math.max(0, Math.round(monthly - finance.liquidSavings))
          : null;
      return {
        id,
        title: "Stabilize emergency runway to at least 1 month",
        kind: "deadline",
        daysFromNow,
        reasonCode: code,
        href: "/tools/runway",
        notes:
          "Protective gate: under 1 month of runway forces DO NOT PROCEED. " +
          "Build cash covering one full month of expenses before any major purchase. " +
          PATH_DISCLAIMER,
        fundingTarget: gap,
        fundingLabel: gap != null ? "Cash still needed for 1-month runway" : null,
        ...pendingFields(),
      };
    }
    case "DTI_OVER_50":
      return {
        id,
        title: "Bring debt-to-income below the protective line",
        kind: "deadline",
        daysFromNow,
        reasonCode: code,
        href: "/tools/debt-payoff",
        notes:
          "Protective gate: DTI above 50% blocks readiness regardless of score. " +
          "Prioritize high-rate balances and free monthly cash flow. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      };
    case "HOUSING_RATIO_OVER_45":
      return {
        id,
        title: hardStopPathTitle(code, decisionType),
        kind: "milestone",
        daysFromNow,
        reasonCode: code,
        href: "/tools/affordability",
        notes: hardStopPathNotes(code, PATH_DISCLAIMER, decisionType),
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      };
    case "CREDIT_UNDER_620":
      return {
        id,
        title: "Rebuild credit above the 620 protective floor",
        kind: "milestone",
        daysFromNow,
        reasonCode: code,
        href: "/credit",
        notes:
          "Protective gate: credit under 620 forces DO NOT PROCEED. " +
          "On-time payments and lower utilization move this gate first. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      };
  }
}

function cashFlowStep(daysFromNow: number, idFactory: () => string): PathStep {
  return {
    id: stepId(idFactory),
    title: "Stop negative cash flow before building aspirational goals",
    kind: "deadline",
    daysFromNow,
    reasonCode: "NEGATIVE_CASHFLOW",
    href: "/money",
    notes:
      "Your saved finance picture shows more leaving than entering each month. " +
      "Path to Ready parks house-hunting milestones until monthly surplus is ≥ $0. " +
      PATH_DISCLAIMER,
    fundingTarget: null,
    fundingLabel: null,
    ...pendingFields(),
  };
}

function pillarSteps(
  result: AssessmentResult,
  startDay: number,
  idFactory: () => string,
): PathStep[] {
  const steps: PathStep[] = [];
  const p = pillarPcts(result);
  const weakest = weakestPillar(result);
  let day = startDay;

  const push = (step: Omit<PathStep, "id" | "daysFromNow"> & { daysFromNow?: number }) => {
    steps.push({
      ...step,
      id: stepId(idFactory),
      daysFromNow: step.daysFromNow ?? day,
    });
    day += 14;
  };

  if (weakest === "financial" || p.financial < 70) {
    if (result.financial.emergencyFund < 6) {
      push({
        title: "Grow emergency fund toward 3–6 months",
        kind: "milestone",
        reasonCode: "PILLAR_FINANCIAL",
        href: "/tools/runway",
        notes:
          "Financial Reality is a primary gap. Runway depth is the foundation under every other goal. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      });
    }
    if (result.financial.debtToIncome < 7) {
      push({
        title: "Lower monthly debt burden (target DTI ≤ 36%)",
        kind: "milestone",
        reasonCode: "PILLAR_FINANCIAL",
        href: "/tools/debt-payoff",
        notes:
          "Debt payments compress readiness. Use avalanche/snowball on /tools/debt-payoff. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      });
    }
    if (result.financial.downPayment < 7 || result.timing.downPaymentProgress < 7) {
      push({
        title: "Advance down-payment progress with a funded target",
        kind: "milestone",
        reasonCode: "PILLAR_FINANCIAL",
        href: "/tools/down-payment",
        notes:
          "Down-payment progress is incomplete. Set a monthly transfer and track the gap. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      });
    }
  }

  if (weakest === "emotional" || p.emotional < 70) {
    if (!result.emotional.singleRedistribution && result.emotional.partnerAlignment < 5) {
      push({
        title: "Household alignment session (budget ceiling + deal-breakers)",
        kind: "milestone",
        reasonCode: "PARTNER_ALIGNMENT",
        href: "/household#couples",
        notes:
          "Partner alignment is a readiness input — not a formality. " +
          "Agree on max budget and non-negotiables before shopping. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      });
    } else if (result.emotional.fomoCheck < 5) {
      push({
        title: "Cool external pressure — 30 quiet days on the decision",
        kind: "review",
        reasonCode: "PILLAR_EMOTIONAL",
        href: "/journal",
        notes:
          "Pressure check is low: urgency may be external. " +
          "Use the journal to separate your timeline from someone else's. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      });
    } else {
      push({
        title: "Emotional Truth check-in — why this decision, why now",
        kind: "review",
        reasonCode: "PILLAR_EMOTIONAL",
        href: "/journal",
        notes:
          "Emotional Truth is the weaker pillar. Clarity here prevents expensive regret. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      });
    }
  }

  if (weakest === "timing" || p.timing < 70) {
    if (result.timing.timeHorizon < 7) {
      push({
        title: "Extend the decision horizon past a rushed window",
        kind: "milestone",
        reasonCode: "PILLAR_TIMING",
        href: "/decisions",
        notes:
          "Short horizons inflate FOMO pricing. Give the decision more calendar room. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      });
    }
    if (result.timing.savingsRate < 7) {
      push({
        title: "Raise savings rate toward 15–20% of income",
        kind: "milestone",
        reasonCode: "PILLAR_TIMING",
        href: "/money",
        notes:
          "Timing follows momentum. Savings rate is the lever that moves purchase readiness. " +
          PATH_DISCLAIMER,
        fundingTarget: null,
        fundingLabel: null,
        ...pendingFields(),
      });
    }
  }

  return steps;
}

function reassessStep(daysFromNow: number, idFactory: () => string): PathStep {
  return {
    id: stepId(idFactory),
    title: "Re-take the assessment and update your path",
    kind: "review",
    daysFromNow,
    reasonCode: "REASSESS",
    href: "/assessment",
    notes:
      "Paths go stale. Re-score with the same engine before treating readiness as current. " +
      PATH_DISCLAIMER,
    fundingTarget: null,
    fundingLabel: null,
    ...pendingFields(),
  };
}

function readyOptionalStep(idFactory: () => string): PathStep {
  return {
    id: stepId(idFactory),
    title: "Optional 90-day readiness review",
    kind: "review",
    daysFromNow: 90,
    reasonCode: "MAINTENANCE",
    href: "/assessment",
    notes:
      "You are in the READY band on your last assessment. " +
      "No forced homework — optional review only if life inputs change. " +
      PATH_DISCLAIMER,
    fundingTarget: null,
    fundingLabel: null,
    ...pendingFields(),
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a versioned Path to Ready from an assessment result.
 * Pass `finance` only when the user has saved finance state.
 */
export function buildReadinessPath(
  result: AssessmentResult,
  options: BuildReadinessPathOptions = {},
): ReadinessPath {
  const idFactory = options.idFactory ?? defaultId;
  const finance = options.finance ?? null;
  const confidence: PathConfidence = finance ? "assessment_plus_finance" : "assessment_only";
  const createdAt = (options.now ?? new Date()).toISOString();
  const pathId = idFactory();

  const base = {
    id: pathId,
    version: 1 as const,
    createdAt,
    assessmentCompletedAt: options.assessmentCompletedAt ?? null,
    verdict: result.verdict,
    score: result.score,
    confidence,
    disclaimer: PATH_DISCLAIMER,
    calendarCommittedAt: null,
  };

  // READY with no hard-stops → celebrate, no forced homework
  if (result.verdict === "READY" && result.hardStops.length === 0) {
    return {
      ...base,
      bindingConstraint: "READY_CELEBRATE",
      mode: "ready_optional",
      steps: [readyOptionalStep(idFactory)],
    };
  }

  const steps: PathStep[] = [];
  let binding: PathReasonCode | null = null;
  let dayCursor = 3; // first action inside 7 days

  const stops = hardStopCodes(result);
  if (stops.length > 0) {
    binding = stops[0];
    for (let i = 0; i < stops.length; i++) {
      const d = i === 0 ? 3 : 14 + (i - 1) * 21;
      steps.push(hardStopStep(stops[i], d, finance, idFactory, options.decisionType));
      dayCursor = d + 14;
    }
  }

  // Negative cash flow (only with real finance data) — after hard-stops or alone
  if (finance && finance.netCashFlow < 0) {
    if (!binding) binding = "NEGATIVE_CASHFLOW";
    const alreadyCash = steps.some((s) => s.reasonCode === "NEGATIVE_CASHFLOW");
    if (!alreadyCash) {
      steps.unshift(cashFlowStep(Math.min(3, FIRST_STEP_MAX_DAYS), idFactory));
      // re-number first hard-stop later if needed — keep cash first
      dayCursor = Math.max(dayCursor, 17);
    }
  }

  if (stops.length === 0) {
    const soft = pillarSteps(result, dayCursor, idFactory);
    if (!binding && soft.length > 0) {
      binding = soft[0].reasonCode;
    }
    steps.push(...soft);
  } else {
    // After hard-stops, add at most one soft pillar step if room
    const soft = pillarSteps(result, dayCursor, idFactory).slice(0, 1);
    steps.push(...soft);
  }

  // Cap before reassess so we always leave room
  const capped = steps.slice(0, MAX_PATH_STEPS - 1);

  // Ensure first step ≤ 7 days
  if (capped.length > 0 && capped[0].daysFromNow > FIRST_STEP_MAX_DAYS) {
    capped[0] = { ...capped[0], daysFromNow: FIRST_STEP_MAX_DAYS };
  }

  const reassessDay = Math.min(
    90,
    Math.max(30, (capped[capped.length - 1]?.daysFromNow ?? 14) + 21),
  );
  capped.push(reassessStep(reassessDay, idFactory));

  // Deduplicate href+title pairs roughly
  const seen = new Set<string>();
  const deduped: PathStep[] = [];
  for (const s of capped) {
    const key = `${s.reasonCode}|${s.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(s);
  }

  // Negative cash flow should remain first if present
  deduped.sort((a, b) => {
    if (a.reasonCode === "NEGATIVE_CASHFLOW" && b.reasonCode !== "NEGATIVE_CASHFLOW") {
      return -1;
    }
    if (b.reasonCode === "NEGATIVE_CASHFLOW" && a.reasonCode !== "NEGATIVE_CASHFLOW") {
      return 1;
    }
    return a.daysFromNow - b.daysFromNow;
  });

  const finalSteps = deduped.slice(0, MAX_PATH_STEPS);
  if (finalSteps.length > 0 && finalSteps[0].daysFromNow > FIRST_STEP_MAX_DAYS) {
    finalSteps[0] = { ...finalSteps[0], daysFromNow: FIRST_STEP_MAX_DAYS };
  }

  if (!binding && finalSteps.length > 0) {
    binding = finalSteps[0].reasonCode;
  }

  return {
    ...base,
    bindingConstraint: binding,
    mode: "build",
    steps: finalSteps,
  };
}

// ---------------------------------------------------------------------------
// Calendar notes markers
// ---------------------------------------------------------------------------

/** Encode path provenance into calendar event notes. */
export function formatPathEventNotes(path: ReadinessPath, step: PathStep): string {
  const marker = `${PATH_MARKER_PREFIX}${path.id}:${step.id}${PATH_MARKER_SUFFIX}`;
  return [
    `HōMI Path · ${step.reasonCode}`,
    "",
    step.notes,
    step.fundingTarget != null && step.fundingLabel
      ? `\nTarget: ${step.fundingLabel} — $${step.fundingTarget.toLocaleString("en-US")}`
      : "",
    `\nOpen: ${step.href}`,
    "",
    marker,
  ]
    .filter(Boolean)
    .join("\n");
}

export function parsePathMarker(
  notes: string | null | undefined,
): { pathId: string; stepId: string } | null {
  if (!notes) return null;
  const re = /<!--homi-path:([^:>]+):([^>]+)-->/;
  const m = re.exec(notes);
  if (!m) return null;
  return { pathId: m[1], stepId: m[2] };
}

export function isPathCalendarEvent(notes: string | null | undefined): boolean {
  return parsePathMarker(notes) != null;
}

/** Local calendar date offset helper (pure; uses local Y/M/D arithmetic). */
export function pathStepEventDate(step: PathStep, from: Date = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + step.daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function bindingConstraintLabel(code: PathReasonCode | null): string {
  if (!code) return "Readiness gaps";
  switch (code) {
    case "RUNWAY_UNDER_1_MONTH":
      return "Emergency runway under 1 month";
    case "DTI_OVER_50":
      return "Debt-to-income above 50%";
    case "HOUSING_RATIO_OVER_45":
      return "Housing cost above 45% of income";
    case "CREDIT_UNDER_620":
      return "Credit under 620";
    case "NEGATIVE_CASHFLOW":
      return "Negative monthly cash flow";
    case "PILLAR_FINANCIAL":
      return "Financial Reality gap";
    case "PILLAR_EMOTIONAL":
      return "Emotional Truth gap";
    case "PILLAR_TIMING":
      return "Perfect Timing gap";
    case "PARTNER_ALIGNMENT":
      return "Partner alignment";
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
