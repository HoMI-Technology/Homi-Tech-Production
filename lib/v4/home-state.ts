/**
 * Home v4 State A view-model.
 *
 * Official score / verdict / hard stops come from AssessmentResult-shaped
 * last-read rows only. Preflight, Simulator, and household sync-score must
 * never mint or display a second score on Shell/Home chrome.
 */

import { KEY_AREA_STATUS, keyAreasFromReading, type KeyArea } from "@/lib/dashboard/key-areas";
import type { LastReadMoneyInputs } from "@/lib/dashboard/last-read-chrome";
import {
  FOLD_CONNECT_ACCOUNTS_LABEL,
  FOLD_CONNECTIONS_HREF,
  MONEY_WAIT_LINE,
  RUNWAY_HARD_STOP_FOLD_TITLE,
  foldDensityPathTitles,
  foldHardStopEyebrow,
  foldHomeHoldSentence,
  foldRunwayLabel,
  foldScoreAgeLine,
  resolveFoldPathPrimary,
  type FoldHardStopCode,
  type FoldPathPrimary,
} from "@/lib/dashboard/fold-truth";
import type { VerdictKey } from "@/lib/brand";
import { VERDICT_META } from "@/lib/brand";

export const HOME_V4_PATH_CTA = RUNWAY_HARD_STOP_FOLD_TITLE;
export const HOME_V4_WHATS_NEXT_MAX = 5 as const;
export const HOME_V4_KEY_STATUS_MAX = 6 as const;

export const HOME_V4_HOMI_PROMPTS = [
  { label: "How can I build my runway faster?", href: "/path" },
  { label: "What is my next Path step?", href: "/path" },
  { label: "Compare approaches without a second score.", href: "/scenarios" },
] as const;

export type HomeV4MoneyStatus = "empty" | "disconnected";

export type HomeV4View = {
  hasAssessment: boolean;
  verdictKey: VerdictKey | null;
  verdictLabel: string | null;
  scorePct: number | null;
  scoreAge: string | null;
  hardStopActive: boolean;
  hardStopEyebrow: string | null;
  holdSentence: string | null;
  runwayLabel: string;
  pathPrimary: FoldPathPrimary | null;
  keyAreas: KeyArea[];
  whatsNext: string[];
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
    return resolved ?? { href: "/path", title: HOME_V4_PATH_CTA };
  }
  return resolved;
}

export function buildHomeV4View(reading: HomeV4Reading | null): HomeV4View {
  if (!reading) {
    return {
      hasAssessment: false,
      verdictKey: null,
      verdictLabel: null,
      scorePct: null,
      scoreAge: null,
      hardStopActive: false,
      hardStopEyebrow: null,
      holdSentence: null,
      runwayLabel: foldRunwayLabel(null),
      pathPrimary: null,
      keyAreas: [],
      whatsNext: [],
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
  const keyAreas = keyAreasFromReading({
    financialScore: reading.financialScore,
    emotionalScore: reading.emotionalScore,
    timingScore: reading.timingScore,
    runwayMonths: reading.lastMoney?.emergencyFundMonths,
    stopCode: reading.stopCode,
    stopCodes: reading.stopCodes,
    hardStopActive,
  }).slice(0, HOME_V4_KEY_STATUS_MAX);

  return {
    hasAssessment: true,
    verdictKey: reading.verdict,
    verdictLabel: reading.verdict ? VERDICT_META[reading.verdict].label : null,
    scorePct,
    scoreAge: foldScoreAgeLine(scorePct, reading.scoredAt),
    hardStopActive,
    hardStopEyebrow: hardStopActive
      ? foldHardStopEyebrow(reading.stopCode, reading.decisionType)
      : null,
    holdSentence: hardStopActive
      ? foldHomeHoldSentence(reading.stopCode, reading.decisionType)
      : null,
    runwayLabel: foldRunwayLabel(reading.lastMoney?.emergencyFundMonths),
    pathPrimary,
    keyAreas,
    whatsNext: foldDensityPathTitles(reading.pathSteps, HOME_V4_WHATS_NEXT_MAX),
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

/** Hard-stop State A must never paint On track / READY as a key status. */
export function homeV4KeyStatusesLegal(view: HomeV4View): boolean {
  return view.keyAreas.every((area) => LEGAL_KEY_STATUSES.has(area.status));
}

export function homeV4ForbidsOnTrackCopy(view: HomeV4View): boolean {
  return view.hardStopActive;
}

/** Finance GATE: callers must not pass a second score channel. */
export function assertAssessmentResultOnly(source: "assessment_result"): "assessment_result" {
  return source;
}
