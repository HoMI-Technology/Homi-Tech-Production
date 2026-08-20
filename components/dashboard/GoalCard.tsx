"use client";

import { useEffect, useState } from "react";
import { MoneyField } from "@/components/ui/MoneyField";
import { COLORS } from "@/lib/brand";
import { formatCurrency } from "@/lib/tools/format";
import { goalProgress, goalProjection } from "@/lib/dashboard/financial-position";
import { loadFinanceState, netCashFlow, pullFinanceState } from "@/lib/finance/store";

/**
 * Down-payment goal card for the dashboard's Financial position section.
 * Progress reads liquid savings from the latest synced snapshot when the
 * server provides it; otherwise it falls back to the manual Finance
 * dashboard numbers (localStorage "homi:finance") after mount — the same
 * precedence the simulator uses. The monthly-pace projection renders only
 * when real cash-flow data exists; it is never guessed.
 */

export interface GoalData {
  label: string | null;
  target_amount: number;
  target_date: string | null;
}

/** Goal supplied from the v2 budget ledger (finance_savings_goals). */
export interface LedgerGoal {
  /**
   * Which goal this card is editing. Since #184 a user can hold several active
   * goals, so save and remove name their row rather than letting the server
   * infer it — an inferred write is how a down-payment edit reaches somebody's
   * emergency reserve. Optional because the response shape predates the id.
   */
  id?: string;
  name: string;
  targetAmountCents: number;
  currentAmountCents: number;
  targetDate: string | null;
}

type SavingsSource = "ledger" | "synced" | "manual" | null;

export function GoalCard({
  goal: initialGoal,
  ledgerGoal: initialLedgerGoal,
  liquidSavings,
  monthlyNetCashFlow,
}: {
  goal?: GoalData | null;
  /** Goal from the ledger; takes display precedence over the legacy goal. */
  ledgerGoal?: LedgerGoal | null;
  /** From the latest plaid_sync snapshot or the ledger goal balance; null when neither exists. */
  liquidSavings: number | null;
  /** From the latest snapshot's net_cash_flow or the ledger; null when no data exists. */
  monthlyNetCashFlow: number | null;
}) {
  const [legacyGoal, setLegacyGoal] = useState<GoalData | null>(initialGoal ?? null);
  const [ledgerGoal, setLedgerGoal] = useState<LedgerGoal | null>(initialLedgerGoal ?? null);
  const [editing, setEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(liquidSavings);
  const [flow, setFlow] = useState<number | null>(monthlyNetCashFlow);
  const [source, setSource] = useState<SavingsSource>(
    initialLedgerGoal ? "ledger" : liquidSavings !== null ? "synced" : null,
  );

  // Sync server props when the parent re-renders.
  useEffect(() => {
    setLedgerGoal(initialLedgerGoal ?? null);
  }, [initialLedgerGoal]);

  useEffect(() => {
    setSaved(liquidSavings);
  }, [liquidSavings]);

  // Manual fallback — only when no synced snapshot or ledger goal supplied the numbers.
  // Local copy renders immediately; the background pull then adopts the
  // freshest cross-device copy (T2.6), so a goal set up on a laptop shows
  // real progress on a phone that never opened /finance.
  useEffect(() => {
    if (liquidSavings !== null) return;
    try {
      if (window.localStorage.getItem("homi:finance") !== null) {
        const manual = loadFinanceState();
        setSaved(manual.liquidSavings);
        setFlow(netCashFlow(manual));
        setSource("manual");
      }
    } catch {
      return;
    }
    let cancelled = false;
    void pullFinanceState().then((remote) => {
      if (cancelled || !remote) return;
      setSaved(remote.liquidSavings);
      setFlow(netCashFlow(remote));
      setSource("manual");
    });
    return () => {
      cancelled = true;
    };
  }, [liquidSavings]);

  const displayGoal: GoalData | null = ledgerGoal
    ? {
        label: ledgerGoal.name,
        target_amount: ledgerGoal.targetAmountCents / 100,
        target_date: ledgerGoal.targetDate,
      }
    : legacyGoal;

  function startEditing() {
    if (ledgerGoal) {
      setTargetAmount(ledgerGoal.targetAmountCents / 100);
      setName(ledgerGoal.name);
    } else if (legacyGoal) {
      setTargetAmount(legacyGoal.target_amount);
      setName(legacyGoal.label ?? "");
    } else {
      setTargetAmount(null);
      setName("");
    }
    setEditing(true);
  }

  async function save() {
    if (targetAmount === null || targetAmount <= 0) {
      setNote("Enter a target amount greater than zero.");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/finance/savings-goals", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: ledgerGoal?.id ?? null,
          name: name.trim() || "Down payment",
          goal_type: "home",
          target_amount: targetAmount,
          target_date: displayGoal?.target_date ?? null,
          current_amount: ledgerGoal ? ledgerGoal.currentAmountCents / 100 : 0,
        }),
      });
      const data = (await res.json()) as { goal?: LedgerGoal; error?: string };
      if (!res.ok || !data.goal) {
        setNote(data.error ?? "Could not save your goal. Try again in a moment.");
      } else {
        setLedgerGoal(data.goal);
        setLegacyGoal(null);
        setEditing(false);
      }
    } catch {
      setNote("Could not save your goal. Try again in a moment.");
    }
    setBusy(false);
  }

  async function remove() {
    setBusy(true);
    setNote(null);
    try {
      // Name the goal being removed. Without an id the server falls back to the
      // oldest active home goal, which is this card's goal in the common case
      // but not a guarantee worth relying on once several exist.
      const query = ledgerGoal?.id ? `?id=${encodeURIComponent(ledgerGoal.id)}` : "?goal_type=home";
      const res = await fetch(`/api/finance/savings-goals${query}`, { method: "DELETE" });
      if (res.ok) {
        setLedgerGoal(null);
        setLegacyGoal(null);
        setTargetAmount(null);
        setName("");
        setEditing(false);
      } else {
        const data = (await res.json()) as { error?: string };
        setNote(data.error ?? "Could not remove your goal. Try again in a moment.");
      }
    } catch {
      setNote("Could not remove your goal. Try again in a moment.");
    }
    setBusy(false);
  }

  const targetAmountDollars = displayGoal?.target_amount ?? 0;
  const progress = displayGoal ? goalProgress(targetAmountDollars, saved ?? 0) : null;
  // Projection only when real cash flow exists — manual numbers get the
  // pace line too, but labeled as manual. No data → no projection at all.
  const projection =
    displayGoal && saved !== null ? goalProjection(targetAmountDollars, saved, flow) : null;

  return (
    <div className="glass glass-hover sweep relative overflow-hidden p-6">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, ${COLORS.yellow}88, transparent)`,
        }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Down-payment goal</p>
          {displayGoal && !editing && (
            <p className="mt-1 text-sm text-dim">
              {displayGoal.label ?? "Your target, your pace."}
            </p>
          )}
        </div>
        {displayGoal && !editing && (
          <button
            className="btn btn-ghost btn-xs text-sm"
            onClick={() => {
              startEditing();
            }}
          >
            Edit
          </button>
        )}
      </div>

      {note && (
        <p className="mt-3 text-sm text-crimson" role="status">
          {note}
        </p>
      )}

      {editing || !displayGoal ? (
        <div className="mt-4 space-y-4">
          {!displayGoal && (
            <p className="text-sm leading-relaxed text-dim">
              Name the number you&apos;re saving toward and the dashboard tracks your progress
              against it.
            </p>
          )}
          <MoneyField
            label="Target amount"
            value={targetAmount}
            onChange={setTargetAmount}
            onEnter={save}
          />
          <div>
            <label htmlFor="goal-name" className="mb-2 block text-base font-medium text-light">
              Name <span className="text-dim">(optional)</span>
            </label>
            <input
              id="goal-name"
              className="input"
              maxLength={80}
              placeholder="e.g. 20% on a starter home"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save goal"}
            </button>
            {displayGoal && (
              <>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-ghost btn-sm text-crimson"
                  onClick={remove}
                  disabled={busy}
                >
                  Remove goal
                </button>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <p className="num-money score-numeral text-2xl font-bold text-light">
              {formatCurrency(progress?.saved ?? 0)}
              <span className="num-money ml-1 text-sm font-medium text-dim">
                of {formatCurrency(displayGoal.target_amount)}
              </span>
            </p>
            <span className="num score-numeral text-sm text-yellow">
              {Math.round((progress?.ratio ?? 0) * 100)}%
            </span>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-slate-surface/60"
            role="progressbar"
            aria-valuenow={Math.round((progress?.ratio ?? 0) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${(progress?.ratio ?? 0) * 100}%`,
                background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.yellow})`,
              }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-dim">
            {source === "ledger" && "Savings read from your budget ledger."}
            {source === "synced" && "Savings read from your synced bank balances."}
            {source === "manual" && "Savings read from your manual Money Stand numbers."}
            {source === null &&
              "No savings figure yet — connect a bank or enter your numbers on Money Stand."}
          </p>
          {progress && progress.remaining === 0 ? (
            <p className="mt-2 text-sm text-emerald">
              Target reached. Recheck your readiness when you&apos;re set.
            </p>
          ) : projection ? (
            <p className="mt-2 text-sm text-light">
              At your current cash flow, target reached ~{projection.label}.
              <span className="ml-1 text-xs text-dim">
                {source === "ledger"
                  ? "Pace based on your budget ledger."
                  : source === "synced"
                    ? "Pace based on recently synced activity."
                    : "Pace based on your manual numbers."}
              </span>
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
