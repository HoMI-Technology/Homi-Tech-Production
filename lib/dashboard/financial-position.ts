/**
 * Financial position — pure data shaping for the dashboard's bank tiles and
 * down-payment goal card. Components stay thin; every derivation here is
 * deterministic and unit-tested (no Supabase, no Date.now() without an
 * injectable `now`).
 */

import type { PlaidItemStatus } from "@/types/database";

/** The safe subset of a financial_snapshots row the dashboard reads. */
export interface SnapshotReading {
  /** numeric columns can arrive as strings from PostgREST — coerced here. */
  net_worth: number | string;
  net_cash_flow: number | string;
  savings_rate: number | string;
  completed_at: string;
  state: Record<string, unknown> | null;
}

/** The safe plaid_items columns the dashboard reads. */
export interface ItemReading {
  id: string;
  institution_name: string | null;
  status: PlaidItemStatus | string;
  last_successful_sync: string | null;
}

function toNumber(value: number | string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Net-worth trend series for the sparkline, oldest → newest. Input is the
 * dashboard query order (completed_at descending). Snapshot rows are only
 * inserted when values change, so this history IS the trend.
 */
export function netWorthTrend(snapshots: SnapshotReading[]): number[] {
  return [...snapshots].reverse().map((s) => toNumber(s.net_worth));
}

/** Net-worth movement vs. the previous snapshot, or null with fewer than 2 rows. */
export function netWorthDelta(
  snapshots: SnapshotReading[],
): { delta: number; tone: "up" | "down" | "flat" } | null {
  if (snapshots.length < 2) return null;
  const delta = toNumber(snapshots[0].net_worth) - toNumber(snapshots[1].net_worth);
  return { delta, tone: delta > 0 ? "up" : delta < 0 ? "down" : "flat" };
}

/** "Synced 2h ago" freshness text for a plaid_items.last_successful_sync. */
export function syncedAgo(iso: string | null, now: number = Date.now()): string {
  if (!iso) return "Not yet synced";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Not yet synced";
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return "Synced just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Synced ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Synced ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `Synced ${days}d ago`;
  return `Synced ${new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

/** True when any connection needs the user's attention (status != healthy). */
export function anyNeedsAttention(items: ItemReading[]): boolean {
  return items.some((item) => item.status !== "healthy");
}

/** The most recent successful sync across all items, or null when none synced. */
export function latestSync(items: ItemReading[]): string | null {
  let latest: string | null = null;
  for (const item of items) {
    if (!item.last_successful_sync) continue;
    if (!latest || new Date(item.last_successful_sync).getTime() > new Date(latest).getTime()) {
      latest = item.last_successful_sync;
    }
  }
  return latest;
}

/** Liquid savings from a plaid_sync snapshot state, or null when absent. */
export function snapshotLiquidSavings(state: Record<string, unknown> | null): number | null {
  if (!state || state.source !== "plaid_sync") return null;
  const value = state.liquidSavings;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export interface GoalProgress {
  /** 0-1, clamped. */
  ratio: number;
  saved: number;
  remaining: number;
}

/** Progress toward a goal target from the savings figure available. */
export function goalProgress(targetAmount: number, saved: number): GoalProgress {
  const target = Math.max(0, targetAmount);
  const have = Math.max(0, saved);
  if (target <= 0) return { ratio: 0, saved: have, remaining: 0 };
  return {
    ratio: Math.min(1, have / target),
    saved: have,
    remaining: Math.max(0, target - have),
  };
}

/**
 * Monthly-pace projection: "at your current cash flow, target reached
 * ~Month Year". Returns null whenever an honest projection is impossible —
 * no positive cash flow, or the target is already met (the card says so
 * instead). Capped at 50 years so a $5 surplus never claims a real date.
 */
export function goalProjection(
  targetAmount: number,
  saved: number,
  monthlyNetCashFlow: number | null,
  now: number = Date.now(),
): { months: number; label: string } | null {
  if (monthlyNetCashFlow === null || monthlyNetCashFlow <= 0) return null;
  const remaining = targetAmount - saved;
  if (remaining <= 0) return null;
  const months = Math.ceil(remaining / monthlyNetCashFlow);
  if (months > 600) return null;
  const date = new Date(now);
  date.setMonth(date.getMonth() + months);
  return {
    months,
    label: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
  };
}
