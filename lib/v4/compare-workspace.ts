/**
 * Compare v4 workspace — Shell v4 chrome over educational scenarios.
 * Reuses lib/readiness/scenario*.ts + lib/tools/scenarios.ts.
 * Empty or live SSOT only. No invented $. No second official score.
 * AssessmentResult is read for hard-stop chrome; Compare never writes it.
 */

import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  foldHardStopEyebrow,
  foldHoldLead,
  foldHomeHoldSentence,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import { V4_SHELL_PATH_HREF, V4_SHELL_COMPARE_HREF } from "@/lib/layout/v4-shell";
import type { ScenarioKey } from "@/lib/decisions/simulate";
import { SCENARIO_DISCLAIMER } from "@/lib/readiness/scenario";
import type { ToolScenario } from "@/lib/tools/scenarios";
import {
  V4_ASSESS_DECISION_LABEL,
  V4_ASK_PLACEHOLDER_COMPARE,
  type V4AssessHomiPrompt,
} from "@/lib/v4/assessment-walk";
import { ASK_V4_COMPARE_PROMPTS } from "@/lib/v4/contextual-homi";

export const V4_COMPARE_HREF = V4_SHELL_COMPARE_HREF;
export const V4_COMPARE_PATH_HREF = V4_SHELL_PATH_HREF;
export const V4_ASK_PLACEHOLDER_COMPARE_FIELD = V4_ASK_PLACEHOLDER_COMPARE;
export const COMPARE_V4_MAX_CARDS = 4 as const;
export const COMPARE_V4_ENGINE_DISCLAIMER = SCENARIO_DISCLAIMER;

export const COMPARE_V4_EMPTY_TITLE = "No scenarios yet." as const;
export const COMPARE_V4_EMPTY_BODY =
  "Compare educational what-ifs from approved templates. We never invent results or a second score." as const;
export const COMPARE_V4_HARD_STOP_EMPTY_BODY =
  "You can still explore educational templates — they do not clear the hard stop. Path still leads." as const;
export const COMPARE_V4_HOLD_CLOSE =
  "Compare stays educational-only. No On track theater." as const;
export const COMPARE_V4_START_LABEL = "Start a comparison" as const;
export const COMPARE_V4_NORMAL_TITLE = "Compare approaches without a second score." as const;
export const COMPARE_V4_NORMAL_SUB =
  "Approved templates only · illustrative · never an official HōMI verdict." as const;
export const COMPARE_V4_EDU_BADGE = "Educational" as const;
export const COMPARE_V4_CARD_BADGE = "Educational · not a score" as const;
export const COMPARE_V4_AGE_UNKNOWN = "Age unknown" as const;
export const COMPARE_V4_STALE_NOTE = "This comparison is older than a quiet refresh." as const;
export const COMPARE_V4_ERROR_TITLE = "Comparisons need attention." as const;
export const COMPARE_V4_ERROR_BODY =
  "We could not load saved comparisons. We never invent results or a second score." as const;
export const COMPARE_V4_STALE_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

/** Engine labels — must stay 1:1 with lib/decisions/simulate SCENARIO_LABELS. */
export const COMPARE_V4_ENGINE_LABELS: Record<ScenarioKey, string> = {
  "wait-12": "Wait 12 months",
  "wait-24": "Wait 24 months",
  "buy-now": "Buy the home",
};

const COMPARE_V4_ENGINE_FOLLOW: Record<ScenarioKey, string> = {
  "wait-12": "More runway before offers",
  "wait-24": "More time to fund depth",
  "buy-now": "Trade timing vs fund depth",
};

export const COMPARE_V4_APPROVED_KEYS: readonly ScenarioKey[] = [
  "wait-12",
  "buy-now",
  "wait-24",
];

/** Preview-only stills. Operator flag still required. Never a public unlock. */
export const V4_COMPARE_VISUAL_STATES = [
  "empty",
  "hard-stop",
  "normal",
  "stale",
  "error",
] as const;
export type V4CompareVisualState = (typeof V4_COMPARE_VISUAL_STATES)[number];

export type CompareV4Kind = V4CompareVisualState;

export type CompareV4HomiPrompt = V4AssessHomiPrompt;

export const COMPARE_V4_HOMI_PROMPTS: readonly CompareV4HomiPrompt[] = ASK_V4_COMPARE_PROMPTS;

export type CompareV4Card = {
  id: string;
  title: string;
  follow: string;
  badge: typeof COMPARE_V4_CARD_BADGE;
  href: typeof V4_SHELL_PATH_HREF;
  ctaEmphasis: "primary" | "text";
  liveAmountLabel: string | null;
};

export type CompareV4View = {
  kind: CompareV4Kind;
  hasLiveCards: boolean;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  emptyTitle: string;
  emptyBody: string;
  startLabel: typeof COMPARE_V4_START_LABEL;
  listTitle: string;
  listSub: string;
  ageLabel: string | null;
  eduBadge: typeof COMPARE_V4_EDU_BADGE | null;
  cards: CompareV4Card[];
  catalog: CompareV4Card[];
  honestyLine: string | null;
  isCraftFixture: boolean;
  prompts: readonly CompareV4HomiPrompt[];
};

export type CompareV4SourceCard = {
  id?: string;
  name?: string | null;
  lensId?: string | null;
  savedAt?: string | null;
  key?: ScenarioKey | string | null;
};

export type CompareV4Reading = {
  decisionType?: string;
  verdict: VerdictKey | null;
  stopCode: FoldHardStopCode | null;
  lastMoneyMonths?: number | null;
  saved: readonly CompareV4SourceCard[];
  loadError?: boolean;
  isCraftFixture?: boolean;
  nowMs?: number;
};

export function parseV4CompareVisualState(
  raw: string | null | undefined,
): V4CompareVisualState | null {
  if (!raw) return null;
  return (V4_COMPARE_VISUAL_STATES as readonly string[]).includes(raw)
    ? (raw as V4CompareVisualState)
    : null;
}

function decisionContextLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw in DECISION_TYPE_LABELS) {
    return DECISION_TYPE_LABELS[raw as DecisionType];
  }
  return raw;
}

function asScenarioKey(value: unknown): ScenarioKey | null {
  if (value === "buy-now" || value === "wait-12" || value === "wait-24") return value;
  return null;
}

export function compareV4ApprovedCard(
  key: ScenarioKey,
  index: number,
): CompareV4Card {
  return {
    id: `approved-${key}`,
    title: COMPARE_V4_ENGINE_LABELS[key],
    follow: COMPARE_V4_ENGINE_FOLLOW[key],
    badge: COMPARE_V4_CARD_BADGE,
    href: V4_SHELL_PATH_HREF,
    ctaEmphasis: index === 0 ? "primary" : "text",
    liveAmountLabel: null,
  };
}

export function compareV4ApprovedCatalog(
  keys: readonly ScenarioKey[] = COMPARE_V4_APPROVED_KEYS,
): CompareV4Card[] {
  return keys.slice(0, COMPARE_V4_MAX_CARDS).map((key, index) => compareV4ApprovedCard(key, index));
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

/** Quiet calendar age. Never a verbose fixture line. */
export function compareV4AgeLabel(
  iso: string | null | undefined,
): string | null {
  if (!iso) return null;
  const then = new Date(iso);
  if (!Number.isFinite(then.getTime())) return COMPARE_V4_AGE_UNKNOWN;
  const month = FOLD_AGE_SHORT_MONTHS[then.getUTCMonth()];
  const day = then.getUTCDate();
  if (!month || !Number.isFinite(day) || day < 1) return COMPARE_V4_AGE_UNKNOWN;
  return `Last run ${month} ${day}`;
}

export function compareV4HoldMeta(
  stopCode: FoldHardStopCode | null,
  decisionType: string,
): string | null {
  if (!stopCode) return null;
  const eyebrow = foldHardStopEyebrow(stopCode, decisionType).replace(/\.$/, "");
  return `${eyebrow} · ${COMPARE_V4_HOLD_CLOSE}`;
}

function mapSavedCards(rows: readonly CompareV4SourceCard[]): CompareV4Card[] {
  const cards: CompareV4Card[] = [];
  for (const [index, row] of rows.entries()) {
    if (cards.length >= COMPARE_V4_MAX_CARDS) break;
    const key = asScenarioKey(row.key);
    const name = typeof row.name === "string" ? row.name.trim() : "";
    const title = name || (key ? COMPARE_V4_ENGINE_LABELS[key] : "");
    if (!title) continue;
    cards.push({
      id: typeof row.id === "string" && row.id ? row.id : `compare-saved-${index}`,
      title,
      follow: key ? COMPARE_V4_ENGINE_FOLLOW[key] : "Educational template · illustrative",
      badge: COMPARE_V4_CARD_BADGE,
      href: V4_SHELL_PATH_HREF,
      ctaEmphasis: cards.length === 0 ? "primary" : "text",
      liveAmountLabel: null,
    });
  }
  return cards;
}

export function compareV4CardsFromToolScenarios(
  rows: readonly Pick<ToolScenario, "id" | "name" | "lensId" | "savedAt">[],
): CompareV4SourceCard[] {
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    lensId: row.lensId,
    savedAt: row.savedAt,
  }));
}

function latestSavedIso(rows: readonly CompareV4SourceCard[]): string | null {
  let latest: number | null = null;
  let iso: string | null = null;
  for (const row of rows) {
    if (!row.savedAt) continue;
    const ms = new Date(row.savedAt).getTime();
    if (!Number.isFinite(ms)) continue;
    if (latest == null || ms > latest) {
      latest = ms;
      iso = row.savedAt;
    }
  }
  return iso;
}

function emptyView(decisionContext: string | null, hardStopActive: boolean): CompareV4View {
  return {
    kind: hardStopActive ? "hard-stop" : "empty",
    hasLiveCards: false,
    hardStopActive,
    decisionContext,
    verdictLabel: null,
    holdLead: null,
    holdMeta: null,
    emptyTitle: COMPARE_V4_EMPTY_TITLE,
    emptyBody: hardStopActive ? COMPARE_V4_HARD_STOP_EMPTY_BODY : COMPARE_V4_EMPTY_BODY,
    startLabel: COMPARE_V4_START_LABEL,
    listTitle: COMPARE_V4_NORMAL_TITLE,
    listSub: COMPARE_V4_NORMAL_SUB,
    ageLabel: null,
    eduBadge: null,
    cards: [],
    catalog: compareV4ApprovedCatalog(),
    honestyLine: null,
    isCraftFixture: false,
    prompts: COMPARE_V4_HOMI_PROMPTS,
  };
}

export function buildCompareV4View(reading: CompareV4Reading | null): CompareV4View {
  if (!reading) return emptyView(null, false);

  const decisionType = reading.decisionType ?? "home_buying";
  const decisionContext = decisionContextLabel(reading.decisionType);
  const hardStopActive = reading.stopCode != null;
  const nowMs = reading.nowMs ?? Date.now();
  const saved = reading.saved ?? [];
  const mapped = mapSavedCards(saved);
  const hasLiveCards = mapped.length > 0;
  const syncIso = latestSavedIso(saved);
  const ageLabel = hasLiveCards ? compareV4AgeLabel(syncIso) ?? COMPARE_V4_AGE_UNKNOWN : null;
  const stale =
    hasLiveCards &&
    syncIso != null &&
    Number.isFinite(new Date(syncIso).getTime()) &&
    nowMs - new Date(syncIso).getTime() >= COMPARE_V4_STALE_AFTER_MS;

  const hold = hardStopActive ? foldHomeHoldSentence(reading.stopCode, decisionType) : null;
  const holdLead = hold ? foldHoldLead(hold) : null;
  const verdictLabel = hardStopActive ? VERDICT_META.NOT_YET.label : null;
  const holdMeta = hardStopActive ? compareV4HoldMeta(reading.stopCode, decisionType) : null;

  if (reading.loadError && !hasLiveCards) {
    return {
      ...emptyView(decisionContext, hardStopActive),
      kind: "error",
      verdictLabel,
      holdLead,
      holdMeta,
      emptyTitle: COMPARE_V4_ERROR_TITLE,
      emptyBody: COMPARE_V4_ERROR_BODY,
      honestyLine: COMPARE_V4_ERROR_BODY,
    };
  }

  if (!hasLiveCards) {
    return {
      ...emptyView(decisionContext, hardStopActive),
      verdictLabel,
      holdLead,
      holdMeta,
    };
  }

  let honestyLine: string | null = null;
  if (stale) honestyLine = COMPARE_V4_STALE_NOTE;
  else if (reading.loadError) honestyLine = COMPARE_V4_ERROR_BODY;

  return {
    kind: hardStopActive ? "hard-stop" : stale ? "stale" : "normal",
    hasLiveCards: true,
    hardStopActive,
    decisionContext,
    verdictLabel,
    holdLead,
    holdMeta,
    emptyTitle: COMPARE_V4_EMPTY_TITLE,
    emptyBody: hardStopActive ? COMPARE_V4_HARD_STOP_EMPTY_BODY : COMPARE_V4_EMPTY_BODY,
    startLabel: COMPARE_V4_START_LABEL,
    listTitle: COMPARE_V4_NORMAL_TITLE,
    listSub: COMPARE_V4_NORMAL_SUB,
    ageLabel,
    eduBadge: COMPARE_V4_EDU_BADGE,
    cards: mapped,
    catalog: compareV4ApprovedCatalog(),
    honestyLine,
    isCraftFixture: reading.isCraftFixture === true,
    prompts: COMPARE_V4_HOMI_PROMPTS,
  };
}

export function compareV4ForbidsOnTrackCopy(view: CompareV4View): boolean {
  return view.hardStopActive;
}

export function compareV4ForbidsReadyCopy(view: CompareV4View): boolean {
  return view.hardStopActive;
}

export function compareV4ForbidsInventedDollars(view: CompareV4View): boolean {
  if (view.cards.some((card) => card.liveAmountLabel != null)) return false;
  return true;
}

export function compareV4ForbidsSecondScore(view: CompareV4View): boolean {
  return view.cards.every((card) => card.liveAmountLabel == null);
}

const FIXTURE_NOW_MS = Date.parse("2026-09-11T12:00:00.000Z");
const FIXTURE_LAST_RUN = "2026-08-29T12:00:00.000Z";
const FIXTURE_STALE_RUN = "2026-07-01T12:00:00.000Z";

function fixtureApprovedSaved(keys: readonly ScenarioKey[], savedAt: string): CompareV4SourceCard[] {
  return keys.map((key) => ({
    id: `fixture-${key}`,
    name: COMPARE_V4_ENGINE_LABELS[key],
    key,
    savedAt,
  }));
}

/** Preview-only stills. Never a public unlock. Craft $ never used as Production invent. */
export function compareV4VisualReading(state: V4CompareVisualState): CompareV4Reading | null {
  switch (state) {
    case "empty":
      return null;
    case "hard-stop":
      return {
        decisionType: "home_buying",
        verdict: "NOT_YET",
        stopCode: "RUNWAY_UNDER_1_MONTH",
        lastMoneyMonths: 0.4,
        saved: [],
        nowMs: FIXTURE_NOW_MS,
      };
    case "normal":
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        lastMoneyMonths: 2.1,
        saved: fixtureApprovedSaved(["wait-12", "buy-now"], FIXTURE_LAST_RUN),
        isCraftFixture: true,
        nowMs: FIXTURE_NOW_MS,
      };
    case "stale":
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        lastMoneyMonths: 2.1,
        saved: fixtureApprovedSaved(["wait-12", "buy-now"], FIXTURE_STALE_RUN),
        isCraftFixture: true,
        nowMs: FIXTURE_NOW_MS,
      };
    case "error":
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        lastMoneyMonths: 2.1,
        saved: [],
        loadError: true,
        nowMs: FIXTURE_NOW_MS,
      };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function compareV4VisualView(state: V4CompareVisualState): CompareV4View {
  const view = buildCompareV4View(compareV4VisualReading(state));
  if (state === "empty") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  return view;
}
