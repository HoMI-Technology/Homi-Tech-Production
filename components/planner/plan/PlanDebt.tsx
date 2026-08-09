"use client";

import { COLORS } from "@/lib/brand";
import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { compareStrategies } from "@/lib/tools/debt";
import type { DebtItem } from "@/lib/planner/types";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
import { usePlannerStore } from "@/lib/planner/store";
import { TEMP_HEX } from "@/lib/planner/palette";
import ChartTooltip from "@/components/planner/ui/ChartTooltip";
import { NumberField } from "@/components/planner/ui/NumberField";
import EmptyState from "@/components/planner/ui/EmptyState";
import { PlanFooter, PlanSectionHeader, PlanTile } from "./ui";

/* ------------------------------------------------------------------ */
/* Debt sub-tab — avalanche vs snowball (spec §7).                     */
/*                                                                     */
/* Engine: canon lib/tools/debt.ts (freed-minimum rolling, 1200-month  */
/* cap). Debts live in the planner store (setDebts / updateDebt /      */
/* setExtraDebtPayment) — edits re-run the comparison live.            */
/* ------------------------------------------------------------------ */

const CYAN = COLORS.cyan;

export default function PlanDebt() {
  const debts = usePlannerStore((s) => s.debts);
  const extra = usePlannerStore((s) => s.toolsOverlay.extraDebtPayment);
  const setDebts = usePlannerStore((s) => s.setDebts);
  const updateDebt = usePlannerStore((s) => s.updateDebt);
  const setExtraDebtPayment = usePlannerStore((s) => s.setExtraDebtPayment);

  const comparison = useMemo(
    () => (debts.length > 0 ? compareStrategies(debts, extra) : null),
    [debts, extra],
  );

  const chartData = useMemo(() => {
    if (!comparison) return [];
    const av = comparison.avalanche.curve;
    const sn = comparison.snowball.curve;
    const months = Math.max(av.length, sn.length);
    const rows: Array<{ month: number; avalanche: number; snowball: number }> = [];
    const stride = Math.max(1, Math.floor(months / 120));
    for (let i = 0; i < months; i += stride) {
      rows.push({
        month: av[i]?.month ?? sn[i]?.month ?? i,
        avalanche: Math.round(av[i]?.totalBalance ?? 0),
        snowball: Math.round(sn[i]?.totalBalance ?? 0),
      });
    }
    const lastAv = av[av.length - 1];
    const lastSn = sn[sn.length - 1];
    if (lastAv && rows[rows.length - 1]?.month !== lastAv.month) {
      rows.push({
        month: lastAv.month,
        avalanche: Math.round(lastAv.totalBalance),
        snowball: Math.round(lastSn?.totalBalance ?? 0),
      });
    }
    return rows;
  }, [comparison]);

  const avalancheOrder = [...debts].sort((a, b) => b.apr - a.apr);
  const snowballOrder = [...debts].sort((a, b) => a.balance - b.balance);

  const addDebt = () => {
    const debt: DebtItem = {
      id: `debt_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Date.now()}`,
      name: "New debt",
      balance: 1000,
      apr: 10,
      minPayment: 50,
    };
    setDebts([...debts, debt]);
  };

  const removeDebt = (id: string) => setDebts(debts.filter((d) => d.id !== id));

  return (
    <section className="card-chrome card-hairline-top p-5 sm:p-6">
      <PlanSectionHeader
        eyebrow="DEBT LAB"
        title="Avalanche vs snowball"
        caption="Same debts, same extra payment — only the attack order changes. Freed minimums roll forward in both."
      />

      {debts.length === 0 ? (
        <EmptyState
          compact
          line="No debts on the board — add one to model the payoff"
          caption="Balances, APRs, and minimums drive both strategies. Nothing here is a lending decision."
          actionLabel="Add a debt"
          onAction={addDebt}
        />
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <PlanTile
              label="AVALANCHE"
              value={formatMonths(comparison?.avalanche.months ?? 0)}
              hint={`${formatCurrency(comparison?.avalanche.totalInterest ?? 0)} interest · highest APR first`}
            />
            <PlanTile
              label="SNOWBALL"
              value={formatMonths(comparison?.snowball.months ?? 0)}
              hint={`${formatCurrency(comparison?.snowball.totalInterest ?? 0)} interest · smallest balance first`}
            />
            <PlanTile
              label="INTEREST SAVED"
              value={formatCurrency(Math.max(0, comparison?.interestSaved ?? 0))}
              tone="emerald"
              hint="Avalanche vs snowball, same inputs"
            />
            <PlanTile
              label="TOTAL PAID"
              value={formatCurrency(comparison?.avalanche.totalPaid ?? 0)}
              hint={`Extra ${formatCurrency(extra)}/mo applied`}
            />
          </div>

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
                  dataKey="avalanche"
                  stroke={TEMP_HEX.emerald}
                  strokeWidth={2}
                  dot={false}
                  name="Avalanche"
                />
                <Line
                  type="monotone"
                  dataKey="snowball"
                  stroke={CYAN}
                  strokeWidth={2}
                  dot={false}
                  name="Snowball"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <p className="text-label">AVALANCHE ORDER</p>
              <ol className="mt-2 flex flex-col gap-1">
                {avalancheOrder.map((d, i) => (
                  <li key={d.id} className="text-xs text-dim">
                    <span className="font-display text-light">{i + 1}.</span> {d.name}{" "}
                    <span className="font-display text-emerald">{d.apr}%</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
              <p className="text-label">SNOWBALL ORDER</p>
              <ol className="mt-2 flex flex-col gap-1">
                {snowballOrder.map((d, i) => (
                  <li key={d.id} className="text-xs text-dim">
                    <span className="font-display text-light">{i + 1}.</span> {d.name}{" "}
                    <span className="font-display text-cyan">{formatCurrency(d.balance)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
            <NumberField
              label="EXTRA PAYMENT / MO"
              prefix="$"
              value={extra}
              onChange={setExtraDebtPayment}
              step={25}
              min={0}
            />
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <p className="text-label">DEBTS · {debts.length}</p>
              <button
                type="button"
                onClick={addDebt}
                className="flex items-center gap-1.5 rounded-lg border border-cyan/30 px-2.5 py-1 text-2xs font-semibold text-cyan transition-colors hover:bg-cyan/[0.08]"
              >
                <Plus size={12} /> Add debt
              </button>
            </div>
            <div className="mt-3 flex flex-col gap-2.5">
              {debts.map((d) => (
                <div
                  key={d.id}
                  className="grid grid-cols-2 items-end gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3 sm:grid-cols-[1.4fr_1fr_0.7fr_0.9fr_auto]"
                >
                  <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
                    <span className="text-label">NAME</span>
                    <input
                      value={d.name}
                      onChange={(e) => updateDebt(d.id, { name: e.target.value })}
                      className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-sm text-light outline-none focus:border-cyan/40"
                    />
                  </label>
                  <NumberField
                    label="BALANCE"
                    prefix="$"
                    value={d.balance}
                    onChange={(v) => updateDebt(d.id, { balance: Math.max(0, v) })}
                    step={100}
                    min={0}
                  />
                  <NumberField
                    label="APR %"
                    suffix="%"
                    value={d.apr}
                    onChange={(v) => updateDebt(d.id, { apr: Math.max(0, v) })}
                    step={0.1}
                    min={0}
                  />
                  <NumberField
                    label="MIN PAYMENT"
                    prefix="$"
                    value={d.minPayment}
                    onChange={(v) => updateDebt(d.id, { minPayment: Math.max(0, v) })}
                    step={10}
                    min={0}
                  />
                  <button
                    type="button"
                    onClick={() => removeDebt(d.id)}
                    aria-label={`Remove ${d.name}`}
                    className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] text-dim transition-colors hover:border-crimson/40 hover:text-crimson"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <PlanFooter
        lines={[
          "Both strategies pay every minimum each month; the extra plus freed minimums attack the front of the order.",
          "Educational estimates only — not financial advice.",
        ]}
      />
    </section>
  );
}
