/**
 * Path v4 workspace — Shell v4 chrome over the existing readiness-path engine.
 * AssessmentResult + path-rules SSOT. No parallel score. No invented $.
 */

import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";
import { hardStopPathTitle } from "@/lib/assessment/hard-stop-copy";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  foldHardStopEyebrow,
  foldHoldClose,
  foldHoldLead,
  foldHomeHoldSentence,
  foldRunwayLabel,
  resolveFoldPathPrimary,
  RUNWAY_HARD_STOP_FOLD_TITLE,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import {
  V4_SHELL_ASSESS_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
} from "@/lib/layout/v4-shell";
import { MAX_PATH_STEPS, type PathReasonCode, type PathStepStatus } from "@/lib/readiness/path";
import { V4_ASSESS_DECISION_LABEL, V4_ASSESS_HOMI_COMPARE, type V4AssessHomiPrompt } from "@/lib/v4/assessment-walk";

export const V4_PATH_HREF = V4_SHELL_PATH_HREF;
export const V4_PATH_ASSESS_HREF = V4_SHELL_ASSESS_HREF;
export const V4_PATH_MONEY_HREF = V4_SHELL_MONEY_HREF;
export const V4_PATH_MAX_STEPS = MAX_PATH_STEPS;

export const PATH_V4_EMPTY_TITLE = "Path appears after a read." as const;
export const PATH_V4_EMPTY_BODY =
  "No steps yet. One assessment paints this list — we never invent filler." as const;
export const PATH_V4_HOLD_FOLLOW = "Addresses the current hold." as const;
export const PATH_V4_NEXT_FOLLOW = "The next move from this read." as const;
export const PATH_V4_REASSESS_FOLLOW = "Same brain · honest refresh" as const;
export const PATH_V4_REASSESS_TITLE = "Re-take the assessment and update your path" as const;

export const V4_PATH_VISUAL_STATES = ["empty", "hard-stop", "normal", "complete"] as const;
export type V4PathVisualState = (typeof V4_PATH_VISUAL_STATES)[number];

export type PathV4Kind = V4PathVisualState;

export type PathV4CtaLabel = "Open" | "Assess";

export type PathV4StepCta = {
  label: PathV4CtaLabel;
  href: typeof V4_SHELL_ASSESS_HREF | typeof V4_SHELL_MONEY_HREF;
};

export type PathV4Step = {
  id: string;
  title: string;
  follow: string;
  cta: PathV4StepCta | null;
  ctaEmphasis: "primary" | "text";
  reasonCode: PathReasonCode | null;
  status: PathStepStatus;
};

export type PathV4HomiPrompt = V4AssessHomiPrompt;

export const PATH_V4_HOMI_PROMPTS: readonly PathV4HomiPrompt[] = [
  { label: "What is my next Path step?", href: V4_SHELL_PATH_HREF },
  { label: "Why does Path stop at seven?", href: "/learn" },
  V4_ASSESS_HOMI_COMPARE,
];

export type PathV4View = {
  kind: PathV4Kind;
  hasAssessment: boolean;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  steps: PathV4Step[];
  prompts: readonly PathV4HomiPrompt[];
};

export type PathV4SourceStep = {
  id?: string;
  title?: unknown;
  href?: unknown;
  status?: unknown;
  reasonCode?: unknown;
};

export type PathV4Reading = {
  decisionType?: string;
  verdict: VerdictKey | null;
  stopCode: FoldHardStopCode | null;
  lastMoneyMonths?: number | null;
  steps: readonly PathV4SourceStep[];
};

export function parseV4PathVisualState(
  raw: string | null | undefined,
): V4PathVisualState | null {
  if (!raw) return null;
  return (V4_PATH_VISUAL_STATES as readonly string[]).includes(raw)
    ? (raw as V4PathVisualState)
    : null;
}

function decisionContextLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw in DECISION_TYPE_LABELS) {
    return DECISION_TYPE_LABELS[raw as DecisionType];
  }
  return raw;
}

function asPathStatus(value: unknown): PathStepStatus {
  if (value === "done" || value === "skipped" || value === "pending") return value;
  return "pending";
}

function asReasonCode(value: unknown): PathReasonCode | null {
  if (typeof value !== "string" || value.length === 0) return null;
  switch (value) {
    case "RUNWAY_UNDER_1_MONTH":
    case "DTI_OVER_50":
    case "HOUSING_RATIO_OVER_45":
    case "CREDIT_UNDER_620":
    case "PILLAR_FINANCIAL":
    case "PILLAR_EMOTIONAL":
    case "PILLAR_TIMING":
    case "NEGATIVE_CASHFLOW":
    case "PARTNER_ALIGNMENT":
    case "REASSESS":
    case "MAINTENANCE":
    case "READY_CELEBRATE":
      return value;
    default:
      return null;
  }
}

/** Deep-link Assess / Money only. Never ledger, tools, or invented $. */
export function pathV4StepCta(reasonCode: PathReasonCode | null): PathV4StepCta | null {
  if (!reasonCode) return null;
  switch (reasonCode) {
    case "REASSESS":
    case "MAINTENANCE":
      return { label: "Assess", href: V4_SHELL_ASSESS_HREF };
    case "RUNWAY_UNDER_1_MONTH":
    case "DTI_OVER_50":
    case "NEGATIVE_CASHFLOW":
    case "PILLAR_FINANCIAL":
    case "PILLAR_TIMING":
      return { label: "Open", href: V4_SHELL_MONEY_HREF };
    case "HOUSING_RATIO_OVER_45":
    case "CREDIT_UNDER_620":
    case "PILLAR_EMOTIONAL":
    case "PARTNER_ALIGNMENT":
    case "READY_CELEBRATE":
      return null;
    default: {
      const _exhaustive: never = reasonCode;
      return _exhaustive;
    }
  }
}

export function pathV4DisplayTitle(
  title: string,
  reasonCode: PathReasonCode | null,
  stopCode: FoldHardStopCode | null,
): string {
  const resolved = resolveFoldPathPrimary(
    { title, href: V4_SHELL_PATH_HREF },
    stopCode ?? (reasonCode === "RUNWAY_UNDER_1_MONTH" ? "RUNWAY_UNDER_1_MONTH" : null),
  );
  if (resolved?.title) return resolved.title;
  if (reasonCode === "RUNWAY_UNDER_1_MONTH") return RUNWAY_HARD_STOP_FOLD_TITLE;
  return title;
}

export function pathV4FollowLine(
  reasonCode: PathReasonCode | null,
  hardStopActive: boolean,
  isNext: boolean,
): string {
  if (reasonCode === "REASSESS" || reasonCode === "MAINTENANCE") {
    return PATH_V4_REASSESS_FOLLOW;
  }
  if (hardStopActive && isNext) return PATH_V4_HOLD_FOLLOW;
  if (isNext) return PATH_V4_NEXT_FOLLOW;
  return PATH_V4_NEXT_FOLLOW;
}

export function pathV4HoldMeta(
  stopCode: FoldHardStopCode | null,
  decisionType: string,
  runwayLabel: string,
): string | null {
  const eyebrow = foldHardStopEyebrow(stopCode, decisionType).replace(/\.$/, "");
  const hold = foldHomeHoldSentence(stopCode, decisionType);
  const close = hold ? foldHoldClose(hold) : null;
  const parts = [eyebrow];
  if (runwayLabel && runwayLabel !== "\u2014") parts.push(runwayLabel);
  if (close) parts.push(close);
  return parts.join(" · ");
}

function sourceSteps(steps: readonly PathV4SourceStep[]): PathV4SourceStep[] {
  return steps.slice(0, V4_PATH_MAX_STEPS);
}

function synthesizeHoldSteps(stopCode: FoldHardStopCode, decisionType: string): PathV4SourceStep[] {
  return [
    {
      id: "hold-0",
      title: hardStopPathTitle(stopCode, decisionType),
      href: V4_SHELL_MONEY_HREF,
      status: "pending",
      reasonCode: stopCode,
    },
    {
      id: "hold-reassess",
      title: PATH_V4_REASSESS_TITLE,
      href: V4_SHELL_ASSESS_HREF,
      status: "pending",
      reasonCode: "REASSESS",
    },
  ];
}

function mapSteps(
  steps: readonly PathV4SourceStep[],
  hardStopActive: boolean,
  stopCode: FoldHardStopCode | null,
): PathV4Step[] {
  const pendingIndex = steps.findIndex((step) => asPathStatus(step.status) === "pending");
  return sourceSteps(steps).map((step, index) => {
    const reasonCode = asReasonCode(step.reasonCode);
    const status = asPathStatus(step.status);
    const titleRaw = typeof step.title === "string" ? step.title.trim() : "";
    const title = pathV4DisplayTitle(titleRaw || "Step", reasonCode, stopCode);
    const isNext = pendingIndex === index && status === "pending";
    const cta = status === "pending" ? pathV4StepCta(reasonCode) : null;
    return {
      id: typeof step.id === "string" && step.id ? step.id : `path-step-${index}`,
      title,
      follow: pathV4FollowLine(reasonCode, hardStopActive, isNext),
      cta,
      ctaEmphasis: isNext && cta ? "primary" : "text",
      reasonCode,
      status,
    };
  });
}

function emptyView(decisionContext: string | null): PathV4View {
  return {
    kind: "empty",
    hasAssessment: false,
    hardStopActive: false,
    decisionContext,
    verdictLabel: null,
    holdLead: null,
    holdMeta: null,
    steps: [],
    prompts: PATH_V4_HOMI_PROMPTS,
  };
}

export function buildPathV4View(reading: PathV4Reading | null): PathV4View {
  if (!reading) return emptyView(null);

  const hardStopActive = reading.stopCode != null;
  const decisionType = reading.decisionType ?? "home_buying";
  const decisionContext = decisionContextLabel(reading.decisionType);
  const stored = sourceSteps(reading.steps).filter((step) => {
    const title = typeof step.title === "string" ? step.title.trim() : "";
    return title.length > 0;
  });
  const rawSteps =
    stored.length > 0
      ? stored
      : hardStopActive && reading.stopCode
        ? synthesizeHoldSteps(reading.stopCode, decisionType)
        : [];
  const steps = mapSteps(rawSteps, hardStopActive, reading.stopCode);
  const pending = steps.some((step) => step.status === "pending");
  const kind: PathV4Kind = hardStopActive
    ? "hard-stop"
    : steps.length === 0
      ? "empty"
      : pending
        ? "normal"
        : "complete";

  if (kind === "empty") {
    return { ...emptyView(decisionContext), hasAssessment: true };
  }

  const hold = hardStopActive ? foldHomeHoldSentence(reading.stopCode, decisionType) : null;
  const holdLead = hold ? foldHoldLead(hold) : null;
  const runwayLabel = foldRunwayLabel(reading.lastMoneyMonths);
  const verdictLabel = hardStopActive ? VERDICT_META.NOT_YET.label : null;

  return {
    kind,
    hasAssessment: true,
    hardStopActive,
    decisionContext,
    verdictLabel,
    holdLead,
    holdMeta: hardStopActive ? pathV4HoldMeta(reading.stopCode, decisionType, runwayLabel) : null,
    steps,
    prompts: PATH_V4_HOMI_PROMPTS,
  };
}

export function pathV4ForbidsOnTrackCopy(view: PathV4View): boolean {
  return view.hardStopActive;
}

export function pathV4ForbidsReadyCopy(view: PathV4View): boolean {
  return view.hardStopActive;
}

function fixtureSteps(
  rows: Array<{
    title: string;
    reasonCode: PathReasonCode;
    status?: PathStepStatus;
  }>,
): PathV4SourceStep[] {
  return rows.map((row, index) => ({
    id: `fixture-${index}`,
    title: row.title,
    status: row.status ?? "pending",
    reasonCode: row.reasonCode,
    href: V4_SHELL_PATH_HREF,
  }));
}

/** Preview-only stills. Operator flag still required. Never a public unlock. */
export function pathV4VisualReading(state: V4PathVisualState): PathV4Reading | null {
  switch (state) {
    case "empty":
      return null;
    case "hard-stop":
      return {
        decisionType: "home_buying",
        verdict: "NOT_YET",
        stopCode: "RUNWAY_UNDER_1_MONTH",
        lastMoneyMonths: 0.4,
        steps: fixtureSteps([
          {
            title: RUNWAY_HARD_STOP_FOLD_TITLE,
            reasonCode: "RUNWAY_UNDER_1_MONTH",
          },
          {
            title: PATH_V4_REASSESS_TITLE,
            reasonCode: "REASSESS",
          },
        ]),
      };
    case "normal":
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        lastMoneyMonths: 2.1,
        steps: fixtureSteps([
          {
            title: "Keep the runway above one month.",
            reasonCode: "PILLAR_FINANCIAL",
          },
          {
            title: "Re-check the read after the next pay cycle.",
            reasonCode: "REASSESS",
          },
        ]),
      };
    case "complete":
      return {
        decisionType: "home_buying",
        verdict: "READY",
        stopCode: null,
        lastMoneyMonths: 6,
        steps: fixtureSteps([
          {
            title: "Optional 90-day readiness review",
            reasonCode: "MAINTENANCE",
            status: "done",
          },
        ]),
      };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function pathV4VisualView(state: V4PathVisualState): PathV4View {
  const view = buildPathV4View(pathV4VisualReading(state));
  if (state === "empty") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  return view;
}
