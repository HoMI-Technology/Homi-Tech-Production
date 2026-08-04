"use client";

import { useEffect, useMemo, useState } from "react";
import { buildFinanceContextFromLedger, currentOpenPeriod } from "@/lib/advisor/finance-context";
import type {
  FinanceGoalSnapshot,
  FinanceNudge,
  FinanceSignal,
  IncomeVsSpendingPoint,
  RecentTransactionSnapshot,
} from "@/lib/advisor/fallback";
import { COLORS } from "@/lib/brand";
import { categoryActuals } from "@/lib/finance/calculations";
import { hasSavedBudgetLedger, loadBudgetLedger, type BudgetLedgerState } from "@/lib/finance/local-ledger";
import {
  cashFlowTemperature,
  dtiTemperature,
  runwayTemperature,
  savingsRateTemperature,
  type Temperature,
} from "@/lib/finance/store";

export interface FinanceKpis {
  monthlyIncome: number;
  netCashFlow: number;
  savingsRate: number;
  runwayMonths: number | null;
  dti: number;
  liquidSavings: number;
  totalDebt: number;
  netWorth: number;
}

export interface FinanceTemperatures {
  dti: Temperature;
  savingsRate: Temperature;
  runway: Temperature;
  cashFlow: Temperature;
}

export interface CategoryBreakdownItem {
  name: string;
  amount: number;
  pct: number;
  color: string;
}

export interface CategoryTrend {
  name: string;
  delta: number;
}

export interface FinanceDashboard {
  kpis: FinanceKpis;
  temperatures: FinanceTemperatures;
  signals: FinanceSignal[];
  nudges: FinanceNudge[];
  monthlySeries: IncomeVsSpendingPoint[];
  categoryBreakdown: CategoryBreakdownItem[];
  categoryTrends: {
    rising: CategoryTrend[];
    falling: CategoryTrend[];
  };
  recentTransactions: RecentTransactionSnapshot[];
  goals: FinanceGoalSnapshot[];
  ready: boolean;
  loading: boolean;
}

const CATEGORY_COLORS = [
  COLORS.cyan,
  COLORS.emerald,
  COLORS.yellow,
  COLORS.amber,
  COLORS.crimson,
  COLORS.navyLight,
  COLORS.slateHigh,
];

function resolveCategoryName(
  categories: BudgetLedgerState["categories"],
  categoryId: string | null,
): string {
  if (categoryId === null) return "Uncategorized";
  return categories.find((c) => c.id === categoryId)?.name ?? "Uncategorized";
}

function previousMonthBounds(dateOnly: string): { periodStart: string; periodEnd: string } {
  const [y, m] = dateOnly.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  const py = prev.getFullYear();
  const pm = prev.getMonth() + 1;
  const lastDay = new Date(py, pm, 0).getDate();
  const pmm = String(pm).padStart(2, "0");
  return {
    periodStart: `${py}-${pmm}-01`,
    periodEnd: `${py}-${pmm}-${String(lastDay).padStart(2, "0")}`,
  };
}

function allClearSignal(): FinanceSignal {
  return {
    id: "all-clear",
    severity: "emerald",
    title: "Your core money signals look steady",
    body:
      "Cash flow is positive, savings are on pace, debt isn't crowding income, and your runway is in a solid range. Keep doing what you're doing.",
  };
}

function healthyNudge(): FinanceNudge {
  return {
    id: "nudge-healthy-rhythm",
    type: "goal",
    message:
      "Your key signals are in a good range. This is a great time to lock in a small auto-transfer toward your next goal so the rhythm stays automatic.",
    action: { label: "Review goals", href: "/finance" },
  };
}

/**
 * Stable dashboard object derived from the local-first budget ledger.
 *
 * Loads once after hydration, stays stable via useMemo, and refreshes when
 * another tab writes to localStorage. Returns a loading shell during SSR and
 * the first client render so callers never flash derived numbers before the
 * real ledger is available.
 */
export function useFinanceDashboard(): FinanceDashboard {
  const [ledger, setLedger] = useState<BudgetLedgerState | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stamp = new Date().toISOString();
    setLedger(loadBudgetLedger(stamp));
    setHydrated(true);

    function onStorage(event: StorageEvent) {
      if (event.key !== "homi:budget-ledger") return;
      setLedger(loadBudgetLedger(new Date().toISOString()));
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return useMemo<FinanceDashboard>(() => {
    const loading = !hydrated;
    const empty: FinanceDashboard = {
      kpis: {
        monthlyIncome: 0,
        netCashFlow: 0,
        savingsRate: 0,
        runwayMonths: null,
        dti: 0,
        liquidSavings: 0,
        totalDebt: 0,
        netWorth: 0,
      },
      temperatures: {
        dti: "emerald",
        savingsRate: "amber",
        runway: "emerald",
        cashFlow: "amber",
      },
      signals: [],
      nudges: [],
      monthlySeries: [],
      categoryBreakdown: [],
      categoryTrends: { rising: [], falling: [] },
      recentTransactions: [],
      goals: [],
      ready: false,
      loading,
    };

    if (!hydrated || ledger === null) return empty;

    const saved = hasSavedBudgetLedger();
    const nowIso = new Date().toISOString();
    const context = saved ? buildFinanceContextFromLedger(ledger, nowIso) : undefined;

    if (!context) {
      return { ...empty, loading: false };
    }

    const nowDate = nowIso.slice(0, 10);
    const period = currentOpenPeriod(ledger, nowDate, nowIso);
    const actuals = categoryActuals(ledger.transactions, period, []);
    const totalSpending = actuals.reduce(
      (sum, row) => sum + Math.max(0, row.actualCents),
      0,
    );

    const categoryBreakdown: CategoryBreakdownItem[] = actuals
      .filter((row) => row.actualCents > 0)
      .sort((a, b) => b.actualCents - a.actualCents)
      .slice(0, 8)
      .map((row, index) => ({
        name: resolveCategoryName(ledger.categories, row.categoryId),
        amount: Math.round(row.actualCents / 100),
        pct:
          totalSpending > 0
            ? Math.round((row.actualCents / totalSpending) * 1000) / 10
            : 0,
        color: CATEGORY_COLORS[index % CATEGORY_COLORS.length],
      }));

    const prevBounds = previousMonthBounds(nowDate);
    const prevActuals = categoryActuals(ledger.transactions, prevBounds, []);
    const currentByName = new Map(categoryBreakdown.map((c) => [c.name, c.amount]));
    const prevByName = new Map(
      prevActuals
        .filter((row) => row.actualCents > 0)
        .map((row) => [
          resolveCategoryName(ledger.categories, row.categoryId),
          Math.round(row.actualCents / 100),
        ]),
    );
    const allNames = new Set([...currentByName.keys(), ...prevByName.keys()]);
    const trends: CategoryTrend[] = [];
    for (const name of allNames) {
      const delta = (currentByName.get(name) ?? 0) - (prevByName.get(name) ?? 0);
      if (delta !== 0) trends.push({ name, delta });
    }
    trends.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

    const netCashFlow = context.monthlyIncome - Math.round(totalSpending / 100);

    const temperatures: FinanceTemperatures = {
      dti: dtiTemperature(context.dti),
      savingsRate: savingsRateTemperature(context.savingsRate),
      runway: runwayTemperature(context.runwayMonths ?? Number.POSITIVE_INFINITY),
      cashFlow: cashFlowTemperature(netCashFlow, context.monthlyIncome),
    };

    const activeSignals = context.activeSignals ?? [];
    const signals: FinanceSignal[] =
      activeSignals.length > 0 ? activeSignals : [allClearSignal()];
    const baseNudges = (context.nudges ?? []).slice(0, 3);
    const nudges: FinanceNudge[] =
      baseNudges.length > 0 ? baseNudges : [healthyNudge()];

    return {
      kpis: {
        monthlyIncome: context.monthlyIncome,
        netCashFlow,
        savingsRate: context.savingsRate,
        runwayMonths: context.runwayMonths,
        dti: context.dti,
        liquidSavings: context.liquidSavings,
        totalDebt: context.totalDebt,
        netWorth: context.netWorth,
      },
      temperatures,
      signals,
      nudges,
      monthlySeries: context.incomeVsSpendingSeries ?? [],
      categoryBreakdown,
      categoryTrends: {
        rising: trends.filter((t) => t.delta > 0).slice(0, 3),
        falling: trends.filter((t) => t.delta < 0).slice(0, 3),
      },
      recentTransactions: (context.recentTransactions ?? []).slice(0, 6),
      goals: context.goals ?? [],
      ready: true,
      loading: false,
    };
  }, [hydrated, ledger]);
}
