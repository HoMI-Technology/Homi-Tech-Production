"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_SIMULATION_INPUTS,
  simulateAllScenarios,
  type SimulationInputs,
} from "@/lib/decisions/simulate";
import { formatNumber, parseNumber, sliderFillPercent } from "@/lib/assessment/format";
import { NetPositionChart } from "@/components/decisions/NetPositionChart";

const SCENARIO_META: Record<string, { color: string; borderClass: string; description: string }> = {
  "buy-now": {
    color: "#22d3ee",
    borderClass: "border-cyan/40",
    description: "Buy today. Equity builds through amortization and appreciation, offset by closing costs and maintenance.",
  },
  "wait-12": {
    color: "#facc15",
    borderClass: "border-yellow/40",
    description: "Rent 12 more months while saving toward a larger down payment, then buy at the future price.",
  },
  "wait-24": {
    color: "#f24822",
    borderClass: "border-crimson/40",
    description: "Rent 24 more months while saving toward a larger down payment, then buy at the future price.",
  },
};

interface MoneyFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
}

function MoneyField({ label, value, onChange, prefix = "$" }: MoneyFieldProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-light">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim">{prefix}</span>
        <input
          type="text"
          inputMode="decimal"
          className="input w-full pl-7"
          value={formatNumber(value)}
          onChange={(e) => onChange(parseNumber(e.target.value))}
        />
      </div>
    </label>
  );
}

interface PercentSliderProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

function PercentSlider({ label, value, onChange, min = 0, max = 12, step = 0.1 }: PercentSliderProps) {
  return (
    <label className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-light">{label}</span>
        <span className="score-numeral text-sm text-cyan">{value.toFixed(1)}%</span>
      </div>
      <input
        type="range"
        className="homi-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--fill" as string]: `${sliderFillPercent(value, min, max)}%` }}
      />
    </label>
  );
}

export default function DecisionsPage() {
  const [inputs, setInputs] = useState<SimulationInputs>(DEFAULT_SIMULATION_INPUTS);

  function update<K extends keyof SimulationInputs>(key: K, value: SimulationInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  const scenarios = useMemo(() => simulateAllScenarios(inputs, 60), [inputs]);
  const best = useMemo(
    () => scenarios.reduce((a, b) => (b.netPositionAt60 > a.netPositionAt60 ? b : a)),
    [scenarios],
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="font-display text-3xl text-light">Decision Rehearsal</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Simulate the financial impact before you commit. Compare buying now against waiting 12 or 24
        months, across a 5-year horizon.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
        {/* Inputs */}
        <div className="glass flex flex-col gap-5 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-dim">Your numbers</p>
          <MoneyField label="Home price" value={inputs.homePrice} onChange={(v) => update("homePrice", v)} />
          <MoneyField
            label="Down payment saved"
            value={inputs.downPaymentSaved}
            onChange={(v) => update("downPaymentSaved", v)}
          />
          <MoneyField
            label="Monthly savings capacity"
            value={inputs.monthlySavings}
            onChange={(v) => update("monthlySavings", v)}
          />
          <MoneyField label="Current monthly rent" value={inputs.rent} onChange={(v) => update("rent", v)} />

          <div className="hairline" />

          <PercentSlider label="Expected mortgage rate" value={inputs.rate} onChange={(v) => update("rate", v)} min={2} max={10} />
          <PercentSlider
            label="Expected annual appreciation"
            value={inputs.appreciation}
            onChange={(v) => update("appreciation", v)}
            min={-2}
            max={10}
          />
          <PercentSlider
            label="Expected annual rent increase"
            value={inputs.rentIncrease}
            onChange={(v) => update("rentIncrease", v)}
            min={0}
            max={12}
          />
        </div>

        {/* Results */}
        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {scenarios.map((s) => {
              const meta = SCENARIO_META[s.key];
              const isBest = s.key === best.key;
              return (
                <div key={s.key} className={`glass border ${meta.borderClass} flex flex-col gap-3 p-5`}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: meta.color }}>
                      {s.label}
                    </p>
                    {isBest && (
                      <span className="rounded-full bg-slate-surface px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald">
                        Best on paper
                      </span>
                    )}
                  </div>
                  <p className="score-numeral text-2xl font-bold text-light">
                    {s.netPositionAt60 < 0 ? "-" : ""}$
                    {Math.abs(s.netPositionAt60).toLocaleString("en-US")}
                  </p>
                  <p className="text-xs text-dim">5-year net position</p>
                  <p className="text-xs leading-relaxed text-dim">{meta.description}</p>
                </div>
              );
            })}
          </div>

          <div className="glass p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-dim">Net position over 60 months</p>
            <div className="mt-4">
              <NetPositionChart scenarios={scenarios} />
            </div>
            <div className="mt-4 flex flex-wrap gap-4">
              {scenarios.map((s) => (
                <div key={s.key} className="flex items-center gap-2 text-xs text-dim">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SCENARIO_META[s.key].color }}
                  />
                  {s.label}
                </div>
              ))}
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="font-display text-xl font-semibold text-light">An honest interpretation</h2>
            <p className="mt-3 text-base leading-relaxed text-light">
              The math is one ring. Emotional truth and timing are the others — the cheapest path on
              paper is not automatically the right one. This simulation assumes steady rates,
              consistent savings discipline, and a market that behaves the way you told it to. Real
              life rarely holds still that long. Use this to understand the shape of the trade-off, not
              to outsource the decision itself.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
