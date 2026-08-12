/**
 * Track · Goals — several savings goals, projected.
 *
 * The ledger stored one goal until the multi-goal migration, so there was
 * nowhere to see two side by side. This is that surface: totals across the set,
 * how the monthly contribution splits, and each goal with its own projection.
 *
 * Reads the budget ledger directly (mount-only, like useCfm) because goals live
 * in the ledger rather than the planner store. Writes go back through
 * saveBudgetLedger, which reports failure — Safari private mode rejects writes
 * outright — and that failure is surfaced rather than swallowed.
 *
 * Arithmetic lives in goals-derive.ts; the rulings about what a set of goals
 * means live in lib/finance/goal-semantics.ts. This file renders.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Target, Trash2, TriangleAlert } from "lucide-react";
import {
  archiveGoal,
  loadBudgetLedger,
  saveBudgetLedger,
  upsertGoal,
  type BudgetLedgerState,
} from "@/lib/finance/local-ledger";
import type { SavingsGoal } from "@/lib/finance/ledger";
import { centsToDollars, dollarsToCents } from "@/lib/finance/money";
import { formatCurrency } from "@/lib/tools/format";
import { COLORS } from "@/lib/brand";
import {
  contributionSplit,
  goalRows,
  goalTotals,
  type GoalRow,
} from "@/components/planner/goals/goals-derive";

const GOAL_TYPES: { value: SavingsGoal["goalType"]; label: string }[] = [
  { value: "emergency_reserve", label: "Emergency reserve" },
  { value: "home", label: "Home" },
  { value: "vehicle", label: "Vehicle" },
  { value: "education", label: "Education" },
  { value: "family", label: "Family" },
  { value: "travel", label: "Travel" },
  { value: "custom", label: "Something else" },
];

/** Distinct accents so the split bar and the cards agree at a glance. */
const SLICE_COLORS = [COLORS.cyan, COLORS.emerald, COLORS.amber, COLORS.yellow, COLORS.crimson];

interface Draft {
  id?: string;
  name: string;
  goalType: SavingsGoal["goalType"];
  target: number;
  current: number;
  monthly: number;
  targetDate: string;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  goalType: "emergency_reserve",
  target: 0,
  current: 0,
  monthly: 0,
  targetDate: "",
};

export function GoalsCommand() {
  const [ledger, setLedger] = useState<BudgetLedgerState | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  // Mount-only read: SSR and first paint render the same empty markup.
  useEffect(() => {
    setLedger(loadBudgetLedger(new Date().toISOString()));
  }, []);

  const commit = useCallback((next: BudgetLedgerState) => {
    setLedger(next);
    setSaveFailed(!saveBudgetLedger(next));
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const goals = useMemo(() => ledger?.goals ?? [], [ledger]);
  const rows = useMemo(() => goalRows(goals, today), [goals, today]);
  const totals = useMemo(() => goalTotals(goals), [goals]);
  const split = useMemo(() => contributionSplit(goals), [goals]);

  function save() {
    if (!draft || !ledger) return;
    const targetCents = dollarsToCents(draft.target);
    if (targetCents <= 0) return;

    commit(
      upsertGoal(
        ledger,
        {
          id: draft.id,
          name: draft.name.trim() || "Savings goal",
          goalType: draft.goalType,
          targetAmountCents: targetCents,
          currentAmountCents: dollarsToCents(Math.max(0, draft.current)),
          plannedMonthlyContributionCents: dollarsToCents(Math.max(0, draft.monthly)),
          targetDate: draft.targetDate || null,
        },
        new Date().toISOString(),
      ),
    );
    setDraft(null);
  }

  if (!ledger) {
    return <p className="text-sm text-dim">Loading goals…</p>;
  }

  return (
    <section aria-label="Savings goals">
      {saveFailed && (
        <p className="mb-4 rounded-xl border border-amber/30 bg-amber/[0.06] px-3 py-2 text-sm text-amber">
          Your browser refused to save this. Private browsing blocks storage — changes will be lost
          when you close the tab.
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Total saved"
          value={formatCurrency(centsToDollars(totals.savedCents))}
          accent={COLORS.emerald}
        />
        <Tile label="Total target" value={formatCurrency(centsToDollars(totals.targetCents))} />
        <Tile
          label="Funded overall"
          value={totals.count > 0 ? `${totals.pct}%` : "—"}
          hint={
            totals.count > 0
              ? `across ${totals.count} goal${totals.count === 1 ? "" : "s"}`
              : undefined
          }
        />
        <Tile
          label="Monthly"
          value={formatCurrency(centsToDollars(totals.monthlyContributionCents))}
          hint="planned contributions"
        />
      </div>

      {split.length > 0 && (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <p className="eyebrow text-dim">Contribution split</p>
          <div className="mt-2 flex h-2 overflow-hidden rounded-full" role="presentation">
            {split.map((s, i) => (
              <span
                key={s.goalId}
                style={{
                  width: `${s.pct}%`,
                  backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length],
                }}
              />
            ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {split.map((s, i) => (
              <li key={s.goalId} className="flex items-center gap-1.5 text-xs text-dim">
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
                />
                {s.name} · {formatCurrency(centsToDollars(s.cents))}/mo
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <h3 className="type-h4">Your goals</h3>
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
          className="inline-flex items-center gap-1.5 rounded-xl border border-cyan/30 bg-cyan/[0.08] px-3 py-2 text-sm font-medium text-cyan transition-colors hover:bg-cyan/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          <Plus size={14} aria-hidden />
          New goal
        </button>
      </div>

      {draft && (
        <GoalForm draft={draft} onChange={setDraft} onSave={save} onCancel={() => setDraft(null)} />
      )}

      {rows.length === 0 && !draft ? (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-8 text-center">
          <Target size={20} aria-hidden className="mx-auto text-dim" />
          <p className="mt-2 text-sm text-dim">
            No goals yet. Add one and HōMI will project it against your cash flow.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {rows.map((row, i) => (
            <GoalCardRow
              key={row.goal.id}
              row={row}
              accent={SLICE_COLORS[i % SLICE_COLORS.length]}
              onEdit={() =>
                setDraft({
                  id: row.goal.id,
                  name: row.goal.name,
                  goalType: row.goal.goalType,
                  target: centsToDollars(row.goal.targetAmountCents),
                  current: centsToDollars(row.goal.currentAmountCents),
                  monthly: centsToDollars(row.goal.plannedMonthlyContributionCents),
                  targetDate: row.goal.targetDate ?? "",
                })
              }
              onArchive={() => commit(archiveGoal(ledger, new Date().toISOString(), row.goal.id))}
            />
          ))}
        </ul>
      )}

      <p className="mt-6 text-xs leading-relaxed text-dim/70">
        Projections assume the planned monthly contribution continues unchanged. Educational
        guidance only.
      </p>
    </section>
  );
}

function GoalCardRow({
  row,
  accent,
  onEdit,
  onArchive,
}: {
  row: GoalRow;
  accent: string;
  onEdit: () => void;
  onArchive: () => void;
}) {
  const { goal, projection, pct, funded, behind } = row;

  return (
    <li className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-light">{goal.name}</p>
          <p className="eyebrow text-dim">
            {GOAL_TYPES.find((t) => t.value === goal.goalType)?.label ?? goal.goalType}
          </p>
        </div>
        <p className="num-money score-numeral text-sm text-light">
          {formatCurrency(centsToDollars(goal.currentAmountCents))}
          <span className="num-money text-dim">
            {" / "}
            {formatCurrency(centsToDollars(goal.targetAmountCents))}
          </span>
        </p>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <span
          className="block h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: funded ? COLORS.emerald : accent }}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-dim">
        <span className="num score-numeral">{pct}% funded</span>
        {funded ? (
          <span style={{ color: COLORS.emerald }}>Funded</span>
        ) : projection.monthsToTarget !== null ? (
          <span>
            <span className="num score-numeral">{projection.monthsToTarget}</span> month
            {projection.monthsToTarget === 1 ? "" : "s"} at the planned pace
          </span>
        ) : (
          <span>No contribution set — no projection</span>
        )}
        {behind && projection.requiredMonthlyCents !== null && (
          <span className="inline-flex items-center gap-1" style={{ color: COLORS.amber }}>
            <TriangleAlert size={12} aria-hidden />
            Needs {formatCurrency(centsToDollars(projection.requiredMonthlyCents))}/mo to hit{" "}
            {goal.targetDate}
          </span>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-dim transition-colors hover:border-cyan/30 hover:text-light"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onArchive}
          aria-label={`Archive ${goal.name}`}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] px-2.5 py-1.5 text-xs text-dim transition-colors hover:border-crimson/30 hover:text-crimson"
        >
          <Trash2 size={12} aria-hidden />
          Archive
        </button>
      </div>
    </li>
  );
}

function GoalForm({
  draft,
  onChange,
  onSave,
  onCancel,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="mt-4 rounded-xl border border-cyan/20 bg-cyan/[0.04] p-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSave();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Name">
          <input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            placeholder="House deposit"
            className="w-full bg-transparent text-sm text-light outline-none"
          />
        </Field>
        <Field label="Type">
          <select
            value={draft.goalType}
            onChange={(e) =>
              onChange({ ...draft, goalType: e.target.value as SavingsGoal["goalType"] })
            }
            className="w-full bg-transparent text-sm text-light outline-none"
          >
            {GOAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Target">
          <NumberInput value={draft.target} onChange={(target) => onChange({ ...draft, target })} />
        </Field>
        <Field label="Saved so far">
          <NumberInput
            value={draft.current}
            onChange={(current) => onChange({ ...draft, current })}
          />
        </Field>
        <Field label="Monthly contribution">
          <NumberInput
            value={draft.monthly}
            onChange={(monthly) => onChange({ ...draft, monthly })}
          />
        </Field>
        <Field label="Target date (optional)">
          <input
            type="date"
            value={draft.targetDate}
            onChange={(e) => onChange({ ...draft, targetDate: e.target.value })}
            className="w-full bg-transparent text-sm text-light outline-none"
          />
        </Field>
      </div>

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={draft.target <= 0}
          className="rounded-xl bg-cyan/15 px-3 py-2 text-sm font-medium text-cyan transition-colors hover:bg-cyan/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {draft.id ? "Save changes" : "Add goal"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-dim transition-colors hover:text-light"
        >
          Cancel
        </button>
        {draft.target <= 0 && (
          <span className="self-center text-xs text-dim">A target above zero is required.</span>
        )}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow text-dim">{label}</span>
      <span className="rounded-xl border border-white/[0.08] bg-navy/40 px-3 py-2 focus-within:border-cyan/40">
        {children}
      </span>
    </label>
  );
}

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="score-numeral text-sm text-dim">$</span>
      <input
        type="number"
        min={0}
        step={100}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="num-money score-numeral w-full bg-transparent text-sm text-light outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
      />
    </span>
  );
}

function Tile({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <p className="eyebrow text-dim">{label}</p>
      <p
        className="num score-numeral mt-1.5 text-lg text-light"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-dim">{hint}</p>}
    </div>
  );
}
