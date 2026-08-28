"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { COLORS } from "@/lib/brand";
import {
  buildHomeMoneyStandingView,
  type HomeMoneyStandingView,
} from "@/lib/dashboard/home-money-standing";
import { loadStandMetrics } from "@/lib/finance/load-stand-metrics";
import { formatCurrency } from "@/lib/tools/format";
import { MONEY_MODES } from "@/components/money/MoneyModeNav";

/** The four working modes. Readiness is the surface this strip renders on. */
const WORKING_MODES = MONEY_MODES.filter((m) => m.id !== "readiness");

/**
 * Home money standing — where cash sits + how solid the picture is.
 * Same on-device ledger SoT as Money Stand. Path stays the fold hero;
 * this strip is depth-adjacent standing under Companion — never a tools grid,
 * never a filled primary button (see docs/MONEY-TOOLS-DEPTH.md).
 */
export function HomeMoneyStanding() {
  const [view, setView] = useState<HomeMoneyStandingView | null>(null);

  useEffect(() => {
    setView(buildHomeMoneyStandingView(loadStandMetrics()));
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
        {view.sourceLabel ? (
          <span
            className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim/80"
            data-home-money-source=""
          >
            {view.sourceLabel}
          </span>
        ) : null}
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
        {/* Ghost + sm only — Path fold owns the single viewport primary. */}
        <Link href={view.primaryHref} className="btn btn-ghost btn-sm">
          {view.primaryLabel}
        </Link>
        <Link href={view.secondaryHref} className="btn btn-ghost btn-sm">
          {view.secondaryLabel}
        </Link>
      </div>

      {/*
        The modes, inline — DESKTOP ONLY (lg+).

        Money is not a place you open before you can work, so the four working
        modes are reachable from Home directly and "Open Money" is never the
        only door. But below lg, ProductBottomNav already renders all five
        modes as fixed chrome: rendering them here too would state the same
        navigation twice in one viewport, which is the redundancy fault this
        redesign exists to remove. Labels and blurbs come from MONEY_MODES —
        the same source the rail and the bottom bar read.
      */}
      <div className="mt-4 hidden border-t border-white/8 pt-3 lg:block">
        <p className="eyebrow">Work here</p>
        <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2" data-home-money-modes="">
          {WORKING_MODES.map((mode) => (
            <li key={mode.id}>
              <Link
                href={mode.href}
                className="panel-focus flex min-h-11 flex-col justify-center rounded-lg border border-white/8 px-3 py-2 transition-colors hover:border-cyan/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
              >
                <span className="text-sm font-semibold text-light">{mode.label}</span>
                {/* text-light, not text-dim: canon approves dim-on-navy only at
                    >=14px (globals.css contrast pairings). Hierarchy comes from
                    weight and size, not from dropping contrast. */}
                <span className="text-2xs leading-snug text-light/90">{mode.blurb}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
