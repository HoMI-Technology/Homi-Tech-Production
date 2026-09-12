/**
 * Home v4 State A view-model.
 *
 * Official score / verdict / hard stops come from AssessmentResult-shaped
 * last-read rows only. Preflight, Simulator, and household sync-score must
 * never mint or display a second score on Shell/Home chrome.
 */

import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";
import { KEY_AREA_STATUS, keyAreaStatus, pillarPct, type KeyAreaStatus } from "@/lib/dashboard/key-areas";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import {
  FOLD_CONNECT_ACCOUNTS_LABEL,
  FOLD_CONNECTIONS_HREF,
  HOME_DENSITY_LENSES,
  MONEY_WAIT_LINE,
  RUNWAY_HARD_STOP_FOLD_TITLE,
  foldHardStopEyebrow,
  foldHomeHoldSentence,
  foldRunwayLabel,
  foldScoreAgeLine,
  resolveFoldPathPrimary,
  type FoldHardStopCode,
  type FoldPathPrimary,
} from "@/lib/dashboard/fold-truth";
import { PILLARS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import { V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";
import { ASK_V4_PROMPTS } from "@/lib/v4/contextual-homi";

export const HOME_V4_PATH_CTA = RUNWAY_HARD_STOP_FOLD_TITLE;
export const HOME_V4_TOOLS_MAX = 4 as const;

/** First-session empty Home — one job, then the page paints. */
export const HOME_V4_EMPTY_HOLD = "Nothing to judge yet." as const;
export const HOME_V4_EMPTY_FOLLOW =
  "Take the assessment. This page becomes the verdict and the one next move." as const;
export const HOME_V4_EMPTY_MONEY_FOLLOW =
  "A readiness read comes first. Connect accounts after, if you want a fuller picture." as const;
export const HOME_V4_MONEY_FOLLOW = "Connect accounts for a fuller picture." as const;
export const HOME_V4_EMPTY_PATH_FOLLOW =
  "Start with Assess. Path fills from that read." as const;

export const HOME_V4_HOMI_PROMPTS = ASK_V4_PROMPTS.default;

export type HomeV4MoneyStatus = "empty" | "disconnected";

export type HomeV4Pillar = {
  id: "financial" | "emotional" | "timing";
  title: string;
  status: KeyAreaStatus;
};

export type HomeV4Tool = {
  id: string;
  href: string;
  title: string;
};

export type HomeV4View = {
  hasAssessment: boolean;
  decisionContext: string | null;
  verdictKey: VerdictKey | null;
  verdictLabel: string | null;
  scorePct: number | null;
  scoreAge: string | null;
  hardStopActive: boolean;
  hardStopEyebrow: string | null;
  holdSentence: string | null;
  runwayLabel: string;
  pathPrimary: FoldPathPrimary | null;
  pillars: HomeV4Pillar[];
  whatChanged: string | null;
  tools: HomeV4Tool[];
  moneyStatus: HomeV4MoneyStatus;
  moneyLine: string;
  connectHref: string;
  connectLabel: string;
};

export type HomeV4Reading = {
  overallScore: number | null;
  scoredAt?: string | null;
  financialScore?: number | null;
  emotionalScore?: number | null;
  timingScore?: number | null;
  verdict: VerdictKey | null;
  stopMessages: string[];
  stopCode: FoldHardStopCode | null;
  stopCodes: readonly FoldHardStopCode[];
  decisionType?: string;
  lastMoney?: LastReadMoneyInputs | null;
  pathPrimary: FoldPathPrimary | null;
  pathSteps?: unknown;
  moneyConnected?: boolean;
};

export function homeV4PathPrimary(
  pathPrimary: FoldPathPrimary | null,
  stopCode: FoldHardStopCode | null,
): FoldPathPrimary | null {
  const resolved = resolveFoldPathPrimary(pathPrimary, stopCode);
  if (stopCode === "RUNWAY_UNDER_1_MONTH") {
    return resolved
      ? { ...resolved, href: V4_SHELL_PATH_HREF }
      : { href: V4_SHELL_PATH_HREF, title: HOME_V4_PATH_CTA };
  }
  return resolved ? { ...resolved, href: V4_SHELL_PATH_HREF } : null;
}

function decisionContextLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw in DECISION_TYPE_LABELS) {
    return DECISION_TYPE_LABELS[raw as DecisionType];
  }
  return raw;
}

function pillarsFromReading(reading: HomeV4Reading, hardStopActive: boolean): HomeV4Pillar[] {
  const scores = {
    financial: reading.financialScore,
    emotional: reading.emotionalScore,
    timing: reading.timingScore,
  } as const;
  return PILLARS.map((pillar) => ({
    id: pillar.key,
    title: pillar.name,
    status: keyAreaStatus(pillarPct(scores[pillar.key], pillar.max), hardStopActive),
  }));
}

const EMPTY_TOOLS: HomeV4Tool[] = HOME_DENSITY_LENSES.slice(0, HOME_V4_TOOLS_MAX).map((lens) => ({
  id: lens.id,
  href: lens.href,
  title: lens.title,
}));

export function buildHomeV4View(reading: HomeV4Reading | null): HomeV4View {
  if (!reading) {
    return {
      hasAssessment: false,
      decisionContext: null,
      verdictKey: null,
      verdictLabel: null,
      scorePct: null,
      scoreAge: null,
      hardStopActive: false,
      hardStopEyebrow: null,
      holdSentence: null,
      runwayLabel: foldRunwayLabel(null),
      pathPrimary: null,
      pillars: [],
      whatChanged: null,
      tools: [],
      moneyStatus: "empty",
      moneyLine: MONEY_WAIT_LINE,
      connectHref: FOLD_CONNECTIONS_HREF,
      connectLabel: FOLD_CONNECT_ACCOUNTS_LABEL,
    };
  }

  const scorePct =
    reading.overallScore != null && Number.isFinite(reading.overallScore)
      ? Math.round(reading.overallScore)
      : null;
  const hardStopActive = reading.stopMessages.length > 0;
  const pathPrimary = homeV4PathPrimary(reading.pathPrimary, reading.stopCode);
  const scoreAge = foldScoreAgeLine(scorePct, reading.scoredAt);

  return {
    hasAssessment: true,
    decisionContext: decisionContextLabel(reading.decisionType),
    verdictKey: reading.verdict,
    verdictLabel: reading.verdict ? VERDICT_META[reading.verdict].label : null,
    scorePct,
    scoreAge,
    hardStopActive,
    hardStopEyebrow: hardStopActive
      ? foldHardStopEyebrow(reading.stopCode, reading.decisionType)
      : null,
    holdSentence: hardStopActive
      ? foldHomeHoldSentence(reading.stopCode, reading.decisionType)
      : null,
    runwayLabel: foldRunwayLabel(reading.lastMoney?.emergencyFundMonths),
    pathPrimary,
    pillars: pillarsFromReading(reading, hardStopActive),
    whatChanged: scoreAge,
    tools: EMPTY_TOOLS,
    moneyStatus: reading.moneyConnected ? "disconnected" : "empty",
    moneyLine: MONEY_WAIT_LINE,
    connectHref: FOLD_CONNECTIONS_HREF,
    connectLabel: FOLD_CONNECT_ACCOUNTS_LABEL,
  };
}

const LEGAL_KEY_STATUSES = new Set<string>([
  KEY_AREA_STATUS.needsWork,
  KEY_AREA_STATUS.strong,
  KEY_AREA_STATUS.notAssessed,
]);

/** Hard-stop State A must never paint On track / READY as a pillar status. */
export function homeV4KeyStatusesLegal(view: HomeV4View): boolean {
  return view.pillars.every((pillar) => LEGAL_KEY_STATUSES.has(pillar.status));
}

export function homeV4ForbidsOnTrackCopy(view: HomeV4View): boolean {
  return view.hardStopActive;
}

/** Finance GATE: callers must not pass a second score channel. */
export function assertAssessmentResultOnly(source: "assessment_result"): "assessment_result" {
  return source;
}
