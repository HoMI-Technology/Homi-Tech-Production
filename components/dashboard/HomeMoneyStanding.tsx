"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COLORS } from "@/lib/brand";
import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger } from "@/lib/finance/metrics";
import {
  buildHomeMoneyStandingView,
  type HomeMoneyStandingView,
} from "@/lib/dashboard/home-money-standing";
import { formatCurrency } from "@/lib/tools/format";

/**
 * Home money standing — where cash sits + how solid the picture is.
 * Same on-device ledger SoT as Money Stand. Path stays the fold hero;
 * this strip is the Rocket-adjacent "current standing" under Companion.
 */
export function HomeMoneyStanding() {
  const [view, setView] = useState<HomeMoneyStandingView | null>(null);

  useEffect(() => {
    const nowIso = new Date().toISOString();
    if (!hasSavedBudgetLedger()) {
      setView(buildHomeMoneyStandingView(null));
      return;
    }
    const ledger = loadBudgetLedger(nowIso);
    const metrics = metricsFromLedger(ledger, nowIso, budgetLedgerSavedAt());
    if (!metrics.evidence.hasIncome && !metrics.evidence.hasExpenses && metrics.evidence.monthsWithData === 0) {
      setView(buildHomeMoneyStandingView(null));
      return;
    }
    setView(buildHomeMoneyStandingView(metrics));
  }, []);

  if (!view) {
    return (
      <div
        className="mt-5 h-28 animate-pulse rounded-xl border border-white/5 bg-slate-surface/30"
        data-home-money-standing="loading"
        aria-busy="true"
        aria-label="Loading money standing"
      />
    );
  }

  const ready = view.status === "ready";
  const surplusDisplay =
    view.surplusDollars != null ? formatCurrency(view.surplusDollars) : "—";
  const runwayDisplay =
    view.runwayMonths != null && Number.isFinite(view.runwayMonths)
      ? `${view.runwayMonths >= 10 ? view.runwayMonths.toFixed(0) : view.runwayMonths.toFixed(1)} mo`
      : "—";
  const liquidDisplay =
    view.liquidDollars != null ? formatCurrency(view.liquidDollars) : "—";

  return (
    <section
      className="mt-5 rounded-xl border border-white/8 bg-navy-light/40 px-4 py-4 sm:px-5"
      data-home-money-standing={view.status}
      aria-label="Money standing"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <p className="eyebrow">Money standing</p>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.12em] text-dim">
          <span
            aria-hidden
            className="size-1.5 rounded-full"
            style={{ backgroundColor: view.chipColor }}
          />
          {view.chipLabel}
        </span>
        {view.asOfLabel ? (
          <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim/80">
            {view.asOfLabel}
          </span>
        ) : null}
        {view.cashTempWord ? (
          <span
            className="text-2xs font-semibold uppercase tracking-[0.12em]"
            style={{ color: view.cashTempColor }}
          >
            {view.cashTempWord} cash flow
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">
            {view.surplusLabel}
          </p>
          <p
            className="score-numeral mt-1 text-3xl font-semibold tabular-nums sm:text-4xl"
            style={{ color: ready ? view.cashTempColor : COLORS.light }}
            data-home-money-surplus=""
          >
            {surplusDisplay}
          </p>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-dim">{view.standingLine}</p>
          {view.liquidNote ? (
            <p className="mt-1 text-xs text-dim/70">{view.liquidNote}</p>
          ) : null}
        </div>

        <div className="money-data-strip w-full sm:max-w-xs" data-home-money-strip="">
          <div className="money-data-cell">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim">Runway</p>
            <p className="score-numeral mt-1 text-lg text-light">{runwayDisplay}</p>
          </div>
          <div className="money-data-cell">
            <p className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim">Liquid</p>
            <p className="score-numeral mt-1 text-lg text-light">{liquidDisplay}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href={view.primaryHref} className="btn btn-primary btn-sm">
          {view.primaryLabel}
        </Link>
        <Link href={view.secondaryHref} className="btn btn-ghost btn-sm">
          {view.secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
