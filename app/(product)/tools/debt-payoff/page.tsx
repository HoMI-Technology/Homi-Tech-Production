"use client";

import { useEffect, useMemo, useState } from "react";
import { COLORS } from "@/lib/brand";
import { compareStrategies, type Debt, type PayoffResult } from "@/lib/tools/debt";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { ChainLinks } from "@/components/tools/ChainLinks";
import { LensSynthesis } from "@/components/tools/LensSynthesis";
import { SaveScenarioButton } from "@/components/tools/SaveScenarioButton";
import { getLens } from "@/lib/tools/registry";
import { loadFinanceState, hasSavedFinanceState, netCashFlow } from "@/lib/finance/store";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";
import { ToolShell } from "@/components/tools/ToolShell";
import { DebtPayoffScorePreview } from "@/components/tools/DebtPayoffScorePreview";
import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { metricsFromLedger } from "@/lib/finance/metrics";

const LENS = getLens("debt-payoff")!;

function makeDebt(partial: Partial<Debt> = {}): Debt {
  return {
    id: `debt-${crypto.randomUUID()}`,
    name: partial.name ?? "",
    balance: partial.balance ?? 0,
    apr: partial.apr ?? 0,
    minPayment: partial.minPayment ?? 0,
  };
}

export default function DebtPayoffPage() {
  return (
    <AdvancedToolGate>
      <DebtPayoffPageInner />
    </AdvancedToolGate>
  );
}

function DebtPayoffPageInner() {
  const [debts, setDebts] = useState<Debt[]>([
    makeDebt({ name: "Credit card", balance: 4500, apr: 22.9, minPayment: 120 }),
    makeDebt({ name: "Car loan", balance: 12000, apr: 6.5, minPayment: 280 }),
    makeDebt({ name: "Student loan", balance: 18000, apr: 5.0, minPayment: 210 }),
  ]);
  const [extra, setExtra] = useState(300);
  /** True when the debt rows were seeded from the finance dashboard — the
   * honesty note explains which fields are real and which still need the
   * user. */
  const [balancesSeeded, setBalancesSeeded] = useState(false);
  const [previewIncome, setPreviewIncome] = useState<number | null>(null);
  const [previewRunway, setPreviewRunway] = useState<number | null>(null);
  const [previewOutflow, setPreviewOutflow] = useState<number | null>(null);

  // Decision Lab: itemized CFM mapping. The finance dashboard stores
  // liability names and balances — never rates or minimums — so a seed
  // replaces the illustrative rows with real balances and leaves apr /
  // minPayment at zero, which the page treats as "needs your input"
  // rather than inventing numbers. The extra payment seeds from actual
  // positive cash flow. Mount-only; never fights live edits.
  useEffect(() => {
    if (hasSavedFinanceState()) {
      const finance = loadFinanceState();
      const real = finance.liabilities.filter((l) => l.amount > 0);
      if (real.length > 0) {
        setDebts(real.map((l) => makeDebt({ name: l.name, balance: l.amount })));
        setBalancesSeeded(true);
      }
      const flow = netCashFlow(finance);
      if (flow > 0) setExtra(Math.round(flow));
      if (!hasSavedBudgetLedger() && finance.monthlyIncome > 0) {
        setPreviewIncome(finance.monthlyIncome);
      }
    }
    if (hasSavedBudgetLedger()) {
      const nowIso = new Date().toISOString();
      const metrics = metricsFromLedger(loadBudgetLedger(nowIso), nowIso, budgetLedgerSavedAt());
      setPreviewIncome(metrics.surplus.incomeDollars > 0 ? metrics.surplus.incomeDollars : null);
      setPreviewRunway(metrics.runway.months);
      setPreviewOutflow(
        metrics.runway.monthlyOutflowDollars > 0 ? metrics.runway.monthlyOutflowDollars : null,
      );
    }
  }, []);

  const validDebts = debts.filter((d) => d.balance > 0 && d.minPayment > 0);
  const comparison = useMemo(
    () => (validDebts.length > 0 ? compareStrategies(validDebts, extra) : null),
    [debts, extra],
  );

  const totalBalance = useMemo(
    () => debts.reduce((s, d) => s + (d.balance > 0 ? d.balance : 0), 0),
    [debts],
  );
  const weightedAprPct = useMemo(() => {
    if (totalBalance <= 0) return 0;
    const w = debts.reduce((s, d) => (d.balance > 0 ? s + d.balance * d.apr : s), 0);
    return Math.round((w / totalBalance) * 100) / 100;
  }, [debts, totalBalance]);

  // The lens digest the Companion reads — only once a real comparison
  // exists, so the headline never describes placeholder math.
  const digest = useMemo(
    () =>
      comparison
        ? {
            lensId: "debt-payoff",
            path: "/tools/debt-payoff",
            headline: {
              label: "Interest saved by avalanche vs snowball",
              value: Math.round(Math.max(0, comparison.interestSaved)),
              unit: "currency" as const,
            },
            keyInputs: {
              extra,
              debtCount: validDebts.length,
              totalBalance: Math.round(totalBalance),
            },
            deltas: null,
          }
        : null,
    [comparison, extra, validDebts.length, totalBalance],
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
    <ToolShell
      relatedGuide={LENS.relatedGuide}
      title="Debt Payoff"
      description={`Avalanche pays the highest interest rate first — mathematically optimal. Snowball pays the smallest balance first — psychologically easier for some. Both are shown honestly, side by side.`}
    >
      <SavedNumbersStrip />

      <div className="mt-8 glass p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-light">Your debts</h2>
          <button className="btn btn-ghost btn-xs text-sm" onClick={addDebt}>
            + Add debt
          </button>
        </div>

        {balancesSeeded && (
          <p className="mt-3 rounded-lg border border-cyan/20 bg-cyan/5 p-3 text-xs leading-relaxed text-dim">
            Balances loaded from your finance dashboard. Rates and minimum payments aren&apos;t
            stored there — add them to each row to see your comparison.
          </p>
        )}

        <div className="mt-4 space-y-3">
          {debts.map((debt) => (
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
                  className="btn btn-ghost btn-xs"
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

        <div className="mt-5 max-w-sm">
          <SaveScenarioButton
            lensId="debt-payoff"
            getInputs={() => ({
              extra,
              debtCount: debts.filter((d) => d.balance > 0).length,
              totalBalance: Math.round(totalBalance),
              weightedAprPct,
            })}
          />
        </div>
      </div>

      {comparison ? (
        <>
          {digest && (
            <div className="mt-8 max-w-xl">
              <LensSynthesis digest={digest} />
            </div>
          )}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <StrategyCard
              title="Avalanche"
              subtitle="Highest interest rate first"
              result={comparison.avalanche}
              color={COLORS.cyan}
            />
            <StrategyCard
              title="Snowball"
              subtitle="Smallest balance first"
              result={comparison.snowball}
              color={COLORS.yellow}
            />
          </div>
        </>
      ) : (
        <p className="mt-8 text-sm text-dim">
          Add at least one debt with a balance and minimum payment to see a comparison.
        </p>
      )}

      {comparison && (
        <DebtPayoffScorePreview
          monthlyIncome={previewIncome}
          currentMonthlyDebt={validDebts.reduce((sum, debt) => sum + debt.minPayment, 0)}
          remainingMonthlyDebt={0}
          currentRunwayMonths={previewRunway}
          projectedRunwayMonths={
            previewRunway != null && previewOutflow != null && previewOutflow > 0
              ? (previewRunway * previewOutflow) /
                Math.max(
                  1,
                  previewOutflow - validDebts.reduce((sum, debt) => sum + debt.minPayment, 0),
                )
              : null
          }
        />
      )}

      {comparison && (
        <div className="glass mt-8 p-6">
          <h2 className="font-semibold text-light">What this means</h2>
          <p className="mt-2 text-sm leading-relaxed text-dim">
            {comparison.interestSaved > 0 ? (
              <>
                Avalanche saves you {formatCurrency(comparison.interestSaved)} in interest compared
                to snowball. If you can stay motivated by the math, avalanche is the cheaper path.
                If seeing a balance hit zero keeps you going, snowball's small wins might get you to
                the finish line even if it costs a bit more.
              </>
            ) : (
              <>
                Your debts are ordered similarly under both strategies here, so the difference is
                small either way.
              </>
            )}
          </p>
        </div>
      )}

      {LENS.chains && (
        <div className="mt-8 max-w-xl">
          <ChainLinks chains={LENS.chains} />
        </div>
      )}
    </ToolShell>
  );
}

function StrategyCard({
  title,
  subtitle,
  result,
  color,
}: {
  title: string;
  subtitle: string;
  result: PayoffResult;
  color: string;
}) {
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
          <p className="score-numeral text-lg font-bold text-light">
            {formatMonths(result.months)}
          </p>
        </div>
        <div>
          <p className="text-xs text-dim">Total interest paid</p>
          <p className="score-numeral text-lg font-bold text-light">
            {formatCurrency(result.totalInterest)}
          </p>
        </div>
      </div>
    </div>
  );
}
