"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OperateInstrument } from "@/components/operate/OperateInstrument";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useCfm } from "@/hooks/use-cfm";
import { COLORS } from "@/lib/brand";
import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import {
  completenessLabel,
  metricsFromLedger,
  PERIOD_SURPLUS_FORMULA,
  PERIOD_SURPLUS_LABEL,
  type NamedMoneyMetrics,
} from "@/lib/finance/metrics";
import type { FinanceCompleteness } from "@/lib/finance/readiness-snapshot";
import { cashFlowTemperature, runwayTemperature, type Temperature } from "@/lib/finance/store";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { ObservedPrefillCard } from "@/components/finance/ObservedPrefillCard";
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
 */
export function MoneyStand() {
  const { cfm, hydrated: cfmHydrated } = useCfm();
  const [metrics, setMetrics] = useState<NamedMoneyMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmed, setConfirmed] = useState<ReturnType<typeof loadConfirmedFinancePrefill>>(null);

  useEffect(() => {
    setConfirmed(loadConfirmedFinancePrefill());
    const nowIso = new Date().toISOString();
    if (!hasSavedBudgetLedger()) {
      setMetrics(null);
      setLoading(false);
      return;
    }
    const ledger = loadBudgetLedger(nowIso);
    const m = metricsFromLedger(ledger, nowIso, budgetLedgerSavedAt());
    // No real picture yet
    if (!m.evidence.hasIncome && !m.evidence.hasExpenses && m.evidence.monthsWithData === 0) {
      setMetrics(null);
    } else {
      setMetrics(m);
    }
    setLoading(false);
  }, []);

  const ready = metrics !== null;
  const completeness: FinanceCompleteness =
    cfm?.meta.completeness ?? metrics?.evidence.completeness ?? "low";
  const chipLabel = !ready ? "No picture yet" : completenessLabel(completeness);
  const chipColor = !ready ? COLORS.dim : GRADE_COLOR[completeness];

  const surplus = metrics?.surplus.dollars ?? 0;
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

  const asOf = metrics?.asOf ?? cfm?.meta.savedAt ?? null;
  const asOfLabel = useMemo(() => {
    if (!asOf) return ready ? "Age unknown" : null;
    const days = Math.floor((Date.now() - new Date(asOf).getTime()) / 86_400_000);
    if (!Number.isFinite(days) || days < 0) return "Age unknown";
    if (days === 0) return "Updated today";
    if (days === 1) return "Updated yesterday";
    return `Updated ${days}d ago`;
  }, [asOf, ready]);

  const primaryAction = !ready
    ? { label: "Open your picture", href: "/money/budget" }
    : completeness === "low"
      ? { label: "Strengthen picture", href: "/money/budget" }
      : { label: "Stress a decision", href: "/money/decide" };

  const secondaryAction = ready
    ? { label: "Open Path", href: "/path" }
    : { label: "Connect bank", href: "/connections" };

  if (loading || !cfmHydrated) {
    return (
      <div className="space-y-6" aria-busy="true">
        <div className="h-56 animate-pulse rounded-2xl bg-slate-surface/40" />
        <div className="h-20 animate-pulse rounded-xl bg-slate-surface/30" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
                    className="size-1.5 animate-pulse rounded-full"
                    style={{ backgroundColor: COLORS.emerald }}
                  />
                  Bank linked
                </span>
              )}
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-dim">
              {PERIOD_SURPLUS_LABEL}
            </p>
            <div
              className="mt-1 block"
              style={{ color: ready ? TEMP_COLOR[cashTemp] : COLORS.light }}
            >
              <AnimatedNumber
                value={ready ? surplus : 0}
                format={(n) => formatCurrency(n)}
                className="score-numeral num-money block text-6xl font-bold tracking-tight sm:text-7xl"
              />
            </div>
            <p className="mt-3 max-w-xl text-xs leading-relaxed text-dim/70">
              {ready
                ? `${PERIOD_SURPLUS_FORMULA} Source: on-device budget ledger (not Track planner accounts).`
                : "Add income in Track or connect a bank. Lenses stay illustrative until your picture exists."}
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
              value={ready && runwayMonths != null ? `${runwayMonths.toFixed(1)} mo` : "—"}
              color={TEMP_COLOR[runwayTemp]}
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

      <ProvenanceLine provenance={moneyProvenance} />
      <MoneyRecheckPrompt metrics={metrics} />
      <ObservedPrefillCard />

      {ready && completeness === "low" && (
        <p
          className="rounded-xl border border-yellow/40 bg-yellow/5 px-4 py-3 text-sm text-dim"
          role="status"
        >
          Thin evidence — treat every number as a draft. Add more months, categorize spending, or
          connect a bank before acting on a big decision.
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
