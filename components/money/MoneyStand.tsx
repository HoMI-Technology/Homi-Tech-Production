"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ActionDock, OperateInstrument } from "@/components/operate/OperateInstrument";
import { MetricRail } from "@/components/operate/MetricRail";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useFinanceDashboard } from "@/hooks/use-finance-dashboard";
import { useCfm } from "@/hooks/use-cfm";
import { COLORS } from "@/lib/brand";
import {
  completenessLabel,
  PERIOD_SURPLUS_FORMULA,
  PERIOD_SURPLUS_LABEL,
} from "@/lib/finance/metrics";
import type { FinanceCompleteness } from "@/lib/finance/readiness-snapshot";
import type { Temperature } from "@/lib/finance/store";
import { formatCurrency, formatPercent } from "@/lib/tools/format";

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
 * Stand mode — OPERATE instrument with honesty gates.
 * Completeness comes from CFM meta (gradeCompleteness), not a naive KPI heuristic.
 */
export function MoneyStand() {
  const { kpis, temperatures, goals, ready, loading, signals, nudges } =
    useFinanceDashboard();
  const { cfm, hydrated: cfmHydrated } = useCfm();

  const completeness: FinanceCompleteness =
    cfm?.meta.completeness ?? (ready ? "low" : "low");
  const chipLabel = !ready
    ? "No picture yet"
    : completenessLabel(completeness);
  const chipColor = !ready ? COLORS.dim : GRADE_COLOR[completeness];

  const cashTemp = ready ? temperatures.cashFlow : "amber";
  const runwayTemp = ready && kpis.runwayMonths != null ? temperatures.runway : "amber";
  const tint = ready ? TEMP_COLOR[cashTemp] : COLORS.cyan;

  const goal = goals[0];
  const goalGap =
    goal && goal.target > goal.saved ? goal.target - goal.saved : null;

  const liquidNote =
    cfm?.meta.liquidSource === "emergency_goal"
      ? "Emergency goal balance"
      : cfm?.meta.liquidSource === "goal_proxy"
        ? "Goal balance (proxy — not full liquid)"
        : cfm?.meta.liquidSource === "legacy_snapshot"
          ? "Legacy snapshot"
          : "Liquid not recorded";

  const debtHonest = cfm?.meta.hasDebtSignal === true;
  const asOf = cfm?.meta.savedAt;
  const asOfLabel = useMemo(() => {
    if (!asOf) return ready ? "Age unknown" : null;
    const days = Math.floor((Date.now() - new Date(asOf).getTime()) / 86_400_000);
    if (!Number.isFinite(days) || days < 0) return "Age unknown";
    if (days === 0) return "Updated today";
    if (days === 1) return "Updated yesterday";
    return `Updated ${days}d ago`;
  }, [asOf, ready]);

  const primaryAction = !ready
    ? { label: "Build your picture", href: "/money/budget" }
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
      <OperateInstrument tint={tint}>
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-line/70 px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-dim"
                title="How complete your money evidence is"
              >
                <span
                  aria-hidden
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: chipColor }}
                />
                {chipLabel}
              </span>
              {asOfLabel && (
                <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-dim/80">
                  {asOfLabel}
                </span>
              )}
              {ready && (
                <span
                  className="text-[0.65rem] font-semibold uppercase tracking-[0.12em]"
                  style={{ color: TEMP_COLOR[cashTemp] }}
                >
                  {TEMP_WORD[cashTemp]} cash flow
                </span>
              )}
            </div>

            <div className="dash-hero-meta mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dim">
                {PERIOD_SURPLUS_LABEL}
              </p>
              <AnimatedNumber
                value={ready ? kpis.netCashFlow : 0}
                format={(n) => formatCurrency(n)}
                className={`score-numeral mt-1 block text-5xl font-bold tracking-tight sm:text-6xl ${
                  ready && kpis.netCashFlow < 0 ? "text-crimson" : "text-light"
                }`}
              />
              <p className="mt-2 max-w-xl text-sm text-dim">
                {ready
                  ? PERIOD_SURPLUS_FORMULA
                  : "Add income or connect a bank. Lenses stay illustrative until your picture exists."}
              </p>
            </div>
          </div>

          <div className="grid w-full max-w-sm grid-cols-2 gap-3 sm:max-w-md">
            <MiniTile
              label="Income"
              value={ready ? formatCurrency(kpis.monthlyIncome) : "—"}
              accent={COLORS.cyan}
            />
            <MiniTile
              label="Runway"
              value={
                ready && kpis.runwayMonths != null
                  ? `${kpis.runwayMonths.toFixed(1)} mo`
                  : "—"
              }
              accent={TEMP_COLOR[runwayTemp]}
            />
            <MiniTile
              label="Savings rate"
              value={ready ? formatPercent(kpis.savingsRate) : "—"}
              accent={COLORS.emerald}
            />
            <MiniTile
              label="DTI"
              value={
                ready && debtHonest ? formatPercent(kpis.dti) : ready ? "Unknown" : "—"
              }
              accent={debtHonest ? COLORS.yellow : COLORS.dim}
            />
          </div>
        </div>
      </OperateInstrument>

      <MetricRail
        cells={[
          {
            label: "Liquid / goal balance",
            value: ready ? formatCurrency(kpis.liquidSavings) : "—",
            footer: liquidNote,
            color: COLORS.cyan,
          },
          {
            label: "Goal gap",
            value:
              goalGap != null ? formatCurrency(goalGap) : ready ? "On track" : "—",
            footer: goal ? goal.name : "Set a goal in Track",
            color: goalGap != null && goalGap > 0 ? COLORS.amber : COLORS.emerald,
          },
          {
            label: "Debt signal",
            value: debtHonest ? formatCurrency(kpis.totalDebt || 0) : "Not recorded",
            footer: debtHonest
              ? "Debt payments categorized"
              : "Categorize debt payments for honest DTI",
            color: debtHonest ? COLORS.light : COLORS.dim,
          },
        ]}
      />

      {ready && completeness === "low" && (
        <p
          className="rounded-xl border border-yellow/40 bg-yellow/5 px-4 py-3 text-sm text-dim"
          role="status"
        >
          Thin evidence — treat every number as a draft. Add more months, categorize
          spending, or connect a bank before acting on a big decision.
        </p>
      )}

      <ActionDock
        kicker="Next move"
        title={
          !ready
            ? "Start with your real numbers — not illustrative defaults."
            : completeness === "low"
              ? "Your picture is thin. More data means honest readiness language."
              : signals[0]?.title ??
                nudges[0]?.message ??
                "Stress the decision before you stretch."
        }
      >
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
      </ActionDock>

      {ready && signals.length > 0 && (
        <section aria-labelledby="money-signals-heading" className="space-y-3">
          <h2 id="money-signals-heading" className="text-sm font-semibold text-light">
            Signals
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {signals.slice(0, 4).map((s) => (
              <li
                key={s.id}
                className="glass rounded-xl px-4 py-3 text-sm leading-relaxed text-dim"
              >
                <span className="font-medium text-light">{s.title}</span>
                {s.body ? <span className="mt-1 block">{s.body}</span> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="max-w-2xl text-xs leading-relaxed text-dim/70">
        HōMI Money is educational. It does not provide financial, tax, mortgage, or
        investment advice. Confirm critical numbers with qualified professionals before
        you act.
      </p>
    </div>
  );
}

function MiniTile({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-line/60 bg-navy/40 px-3 py-3">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-dim">
        {label}
      </p>
      <p className="score-numeral mt-1 text-lg font-semibold text-light" style={{ color: accent }}>
        {value}
      </p>
    </div>
  );
}
