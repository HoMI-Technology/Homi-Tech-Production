"use client";

import { useEffect } from "react";
import type { VerdictKey } from "@/lib/brand";
import {
  LATEST_VERDICT_KEY,
  parseLatestVerdict,
} from "@/components/layout/SidebarDecisionState";
import { notifySidebarVerdictChanged } from "@/lib/assessment/storage";
import { DECISION_TYPE_LABELS, type DecisionType } from "@/lib/assessment/types";

export type SidebarVerdictPayload = {
  verdict: VerdictKey;
  score: number;
  decisionType: string | null;
  assessmentId?: string | null;
};

/**
 * Whether the dashboard should overwrite `homi-latest-verdict`.
 *
 * Write when the key is missing, or when score / verdict / assessment id /
 * decision label disagree with the server row. Do not write on a match — that
 * would reset `heldDays` to 0 on every Home visit.
 */
export function sidebarVerdictNeedsWrite(
  existingRaw: string | null,
  next: SidebarVerdictPayload,
): boolean {
  const existing = parseLatestVerdict(existingRaw);
  if (!existing) return true;
  if (existing.verdict !== next.verdict) return true;
  if (existing.score !== Math.round(next.score)) return true;
  const nextType = next.decisionType;
  if ((existing.decisionType ?? null) !== (nextType ?? null) && nextType != null) {
    return true;
  }
  if (
    next.assessmentId &&
    existing.assessmentId &&
    existing.assessmentId !== next.assessmentId
  ) {
    return true;
  }
  if (next.assessmentId && !existing.assessmentId) return true;
  return false;
}

/**
 * Mirror the server assessment onto the sidebar cache.
 *
 * SidebarDecisionState is read-only by construction. This is the writer that
 * keeps it honest: a stale `homi-latest-verdict` outlives every re-score if
 * we return early after the first write.
 */
export function SidebarVerdictSync({
  verdict,
  score,
  decisionType,
  assessmentId,
}: {
  verdict: VerdictKey | null;
  score: number | null;
  decisionType: string | null;
  assessmentId?: string | null;
}) {
  useEffect(() => {
    if (!verdict || score === null) return;
    try {
      const next: SidebarVerdictPayload = {
        verdict,
        score,
        decisionType: decisionType
          ? (DECISION_TYPE_LABELS[decisionType as DecisionType] ?? decisionType)
          : null,
        assessmentId: assessmentId ?? null,
      };
      const raw = window.localStorage.getItem(LATEST_VERDICT_KEY);
      if (!sidebarVerdictNeedsWrite(raw, next)) return;
      const existing = parseLatestVerdict(raw);
      window.localStorage.setItem(
        LATEST_VERDICT_KEY,
        JSON.stringify({
          verdict: next.verdict,
          score: Math.round(next.score),
          heldDays:
            existing &&
            existing.verdict === next.verdict &&
            existing.score === Math.round(next.score)
              ? existing.heldDays
              : 0,
          decisionType: next.decisionType,
          assessmentId: next.assessmentId ?? existing?.assessmentId ?? null,
        }),
      );
      notifySidebarVerdictChanged();
    } catch {
      // Storage blocked (Safari private mode) — the rail keeps its empty state.
    }
  }, [verdict, score, decisionType, assessmentId]);

  return null;
}
