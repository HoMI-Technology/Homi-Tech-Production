/**
 * Shared Shell v4 system-surface law — Bills · Tools · Learn · Accounts · Settings.
 * Empty or live SSOT only. Never invent $. Never write AssessmentResult.
 * Compass stays shell-only. No Homie. Free === Pro. Packet2 / FI v2 / WEIGHTS parked.
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
  V4_SHELL_ACCOUNTS_HREF,
  V4_SHELL_BILLS_HREF,
  V4_SHELL_LEARN_HREF,
  V4_SHELL_MONEY_HREF,
  V4_SHELL_PATH_HREF,
  V4_SHELL_SETTINGS_HREF,
  V4_SHELL_TOOLS_HREF,
} from "@/lib/layout/v4-shell";
import {
  V4_ASK_PLACEHOLDER_ACCOUNTS,
  V4_ASK_PLACEHOLDER_BILLS,
  V4_ASK_PLACEHOLDER_LEARN,
  V4_ASK_PLACEHOLDER_SETTINGS,
  V4_ASK_PLACEHOLDER_TOOLS,
  type V4AssessHomiPrompt,
} from "@/lib/v4/assessment-walk";

export const SYSTEM_V4_HOLD_CLOSE = "Explain-only · never On track" as const;
export const SYSTEM_V4_HOLD_META_LINE = "Hard stop · explain-only · never On track" as const;
export const SYSTEM_V4_LIVE_SSOT = "Live SSOT" as const;
export const SYSTEM_V4_AGE_UNKNOWN = "Age unknown" as const;
export const SYSTEM_V4_PROMPTS_MAX = 3 as const;
export const SYSTEM_V4_BLOCKS_MAX = 3 as const;

export type SystemV4Surface = "bills" | "tools" | "learn" | "accounts" | "settings";

export type SystemV4HomiPrompt = V4AssessHomiPrompt;

export type SystemV4Cta = {
  label: string;
  href: string;
};

export type SystemV4LastRead = {
  decisionType?: string;
  verdict: VerdictKey | null;
  stopCode: FoldHardStopCode | null;
  lastMoneyMonths?: number | null;
  scoredAt?: string | null;
};

export type SystemV4Hold = {
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
};

export const V4_ASK_PLACEHOLDER_BY_SURFACE = {
  bills: V4_ASK_PLACEHOLDER_BILLS,
  tools: V4_ASK_PLACEHOLDER_TOOLS,
  learn: V4_ASK_PLACEHOLDER_LEARN,
  accounts: V4_ASK_PLACEHOLDER_ACCOUNTS,
  settings: V4_ASK_PLACEHOLDER_SETTINGS,
} as const satisfies Record<SystemV4Surface, string>;

export const V4_SYSTEM_HREF_BY_SURFACE: Record<SystemV4Surface, string> = {
  bills: V4_SHELL_BILLS_HREF,
  tools: V4_SHELL_TOOLS_HREF,
  learn: V4_SHELL_LEARN_HREF,
  accounts: V4_SHELL_ACCOUNTS_HREF,
  settings: V4_SHELL_SETTINGS_HREF,
};

export function parseV4VisualState<T extends string>(
  raw: string | null | undefined,
  allowed: readonly T[],
): T | null {
  if (!raw) return null;
  return (allowed as readonly string[]).includes(raw) ? (raw as T) : null;
}

export function systemV4DecisionContext(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw in DECISION_TYPE_LABELS) {
    return DECISION_TYPE_LABELS[raw as DecisionType];
  }
  return raw;
}

export function systemV4Hold(reading: SystemV4LastRead | null): SystemV4Hold {
  const decisionContext = systemV4DecisionContext(reading?.decisionType);
  const hardStopActive = reading?.stopCode != null;
  if (!hardStopActive) {
    return {
      hardStopActive: false,
      decisionContext,
      verdictLabel: null,
      holdLead: null,
      holdMeta: null,
    };
  }
  const decisionType = reading?.decisionType ?? "home_buying";
  const hold = foldHomeHoldSentence(reading?.stopCode, decisionType);
  return {
    hardStopActive: true,
    decisionContext,
    verdictLabel: VERDICT_META.NOT_YET.label,
    holdLead: hold ? foldHoldLead(hold) : null,
    holdMeta: systemV4HoldMeta(reading?.stopCode, decisionType),
  };
}

export function systemV4HoldMeta(
  stopCode: FoldHardStopCode | null | undefined,
  decisionType: string,
): string | null {
  if (!stopCode) return null;
  const eyebrow = foldHardStopEyebrow(stopCode, decisionType).replace(/\.$/, "");
  return `${eyebrow} · ${SYSTEM_V4_HOLD_CLOSE}`;
}

/** Quiet Synced/Stale age. Minutes stay spelled out so `12m` means months. */
export function systemV4AgeLabel(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return SYSTEM_V4_AGE_UNKNOWN;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return SYSTEM_V4_AGE_UNKNOWN;
  const delta = Math.max(0, nowMs - then);
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return "Synced just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Synced ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Synced ${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 24) return `Synced ${months}m ago`;
  const years = Math.floor(months / 12);
  return `Synced ${years}y ago`;
}

export function systemV4ForbidsOnTrackCopy(hardStopActive: boolean): boolean {
  return hardStopActive;
}

export function systemV4ForbidsReadyCopy(hardStopActive: boolean): boolean {
  return hardStopActive;
}

export function systemV4ForbidsInventedDollars(blob: unknown): boolean {
  return !/\$\d/.test(JSON.stringify(blob));
}

export const SYSTEM_V4_MONEY_HREF = V4_SHELL_MONEY_HREF;
export const SYSTEM_V4_PATH_HREF = V4_SHELL_PATH_HREF;
export const SYSTEM_V4_FIXTURE_NOW_MS = Date.parse("2026-09-11T12:00:00.000Z");
export const SYSTEM_V4_FIXTURE_SYNCED_12M = "2025-09-11T12:00:00.000Z";
export const SYSTEM_V4_FIXTURE_DECISION = "home_buying" as const;
