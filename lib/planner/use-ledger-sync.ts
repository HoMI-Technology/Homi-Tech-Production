"use client";

/**
 * Mounts the money ledger's server sync.
 *
 * lib/finance/ledger-sync.ts has existed since Budget & Runway PR 4 with no
 * callers anywhere, which meant transactions, periods, allocations and goals
 * lived only in this browser's localStorage. local-ledger.ts is explicit that
 * storage is "a cache, not an archive" — Safari private mode rejects writes and
 * iOS evicts it after seven days without interaction. Clearing site data lost
 * the money picture outright, and it never followed anyone to a second device.
 *
 * This is the piece that makes it durable rather than merely recoverable.
 *
 * Deliberately not gated on a client auth check. /money is in
 * PROTECTED_PRODUCT_ROUTES, so the middleware has already established a session
 * before Track renders; an expired one lands on the 401 path inside
 * reconcileBudgetLedger, which no-ops. Importing a Supabase browser client here
 * to re-ask a question the middleware already answered would add a bundle and a
 * hydration-time auth race for nothing.
 *
 * Local remains the synchronous source of truth: this runs after hydration and
 * nothing waits on it.
 */

import { useEffect, useRef } from "react";
import { reconcileBudgetLedger } from "@/lib/finance/ledger-sync";
import { reconcileGoals } from "@/lib/finance/goal-sync";
import { scrubPersistedDemoWorkspace } from "@/lib/planner/demo-ledger-scrub";
import { syncPlannerWithLedger } from "@/lib/planner/ledger-bridge";

export type LedgerSyncOutcome = "synced" | "skipped" | "failed";

/**
 * One reconcile pass, then re-project the ledger into the planner store so
 * anything pulled from the server is visible without a reload.
 *
 * Never throws: sync is best-effort by design and a network failure must not
 * take down the Track surface, which works entirely from local state.
 */
export async function runLedgerServerSync(
  nowIso: string = new Date().toISOString(),
): Promise<LedgerSyncOutcome> {
  if (typeof window === "undefined") return "skipped";
  try {
    scrubPersistedDemoWorkspace();
    const next = await reconcileBudgetLedger(nowIso);
    if (!next) return "skipped";
    // Goals after transactions, and sequentially: both passes read and write
    // the same ledger blob, so overlapping them would let one overwrite the
    // other's markers with a stale copy.
    await reconcileGoals(nowIso);
    syncPlannerWithLedger();
    return "synced";
  } catch {
    return "failed";
  }
}

/**
 * Runs the pass once per mount, when `enabled` first goes true.
 *
 * The ref guard matters: PlannerApp settles hydration through three separate
 * paths (persist callback, already-hydrated check, and an 800ms timeout), and
 * without it a slow hydration would fire overlapping passes that race each
 * other through saveBudgetLedger.
 */
export function useLedgerServerSync(enabled: boolean): void {
  const started = useRef(false);
  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void runLedgerServerSync();
  }, [enabled]);
}
