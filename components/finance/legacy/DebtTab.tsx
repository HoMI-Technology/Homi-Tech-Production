"use client";

import { useMemo, useState } from "react";
import { COLORS } from "@/lib/brand";
import { compareStrategies, type Debt } from "@/lib/tools/debt";
import { formatCurrency, formatMonths } from "@/lib/tools/format";

export function DebtTab() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [extra, setExtra] = useState(300);

  const validDebts = debts.filter((d) => d.balance > 0 && d.minPayment > 0);
  const comparison = useMemo(
    () => (validDebts.length > 0 ? compareStrategies(validDebts, extra) : null),
    [debts, extra],
  );

  function updateDebt(id: string, patchD: Partial<Debt>) {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patchD } : d)));
  }
  function addDebt() {
    setDebts((prev) => [
      ...prev,
      { id: `debt-${crypto.randomUUID()}`, name: "", balance: 0, apr: 0, minPayment: 0 },
    ]);
  }
  function removeDebt(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="glass p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-light">Your debts</h2>
          <button className="btn btn-ghost btn-xs text-sm" onClick={addDebt}>
            + Add debt
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {debts.length === 0 ? (
            <p className="text-sm text-dim">Add your debts to compare payoff strategies.</p>
          ) : (
            debts.map((debt) => (
              <div
                key={debt.id}
                className="grid grid-cols-2 gap-3 rounded-lg border border-slate-surface/60 p-3 sm:grid-cols-5"
              >
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
            ))
          )}
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
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <DebtCurveCard title="Avalanche" subtitle="Highest interest rate first" months={comparison.avalanche.months} interest={comparison.avalanche.totalInterest} curve={comparison.avalanche.curve} color={COLORS.cyan} />
            <DebtCurveCard title="Snowball" subtitle="Smallest balance first" months={comparison.snowball.months} interest={comparison.snowball.totalInterest} curve={comparison.snowball.curve} color={COLORS.yellow} />
          </div>
          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              {comparison.interestSaved > 0 ? (
                <>
                  Avalanche saves you {formatCurrency(comparison.interestSaved)} in interest
                  compared to snowball. If you can stay motivated by the math, avalanche is the
                  cheaper path. If seeing a balance hit zero keeps you going, snowball's small wins
                  might get you to the finish line even if it costs a bit more.
                </>
              ) : (
                <>
                  Your debts are ordered similarly under both strategies here, so the difference is
                  small either way.
                </>
              )}
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-dim">
          Add at least one debt with a balance and minimum payment to see a comparison.
        </p>
      )}
    </div>
  );
}

function DebtCurveCard({
  title,
  subtitle,
  months,
  interest,
  curve,
  color,
}: {
  title: string;
  subtitle: string;
  months: number;
  interest: number;
  curve: { month: number; totalBalance: number }[];
  color: string;
}) {
  const width = 480;
  const height = 160;
  const padding = 16;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxBalance = curve[0]?.totalBalance || 1;
  const maxMonth = curve[curve.length - 1]?.month || 1;

  const points = curve
    .map((p) => {
      const x = padding + (p.month / maxMonth) * chartWidth;
      const y = padding + chartHeight - (p.totalBalance / maxBalance) * chartHeight;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="glass p-6">
      <h3 className="font-semibold text-light">{title}</h3>
      <p className="text-xs text-dim">{subtitle}</p>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        className="mt-4"
        role="img"
        aria-label={`${title} payoff curve`}
      >
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-dim">Time to freedom</p>
          <p className="score-numeral text-lg font-bold text-light">{formatMonths(months)}</p>
        </div>
        <div>
          <p className="text-xs text-dim">Total interest paid</p>
          <p className="score-numeral text-lg font-bold text-light">{formatCurrency(interest)}</p>
        </div>
      </div>
    </div>
  );
}
