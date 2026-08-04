"use client";

import { useEffect, useState } from "react";
import { COLORS } from "@/lib/brand";
import { netCashFlow, type FinanceState } from "@/lib/finance/store";
import { sliderFillPercent } from "@/lib/assessment/format";
import { runMonteCarlo, type MonteCarloResult } from "@/lib/tools/montecarlo";
import { formatCurrency } from "@/lib/tools/format";

export function MonteCarloTab({
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
        <SliderField
          label="Down-payment target"
          value={state.downPaymentTarget}
          onChange={(v) => patch({ downPaymentTarget: v })}
          min={0}
          max={500000}
          step={5000}
          format="currency"
        />
        <SliderField
          label="Time horizon (years)"
          value={state.monteCarloYears}
          onChange={(v) => patch({ monteCarloYears: v })}
          min={1}
          max={20}
          step={1}
          format="years"
        />
        <SliderField
          label="Expected annual return"
          value={state.expectedReturnPct}
          onChange={(v) => patch({ expectedReturnPct: v })}
          min={0}
          max={12}
          step={0.5}
          format="percent"
        />
        <SliderField
          label="Volatility (annual std dev)"
          value={state.volatilityPct}
          onChange={(v) => patch({ volatilityPct: v })}
          min={2}
          max={30}
          step={1}
          format="percent"
        />
        <p className="text-xs text-dim">
          Monthly contribution is your current net cash flow:{" "}
          <span className="score-numeral text-cyan">{formatCurrency(monthlyContribution)}</span>.
          Improve it on the Overview tab.
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
              <h2 className="font-semibold text-light">
                Outcome range after {state.monteCarloYears} years
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-dim">P10 (weak case)</p>
                  <p className="score-numeral mt-1 text-lg font-bold text-crimson">
                    {formatCurrency(result.finalP10)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dim">P50 (median)</p>
                  <p className="score-numeral mt-1 text-lg font-bold text-light">
                    {formatCurrency(result.finalP50)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-dim">P90 (strong case)</p>
                  <p className="score-numeral mt-1 text-lg font-bold text-emerald">
                    {formatCurrency(result.finalP90)}
                  </p>
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
  const color = probability >= 70 ? COLORS.emerald : probability >= 40 ? COLORS.yellow : COLORS.crimson;

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
        <path d={arcPath(0, 0.4)} stroke={COLORS.crimson} strokeWidth="14" fill="none" opacity="0.55" strokeLinecap="round" />
        <path d={arcPath(0.4, 0.7)} stroke={COLORS.yellow} strokeWidth="14" fill="none" opacity="0.55" strokeLinecap="round" />
        <path d={arcPath(0.7, 1)} stroke={COLORS.emerald} strokeWidth="14" fill="none" opacity="0.55" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke={COLORS.light} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="6" fill={COLORS.light} />
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
      <polygon points={areaPoints} fill={COLORS.cyan} opacity="0.15" />
      <polyline points={p50Points} fill="none" stroke={COLORS.cyan} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {target > 0 && (
        <>
          <line x1={padding} x2={width - padding} y1={targetY} y2={targetY} stroke={COLORS.yellow} strokeDasharray="6 4" strokeWidth="1.5" />
          <text x={width - padding} y={targetY - 6} textAnchor="end" fontSize="11" fill={COLORS.yellow}>Target</text>
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
  const display =
    format === "currency"
      ? formatCurrency(value)
      : format === "percent"
        ? `${value}%`
        : `${value} yrs`;

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
