/**
 * Learn v4 — quiet entry. Empty or live public-guide catalog.
 * Never invent curriculum SKUs. Never write AssessmentResult.
 */

import { V4_ASSESS_DECISION_LABEL, V4_ASK_PLACEHOLDER_LEARN } from "@/lib/v4/assessment-walk";
import { VERDICT_META } from "@/lib/brand";
import { V4_SHELL_HOME_HREF, V4_SHELL_LEARN_HREF } from "@/lib/layout/v4-shell";
import {
  SYSTEM_V4_FIXTURE_DECISION,
  SYSTEM_V4_HOLD_META_LINE,
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

export const V4_LEARN_HREF = V4_SHELL_LEARN_HREF;
export const V4_LEARN_GUIDES_HREF = "/guides" as const;
export const V4_ASK_PLACEHOLDER_LEARN_FIELD = V4_ASK_PLACEHOLDER_LEARN;
export const LEARN_V4_EMPTY_TITLE = "No lessons in-app." as const;
export const LEARN_V4_EMPTY_BODY =
  "Public guides stay on the live site. This rail is an honest empty — never invent curriculum SKUs." as const;
export const LEARN_V4_LIVE_TITLE = "Public guides." as const;
export const LEARN_V4_LIVE_BODY =
  "Live catalog from /guides. No invented courses or SKUs on this rail." as const;
export const LEARN_V4_OPEN_GUIDES = "Open public guides" as const;
export const LEARN_V4_HOLD_LEAD = "Hold first — Learn stays a catalog." as const;
export const LEARN_V4_HARD_STOP_BODY =
  "Guides stay educational. Path still leads — never On track theater." as const;
export const LEARN_V4_LIVE_MAX = 3 as const;

export const V4_LEARN_VISUAL_STATES = ["empty", "live", "hard-stop"] as const;
export type V4LearnVisualState = (typeof V4_LEARN_VISUAL_STATES)[number];
export type LearnV4Kind = "empty" | "live" | "hard-stop";

export type LearnV4Guide = {
  slug: string;
  title: string;
  href: string;
};

/** Real public-guide slugs — not invented SKUs. */
export const LEARN_V4_LIVE_GUIDES: readonly LearnV4Guide[] = [
  {
    slug: "afford-is-not-ready",
    title: "Afford Is Not the Same as Ready",
    href: "/guides/afford-is-not-ready",
  },
  {
    slug: "am-i-ready-to-buy-a-house",
    title: "Am I Ready to Buy a House? The Full Readiness Check",
    href: "/guides/am-i-ready-to-buy-a-house",
  },
  {
    slug: "emergency-runway-before-everything",
    title: "Emergency Runway Before Everything",
    href: "/guides/emergency-runway-before-everything",
  },
] as const;

export type LearnV4View = {
  kind: LearnV4Kind;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  cta: SystemV4Cta;
  guides: LearnV4Guide[];
  prompts: readonly SystemV4HomiPrompt[];
  askPlaceholder: typeof V4_ASK_PLACEHOLDER_LEARN;
};

export const LEARN_V4_PROMPTS = {
  empty: [
    { label: "What is Learn here?", href: V4_LEARN_GUIDES_HREF },
    { label: "Open public guides", href: V4_LEARN_GUIDES_HREF },
    { label: "Why no invented courses", href: V4_SHELL_HOME_HREF },
  ],
  live: [
    { label: "What is Learn here?", href: V4_LEARN_GUIDES_HREF },
    { label: "Open public guides", href: V4_LEARN_GUIDES_HREF },
    { label: "Why no invented courses", href: V4_SHELL_HOME_HREF },
  ],
  "hard-stop": [
    { label: "What is Learn here?", href: V4_LEARN_GUIDES_HREF },
    { label: "Open Path from here", href: SYSTEM_V4_PATH_HREF },
    { label: "Why no invented courses", href: V4_SHELL_HOME_HREF },
  ],
} as const satisfies Record<LearnV4Kind, readonly SystemV4HomiPrompt[]>;

export function parseV4LearnVisualState(
  raw: string | null | undefined,
): V4LearnVisualState | null {
  return parseV4VisualState(raw, V4_LEARN_VISUAL_STATES);
}

function liveGuides(): LearnV4Guide[] {
  return LEARN_V4_LIVE_GUIDES.slice(0, LEARN_V4_LIVE_MAX).map((guide) => ({ ...guide }));
}

export function buildLearnV4View(
  reading: SystemV4LastRead | null,
  options?: { liveCatalog?: boolean },
): LearnV4View {
  const hold = systemV4Hold(reading);
  const hardStopActive = hold.hardStopActive;
  const liveCatalog = options?.liveCatalog === true;
  const kind: LearnV4Kind = hardStopActive ? "hard-stop" : liveCatalog ? "live" : "empty";
  return {
    kind,
    hardStopActive,
    decisionContext: hold.decisionContext,
    verdictLabel: hardStopActive ? VERDICT_META.NOT_YET.label : null,
    holdLead: hardStopActive ? LEARN_V4_HOLD_LEAD : null,
    holdMeta: hardStopActive ? SYSTEM_V4_HOLD_META_LINE : null,
    title: hardStopActive
      ? LEARN_V4_HOLD_LEAD
      : liveCatalog
        ? LEARN_V4_LIVE_TITLE
        : LEARN_V4_EMPTY_TITLE,
    body: hardStopActive
      ? LEARN_V4_HARD_STOP_BODY
      : liveCatalog
        ? LEARN_V4_LIVE_BODY
        : LEARN_V4_EMPTY_BODY,
    cta: { label: LEARN_V4_OPEN_GUIDES, href: V4_LEARN_GUIDES_HREF },
    guides: liveCatalog ? liveGuides() : [],
    prompts: LEARN_V4_PROMPTS[kind].slice(0, SYSTEM_V4_PROMPTS_MAX),
    askPlaceholder: V4_ASK_PLACEHOLDER_BY_SURFACE.learn,
  };
}

export function learnV4VisualReading(state: V4LearnVisualState): SystemV4LastRead | null {
  switch (state) {
    case "empty":
    case "live":
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

export function learnV4VisualView(state: V4LearnVisualState): LearnV4View {
  const view = buildLearnV4View(learnV4VisualReading(state), { liveCatalog: state === "live" });
  if (state === "empty" || state === "live") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  return view;
}

export function learnV4ForbidsOnTrackCopy(view: LearnV4View): boolean {
  return systemV4ForbidsOnTrackCopy(view.hardStopActive);
}

export function learnV4ForbidsReadyCopy(view: LearnV4View): boolean {
  return systemV4ForbidsReadyCopy(view.hardStopActive);
}

export function learnV4ForbidsInventedDollars(view: LearnV4View): boolean {
  return systemV4ForbidsInventedDollars(view);
}
