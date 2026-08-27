"use client";

import { useEffect, useState } from "react";
import { VERDICT_META, withAlpha, type VerdictKey } from "@/lib/brand";
import { financeSavedAt } from "@/lib/finance/store";
import { budgetLedgerSavedAt } from "@/lib/finance/local-ledger";
import {
  bandProgress,
  freshestIso,
  moneyFreshnessLabel,
  scoreFromLabel,
} from "@/lib/dashboard/score-progress";
import { ScoreDeltaBadge } from "@/components/dashboard/ScoreDeltaBadge";

/**
 * Score progress + freshness card. Sits below the hero numeral on the
 * signed-in Home fold and answers three honest questions: where the score
 * sits, what the next verdict band costs, and how stale the inputs are.
 *
 * Client component because money freshness lives in localStorage — the
 * money half of the freshness line mounts only after hydration, so the
 * server HTML never claims a freshness it cannot know.
 */
export function ScoreProgressCard({
  score,
  verdict,
  scoreDate,
  previousScore,
  previousDate,
}: {
  /** Whole 0–100 score as rendered in the hero. */
  score: number;
  verdict: VerdictKey;
  /** ISO timestamp of the scored assessment (completed_at ?? created_at). */
  scoreDate: string | null;
  previousScore?: number | null;
  previousDate?: string | null;
}) {
  const [moneyLabel, setMoneyLabel] = useState<string | null>(null);
  useEffect(() => {
    setMoneyLabel(moneyFreshnessLabel(freshestIso(financeSavedAt(), budgetLedgerSavedAt())));
  }, []);

  const meta = VERDICT_META[verdict];
  const progress = bandProgress(score);
  const { next } = progress;
  const fromLabel = scoreFromLabel(scoreDate);
  // Bar spans the current band only: floor → next threshold (or 100 at READY).
  const bandTop = next ? next.threshold : 100;
  const bandSpan = Math.max(1, bandTop - progress.floor);
  const fillPct = Math.max(0, Math.min(100, ((score - progress.floor) / bandSpan) * 100));

  return (
    <div
      className="rounded-xl border border-slate-surface/60 bg-slate-surface/40 p-4"
      data-score-progress=""
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="score-numeral text-2xl font-bold text-light">{score}</span>
        <span className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: meta.color }}>
          {meta.label}
        </span>
        {previousScore != null && previousDate && (
          <ScoreDeltaBadge current={score} previous={previousScore} previousDate={previousDate} />
        )}
      </div>

      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-surface"
        role="progressbar"
        aria-valuemin={progress.floor}
        aria-valuemax={bandTop}
        aria-valuenow={score}
        aria-label={
          next
            ? `Progress toward ${VERDICT_META[next.verdict].label}`
            : "Top verdict band reached"
        }
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${fillPct}%`, background: meta.color, boxShadow: `0 0 8px ${withAlpha(meta.color, 0.6)}` }}
        />
      </div>

      <p className="mt-2 text-xs text-dim" data-score-progress-next="">
        {next
          ? `${next.pointsNeeded} point${next.pointsNeeded === 1 ? "" : "s"} to ${VERDICT_META[next.verdict].label}`
          : "Top band reached"}
      </p>

      <p className="mt-2 text-3xs uppercase tracking-[0.12em] text-dim/80" data-score-freshness="">
        {fromLabel}
        {moneyLabel ? `${fromLabel ? " · " : ""}${moneyLabel}` : ""}
      </p>
    </div>
  );
}
