"use client";

import { useEffect } from "react";
import type { VerdictKey } from "@/lib/brand";
import { LATEST_VERDICT_KEY } from "@/components/layout/SidebarDecisionState";
import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";

/**
 * One-shot backfill for the sidebar's decision state.
 *
 * SidebarDecisionState is read-only by construction and only ever sees what an
 * assessment completion wrote to localStorage. Users who assessed before that
 * writer existed have a real verdict in the database but nothing in storage, so
 * the rail renders its empty state on every visit. The dashboard already loads
 * the latest assessment row server-side; this writes it once, only when the key
 * is absent, so a fresher payload is never clobbered.
 */
export function SidebarVerdictSync({
  verdict,
  score,
  decisionType,
}: {
  verdict: VerdictKey | null;
  score: number | null;
  decisionType: string | null;
}) {
  useEffect(() => {
    if (!verdict || score === null) return;
    try {
      if (window.localStorage.getItem(LATEST_VERDICT_KEY)) return;
      window.localStorage.setItem(
        LATEST_VERDICT_KEY,
        JSON.stringify({
          verdict,
          score: Math.round(score),
          heldDays: 0,
          decisionType: decisionType
            ? (DECISION_TYPE_LABELS[decisionType as DecisionType] ?? decisionType)
            : null,
        }),
      );
      // The rail's effect already ran (it mounts above main), so nudge it.
      window.dispatchEvent(new StorageEvent("storage", { key: LATEST_VERDICT_KEY }));
    } catch {
      // Storage blocked (Safari private mode) — the rail keeps its empty state.
    }
  }, [verdict, score, decisionType]);

  return null;
}
