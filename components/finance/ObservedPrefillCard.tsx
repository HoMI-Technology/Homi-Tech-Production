"use client";

import { useEffect, useState } from "react";
import {
  saveConfirmedFinancePrefill,
  type ConfirmedFinancePrefill,
} from "@/lib/finance/prefill-confirm";
import { runwayMonthsFromLiquid } from "@/lib/finance/observed-prefill";

interface LinkedItem {
  id: string;
  institutionName: string | null;
  status: string | null;
}

interface Suggestion {
  lookbackDays: number;
  transactionCount: number;
  spanDays: number;
  monthlyInflows: number;
  monthlyObligations: number;
  monthlySpend: number;
  liquidBalances: number;
  suggestedDti: number | null;
  suggestedRunwayMonths: number | null;
  transferClassificationSafe: boolean;
  canVerify: boolean;
  reason: string | null;
}

interface PrefillResponse {
  configured?: boolean;
  items?: LinkedItem[];
  suggestion?: Suggestion | null;
  partial?: boolean;
  message?: string | null;
  error?: string;
}

function money(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/**
 * Plus / linked-bank suggestions. User must confirm. No second score.
 */
export function ObservedPrefillCard() {
  const [state, setState] = useState<"loading" | "ready" | "hidden">("loading");
  const [payload, setPayload] = useState<PrefillResponse | null>(null);
  const [earmark, setEarmark] = useState(0);
  const [confirmed, setConfirmed] = useState<ConfirmedFinancePrefill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/finance/observed-prefill");
        if (res.status === 401) {
          if (!cancelled) setState("hidden");
          return;
        }
        const json = (await res.json()) as PrefillResponse;
        if (cancelled) return;
        if (json.configured === false) {
          setPayload(json);
          setState("ready");
          return;
        }
        setPayload(json);
        setState("ready");
      } catch {
        if (!cancelled) setState("hidden");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === "loading" || state === "hidden" || !payload) return null;

  if (payload.configured === false) {
    return (
      <p className="text-xs leading-relaxed text-dim/70">
        Bank link is coming soon. Your score stays on self-report.
      </p>
    );
  }

  const items = payload.items ?? [];
  const suggestion = payload.suggestion;
  const runway =
    suggestion == null
      ? null
      : runwayMonthsFromLiquid({
          liquidBalances: suggestion.liquidBalances,
          earmarkedDownPayment: earmark,
          monthlySpend: suggestion.monthlySpend,
        });

  function confirm() {
    if (!suggestion || suggestion.suggestedDti == null || runway == null) {
      setError("Not enough classified income to use this suggestion.");
      return;
    }
    const next: ConfirmedFinancePrefill = {
      confirmedAt: new Date().toISOString(),
      lookbackDays: suggestion.lookbackDays,
      debtToIncomeRatio: suggestion.suggestedDti,
      emergencyFundMonths: Math.max(0, runway),
      earmarkedDownPayment: earmark,
      dtiVerified: false,
      runwayVerified: false,
      downPaymentEarmarked: earmark > 0,
    };
    saveConfirmedFinancePrefill(next);
    setConfirmed(next);
    setError(null);
  }

  return (
    <div className="rounded-xl border border-slate-surface/60 bg-navy/20 px-4 py-3">
      <p className="text-3xs font-semibold uppercase tracking-[0.12em] text-dim">
        Linked suggestions
      </p>
      {items.length > 0 && (
        <p className="mt-1 text-xs text-dim">
          Linked: {items.map((item) => item.institutionName ?? "Bank").join(", ")}
          {payload.partial ? " — partial." : "."}
        </p>
      )}
      {payload.message && <p className="mt-1 text-xs text-dim/80">{payload.message}</p>}
      {suggestion && (
        <ul className="mt-2 space-y-1 text-xs text-light">
          <li>
            Observed inflows {money(suggestion.monthlyInflows)}/mo · obligations{" "}
            {money(suggestion.monthlyObligations)}/mo
            {suggestion.suggestedDti != null ? ` · DTI ${pct(suggestion.suggestedDti)}` : ""}
          </li>
          <li>
            Liquid {money(suggestion.liquidBalances)} · spend {money(suggestion.monthlySpend)}/mo
            {runway != null ? ` · runway ${runway.toFixed(1)} mo` : ""}
          </li>
        </ul>
      )}
      {suggestion &&
        suggestion.suggestedDti != null &&
        suggestion.spanDays >= 30 &&
        suggestion.transferClassificationSafe && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="text-xs text-dim">
            Down payment earmark
            <input
              type="number"
              min={0}
              step={100}
              value={earmark}
              onChange={(e) => setEarmark(Number(e.target.value) || 0)}
              className="mt-1 block w-full rounded-lg border border-line bg-navy px-3 py-1.5 text-sm text-light"
            />
          </label>
          <button type="button" className="btn btn-ghost" onClick={confirm}>
            Use as self-report
          </button>
        </div>
      )}
      {confirmed && (
        <p className="mt-2 text-xs text-dim">
          Saved as self-report for the next assessment. Not marked verified.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-amber">{error}</p>}
    </div>
  );
}
