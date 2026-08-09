"use client";

import { useCallback, useMemo, useState } from "react";
import { computeRothConversion } from "@/lib/tools/roth";
import { formatCurrency } from "@/lib/tools/format";
import { LensField } from "@/components/tools/LensField";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { LensSynthesis } from "@/components/tools/LensSynthesis";
import { SaveScenarioButton } from "@/components/tools/SaveScenarioButton";
import { UpdateNumbersButton } from "@/components/tools/UpdateNumbersButton";
import { useLensPrefill } from "@/hooks/use-lens-prefill";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";
import { ToolShell } from "@/components/tools/ToolShell";

function RothConversionPageInner() {
  const [currentBalance, setCurrentBalance] = useState(120000);
  const [convertAmount, setConvertAmount] = useState(30000);
  const [marginalRateNow, setMarginalRateNow] = useState(22);
  const [expectedRateRetirement, setExpectedRateRetirement] = useState(24);
  const [yearsToHorizon, setYearsToHorizon] = useState(20);
  const [expectedGrowth, setExpectedGrowth] = useState(7);

  // Decision Lab: mount-only seed from the CFM via the registry contract.
  const apply = useCallback((key: string, v: number) => {
    if (key === "currentBalance") setCurrentBalance(v);
  }, []);
  const { prefilled, markAll } = useLensPrefill("roth-conversion", apply);
  const sourceFor = (key: string) => (prefilled.has(key) ? "yours" : "illustrative");

  const result = useMemo(
    () =>
      computeRothConversion({
        currentBalance,
        convertAmount,
        marginalRateNowPercent: marginalRateNow,
        expectedRateRetirementPercent: expectedRateRetirement,
        yearsToHorizon,
        expectedGrowthPercent: expectedGrowth,
      }),
    [
      currentBalance,
      convertAmount,
      marginalRateNow,
      expectedRateRetirement,
      yearsToHorizon,
      expectedGrowth,
    ],
  );

  const benefitPositive = result.netEducationalBenefit >= 0;

  // The lens digest the Companion reads. The headline is the tax avoided
  // at horizon (always non-negative); the net benefit can go either way
  // and stays visible in the UI where its sign is styled honestly.
  const digest = useMemo(
    () => ({
      lensId: "roth-conversion",
      path: "/tools/roth-conversion",
      headline: {
        label: "Tax avoided at horizon",
        value: Math.round(result.taxAvoidedAtHorizon),
        unit: "currency" as const,
      },
      keyInputs: {
        currentBalance,
        convertAmount,
        marginalRateNow,
        expectedRateRetirement,
        yearsToHorizon,
      },
      deltas: null,
    }),
    [
      result.taxAvoidedAtHorizon,
      currentBalance,
      convertAmount,
      marginalRateNow,
      expectedRateRetirement,
      yearsToHorizon,
    ],
  );

  return (
    <ToolShell
      title="Roth Conversion — Educational"
      description={`A plain-language look at one trade-off: paying tax on a conversion now versus the tax you'd otherwise owe on that money later. This is education, not a recommendation to convert anything.`}
    >
      <SavedNumbersStrip />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <LensField
            label="Current traditional balance"
            value={currentBalance}
            onChange={setCurrentBalance}
            min={0}
            max={1000000}
            step={5000}
            format="currency"
            source={sourceFor("currentBalance")}
          />
          <LensField
            label="Amount considering converting"
            value={convertAmount}
            onChange={setConvertAmount}
            min={0}
            max={currentBalance || 500000}
            step={1000}
            format="currency"
          />
          <LensField
            label="Marginal tax rate now"
            value={marginalRateNow}
            onChange={setMarginalRateNow}
            min={0}
            max={40}
            step={1}
            format="percent"
          />
          <LensField
            label="Expected tax rate at retirement"
            value={expectedRateRetirement}
            onChange={setExpectedRateRetirement}
            min={0}
            max={40}
            step={1}
            format="percent"
          />
          <LensField
            label="Years to horizon"
            value={yearsToHorizon}
            onChange={setYearsToHorizon}
            min={1}
            max={40}
            step={1}
            format="years"
          />
          <LensField
            label="Expected annual growth"
            value={expectedGrowth}
            onChange={setExpectedGrowth}
            min={0}
            max={12}
            step={0.5}
            format="percent"
          />

          <div className="hairline" />
          <UpdateNumbersButton
            getFields={() => ({ investedAssets: currentBalance })}
            onSaved={() => markAll(["currentBalance"])}
          />
          <SaveScenarioButton
            lensId="roth-conversion"
            getInputs={() => ({
              currentBalance,
              convertAmount,
              marginalRateNow,
              expectedRateRetirement,
              yearsToHorizon,
              expectedGrowth,
            })}
          />
        </div>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="glass p-6">
              <p className="text-sm text-dim">Tax cost today</p>
              <p className="score-numeral mt-2 text-3xl font-bold text-amber">
                {formatCurrency(result.taxCostToday)}
              </p>
              <p className="mt-1 text-xs text-dim">
                {formatCurrency(convertAmount)} converted at {marginalRateNow}%.
              </p>
            </div>
            <div className="glass p-6">
              <p className="text-sm text-dim">Tax avoided at horizon</p>
              <p className="score-numeral mt-2 text-3xl font-bold text-emerald">
                {formatCurrency(result.taxAvoidedAtHorizon)}
              </p>
              <p className="mt-1 text-xs text-dim">
                On a projected {formatCurrency(result.futureValueAtHorizon)} balance in{" "}
                {yearsToHorizon} years.
              </p>
            </div>
          </div>

          <div
            className={`glass border p-6 ${benefitPositive ? "bg-verdict-ready" : "bg-verdict-almost"}`}
          >
            <p className="text-sm text-dim">Net educational benefit (undiscounted)</p>
            <p
              className={`score-numeral mt-2 text-3xl font-bold ${benefitPositive ? "text-emerald" : "text-amber"}`}
            >
              {benefitPositive ? "+" : ""}
              {formatCurrency(result.netEducationalBenefit)}
            </p>
            <p className="mt-2 text-xs text-dim">
              Tax avoided later minus tax paid now, in nominal dollars — not adjusted for the time
              value of money or for paying the conversion tax out of the converted funds themselves.
            </p>
          </div>

          <LensSynthesis digest={digest} />

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              A conversion tends to look better on paper the more your expected retirement tax rate
              exceeds your rate today — this tool assumes you pay the conversion tax from money
              outside the account, which matters a lot in practice. This is not financial, tax, or
              investment advice; it is a simplified, educational comparison of two numbers. A tax
              professional who knows your full picture is the right place to take this next.
            </p>
          </div>
        </div>
      </div>
    </ToolShell>
  );
}

export default function RothConversionPage() {
  return (
    <AdvancedToolGate>
      <RothConversionPageInner />
    </AdvancedToolGate>
  );
}
