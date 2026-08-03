"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MoneyField } from "@/components/ui/MoneyField";
import { NumberField } from "@/components/ui/NumberField";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { VerdictBadge } from "@/components/ui/VerdictBadge";
import { VERDICT_META } from "@/lib/brand";
import { formatCurrency, formatMonths, formatPercent } from "@/lib/tools/format";
import { loadFinanceState } from "@/lib/finance/store";
import {
  applyDebtPayoff,
  applySavingsPlan,
  deriveAnchors,
  rankLevers,
  seedBaseline,
  simulate,
  ESTIMATED_DEBT_PAYMENT_RATE,
  type AnchorAssessment,
  type SimulatorBaseline,
  type SimulatorLevers,
} from "@/lib/simulator";

/**
 * Readiness-score simulator — adjust the four money levers and watch the
 * financial pillar (and only the financial pillar) move the composite
 * HōMI-Score, scored by the same canonical engine as the real assessment.
 */

function leversOf(baseline: SimulatorBaseline): SimulatorLevers {
  return {
    monthlyIncome: baseline.monthlyIncome,
    monthlyExpenses: baseline.monthlyExpenses,
    liquidSavings: baseline.liquidSavings,
    totalDebt: baseline.totalDebt,
  };
}

export function ScoreSimulator({
  snapshotState,
  anchorAssessment,
}: {
  /** state jsonb of the user's latest financial snapshot, when one exists. */
  snapshotState: Record<string, unknown> | null;
  /** The latest completed assessment's pillar scores + stored inputs. */
  anchorAssessment: AnchorAssessment | null;
}) {
  const [baseline, setBaseline] = useState<SimulatorBaseline | null>(null);
  const [levers, setLevers] = useState<SimulatorLevers | null>(null);

  // Scenario shortcut inputs.
  const [payoffAmount, setPayoffAmount] = useState<number | null>(null);
  const [planPerMonth, setPlanPerMonth] = useState<number | null>(null);
  const [planMonths, setPlanMonths] = useState<number | null>(12);

  // Seed after mount: snapshot (server) → localStorage finance → zeros.
  // localStorage is only readable client-side, hence the effect.
  useEffect(() => {
    let manual = null;
    try {
      if (window.localStorage.getItem("homi:finance") !== null) manual = loadFinanceState();
    } catch {
      // Storage unavailable — fall through to the next seed.
    }
    const seeded = seedBaseline(snapshotState, manual);
    setBaseline(seeded);
    setLevers(leversOf(seeded));
  }, [snapshotState]);

  const anchors = useMemo(() => deriveAnchors(anchorAssessment), [anchorAssessment]);

  const current = useMemo(
    () => (baseline ? simulate(leversOf(baseline), baseline, anchors) : null),
    [baseline, anchors],
  );
  const simulated = useMemo(
    () => (baseline && levers ? simulate(levers, baseline, anchors) : null),
    [baseline, levers, anchors],
  );
  const impacts = useMemo(
    () => (baseline && levers ? rankLevers(levers, baseline, anchors) : []),
    [baseline, levers, anchors],
  );

  if (!baseline || !levers || !current || !simulated) {
    return <div className="glass p-6 text-sm text-dim">Loading your numbers…</div>;
  }

  const delta = simulated.compositeScore - current.compositeScore;
  const deltaTone = delta > 0 ? "text-emerald" : delta < 0 ? "text-crimson" : "text-dim";
  const currentMeta = VERDICT_META[current.verdict];
  const simulatedMeta = VERDICT_META[simulated.verdict];
  const crossed = current.verdict !== simulated.verdict;
  const topLever = impacts[0] ?? null;
  const patch = (partial: Partial<SimulatorLevers>) => setLevers((prev) => (prev ? { ...prev, ...partial } : prev));

  return (
    <div className="space-y-6">
      {baseline.source === "empty" && (
        <div className="glass border border-slate-surface/60 p-5 text-sm leading-relaxed text-dim">
          No numbers yet — the simulator starts from zero.{" "}
          <Link href="/connections" className="text-cyan underline underline-offset-2">
            Connect a bank
          </Link>{" "}
          or fill in the{" "}
          <Link href="/finance" className="text-cyan underline underline-offset-2">
            Finance dashboard
          </Link>{" "}
          for a real baseline, or just type your numbers below.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        {/* ── Levers ─────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="glass p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-light">Your levers</h2>
              <button
                className="btn btn-ghost btn-xs text-sm"
                onClick={() => setLevers(leversOf(baseline))}
              >
                Reset
              </button>
            </div>
            <p className="mt-1 text-xs text-dim">
              {baseline.source === "plaid_sync" && "Baseline from your latest bank sync."}
              {baseline.source === "manual" && "Baseline from your Finance dashboard numbers."}
              {baseline.source === "empty" && "Baseline starts at zero until you add numbers."}
            </p>
            <div className="mt-4 space-y-4">
              <MoneyField
                label="Monthly income"
                value={levers.monthlyIncome}
                onChange={(v) => patch({ monthlyIncome: v ?? 0 })}
              />
              <MoneyField
                label="Monthly expenses"
                value={levers.monthlyExpenses}
                onChange={(v) => patch({ monthlyExpenses: v ?? 0 })}
              />
              <MoneyField
                label="Liquid savings"
                value={levers.liquidSavings}
                onChange={(v) => patch({ liquidSavings: v ?? 0 })}
              />
              <MoneyField
                label="Total debt"
                value={levers.totalDebt}
                onChange={(v) => patch({ totalDebt: v ?? 0 })}
              />
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Scenario shortcuts</h2>
            <div className="mt-4 space-y-5">
              <div>
                <div className="flex items-end gap-3">
                  <MoneyField label="Pay off debt" hint="Paid from liquid savings." value={payoffAmount} onChange={setPayoffAmount} />
                  <button
                    className="btn btn-ghost mb-0.5 shrink-0 btn-sm"
                    onClick={() => {
                      if (payoffAmount && payoffAmount > 0) setLevers(applyDebtPayoff(levers, payoffAmount));
                    }}
                  >
                    Apply
                  </button>
                </div>
              </div>
              <div>
                <div className="grid grid-cols-2 gap-3">
                  <MoneyField label="Save per month" value={planPerMonth} onChange={setPlanPerMonth} />
                  <NumberField label="For how many months" min={1} max={120} value={planMonths} onChange={setPlanMonths} />
                </div>
                <button
                  className="btn btn-ghost mt-3 btn-sm"
                  onClick={() => {
                    if (planPerMonth && planPerMonth > 0 && planMonths && planMonths > 0) {
                      setLevers(applySavingsPlan(levers, planPerMonth, planMonths));
                    }
                  }}
                >
                  Apply savings plan
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Readout ────────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="glass sweep relative overflow-hidden p-8">
            <div className="flex flex-wrap items-center justify-center gap-8">
              <ScoreRing
                value={current.compositeScore}
                color={currentMeta.color}
                size={130}
                label="Today"
                sublabel="of 100"
              />
              <div className="text-center">
                <p className={`score-numeral text-4xl font-bold ${deltaTone}`}>
                  {delta >= 0 ? "+" : ""}
                  {delta}
                </p>
                <p className="mt-1 text-xs text-dim">points</p>
              </div>
              <ScoreRing
                value={simulated.compositeScore}
                color={simulatedMeta.color}
                size={130}
                label="Simulated"
                sublabel="of 100"
              />
            </div>
            <div className="mt-6 flex flex-col items-center gap-2 text-center">
              <VerdictBadge verdict={simulated.verdict} size="lg" />
              <p className="max-w-md text-sm leading-relaxed text-dim">
                {crossed
                  ? `This change moves you from ${currentMeta.label} to ${simulatedMeta.label}.`
                  : `You stay in ${simulatedMeta.label} with this change.`}
              </p>
            </div>
            {simulated.hardStops.length > 0 && (
              <div className="mt-4 rounded-lg border border-crimson/30 bg-verdict-notyet px-4 py-3">
                {simulated.hardStops.map((stop) => (
                  <p key={stop.code} className="text-sm leading-relaxed text-light">
                    {stop.message}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Readout
              label="Financial pillar"
              value={`${simulated.financialScore}/35`}
              detail={`was ${current.financialScore}/35`}
            />
            <Readout
              label="Debt-to-income"
              value={formatPercent(simulated.derived.debtToIncomeRatio * 100)}
              detail={simulated.debtPaymentsEstimated ? "payments estimated" : "from your payments"}
            />
            <Readout
              label="Runway"
              value={formatMonths(simulated.derived.emergencyFundMonths)}
              detail="savings ÷ monthly outflow"
            />
          </div>

          {topLever && (
            <div className="glass panel-focus p-6">
              <p className="eyebrow">Biggest lever</p>
              <p className="mt-2 text-sm leading-relaxed text-light">
                {topLever.label} moves your score by{" "}
                <span className={`score-numeral font-semibold ${topLever.delta >= 0 ? "text-emerald" : "text-crimson"}`}>
                  {topLever.delta >= 0 ? "+" : ""}
                  {topLever.delta}
                </span>{" "}
                points on its own
                {impacts.length > 1 ? " — more than any other change you've made." : "."}
              </p>
            </div>
          )}

          <div className="glass p-6 text-xs leading-relaxed text-dim">
            <p>
              {anchors.neutral
                ? "You haven't completed an assessment yet, so the emotional and timing pillars use neutral placeholders here. Only the financial pillar responds to these levers — take the full assessment for a real composite."
                : `Only the financial pillar responds to these levers. Your emotional (${anchors.emotionalScore}/35) and timing (${anchors.timingScore}/30) pillars are held at your latest assessment values.`}
            </p>
            {simulated.debtPaymentsEstimated && (
              <p className="mt-2">
                Monthly debt payments aren&apos;t in your synced data, so they&apos;re estimated at{" "}
                {Math.round(ESTIMATED_DEBT_PAYMENT_RATE * 100)}% of your debt balance (
                {formatCurrency(simulated.monthlyDebtPayments)}/mo). Enter actual payments on the{" "}
                <Link href="/finance" className="text-cyan underline underline-offset-2">
                  Finance dashboard
                </Link>{" "}
                for a sharper read.
              </p>
            )}
            <p className="mt-2">
              Educational guidance only — this shows how your own numbers move your HōMI-Score. It is not
              financial advice.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Readout({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="glass p-5">
      <p className="eyebrow">{label}</p>
      <p className="score-numeral mt-2 text-2xl font-bold text-light">{value}</p>
      <p className="mt-1 text-xs text-dim">{detail}</p>
    </div>
  );
}
