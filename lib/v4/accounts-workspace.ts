/**
 * Accounts v4 — Plaid manage connect/disconnect REUSE.
 * Live connections only. Age honesty. Never invent balances here.
 */

import { V4_ASSESS_DECISION_LABEL, V4_ASK_PLACEHOLDER_ACCOUNTS } from "@/lib/v4/assessment-walk";
import { VERDICT_META } from "@/lib/brand";
import {
  V4_SHELL_ACCOUNTS_HREF,
  V4_SHELL_HOME_HREF,
  V4_SHELL_MONEY_HREF,
} from "@/lib/layout/v4-shell";
import type { PlaidItemStatus } from "@/types/database";
import {
  SYSTEM_V4_AGE_UNKNOWN,
  SYSTEM_V4_FIXTURE_DECISION,
  SYSTEM_V4_FIXTURE_NOW_MS,
  SYSTEM_V4_FIXTURE_SYNCED_12M,
  SYSTEM_V4_HOLD_META_LINE,
  SYSTEM_V4_LIVE_SSOT,
  SYSTEM_V4_PROMPTS_MAX,
  V4_ASK_PLACEHOLDER_BY_SURFACE,
  parseV4VisualState,
  systemV4AgeLabel,
  systemV4ForbidsInventedDollars,
  systemV4ForbidsOnTrackCopy,
  systemV4ForbidsReadyCopy,
  systemV4Hold,
  type SystemV4Cta,
  type SystemV4HomiPrompt,
  type SystemV4LastRead,
} from "@/lib/v4/system-surfaces";

export const V4_ACCOUNTS_HREF = V4_SHELL_ACCOUNTS_HREF;
export const V4_ASK_PLACEHOLDER_ACCOUNTS_FIELD = V4_ASK_PLACEHOLDER_ACCOUNTS;
export const ACCOUNTS_V4_EMPTY_TITLE = "No accounts connected." as const;
export const ACCOUNTS_V4_EMPTY_BODY =
  "Connect for live rows. Manage or disconnect here — never invent balances." as const;
export const ACCOUNTS_V4_LIVE_TITLE = "Connected accounts." as const;
export const ACCOUNTS_V4_LIVE_BODY =
  "Live connections only — manage or disconnect. Never invent balances here." as const;
export const ACCOUNTS_V4_CONNECT = "Connect accounts" as const;
export const ACCOUNTS_V4_CONNECT_ANOTHER = "Connect another" as const;
export const ACCOUNTS_V4_HOLD_LEAD = "Hold first — accounts stay ledger-only." as const;
export const ACCOUNTS_V4_HARD_STOP_BODY =
  "Connecting does not clear the hard stop. Path still leads — never invent balances here." as const;
export const ACCOUNTS_V4_STALE_NOTE = "Stale sync — live connections until a refresh." as const;
export const ACCOUNTS_V4_STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;
export const ACCOUNTS_V4_CRAFT_DISCLAIMER =
  "Craft mock only — masks are orientation, never Production invent $." as const;

export const V4_ACCOUNTS_VISUAL_STATES = ["empty", "normal", "hard-stop", "stale"] as const;
export type V4AccountsVisualState = (typeof V4_ACCOUNTS_VISUAL_STATES)[number];
export type AccountsV4Kind = "empty" | "normal" | "hard-stop" | "stale";

export type AccountsV4Row = {
  id: string;
  itemId: string;
  name: string;
  mask: string | null;
  status: PlaidItemStatus | "healthy";
  liveLabel: typeof SYSTEM_V4_LIVE_SSOT;
};

export type AccountsV4View = {
  kind: AccountsV4Kind;
  hardStopActive: boolean;
  decisionContext: string | null;
  verdictLabel: string | null;
  holdLead: string | null;
  holdMeta: string | null;
  title: string;
  body: string;
  ageLabel: string;
  cta: SystemV4Cta;
  rows: AccountsV4Row[];
  honestyLine: string | null;
  canManage: boolean;
  isCraftFixture: boolean;
  prompts: readonly SystemV4HomiPrompt[];
  askPlaceholder: typeof V4_ASK_PLACEHOLDER_ACCOUNTS;
};

export type AccountsV4SourceItem = {
  id?: string;
  institution_name?: string | null;
  status?: PlaidItemStatus | string | null;
  last_successful_sync?: string | null;
};

export type AccountsV4SourceAccount = {
  id?: string;
  item_id?: string;
  name?: string | null;
  mask?: string | null;
  subtype?: string | null;
  type?: string | null;
};

export const ACCOUNTS_V4_PROMPTS = {
  empty: [
    { label: "What does Synced mean?", href: V4_SHELL_ACCOUNTS_HREF },
    { label: "When to reconnect", href: V4_SHELL_ACCOUNTS_HREF },
    { label: "Open Money picture", href: V4_SHELL_MONEY_HREF },
  ],
  normal: [
    { label: "What does Synced mean?", href: V4_SHELL_ACCOUNTS_HREF },
    { label: "When to reconnect", href: V4_SHELL_ACCOUNTS_HREF },
    { label: "Open Money picture", href: V4_SHELL_MONEY_HREF },
  ],
  stale: [
    { label: "What does Synced mean?", href: V4_SHELL_ACCOUNTS_HREF },
    { label: "When to reconnect", href: V4_SHELL_ACCOUNTS_HREF },
    { label: "Open Money picture", href: V4_SHELL_MONEY_HREF },
  ],
  "hard-stop": [
    { label: "What does Synced mean?", href: V4_SHELL_HOME_HREF },
    { label: "When to reconnect", href: V4_SHELL_ACCOUNTS_HREF },
    { label: "Open Money picture", href: V4_SHELL_MONEY_HREF },
  ],
} as const satisfies Record<AccountsV4Kind, readonly SystemV4HomiPrompt[]>;

export function parseV4AccountsVisualState(
  raw: string | null | undefined,
): V4AccountsVisualState | null {
  return parseV4VisualState(raw, V4_ACCOUNTS_VISUAL_STATES);
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

function accountName(name: string | null | undefined, subtype: string | null | undefined): string {
  const trimmed = name?.trim();
  if (trimmed) return trimmed;
  const sub = subtype?.trim();
  if (sub) return sub.charAt(0).toUpperCase() + sub.slice(1);
  return "Account";
}

function latestSyncIso(items: readonly AccountsV4SourceItem[]): string | null {
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

function mapRows(
  items: readonly AccountsV4SourceItem[],
  accounts: readonly AccountsV4SourceAccount[],
): AccountsV4Row[] {
  const statusByItem = new Map<string, PlaidItemStatus>();
  for (const item of items) {
    if (typeof item.id === "string" && item.id) {
      statusByItem.set(item.id, asItemStatus(item.status) ?? "healthy");
    }
  }
  return accounts.map((account, index) => {
    const itemId = typeof account.item_id === "string" ? account.item_id : "";
    const mask = account.mask?.trim() || null;
    return {
      id: typeof account.id === "string" && account.id ? account.id : `account-${index}`,
      itemId,
      name: accountName(account.name, account.subtype),
      mask,
      status: statusByItem.get(itemId) ?? "healthy",
      liveLabel: SYSTEM_V4_LIVE_SSOT,
    };
  });
}

export type AccountsV4Reading = SystemV4LastRead & {
  items: readonly AccountsV4SourceItem[];
  accounts: readonly AccountsV4SourceAccount[];
  isCraftFixture?: boolean;
  nowMs?: number;
};

export function buildAccountsV4View(reading: AccountsV4Reading | null): AccountsV4View {
  const hold = systemV4Hold(reading);
  const hardStopActive = hold.hardStopActive;
  const items = reading?.items ?? [];
  const rows = mapRows(items, reading?.accounts ?? []);
  const nowMs = reading?.nowMs ?? Date.now();
  const syncIso = latestSyncIso(items);
  const ageLabel = rows.length > 0 ? systemV4AgeLabel(syncIso, nowMs) : SYSTEM_V4_AGE_UNKNOWN;
  const stale =
    rows.length > 0 &&
    syncIso != null &&
    Number.isFinite(new Date(syncIso).getTime()) &&
    nowMs - new Date(syncIso).getTime() >= ACCOUNTS_V4_STALE_AFTER_MS;
  const kind: AccountsV4Kind = hardStopActive
    ? "hard-stop"
    : rows.length === 0
      ? "empty"
      : stale
        ? "stale"
        : "normal";
  const isCraftFixture = reading?.isCraftFixture === true;
  let honestyLine: string | null = null;
  if (isCraftFixture) honestyLine = ACCOUNTS_V4_CRAFT_DISCLAIMER;
  else if (kind === "stale") honestyLine = ACCOUNTS_V4_STALE_NOTE;

  return {
    kind,
    hardStopActive,
    decisionContext: hold.decisionContext,
    verdictLabel: hardStopActive ? VERDICT_META.NOT_YET.label : null,
    holdLead: hardStopActive ? ACCOUNTS_V4_HOLD_LEAD : null,
    holdMeta: hardStopActive ? SYSTEM_V4_HOLD_META_LINE : null,
    title: hardStopActive
      ? ACCOUNTS_V4_HOLD_LEAD
      : rows.length > 0
        ? ACCOUNTS_V4_LIVE_TITLE
        : ACCOUNTS_V4_EMPTY_TITLE,
    body: hardStopActive
      ? ACCOUNTS_V4_HARD_STOP_BODY
      : rows.length > 0
        ? ACCOUNTS_V4_LIVE_BODY
        : ACCOUNTS_V4_EMPTY_BODY,
    ageLabel,
    cta: {
      label: rows.length > 0 ? ACCOUNTS_V4_CONNECT_ANOTHER : ACCOUNTS_V4_CONNECT,
      href: V4_SHELL_ACCOUNTS_HREF,
    },
    rows,
    honestyLine,
    canManage: !isCraftFixture,
    isCraftFixture,
    prompts: ACCOUNTS_V4_PROMPTS[kind].slice(0, SYSTEM_V4_PROMPTS_MAX),
    askPlaceholder: V4_ASK_PLACEHOLDER_BY_SURFACE.accounts,
  };
}

function craftConnected(): {
  items: AccountsV4SourceItem[];
  accounts: AccountsV4SourceAccount[];
} {
  return {
    items: [
      {
        id: "fixture-item",
        institution_name: "Example Bank",
        status: "healthy",
        last_successful_sync: SYSTEM_V4_FIXTURE_SYNCED_12M,
      },
    ],
    accounts: [
      {
        id: "fixture-checking",
        item_id: "fixture-item",
        name: "Checking",
        mask: "4821",
        type: "depository",
        subtype: "checking",
      },
      {
        id: "fixture-savings",
        item_id: "fixture-item",
        name: "Savings",
        mask: "0199",
        type: "depository",
        subtype: "savings",
      },
    ],
  };
}

export function accountsV4VisualReading(state: V4AccountsVisualState): AccountsV4Reading | null {
  switch (state) {
    case "empty":
      return null;
    case "hard-stop":
      return {
        decisionType: SYSTEM_V4_FIXTURE_DECISION,
        verdict: "NOT_YET",
        stopCode: "RUNWAY_UNDER_1_MONTH",
        lastMoneyMonths: 0.4,
        items: [],
        accounts: [],
        nowMs: SYSTEM_V4_FIXTURE_NOW_MS,
      };
    case "normal": {
      const live = craftConnected();
      return {
        decisionType: SYSTEM_V4_FIXTURE_DECISION,
        verdict: "ALMOST_THERE",
        stopCode: null,
        items: live.items,
        accounts: live.accounts,
        isCraftFixture: true,
        nowMs: SYSTEM_V4_FIXTURE_NOW_MS,
      };
    }
    case "stale": {
      const live = craftConnected();
      return {
        decisionType: SYSTEM_V4_FIXTURE_DECISION,
        verdict: "ALMOST_THERE",
        stopCode: null,
        items: [{ ...live.items[0], last_successful_sync: "2026-08-01T12:00:00.000Z" }],
        accounts: live.accounts,
        isCraftFixture: true,
        nowMs: SYSTEM_V4_FIXTURE_NOW_MS,
      };
    }
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function accountsV4VisualView(state: V4AccountsVisualState): AccountsV4View {
  const view = buildAccountsV4View(accountsV4VisualReading(state));
  if (state === "empty") {
    return { ...view, decisionContext: V4_ASSESS_DECISION_LABEL };
  }
  return view;
}

export function accountsV4ForbidsOnTrackCopy(view: AccountsV4View): boolean {
  return systemV4ForbidsOnTrackCopy(view.hardStopActive);
}

export function accountsV4ForbidsReadyCopy(view: AccountsV4View): boolean {
  return systemV4ForbidsReadyCopy(view.hardStopActive);
}

export function accountsV4ForbidsInventedDollars(view: AccountsV4View): boolean {
  if (view.rows.some((row) => "cents" in row || "balance" in row)) return false;
  return systemV4ForbidsInventedDollars(view);
}

export function accountsV4MaskLabel(mask: string | null): string | null {
  if (!mask) return null;
  return `*${mask.replace(/^\*+/, "")}`;
}
