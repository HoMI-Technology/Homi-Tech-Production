"use client";

import { useMemo } from "react";
import { COLORS } from "@/lib/brand";
import {
  type FinanceState,
  type ExpenseCategory,
} from "@/lib/finance/store";
import { formatCurrency } from "@/lib/tools/format";

export function CashFlowTab({
  state,
  patch,
}: {
  state: FinanceState;
  patch: (p: Partial<FinanceState>) => void;
}) {
  const totalExpenses = state.expenseCategories.reduce((s, c) => s + c.amount, 0);
  const surplus = state.monthlyIncome - totalExpenses - state.monthlyDebtPayments;

  function updateCategory(id: string, patchC: Partial<ExpenseCategory>) {
    patch({
      expenseCategories: state.expenseCategories.map((c) =>
        c.id === id ? { ...c, ...patchC } : c,
      ),
    });
  }
  function addCategory() {
    patch({
      expenseCategories: [
        ...state.expenseCategories,
        { id: `cat-${crypto.randomUUID()}`, name: "", amount: 0 },
      ],
    });
  }
  function removeCategory(id: string) {
    patch({ expenseCategories: state.expenseCategories.filter((c) => c.id !== id) });
  }

  // 12-month surplus trend projection, flat at current monthly surplus (deterministic, no randomness).
  const projection = useMemo(() => {
    const points: { month: number; cumulative: number }[] = [];
    let cumulative = 0;
    for (let m = 1; m <= 12; m++) {
      cumulative += surplus;
      points.push({ month: m, cumulative });
    }
    return points;
  }, [surplus]);

  return (
    <div className="space-y-8">
      <div className="glass p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-light">Expense categories</h2>
          <button className="btn btn-ghost btn-xs text-sm" onClick={addCategory}>
            + Add category
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {state.expenseCategories.map((cat) => (
            <div
              key={cat.id}
              className="grid grid-cols-3 gap-3 rounded-lg border border-slate-surface/60 p-3"
            >
              <input
                className="input col-span-2"
                placeholder="Category name"
                value={cat.name}
                onChange={(e) => updateCategory(cat.id, { name: e.target.value })}
              />
              <div className="flex gap-2">
                <input
                  className="input"
                  type="number"
                  placeholder="Amount"
                  value={cat.amount || ""}
                  onChange={(e) => updateCategory(cat.id, { amount: Number(e.target.value) })}
                />
                <button
                  className="btn btn-ghost !px-3"
                  onClick={() => removeCategory(cat.id)}
                  aria-label={`Remove ${cat.name || "category"}`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass p-6">
        <h2 className="font-semibold text-light">Income vs. expenses</h2>
        <FlowBar
          income={state.monthlyIncome}
          expenses={totalExpenses}
          debt={state.monthlyDebtPayments}
        />
        <p className="mt-4 text-sm text-dim">
          Monthly surplus:{" "}
          <span
            className={`score-numeral font-semibold ${surplus >= 0 ? "text-emerald" : "text-crimson"}`}
          >
            {formatCurrency(surplus)}
          </span>
        </p>
      </div>

      <div className="glass p-6">
        <h2 className="font-semibold text-light">12-month surplus trend</h2>
        <p className="mt-1 text-xs text-dim">
          Projects your current monthly surplus forward — a straight line, not a forecast of market
          returns.
        </p>
        <ProjectionChart points={projection} />
      </div>
    </div>
  );
}

function FlowBar({ income, expenses, debt }: { income: number; expenses: number; debt: number }) {
  const total = Math.max(income, expenses + debt, 1);
  const expensesPct = (expenses / total) * 100;
  const debtPct = (debt / total) * 100;
  const remainingPct = Math.max(0, 100 - expensesPct - debtPct);

  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-dim">
        <span>Income: {formatCurrency(income)}</span>
        <span>Expenses + debt: {formatCurrency(expenses + debt)}</span>
      </div>
      <svg
        viewBox="0 0 400 32"
        width="100%"
        height="32"
        className="mt-2"
        role="img"
        aria-label="Income vs expenses flow bar"
      >
        <rect x="0" y="0" width="400" height="32" rx="6" fill="rgba(51,65,85,0.6)" />
        <rect x="0" y="0" width={4 * expensesPct} height="32" rx="6" fill={COLORS.crimson} opacity="0.85" />
        <rect x={4 * expensesPct} y="0" width={4 * debtPct} height="32" fill={COLORS.amber} opacity="0.85" />
        <rect x={4 * (expensesPct + debtPct)} y="0" width={4 * remainingPct} height="32" rx="6" fill={COLORS.emerald} opacity="0.85" />
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-dim">
        <LegendDot color={COLORS.crimson} label="Expenses" />
        <LegendDot color={COLORS.amber} label="Debt payments" />
        <LegendDot color={COLORS.emerald} label="Surplus" />
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function ProjectionChart({ points }: { points: { month: number; cumulative: number }[] }) {
  const width = 640;
  const height = 220;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const values = points.map((p) => p.cumulative);
  const maxV = Math.max(...values, 0);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;

  const scaleX = (m: number) => padding + ((m - 1) / 11) * chartWidth;
  const scaleY = (v: number) => padding + chartHeight - ((v - minV) / range) * chartHeight;
  const zeroY = scaleY(0);

  const linePoints = points.map((p) => `${scaleX(p.month)},${scaleY(p.cumulative)}`).join(" ");
  const finalPositive = values[values.length - 1] >= 0;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className="mt-4"
      role="img"
      aria-label="12-month cumulative surplus projection"
    >
      <line
        x1={padding}
        x2={width - padding}
        y1={zeroY}
        y2={zeroY}
        stroke="rgba(148,163,184,0.3)"
        strokeDasharray="4 4"
      />
      <polyline
        points={linePoints}
        fill="none"
        stroke={finalPositive ? COLORS.emerald : COLORS.crimson}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle key={p.month} cx={scaleX(p.month)} cy={scaleY(p.cumulative)} r="2.5" fill={finalPositive ? COLORS.emerald : COLORS.crimson} />
      ))}
    </svg>
  );
}
