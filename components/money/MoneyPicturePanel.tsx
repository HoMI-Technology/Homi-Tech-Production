"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCfm } from "@/hooks/use-cfm";
import {
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import {
  metricsFromLedger,
  type NamedMoneyMetrics,
} from "@/lib/finance/metrics";
import { cashFlowTemperature, runwayTemperature, type Temperature } from "@/lib/finance/temperature";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { COLORS } from "@/lib/brand";

const TEMP_COLOR: Record<Temperature, string> = {
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
  amber: COLORS.amber,
  crimson: COLORS.crimson,
};

/**
 * Companion openers. These are entry points into the existing Companion, not a
 * second chat surface — /advisor reads ?q= and pre-fills the composer so the
 * user still presses send (no silent API call, no quota burned on navigation).
 */
const COMPANION_PROMPTS = [
  "What does my runway mean for readiness?",
  "Is my DTI a problem?",
  "How much should I save before buying?",
];

/** Bank-connection prompt. Shown when there is no picture, and again as a
 * secondary nudge when the picture exists but the evidence is thin. */
function PlaidCta({ body }: { body: string }) {
  return (
    <div className="mt-4 rounded-xl border border-emerald/20 bg-emerald/[0.04] p-4">
      <p className="eyebrow text-emerald/70">Connect your bank</p>
      <p className="mt-1 text-2xs leading-relaxed text-dim/70">{body}</p>
      <Link
        href="/connections"
        className="mt-3 flex items-center gap-2 text-2xs font-semibold text-emerald hover:underline"
      >
        Connect via Plaid
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden
        >
          <path d="M2.5 6h7M6.5 3l3 3-3 3" />
        </svg>
      </Link>
    </div>
  );
}

/**
 * Money Reality — persistent left picture panel.
 *
 * Always visible regardless of which money mode (Stand/Track/Decide/Plan)
 * is active in the right content area. Shows key financial metrics as
 * Bloomberg-style data rows: Surplus, Runway, DTI, Evidence.
 *
 * Read-only: reads the local ledger, never writes, never calls the server.
 */
export function MoneyPicturePanel() {
  const [metrics, setMetrics] = useState<NamedMoneyMetrics | null>(null);
  const { cfm } = useCfm();

  useEffect(() => {
    if (!hasSavedBudgetLedger()) return;
    try {
      const nowIso = new Date().toISOString();
      const ledger = loadBudgetLedger(nowIso);
      if (ledger) setMetrics(metricsFromLedger(ledger, nowIso, null));
    } catch {
      // degraded gracefully — panel stays in empty state
    }
  }, []);

  /**
   * The ledger stays the source of truth: when it exists, the CFM is derived
   * from it, so preferring the CFM would change nothing. The CFM earns its
   * keep as the *fallback* — a user still on the legacy finance snapshot has
   * no ledger, and without this the panel claimed "no data" while the rest of
   * the money surface showed real numbers.
   */
  const fromCfm = metrics === null && cfm !== null;

  const surplusDollars = metrics?.surplus.dollars ?? (fromCfm ? cfm!.derived.netCashFlow : null);
  const incomeDollars =
    metrics?.surplus.incomeDollars ?? (fromCfm ? cfm!.core.monthlyIncome.value : null);
  const runwayMonths = metrics?.runway.months ?? (fromCfm ? cfm!.derived.runwayMonths : null);
  // hasDebtSignal is the honesty gate — a 0% DTI on unknown debt is a lie.
  const dtiPct =
    metrics?.dti.pct ?? (fromCfm && cfm!.meta.hasDebtSignal ? cfm!.derived.dtiPct : null);
  const monthsWithData = metrics?.evidence.monthsWithData ?? null;
  const completeness = metrics?.evidence.completeness ?? cfm?.meta.completeness ?? null;

  /**
   * "Live" means bank-linked transactions are actually in the ledger — not
   * merely "some money data is saved". A saved CFM can be entirely hand-typed,
   * so it can never light this badge.
   */
  const linked = metrics !== null && metrics.evidence.sourceMode !== "manual";

  const cfTemp =
    surplusDollars !== null && incomeDollars !== null && incomeDollars > 0
      ? cashFlowTemperature(surplusDollars, incomeDollars)
      : null;
  const rwTemp = runwayMonths != null ? runwayTemperature(runwayMonths) : null;

  const dtiColor =
    dtiPct == null ? COLORS.dim
    : dtiPct > 50 ? COLORS.crimson
    : dtiPct > 43 ? COLORS.amber
    : dtiPct > 36 ? COLORS.yellow
    : COLORS.cyan;

  const hasData = metrics !== null || fromCfm;

  return (
    <div className="money-picture-panel-inner">
      {/* Header */}
      <div className="mb-4">
        <p className="eyebrow text-cyan/70">
          Reality Picture
          {linked && (
            <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald">
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald"
              />
              Live
            </span>
          )}
        </p>
        <p className="mt-1 text-2xs leading-relaxed text-dim/60">
          Your financial ground truth. Educational only.
        </p>
      </div>

      {hasData ? (
        <div className="flex flex-col">
          {/* Surplus */}
          {surplusDollars !== null && (
            <div className="data-row">
              <span className="data-row-label">Surplus / mo</span>
              <span
                className="data-row-value num-money"
                style={{ color: cfTemp ? TEMP_COLOR[cfTemp] : COLORS.light }}
              >
                {formatCurrency(surplusDollars)}
              </span>
            </div>
          )}

          {/* Income */}
          {incomeDollars !== null && incomeDollars > 0 && (
            <div className="data-row">
              <span className="data-row-label">Income / mo</span>
              <span className="data-row-value num-money" style={{ color: COLORS.emerald }}>
                {formatCurrency(incomeDollars)}
              </span>
            </div>
          )}

          {/* Runway */}
          {runwayMonths != null && (
            <div className="data-row">
              <span className="data-row-label">Runway</span>
              <span
                className="data-row-value num"
                style={{ color: rwTemp ? TEMP_COLOR[rwTemp] : COLORS.dim }}
              >
                {runwayMonths.toFixed(1)} mo
              </span>
            </div>
          )}

          {/* DTI — pct is already 0–100; formatPercent appends the sign. */}
          {dtiPct !== null && (
            <div className="data-row">
              <span className="data-row-label">DTI</span>
              <span className="data-row-value num" style={{ color: dtiColor }}>
                {formatPercent(dtiPct)}
              </span>
            </div>
          )}

          {/* Evidence */}
          {monthsWithData !== null && (
            <div className="data-row">
              <span className="data-row-label">Evidence</span>
              <span className="data-row-value num" style={{ color: COLORS.dim }}>
                {monthsWithData} mo
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="py-6 text-center">
          <p className="text-2xs text-dim/60">No budget data yet.</p>
          <Link
            href="/money/budget"
            className="mt-3 inline-block text-2xs font-semibold text-cyan hover:underline"
          >
            Open Budget Planner →
          </Link>
        </div>
      )}

      {/* Plaid connection CTA — primary when there is nothing to show, a
        * secondary nudge while the evidence behind the numbers is thin. */}
      {!hasData ? (
        <PlaidCta body="Live balances and transactions make every number honest." />
      ) : (
        !linked &&
        completeness === "low" && (
          <PlaidCta body="Your picture is thin. Linked transactions add the months these numbers are missing." />
        )
      )}

      {/* Companion entry point */}
      <div className="mt-4 border-t border-white/5 pt-4">
        <p className="eyebrow mb-2 text-cyan/60">Ask Homie</p>
        <div className="flex flex-col gap-1.5">
          {COMPANION_PROMPTS.map((q) => (
            <Link
              key={q}
              href={`/advisor?q=${encodeURIComponent(q)}`}
              className="block rounded-lg px-2 py-1.5 text-2xs leading-tight text-dim/70 transition-colors hover:bg-white/[0.03] hover:text-cyan"
            >
              {q}
            </Link>
          ))}
        </div>
      </div>

      <p className="mt-5 text-3xs leading-relaxed text-dim/40">
        Educational guidance only — not financial advice.
      </p>
    </div>
  );
}
