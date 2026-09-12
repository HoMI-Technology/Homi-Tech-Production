/**
 * Contextual HōMI v4 — explain + deep-link only.
 * Never mints AssessmentResult / verdict / hard-stop override.
 * Never invents $. No Homie. No live-AI typing. Compass stays shell-only.
 */

import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  foldHardStopEyebrow,
  foldHoldLead,
  foldHomeHoldSentence,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import {
  V4_SHELL_ASSESS_HREF,
  V4_SHELL_COMPARE_HREF,
  V4_SHELL_HOME_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
} from "@/lib/layout/v4-shell";
import {
  V4_ASSESS_DECISION_LABEL,
  V4_ASSESS_HOMI_COMPARE,
  V4_ASK_PLACEHOLDER_READINESS,
  type V4AssessHomiPrompt,
} from "@/lib/v4/assessment-walk";

export const V4_ASK_HREF = "/ask" as const;
export const V4_ASK_PLACEHOLDER_FIELD = V4_ASK_PLACEHOLDER_READINESS;
export const ASK_V4_EDU_BADGE = "Educational" as const;
export const ASK_V4_PROMPTS_MAX = 5 as const;
export const ASK_V4_CARDS_MAX = 2 as const;

export const ASK_V4_EMPTY_TITLE = "No assessment yet." as const;
export const ASK_V4_EMPTY_BODY =
  "Start with Assess. HōMI stays quiet until there's a real read — no fake readiness." as const;
export const ASK_V4_DEFAULT_BODY =
  "One quiet readiness read. HōMI explains and deep-links — never a second score." as const;
export const ASK_V4_HARD_STOP_TITLE = "Hold first. Path still leads." as const;
export const ASK_V4_HARD_STOP_BODY =
  "HōMI can explain the hold and deep-link Path or Assess — never On track theater." as const;
export const ASK_V4_HOLD_CLOSE = "HōMI stays explain-only" as const;
export const ASK_V4_OPEN_PATH = "Open Path" as const;
export const ASK_V4_ASSESS_LABEL = "Assess" as const;
export const ASK_V4_AGE_UNKNOWN = "Age unknown" as const;

/** Explain + deep-link only. Never /learn, /results, ledger, or a second dashboard. */
export const V4_ASK_DEEP_LINKS = [
  V4_SHELL_HOME_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
  V4_SHELL_COMPARE_HREF,
  V4_SHELL_ASSESS_HREF,
] as const;

export type AskV4Kind = "empty" | "hard-stop" | "default";
export type V4AskVisualState = AskV4Kind;

export const V4_ASK_VISUAL_STATES = ["empty", "hard-stop", "default"] as const;

export type AskV4HomiPrompt = V4AssessHomiPrompt;

export const ASK_V4_PROMPTS = {
  empty: [
    { label: "What does Assess cover?", href: V4_SHELL_ASSESS_HREF },
    { label: "Why this page is quiet", href: V4_SHELL_HOME_HREF },
  ],
  "hard-stop": [
    { label: "What does this hard stop mean?", href: V4_SHELL_HOME_HREF },
    { label: "Why the hold outranks the number", href: V4_SHELL_HOME_HREF },
  ],
  default: [
    { label: "What does this readiness mean?", href: V4_SHELL_HOME_HREF },
    { label: "Why Path leads from here", href: V4_SHELL_PATH_HREF },
    { label: "Deep-link Money without a second score", href: V4_SHELL_MONEY_HREF },
  ],
} as const satisfies Record<AskV4Kind, readonly AskV4HomiPrompt[]>;

export const ASK_V4_PATH_PROMPTS: readonly AskV4HomiPrompt[] = [
  { label: "What is my next Path step?", href: V4_SHELL_PATH_HREF },
  { label: "Why does Path stop at seven?", href: V4_SHELL_HOME_HREF },
  V4_ASSESS_HOMI_COMPARE,
];

export const ASK_V4_MONEY_PROMPTS: readonly AskV4HomiPrompt[] = [
  { label: "What does liquid cash mean here?", href: V4_SHELL_HOME_HREF },
  { label: "How does Money relate to Path?", href: V4_SHELL_PATH_HREF },
  V4_ASSESS_HOMI_COMPARE,
];

export const ASK_V4_COMPARE_PROMPTS: readonly AskV4HomiPrompt[] = [
  { label: "What is educational compare?", href: V4_SHELL_HOME_HREF },
  { label: "Why isn't this a second score?", href: V4_SHELL_HOME_HREF },
  V4_ASSESS_HOMI_COMPARE,
];

export type AskV4Card = {
  id: string;
  title: string;
  follow: string;
  badge: typeof ASK_V4_EDU_BADGE;
  href: (typeof V4_ASK_DEEP_LINKS)[number];
};

export type AskV4View = {
  kind: AskV4Kind;
  hasAssessment: boolean;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  ageLabel: string | null;
  eduBadge: typeof ASK_V4_EDU_BADGE | null;
  cards: AskV4Card[];
  cta: { label: string; href: (typeof V4_ASK_DEEP_LINKS)[number] } | null;
  prompts: readonly AskV4HomiPrompt[];
};

export type AskV4Reading = {
  decisionType?: string;
  verdict: VerdictKey | null;
  stopCode: FoldHardStopCode | null;
  scoredAt?: string | null;
};

export function parseV4AskVisualState(
  raw: string | null | undefined,
): V4AskVisualState | null {
  if (!raw) return null;
  return (V4_ASK_VISUAL_STATES as readonly string[]).includes(raw)
    ? (raw as V4AskVisualState)
    : null;
}

export function v4AskDeepLinkAllowed(href: string): boolean {
  return (V4_ASK_DEEP_LINKS as readonly string[]).some(
    (item) => href === item || href.startsWith(`${item}/`),
  );
}

export function askV4PromptsFor(kind: AskV4Kind): readonly AskV4HomiPrompt[] {
  return ASK_V4_PROMPTS[kind];
}

const FOLD_AGE_SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/** Quiet calendar age. Never a score numeral. */
export function askV4AgeLabel(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (!Number.isFinite(then.getTime())) return ASK_V4_AGE_UNKNOWN;
  const month = FOLD_AGE_SHORT_MONTHS[then.getUTCMonth()];
  const day = then.getUTCDate();
  if (!month || !Number.isFinite(day) || day < 1) return ASK_V4_AGE_UNKNOWN;
  return `Assessed ${month} ${day}`;
}

function decisionContextLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw in DECISION_TYPE_LABELS) {
    return DECISION_TYPE_LABELS[raw as DecisionType];
  }
  return raw;
}

export function askV4DefaultTitle(verdict: VerdictKey | null): string {
  switch (verdict) {
    case "READY":
    case "ALMOST_THERE":
    case null:
      return "Path still leads.";
    case "BUILD_FIRST":
      return "Build first. Path still leads.";
    case "NOT_YET":
      return "Hold first. Path still leads.";
    default: {
      const _exhaustive: never = verdict;
      return _exhaustive;
    }
  }
}

export function askV4HoldMeta(
  stopCode: FoldHardStopCode | null,
  decisionType: string,
): string | null {
  if (!stopCode) return null;
  const eyebrow = foldHardStopEyebrow(stopCode, decisionType).replace(/\.$/, "");
  return `${eyebrow} · ${ASK_V4_HOLD_CLOSE}`;
}

function defaultCards(): AskV4Card[] {
  return [
    {
      id: "next-path",
      title: "Next on Path",
      follow: "Open Path — live steps only",
      badge: ASK_V4_EDU_BADGE,
      href: V4_SHELL_PATH_HREF,
    },
    {
      id: "money-picture",
      title: "Money picture",
      follow: "Live SSOT only · never invent balances",
      badge: ASK_V4_EDU_BADGE,
      href: V4_SHELL_MONEY_HREF,
    },
  ].slice(0, ASK_V4_CARDS_MAX);
}

function emptyView(decisionContext: string | null): AskV4View {
  return {
    kind: "empty",
    hasAssessment: false,
    hardStopActive: false,
    decisionContext,
    verdictLabel: null,
    holdLead: null,
    holdMeta: null,
    title: ASK_V4_EMPTY_TITLE,
    body: ASK_V4_EMPTY_BODY,
    ageLabel: null,
    eduBadge: null,
    cards: [],
    cta: { label: ASK_V4_ASSESS_LABEL, href: V4_SHELL_ASSESS_HREF },
    prompts: ASK_V4_PROMPTS.empty,
  };
}

export function buildAskV4View(reading: AskV4Reading | null): AskV4View {
  if (!reading) return emptyView(null);

  const decisionType = reading.decisionType ?? "home_buying";
  const decisionContext = decisionContextLabel(reading.decisionType);
  const hardStopActive = reading.stopCode != null;
  const prompts = askV4PromptsFor(hardStopActive ? "hard-stop" : "default");

  if (hardStopActive) {
    const hold = foldHomeHoldSentence(reading.stopCode, decisionType);
    return {
      kind: "hard-stop",
      hasAssessment: true,
      hardStopActive: true,
      decisionContext,
      verdictLabel: VERDICT_META.NOT_YET.label,
      holdLead: hold ? foldHoldLead(hold) : null,
      holdMeta: askV4HoldMeta(reading.stopCode, decisionType),
      title: ASK_V4_HARD_STOP_TITLE,
      body: ASK_V4_HARD_STOP_BODY,
      ageLabel: askV4AgeLabel(reading.scoredAt),
      eduBadge: null,
      cards: [],
      cta: { label: ASK_V4_OPEN_PATH, href: V4_SHELL_PATH_HREF },
      prompts,
    };
  }

  return {
    kind: "default",
    hasAssessment: true,
    hardStopActive: false,
    decisionContext,
    verdictLabel: null,
    holdLead: null,
    holdMeta: null,
    title: askV4DefaultTitle(reading.verdict),
    body: ASK_V4_DEFAULT_BODY,
    ageLabel: askV4AgeLabel(reading.scoredAt),
    eduBadge: ASK_V4_EDU_BADGE,
    cards: defaultCards(),
    cta: null,
    prompts,
  };
}

function askV4ClaimFields(view: AskV4View): string {
  return [
    view.title,
    view.verdictLabel,
    view.holdLead,
    view.holdMeta,
    view.cta?.label,
    ...view.cards.map((card) => `${card.title} ${card.follow}`),
  ].join(" ");
}

export function askV4ForbidsOnTrackCopy(view: AskV4View): boolean {
  return !/\bOn track\b/.test(askV4ClaimFields(view));
}

export function askV4ForbidsReadyCopy(view: AskV4View): boolean {
  const claims = askV4ClaimFields(view);
  return !/\bREADY\b/.test(claims) && !/you're ready/i.test(claims);
}

export function askV4ForbidsSecondScore(view: AskV4View): boolean {
  const claims = askV4ClaimFields(view);
  return (
    view.verdictLabel !== "READY" &&
    !/\b\d{1,3}\s*\/\s*100\b/.test(view.title) &&
    !/you're ready/i.test(claims)
  );
}

export function askV4ForbidsInventedDollars(view: AskV4View): boolean {
  const blob = JSON.stringify(view);
  return !/\$\d/.test(blob);
}

const FIXTURE_SCORED_AT = "2026-08-29T12:00:00.000Z";

/** Preview-only stills. Never a public unlock. Never a second official score. */
export function askV4VisualReading(state: V4AskVisualState): AskV4Reading | null {
  switch (state) {
    case "empty":
      return null;
    case "hard-stop":
      return {
        decisionType: "home_buying",
        verdict: "NOT_YET",
        stopCode: "RUNWAY_UNDER_1_MONTH",
        scoredAt: FIXTURE_SCORED_AT,
      };
    case "default":
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        scoredAt: FIXTURE_SCORED_AT,
      };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function askV4VisualView(state: V4AskVisualState): AskV4View {
  const view = buildAskV4View(askV4VisualReading(state));
  if (state === "empty") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  return view;
}
