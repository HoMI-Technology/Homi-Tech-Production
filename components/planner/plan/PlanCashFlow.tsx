"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { COLORS, LEGAL_DISCLAIMER } from "@/lib/brand";
import { financialReality, summarize } from "@/lib/planner/derived";
import { fmt } from "@/lib/planner/palette";
import { usePlannerStore } from "@/lib/planner/store";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import EmptyState from "@/components/planner/ui/EmptyState";
import ChartTooltip from "@/components/planner/ui/ChartTooltip";
import { PlanFooter, PlanSectionHeader, PlanTile } from "./ui";

/* ------------------------------------------------------------------ */
/* Cash-flow picture — the Plan tab's always-on recharts section       */
/* (spec §4.4 / Phase 3).                                              */
/*                                                                     */
/* Data lineage: every bar and line reads the planner store slices     */
/* that already feed the Plan sub-tabs — `transactions`, `accounts`,   */
/* `bills` — through the canon selectors `summarize` and               */
/* `financialReality` (lib/planner/derived). The ledger-bridge keeps   */
/* `transactions` in sync with the budget ledger, so this chart never  */
/* carries an invented series: no transactions → honest empty state.   */
/*                                                                     */
/* Thin evidence (one-sided or very short ledger) labels every number  */
/* a draft, matching the §7 posture. prefers-reduced-motion disables   */
/* chart animation via useReducedMotion.                               */
/* ------------------------------------------------------------------ */

type DayRow = {
  date: string;
  day: string;
  in: number;
  out: number;
  net: number;
};

function dayLabel(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

/** Daily cash-flow rows — income / expenses / net per recorded day. */
export function buildCashFlowSeries(
  transactions: Array<{ type: "income" | "expense"; amount: number; date: string }>,
): DayRow[] {
  const byDay = new Map<string, { in: number; out: number }>();
  for (const tx of transactions) {
    const row = byDay.get(tx.date) ?? { in: 0, out: 0 };
    if (tx.type === "income") row.in += tx.amount;
    else row.out += tx.amount;
    byDay.set(tx.date, row);
  }
  return [...byDay.keys()]
    .sort()
    .map((date) => {
      const { in: income, out } = byDay.get(date)!;
      return {
        date,
        day: dayLabel(date),
        in: Math.round(income * 100) / 100,
        out: Math.round(out * 100) / 100,
        net: Math.round((income - out) * 100) / 100,
      };
    });
}

export default function PlanCashFlow() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const transactions = usePlannerStore((s) => s.transactions);
  const accounts = usePlannerStore((s) => s.accounts);
  const bills = usePlannerStore((s) => s.bills);

  const summary = useMemo(() => summarize(transactions), [transactions]);
  const reality = useMemo(
    () => financialReality(transactions, accounts, bills),
    [transactions, accounts, bills],
  );
  const series = useMemo(() => buildCashFlowSeries(transactions), [transactions]);

  if (transactions.length === 0) {
    return (
      <section className="card-chrome card-hairline-top p-5 sm:p-6">
        <PlanSectionHeader
          eyebrow="CASH FLOW"
          title="The picture your plan is built on"
          caption="Income in, expenses out, net by day — read straight from your ledger."
        />
        <EmptyState
          compact
          line="No picture yet. Open Ledger or connect a bank to begin."
          caption="Charts here only ever read your real ledger — never a made-up series."
          actionLabel="Open Ledger"
          onAction={() => router.push("/money/budget")}
        />
        <PlanFooter lines={[LEGAL_DISCLAIMER]} />
      </section>
    );
  }

  /* §7 thin-evidence: one-sided or very short ledger → draft numbers. */
  const thin = summary.income === 0 || summary.expenses === 0 || series.length < 3;
  const netTone =
    reality.temps.cashFlow === "emerald"
      ? "emerald"
      : reality.temps.cashFlow === "crimson"
        ? "crimson"
        : "amber";
  const draftHint = thin ? "Draft — thin evidence" : undefined;

  return (
    <section className="card-chrome card-hairline-top p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="CASH FLOW"
        title="The picture your plan is built on"
        caption="Income in, expenses out, net by day — read straight from your ledger."
      />

      {thin && (
        <p
          data-testid="plan-cashflow-thin"
          className="mt-4 rounded-xl border border-amber/25 bg-amber/[0.06] px-3.5 py-2.5 text-xs leading-relaxed text-amber"
        >
          Partial picture — more evidence makes the reading honest. Treat every number here as a
          draft until the ledger holds both income and spending across more days.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <PlanTile label="INCOME" value={fmt(summary.income)} tone="emerald" hint={draftHint} />
        <PlanTile label="EXPENSES" value={fmt(summary.expenses)} hint={draftHint} />
        <PlanTile label="NET CASH FLOW" value={fmt(summary.remaining)} tone={netTone} hint={draftHint} />
        <PlanTile
          label="SAVINGS RATE"
          value={`${Math.round(summary.savingsRate)}%`}
          hint={draftHint ?? "Share of income kept"}
        />
      </div>

      <div
        className="mt-5 h-[220px] w-full"
        data-testid="plan-cashflow-chart"
        data-reduced-motion={reducedMotion}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
            <XAxis
              dataKey="day"
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
              content={<ChartTooltip format={(n) => fmt(n)} />}
              cursor={{ stroke: "rgba(255,255,255,0.12)" }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar
              dataKey="in"
              name="Income"
              fill={COLORS.emerald}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reducedMotion}
            />
            <Bar
              dataKey="out"
              name="Expenses"
              fill={COLORS.crimson}
              radius={[3, 3, 0, 0]}
              isAnimationActive={!reducedMotion}
            />
            <Line
              type="monotone"
              dataKey="net"
              name="Net"
              stroke={COLORS.cyan}
              strokeWidth={2}
              dot={false}
              isAnimationActive={!reducedMotion}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <PlanFooter
        lines={[
          "Bars and the net line group your ledger by the day each entry was recorded — nothing here is projected or invented.",
          LEGAL_DISCLAIMER,
        ]}
      />
    </section>
  );
}
