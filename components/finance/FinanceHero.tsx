"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { COLORS } from "@/lib/brand";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { useFinanceDashboard } from "@/hooks/use-finance-dashboard";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import type { Temperature } from "@/lib/finance/store";

const TEMP_TEXT: Record<Temperature, string> = {
  emerald: "text-emerald",
  yellow: "text-yellow",
  amber: "text-amber",
  crimson: "text-crimson",
};

const TEMP_WORD: Record<Temperature, string> = {
  emerald: "Healthy",
  yellow: "Steady",
  amber: "Watch",
  crimson: "At risk",
};

const TEMP_COLOR: Record<Temperature, string> = {
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
  amber: COLORS.amber,
  crimson: COLORS.crimson,
};

/**
 * Hero strip for the premium finance overview. Leads with net cash flow,
 * surfaces income / expenses / debt mini stats, and shows a recent cash-flow
 * sparkline with a temperature badge. No shame framing — the number is read,
      not judged.
 */
export function FinanceHero() {
  const { kpis, temperatures, monthlySeries, ready, loading } = useFinanceDashboard();

  const sparkValues = useMemo(
    () => monthlySeries.map((p) => p.income - p.spending),
    [monthlySeries],
  );

  const expenses = kpis.monthlyIncome - kpis.netCashFlow;

  if (loading) {
    return (
      <section className="glass relative overflow-hidden p-6 lg:p-8" aria-busy="true">
        <div className="h-40 animate-pulse rounded-lg bg-slate-surface/40" />
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="glass relative overflow-hidden p-6 lg:p-8"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full"
        style={{ background: `radial-gradient(circle, ${COLORS.cyan}19, transparent 70%)` }}
      />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
        <div className="lg:w-[55%]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{
                backgroundColor: TEMP_COLOR[temperatures.cashFlow],
                boxShadow: `0 0 8px ${TEMP_COLOR[temperatures.cashFlow]}`,
              }}
            />
            <span className="text-xs font-semibold uppercase tracking-widest text-dim">
              Remaining balance
            </span>
            <span className="text-xs text-dim">income − expenses − debt payments</span>
          </div>
          <AnimatedNumber
            value={kpis.netCashFlow}
            format={(n) => formatCurrency(n)}
            className={`score-numeral mt-3 block text-5xl font-bold tracking-tight lg:text-6xl ${
              kpis.netCashFlow < 0 ? "text-crimson" : "text-light"
            }`}
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <MiniStat
              icon={<DownLeftIcon className="text-cyan" />}
              label="Income"
              value={formatCurrency(kpis.monthlyIncome)}
            />
            <span className="hidden h-4 w-px bg-light/10 sm:block" />
            <MiniStat
              icon={<UpRightIcon className="text-crimson" />}
              label="Expenses"
              value={formatCurrency(expenses)}
            />
            <span className="hidden h-4 w-px bg-light/10 sm:block" />
            <MiniStat
              icon={<LandmarkIcon className="text-dim" />}
              label="Debt balance"
              value={formatCurrency(kpis.totalDebt)}
            />
          </div>
          {!ready && (
            <p className="mt-3 text-xs text-dim">
              No saved budget yet. Add your first transaction to see real numbers here.
            </p>
          )}
        </div>

        <div className="lg:w-[30%]">
          <BalanceSpark values={sparkValues} negative={kpis.netCashFlow < 0} />
        </div>

        <div
          className="flex flex-row items-center gap-3 lg:w-[15%] lg:flex-col lg:items-end lg:gap-2"
          title={`Cash-flow ratio ≥15% = Healthy · ≥5% = Steady · ≥0% = Watch · below = At risk (now ${formatPercent(
            kpis.monthlyIncome > 0 ? (kpis.netCashFlow / kpis.monthlyIncome) * 100 : 0,
          )})`}
        >
          <span
            aria-hidden
            className="size-4 rounded-full"
            style={{
              backgroundColor: TEMP_COLOR[temperatures.cashFlow],
              boxShadow: `0 0 10px ${TEMP_COLOR[temperatures.cashFlow]}`,
            }}
          />
          <span className={`text-sm font-semibold ${TEMP_TEXT[temperatures.cashFlow]}`}>
            {TEMP_WORD[temperatures.cashFlow]}
          </span>
          <span className="text-[10px] text-dim">
            cash-flow{" "}
            {formatPercent(kpis.monthlyIncome > 0 ? (kpis.netCashFlow / kpis.monthlyIncome) * 100 : 0)}
          </span>
        </div>
      </div>
    </motion.section>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 px-1 py-0.5">
      {icon}
      <span className="text-xs text-dim">{label}</span>
      <span className="score-numeral text-sm text-light">{value}</span>
    </div>
  );
}

function BalanceSpark({ values, negative }: { values: number[]; negative: boolean }) {
  const end = values.length > 0 ? values[values.length - 1] : 0;
  if (values.length < 2) return <div className="h-[72px]" />;
  const w = 220;
  const h = 72;
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const x = (i: number) => (i / (values.length - 1)) * w;
  const y = (v: number) => h - 4 - ((v - min) / range) * (h - 10);
  const pts = values.map((v, i) => `${x(i)},${y(v)}`);
  const zeroY = y(0);
  const color = negative ? COLORS.crimson : COLORS.cyan;
  const gradId = "hero-balance-spark";
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[72px] w-full" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={`url(#${gradId})`} />
      <line
        x1="0"
        x2={w}
        y1={zeroY}
        y2={zeroY}
        stroke={negative ? COLORS.crimson : "rgba(226,232,240,0.15)"}
        strokeWidth="1"
        strokeDasharray="3 3"
      />
      <motion.polyline
        key={values.join(",")}
        points={pts.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
      />
      <motion.circle
        key={`dot-${end.toFixed(2)}`}
        cx={w}
        cy={y(end)}
        r="3.5"
        fill={color}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        initial={{ scale: 1.6 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4 }}
      />
    </svg>
  );
}

function DownLeftIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M17 7L7 17" />
      <path d="M17 17H7V7" />
    </svg>
  );
}

function UpRightIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  );
}

function LandmarkIcon({ className }: { className?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4 8 4v14" />
      <path d="M9 21v-6h2v6" />
      <path d="M13 21v-6h2v6" />
      <path d="M17 21v-6h2v6" />
    </svg>
  );
}
