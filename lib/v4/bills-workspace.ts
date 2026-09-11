/**
 * Bills v4 — quiet ledger workspace. Empty or live SSOT only.
 * Deep-link Money. Never invent due amounts. Never write AssessmentResult.
 */

import { VERDICT_META } from "@/lib/brand";
import { V4_ASSESS_DECISION_LABEL, V4_ASK_PLACEHOLDER_BILLS } from "@/lib/v4/assessment-walk";
import {
  SYSTEM_V4_FIXTURE_DECISION,
  SYSTEM_V4_HOLD_META_LINE,
  SYSTEM_V4_MONEY_HREF,
  SYSTEM_V4_PATH_HREF,
  SYSTEM_V4_PROMPTS_MAX,
  V4_ASK_PLACEHOLDER_BY_SURFACE,
  parseV4VisualState,
  systemV4DecisionContext,
  systemV4ForbidsInventedDollars,
  systemV4ForbidsOnTrackCopy,
  systemV4ForbidsReadyCopy,
  systemV4Hold,
  type SystemV4Cta,
  type SystemV4HomiPrompt,
  type SystemV4LastRead,
} from "@/lib/v4/system-surfaces";

export const V4_BILLS_HREF = "/money/bills" as const;
export const V4_ASK_PLACEHOLDER_BILLS_FIELD = V4_ASK_PLACEHOLDER_BILLS;
export const BILLS_V4_EMPTY_TITLE = "No bills yet." as const;
export const BILLS_V4_EMPTY_BODY =
  "Connect accounts or open Money. Empty honesty — never invent due amounts." as const;
export const BILLS_V4_HOLD_LEAD = "Runway hold — bills stay ledger-only." as const;
export const BILLS_V4_HARD_STOP_BODY =
  "Manage due items without READY theater. Path still leads." as const;
export const BILLS_V4_OPEN_MONEY = "Open Money" as const;
export const BILLS_V4_OPEN_PATH = "Open Path" as const;

export const V4_BILLS_VISUAL_STATES = ["empty", "hard-stop"] as const;
export type V4BillsVisualState = (typeof V4_BILLS_VISUAL_STATES)[number];
export type BillsV4Kind = V4BillsVisualState;

export type BillsV4View = {
  kind: BillsV4Kind;
  hasLiveRows: boolean;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  cta: SystemV4Cta;
  prompts: readonly SystemV4HomiPrompt[];
  askPlaceholder: typeof V4_ASK_PLACEHOLDER_BILLS;
};

export const BILLS_V4_PROMPTS = {
  empty: [
    { label: "How do bills stay honest?", href: SYSTEM_V4_MONEY_HREF },
    { label: "Open Money picture", href: SYSTEM_V4_MONEY_HREF },
    { label: "Why no invent $", href: SYSTEM_V4_MONEY_HREF },
  ],
  "hard-stop": [
    { label: "What does this hold mean for bills?", href: SYSTEM_V4_PATH_HREF },
    { label: "Open Path from here", href: SYSTEM_V4_PATH_HREF },
    { label: "Deep-link Money", href: SYSTEM_V4_MONEY_HREF },
  ],
} as const satisfies Record<BillsV4Kind, readonly SystemV4HomiPrompt[]>;

export function parseV4BillsVisualState(
  raw: string | null | undefined,
): V4BillsVisualState | null {
  return parseV4VisualState(raw, V4_BILLS_VISUAL_STATES);
}

export function buildBillsV4View(reading: SystemV4LastRead | null): BillsV4View {
  const hold = systemV4Hold(reading);
  const hardStopActive = hold.hardStopActive;
  const kind: BillsV4Kind = hardStopActive ? "hard-stop" : "empty";
  return {
    kind,
    hasLiveRows: false,
    hardStopActive,
    decisionContext: hold.decisionContext,
    verdictLabel: hardStopActive ? VERDICT_META.NOT_YET.label : null,
    holdLead: hardStopActive ? BILLS_V4_HOLD_LEAD : null,
    holdMeta: hardStopActive ? SYSTEM_V4_HOLD_META_LINE : null,
    title: hardStopActive ? BILLS_V4_HOLD_LEAD : BILLS_V4_EMPTY_TITLE,
    body: hardStopActive ? BILLS_V4_HARD_STOP_BODY : BILLS_V4_EMPTY_BODY,
    cta: hardStopActive
      ? { label: BILLS_V4_OPEN_PATH, href: SYSTEM_V4_PATH_HREF }
      : { label: BILLS_V4_OPEN_MONEY, href: SYSTEM_V4_MONEY_HREF },
    prompts: BILLS_V4_PROMPTS[kind].slice(0, SYSTEM_V4_PROMPTS_MAX),
    askPlaceholder: V4_ASK_PLACEHOLDER_BY_SURFACE.bills,
  };
}

export function billsV4VisualReading(state: V4BillsVisualState): SystemV4LastRead | null {
  switch (state) {
    case "empty":
      return null;
    case "hard-stop":
      return {
        decisionType: SYSTEM_V4_FIXTURE_DECISION,
        verdict: "NOT_YET",
        stopCode: "RUNWAY_UNDER_1_MONTH",
        lastMoneyMonths: 0.4,
      };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function billsV4VisualView(state: V4BillsVisualState): BillsV4View {
  const view = buildBillsV4View(billsV4VisualReading(state));
  if (state === "empty") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  return view;
}

export function billsV4ForbidsOnTrackCopy(view: BillsV4View): boolean {
  return systemV4ForbidsOnTrackCopy(view.hardStopActive);
}

export function billsV4ForbidsReadyCopy(view: BillsV4View): boolean {
  return systemV4ForbidsReadyCopy(view.hardStopActive);
}

export function billsV4ForbidsInventedDollars(view: BillsV4View): boolean {
  return systemV4ForbidsInventedDollars(view) && !view.hasLiveRows;
}

export { systemV4DecisionContext };
