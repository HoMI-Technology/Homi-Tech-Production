"use client";

import { useEffect, useState } from "react";
import { VERDICT_META, type VerdictKey } from "@/lib/brand";
import { PILLAR_MAX_POINTS } from "@/lib/scoring/public";
import {
  bridgeCompleteness,
  scoreFromBudgetAsync,
  type PlannerScore,
} from "@/lib/planner/score-bridge";
import { usePlannerStore } from "@/lib/planner/store";
import {
  financialReality as financialRealityFn,
  upcomingBillsTotal,
} from "@/lib/planner/derived";

type Reality = ReturnType<typeof financialRealityFn>;

function formatMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatRunway(months: number): string {
  if (!Number.isFinite(months)) return "∞";
  return `${months.toFixed(1)} mo`;
}

export function ReadinessHero({
  reality,
  portfolioValue,
  netWorth,
  billsOpen,
}: {
  reality: Reality;
  portfolioValue: number;
  netWorth: number;
  billsOpen: number;
}) {
  const transactions = usePlannerStore((s) => s.transactions);
  const accounts = usePlannerStore((s) => s.accounts);
  const bills = usePlannerStore((s) => s.bills);
  const holdings = usePlannerStore((s) => s.holdings);
  const netWorthItems = usePlannerStore((s) => s.netWorthItems);
  const savingsGoal = usePlannerStore((s) => s.savingsGoal);
  const readinessProfile = usePlannerStore((s) => s.readinessProfile);
  const setReadinessProfile = usePlannerStore((s) => s.setReadinessProfile);

  const [score, setScore] = useState<PlannerScore | null>(null);
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoring, setScoring] = useState(false);

  const completeness = bridgeCompleteness({
    transactions,
    accounts,
    bills,
    holdings,
    netWorthItems,
    savingsGoal,
    readinessProfile,
  });

  useEffect(() => {
    if (!completeness.canShowLiveScore) {
      setScore(null);
      setScoreError(null);
      return;
    }
    let cancelled = false;
    setScoring(true);
    void scoreFromBudgetAsync({
      transactions,
      accounts,
      bills,
      holdings,
      netWorthItems,
      savingsGoal,
      readinessProfile,
    })
      .then((s) => {
        if (!cancelled) {
          setScore(s);
          setScoreError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setScore(null);
          setScoreError(
            err instanceof Error
              ? err.message
              : "Could not refresh score. Money changes are still saved.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setScoring(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    transactions,
    accounts,
    bills,
    holdings,
    netWorthItems,
    savingsGoal,
    readinessProfile,
    completeness.canShowLiveScore,
  ]);

  const verdict: VerdictKey | null = score?.verdict ?? null;
  const meta = verdict ? VERDICT_META[verdict] : null;

  return (
    <section className="glass rounded-xl border border-line p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="eyebrow text-cyan">HōMI-Score</p>
          {!completeness.canShowLiveScore ? (
            <div className="mt-3 space-y-3">
              <p className="font-display text-2xl italic text-light">
                Set a decision profile for a live score
              </p>
              <p className="text-sm text-dim">
                Financial gauges below update from your numbers. Emotional Truth
                and Timing need your profile so we never invent a credit band or
                hard-stop.
              </p>
              <button
                type="button"
                className="rounded-lg bg-cyan/15 px-4 py-2 text-sm font-medium text-cyan hover:bg-cyan/25"
                onClick={() =>
                  setReadinessProfile({
                    profileComplete: true,
                    creditScore: readinessProfile.creditScore || 700,
                    lifeStability: readinessProfile.lifeStability || 6,
                    confidenceLevel: readinessProfile.confidenceLevel || 6,
                    partnerAlignment: readinessProfile.partnerAlignment,
                    fomoLevel: readinessProfile.fomoLevel || 4,
                    timeHorizonMonths: readinessProfile.timeHorizonMonths || 12,
                  })
                }
              >
                Use starter profile (editable later)
              </button>
            </div>
          ) : scoring && !score ? (
            <p className="mt-4 font-score text-5xl text-dim">…</p>
          ) : score && meta ? (
            <>
              <div className="mt-2 flex flex-wrap items-end gap-3">
                <span className="font-score text-5xl tabular-nums text-light md:text-6xl">
                  {score.score.toFixed(0)}
                </span>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${meta.className}`}
                >
                  ✦ {meta.label}
                </span>
              </div>
              <p className="mt-1 text-sm text-dim">of 100 · live from your planner inputs</p>
              <p className="mt-3 text-sm text-light/90">{score.keyInsight}</p>
              <div className="mt-4 space-y-2">
                {(
                  [
                    ["Financial", score.pillarPct.financial, PILLAR_MAX_POINTS.financial],
                    ["Emotional", score.pillarPct.emotional, PILLAR_MAX_POINTS.emotional],
                    ["Timing", score.pillarPct.timing, PILLAR_MAX_POINTS.timing],
                  ] as const
                ).map(([label, pct]) => (
                  <div key={label}>
                    <div className="mb-1 flex justify-between text-xs text-dim">
                      <span>{label}</span>
                      <span className="font-score">{pct}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-surface">
                      <div
                        className="h-full rounded-full bg-cyan"
                        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-amber">
              {scoreError ?? "Score unavailable. Try again in a moment."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {[
            {
              label: "Cash flow",
              value: `${reality.cashFlow >= 0 ? "+" : ""}${formatMoney(reality.cashFlow)}`,
              tone: reality.cashFlow >= 0 ? "text-emerald" : "text-crimson",
            },
            {
              label: "Income",
              value: formatMoney(reality.income),
              tone: "text-emerald",
            },
            {
              label: "Spent",
              value: formatMoney(reality.expenses),
              tone: "text-light",
            },
            {
              label: "Saved",
              value: `${reality.savingsRate.toFixed(0)}%`,
              tone: "text-cyan",
            },
            {
              label: "Bank cash",
              value: formatMoney(reality.liquidCash),
              tone: "text-cyan",
            },
            {
              label: "Portfolio",
              value: formatMoney(portfolioValue),
              tone: "text-cyan",
            },
            {
              label: "Net worth",
              value: formatMoney(netWorth),
              tone: "text-cyan",
            },
            {
              label: "Bills open",
              value: formatMoney(billsOpen),
              tone: "text-amber",
            },
            {
              label: "Runway",
              value: formatRunway(reality.runwayMonths),
              tone: "text-emerald",
            },
            {
              label: "DTI",
              value: `${reality.dti.toFixed(0)}%`,
              tone: "text-emerald",
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className="rounded-lg border border-line/80 bg-navy/40 px-3 py-2"
            >
              <p className="text-[10px] uppercase tracking-wider text-dim">
                {tile.label}
              </p>
              <p className={`font-score text-sm tabular-nums sm:text-base ${tile.tone}`}>
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-dim">
        Educational guidance only — not financial, legal, tax, or investment advice.
        Live score is a planner instrument from your inputs; your official assessment
        record lives on Results.
      </p>
    </section>
  );
}
