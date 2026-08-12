"use client";

import { useEffect, useState } from "react";
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
import Link from "next/link";

const TEMP_COLOR: Record<Temperature, string> = {
  emerald: COLORS.emerald,
  yellow: COLORS.yellow,
  amber: COLORS.amber,
  crimson: COLORS.crimson,
};

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

  const surplus = metrics?.surplus ?? null;
  const runway = metrics?.runway ?? null;
  const dti = metrics?.dti ?? null;
  const evidence = metrics?.evidence ?? null;

  const cfTemp =
    surplus !== null && surplus.incomeDollars > 0
      ? cashFlowTemperature(surplus.dollars, surplus.incomeDollars)
      : null;
  const rwTemp =
    runway?.months != null ? runwayTemperature(runway.months) : null;

  const dtiPct = dti?.pct ?? null;
  const dtiColor =
    dtiPct == null ? COLORS.dim
    : dtiPct > 50 ? COLORS.crimson
    : dtiPct > 43 ? COLORS.amber
    : dtiPct > 36 ? COLORS.yellow
    : COLORS.cyan;

  const hasData = metrics !== null;

  return (
    <div className="money-picture-panel-inner">
      {/* Header */}
      <div className="mb-4">
        <p className="eyebrow text-cyan/70">Reality Picture</p>
        <p className="mt-1 text-2xs text-dim/60 leading-relaxed">
          Your financial ground truth. Educational only.
        </p>
      </div>

      {hasData ? (
        <div className="flex flex-col">
          {/* Surplus */}
          {surplus !== null && (
            <div className="data-row">
              <span className="data-row-label">Surplus / mo</span>
              <span
                className="data-row-value num-money"
                style={{ color: cfTemp ? TEMP_COLOR[cfTemp] : COLORS.light }}
              >
                {formatCurrency(surplus.dollars)}
              </span>
            </div>
          )}

          {/* Income */}
          {surplus && surplus.incomeDollars > 0 && (
            <div className="data-row">
              <span className="data-row-label">Income / mo</span>
              <span className="data-row-value num-money" style={{ color: COLORS.emerald }}>
                {formatCurrency(surplus.incomeDollars)}
              </span>
            </div>
          )}

          {/* Runway */}
          {runway?.months != null && (
            <div className="data-row">
              <span className="data-row-label">Runway</span>
              <span
                className="data-row-value num"
                style={{ color: rwTemp ? TEMP_COLOR[rwTemp] : COLORS.dim }}
              >
                {runway.months.toFixed(1)} mo
              </span>
            </div>
          )}

          {/* DTI */}
          {dtiPct !== null && (
            <div className="data-row">
              <span className="data-row-label">DTI</span>
              <span className="data-row-value num" style={{ color: dtiColor }}>
                {formatPercent(dtiPct / 100)}
              </span>
            </div>
          )}

          {/* Evidence */}
          {evidence && (
            <div className="data-row">
              <span className="data-row-label">Evidence</span>
              <span className="data-row-value num" style={{ color: COLORS.dim }}>
                {evidence.monthsWithData} mo
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

      <p className="mt-5 text-3xs leading-relaxed text-dim/40">
        Educational guidance only — not financial advice.
      </p>
    </div>
  );
}
