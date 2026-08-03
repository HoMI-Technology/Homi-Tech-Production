"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ToolShell, ToolResultHero } from "@/components/tools/ToolShell";
import { MoneyField } from "@/components/ui/MoneyField";
import { NumberField } from "@/components/ui/NumberField";
import {
  runPreflight,
  PREFLIGHT_DISCLAIMER,
  type PreflightResult,
} from "@/lib/readiness";
import { loadLocalResult } from "@/lib/assessment/storage";
import {
  hasSavedFinanceState,
  loadFinanceState,
} from "@/lib/finance/store";
import { formatCurrency } from "@/lib/tools/format";

function verdictColor(v: PreflightResult["verdict"]): string {
  if (v === "DO_NOT_PROCEED") return "#f24822";
  if (v === "WAIT") return "#fab633";
  return "#34d399";
}

export default function PreflightPage() {
  const stored = useMemo(() => loadLocalResult(), []);
  const finance = useMemo(
    () => (hasSavedFinanceState() ? loadFinanceState() : null),
    [],
  );

  const [decisionLabel, setDecisionLabel] = useState("Home purchase");
  const [income, setIncome] = useState(finance?.monthlyIncome ?? 6500);
  const [expenses, setExpenses] = useState(finance?.monthlyExpenses ?? 4200);
  const [debtPay, setDebtPay] = useState(finance?.monthlyDebtPayments ?? 650);
  const [liquid, setLiquid] = useState(finance?.liquidSavings ?? 18000);
  const [pressure, setPressure] = useState(stored?.inputs.fomoLevel ?? 5);
  const [partner, setPartner] = useState(stored?.inputs.partnerAlignment ?? 7);
  const [useAssessment, setUseAssessment] = useState(!!stored);

  const result = useMemo(
    () =>
      runPreflight({
        assessmentResult: useAssessment ? stored?.result ?? null : null,
        monthlyIncome: income,
        monthlyExpenses: expenses,
        monthlyDebtPayments: debtPay,
        liquidSavings: liquid,
        externalPressure: pressure,
        partnerAlignment: partner,
        decisionLabel,
      }),
    [
      useAssessment,
      stored,
      income,
      expenses,
      debtPay,
      liquid,
      pressure,
      partner,
      decisionLabel,
    ],
  );

  return (
    <ToolShell
      eyebrow="Readiness · Pre-Flight"
      title="Decision Pre-Flight"
      description="Sixty-second honesty check before you sign, bid, or stretch. Protective gates first — not a lender decision."
    >
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <div className="glass space-y-5 p-6">
          <label className="block">
            <span className="text-sm text-dim">What decision?</span>
            <input
              className="mt-1 w-full rounded-lg border border-slate-surface/80 bg-navy/40 px-3 py-2 text-sm text-light"
              value={decisionLabel}
              onChange={(e) => setDecisionLabel(e.target.value)}
              maxLength={80}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-dim">
            <input
              type="checkbox"
              checked={useAssessment}
              onChange={(e) => setUseAssessment(e.target.checked)}
              disabled={!stored}
            />
            Use latest assessment hard-stops
            {!stored && " (none saved)"}
          </label>

          <MoneyField
            label="Monthly income"
            value={income}
            onChange={(v) => setIncome(v ?? 0)}
          />
          <MoneyField
            label="Monthly expenses"
            value={expenses}
            onChange={(v) => setExpenses(v ?? 0)}
          />
          <MoneyField
            label="Monthly debt payments"
            value={debtPay}
            onChange={(v) => setDebtPay(v ?? 0)}
          />
          <MoneyField
            label="Liquid savings"
            value={liquid}
            onChange={(v) => setLiquid(v ?? 0)}
          />
          <NumberField
            label="External pressure (1–10)"
            value={pressure}
            onChange={(v) => setPressure(Math.min(10, Math.max(1, v ?? 5)))}
            min={1}
            max={10}
          />
          <NumberField
            label="Partner alignment (1–10)"
            value={partner}
            onChange={(v) => setPartner(Math.min(10, Math.max(1, v ?? 5)))}
            min={1}
            max={10}
          />
        </div>

        <div className="space-y-4">
          <ToolResultHero
            label={decisionLabel || "This decision"}
            value={result.badge}
            color={verdictColor(result.verdict)}
            footer={
              result.score != null ? (
                <span className="text-sm text-dim">
                  Assessment score{" "}
                  <span className="score-numeral text-light">{result.score}</span>
                </span>
              ) : (
                <span className="text-sm text-dim">No assessment score attached</span>
              )
            }
          />

          <div className="space-y-3">
            {result.findings.map((f) => (
              <div
                key={f.title + f.detail}
                className={`glass border p-4 ${
                  f.severity === "block"
                    ? "border-crimson/40"
                    : f.severity === "warn"
                      ? "border-amber/40"
                      : "border-emerald/30"
                }`}
              >
                <p
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    f.severity === "block"
                      ? "text-crimson"
                      : f.severity === "warn"
                        ? "text-amber"
                        : "text-emerald"
                  }`}
                >
                  {f.title}
                </p>
                <p className="mt-1 text-sm text-light">{f.detail}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/path" className="btn btn-primary btn-sm">
              Open Path to Ready
            </Link>
            <Link href="/assessment" className="btn btn-ghost btn-sm">
              Full assessment
            </Link>
            <Link href="/scenarios" className="btn btn-ghost btn-sm">
              Scenario studio
            </Link>
          </div>

          <p className="text-xs leading-relaxed text-dim">{PREFLIGHT_DISCLAIMER}</p>
          <p className="text-xs text-dim">
            Cash snapshot: surplus{" "}
            {formatCurrency(income - expenses - debtPay)} / mo · savings{" "}
            {formatCurrency(liquid)}.
          </p>
        </div>
      </div>
    </ToolShell>
  );
}
