"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
import { sliderFillPercent } from "@/lib/assessment/format";
import { getToolPrefill } from "@/lib/tools/prefill";
import { ToolShell, ToolResultHero } from "@/components/tools/ToolShell";

function temperature(months: number): { label: string; color: string; className: string } {
  if (months >= 6) return { label: "Protected", color: "#34d399", className: "bg-verdict-ready" };
  if (months >= 3) return { label: "Warm", color: "#facc15", className: "bg-verdict-almost" };
  if (months >= 1) return { label: "Exposed", color: "#fab633", className: "bg-verdict-build" };
  return { label: "Critical", color: "#f24822", className: "bg-verdict-notyet" };
}

export default function RunwayPage() {
  const [expenses, setExpenses] = useState(3200);
  const [savings, setSavings] = useState(9600);

  // Companion hand-off: open with the user's saved numbers, not defaults.
  // Mount-only, so it never fights the user's live edits.
  useEffect(() => {
    const prefill = getToolPrefill();
    if (!prefill) return;
    setExpenses(prefill.monthlyOutflow);
    setSavings(prefill.liquidSavings);
  }, []);

  const months = useMemo(() => (expenses > 0 ? savings / expenses : 0), [expenses, savings]);
  const temp = temperature(months);
  const cappedForBar = Math.min(months, 12);

  return (
    <ToolShell
      title="Emergency Runway"
      description={`Runway comes first. Before any big purchase, any investment, any leap — this is the number that tells you how long you can absorb a shock.`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <Field label="Monthly essential expenses" value={expenses} onChange={setExpenses} min={0} max={20000} step={50} format="currency" />
          <Field label="Liquid savings" value={savings} onChange={setSavings} min={0} max={200000} step={500} format="currency" />
        </div>

        <div className="space-y-6">
          <ToolResultHero
            label="Your runway"
            value={formatMonths(months)}
            color={temp.color}
            badge={
              <span
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${temp.className}`}
                style={{ borderColor: `${temp.color}55`, color: temp.color }}
              >
                {temp.label}
              </span>
            }
            footer={
              <div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-slate-surface">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${(cappedForBar / 12) * 100}%`, background: temp.color }}
                  />
                </div>
                <div className="mt-2 flex justify-between text-xs text-dim">
                  <span>0</span>
                  <span>3mo</span>
                  <span>6mo</span>
                  <span>12mo+</span>
                </div>
              </div>
            }
          />

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              {months >= 6 &&
                "Six months or more of runway means most shocks — a job loss, a medical bill, a major repair — won't force a bad decision. This is a strong position to make any move from."}
              {months >= 3 && months < 6 &&
                "Three to six months gives you real but limited protection. It's workable, but building this toward six months first will remove a lot of pressure from every other decision."}
              {months >= 1 && months < 3 &&
                "One to three months of runway is thin. A single unexpected expense could force a decision you wouldn't otherwise make. Building runway before taking on new financial commitments protects you."}
              {months < 1 &&
                "Under one month of runway is a red-line condition. This is the moment to pause on any new financial commitment — buying, investing, or otherwise — and build a buffer first. That is not failure. That is protection."}
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
  format: "currency";
}) {
  const fill = sliderFillPercent(value, min, max);
  const display = format === "currency" ? formatCurrency(value) : String(value);

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
