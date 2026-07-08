"use client";

import { useMemo, useState } from "react";
import { compareStrategies, type Debt, type PayoffResult } from "@/lib/tools/debt";
import { formatCurrency, formatMonths } from "@/lib/tools/format";

let nextId = 1;
function makeDebt(partial: Partial<Debt> = {}): Debt {
  return {
    id: `debt-${nextId++}`,
    name: partial.name ?? "",
    balance: partial.balance ?? 0,
    apr: partial.apr ?? 0,
    minPayment: partial.minPayment ?? 0,
  };
}

export default function DebtPayoffPage() {
  const [debts, setDebts] = useState<Debt[]>([
    makeDebt({ name: "Credit card", balance: 4500, apr: 22.9, minPayment: 120 }),
    makeDebt({ name: "Car loan", balance: 12000, apr: 6.5, minPayment: 280 }),
    makeDebt({ name: "Student loan", balance: 18000, apr: 5.0, minPayment: 210 }),
  ]);
  const [extra, setExtra] = useState(300);

  const validDebts = debts.filter((d) => d.balance > 0 && d.minPayment > 0);
  const comparison = useMemo(
    () => (validDebts.length > 0 ? compareStrategies(validDebts, extra) : null),
    [debts, extra],
  );

  function updateDebt(id: string, patch: Partial<Debt>) {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }
  function addDebt() {
    setDebts((prev) => [...prev, makeDebt()]);
  }
  function removeDebt(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Debt Payoff</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Avalanche pays the highest interest rate first — mathematically optimal. Snowball pays the smallest
        balance first — psychologically easier for some. Both are shown honestly, side by side.
      </p>

      <div className="mt-8 glass p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-light">Your debts</h2>
          <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={addDebt}>
            + Add debt
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {debts.map((debt) => (
            <div key={debt.id} className="grid grid-cols-2 gap-3 rounded-lg border border-slate-surface/60 p-3 sm:grid-cols-5">
              <input
                className="input sm:col-span-2"
                placeholder="Name"
                value={debt.name}
                onChange={(e) => updateDebt(debt.id, { name: e.target.value })}
              />
              <input
                className="input"
                type="number"
                placeholder="Balance"
                value={debt.balance || ""}
                onChange={(e) => updateDebt(debt.id, { balance: Number(e.target.value) })}
              />
              <input
                className="input"
                type="number"
                placeholder="APR %"
                value={debt.apr || ""}
                onChange={(e) => updateDebt(debt.id, { apr: Number(e.target.value) })}
              />
              <div className="flex gap-2">
                <input
                  className="input"
                  type="number"
                  placeholder="Min payment"
                  value={debt.minPayment || ""}
                  onChange={(e) => updateDebt(debt.id, { minPayment: Number(e.target.value) })}
                />
                <button
                  className="btn btn-ghost !px-3"
                  onClick={() => removeDebt(debt.id)}
                  aria-label={`Remove ${debt.name || "debt"}`}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 max-w-xs">
          <label className="text-sm text-light">Extra monthly payment</label>
          <input
            className="input mt-2"
            type="number"
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
          />
        </div>
      </div>

      {comparison ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <StrategyCard title="Avalanche" subtitle="Highest interest rate first" result={comparison.avalanche} color="#22d3ee" />
          <StrategyCard title="Snowball" subtitle="Smallest balance first" result={comparison.snowball} color="#facc15" />
        </div>
      ) : (
        <p className="mt-8 text-sm text-dim">Add at least one debt with a balance and minimum payment to see a comparison.</p>
      )}

      {comparison && (
        <div className="glass mt-8 p-6">
          <h2 className="font-semibold text-light">What this means</h2>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            {comparison.interestSaved > 0 ? (
              <>
                Avalanche saves you {formatCurrency(comparison.interestSaved)} in interest compared to
                snowball. If you can stay motivated by the math, avalanche is the cheaper path. If seeing a
                balance hit zero keeps you going, snowball's small wins might get you to the finish line
                even if it costs a bit more.
              </>
            ) : (
              <>Your debts are ordered similarly under both strategies here, so the difference is small either way.</>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function StrategyCard({ title, subtitle, result, color }: { title: string; subtitle: string; result: PayoffResult; color: string }) {
  const width = 480;
  const height = 160;
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxBalance = result.curve[0]?.totalBalance || 1;
  const maxMonth = result.curve[result.curve.length - 1]?.month || 1;

  const points = result.curve
    .map((p) => {
      const x = padding + (p.month / maxMonth) * chartWidth;
      const y = padding + chartHeight - (p.totalBalance / maxBalance) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="glass p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-light">{title}</h3>
          <p className="text-xs text-dim">{subtitle}</p>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label={`${title} payoff curve`}>
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-dim">Time to freedom</p>
          <p className="score-numeral text-lg font-bold text-light">{formatMonths(result.months)}</p>
        </div>
        <div>
          <p className="text-xs text-dim">Total interest paid</p>
          <p className="score-numeral text-lg font-bold text-light">{formatCurrency(result.totalInterest)}</p>
        </div>
      </div>
    </div>
  );
}
