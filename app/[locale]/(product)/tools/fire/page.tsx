"use client";

import { useMemo, useState } from "react";
import { computeFireNumber, computeCoastFire } from "@/lib/tools/fire";
import { formatCurrency } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { ToolShell, ToolResultHero, ToolMetric } from "@/components/tools/ToolShell";

export default function FirePage() {
  const [annualExpenses, setAnnualExpenses] = useState(48000);
  const [swrPercent, setSwrPercent] = useState(4);
  const [currentAge, setCurrentAge] = useState(32);
  const [retirementAge, setRetirementAge] = useState(55);
  const [currentSavings, setCurrentSavings] = useState(85000);
  const [expectedReturnPercent, setExpectedReturnPercent] = useState(7);

  const fireNumber = useMemo(() => computeFireNumber(annualExpenses, swrPercent), [annualExpenses, swrPercent]);

  const coast = useMemo(
    () =>
      computeCoastFire({
        annualExpenses,
        swrPercent,
        currentAge,
        retirementAge,
        currentSavings,
        expectedReturnPercent,
      }),
    [annualExpenses, swrPercent, currentAge, retirementAge, currentSavings, expectedReturnPercent],
  );

  return (
    <ToolShell
      title="FIRE Number"
      description={`Financial independence, laid out plainly: the number you'd need invested to cover your life on withdrawals alone, and whether what you already have is on track to coast there.`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <Field label="Annual expenses" value={annualExpenses} onChange={setAnnualExpenses} min={12000} max={200000} step={1000} format="currency" />
          <Field label="Safe withdrawal rate" value={swrPercent} onChange={setSwrPercent} min={3} max={5} step={0.1} format="percent" />
          <Field label="Current age" value={currentAge} onChange={setCurrentAge} min={18} max={70} step={1} format="age" />
          <Field label="Target retirement age" value={retirementAge} onChange={setRetirementAge} min={currentAge} max={80} step={1} format="age" />
          <Field label="Current invested savings" value={currentSavings} onChange={setCurrentSavings} min={0} max={2000000} step={1000} format="currency" />
          <Field label="Expected annual return" value={expectedReturnPercent} onChange={setExpectedReturnPercent} min={2} max={12} step={0.5} format="percent" />
        </div>

        <div className="space-y-6">
          <ToolResultHero
            label="Your FIRE number"
            value={formatCurrency(fireNumber)}
            color="#34d399"
            footer={`At a ${swrPercent}% withdrawal rate on ${formatCurrency(annualExpenses)}/yr of expenses.`}
            badge={
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  coast.isCoastFire
                    ? "border-emerald/40 bg-verdict-ready text-emerald"
                    : "border-amber/40 bg-verdict-build text-amber"
                }`}
              >
                {coast.isCoastFire ? "Coasting" : "Not yet coasting"}
              </span>
            }
          />

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Coast-FIRE</h2>
            <p className="mt-1 text-xs text-dim">
              What today&apos;s savings alone — with no more contributions — could grow into by {retirementAge}.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ToolMetric label="Needed today to coast" value={formatCurrency(coast.coastFireNumberNeededNow)} />
              <ToolMetric
                label={`Projected at ${retirementAge}`}
                value={formatCurrency(coast.projectedAtRetirement)}
              />
            </div>
            {coast.coastFireAge !== null && (
              <p className="mt-4 text-sm text-dim">
                At this return rate, today&apos;s savings alone would reach your FIRE number around age{" "}
                <span className="score-numeral text-light">{coast.coastFireAge.toFixed(1)}</span>.
              </p>
            )}
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              The FIRE number is a target, not a deadline — it assumes your expenses and the withdrawal
              rate you chose hold roughly steady, which real life rarely does exactly. Coast-FIRE is not
              "you can stop saving" — it's "if you stopped today, time and growth alone would likely get
              you there by your target age." Whether to actually stop contributing is a different, more
              personal question than the math above.
            </p>
          </div>
        </div>
      </div>
    </ToolShell>
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
  format: "currency" | "percent" | "age";
}) {
  const fill = sliderFillPercent(value, min, max);
  const display =
    format === "currency" ? formatCurrency(value) : format === "percent" ? `${value}%` : `${value}`;

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
