"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildConfirmedFinancePrefill,
  saveConfirmedFinancePrefill,
  type ConfirmedFinancePrefill,
} from "@/lib/finance/prefill-confirm";
import {
  mergeMoneyPictures,
  observeDashboardPrefill,
  questionSuggestionsFromMoney,
  type MoneyPictureAmounts,
  type ObservedPrefillSuggestion,
} from "@/lib/finance/observed-prefill";
import {
  budgetLedgerSavedAt,
  hasSavedBudgetLedger,
  loadBudgetLedger,
} from "@/lib/finance/local-ledger";
import { downPaymentProgress } from "@/lib/finance/goal-semantics";
import { metricsFromLedger } from "@/lib/finance/metrics";
import { centsToDollars } from "@/lib/finance/money";

interface LinkedItem {
  id: string;
  institutionName: string | null;
  status: string | null;
}

interface PrefillResponse {
  configured?: boolean;
  items?: LinkedItem[];
  suggestion?: ObservedPrefillSuggestion | null;
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

function pictureFromLedger(earmark: number): MoneyPictureAmounts | null {
  if (!hasSavedBudgetLedger()) return null;
  const nowIso = new Date().toISOString();
  const ledger = loadBudgetLedger(nowIso);
  const metrics = metricsFromLedger(ledger, nowIso, budgetLedgerSavedAt());
  if (!metrics.evidence.hasIncome && !metrics.evidence.hasExpenses && metrics.evidence.monthsWithData === 0) {
    return null;
  }
  const home = downPaymentProgress(ledger.goals);
  return {
    monthlyIncome: metrics.evidence.hasIncome ? metrics.surplus.incomeDollars : null,
    monthlyDebtPayments: metrics.evidence.hasDebtSignal ? metrics.dti.debtPaymentDollars : null,
    liquidSavings: metrics.runway.liquidDollars,
    monthlyExpenses: metrics.surplus.expenseDollars > 0 ? metrics.surplus.expenseDollars : null,
    runwayMonths: metrics.runway.months,
    earmarkedDownPayment: earmark > 0 ? earmark : home ? centsToDollars(home.savedCents) : null,
    homeTarget: home && home.targetCents > 0 ? centsToDollars(home.targetCents) : null,
  };
}

/**
 * Money Dashboard + linked suggestions. User must confirm.
 * Confirm writes self_report. canVerify stays false.
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
          if (!cancelled) {
            setPayload({ configured: false, items: [], suggestion: null });
            setState("ready");
          }
          return;
        }
        const json = (await res.json()) as PrefillResponse;
        if (cancelled) return;
        setPayload(json);
        setState("ready");
      } catch {
        if (!cancelled) {
          setPayload({ configured: false, items: [], suggestion: null });
          setState("ready");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const ledgerPicture = useMemo(() => pictureFromLedger(earmark), [earmark]);
  const merged = useMemo(
    () => mergeMoneyPictures(ledgerPicture, payload?.suggestion ?? null),
    [ledgerPicture, payload],
  );
  const suggestions = useMemo(() => questionSuggestionsFromMoney(merged), [merged]);
  const dashboard = useMemo(
    () => (ledgerPicture ? observeDashboardPrefill(ledgerPicture) : null),
    [ledgerPicture],
  );
  const hasSuggestion =
    suggestions.fin_income != null ||
    suggestions.fin_debt_payments != null ||
    suggestions.fin_savings_total != null ||
    suggestions.fin_emergency_fund != null ||
    suggestions.fin_down_payment != null;

  if (state === "loading") return null;

  function confirm() {
    if (!hasSuggestion) {
      setError("Nothing stored on Money to use as a suggestion.");
      return;
    }
    const next = buildConfirmedFinancePrefill({
      lookbackDays: payload?.suggestion?.lookbackDays ?? 0,
      suggestions,
      earmarkedDownPayment: earmark,
    });
    saveConfirmedFinancePrefill(next);
    setConfirmed(next);
    setError(null);
  }

  if (!hasSuggestion && payload?.configured === false) {
    return (
      <p className="text-xs leading-relaxed text-dim/70">
        Bank link is coming soon. Your score stays on self-report.
      </p>
    );
  }

  if (!hasSuggestion && !payload?.suggestion) return null;

  const items = payload?.items ?? [];

  return (
    <div className="rounded-xl border border-slate-surface/60 bg-navy/20 px-4 py-3">
      <p className="text-3xs font-semibold uppercase tracking-[0.12em] text-dim">
        Money suggestions
      </p>
      <p className="mt-1 text-xs text-dim/80">
        Review these before a retake. Confirm still writes self-report.
      </p>
      {items.length > 0 && (
        <p className="mt-1 text-xs text-dim">
          Linked: {items.map((item) => item.institutionName ?? "Bank").join(", ")}
          {payload?.partial ? " — partial." : "."}
        </p>
      )}
      {payload?.message && <p className="mt-1 text-xs text-dim/80">{payload.message}</p>}
      {hasSuggestion && (
        <ul className="mt-2 space-y-1 text-xs text-light">
          {suggestions.fin_income != null && <li>Income {money(suggestions.fin_income)}/mo</li>}
          {suggestions.fin_debt_payments != null && (
            <li>Debt payments {money(suggestions.fin_debt_payments)}/mo</li>
          )}
          {suggestions.fin_savings_total != null && (
            <li>Liquid savings {money(suggestions.fin_savings_total)}</li>
          )}
          {suggestions.fin_emergency_fund != null && (
            <li>Emergency fund choice from runway</li>
          )}
          {suggestions.fin_down_payment != null && (
            <li>Down payment choice from earmark</li>
          )}
        </ul>
      )}
      {dashboard?.canVerify === false && (
        <p className="mt-2 text-xs text-dim/70">
          Suggestions stay self-report. Transfers still count as income, so nothing is marked
          verified.
        </p>
      )}
      {hasSuggestion && (
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
