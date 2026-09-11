/**
 * Tools v4 hub — ten-hub REUSE. Empty or live catalog.
 * Never invent a score tile or a new lens. Never write AssessmentResult.
 */

import { V4_ASSESS_DECISION_LABEL, V4_ASK_PLACEHOLDER_TOOLS } from "@/lib/v4/assessment-walk";
import {
  SYSTEM_V4_FIXTURE_DECISION,
  SYSTEM_V4_HOLD_META_LINE,
  SYSTEM_V4_MONEY_HREF,
  SYSTEM_V4_PATH_HREF,
  SYSTEM_V4_PROMPTS_MAX,
  V4_ASK_PLACEHOLDER_BY_SURFACE,
  parseV4VisualState,
  systemV4ForbidsInventedDollars,
  systemV4ForbidsOnTrackCopy,
  systemV4ForbidsReadyCopy,
  systemV4Hold,
  type SystemV4Cta,
  type SystemV4HomiPrompt,
  type SystemV4LastRead,
} from "@/lib/v4/system-surfaces";
import { hubLenses } from "@/lib/tools/registry";
import { VERDICT_META } from "@/lib/brand";
import { V4_SHELL_HOME_HREF, V4_SHELL_TOOLS_HREF } from "@/lib/layout/v4-shell";

export const V4_TOOLS_HREF = V4_SHELL_TOOLS_HREF;
export const V4_ASK_PLACEHOLDER_TOOLS_FIELD = V4_ASK_PLACEHOLDER_TOOLS;
export const TOOLS_V4_EMPTY_TITLE = "No tools open." as const;
export const TOOLS_V4_EMPTY_BODY =
  "Pick an approved lens. Hub REUSE — never invent a score tile." as const;
export const TOOLS_V4_CATALOG_TITLE = "Approved tools." as const;
export const TOOLS_V4_CATALOG_BODY =
  "Ten quiet lenses. Educational estimates — they do not write your score or ledger." as const;
export const TOOLS_V4_BROWSE = "Browse tools" as const;
export const TOOLS_V4_OPEN_PATH = "Open Path" as const;
export const TOOLS_V4_OPEN_LENS = "Open lens" as const;
export const TOOLS_V4_HARD_STOP_BODY =
  "Approved lenses stay educational. Path still leads — never On track theater." as const;
export const TOOLS_V4_HOLD_LEAD = "Hold first — tools stay educational." as const;

export const V4_TOOLS_VISUAL_STATES = ["empty", "catalog", "hard-stop"] as const;
export type V4ToolsVisualState = (typeof V4_TOOLS_VISUAL_STATES)[number];
export type ToolsV4Kind = "empty" | "catalog" | "hard-stop";

export type ToolsV4Lens = {
  id: string;
  name: string;
  desc: string;
  href: string;
};

export type ToolsV4View = {
  kind: ToolsV4Kind;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  cta: SystemV4Cta | null;
  lenses: ToolsV4Lens[];
  prompts: readonly SystemV4HomiPrompt[];
  askPlaceholder: typeof V4_ASK_PLACEHOLDER_TOOLS;
};

export const TOOLS_V4_PROMPTS = {
  empty: [
    { label: "What are approved tools?", href: V4_SHELL_TOOLS_HREF },
    { label: "Why isn't this a score?", href: V4_SHELL_HOME_HREF },
    { label: "Open Money if needed", href: SYSTEM_V4_MONEY_HREF },
  ],
  catalog: [
    { label: "What are approved tools?", href: V4_SHELL_TOOLS_HREF },
    { label: "Why isn't this a score?", href: V4_SHELL_HOME_HREF },
    { label: "Open Money if needed", href: SYSTEM_V4_MONEY_HREF },
  ],
  "hard-stop": [
    { label: "What are approved tools?", href: V4_SHELL_TOOLS_HREF },
    { label: "Why isn't this a score?", href: V4_SHELL_HOME_HREF },
    { label: "Open Path from here", href: SYSTEM_V4_PATH_HREF },
  ],
} as const satisfies Record<ToolsV4Kind, readonly SystemV4HomiPrompt[]>;

export function parseV4ToolsVisualState(
  raw: string | null | undefined,
): V4ToolsVisualState | null {
  return parseV4VisualState(raw, V4_TOOLS_VISUAL_STATES);
}

function mapHubLenses(): ToolsV4Lens[] {
  return hubLenses().map((lens) => ({
    id: lens.id,
    name: lens.name,
    desc: lens.desc,
    href: lens.path,
  }));
}

export function buildToolsV4View(
  reading: SystemV4LastRead | null,
  options?: { catalogOpen?: boolean },
): ToolsV4View {
  const hold = systemV4Hold(reading);
  const hardStopActive = hold.hardStopActive;
  const catalogOpen = options?.catalogOpen === true;
  const lenses = mapHubLenses();
  const kind: ToolsV4Kind = hardStopActive ? "hard-stop" : catalogOpen ? "catalog" : "empty";
  return {
    kind,
    hardStopActive,
    decisionContext: hold.decisionContext,
    verdictLabel: hardStopActive ? VERDICT_META.NOT_YET.label : null,
    holdLead: hardStopActive ? TOOLS_V4_HOLD_LEAD : null,
    holdMeta: hardStopActive ? SYSTEM_V4_HOLD_META_LINE : null,
    title: hardStopActive
      ? TOOLS_V4_HOLD_LEAD
      : catalogOpen
        ? TOOLS_V4_CATALOG_TITLE
        : TOOLS_V4_EMPTY_TITLE,
    body: hardStopActive
      ? TOOLS_V4_HARD_STOP_BODY
      : catalogOpen
        ? TOOLS_V4_CATALOG_BODY
        : TOOLS_V4_EMPTY_BODY,
    cta: hardStopActive
      ? { label: TOOLS_V4_OPEN_PATH, href: SYSTEM_V4_PATH_HREF }
      : catalogOpen
        ? null
        : { label: TOOLS_V4_BROWSE, href: V4_SHELL_TOOLS_HREF },
    lenses,
    prompts: TOOLS_V4_PROMPTS[kind].slice(0, SYSTEM_V4_PROMPTS_MAX),
    askPlaceholder: V4_ASK_PLACEHOLDER_BY_SURFACE.tools,
  };
}

export function toolsV4VisualReading(state: V4ToolsVisualState): SystemV4LastRead | null {
  switch (state) {
    case "empty":
    case "catalog":
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

export function toolsV4VisualView(state: V4ToolsVisualState): ToolsV4View {
  const view = buildToolsV4View(toolsV4VisualReading(state), { catalogOpen: state === "catalog" });
  if (state === "empty" || state === "catalog") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  return view;
}

export function toolsV4ForbidsOnTrackCopy(view: ToolsV4View): boolean {
  return systemV4ForbidsOnTrackCopy(view.hardStopActive);
}

export function toolsV4ForbidsReadyCopy(view: ToolsV4View): boolean {
  return systemV4ForbidsReadyCopy(view.hardStopActive);
}

export function toolsV4ForbidsInventedDollars(view: ToolsV4View): boolean {
  return systemV4ForbidsInventedDollars(view);
}

export function toolsV4ForbidsSecondScore(view: ToolsV4View): boolean {
  return !/\b\d{1,3}\s*\/\s*100\b/.test(JSON.stringify(view));
}
