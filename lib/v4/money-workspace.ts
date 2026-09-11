/**
 * Money v4 workspace — Shell v4 chrome over live Plaid rows.
 * Empty or live SSOT only. No invented $. No second score.
 * AssessmentResult is read for hard-stop chrome; Money never writes it.
 */

import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import {
  FOLD_CONNECT_ACCOUNTS_LABEL,
  FOLD_CONNECTIONS_HREF,
  MONEY_WAIT_LINE,
  foldHardStopEyebrow,
  foldHoldLead,
  foldHomeHoldSentence,
  foldRunwayLabel,
  type FoldHardStopCode,
} from "@/lib/dashboard/fold-truth";
import { dollarsToCents, formatCentsUSD, type MoneyCents } from "@/lib/finance/money";
import { V4_SHELL_MONEY_HREF, V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";
import {
  V4_ASSESS_DECISION_LABEL,
  V4_ASSESS_HOMI_COMPARE,
  V4_ASK_PLACEHOLDER_FINANCIAL,
  type V4AssessHomiPrompt,
} from "@/lib/v4/assessment-walk";
import type { PlaidItemStatus } from "@/types/database";

export const V4_MONEY_HREF = V4_SHELL_MONEY_HREF;
export const V4_MONEY_CONNECT_HREF = FOLD_CONNECTIONS_HREF;
export const V4_MONEY_CONNECT_LABEL = FOLD_CONNECT_ACCOUNTS_LABEL;
export const V4_ASK_PLACEHOLDER_MONEY = V4_ASK_PLACEHOLDER_FINANCIAL;

export const MONEY_V4_EMPTY_TITLE = MONEY_WAIT_LINE;
export const MONEY_V4_EMPTY_BODY =
  "Connect accounts for a fuller picture. We never invent balances on this page." as const;
export const MONEY_V4_HARD_STOP_EMPTY_BODY =
  "Connect for a fuller picture. Connecting does not clear the hard stop — Path still leads." as const;
export const MONEY_V4_HOLD_CLOSE =
  "Money stays empty or live only. No On track theater." as const;
export const MONEY_V4_LIQUID_SUB = "Liquid cash · from connected accounts" as const;
export const MONEY_V4_CRAFT_DISCLAIMER =
  "Craft mock only — never ship these dollars as Production invent." as const;
export const MONEY_V4_CRAFT_EYEBROW =
  "Example craft figures — live Plaid SSOT wins at Pixel" as const;
export const MONEY_V4_AGE_UNKNOWN = "Age unknown" as const;
export const MONEY_V4_SYNCING_TITLE = "Accounts are syncing." as const;
export const MONEY_V4_SYNCING_BODY =
  "Balances appear when the live sync finishes. We never invent them." as const;
export const MONEY_V4_ERROR_TITLE = "Accounts need attention." as const;
export const MONEY_V4_ERROR_BODY =
  "We could not refresh this picture. Reconnect for live rows — we never invent balances." as const;
export const MONEY_V4_STALE_NOTE = "Stale sync — live rows until a refresh." as const;
export const MONEY_V4_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

/** Preview-only stills. Operator flag still required. Never a public unlock. */
export const V4_MONEY_VISUAL_STATES = [
  "empty",
  "hard-stop",
  "connected",
  "stale",
  "syncing",
  "error",
] as const;
export type V4MoneyVisualState = (typeof V4_MONEY_VISUAL_STATES)[number];

export type MoneyV4Kind = V4MoneyVisualState;

export type MoneyV4HomiPrompt = V4AssessHomiPrompt;

export const MONEY_V4_HOMI_PROMPTS: readonly MoneyV4HomiPrompt[] = [
  { label: "What does liquid cash mean here?", href: "/learn" },
  { label: "How does Money relate to Path?", href: V4_SHELL_PATH_HREF },
  V4_ASSESS_HOMI_COMPARE,
];

export type MoneyV4Account = {
  id: string;
  name: string;
  institution: string;
  typeLabel: string;
  cents: MoneyCents | null;
  currency: string;
};

export type MoneyV4View = {
  kind: MoneyV4Kind;
  hasLiveRows: boolean;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  emptyTitle: string;
  emptyBody: string;
  connectHref: typeof V4_MONEY_CONNECT_HREF;
  connectLabel: typeof V4_MONEY_CONNECT_LABEL;
  ageLabel: string;
  liquidCents: MoneyCents | null;
  accounts: MoneyV4Account[];
  honestyLine: string | null;
  isCraftFixture: boolean;
  prompts: readonly MoneyV4HomiPrompt[];
};

export type MoneyV4SourceItem = {
  id?: string;
  institution_name?: string | null;
  status?: PlaidItemStatus | string | null;
  last_successful_sync?: string | null;
};

export type MoneyV4SourceAccount = {
  id?: string;
  item_id?: string;
  name?: string | null;
  type?: string | null;
  subtype?: string | null;
  current_balance?: number | null;
  available_balance?: number | null;
  iso_currency?: string | null;
};

export type MoneyV4Reading = {
  decisionType?: string;
  verdict: VerdictKey | null;
  stopCode: FoldHardStopCode | null;
  lastMoneyMonths?: number | null;
  items: readonly MoneyV4SourceItem[];
  accounts: readonly MoneyV4SourceAccount[];
  loadError?: boolean;
  isCraftFixture?: boolean;
  nowMs?: number;
};

const RECONNECT_STATUSES = new Set<PlaidItemStatus>([
  "login_required",
  "pending_disconnect",
  "revoked",
]);

export function parseV4MoneyVisualState(
  raw: string | null | undefined,
): V4MoneyVisualState | null {
  if (!raw) return null;
  return (V4_MONEY_VISUAL_STATES as readonly string[]).includes(raw)
    ? (raw as V4MoneyVisualState)
    : null;
}

function decisionContextLabel(raw: string | undefined): string | null {
  if (!raw) return null;
  if (raw in DECISION_TYPE_LABELS) {
    return DECISION_TYPE_LABELS[raw as DecisionType];
  }
  return raw;
}

function asItemStatus(value: unknown): PlaidItemStatus | null {
  if (
    value === "healthy" ||
    value === "login_required" ||
    value === "pending_disconnect" ||
    value === "pending_expiration" ||
    value === "revoked"
  ) {
    return value;
  }
  return null;
}

function dollarsToCentsSafe(dollars: number): MoneyCents | null {
  try {
    return dollarsToCents(dollars);
  } catch {
    return null;
  }
}

function depositoryDollars(account: MoneyV4SourceAccount): number | null {
  if (account.type !== "depository") return null;
  const value = account.available_balance ?? account.current_balance;
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function typeLabel(type: string | null | undefined): string {
  const raw = (type ?? "").trim();
  if (!raw) return "Account";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function institutionLabel(name: string | null | undefined): string {
  const trimmed = name?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "Institution unavailable";
}

function accountName(name: string | null | undefined, subtype: string | null | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const sub = subtype?.trim();
  if (sub) return sub.charAt(0).toUpperCase() + sub.slice(1);
  return "Account";
}

function latestSyncIso(items: readonly MoneyV4SourceItem[]): string | null {
  let latest: number | null = null;
  let iso: string | null = null;
  for (const item of items) {
    if (!item.last_successful_sync) continue;
    const ms = new Date(item.last_successful_sync).getTime();
    if (!Number.isFinite(ms)) continue;
    if (latest == null || ms > latest) {
      latest = ms;
      iso = item.last_successful_sync;
    }
  }
  return iso;
}

/** Always returns a label. Never hide age behind a missing refresh. */
export function moneyV4AgeLabel(iso: string | null | undefined, nowMs: number = Date.now()): string {
  if (!iso) return MONEY_V4_AGE_UNKNOWN;
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return MONEY_V4_AGE_UNKNOWN;
  const delta = Math.max(0, nowMs - then);
  const seconds = Math.floor(delta / 1000);
  if (seconds < 60) return "Synced just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Synced ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Synced ${days} d ago`;
  const months = Math.floor(days / 30);
  if (months < 24) return `Synced ${months} mo ago`;
  const years = Math.floor(months / 12);
  return `Synced ${years} yr ago`;
}

export function moneyV4FormatLiveUsd(cents: MoneyCents, alwaysCents = false): string {
  return formatCentsUSD(cents, { alwaysCents });
}

export function moneyV4HoldMeta(
  stopCode: FoldHardStopCode | null,
  decisionType: string,
  runwayLabel: string,
): string | null {
  if (!stopCode) return null;
  const eyebrow = foldHardStopEyebrow(stopCode, decisionType).replace(/\.$/, "");
  const parts = [eyebrow];
  if (runwayLabel && runwayLabel !== "\u2014") parts.push(runwayLabel);
  return `${parts.join(" · ")} — ${MONEY_V4_HOLD_CLOSE}`;
}

function mapDepositoryAccounts(
  items: readonly MoneyV4SourceItem[],
  accounts: readonly MoneyV4SourceAccount[],
): MoneyV4Account[] {
  const institutionByItem = new Map<string, string>();
  for (const item of items) {
    if (typeof item.id === "string" && item.id) {
      institutionByItem.set(item.id, institutionLabel(item.institution_name));
    }
  }
  const rows: MoneyV4Account[] = [];
  for (const [index, account] of accounts.entries()) {
    if (account.type !== "depository") continue;
    const dollars = depositoryDollars(account);
    rows.push({
      id: typeof account.id === "string" && account.id ? account.id : `money-account-${index}`,
      name: accountName(account.name, account.subtype),
      institution: institutionByItem.get(account.item_id ?? "") ?? "Institution unavailable",
      typeLabel: typeLabel(account.type),
      cents: dollars == null ? null : dollarsToCentsSafe(dollars),
      currency: (account.iso_currency ?? "USD").trim() || "USD",
    });
  }
  return rows;
}

function liquidFromAccounts(accounts: readonly MoneyV4Account[]): MoneyCents | null {
  let total: MoneyCents | null = null;
  for (const account of accounts) {
    if (account.cents == null) continue;
    if (account.currency !== "USD") continue;
    total = (total ?? 0) + account.cents;
  }
  return total;
}

function resolveKind(args: {
  itemCount: number;
  hasLiveRows: boolean;
  loadError: boolean;
  needsReconnect: boolean;
  stale: boolean;
  anySync: boolean;
}): MoneyV4Kind {
  if (args.loadError && !args.hasLiveRows) return "error";
  if (args.itemCount === 0) return "empty";
  if (args.hasLiveRows) return args.stale ? "stale" : "connected";
  if (args.needsReconnect) return "error";
  if (!args.anySync) return "syncing";
  return "error";
}

function emptyView(decisionContext: string | null, hardStopActive: boolean): MoneyV4View {
  return {
    kind: "empty",
    hasLiveRows: false,
    hardStopActive,
    decisionContext,
    verdictLabel: null,
    holdLead: null,
    holdMeta: null,
    emptyTitle: MONEY_V4_EMPTY_TITLE,
    emptyBody: hardStopActive ? MONEY_V4_HARD_STOP_EMPTY_BODY : MONEY_V4_EMPTY_BODY,
    connectHref: V4_MONEY_CONNECT_HREF,
    connectLabel: V4_MONEY_CONNECT_LABEL,
    ageLabel: MONEY_V4_AGE_UNKNOWN,
    liquidCents: null,
    accounts: [],
    honestyLine: null,
    isCraftFixture: false,
    prompts: MONEY_V4_HOMI_PROMPTS,
  };
}

export function buildMoneyV4View(reading: MoneyV4Reading | null): MoneyV4View {
  if (!reading) return emptyView(null, false);

  const decisionType = reading.decisionType ?? "home_buying";
  const decisionContext = decisionContextLabel(reading.decisionType);
  const hardStopActive = reading.stopCode != null;
  const nowMs = reading.nowMs ?? Date.now();
  const items = reading.items ?? [];
  const mapped = mapDepositoryAccounts(items, reading.accounts ?? []);
  const liquidCents = liquidFromAccounts(mapped);
  const hasLiveRows = mapped.some((row) => row.cents != null);
  const syncIso = latestSyncIso(items);
  const ageLabel = moneyV4AgeLabel(syncIso, nowMs);
  const stale =
    syncIso != null &&
    Number.isFinite(new Date(syncIso).getTime()) &&
    nowMs - new Date(syncIso).getTime() >= MONEY_V4_STALE_AFTER_MS;
  const needsReconnect = items.some((item) => {
    const status = asItemStatus(item.status);
    return status != null && RECONNECT_STATUSES.has(status);
  });
  const anySync = items.some((item) => Boolean(item.last_successful_sync));
  const kind = resolveKind({
    itemCount: items.length,
    hasLiveRows,
    loadError: reading.loadError === true,
    needsReconnect,
    stale,
    anySync,
  });

  const hold = hardStopActive ? foldHomeHoldSentence(reading.stopCode, decisionType) : null;
  const holdLead = hold ? foldHoldLead(hold) : null;
  const runwayLabel = foldRunwayLabel(reading.lastMoneyMonths);
  const verdictLabel = hardStopActive ? VERDICT_META.NOT_YET.label : null;

  if (kind === "empty") {
    return {
      ...emptyView(decisionContext, hardStopActive),
      kind: hardStopActive ? "hard-stop" : "empty",
      verdictLabel,
      holdLead,
      holdMeta: hardStopActive ? moneyV4HoldMeta(reading.stopCode, decisionType, runwayLabel) : null,
    };
  }

  let honestyLine: string | null = null;
  if (reading.isCraftFixture) honestyLine = MONEY_V4_CRAFT_DISCLAIMER;
  else if (kind === "stale") honestyLine = MONEY_V4_STALE_NOTE;
  else if (kind === "syncing") honestyLine = MONEY_V4_SYNCING_BODY;
  else if (kind === "error") honestyLine = MONEY_V4_ERROR_BODY;
  else if (reading.loadError) honestyLine = MONEY_V4_ERROR_BODY;

  return {
    kind: hardStopActive ? "hard-stop" : kind,
    hasLiveRows,
    hardStopActive,
    decisionContext,
    verdictLabel,
    holdLead,
    holdMeta: hardStopActive ? moneyV4HoldMeta(reading.stopCode, decisionType, runwayLabel) : null,
    emptyTitle: kind === "syncing" ? MONEY_V4_SYNCING_TITLE : kind === "error" ? MONEY_V4_ERROR_TITLE : MONEY_V4_EMPTY_TITLE,
    emptyBody:
      kind === "syncing"
        ? MONEY_V4_SYNCING_BODY
        : kind === "error"
          ? MONEY_V4_ERROR_BODY
          : hardStopActive
            ? MONEY_V4_HARD_STOP_EMPTY_BODY
            : MONEY_V4_EMPTY_BODY,
    connectHref: V4_MONEY_CONNECT_HREF,
    connectLabel: V4_MONEY_CONNECT_LABEL,
    ageLabel,
    liquidCents: hasLiveRows ? liquidCents : null,
    accounts: hasLiveRows ? mapped : [],
    honestyLine,
    isCraftFixture: reading.isCraftFixture === true,
    prompts: MONEY_V4_HOMI_PROMPTS,
  };
}

export function moneyV4ForbidsOnTrackCopy(view: MoneyV4View): boolean {
  return view.hardStopActive;
}

export function moneyV4ForbidsReadyCopy(view: MoneyV4View): boolean {
  return view.hardStopActive;
}

export function moneyV4ForbidsInventedDollars(view: MoneyV4View): boolean {
  if (view.isCraftFixture) return true;
  return view.liquidCents == null && view.accounts.every((row) => row.cents == null);
}

const FIXTURE_NOW_MS = Date.parse("2026-09-10T12:00:00.000Z");
const FIXTURE_SYNCED_12_MO = "2025-09-10T12:00:00.000Z";
const FIXTURE_SYNCED_STALE = "2026-08-01T12:00:00.000Z";

function craftConnectedAccounts(): {
  items: MoneyV4SourceItem[];
  accounts: MoneyV4SourceAccount[];
} {
  return {
    items: [
      {
        id: "fixture-item",
        institution_name: "Example Bank",
        status: "healthy",
        last_successful_sync: FIXTURE_SYNCED_12_MO,
      },
    ],
    accounts: [
      {
        id: "fixture-checking",
        item_id: "fixture-item",
        name: "Checking",
        type: "depository",
        subtype: "checking",
        current_balance: 3120,
        available_balance: 3120,
        iso_currency: "USD",
      },
      {
        id: "fixture-savings",
        item_id: "fixture-item",
        name: "Savings",
        type: "depository",
        subtype: "savings",
        current_balance: 1160,
        available_balance: 1160,
        iso_currency: "USD",
      },
    ],
  };
}

/** Preview-only stills. Never a public unlock. Craft $ never used as Production invent. */
export function moneyV4VisualReading(state: V4MoneyVisualState): MoneyV4Reading | null {
  switch (state) {
    case "empty":
      return null;
    case "hard-stop":
      return {
        decisionType: "home_buying",
        verdict: "NOT_YET",
        stopCode: "RUNWAY_UNDER_1_MONTH",
        lastMoneyMonths: 0.4,
        items: [],
        accounts: [],
        nowMs: FIXTURE_NOW_MS,
      };
    case "connected": {
      const live = craftConnectedAccounts();
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        lastMoneyMonths: 2.1,
        items: live.items,
        accounts: live.accounts,
        isCraftFixture: true,
        nowMs: FIXTURE_NOW_MS,
      };
    }
    case "stale": {
      const live = craftConnectedAccounts();
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        lastMoneyMonths: 2.1,
        items: [{ ...live.items[0], last_successful_sync: FIXTURE_SYNCED_STALE }],
        accounts: live.accounts,
        isCraftFixture: true,
        nowMs: FIXTURE_NOW_MS,
      };
    }
    case "syncing":
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        lastMoneyMonths: 2.1,
        items: [
          {
            id: "fixture-item",
            institution_name: "Example Bank",
            status: "healthy",
            last_successful_sync: null,
          },
        ],
        accounts: [],
        nowMs: FIXTURE_NOW_MS,
      };
    case "error":
      return {
        decisionType: "home_buying",
        verdict: "ALMOST_THERE",
        stopCode: null,
        lastMoneyMonths: 2.1,
        items: [
          {
            id: "fixture-item",
            institution_name: "Example Bank",
            status: "login_required",
            last_successful_sync: FIXTURE_SYNCED_12_MO,
          },
        ],
        accounts: [],
        nowMs: FIXTURE_NOW_MS,
      };
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function moneyV4VisualView(state: V4MoneyVisualState): MoneyV4View {
  const view = buildMoneyV4View(moneyV4VisualReading(state));
  if (state === "empty") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  if (state === "connected") {
    return { ...view, kind: "connected" };
  }
  return view;
}
