"use client";

import { useCallback, useMemo, useState } from "react";
import { COLORS } from "@/lib/brand";
import { comparePrograms } from "@/lib/tools/loanprograms";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { CalcField } from "@/components/tools/CalcField";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { DeltasCard } from "@/components/tools/DeltasCard";
import { ChainLinks } from "@/components/tools/ChainLinks";
import { LensSynthesis } from "@/components/tools/LensSynthesis";
import { SaveScenarioButton } from "@/components/tools/SaveScenarioButton";
import { UpdateNumbersButton } from "@/components/tools/UpdateNumbersButton";
import { ReadinessBand } from "@/components/tools/ReadinessBand";
import { getLens } from "@/lib/tools/registry";
import { computeHousingDeltas } from "@/lib/tools/deltas";
import { toReadinessDigest } from "@/lib/tools/readiness-impact";
import { useLensPrefill } from "@/hooks/use-lens-prefill";
import { useHousingReadinessImpact } from "@/hooks/use-housing-readiness";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";
import { ToolShell } from "@/components/tools/ToolShell";

const LENS = getLens("loan-programs")!;

const PROGRAM_COLOR: Record<string, string> = {
  conventional: COLORS.cyan,
  fha: COLORS.yellow,
  va: COLORS.emerald,
};

function LoanProgramsPageInner() {
  const [homePrice, setHomePrice] = useState(400000);
  const [downPct, setDownPct] = useState(5);
  const [rate, setRate] = useState(6.5);
  const [termYears, setTermYears] = useState(30);
  const [firstTimeUse, setFirstTimeUse] = useState(true);

  // Decision Lab: mount-only seed from the CFM via the registry contract.
  const apply = useCallback((key: string, v: number) => {
    if (key === "homePrice") setHomePrice(v);
    else if (key === "rate") setRate(v);
    else if (key === "termYears") setTermYears(v);
  }, []);
  const { prefilled, finance, hydrated, markAll } = useLensPrefill("loan-programs", apply);
  const sourceFor = (key: string) => (prefilled.has(key) ? "yours" : "illustrative");

  const downPayment = Math.round((downPct / 100) * homePrice);
  const results = useMemo(
    () => comparePrograms({ homePrice, downPayment, rate, termYears, firstTimeUse }),
    [homePrice, downPayment, rate, termYears, firstTimeUse],
  );
  const cheapest = results.reduce(
    (best, r) => (r.monthlyTotal < best.monthlyTotal ? r : best),
    results[0],
  );

  // Deterministic impact of carrying the CHEAPEST program's payment —
  // cheapest is decided by code, so the frame is honest.
  const deltas = useMemo(() => {
    if (!finance) return null;
    return computeHousingDeltas(finance, cheapest.monthlyTotal);
  }, [finance, cheapest.monthlyTotal]);

  const readiness = useHousingReadinessImpact({
    monthlyObligation: cheapest.monthlyTotal,
    upfrontCost: downPayment,
  });

  // The lens digest the Companion reads — every number precomputed here.
  const digest = useMemo(
    () => ({
      lensId: "loan-programs",
      path: "/tools/loan-programs",
      headline: {
        label: `Cheapest monthly total (${cheapest.label})`,
        value: Math.round(cheapest.monthlyTotal),
        unit: "currency" as const,
      },
      keyInputs: { homePrice, downPct, rate, termYears },
      deltas,
      readiness: readiness ? toReadinessDigest(readiness) : undefined,
    }),
    [cheapest, homePrice, downPct, rate, termYears, deltas, readiness],
  );

  return (
    <ToolShell
      relatedGuide={LENS.relatedGuide}
      title="Loan Program Comparison"
      description={`Conventional, FHA, and VA side by side. The note rate is only part of the story — down payment, mortgage insurance, and upfront fees change the real monthly cost.`}
    >
      <SavedNumbersStrip />

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_1.6fr]">
        <div className="glass space-y-5 p-6">
          <CalcField
            label="Home price"
            value={homePrice}
            onChange={setHomePrice}
            min={100000}
            max={1500000}
            step={5000}
            format="currency"
            source={sourceFor("homePrice")}
          />
          <CalcField
            label="Down payment"
            value={downPct}
            onChange={setDownPct}
            min={0}
            max={25}
            step={0.5}
            format="percent"
          />
          <p className="-mt-2 text-xs text-dim">{formatCurrency(downPayment)} down</p>
          <CalcField
            label="Interest rate"
            value={rate}
            onChange={setRate}
            min={3}
            max={10}
            step={0.125}
            format="percent"
            source={sourceFor("rate")}
          />
          <CalcField
            label="Loan term"
            value={termYears}
            onChange={setTermYears}
            min={15}
            max={30}
            step={5}
            format="years"
            source={sourceFor("termYears")}
          />
          <div className="flex items-center justify-between pt-1">
            <label className="text-sm text-light">First-time VA use</label>
            <button
              type="button"
              onClick={() => setFirstTimeUse((v) => !v)}
              className={`chip ${firstTimeUse ? "!border-emerald/50 !text-emerald" : ""}`}
            >
              {firstTimeUse ? "Yes" : "No"}
            </button>
          </div>

          <div className="hairline" />
          <UpdateNumbersButton
            getFields={() => ({ targetPrice: homePrice, assumedRatePct: rate, termYears })}
            onSaved={() => markAll(["homePrice", "rate", "termYears"])}
          />
          <SaveScenarioButton
            lensId="loan-programs"
            getInputs={() => ({
              homePrice,
              downPct,
              rate,
              termYears,
              firstTimeUse: firstTimeUse ? 1 : 0,
            })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {results.map((r) => {
            const color = PROGRAM_COLOR[r.program];
            const isCheapest = r.program === cheapest.program;
            return (
              <div
                key={r.program}
                className={`glass sweep relative overflow-hidden p-5 ${isCheapest ? "panel-focus" : ""}`}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-px"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${color}88, transparent)`,
                  }}
                />
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-light">{r.label}</h2>
                  {isCheapest && <span className="chip !text-2xs">Lowest monthly</span>}
                </div>
                <p className="eyebrow mt-4">Monthly total</p>
                <p className="score-numeral text-2xl font-bold" style={{ color }}>
                  {formatCurrency(r.monthlyTotal)}
                </p>
                <div className="mt-4 space-y-2 text-xs text-dim">
                  <div className="flex justify-between">
                    <span>Principal &amp; interest</span>
                    <span className="score-numeral text-light">
                      {formatCurrency(r.principalAndInterest)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mortgage insurance</span>
                    <span className="score-numeral text-light">
                      {r.monthlyInsurance > 0 ? formatCurrency(r.monthlyInsurance) : "None"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>LTV</span>
                    <span className="score-numeral text-light">{formatPercent(r.ltv * 100)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Financed upfront fee</span>
                    <span className="score-numeral text-light">
                      {r.upfrontFeeFinanced > 0 ? formatCurrency(r.upfrontFeeFinanced) : "None"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>MI removable</span>
                    <span className="score-numeral text-light">
                      {r.insuranceRemovable ? "Yes" : "Life of loan"}
                    </span>
                  </div>
                </div>
                <p className="mt-4 text-xs leading-relaxed text-dim">{r.note}</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 max-w-3xl space-y-6">
        <LensSynthesis digest={digest} />
        {hydrated && deltas && <DeltasCard deltas={deltas} lensId="loan-programs" />}
        {hydrated && readiness && <ReadinessBand impact={readiness} />}
      </div>

      {LENS.chains && (
        <div className="mt-8 max-w-xl">
          <ChainLinks chains={LENS.chains} />
        </div>
      )}

      <p className="mt-8 max-w-3xl text-xs leading-relaxed text-dim">
        Program rules (minimum down, MIP/PMI rates, VA funding fee) follow standard 2026 guidelines
        and are educational estimates — eligibility, credit tier, and lender overlays change the
        real numbers. VA loans require eligibility; FHA MIP is life-of-loan at low down payments,
        which is why the cheapest month-one option isn&rsquo;t always the cheapest over time.
      </p>
    </ToolShell>
  );
}

export default function LoanProgramsPage() {
  return (
    <AdvancedToolGate>
      <LoanProgramsPageInner />
    </AdvancedToolGate>
  );
}
