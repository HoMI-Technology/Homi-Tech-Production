"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { ScoreRail, type ScoreRailReading } from "@/components/score/ScoreRail";
import { useCfm } from "@/hooks/use-cfm";
import { COLORS, VERDICT_META } from "@/lib/brand";
import { standCashReading } from "@/lib/dashboard/home-money-standing";
import { loadStandMetrics } from "@/lib/finance/load-stand-metrics";
import {
  completenessLabel,
  type NamedMoneyMetrics,
} from "@/lib/finance/metrics";
import type { FinanceCompleteness } from "@/lib/finance/readiness-snapshot";
import { cashFlowTemperature, runwayTemperature, type Temperature } from "@/lib/finance/store";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { ObservedPrefillCard } from "@/components/finance/ObservedPrefillCard";
import { InvestmentsSummary } from "@/components/money/InvestmentsSummary";
import { MoneyRecheckPrompt } from "@/components/money/MoneyRecheckPrompt";
import { ProvenanceLine } from "@/components/results/ProvenanceLine";
import { loadConfirmedFinancePrefill } from "@/lib/finance/prefill-confirm";
import type { AssessmentProvenance } from "@/lib/scoring/public";

const TEMP_COLOR: Record<Temperature, string> = {
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
  amber: COLORS.amber,
  crimson: COLORS.crimson,
};

const TEMP_WORD: Record<Temperature, string> = {
  emerald: "Steady",
  yellow: "Watch",
  amber: "Strain",
  crimson: "At risk",
};

const GRADE_COLOR: Record<FinanceCompleteness, string> = {
  high: COLORS.emerald,
  medium: COLORS.yellow,
  low: COLORS.amber,
};

/**
 * Stand mode — OPERATE instrument backed by named metrics + CFM honesty meta.
 * Works after planner absorb (no use-finance-dashboard).
 *
 * One column, one reading of each figure: the hero carries net cash plus the
 * four headline metrics as a single data strip, and the secondary strip
 * carries the evidence behind them. Nothing here is printed twice.
 *
 * Reality redesign (Phase 2): a compact ScoreRail top rail carries the
 * Decision Readiness Score + verdict + three pillars above the cash instrument (server-
 * passed from the latest completed assessment — no client fetch, no invented
 * numbers). Steady Cash stays the dominant number; the rail never competes
 * with it. Cash data logic (loadStandMetrics + standCashReading, completeness,
 * temperature) is untouched.
 */
export function MoneyStand({ readiness = null }: { readiness?: ScoreRailReading | null }) {
  const { cfm, hydrated: cfmHydrated } = useCfm();
  const [metrics, setMetrics] = useState<NamedMoneyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState<ReturnType<typeof loadConfirmedFinancePrefill>>(null);

  useEffect(() => {
    setConfirmed(loadConfirmedFinancePrefill());
    setMetrics(loadStandMetrics());
    setLoading(false);
  }, []);

  const ready = metrics !== null;
  const completeness: FinanceCompleteness =
    cfm?.meta.completeness ?? metrics?.evidence.completeness ?? "low";
  const chipLabel = !ready ? "No picture yet" : completenessLabel(completeness);
  const chipColor = !ready ? COLORS.dim : GRADE_COLOR[completeness];

  const cash = standCashReading(metrics);
  const surplus = cash.dollars ?? 0;
  const income = metrics?.surplus.incomeDollars ?? 0;
  const runwayMonths = metrics?.runway.months ?? null;
  const savingsRate = metrics?.savingsRatePct ?? 0;
  const dti = metrics?.dti.pct;
  const liquid = metrics?.runway.liquidDollars ?? 0;
  const debtHonest = metrics?.evidence.hasDebtSignal === true;

  /**
   * "Linked" means bank-linked transactions are actually in the ledger — not
   * merely "some money data is saved". A hand-typed picture never lights it.
   */
  const linked = metrics !== null && metrics.evidence.sourceMode !== "manual";
  const moneyProvenance: AssessmentProvenance = {
    dti: "self_report",
    downPayment: confirmed?.downPaymentEarmarked ? "ledger_earmark" : "self_report",
    runway: "self_report",
    credit: "band_ignored",
    lookbackDays: confirmed?.lookbackDays ?? null,
  };

  const cashTemp = ready ? cashFlowTemperature(surplus, income) : "amber";
  const runwayTemp = ready && runwayMonths != null ? runwayTemperature(runwayMonths) : "amber";
  const tint = ready ? TEMP_COLOR[cashTemp] : COLORS.cyan;

  const liquidNote =
    metrics?.evidence.liquidSource === "emergency_goal"
      ? "Emergency goal balance"
      : metrics?.evidence.liquidSource === "goal_proxy"
        ? "Goal balance (proxy — not full liquid)"
        : metrics?.evidence.liquidSource === "legacy_snapshot"
          ? "Legacy snapshot"
          : "Liquid not recorded";

  const asOfLabel = cash.asOfLabel;

  const primaryAction = !ready
    ? { label: "Open Ledger", href: "/money/budget" }
    : completeness === "low"
      ? { label: "Strengthen picture", href: "/money/budget" }
      : { label: "Stress a decision", href: "/money/decide" };

  const secondaryAction = ready
    ? { label: "Open Path", href: "/path" }
    : { label: "Connect bank", href: "/connections" };

  /**
   * Compact readiness top rail — server-known, so it renders even while the
   * on-device ledger hydrates below. No assessment → honest "Unknown" slim
   * rail with the Assess close, never an invented number.
   */
  const scoreRail = readiness ? (
    <ScoreRail
      variant="compact"
      score={readiness.score}
      verdict={readiness.verdict}
      pillars={readiness.pillars}
      tint={readiness.verdict ? VERDICT_META[readiness.verdict].color : COLORS.cyan}
    />
  ) : (
    <section
      data-score-rail="compact"
      aria-label="Readiness score"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-white/8 bg-navy-light/40 px-4 py-3"
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dim">
        <span className="text-2xs font-bold uppercase tracking-[0.16em] text-dim">
          Decision Readiness Score
        </span>
        <span className="score-numeral text-lg font-semibold text-light" aria-label="Decision Readiness Score Unknown">
          —
        </span>
        <span>Unknown until your first assessment.</span>
      </p>
      <Link href="/assessment" className="btn btn-ghost btn-sm sm:ml-auto">
        Assess
      </Link>
    </section>
  );

  if (loading || !cfmHydrated) {
    return (
      <div className="space-y-6" aria-busy="true">
        {scoreRail}
        <div className="h-56 animate-pulse rounded-2xl bg-slate-surface/40" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-surface/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top rail: Decision Readiness Score + verdict + pillars (cash stays dominant) ── */}
      {scoreRail}
      {/* ── Hero instrument: status, the one dominant number, headline metrics ── */}
      <OperateInstrument tint={tint}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line/70 px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-[0.12em] text-dim">
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: chipColor }}
                />
                {chipLabel}
              </span>
              {cash.sourceLabel ? (
                <span
                  className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim/80"
                  data-stand-money-source=""
                >
                  {cash.sourceLabel}
                </span>
              ) : null}
              {asOfLabel && (
                <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim/80">
                  {asOfLabel}
                </span>
              )}
              {ready && (
                <span
                  className="text-2xs font-semibold uppercase tracking-[0.12em]"
                  style={{ color: TEMP_COLOR[cashTemp] }}
                >
                  {TEMP_WORD[cashTemp]} cash flow
                </span>
              )}
              {linked && (
                <span
                  className="inline-flex items-center gap-1 text-2xs font-semibold uppercase tracking-[0.12em]"
                  style={{ color: COLORS.emerald }}
                >
                  <span
                    aria-hidden
                    className="size-1.5 rounded-full motion-safe:animate-pulse"
                    style={{ backgroundColor: COLORS.emerald }}
                  />
                  Bank linked
                </span>
              )}
              {linked && metrics!.evidence.pendingTransactionCount > 0 && (
                <span className="text-2xs font-semibold uppercase tracking-[0.12em] text-dim/80">
                  Last-known · {metrics!.evidence.pendingTransactionCount} pending — updates as
                  they post
                </span>
              )}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-dim">
              {cash.label}
            </p>
            <div
              className="mt-1 block"
              style={{ color: ready ? TEMP_COLOR[cashTemp] : COLORS.light }}
              data-stand-money-surplus=""
            >
              {ready && cash.dollars != null ? (
                <AnimatedNumber
                  value={cash.dollars}
                  format={(n) => formatCurrency(n)}
                  className="score-numeral num-money block text-6xl font-bold tracking-tight sm:text-7xl"
                />
              ) : (
                <span className="score-numeral num-money block text-6xl font-bold tracking-tight sm:text-7xl">
                  —
                </span>
              )}
            </div>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-dim/70">
              {ready
                ? `${cash.formula} Source: ${cash.sourceLabel ?? "Stand ledger"} — not Track planner, not Pre-Flight inputs.`
                : "No picture yet. Open Ledger or connect a bank to begin."}
            </p>
          </div>

          {/* Headline metrics — one strip, no tile grid, no second card. */}
          <div className="money-data-strip w-full lg:max-w-md">
            <DataCell
              label="Income"
              value={ready ? formatCurrency(income) : "—"}
              color={COLORS.cyan}
            />
            <DataCell
              label="Runway"
              value={
                ready && runwayMonths != null
                  ? `${runwayMonths.toFixed(1)} mo`
                  : ready
                    ? "Unknown"
                    : "—"
              }
              color={ready && runwayMonths == null ? COLORS.dim : TEMP_COLOR[runwayTemp]}
            />
            <DataCell
              label="Savings rate"
              value={ready && savingsRate != null ? formatPercent(savingsRate) : "—"}
              color={COLORS.emerald}
            />
            <DataCell
              label="DTI"
              value={
                ready && debtHonest && dti != null
                  ? formatPercent(dti)
                  : ready
                    ? "Unknown"
                    : "—"
              }
              color={debtHonest ? COLORS.yellow : COLORS.dim}
            />
          </div>
        </div>
      </OperateInstrument>

      {/* ── Secondary row: the evidence behind the headline figures ── */}
      <div className="money-data-strip glass">
        <DataCell
          label="Liquid / goal balance"
          value={ready ? formatCurrency(liquid) : "—"}
          footer={liquidNote}
          color={COLORS.cyan}
        />
        <DataCell
          label="Debt signal"
          value={debtHonest ? "Recorded" : "Not recorded"}
          footer={
            debtHonest ? "Debt payments categorized" : "Categorize debt payments for honest DTI"
          }
          color={debtHonest ? COLORS.light : COLORS.dim}
        />
        <DataCell
          label="Evidence"
          value={ready ? `${metrics!.evidence.monthsWithData} mo` : "—"}
          footer={ready ? metrics!.evidence.sourceMode : "Open Budget to start"}
          color={COLORS.emerald}
        />
      </div>

      {/* ── Investments fold (Phase 5): compact summary + entry point to the
          full /money/investments sub-route — below the Steady Cash instrument,
          never above the ScoreRail. The route stays live; no UI duplication. ── */}
      <InvestmentsSummary />

      <ProvenanceLine provenance={moneyProvenance} />
      <MoneyRecheckPrompt metrics={metrics} />
      <ObservedPrefillCard />

      {ready && completeness === "low" && (
        <p
          className="rounded-xl border border-yellow/40 bg-yellow/5 px-4 py-3 text-sm text-dim"
          role="status"
        >
          Partial picture — more evidence makes the reading honest. Treat every number as a
          draft: add more months, categorize spending, or connect a bank before acting on a big
          decision.
        </p>
      )}

      {/* ── Next move: the sentence and the buttons, no dock chrome ── */}
      <div className="space-y-3 pt-1">
        <p className="max-w-xl text-base font-semibold tracking-tight text-light sm:text-lg">
          {!ready
            ? "Start with your real numbers — open Budget Planner."
            : completeness === "low"
              ? "Your picture is thin. More data means honest readiness language."
              : "Stress the decision before you stretch."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link href={primaryAction.href} className="btn btn-primary">
            {primaryAction.label}
          </Link>
          <Link href={secondaryAction.href} className="btn btn-ghost">
            {secondaryAction.label}
          </Link>
          {ready && (
            <Link href="/money/plan" className="btn btn-ghost">
              Plan
            </Link>
          )}
        </div>
        {ready && (
          <p className="text-xs text-dim">
            Updated your numbers?{" "}
            <Link href="/assessment" className="text-cyan underline-offset-2 hover:underline">
              Reassess your readiness
            </Link>
          </p>
        )}
      </div>

      <p className="max-w-2xl text-xs leading-relaxed text-dim/70">
        HōMI Money is educational. It does not provide financial, tax, mortgage, or investment
        advice. Confirm critical numbers with qualified professionals before you act.
      </p>
    </div>
  );
}

/** One cell of a data strip: label, figure, optional footer note. No box. */
function DataCell({
  label,
  value,
  footer,
  color,
}: {
  label: string;
  value: string;
  footer?: string;
  color: string;
}) {
  return (
    <div className="money-data-cell">
      <p className="text-3xs font-semibold uppercase tracking-[0.12em] text-dim">{label}</p>
      <p className="score-numeral num mt-1 text-lg font-semibold" style={{ color }}>
        {value}
      </p>
      {footer != null && <p className="mt-1 text-3xs leading-tight text-dim/60">{footer}</p>}
    </div>
  );
}
