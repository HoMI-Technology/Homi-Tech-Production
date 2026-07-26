"use client";

import { useCallback, useMemo, useState } from "react";
import { computeBlindBudget } from "@/lib/tools/blindbudget";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { useLensPrefill } from "@/hooks/use-lens-prefill";
import { ToolShell } from "@/components/tools/ToolShell";

export default function BlindBudgetPage() {
  const [incomeLow, setIncomeLow] = useState(4500);
  const [incomeHigh, setIncomeHigh] = useState(6000);
  const [fixedCostsLow, setFixedCostsLow] = useState(2200);
  const [fixedCostsHigh, setFixedCostsHigh] = useState(3000);
  const [savingsLow, setSavingsLow] = useState(6000);
  const [savingsHigh, setSavingsHigh] = useState(10000);

  // Decision Lab: when the user's numbers are saved, the ranges seed
  // centered on them (±15%) instead of generic defaults. Mount-only.
  const apply = useCallback((key: string, v: number) => {
    if (key === "incomeLow") setIncomeLow(v);
    else if (key === "incomeHigh") setIncomeHigh(v);
    else if (key === "fixedCostsLow") setFixedCostsLow(v);
    else if (key === "fixedCostsHigh") setFixedCostsHigh(v);
    else if (key === "savingsLow") setSavingsLow(v);
    else if (key === "savingsHigh") setSavingsHigh(v);
  }, []);
  useLensPrefill("blind-budget", apply);

  const result = useMemo(
    () => computeBlindBudget({ incomeLow, incomeHigh, fixedCostsLow, fixedCostsHigh, savingsLow, savingsHigh }),
    [incomeLow, incomeHigh, fixedCostsLow, fixedCostsHigh, savingsLow, savingsHigh],
  );

  return (
    <ToolShell
      title="Blind Budget"
      description={`Plan without knowing your exact numbers. Give a range for what you're not sure of — you'll still get an honest answer. Precision isn't required for honesty.`}
    >
      <SavedNumbersStrip />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-6 p-6">
          <RangeField
            label="Monthly income"
            low={incomeLow}
            high={incomeHigh}
            onLowChange={setIncomeLow}
            onHighChange={setIncomeHigh}
            min={0}
            max={20000}
            step={100}
          />
          <RangeField
            label="Monthly fixed costs"
            low={fixedCostsLow}
            high={fixedCostsHigh}
            onLowChange={setFixedCostsLow}
            onHighChange={setFixedCostsHigh}
            min={0}
            max={15000}
            step={100}
          />
          <RangeField
            label="Liquid savings"
            low={savingsLow}
            high={savingsHigh}
            onLowChange={setSavingsLow}
            onHighChange={setSavingsHigh}
            min={0}
            max={100000}
            step={500}
          />
        </div>

        <div className="space-y-6">
          <div className="glass border p-8 text-center bg-verdict-almost">
            <p className="text-sm text-dim">Safe-to-spend band</p>
            <p className="score-numeral mt-2 text-3xl font-bold text-yellow">
              {formatCurrency(result.safeToSpendLow)} – {formatCurrency(result.safeToSpendHigh)}
            </p>
            <p className="mt-2 text-xs text-dim">per month, across your worst case to your best case</p>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Runway band</h2>
            <p className="mt-1 text-xs text-dim">How long your savings hold up against your fixed costs.</p>
            <p className="score-numeral mt-4 text-2xl font-bold text-light">
              {formatMonths(result.runwayLowMonths)} – {formatMonths(result.runwayHighMonths)}
            </p>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              The low end of each band pairs your least income with your highest costs — the honest worst
              case. The high end pairs your most income with your lowest costs — the honest best case. If
              you can live inside the low end of the safe-to-spend band, you're covered no matter which
              reality turns out to be true. Narrowing your ranges over time, not guessing a fake precise
              number today, is how this band gets smaller.
            </p>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}

function RangeField({
  label,
  low,
  high,
  onLowChange,
  onHighChange,
  min,
  max,
  step,
}: {
  label: string;
  low: number;
  high: number;
  onLowChange: (v: number) => void;
  onHighChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  const lowFill = sliderFillPercent(low, min, max);
  const highFill = sliderFillPercent(high, min, max);

  function handleLowChange(v: number) {
    onLowChange(Math.min(v, high));
  }
  function handleHighChange(v: number) {
    onHighChange(Math.max(v, low));
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm text-light">{label}</label>
        <span className="score-numeral text-sm text-cyan">
          {formatCurrency(low)} – {formatCurrency(high)}
        </span>
      </div>
      <div className="mt-2">
        <p className="text-xs text-dim">Low end</p>
        <input
          type="range"
          aria-label={`${label} (low end)`}
          className="homi-slider mt-1"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => handleLowChange(Number(e.target.value))}
          style={{ ["--fill" as string]: `${lowFill}%` }}
        />
      </div>
      <div className="mt-3">
        <p className="text-xs text-dim">High end</p>
        <input
          type="range"
          aria-label={`${label} (high end)`}
          className="homi-slider mt-1"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => handleHighChange(Number(e.target.value))}
          style={{ ["--fill" as string]: `${highFill}%` }}
        />
      </div>
    </div>
  );
}
