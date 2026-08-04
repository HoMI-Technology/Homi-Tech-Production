"use client";

import { useMemo } from "react";
import { COLORS } from "@/lib/brand";
import {
  totalNetWorth,
  netCashFlow,
  savingsRate,
  type FinanceState,
  type FinanceAsset,
  type FinanceLiability,
} from "@/lib/finance/store";
import { formatCompactCurrency, formatCurrency } from "@/lib/tools/format";

export function NetWorthTab({
  state,
  patch,
}: {
  state: FinanceState;
  patch: (p: Partial<FinanceState>) => void;
}) {
  const netWorth = totalNetWorth(state);
  const rate = savingsRate(state) / 100;
  const monthlyBuild = Math.max(0, netCashFlow(state));

  function updateAsset(id: string, patchA: Partial<FinanceAsset>) {
    patch({ assets: state.assets.map((a) => (a.id === id ? { ...a, ...patchA } : a)) });
  }
  function addAsset() {
    patch({
      assets: [...state.assets, { id: `asset-${crypto.randomUUID()}`, name: "", amount: 0 }],
    });
  }
  function removeAsset(id: string) {
    patch({ assets: state.assets.filter((a) => a.id !== id) });
  }

  function updateLiability(id: string, patchL: Partial<FinanceLiability>) {
    patch({ liabilities: state.liabilities.map((l) => (l.id === id ? { ...l, ...patchL } : l)) });
  }
  function addLiability() {
    patch({
      liabilities: [
        ...state.liabilities,
        { id: `liability-${crypto.randomUUID()}`, name: "", amount: 0 },
      ],
    });
  }
  function removeLiability(id: string) {
    patch({ liabilities: state.liabilities.filter((l) => l.id !== id) });
  }

  // 24-month projection assuming the current monthly surplus builds net worth linearly.
  const projection = useMemo(() => {
    const points: { month: number; value: number }[] = [];
    for (let m = 0; m <= 24; m++) {
      points.push({ month: m, value: netWorth + monthlyBuild * m });
    }
    return points;
  }, [netWorth, monthlyBuild]);

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="glass p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-light">Assets</h2>
            <button className="btn btn-ghost btn-xs text-sm" onClick={addAsset}>
              + Add asset
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {state.assets.map((a) => (
              <EditableRow
                key={a.id}
                name={a.name}
                amount={a.amount}
                onName={(v) => updateAsset(a.id, { name: v })}
                onAmount={(v) => updateAsset(a.id, { amount: v })}
                onRemove={() => removeAsset(a.id)}
              />
            ))}
          </div>
        </div>

        <div className="glass p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-light">Liabilities</h2>
            <button className="btn btn-ghost btn-xs text-sm" onClick={addLiability}>
              + Add liability
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {state.liabilities.map((l) => (
              <EditableRow
                key={l.id}
                name={l.name}
                amount={l.amount}
                onName={(v) => updateLiability(l.id, { name: v })}
                onAmount={(v) => updateLiability(l.id, { amount: v })}
                onRemove={() => removeLiability(l.id)}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="glass p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-dim">Net worth</p>
        <p
          className={`score-numeral mt-2 text-4xl font-bold ${netWorth >= 0 ? "text-emerald" : "text-crimson"}`}
        >
          {formatCompactCurrency(netWorth)}
        </p>
      </div>

      <div className="glass p-6">
        <h2 className="font-semibold text-light">24-month projection</h2>
        <p className="mt-1 text-xs text-dim">
          Assumes your current monthly surplus ({formatCurrency(monthlyBuild)}) continues to build
          net worth at a flat pace — a floor, not a forecast of investment growth.
        </p>
        <NetWorthProjectionChart points={projection} />
      </div>
    </div>
  );
}

function EditableRow({
  name,
  amount,
  onName,
  onAmount,
  onRemove,
}: {
  name: string;
  amount: number;
  onName: (v: string) => void;
  onAmount: (v: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 rounded-lg border border-slate-surface/60 p-3">
      <input
        className="input col-span-2"
        placeholder="Name"
        value={name}
        onChange={(e) => onName(e.target.value)}
      />
      <div className="flex gap-2">
        <input
          className="input"
          type="number"
          placeholder="Amount"
          value={amount || ""}
          onChange={(e) => onAmount(Number(e.target.value))}
        />
        <button
          className="btn btn-ghost !px-3"
          onClick={onRemove}
          aria-label={`Remove ${name || "item"}`}
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
  );
}

function NetWorthProjectionChart({ points }: { points: { month: number; value: number }[] }) {
  const width = 640;
  const height = 220;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const values = points.map((p) => p.value);
  const maxV = Math.max(...values, 0);
  const minV = Math.min(...values, 0);
  const range = maxV - minV || 1;

  const scaleX = (m: number) => padding + (m / 24) * chartWidth;
  const scaleY = (v: number) => padding + chartHeight - ((v - minV) / range) * chartHeight;
  const zeroY = scaleY(0);

  const linePoints = points.map((p) => `${scaleX(p.month)},${scaleY(p.value)}`).join(" ");
  const finalPositive = values[values.length - 1] >= 0;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label="24-month net worth projection">
      <line x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" />
      <polyline points={linePoints} fill="none" stroke={finalPositive ? COLORS.emerald : COLORS.crimson} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
