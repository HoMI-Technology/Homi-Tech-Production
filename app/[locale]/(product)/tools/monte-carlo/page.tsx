"use client";

import { useEffect, useMemo, useState } from "react";
import { runMonteCarlo, type MonteCarloResult } from "@/lib/tools/montecarlo";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";

function MonteCarloPageInner() {
  const [currentSavings, setCurrentSavings] = useState(20000);
  const [monthlyContribution, setMonthlyContribution] = useState(600);
  const [years, setYears] = useState(10);
  const [expectedReturn, setExpectedReturn] = useState(7);
  const [volatility, setVolatility] = useState(15);
  const [targetAmount, setTargetAmount] = useState(150000);
  const [jobLossProb, setJobLossProb] = useState(0);
  const [maintenanceShock, setMaintenanceShock] = useState(0);
  const [incomeGrowth, setIncomeGrowth] = useState(0);

  const [result, setResult] = useState<MonteCarloResult | null>(null);

  // Run the (seeded, deterministic) simulation client-side only, after mount,
  // to avoid any risk of hydration mismatch from randomized content.
  useEffect(() => {
    const r = runMonteCarlo({
      currentSavings,
      monthlyContribution,
      years,
      expectedReturnPct: expectedReturn,
      volatilityPct: volatility,
      targetAmount,
      jobLossProb,
      maintenanceShock,
      incomeGrowth,
      seed: 1337,
      runs: 10000,
    });
    setResult(r);
  }, [
    currentSavings,
    monthlyContribution,
    years,
    expectedReturn,
    volatility,
    targetAmount,
    jobLossProb,
    maintenanceShock,
    incomeGrowth,
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Monte Carlo Projection</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Markets don't move in a straight line. This runs 10,000 simulated paths for your savings and shows
        the range of realistic outcomes — not just one optimistic average.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.3fr]">
        <div className="glass space-y-5 p-6">
          <Field label="Current savings" value={currentSavings} onChange={setCurrentSavings} min={0} max={500000} step={1000} format="currency" />
          <Field label="Monthly contribution" value={monthlyContribution} onChange={setMonthlyContribution} min={0} max={10000} step={50} format="currency" />
          <Field label="Time horizon (years)" value={years} onChange={setYears} min={1} max={40} step={1} format="years" />
          <Field label="Expected annual return" value={expectedReturn} onChange={setExpectedReturn} min={0} max={12} step={0.5} format="percent" />
          <Field label="Volatility (annual std dev)" value={volatility} onChange={setVolatility} min={2} max={30} step={1} format="percent" />
          <Field label="Target amount" value={targetAmount} onChange={setTargetAmount} min={0} max={1000000} step={5000} format="currency" />

          <div className="hairline" />

          <Field label="Job loss probability (per year)" value={jobLossProb} onChange={setJobLossProb} min={0} max={20} step={1} format="percent" />
          <Field label="Maintenance/emergency shock probability (per year)" value={maintenanceShock} onChange={setMaintenanceShock} min={0} max={30} step={1} format="percent" />
          <Field label="Income growth (annual)" value={incomeGrowth} onChange={setIncomeGrowth} min={0} max={8} step={0.5} format="percent" />
        </div>

        <div className="space-y-6">
          {result && (
            <>
              <div className="glass p-6">
                <h2 className="font-semibold text-light">Outcome range after {years} years</h2>
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
                {result.probabilityOfTarget !== null && (
                  <p className="mt-4 text-center text-sm text-dim">
                    Probability of reaching {formatCurrency(targetAmount)}:{" "}
                    <span className="font-semibold text-cyan">{formatPercent(result.probabilityOfTarget)}</span>
                  </p>
                )}
              </div>

              <div className="glass p-6">
                <h2 className="font-semibold text-light">Resilience</h2>
                <div className="mt-4 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-xs text-dim">Survival rate</p>
                    <p className="score-numeral mt-1 text-lg font-bold text-emerald">{formatPercent(result.survivalRate)}</p>
                    <p className="mt-1 text-xs text-dim">Balance never broke</p>
                  </div>
                  <div>
                    <p className="text-xs text-dim">Distress rate</p>
                    <p className="score-numeral mt-1 text-lg font-bold text-amber">{formatPercent(result.distressRate)}</p>
                    <p className="mt-1 text-xs text-dim">Ever below 1 month of expenses</p>
                  </div>
                </div>
              </div>

              <div className="glass p-6">
                <h2 className="font-semibold text-light">Simulated range over time</h2>
                <BandChart result={result} target={targetAmount} />
              </div>

              <div className="glass p-6">
                <h2 className="font-semibold text-light">What this means</h2>
                <p className="mt-2 text-sm leading-relaxed text-dim">
                  The gap between P10 and P90 is the honest uncertainty in any market-based plan. If your
                  target only works in the P90 case, the plan is riding on a strong market, not on your
                  savings discipline. A plan that still works around P50 is a plan you can trust.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MonteCarloPage() {
  return (
    <AdvancedToolGate>
      <MonteCarloPageInner />
    </AdvancedToolGate>
  );
}

function BandChart({ result, target }: { result: MonteCarloResult; target: number }) {
  const width = 640;
  const height = 260;
  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(...result.bands.map((b) => b.p90), target) * 1.05;
  const maxYear = result.bands[result.bands.length - 1]?.year || 1;

  const scaleX = (year: number) => padding + (year / maxYear) * chartWidth;
  const scaleY = (v: number) => padding + chartHeight - (v / maxValue) * chartHeight;

  const p90Path = result.bands.map((b) => `${scaleX(b.year)},${scaleY(b.p90)}`);
  const p10PathRev = [...result.bands].reverse().map((b) => `${scaleX(b.year)},${scaleY(b.p10)}`);
  const areaPoints = [...p90Path, ...p10PathRev].join(" ");
  const p50Points = result.bands.map((b) => `${scaleX(b.year)},${scaleY(b.p50)}`).join(" ");
  const targetY = scaleY(target);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="mt-4" role="img" aria-label="Monte Carlo P10-P90 savings band over time">
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

function Field({
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
  const display =
    format === "currency" ? formatCurrency(value) : format === "percent" ? `${value}%` : `${value} yrs`;

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
