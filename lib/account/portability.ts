/**
 * Take your data with you, and bring it back.
 *
 * The account export was server-only — profiles, assessments, journal,
 * check-ins. The money picture is not there, because it does not live on the
 * server: transactions, periods, allocations and goals sit in localStorage and
 * the sync layer that would push them (lib/finance/ledger-sync.ts) has no
 * callers yet.
 *
 * local-ledger.ts is explicit that "localStorage is treated as a cache, not an
 * archive" — Safari private mode rejects writes and iOS evicts storage after
 * seven days without interaction. So the money data was the part most at risk
 * and the only part with no copy anywhere. An export that omits it is not a
 * backup.
 *
 * These helpers fold the local money data into the downloaded file and read it
 * back. Parsing is pure so the validation is testable without a DOM; the
 * collect/restore pair are the only functions that touch storage.
 */

import { BUDGET_LEDGER_STORAGE_KEY, BUDGET_LEDGER_STAMP_KEY } from "@/lib/finance/local-ledger";
import { PLANNER_STORAGE_KEY } from "@/lib/planner/store";

/** Bumped only when the envelope shape changes, never for content changes. */
export const PORTABLE_FORMAT_VERSION = 1;

/** Storage keys carried in a backup, with the label used in messages. */
const PORTABLE_KEYS: { key: string; label: string }[] = [
  { key: BUDGET_LEDGER_STORAGE_KEY, label: "budget ledger" },
  { key: PLANNER_STORAGE_KEY, label: "planner workspace" },
];

export interface HomiExport {
  formatVersion: number;
  exportedAt: string;
  /** Whatever /api/account/export returned, untouched. */
  server: unknown;
  /** Raw localStorage payloads, keyed by their storage key. */
  localMoney: Record<string, string>;
}

/**
 * Reads the money data out of storage. Returns raw strings rather than parsed
 * objects so a blob this code cannot interpret still round-trips intact — the
 * goal is to not lose data, not to understand it.
 */
export function collectLocalMoney(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  for (const { key } of PORTABLE_KEYS) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) out[key] = raw;
    } catch {
      // A storage read can throw in private mode; skip rather than fail the
      // whole export — a partial backup beats no backup.
    }
  }
  return out;
}

export function buildExport(server: unknown, nowIso: string): HomiExport {
  return {
    formatVersion: PORTABLE_FORMAT_VERSION,
    exportedAt: nowIso,
    server,
    localMoney: collectLocalMoney(),
  };
}

export type ParseResult = { ok: true; data: HomiExport } | { ok: false; error: string };

/**
 * Validates an uploaded file before anything is written. Refuses politely
 * rather than throwing, and never partially applies: the caller gets either a
 * usable export or a reason.
 */
export function parseImport(text: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "That file isn't a HōMI export." };
  }

  const p = parsed as Record<string, unknown>;

  if (typeof p.formatVersion !== "number") {
    return { ok: false, error: "That file isn't a HōMI export." };
  }
  if (p.formatVersion > PORTABLE_FORMAT_VERSION) {
    return {
      ok: false,
      error: "That export came from a newer version of HōMI. Update, then try again.",
    };
  }

  const localMoney =
    typeof p.localMoney === "object" && p.localMoney !== null && !Array.isArray(p.localMoney)
      ? (p.localMoney as Record<string, unknown>)
      : {};

  // Only carry keys we recognise, and only when the value is a string. An
  // export is user-supplied input; it does not get to write arbitrary storage.
  const clean: Record<string, string> = {};
  for (const { key } of PORTABLE_KEYS) {
    const value = localMoney[key];
    if (typeof value === "string") clean[key] = value;
  }

  if (Object.keys(clean).length === 0) {
    return { ok: false, error: "That export doesn't contain any money data to restore." };
  }

  return {
    ok: true,
    data: {
      formatVersion: p.formatVersion,
      exportedAt: typeof p.exportedAt === "string" ? p.exportedAt : "",
      server: p.server ?? null,
      localMoney: clean,
    },
  };
}

export interface RestoreResult {
  restored: string[];
  /** Labels that could not be written — storage refused. */
  failed: string[];
}

/**
 * Writes the backup back into storage. Reports what failed rather than
 * swallowing it: a browser that refuses the write leaves the user believing
 * their data is back when it is not.
 */
export function restoreLocalMoney(localMoney: Record<string, string>): RestoreResult {
  const restored: string[] = [];
  const failed: string[] = [];
  if (typeof window === "undefined") {
    return { restored, failed: PORTABLE_KEYS.map((k) => k.label) };
  }

  for (const { key, label } of PORTABLE_KEYS) {
    const value = localMoney[key];
    if (typeof value !== "string") continue;
    try {
      window.localStorage.setItem(key, value);
      restored.push(label);
    } catch {
      failed.push(label);
    }
  }

  // The freshness stamp must move with the data, or the CFM will treat a
  // restored ledger as stale and warn about numbers that are actually current.
  if (restored.length > 0) {
    try {
      window.localStorage.setItem(BUDGET_LEDGER_STAMP_KEY, String(Date.now()));
    } catch {
      // Non-fatal: the data is back, only the freshness marker is missing.
    }
  }

  return { restored, failed };
}
