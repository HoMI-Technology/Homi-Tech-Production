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
import { financialReality as financialRealityFn, upcomingBillsTotal } from "@/lib/planner/derived";

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

  const pillars = [
    {
      label: "Financial Reality",
      short: "Financial",
      pct: score?.pillarPct.financial ?? 0,
      bar: "bg-cyan",
      max: PILLAR_MAX_POINTS.financial,
    },
    {
      label: "Emotional Truth",
      short: "Emotional",
      pct: score?.pillarPct.emotional ?? 0,
      bar: "bg-emerald",
      max: PILLAR_MAX_POINTS.emotional,
    },
    {
      label: "Perfect Timing",
      short: "Timing",
      pct: score?.pillarPct.timing ?? 0,
      bar: "bg-yellow",
      max: PILLAR_MAX_POINTS.timing,
    },
  ] as const;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-slate-surface/55 via-navy-light/40 to-navy/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-7">
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-cyan/[0.07] blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-10 h-48 w-48 rounded-full bg-emerald/[0.05] blur-3xl"
        aria-hidden
      />

      <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-2xs font-bold uppercase tracking-[0.16em] text-cyan">HōMI-Score</p>
            {completeness.canShowLiveScore && score ? (
              <span className="rounded-full border border-white/10 bg-navy/50 px-2 py-0.5 text-3xs font-medium uppercase tracking-wide text-dim">
                Live instrument
              </span>
            ) : null}
          </div>

          {!completeness.canShowLiveScore ? (
            <div className="mt-4 space-y-4">
              <p className="font-display text-2xl leading-snug tracking-tight text-light sm:text-3xl">
                Set a decision profile for a live score
              </p>
              <p className="max-w-md text-sm leading-relaxed text-dim">
                Financial gauges update from your numbers. Emotional Truth and Timing need your
                profile so we never invent a credit band or hard-stop.
              </p>
              <button
                type="button"
                className="inline-flex rounded-xl bg-cyan/15 px-4 py-2.5 text-sm font-semibold text-cyan transition-colors hover:bg-cyan/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
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
            <p className="mt-6 font-score text-6xl tabular-nums text-dim/50">…</p>
          ) : score && meta ? (
            <>
              <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
                <span className="font-score text-6xl tabular-nums leading-none tracking-tight text-light md:text-7xl">
                  {score.score.toFixed(0)}
                </span>
                <div className="mb-1.5 flex flex-col gap-1">
                  <span
                    className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold tracking-wide ${meta.className}`}
                  >
                    {meta.label}
                  </span>
                  <span className="text-xs text-dim">of 100 · planner inputs</span>
                </div>
              </div>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-light/90">
                {score.keyInsight}
              </p>
              <div className="mt-6 space-y-3">
                {pillars.map((p) => (
                  <div key={p.short}>
                    <div className="mb-1.5 flex justify-between text-xs">
                      <span className="font-medium text-dim">{p.short}</span>
                      <span className="font-score tabular-nums text-light/80">{p.pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-navy/80 ring-1 ring-white/[0.04]">
                      <div
                        className={`h-full rounded-full ${p.bar} transition-[width] duration-500 ease-out`}
                        style={{
                          width: `${Math.min(100, Math.max(0, p.pct))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="mt-4 text-sm text-amber">
              {scoreError ?? "Score unavailable. Try again in a moment."}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 content-start sm:gap-3">
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
              tone: "text-light",
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
              className="rounded-xl border border-white/[0.06] bg-navy/55 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-colors hover:border-cyan/20"
            >
              <p className="text-3xs font-semibold uppercase tracking-[0.12em] text-dim">
                {tile.label}
              </p>
              <p
                className={`mt-1 font-score text-base tabular-nums tracking-tight sm:text-lg ${tile.tone}`}
              >
                {tile.value}
              </p>
            </div>
          ))}
        </div>
      </div>
      <p className="relative mt-6 border-t border-white/[0.06] pt-4 text-2xs leading-relaxed text-dim">
        Metrics above read the <span className="text-light">on-device Track planner store</span>{" "}
        (transactions, accounts, bills) — not the Stand ledger and not Plaid bank position. Educational
        guidance only — not financial, legal, tax, or investment advice. Live score is a planner
        instrument; your official assessment record lives on Results.
      </p>
    </section>
  );
}
