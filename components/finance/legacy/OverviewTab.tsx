"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NumberField } from "@/components/ui/NumberField";
import {
  loadFinanceState,
  hasSavedFinanceState,
  netCashFlow,
  savingsRate,
  runwayMonths,
  debtToIncome,
  dtiTemperature,
  savingsRateTemperature,
  runwayTemperature,
  cashFlowTemperature,
  type FinanceState,
  type Temperature,
} from "@/lib/finance/store";
import {
  loadReadinessPath,
  bindingConstraintLabel,
  computeBindingProgress,
  deriveFundingFromPath,
  applyPathFunding,
  type ReadinessPath,
} from "@/lib/readiness";
import { formatCurrency, formatMonths, formatPercent } from "@/lib/tools/format";

const TEMP_TEXT: Record<Temperature, string> = {
  emerald: "text-emerald",
  yellow: "text-yellow",
  amber: "text-amber",
  crimson: "text-crimson",
};

const TEMP_BG: Record<Temperature, string> = {
  emerald: "bg-verdict-ready",
  yellow: "bg-verdict-almost",
  amber: "bg-verdict-build",
  crimson: "bg-verdict-notyet",
};

const PATH_CONFIDENCE_LABEL: Record<ReadinessPath["confidence"], string> = {
  assessment_only: "Assessment only",
  assessment_plus_finance: "Assessment + finance",
};

/**
 * Path to Ready strip — only when a path exists in localStorage.
 * No empty state: absence is silence, not a CTA wall.
 */
function PathToReadyStrip() {
  const [path, setPath] = useState<ReadinessPath | null>(null);

  useEffect(() => {
    let active = true;
    async function hydrate() {
      setPath(loadReadinessPath());
      try {
        const { pullReadinessPath } = await import("@/lib/readiness");
        const remote = await pullReadinessPath();
        if (active && remote) setPath(remote);
      } catch {
        // local only
      }
    }
    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  if (!path) return null;

  const next =
    path.steps.find((s) => s.reasonCode !== "REASSESS" && (s.status ?? "pending") === "pending") ??
    path.steps.find((s) => (s.status ?? "pending") === "pending") ??
    path.steps[0] ??
    null;
  const constraint = bindingConstraintLabel(path.bindingConstraint);
  const confidenceLabel = PATH_CONFIDENCE_LABEL[path.confidence] ?? path.confidence;
  const progress = computeBindingProgress(
    path,
    null,
    hasSavedFinanceState()
      ? {
          netCashFlow: netCashFlow(loadFinanceState()),
          runwayMonths: (() => {
            const r = runwayMonths(loadFinanceState());
            return Number.isFinite(r) ? r : null;
          })(),
          monthlyExpenses: loadFinanceState().monthlyExpenses,
          liquidSavings: loadFinanceState().liquidSavings,
          monthlyDebtPayments: loadFinanceState().monthlyDebtPayments,
          monthlyIncome: loadFinanceState().monthlyIncome,
        }
      : null,
  );
  const pct =
    progress.ratio != null ? Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100) : null;

  return (
    <div className="glass flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 flex-1 space-y-2">
        <p className="eyebrow">Path to Ready</p>
        <p className="font-display text-lg text-light sm:text-xl">{constraint}</p>
        {pct != null && (
          <div className="max-w-xs">
            <div className="mb-1 flex justify-between text-xs text-dim">
              <span>Gate progress</span>
              <span className="score-numeral text-light">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-surface">
              <div
                className={`h-full rounded-full ${progress.cleared ? "bg-emerald" : "bg-cyan"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}
        {next ? (
          <p className="text-sm text-dim">
            Next:{" "}
            <Link
              href={next.href}
              className="font-semibold text-cyan underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
            >
              {next.title}
            </Link>
          </p>
        ) : (
          <p className="text-sm text-dim">No open steps on this path right now.</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="rounded-full border border-slate-surface/80 bg-navy/40 px-2.5 py-0.5 text-xs text-dim">
            {confidenceLabel}
          </span>
          {next?.fundingTarget != null && next.fundingTarget > 0 ? (
            <span className="rounded-full border border-cyan/30 bg-cyan/10 px-2.5 py-0.5 text-xs text-cyan">
              Target {formatCurrency(next.fundingTarget)}
              {next.fundingLabel ? ` · ${next.fundingLabel}` : ""}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col sm:items-end">
        <Link href="/calendar" className="btn btn-ghost btn-xs text-sm">
          Calendar
        </Link>
        <Link href="/path" className="btn btn-ghost btn-xs text-sm">
          Path
        </Link>
        <Link href="/results" className="btn btn-ghost btn-xs text-sm">
          Results
        </Link>
      </div>
    </div>
  );
}

function PathFundingPanel({
  state,
  onApplied,
}: {
  state: FinanceState;
  onApplied: (next: FinanceState) => void;
}) {
  const path = typeof window !== "undefined" ? loadReadinessPath() : null;
  if (!path || !hasSavedFinanceState()) return null;
  const suggestion = deriveFundingFromPath(path, state);
  if (!suggestion.hasActionableDiff && suggestion.lines.length === 0) return null;

  return (
    <div className="glass border border-emerald/20 p-5">
      <p className="eyebrow text-emerald">Path funding</p>
      <p className="mt-1 text-sm text-dim">
        Couple Path to Ready targets into this cockpit — never invents cash.
      </p>
      {suggestion.lines.length > 0 && (
        <ul className="mt-3 list-inside list-disc text-sm text-dim">
          {suggestion.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-primary btn-xs text-sm"
          onClick={() => {
            const next = applyPathFunding(state, suggestion, "targets");
            onApplied(next);
          }}
        >
          Apply goal targets
        </button>
        {suggestion.liquidSavingsTarget != null && (
          <button
            type="button"
            className="btn btn-ghost btn-xs text-sm"
            onClick={() => {
              const next = applyPathFunding(state, suggestion, "savings_floor");
              onApplied(next);
            }}
          >
            Record savings floor
          </button>
        )}
        <Link href="/path" className="btn btn-ghost btn-xs text-sm">
          Open path
        </Link>
      </div>
    </div>
  );
}

export function OverviewTab({
  state,
  patch,
}: {
  state: FinanceState;
  patch: (p: Partial<FinanceState>) => void;
}) {
  const flow = netCashFlow(state);
  const rate = savingsRate(state);
  const runway = runwayMonths(state);
  const dti = debtToIncome(state);

  return (
    <div className="space-y-8">
      <PathToReadyStrip />
      <PathFundingPanel
        state={state}
        onApplied={(next) => {
          // Full replace via patch fields the parent saves on change — write all keys
          patch({
            monthlyIncome: next.monthlyIncome,
            monthlyExpenses: next.monthlyExpenses,
            liquidSavings: next.liquidSavings,
            totalDebt: next.totalDebt,
            monthlyDebtPayments: next.monthlyDebtPayments,
            expenseCategories: next.expenseCategories,
            downPaymentTarget: next.downPaymentTarget,
            monteCarloYears: next.monteCarloYears,
            expectedReturnPct: next.expectedReturnPct,
            volatilityPct: next.volatilityPct,
            assets: next.assets,
            liabilities: next.liabilities,
          });
        }}
      />

      {/* Operate hierarchy: position metrics first, inputs second. */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Net cash flow"
          value={formatCurrency(flow)}
          temperature={cashFlowTemperature(flow, state.monthlyIncome)}
          read={
            flow >= 0
              ? `You're banking ${formatCurrency(flow)} a month before anything unexpected.`
              : `You're running ${formatCurrency(Math.abs(flow))} short every month. That gap has to close.`
          }
        />
        <StatCard
          label="Savings rate"
          value={formatPercent(rate)}
          temperature={savingsRateTemperature(rate)}
          read={
            rate >= 20
              ? "A strong rate — most goals stay reachable on this pace."
              : rate >= 10
                ? "A workable rate, but there's room to build faster."
                : rate >= 0
                  ? "Thin margin. One surprise expense erases the surplus."
                  : "You're drawing down, not building up. This is the number to fix first."
          }
        />
        <StatCard
          label="Runway"
          value={Number.isFinite(runway) ? formatMonths(runway) : "∞"}
          temperature={runwayTemperature(runway)}
          read={
            !Number.isFinite(runway)
              ? "No monthly outflow recorded — add expenses for a real read."
              : runway >= 6
                ? "Six-plus months covered. That's real protection against a job loss or emergency."
                : runway >= 3
                  ? "A few months of cushion. Workable, but tight if income stops."
                  : runway >= 1
                    ? "Under three months. A single bad month could force hard choices."
                    : "Under one month of runway. This is the most urgent number on this page."
          }
        />
        <StatCard
          label="Debt-to-income"
          value={formatPercent(dti)}
          temperature={dtiTemperature(dti)}
          read={
            dti <= 28
              ? "Well inside the protected zone lenders and HōMI both look for."
              : dti <= 36
                ? "Manageable, but getting close to where flexibility narrows."
                : dti <= 43
                  ? "Above the comfortable range. New debt would be a stretch, not a step."
                  : "Above the line most lenders treat as a hard stop. This needs attention before anything new."
          }
        />
      </div>

      <div className="glass grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-5">
        <p className="sm:col-span-2 lg:col-span-5 text-xs font-semibold uppercase tracking-widest text-dim">
          Inputs — every tab reads these
        </p>
        <NumberField
          label="Monthly income"
          value={state.monthlyIncome}
          onChange={(v) => patch({ monthlyIncome: v ?? 0 })}
        />
        <NumberField
          label="Monthly expenses"
          value={state.monthlyExpenses}
          onChange={(v) => patch({ monthlyExpenses: v ?? 0 })}
        />
        <NumberField
          label="Liquid savings"
          value={state.liquidSavings}
          onChange={(v) => patch({ liquidSavings: v ?? 0 })}
        />
        <NumberField
          label="Total debt"
          value={state.totalDebt}
          onChange={(v) => patch({ totalDebt: v ?? 0 })}
        />
        <NumberField
          label="Monthly debt payments"
          value={state.monthlyDebtPayments}
          onChange={(v) => patch({ monthlyDebtPayments: v ?? 0 })}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  temperature,
  read,
}: {
  label: string;
  value: string;
  temperature: Temperature;
  read: string;
}) {
  return (
    <div
      className={`glass glass-hover relative overflow-hidden border p-5 ${TEMP_BG[temperature]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-dim">{label}</p>
      <p
        className={`score-numeral mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${TEMP_TEXT[temperature]}`}
      >
        {value}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-dim">{read}</p>
    </div>
  );
}
