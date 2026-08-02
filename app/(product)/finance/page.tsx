"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_FINANCE_STATE,
  loadFinanceState,
  pullFinanceState,
  saveFinanceState,
  hasSavedFinanceState,
  netCashFlow,
  savingsRate,
  runwayMonths,
  debtToIncome,
  dtiTemperature,
  savingsRateTemperature,
  runwayTemperature,
  cashFlowTemperature,
  totalNetWorth,
  type FinanceState,
  type ExpenseCategory,
  type FinanceAsset,
  type FinanceLiability,
  type Temperature,
} from "@/lib/finance/store";
import { compareStrategies, type Debt } from "@/lib/tools/debt";
import { runMonteCarlo, type MonteCarloResult } from "@/lib/tools/montecarlo";
import { formatCurrency, formatCompactCurrency, formatMonths, formatPercent } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { NumberField } from "@/components/ui/NumberField";
import Link from "next/link";
import {
  loadReadinessPath,
  bindingConstraintLabel,
  computeBindingProgress,
  deriveFundingFromPath,
  applyPathFunding,
  type ReadinessPath,
} from "@/lib/readiness";

type TabKey = "overview" | "cashflow" | "debt" | "montecarlo" | "networth";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "cashflow", label: "Cash Flow" },
  { key: "debt", label: "Debt" },
  { key: "montecarlo", label: "Monte Carlo" },
  { key: "networth", label: "Net Worth" },
];

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


export default function FinancePage() {
  const [state, setState] = useState<FinanceState>(DEFAULT_FINANCE_STATE);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<TabKey>("overview");

  // True once the user edits anything — a late-arriving server copy must
  // never overwrite an edit already on screen.
  const dirtyRef = useRef(false);

  // Load persisted state + initial tab from URL hash, once, after mount.
  // Local renders immediately; the server copy reconciles in the background
  // (last-write-wins — lib/persistence.ts). Persist-on-change stays disabled
  // until the pull settles: hydrating defaults first and pulling second would
  // stamp-and-push defaults over a user's real cross-device numbers.
  useEffect(() => {
    setState(loadFinanceState());
    const hash = window.location.hash.replace("#", "") as TabKey;
    if (TABS.some((t) => t.key === hash)) setTab(hash);
    let cancelled = false;
    void pullFinanceState()
      .then((remote) => {
        if (!cancelled && remote && !dirtyRef.current) setState(remote);
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Persist on every change, after hydration.
  useEffect(() => {
    if (!hydrated) return;
    saveFinanceState(state);
  }, [state, hydrated]);

  // Keep URL hash in sync with the active tab.
  useEffect(() => {
    if (!hydrated) return;
    window.history.replaceState(null, "", `#${tab}`);
  }, [tab, hydrated]);

  useEffect(() => {
    function onHashChange() {
      const hash = window.location.hash.replace("#", "") as TabKey;
      if (TABS.some((t) => t.key === hash)) setTab(hash);
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const patch = useCallback((partial: Partial<FinanceState>) => {
    dirtyRef.current = true;
    setState((prev) => ({ ...prev, ...partial }));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10 sm:py-12">
      <p className="eyebrow">Operate · money</p>
      <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Finance</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Your personal-finance cockpit. Enter numbers once — every tab reads the same honest picture.
      </p>

      <div
        role="tablist"
        aria-label="Finance sections"
        className="mt-8 flex flex-wrap gap-1 border-b border-slate-surface/60 pb-px"
      >
        {TABS.map((t) => {
          const selected = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              id={`finance-tab-${t.key}`}
              aria-selected={selected}
              aria-controls={`finance-panel-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`rounded-t-lg px-4 py-2.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan ${
                selected
                  ? "border-b-2 border-cyan bg-slate-surface/40 text-cyan"
                  : "text-dim hover:text-light"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`finance-panel-${tab}`}
        aria-labelledby={`finance-tab-${tab}`}
        className="mt-8"
      >
        {tab === "overview" && <OverviewTab state={state} patch={patch} />}
        {tab === "cashflow" && <CashFlowTab state={state} patch={patch} />}
        {tab === "debt" && <DebtTab />}
        {tab === "montecarlo" && <MonteCarloTab state={state} patch={patch} />}
        {tab === "networth" && <NetWorthTab state={state} patch={patch} />}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════ Overview ═══════════════════ */

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
    path.steps.find(
      (s) => s.reasonCode !== "REASSESS" && (s.status ?? "pending") === "pending",
    ) ??
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
    progress.ratio != null
      ? Math.round(Math.min(1, Math.max(0, progress.ratio)) * 100)
      : null;

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
        <Link href="/calendar" className="btn btn-ghost !px-3 !py-1.5 text-sm">
          Calendar
        </Link>
        <Link href="/path" className="btn btn-ghost !px-3 !py-1.5 text-sm">
          Path
        </Link>
        <Link href="/results" className="btn btn-ghost !px-3 !py-1.5 text-sm">
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
          className="btn btn-primary !px-3 !py-1.5 text-sm"
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
            className="btn btn-ghost !px-3 !py-1.5 text-sm"
            onClick={() => {
              const next = applyPathFunding(state, suggestion, "savings_floor");
              onApplied(next);
            }}
          >
            Record savings floor
          </button>
        )}
        <Link href="/path" className="btn btn-ghost !px-3 !py-1.5 text-sm">
          Open path
        </Link>
      </div>
    </div>
  );
}

function OverviewTab({
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
        <NumberField label="Monthly income" value={state.monthlyIncome} onChange={(v) => patch({ monthlyIncome: v ?? 0 })} />
        <NumberField label="Monthly expenses" value={state.monthlyExpenses} onChange={(v) => patch({ monthlyExpenses: v ?? 0 })} />
        <NumberField label="Liquid savings" value={state.liquidSavings} onChange={(v) => patch({ liquidSavings: v ?? 0 })} />
        <NumberField label="Total debt" value={state.totalDebt} onChange={(v) => patch({ totalDebt: v ?? 0 })} />
        <NumberField label="Monthly debt payments" value={state.monthlyDebtPayments} onChange={(v) => patch({ monthlyDebtPayments: v ?? 0 })} />
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
    <div className={`glass glass-hover relative overflow-hidden border p-5 ${TEMP_BG[temperature]}`}>
      <p className="text-xs font-semibold uppercase tracking-widest text-dim">{label}</p>
      <p className={`score-numeral mt-2 text-2xl font-bold tracking-tight sm:text-3xl ${TEMP_TEXT[temperature]}`}>
        {value}
      </p>
      <p className="mt-3 text-xs leading-relaxed text-dim">{read}</p>
    </div>
  );
}

/* ═══════════════════════════════════════════ Cash Flow ══════════════════ */

function CashFlowTab({
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
      expenseCategories: state.expenseCategories.map((c) => (c.id === id ? { ...c, ...patchC } : c)),
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
          <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={addCategory}>
            + Add category
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {state.expenseCategories.map((cat) => (
            <div key={cat.id} className="grid grid-cols-3 gap-3 rounded-lg border border-slate-surface/60 p-3">
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
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <FlowBar income={state.monthlyIncome} expenses={totalExpenses} debt={state.monthlyDebtPayments} />
        <p className="mt-4 text-sm text-dim">
          Monthly surplus: <span className={`score-numeral font-semibold ${surplus >= 0 ? "text-emerald" : "text-crimson"}`}>{formatCurrency(surplus)}</span>
        </p>
      </div>

      <div className="glass p-6">
        <h2 className="font-semibold text-light">12-month surplus trend</h2>
        <p className="mt-1 text-xs text-dim">
          Projects your current monthly surplus forward — a straight line, not a forecast of market returns.
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
      <svg viewBox="0 0 400 32" width="100%" height="32" className="mt-2" role="img" aria-label="Income vs expenses flow bar">
        <rect x="0" y="0" width="400" height="32" rx="6" fill="rgba(51,65,85,0.6)" />
        <rect x="0" y="0" width={4 * expensesPct} height="32" rx="6" fill="#f24822" opacity="0.85" />
        <rect x={4 * expensesPct} y="0" width={4 * debtPct} height="32" fill="#fab633" opacity="0.85" />
        <rect x={4 * (expensesPct + debtPct)} y="0" width={4 * remainingPct} height="32" rx="6" fill="#34d399" opacity="0.85" />
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-dim">
        <LegendDot color="#f24822" label="Expenses" />
        <LegendDot color="#fab633" label="Debt payments" />
        <LegendDot color="#34d399" label="Surplus" />
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
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label="12-month cumulative surplus projection">
      <line x1={padding} x2={width - padding} y1={zeroY} y2={zeroY} stroke="rgba(148,163,184,0.3)" strokeDasharray="4 4" />
      <polyline
        points={linePoints}
        fill="none"
        stroke={finalPositive ? "#34d399" : "#f24822"}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p) => (
        <circle key={p.month} cx={scaleX(p.month)} cy={scaleY(p.cumulative)} r="2.5" fill={finalPositive ? "#34d399" : "#f24822"} />
      ))}
    </svg>
  );
}

/* ═══════════════════════════════════════════ Debt ════════════════════════ */

function DebtTab() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: `debt-${crypto.randomUUID()}`, name: "Credit card", balance: 4500, apr: 22.9, minPayment: 120 },
    { id: `debt-${crypto.randomUUID()}`, name: "Car loan", balance: 12000, apr: 6.5, minPayment: 280 },
  ]);
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
    setDebts((prev) => [...prev, { id: `debt-${crypto.randomUUID()}`, name: "", balance: 0, apr: 0, minPayment: 0 }]);
  }
  function removeDebt(id: string) {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <div className="space-y-8">
      <div className="glass p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-light">Your debts</h2>
          <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={addDebt}>
            + Add debt
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {debts.map((debt) => (
            <div key={debt.id} className="grid grid-cols-2 gap-3 rounded-lg border border-slate-surface/60 p-3 sm:grid-cols-5">
              <input className="input sm:col-span-2" placeholder="Name" value={debt.name} onChange={(e) => updateDebt(debt.id, { name: e.target.value })} />
              <input className="input" type="number" placeholder="Balance" value={debt.balance || ""} onChange={(e) => updateDebt(debt.id, { balance: Number(e.target.value) })} />
              <input className="input" type="number" placeholder="APR %" value={debt.apr || ""} onChange={(e) => updateDebt(debt.id, { apr: Number(e.target.value) })} />
              <div className="flex gap-2">
                <input className="input" type="number" placeholder="Min payment" value={debt.minPayment || ""} onChange={(e) => updateDebt(debt.id, { minPayment: Number(e.target.value) })} />
                <button className="btn btn-ghost !px-3" onClick={() => removeDebt(debt.id)} aria-label={`Remove ${debt.name || "debt"}`}>
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
          <input className="input mt-2" type="number" value={extra} onChange={(e) => setExtra(Number(e.target.value))} />
        </div>
      </div>

      {comparison ? (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <DebtCurveCard title="Avalanche" subtitle="Highest interest rate first" months={comparison.avalanche.months} interest={comparison.avalanche.totalInterest} curve={comparison.avalanche.curve} color="#22d3ee" />
            <DebtCurveCard title="Snowball" subtitle="Smallest balance first" months={comparison.snowball.months} interest={comparison.snowball.totalInterest} curve={comparison.snowball.curve} color="#facc15" />
          </div>
          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              {comparison.interestSaved > 0 ? (
                <>
                  Avalanche saves you {formatCurrency(comparison.interestSaved)} in interest compared to snowball.
                  If you can stay motivated by the math, avalanche is the cheaper path. If seeing a balance hit
                  zero keeps you going, snowball's small wins might get you to the finish line even if it costs
                  a bit more.
                </>
              ) : (
                <>Your debts are ordered similarly under both strategies here, so the difference is small either way.</>
              )}
            </p>
          </div>
        </>
      ) : (
        <p className="text-sm text-dim">Add at least one debt with a balance and minimum payment to see a comparison.</p>
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
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label={`${title} payoff curve`}>
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
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

/* ═══════════════════════════════════════════ Monte Carlo ════════════════ */

function MonteCarloTab({
  state,
  patch,
}: {
  state: FinanceState;
  patch: (p: Partial<FinanceState>) => void;
}) {
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const monthlyContribution = Math.max(0, netCashFlow(state));

  // Seeded PRNG-backed simulation — must run client-side after mount to avoid
  // any hydration mismatch, per HōMI's deterministic-randomness convention.
  useEffect(() => {
    const r = runMonteCarlo({
      currentSavings: state.liquidSavings,
      monthlyContribution,
      years: state.monteCarloYears,
      expectedReturnPct: state.expectedReturnPct,
      volatilityPct: state.volatilityPct,
      targetAmount: state.downPaymentTarget,
      seed: 1337,
      runs: 1000,
    });
    setResult(r);
  }, [
    state.liquidSavings,
    monthlyContribution,
    state.monteCarloYears,
    state.expectedReturnPct,
    state.volatilityPct,
    state.downPaymentTarget,
  ]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
      <div className="glass h-fit space-y-5 p-6">
        <SliderField label="Down-payment target" value={state.downPaymentTarget} onChange={(v) => patch({ downPaymentTarget: v })} min={0} max={500000} step={5000} format="currency" />
        <SliderField label="Time horizon (years)" value={state.monteCarloYears} onChange={(v) => patch({ monteCarloYears: v })} min={1} max={20} step={1} format="years" />
        <SliderField label="Expected annual return" value={state.expectedReturnPct} onChange={(v) => patch({ expectedReturnPct: v })} min={0} max={12} step={0.5} format="percent" />
        <SliderField label="Volatility (annual std dev)" value={state.volatilityPct} onChange={(v) => patch({ volatilityPct: v })} min={2} max={30} step={1} format="percent" />
        <p className="text-xs text-dim">
          Monthly contribution is your current net cash flow: <span className="score-numeral text-cyan">{formatCurrency(monthlyContribution)}</span>. Improve it on the Overview tab.
        </p>
      </div>

      <div className="space-y-6">
        {result && (
          <>
            <div className="glass p-6">
              <h2 className="font-semibold text-light">Probability of reaching your goal</h2>
              <GoalGauge probability={result.probabilityOfTarget ?? 0} />
            </div>

            <div className="glass p-6">
              <h2 className="font-semibold text-light">Outcome range after {state.monteCarloYears} years</h2>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-dim">P10 (weak case)</p>
                  <p className="score-numeral mt-1 text-lg font-bold text-crimson">{formatCurrency(result.finalP10)}</p>
                </div>
                <div>
                  <p className="text-xs text-dim">P50 (median)</p>
                  <p className="score-numeral mt-1 text-lg font-bold text-light">{formatCurrency(result.finalP50)}</p>
                </div>
                <div>
                  <p className="text-xs text-dim">P90 (strong case)</p>
                  <p className="score-numeral mt-1 text-lg font-bold text-emerald">{formatCurrency(result.finalP90)}</p>
                </div>
              </div>
            </div>

            <div className="glass p-6">
              <h2 className="font-semibold text-light">Savings trajectory</h2>
              <BandChart result={result} target={state.downPaymentTarget} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function GoalGauge({ probability }: { probability: number }) {
  const width = 300;
  const height = 160;
  const cx = width / 2;
  const cy = height - 20;
  const r = 110;
  const pct = Math.max(0, Math.min(100, probability)) / 100;
  const angle = Math.PI * (1 - pct);
  const needleX = cx + r * Math.cos(angle);
  const needleY = cy - r * Math.sin(angle);
  const color = probability >= 70 ? "#34d399" : probability >= 40 ? "#facc15" : "#f24822";

  const arcPath = (startPct: number, endPct: number) => {
    const a0 = Math.PI * (1 - startPct);
    const a1 = Math.PI * (1 - endPct);
    const x0 = cx + r * Math.cos(a0);
    const y0 = cy - r * Math.sin(a0);
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy - r * Math.sin(a1);
    return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
  };

  return (
    <div className="mt-2 flex flex-col items-center">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} role="img" aria-label={`Probability of reaching goal: ${Math.round(probability)}%`}>
        <path d={arcPath(0, 0.4)} stroke="#f24822" strokeWidth="14" fill="none" opacity="0.55" strokeLinecap="round" />
        <path d={arcPath(0.4, 0.7)} stroke="#facc15" strokeWidth="14" fill="none" opacity="0.55" strokeLinecap="round" />
        <path d={arcPath(0.7, 1)} stroke="#34d399" strokeWidth="14" fill="none" opacity="0.55" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill="#e2e8f0" />
      </svg>
      <p className="score-numeral -mt-4 text-3xl font-bold" style={{ color }}>
        {Math.round(probability)}%
      </p>
      <p className="mt-1 text-xs text-dim">chance of reaching your target on this path</p>
    </div>
  );
}

function BandChart({ result, target }: { result: MonteCarloResult; target: number }) {
  const width = 640;
  const height = 260;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(...result.bands.map((b) => b.p90), target, 1) * 1.05;
  const maxYear = result.bands[result.bands.length - 1]?.year || 1;

  const scaleX = (year: number) => padding + (year / maxYear) * chartWidth;
  const scaleY = (v: number) => padding + chartHeight - (v / maxValue) * chartHeight;

  const p90Path = result.bands.map((b) => `${scaleX(b.year)},${scaleY(b.p90)}`);
  const p10PathRev = [...result.bands].reverse().map((b) => `${scaleX(b.year)},${scaleY(b.p10)}`);
  const areaPoints = [...p90Path, ...p10PathRev].join(" ");
  const p50Points = result.bands.map((b) => `${scaleX(b.year)},${scaleY(b.p50)}`).join(" ");
  const targetY = scaleY(target);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label="Monte Carlo P10-P90 savings band toward down-payment target">
      <polygon points={areaPoints} fill="#22d3ee" opacity="0.15" />
      <polyline points={p50Points} fill="none" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {target > 0 && (
        <>
          <line x1={padding} x2={width - padding} y1={targetY} y2={targetY} stroke="#facc15" strokeDasharray="6 4" strokeWidth="1.5" />
          <text x={width - padding} y={targetY - 6} textAnchor="end" fontSize="11" fill="#facc15">Target</text>
        </>
      )}
    </svg>
  );
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  format: "currency" | "percent" | "years";
}) {
  const fill = sliderFillPercent(value, min, max);
  const display = format === "currency" ? formatCurrency(value) : format === "percent" ? `${value}%` : `${value} yrs`;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-light">{label}</label>
        <span className="score-numeral text-sm text-cyan">{display}</span>
      </div>
      <input
        type="range"
        className="homi-slider mt-2"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${fill}%` }}
      />
    </div>
  );
}

/* ═══════════════════════════════════════════ Net Worth ══════════════════ */

function NetWorthTab({
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
    patch({ assets: [...state.assets, { id: `asset-${crypto.randomUUID()}`, name: "", amount: 0 }] });
  }
  function removeAsset(id: string) {
    patch({ assets: state.assets.filter((a) => a.id !== id) });
  }

  function updateLiability(id: string, patchL: Partial<FinanceLiability>) {
    patch({ liabilities: state.liabilities.map((l) => (l.id === id ? { ...l, ...patchL } : l)) });
  }
  function addLiability() {
    patch({ liabilities: [...state.liabilities, { id: `liability-${crypto.randomUUID()}`, name: "", amount: 0 }] });
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
            <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={addAsset}>
              + Add asset
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {state.assets.map((a) => (
              <EditableRow key={a.id} name={a.name} amount={a.amount} onName={(v) => updateAsset(a.id, { name: v })} onAmount={(v) => updateAsset(a.id, { amount: v })} onRemove={() => removeAsset(a.id)} />
            ))}
          </div>
        </div>

        <div className="glass p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-light">Liabilities</h2>
            <button className="btn btn-ghost !px-3 !py-1.5 text-sm" onClick={addLiability}>
              + Add liability
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {state.liabilities.map((l) => (
              <EditableRow key={l.id} name={l.name} amount={l.amount} onName={(v) => updateLiability(l.id, { name: v })} onAmount={(v) => updateLiability(l.id, { amount: v })} onRemove={() => removeLiability(l.id)} />
            ))}
          </div>
        </div>
      </div>

      <div className="glass p-6 text-center">
        <p className="text-xs uppercase tracking-wide text-dim">Net worth</p>
        <p className={`score-numeral mt-2 text-4xl font-bold ${netWorth >= 0 ? "text-emerald" : "text-crimson"}`}>
          {formatCompactCurrency(netWorth)}
        </p>
      </div>

      <div className="glass p-6">
        <h2 className="font-semibold text-light">24-month projection</h2>
        <p className="mt-1 text-xs text-dim">
          Assumes your current monthly surplus ({formatCurrency(monthlyBuild)}) continues to build net worth at
          a flat pace — a floor, not a forecast of investment growth.
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
      <input className="input col-span-2" placeholder="Name" value={name} onChange={(e) => onName(e.target.value)} />
      <div className="flex gap-2">
        <input className="input" type="number" placeholder="Amount" value={amount || ""} onChange={(e) => onAmount(Number(e.target.value))} />
        <button className="btn btn-ghost !px-3" onClick={onRemove} aria-label={`Remove ${name || "item"}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      <polyline points={linePoints} fill="none" stroke={finalPositive ? "#34d399" : "#f24822"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
