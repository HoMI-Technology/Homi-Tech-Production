"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/brand";
import {
  runScenarioStudio,
  scenarioInputsFromFinance,
  generatePathFromScenario,
  saveReadinessPath,
  SCENARIO_DISCLAIMER,
} from "@/lib/readiness";
import { useLatestAssessment } from "@/hooks/use-latest-assessment";
import { hasSavedFinanceState, loadFinanceState } from "@/lib/finance/store";
import { loadToolsOverlay } from "@/lib/tools/cfm";
import type { ScenarioKey, SimulationInputs } from "@/lib/decisions/simulate";
import { NetPositionChart } from "@/components/decisions/NetPositionChart";
import { PageFrame } from "@/components/operate/PageFrame";
import { SavedScenariosPanel } from "@/components/tools/SavedScenariosPanel";
import { MoneyField } from "@/components/ui/MoneyField";
import { PercentSlider } from "@/components/ui/PercentSlider";
import { formatCurrency } from "@/lib/tools/format";
import { track } from "@/lib/analytics";

const SCENARIO_META: Record<string, { color: string; borderClass: string; description: string }> = {
  "buy-now": {
    color: COLORS.cyan,
    borderClass: "border-cyan/40",
    description: "Buy today. Equity builds through amortization and appreciation, offset by costs.",
  },
  "wait-12": {
    color: COLORS.yellow,
    borderClass: "border-yellow/40",
    description: "Rent 12 more months while saving, then buy at the future price.",
  },
  "wait-24": {
    color: COLORS.crimson,
    borderClass: "border-crimson/40",
    description: "Rent 24 more months while saving, then buy at the future price.",
  },
};

export default function ScenariosPage() {
  const { assessment: stored } = useLatestAssessment();
  const seeded = useMemo(() => {
    if (!hasSavedFinanceState()) return scenarioInputsFromFinance({});
    const f = loadFinanceState();
    const overlay = loadToolsOverlay();
    return scenarioInputsFromFinance({
      liquidSavings: f.liquidSavings,
      monthlyIncome: f.monthlyIncome,
      monthlyExpenses: f.monthlyExpenses,
      monthlyDebtPayments: f.monthlyDebtPayments,
      downPaymentSaved: overlay.downPaymentSaved ?? f.liquidSavings,
      targetPrice: overlay.targetPrice,
      currentRent: overlay.currentRent,
      assumedRatePct: overlay.assumedRatePct,
    });
  }, []);

  const [inputs, setInputs] = useState<SimulationInputs>(seeded);
  const [pathMsg, setPathMsg] = useState<string | null>(null);

  function update<K extends keyof SimulationInputs>(key: K, value: SimulationInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function fundScenario(scenarioKey: ScenarioKey) {
    const current = stored;
    if (!current?.result) {
      setPathMsg("Assess first — Path is built from your readiness score.");
      return;
    }
    const path = generatePathFromScenario({
      inputs,
      scenarioKey,
      assessmentResult: current.result,
      assessmentCompletedAt: current.completedAt ?? null,
    });
    saveReadinessPath(path);
    setPathMsg(
      `Path saved for ${scenarioKey === "wait-12" ? "wait 12 months" : scenarioKey === "wait-24" ? "wait 24 months" : "buy now"} — open Path to Ready.`,
    );
    track("scenario_path_generated", { scenarioKey });
  }

  const studio = useMemo(
    () =>
      runScenarioStudio({
        ...inputs,
        readinessVerdict: stored?.result.verdict ?? null,
        readinessScore: stored?.result.score ?? null,
      }),
    [inputs, stored],
  );

  return (
    <PageFrame width="focus" density="spacious" role="personal">
      <p className="eyebrow">Path · Scenario studio</p>
      <h1 className="mt-1 font-display text-3xl text-light md:text-4xl">Buy now vs wait</h1>
      <p className="mt-2 max-w-2xl text-dim">
        Five-year net-position illustration with readiness honesty. Better math never overrides DO
        NOT PROCEED hard-stops.
      </p>

      {stored && (
        <div className="glass mt-6 border border-cyan/25 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-cyan">
            Readiness overlay
          </p>
          <p className="mt-1 text-sm text-light">
            Last verdict{" "}
            <span className="font-semibold">
              {stored.result.verdict === "NOT_YET"
                ? "DO NOT PROCEED"
                : stored.result.verdict.replace(/_/g, " ")}
            </span>
            {" · "}
            score <span className="score-numeral">{stored.result.score}</span>
          </p>
          <p className="mt-2 text-sm text-dim">{studio.readinessNote}</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[340px_1fr]">
        <div className="glass flex flex-col gap-5 p-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-dim">Your numbers</p>
          <MoneyField
            label="Home price"
            value={inputs.homePrice}
            onChange={(v) => update("homePrice", v ?? 0)}
          />
          <MoneyField
            label="Down payment saved"
            value={inputs.downPaymentSaved}
            onChange={(v) => update("downPaymentSaved", v ?? 0)}
          />
          <MoneyField
            label="Monthly savings capacity"
            value={inputs.monthlySavings}
            onChange={(v) => update("monthlySavings", v ?? 0)}
          />
          <MoneyField
            label="Current monthly rent"
            value={inputs.rent}
            onChange={(v) => update("rent", v ?? 0)}
          />
          <div className="hairline" />
          <PercentSlider
            label="Expected mortgage rate"
            value={inputs.rate}
            onChange={(v) => update("rate", v)}
            min={2}
            max={10}
          />
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

        <div className="flex flex-col gap-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {studio.scenarios.map((s) => {
              const meta = SCENARIO_META[s.key];
              const isBest = s.key === studio.bestKey;
              return (
                <div
                  key={s.key}
                  className={`glass border ${meta.borderClass} flex flex-col gap-3 p-5`}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold" style={{ color: meta.color }}>
                      {s.label}
                    </p>
                    {isBest && (
                      <span className="text-3xs font-semibold uppercase tracking-wide text-emerald">
                        Best net @ 5y
                      </span>
                    )}
                  </div>
                  <p className="score-numeral text-2xl text-light">
                    {formatCurrency(s.netPositionAt60)}
                  </p>
                  <p className="text-xs text-dim">{meta.description}</p>
                </div>
              );
            })}
          </div>

          <div className="glass p-5">
            <p className="text-sm text-dim">
              Spread between best and worst at 60 months:{" "}
              <span className="score-numeral text-light">{formatCurrency(studio.spreadAt60)}</span>
            </p>
            <div className="mt-4">
              <NetPositionChart scenarios={studio.scenarios} />
            </div>
          </div>

          <div className="glass border border-emerald/25 p-5">
            <p className="eyebrow text-emerald">Fund a scenario</p>
            <p className="mt-1 text-sm text-dim">
              {stored
                ? "Turn the wait plan into a Path to Ready with monthly funding targets."
                : "Path is built from your readiness score — Assess first, then fund a scenario."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {stored ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => fundScenario("wait-12")}
                  >
                    Fund wait-12 path
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => fundScenario("wait-24")}
                  >
                    Fund wait-24 path
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => fundScenario("buy-now")}
                  >
                    Path for buy-now
                  </button>
                </>
              ) : (
                <Link href="/assessment" className="btn btn-primary btn-sm">
                  Assess
                </Link>
              )}
            </div>
            {pathMsg && (
              <p className="mt-3 text-sm text-emerald" role="status">
                {pathMsg}{" "}
                <Link href="/path" className="underline underline-offset-2">
                  Open path
                </Link>
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Link href="/path" className="btn btn-primary">
              Path to Ready
            </Link>
            <Link href="/tools/preflight" className="btn btn-ghost">
              Pre-Flight
            </Link>
            <Link href="/household" className="btn btn-ghost">
              Household
            </Link>
            <Link href="/decisions" className="btn btn-ghost">
              Full decision rehearsal
            </Link>
          </div>

          <p className="text-xs leading-relaxed text-dim">{SCENARIO_DISCLAIMER}</p>
        </div>
      </div>

      {/* D2: /tools/scenarios (Decision Lab saved scenarios) merged into the
          canonical scenario surface. Deep link: /scenarios#saved. */}
      <div className="hairline mt-14" />
      <div className="mt-12">
        <SavedScenariosPanel />
      </div>
    </PageFrame>
  );
}
