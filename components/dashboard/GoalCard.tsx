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

type SavingsSource = "synced" | "manual" | null;

export function GoalCard({
  goal: initialGoal,
  liquidSavings,
  monthlyNetCashFlow,
}: {
  goal: GoalData | null;
  /** From the latest plaid_sync snapshot; null when no snapshot exists. */
  liquidSavings: number | null;
  /** From the latest snapshot's net_cash_flow; null when no snapshot exists. */
  monthlyNetCashFlow: number | null;
}) {
  const [goal, setGoal] = useState<GoalData | null>(initialGoal);
  const [editing, setEditing] = useState(false);
  const [targetAmount, setTargetAmount] = useState<number | null>(initialGoal?.target_amount ?? null);
  const [label, setLabel] = useState(initialGoal?.label ?? "");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [saved, setSaved] = useState<number | null>(liquidSavings);
  const [flow, setFlow] = useState<number | null>(monthlyNetCashFlow);
  const [source, setSource] = useState<SavingsSource>(liquidSavings !== null ? "synced" : null);

  // Manual fallback — only when no synced snapshot supplied the numbers.
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

  async function save() {
    if (targetAmount === null || targetAmount <= 0) {
      setNote("Enter a target amount greater than zero.");
      return;
    }
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch("/api/goals", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target_amount: targetAmount, label: label.trim() || null }),
      });
      const data = (await res.json()) as { goal?: GoalData & { target_amount: number | string }; error?: string };
      if (!res.ok || !data.goal) {
        setNote(data.error ?? "Could not save your goal. Try again in a moment.");
      } else {
        setGoal({ ...data.goal, target_amount: Number(data.goal.target_amount) });
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
      const res = await fetch("/api/goals", { method: "DELETE" });
      if (res.ok) {
        setGoal(null);
        setTargetAmount(null);
        setLabel("");
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

  const progress = goal ? goalProgress(goal.target_amount, saved ?? 0) : null;
  // Projection only when synced cash flow exists — manual numbers get the
  // pace line too, but labeled as manual. No data → no projection at all.
  const projection = goal && saved !== null ? goalProjection(goal.target_amount, saved, flow) : null;

  return (
    <div className="glass glass-hover sweep relative overflow-hidden p-6">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${COLORS.yellow}88, transparent)` }}
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Down-payment goal</p>
          {goal && !editing && (
            <p className="mt-1 text-sm text-dim">{goal.label ?? "Your target, your pace."}</p>
          )}
        </div>
        {goal && !editing && (
          <button
            className="btn btn-ghost !px-3 !py-1.5 text-sm"
            onClick={() => {
              setTargetAmount(goal.target_amount);
              setLabel(goal.label ?? "");
              setEditing(true);
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

      {editing || !goal ? (
        <div className="mt-4 space-y-4">
          {!goal && (
            <p className="text-sm leading-relaxed text-dim">
              Name the number you&apos;re saving toward and the dashboard tracks your progress against it.
            </p>
          )}
          <MoneyField label="Target amount" value={targetAmount} onChange={setTargetAmount} onEnter={save} />
          <div>
            <label htmlFor="goal-label" className="mb-2 block text-base font-medium text-light">
              Label <span className="text-dim">(optional)</span>
            </label>
            <input
              id="goal-label"
              className="input"
              maxLength={80}
              placeholder="e.g. 20% on a starter home"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-primary btn-sm" onClick={save} disabled={busy}>
              {busy ? "Saving…" : "Save goal"}
            </button>
            {goal && (
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
            <p className="score-numeral text-2xl font-bold text-light">
              {formatCurrency(progress?.saved ?? 0)}
              <span className="ml-1 text-sm font-medium text-dim">of {formatCurrency(goal.target_amount)}</span>
            </p>
            <span className="score-numeral text-sm text-yellow">
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
            {source === "synced" && "Savings read from your synced bank balances."}
            {source === "manual" && "Savings read from your manual Finance dashboard numbers."}
            {source === null &&
              "No savings figure yet — connect a bank or enter your numbers on the Finance dashboard."}
          </p>
          {progress && progress.remaining === 0 ? (
            <p className="mt-2 text-sm text-emerald">Target reached. Recheck your readiness when you&apos;re set.</p>
          ) : projection ? (
            <p className="mt-2 text-sm text-light">
              At your current cash flow, target reached ~{projection.label}.
              <span className="ml-1 text-xs text-dim">
                {source === "synced"
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
