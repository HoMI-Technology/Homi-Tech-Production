"use client";

import { useEffect, useMemo, useState } from "react";
import { fullPaymentBreakdown, amortizationSummary } from "@/lib/tools/mortgage";
import { formatCurrency } from "@/lib/tools/format";
import { AdvancedToolGate } from "@/components/entitlements/AdvancedToolGate";
import { ToolShell, ToolResultHero, ToolMetric } from "@/components/tools/ToolShell";
import { LensField } from "@/components/tools/LensField";
import { SavedNumbersStrip } from "@/components/tools/SavedNumbersStrip";
import { DeltasCard } from "@/components/tools/DeltasCard";
import { ChainLinks } from "@/components/tools/ChainLinks";
import { LensSynthesis } from "@/components/tools/LensSynthesis";
import { getLens } from "@/lib/tools/registry";
import { buildCfm, resolveCfmValue, saveToolsOverlayFields } from "@/lib/tools/cfm";
import { computeHousingDeltas } from "@/lib/tools/deltas";
import { useCfm } from "@/hooks/use-cfm";
import {
  loadFinanceState,
  hasSavedFinanceState,
  type FinanceState,
} from "@/lib/finance/store";

const LENS = getLens("mortgage")!;

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

function MortgagePageInner() {
  const [price, setPrice] = useState(400000);
  const [downPayment, setDownPayment] = useState(80000);
  const [rate, setRate] = useState(6.5);
  const [termYears, setTermYears] = useState(30);
  const [taxInsRate, setTaxInsRate] = useState(1.5);
  const [hoaMonthly, setHoaMonthly] = useState(0);

  /** Input keys seeded from the CFM — these render the "your numbers" tag. */
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [finance, setFinance] = useState<FinanceState | null>(null);
  const [replaceRent, setReplaceRent] = useState(false);
  const [writeBackDone, setWriteBackDone] = useState(false);

  const { overlay, hydrated } = useCfm();

  // Mount-only CFM prefill: seeds sliders from the user's saved numbers via
  // the registry contract, then never fights live edits again.
  useEffect(() => {
    const cfm = buildCfm();
    if (hasSavedFinanceState()) setFinance(loadFinanceState());
    if (!cfm || !LENS.inputs) return;

    const seeded = new Set<string>();
    const values: Record<string, number> = {};
    for (const spec of LENS.inputs) {
      if (!spec.cfmPath) continue;
      const field = resolveCfmValue(cfm, spec.cfmPath);
      if (field.source === "missing") continue;
      values[spec.key] = clamp(field.value, spec.min, spec.max);
      seeded.add(spec.key);
    }

    if (values.price !== undefined) setPrice(values.price);
    if (values.downPayment !== undefined) {
      setDownPayment(Math.min(values.downPayment, values.price ?? values.downPayment));
    }
    if (values.rate !== undefined) setRate(values.rate);
    if (values.termYears !== undefined) setTermYears(values.termYears);
    if (values.taxInsRate !== undefined) setTaxInsRate(values.taxInsRate);
    if (values.hoaMonthly !== undefined) setHoaMonthly(values.hoaMonthly);
    setPrefilled(seeded);
  }, []);

  const loanAmount = Math.max(0, price - downPayment);

  const breakdown = useMemo(
    () =>
      fullPaymentBreakdown(price, {
        rate,
        termYears,
        taxInsuranceRate: taxInsRate / 100,
        downPayment,
        hoaMonthly,
      }),
    [price, rate, termYears, taxInsRate, downPayment, hoaMonthly],
  );

  const amortization = useMemo(
    () => amortizationSummary(loanAmount, rate, termYears),
    [loanAmount, rate, termYears],
  );

  // Deterministic impact deltas — the only place this arithmetic happens.
  const deltas = useMemo(() => {
    if (!finance) return null;
    return computeHousingDeltas(finance, breakdown.total, {
      replacedRentMonthly: replaceRent ? (overlay.currentRent ?? 0) : 0,
    });
  }, [finance, breakdown.total, replaceRent, overlay.currentRent]);

  // The lens digest the Companion reads — every number precomputed here.
  const digest = useMemo(
    () => ({
      lensId: "mortgage",
      path: "/tools/mortgage",
      headline: {
        label: "Total monthly payment",
        value: Math.round(breakdown.total),
        unit: "currency" as const,
      },
      keyInputs: { price, downPayment, rate, termYears },
      deltas,
    }),
    [breakdown.total, price, downPayment, rate, termYears, deltas],
  );

  const sourceFor = (key: string) => (prefilled.has(key) ? "yours" : "illustrative");

  // Explicit, user-initiated write-back. Never silent.
  function updateMyNumbers() {
    saveToolsOverlayFields({
      targetPrice: price,
      downPaymentSaved: downPayment,
      assumedRatePct: rate,
      termYears,
      taxInsuranceRatePct: taxInsRate,
      hoaMonthly,
    });
    setPrefilled(new Set(["price", "downPayment", "rate", "termYears", "taxInsRate", "hoaMonthly"]));
    setWriteBackDone(true);
  }

  const maxBar = Math.max(breakdown.principalAndInterest, breakdown.taxesAndInsurance, breakdown.hoa, 1);

  return (
    <ToolShell
      title="Mortgage Payment"
      description={`The full monthly payment, broken into its real parts, plus what the loan actually costs over its full life — not just the headline rate.`}
    >
      <SavedNumbersStrip />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.35fr] lg:gap-8">
        <div className="glass space-y-5 p-6">
          <LensField label="Home price" value={price} onChange={setPrice} min={100000} max={1500000} step={5000} format="currency" source={sourceFor("price")} />
          <LensField label="Down payment" value={downPayment} onChange={setDownPayment} min={0} max={price} step={1000} format="currency" source={sourceFor("downPayment")} />
          <LensField label="Interest rate" value={rate} onChange={setRate} min={2} max={12} step={0.125} format="percent" source={sourceFor("rate")} />
          <LensField label="Loan term (years)" value={termYears} onChange={setTermYears} min={10} max={30} step={5} format="years" source={sourceFor("termYears")} />
          <LensField label="Taxes + insurance (% of price / yr)" value={taxInsRate} onChange={setTaxInsRate} min={0.5} max={3} step={0.1} format="percent" source={sourceFor("taxInsRate")} />
          <LensField label="HOA (monthly)" value={hoaMonthly} onChange={setHoaMonthly} min={0} max={1500} step={25} format="currency" source={sourceFor("hoaMonthly")} />

          <div className="hairline" />
          <button
            type="button"
            onClick={updateMyNumbers}
            className="w-full rounded-lg border border-cyan/40 px-4 py-2.5 text-sm font-medium text-cyan transition-colors hover:bg-cyan/10"
          >
            {writeBackDone ? "Saved — future tools start here" : "Update my numbers from this tool"}
          </button>
          <p className="text-xs leading-relaxed text-dim/70">
            Saves these as your planning numbers so the other tools — and your HōMI — start
            from the same place. Nothing here changes your assessment.
          </p>
        </div>

        <div className="space-y-6">
          <ToolResultHero
            label="Total monthly payment"
            value={formatCurrency(breakdown.total)}
            color="#22d3ee"
            footer={`Loan amount ${formatCurrency(loanAmount)} · principal, interest, taxes, insurance${breakdown.hoa > 0 ? ", HOA" : ""}`}
          >
            <div className="space-y-4">
              <BarRow label="Principal &amp; interest" value={breakdown.principalAndInterest} max={maxBar} color="#22d3ee" />
              <BarRow label="Taxes &amp; insurance (est.)" value={breakdown.taxesAndInsurance} max={maxBar} color="#facc15" />
              {breakdown.hoa > 0 && <BarRow label="HOA" value={breakdown.hoa} max={maxBar} color="#34d399" />}
            </div>
          </ToolResultHero>

          <LensSynthesis digest={digest} />

          {hydrated && finance && deltas && (
            <>
              {overlay.currentRent !== undefined && overlay.currentRent > 0 && (
                <label className="flex items-center gap-2 text-sm text-dim">
                  <input
                    type="checkbox"
                    checked={replaceRent}
                    onChange={(e) => setReplaceRent(e.target.checked)}
                    className="accent-cyan"
                  />
                  This replaces my current rent ({formatCurrency(overlay.currentRent)}/mo)
                </label>
              )}
              <DeltasCard deltas={deltas} />
            </>
          )}

          <div className="glass p-6">
            <h2 className="font-semibold text-light">Amortization summary</h2>
            <p className="mt-1 text-xs text-dim">Principal &amp; interest only, over the full {termYears}-year term.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <ToolMetric label="Total interest paid" value={formatCurrency(amortization.totalInterestPaid)} accent="#fb923c" />
              <ToolMetric label="Total paid (P&I)" value={formatCurrency(amortization.totalPaid)} />
            </div>
            <div className="hairline my-4" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-dim">Payoff date</span>
              <span className="score-numeral text-sm text-light">
                {amortization.payoffDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </span>
            </div>
          </div>

          <div className="glass p-6">
            <h2 className="font-semibold text-light">What this means</h2>
            <p className="mt-2 text-sm leading-relaxed text-dim">
              The interest total above is the real cost of borrowing, not just the sticker price of the
              home — on a 30-year loan it is often close to the loan amount itself. Taxes, insurance, and
              HOA dues are estimates and will drift with your actual location and building; principal and
              interest are fixed for the life of a fixed-rate loan. None of this is a lender quote — treat
              it as the shape of the payment, not the final number.
            </p>
          </div>

          {LENS.chains && <ChainLinks chains={LENS.chains} />}
        </div>
      </div>
    </ToolShell>
  );
}

function BarRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.max(2, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-dim" dangerouslySetInnerHTML={{ __html: label }} />
        <span className="score-numeral text-light">{formatCurrency(value)}</span>
      </div>
      <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-surface">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export default function MortgagePage() {
  return (
    <AdvancedToolGate>
      <MortgagePageInner />
    </AdvancedToolGate>
  );
}
