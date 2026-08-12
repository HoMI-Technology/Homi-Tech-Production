"use client";

/**
 * Money · Goals — the goals tab, promoted out of Track.
 *
 * The goals UI already exists as components/planner/goals/GoalsCommand, and it
 * is already DB-backed: the budget ledger holding the goals reconciles against
 * /api/finance/savings-goals through lib/finance/goal-sync. Rendering a second,
 * separately-fetched goals list here would have given the product two goal
 * stores that disagree, so this surface reuses the one that exists and does the
 * one thing Track's tab does not — pulls the server copy before first paint, so
 * a goal made on another device is visible the moment the tab opens.
 *
 * The sync is capped: a slow or dead network must not hold the surface hostage,
 * and GoalsCommand renders perfectly well from the local ledger alone.
 */

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ProductLoadingSkeleton } from "@/components/ui/ProductLoadingSkeleton";
import { runLedgerServerSync } from "@/lib/planner/use-ledger-sync";
import { LEGAL_DISCLAIMER } from "@/lib/brand";

const GoalsCommand = dynamic(
  () => import("@/components/planner/goals/GoalsCommand").then((m) => m.GoalsCommand),
  { ssr: false, loading: () => <ProductLoadingSkeleton label="Loading goals" rows={3} /> },
);

/** Longest we make anyone wait on the pull before falling back to local. */
const SYNC_CAP_MS = 2500;

export function GoalsSurface() {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let active = true;
    const done = () => {
      if (active) setSettled(true);
    };
    const cap = window.setTimeout(done, SYNC_CAP_MS);
    void runLedgerServerSync().then(done, done);
    return () => {
      active = false;
      window.clearTimeout(cap);
    };
  }, []);

  return (
    <div className="space-y-6">
      <header>
        <p className="eyebrow">Money · goals</p>
        <h1 className="mt-1 font-display text-2xl text-light md:text-3xl">
          What you&rsquo;re saving toward
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">
          Every goal, its funded share, and what the planned monthly contribution actually buys
          you. Synced to your account, so it follows you to your other devices.
        </p>
      </header>

      {settled ? (
        <GoalsCommand />
      ) : (
        <ProductLoadingSkeleton label="Loading goals" rows={3} />
      )}

      <footer className="border-t border-white/[0.06] pt-6">
        <p className="text-xs leading-relaxed text-dim">{LEGAL_DISCLAIMER}</p>
      </footer>
    </div>
  );
}
