"use client";

import { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  recommendPayoff,
  simulateAvalanche,
  simulateConsolidation,
  simulateSnowball,
  totalBalance,
  weightedAverageApr,
  type ConsolidationLoan,
  type PayoffMethodId,
} from "@/lib/tools/debt";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
import { COLORS } from "@/lib/brand";
import { usePlannerStore } from "@/lib/planner/store";
import { TEMP_HEX } from "@/lib/planner/palette";
import ChartTooltip from "@/components/planner/ui/ChartTooltip";
import { NumberField } from "@/components/planner/ui/NumberField";
import EmptyState from "@/components/planner/ui/EmptyState";
import { PlanFooter, PlanSectionHeader, PlanTile } from "./ui";

/* ------------------------------------------------------------------ */
/* Consolidate sub-tab — one loan vs. keeping the current debts.       */
/*                                                                     */
/* Engine: canon lib/tools/debt.ts (simulateConsolidation +           */
/* recommendPayoff). The loan terms live in the planner store          */
/* (toolsOverlay.consolidation); the debts + extra payment are shared  */
/* with the Debt lab so both tabs model the same board. The banner     */
/* names the cheapest route out — avalanche, snowball, or consolidate. */
/* ------------------------------------------------------------------ */

const CYAN = COLORS.cyan;

const METHOD_COPY: Record<PayoffMethodId, string> = {
  avalanche: "Avalanche — highest APR first",
  snowball: "Snowball — smallest balance first",
  consolidation: "Consolidation loan — one fixed payment",
};

export default function PlanConsolidate() {
  const debts = usePlannerStore((s) => s.debts);
  const extra = usePlannerStore((s) => s.toolsOverlay.extraDebtPayment);
  const loan = usePlannerStore((s) => s.toolsOverlay.consolidation);
  const setConsolidationLoan = usePlannerStore((s) => s.setConsolidationLoan);
  const setExtraDebtPayment = usePlannerStore((s) => s.setExtraDebtPayment);

  const loanConfig: ConsolidationLoan = useMemo(
    () => ({ apr: loan.apr, termMonths: loan.termMonths, feePct: loan.feePct }),
    [loan.apr, loan.termMonths, loan.feePct],
  );

  const consolidation = useMemo(
    () => (debts.length > 0 ? simulateConsolidation(debts, loanConfig, extra) : null),
    [debts, loanConfig, extra],
  );

  const recommendation = useMemo(
    () => (debts.length > 0 ? recommendPayoff(debts, extra, loanConfig) : null),
    [debts, extra, loanConfig],
  );

  const balance = totalBalance(debts);
  const blendedApr = weightedAverageApr(debts);

  // Current best strategy (avalanche or snowball) for the head-to-head tiles.
  const strategyBest = useMemo(() => {
    if (!recommendation) return null;
    return recommendation.ranked
      .filter((m) => m.method !== "consolidation")
      .sort((a, b) => a.totalPaid - b.totalPaid)[0];
  }, [recommendation]);

  const chartData = useMemo(() => {
    if (!consolidation || !recommendation) return [];
    const con = consolidation.curve;
    // Rebuild the winning strategy curve for the overlay comparison.
    const stratId = strategyBest?.method ?? "avalanche";
    const strat =
      stratId === "snowball"
        ? simulateSnowball(debts, extra).curve
        : simulateAvalanche(debts, extra).curve;
    const months = Math.max(con.length, strat.length);
    const stride = Math.max(1, Math.floor(months / 120));
    const rows: Array<{ month: number; consolidation: number; current: number }> = [];
    for (let i = 0; i < months; i += stride) {
      rows.push({
        month: con[i]?.month ?? strat[i]?.month ?? i,
        consolidation: Math.round(con[i]?.totalBalance ?? 0),
        current: Math.round(strat[i]?.totalBalance ?? 0),
      });
    }
    return rows;
  }, [consolidation, recommendation, strategyBest, debts, extra]);

  if (debts.length === 0) {
    return (
      <section className="glass p-5 sm:p-6">
        <PlanSectionHeader
          eyebrow="CONSOLIDATE LAB"
          title="One loan, one payment"
          caption="Roll every balance into a single fixed-rate loan and see whether it beats paying the debts off as they stand."
        />
        <EmptyState
          compact
          line="No debts to consolidate yet"
          caption="Add your balances in the Debt tab — they flow straight into this comparison."
        />
        <PlanFooter
          lines={[
            "Consolidation only helps when the loan rate beats your blended APR — this lab shows you honestly, either way.",
            "Educational estimates only — not a loan offer or financial advice.",
          ]}
        />
      </section>
    );
  }

  const savedVsCurrent =
    consolidation && strategyBest
      ? strategyBest.totalPaid - consolidation.totalPaid
      : 0;
  const eligible = recommendation?.consolidationEligible ?? false;

  return (
    <section className="glass p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="CONSOLIDATE LAB"
        title="One loan, one payment"
        caption="Roll every balance into a single fixed-rate loan and see whether it beats paying the debts off as they stand."
      />

      {/* Recommendation banner — the "best way out" answer. */}
      {recommendation && (
        <div
          className={`mt-5 rounded-2xl border px-4 py-4 ${
            eligible
              ? "border-emerald/30 bg-emerald/[0.06]"
              : "border-cyan/25 bg-cyan/[0.05]"
          }`}
        >
          <div className="flex items-start gap-3">
            <Sparkles
              size={18}
              className={eligible ? "mt-0.5 shrink-0 text-emerald" : "mt-0.5 shrink-0 text-cyan"}
              aria-hidden
            />
            <div>
              <p className="text-label">BEST WAY OUT</p>
              <p className="mt-1 font-serif text-[19px] italic leading-tight text-light">
                {METHOD_COPY[recommendation.best]}
              </p>
              <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-dim">
                {recommendation.reason}
              </p>
              {recommendation.savingsVsWorst > 0 && (
                <p className="mt-2 text-[12px] font-semibold text-emerald">
                  Saves {formatCurrency(recommendation.savingsVsWorst)} vs. the
                  costliest option on the board.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loan terms. */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumberField
          label="LOAN APR %"
          suffix="%"
          value={loan.apr}
          onChange={(v) => setConsolidationLoan({ apr: Math.max(0, v) })}
          step={0.1}
          min={0}
        />
        <NumberField
          label="TERM (MONTHS)"
          value={loan.termMonths}
          onChange={(v) => setConsolidationLoan({ termMonths: Math.max(1, Math.round(v)) })}
          step={12}
          min={1}
        />
        <NumberField
          label="ORIGINATION FEE %"
          suffix="%"
          value={loan.feePct}
          onChange={(v) => setConsolidationLoan({ feePct: Math.max(0, v) })}
          step={0.5}
          min={0}
        />
        <NumberField
          label="EXTRA / MO"
          prefix="$"
          value={extra}
          onChange={setExtraDebtPayment}
          step={25}
          min={0}
        />
      </div>

      {/* Consolidation outputs. */}
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PlanTile
          label="NEW MONTHLY PAYMENT"
          value={formatCurrency(consolidation?.monthlyPayment ?? 0)}
          tone="cyan"
          hint={`One payment · ${formatMonths(loan.termMonths)} term`}
        />
        <PlanTile
          label="PAYOFF TIME"
          value={formatMonths(consolidation?.months ?? 0)}
          hint={`${formatCurrency(consolidation?.totalInterest ?? 0)} interest`}
        />
        <PlanTile
          label="TOTAL PAID"
          value={formatCurrency(consolidation?.totalPaid ?? 0)}
          hint={`Incl. ${formatCurrency(consolidation?.originationFee ?? 0)} fee financed`}
        />
        <PlanTile
          label={savedVsCurrent >= 0 ? "YOU SAVE" : "COSTS MORE"}
          value={formatCurrency(Math.abs(savedVsCurrent))}
          tone={savedVsCurrent >= 0 ? "emerald" : "crimson"}
          hint="vs. your best current-debt strategy"
        />
      </div>

      {/* Before → after summary line. */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 text-[13px]">
        <span className="text-dim">
          {debts.length} debt{debts.length === 1 ? "" : "s"} ·{" "}
          <span className="font-display text-light">{formatCurrency(balance)}</span> at{" "}
          <span className="font-display text-amber">{blendedApr}%</span> blended
        </span>
        <ArrowRight size={15} className="text-dim" aria-hidden />
        <span className="text-dim">
          1 loan ·{" "}
          <span className="font-display text-cyan">{loan.apr}%</span> ·{" "}
          <span className="font-display text-light">
            {formatCurrency(consolidation?.monthlyPayment ?? 0)}/mo
          </span>
        </span>
      </div>

      {/* Balance decline: consolidation vs current best. */}
      <div className="mt-5 h-[240px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: COLORS.dim, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fill: COLORS.dim, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `$${Math.round(v / 1000)}k`}
              width={46}
            />
            <Tooltip
              content={<ChartTooltip format={(n) => formatCurrency(n)} />}
              cursor={{ stroke: "rgba(255,255,255,0.12)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="consolidation"
              stroke={CYAN}
              strokeWidth={2}
              dot={false}
              name="Consolidation"
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke={TEMP_HEX.emerald}
              strokeWidth={2}
              dot={false}
              name="Best current strategy"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Full ranking. */}
      {recommendation && (
        <div className="mt-6">
          <p className="text-label">EVERY ROUTE, CHEAPEST FIRST</p>
          <div className="mt-3 flex flex-col gap-2">
            {recommendation.ranked.map((m, i) => {
              const isBest = m.method === recommendation.best;
              return (
                <div
                  key={m.method}
                  className={`grid grid-cols-[auto_1.4fr_1fr_1fr] items-center gap-3 rounded-xl border px-3.5 py-2.5 ${
                    isBest
                      ? "border-emerald/30 bg-emerald/[0.05]"
                      : "border-white/[0.06] bg-white/[0.02]"
                  }`}
                >
                  <span className="font-display text-[13px] text-dim">{i + 1}</span>
                  <span className="text-[13px] text-light">
                    {m.label}
                    {isBest && (
                      <span className="ml-2 rounded-full bg-emerald/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald">
                        Best
                      </span>
                    )}
                  </span>
                  <span className="text-right text-[13px] text-light score-numeral">
                    {formatCurrency(m.totalPaid)}
                  </span>
                  <span className="text-right text-[12px] text-dim score-numeral">
                    {formatMonths(m.months)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 grid grid-cols-[auto_1.4fr_1fr_1fr] gap-3 px-3.5 text-[10px] uppercase tracking-wide text-dim/70">
            <span />
            <span>Method</span>
            <span className="text-right">Total paid</span>
            <span className="text-right">Time</span>
          </div>
        </div>
      )}

      <PlanFooter
        lines={[
          "Consolidation rolls the origination fee into the loan, so “total paid” already counts it — that is the true cash-to-zero.",
          "A lower monthly payment can still cost more over a longer term; the ranking sorts by total cash, not the monthly number.",
          "Educational estimates only — not a loan offer or financial advice.",
        ]}
      />
    </section>
  );
}
