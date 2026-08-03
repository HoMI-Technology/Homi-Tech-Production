"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { MoneyField } from "@/components/ui/MoneyField";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { StatTile } from "@/components/ui/StatTile";
import { COLORS } from "@/lib/brand";
import {
  categoryActuals,
  projectGoal,
  summarizePeriod,
  type CategoryActual,
} from "@/lib/finance/calculations";
import type {
  BudgetPeriod,
  FinanceTransaction,
  SavingsGoal,
  TransactionType,
} from "@/lib/finance/ledger";
import {
  addManualTransaction,
  ensurePeriodFor,
  hasSavedBudgetLedger,
  loadBudgetLedger,
  monthBoundsFor,
  saveBudgetLedger,
  setGoalReserve,
  setPlannedAllocation,
  softDeleteTransaction,
  todayDateOnly,
  upsertGoal,
  type BudgetLedgerState,
  type GoalInput,
} from "@/lib/finance/local-ledger";
import {
  centsToDollars,
  dollarsToCents,
  formatCentsUSD,
} from "@/lib/finance/money";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

const TX_TYPES: { value: TransactionType; label: string }[] = [
  { value: "expense", label: "Expense" },
  { value: "income", label: "Income" },
  { value: "refund", label: "Refund" },
  { value: "transfer", label: "Transfer" },
  { value: "adjustment", label: "Adjustment" },
];

const GOAL_TYPES: { value: SavingsGoal["goalType"]; label: string }[] = [
  { value: "emergency_reserve", label: "Emergency reserve" },
  { value: "home", label: "Home" },
  { value: "vehicle", label: "Vehicle" },
  { value: "education", label: "Education" },
  { value: "family", label: "Family" },
  { value: "travel", label: "Travel" },
  { value: "custom", label: "Custom" },
];

/** "August 2026" from a period's start date, without UTC drift. */
function monthLabel(period: Pick<BudgetPeriod, "periodStart">): string {
  const [y, m] = period.periodStart.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

/* ------------------------------------------------------------------ */
/* Budget tab                                                          */
/* ------------------------------------------------------------------ */

/**
 * Manual local budget: summary cards, plan-vs-actual category bars, a
 * transaction ledger, and one savings goal — all local-first (PR 2).
 * Server sync and imports arrive in later PRs; every number shown here is
 * derived by lib/finance/calculations from the user's own entries.
 */
export function BudgetTab() {
  const [ledger, setLedger] = useState<BudgetLedgerState | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [planOpen, setPlanOpen] = useState(false);
  const [goalOpen, setGoalOpen] = useState(false);

  const today = useMemo(() => todayDateOnly(), []);

  useEffect(() => {
    const stamp = nowIso();
    const loaded = loadBudgetLedger(stamp);
    const ensured = ensurePeriodFor(loaded, todayDateOnly(), stamp);
    setLedger(ensured.state);
    // Only persist the auto-created period when the user already opted in —
    // a first visit must not write seed data it would later present back.
    if (ensured.state !== loaded && hasSavedBudgetLedger()) {
      saveBudgetLedger(ensured.state);
    }
  }, []);

  const commit = useCallback((next: BudgetLedgerState) => {
    setLedger(next);
    saveBudgetLedger(next);
  }, []);

  if (!ledger) return null;

  const bounds = monthBoundsFor(today);
  const period =
    ledger.periods.find(
      (p) => p.periodStart === bounds.periodStart && p.periodEnd === bounds.periodEnd,
    ) ?? null;
  if (!period) return null;

  const totals = summarizePeriod(ledger.transactions, period);
  const rows = categoryActuals(
    ledger.transactions,
    period,
    ledger.allocations.filter((a) => a.budgetPeriodId === period.id),
  );
  const categoryNames = new Map(ledger.categories.map((c) => [c.id, c.name]));
  const aliveTransactions = ledger.transactions
    .filter((tx) => tx.deletedAt === null)
    .sort((a, b) =>
      a.transactionDate === b.transactionDate
        ? b.createdAt.localeCompare(a.createdAt)
        : b.transactionDate.localeCompare(a.transactionDate),
    );

  return (
    <div className="space-y-8">
      <ConfidenceStrip
        label={monthLabel(period)}
        pendingCount={totals.pendingCount}
        uncategorizedCount={totals.uncategorizedCount}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Income"
          value={formatCentsUSD(totals.incomeCents)}
          accent={COLORS.emerald}
          footer="Posted income this month"
        />
        <StatTile
          label="Net expenses"
          value={formatCentsUSD(totals.netExpenseCents)}
          accent={COLORS.amber}
          footer={
            totals.refundCents > 0
              ? `After ${formatCentsUSD(totals.refundCents)} in refunds`
              : "Spending minus refunds"
          }
        />
        <StatTile
          label="Cash remaining"
          value={formatCentsUSD(totals.cashRemainingCents)}
          accent={COLORS.cyan}
          footer="Income − net expenses"
        />
        <StatTile
          label="Free cash"
          value={formatCentsUSD(totals.freeCashCents)}
          accent={COLORS.yellow}
          footer={
            totals.goalReserveCents > 0
              ? `After ${formatCentsUSD(totals.goalReserveCents)} goal reserve`
              : "No goal reserve set this month"
          }
        />
      </div>

      <PlanVsActual
        rows={rows}
        categoryNames={categoryNames}
        onEditPlan={() => setPlanOpen(true)}
      />

      <GoalCard goal={ledger.goal} today={today} onEdit={() => setGoalOpen(true)} />

      <TransactionsSection
        transactions={aliveTransactions}
        categoryNames={categoryNames}
        onAdd={() => setAddOpen(true)}
        onDelete={(id) => commit(softDeleteTransaction(ledger, id, nowIso()))}
      />

      <p className="text-sm text-dim">
        Manual entries only. Missing transactions are not zero spending — these
        totals reflect what you have recorded, and a month in progress is not a
        completed month.
      </p>

      <AddTransactionModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        ledger={ledger}
        today={today}
        onSubmit={(input) => {
          commit(addManualTransaction(ledger, input, nowIso()));
          setAddOpen(false);
        }}
      />
      <EditPlanModal
        open={planOpen}
        onClose={() => setPlanOpen(false)}
        ledger={ledger}
        period={period}
        onSave={(planned, reserveCents) => {
          let next = ledger;
          const stamp = nowIso();
          for (const [categoryId, cents] of planned) {
            next = setPlannedAllocation(next, period.id, categoryId, cents, stamp);
          }
          next = setGoalReserve(next, period.id, reserveCents, stamp);
          commit(next);
          setPlanOpen(false);
        }}
      />
      <GoalModal
        open={goalOpen}
        onClose={() => setGoalOpen(false)}
        goal={ledger.goal}
        onSave={(input) => {
          commit(upsertGoal(ledger, input, nowIso()));
          setGoalOpen(false);
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Confidence strip                                                    */
/* ------------------------------------------------------------------ */

function ConfidenceStrip({
  label,
  pendingCount,
  uncategorizedCount,
}: {
  label: string;
  pendingCount: number;
  uncategorizedCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="rounded-full border border-white/10 px-3 py-1 text-dim">
        {label} · in progress
      </span>
      <span className="rounded-full border border-white/10 px-3 py-1 text-dim">
        Manual entries only
      </span>
      {pendingCount > 0 && (
        <span className="rounded-full border border-white/10 px-3 py-1 text-amber">
          {pendingCount} pending — not counted
        </span>
      )}
      {uncategorizedCount > 0 && (
        <span className="rounded-full border border-white/10 px-3 py-1 text-amber">
          {uncategorizedCount} uncategorized
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Plan vs actual                                                      */
/* ------------------------------------------------------------------ */

function PlanVsActual({
  rows,
  categoryNames,
  onEditPlan,
}: {
  rows: CategoryActual[];
  categoryNames: Map<string, string>;
  onEditPlan: () => void;
}) {
  return (
    <section className="glass p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Plan vs. actual</p>
          <h2 className="mt-1 font-display text-xl text-light">Categories</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onEditPlan}>
          Edit plan
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-dim">
          Nothing planned or spent yet this month. Set category plans, then log
          spending to see planned vs. actual here.
        </p>
      ) : (
        <ul className="mt-5 space-y-4">
          {rows.map((row) => (
            <CategoryBar
              key={row.categoryId ?? "uncategorized"}
              row={row}
              name={
                row.categoryId === null
                  ? "Uncategorized"
                  : categoryNames.get(row.categoryId) ?? "Unknown category"
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CategoryBar({ row, name }: { row: CategoryActual; name: string }) {
  const over =
    row.remainingCents !== null && row.remainingCents < 0;
  const widthPct =
    row.utilization !== null
      ? Math.min(100, Math.round(row.utilization * 100))
      : row.actualCents > 0
        ? 100
        : 0;
  const barClass = over
    ? "bg-verdict-notyet"
    : row.utilization !== null && row.utilization >= 0.85
      ? "bg-verdict-almost"
      : "bg-verdict-ready";

  let detail: string;
  if (row.plannedCents === null) {
    detail = `${formatCentsUSD(row.actualCents, { alwaysCents: true })} · no plan set`;
  } else if (over) {
    detail = `${formatCentsUSD(row.actualCents, { alwaysCents: true })} of ${formatCentsUSD(row.plannedCents)} · over by ${formatCentsUSD(Math.abs(row.remainingCents ?? 0), { alwaysCents: true })}`;
  } else {
    detail = `${formatCentsUSD(row.actualCents, { alwaysCents: true })} of ${formatCentsUSD(row.plannedCents)} · ${formatCentsUSD(row.remainingCents ?? 0, { alwaysCents: true })} remaining`;
  }

  return (
    <li>
      <div className="flex items-baseline justify-between gap-4">
        <span className="text-light">{name}</span>
        <span className="text-sm text-dim">{detail}</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
        role="img"
        aria-label={`${name}: ${detail}`}
      >
        <div
          className={`h-full rounded-full ${row.plannedCents === null ? "bg-white/25" : barClass}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Goal card                                                           */
/* ------------------------------------------------------------------ */

function GoalCard({
  goal,
  today,
  onEdit,
}: {
  goal: SavingsGoal | null;
  today: string;
  onEdit: () => void;
}) {
  if (!goal) {
    return (
      <section className="glass border border-dashed border-white/15 p-5 sm:p-6">
        <p className="eyebrow">Savings goal</p>
        <h2 className="mt-1 font-display text-xl text-light">No goal yet</h2>
        <p className="mt-2 max-w-xl text-dim">
          One goal, tracked honestly: a target, your current balance, and the
          contribution you plan each month. A contribution is money you keep —
          it is never counted as spending.
        </p>
        <button className="btn btn-primary btn-sm mt-4" onClick={onEdit}>
          Set a savings goal
        </button>
      </section>
    );
  }

  const projection = projectGoal(goal, today);
  const pct =
    goal.targetAmountCents > 0
      ? Math.min(
          100,
          Math.round((goal.currentAmountCents / goal.targetAmountCents) * 100),
        )
      : 0;

  let pace: string;
  if (projection.remainingCents === 0) {
    pace = "Target reached.";
  } else if (projection.monthsToTarget !== null) {
    pace = `About ${projection.monthsToTarget} month${projection.monthsToTarget === 1 ? "" : "s"} to go at your planned ${formatCentsUSD(goal.plannedMonthlyContributionCents)}/mo.`;
  } else {
    pace = "No planned contribution yet — add one to see a pace.";
  }

  return (
    <section className="glass p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Savings goal</p>
          <h2 className="mt-1 font-display text-xl text-light">{goal.name}</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onEdit}>
          Edit goal
        </button>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-4">
        <span className="text-2xl text-light">
          {formatCentsUSD(goal.currentAmountCents)}
          <span className="text-base text-dim">
            {" "}
            of {formatCentsUSD(goal.targetAmountCents)}
          </span>
        </span>
        <span className="text-sm text-dim">{pct}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
        role="img"
        aria-label={`Goal progress: ${pct}%`}
      >
        <div
          className="h-full rounded-full bg-verdict-ready"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-3 text-sm text-dim">{pace}</p>
      {projection.requiredMonthlyCents !== null &&
        projection.remainingCents > 0 &&
        goal.targetDate !== null && (
          <p className="mt-1 text-sm text-dim">
            Reaching it by {goal.targetDate} would take about{" "}
            {formatCentsUSD(projection.requiredMonthlyCents)}/mo — something to
            compare against your free cash.
          </p>
        )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Transactions                                                        */
/* ------------------------------------------------------------------ */

const TX_TAG: Record<TransactionType, string | null> = {
  income: null,
  expense: null,
  refund: "Refund",
  transfer: "Transfer · not spending",
  adjustment: "Adjustment",
};

function TransactionsSection({
  transactions,
  categoryNames,
  onAdd,
  onDelete,
}: {
  transactions: FinanceTransaction[];
  categoryNames: Map<string, string>;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  const shown = transactions.slice(0, 25);

  return (
    <section className="glass p-5 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Ledger</p>
          <h2 className="mt-1 font-display text-xl text-light">Transactions</h2>
        </div>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>
          Add transaction
        </button>
      </div>

      {transactions.length === 0 ? (
        <p className="mt-4 max-w-xl text-dim">
          No transactions yet. Log income and spending as it happens — every
          summary number on this tab is derived from these entries, nothing is
          estimated for you.
        </p>
      ) : (
        <>
          <ul className="mt-5 divide-y divide-white/5">
            {shown.map((tx) => (
              <TransactionRow
                key={tx.id}
                tx={tx}
                categoryName={
                  tx.categoryId ? categoryNames.get(tx.categoryId) ?? null : null
                }
                onDelete={() => onDelete(tx.id)}
              />
            ))}
          </ul>
          {transactions.length > shown.length && (
            <p className="mt-3 text-sm text-dim">
              Showing the latest {shown.length} of {transactions.length} entries.
            </p>
          )}
        </>
      )}
    </section>
  );
}

function TransactionRow({
  tx,
  categoryName,
  onDelete,
}: {
  tx: FinanceTransaction;
  categoryName: string | null;
  onDelete: () => void;
}) {
  const amountClass =
    tx.type === "income" || tx.type === "refund"
      ? "text-emerald"
      : tx.type === "expense"
        ? "text-light"
        : "text-dim";
  const sign = tx.type === "income" || tx.type === "refund" ? "+" : tx.type === "expense" ? "−" : "";
  const tag = TX_TAG[tx.type];

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-light">{tx.description}</p>
        <p className="text-sm text-dim">
          {tx.transactionDate}
          {categoryName ? ` · ${categoryName}` : ""}
          {tag ? ` · ${tag}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`tabular-nums ${amountClass}`}>
          {sign}
          {formatCentsUSD(tx.amountCents, { alwaysCents: true })}
        </span>
        <button
          className="btn btn-danger btn-sm"
          onClick={onDelete}
          aria-label={`Delete ${tx.description}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Add-transaction modal                                               */
/* ------------------------------------------------------------------ */

function AddTransactionModal({
  open,
  onClose,
  ledger,
  today,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  ledger: BudgetLedgerState;
  today: string;
  onSubmit: (input: Parameters<typeof addManualTransaction>[1]) => void;
}) {
  const [type, setType] = useState<TransactionType>("expense");
  const [amountDollars, setAmountDollars] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  const showsCategory = type === "expense" || type === "refund" || type === "income";
  const categoryType = type === "income" ? "income" : "expense";
  const categories = ledger.categories.filter(
    (c) => c.categoryType === categoryType && !c.isArchived,
  );

  function submit() {
    if (amountDollars === null || amountDollars <= 0) {
      setError("Enter an amount above zero.");
      return;
    }
    if (!description.trim()) {
      setError("Add a short description.");
      return;
    }
    if (type === "expense" && !categoryId) {
      setError("Expenses need a category.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      setError("Pick a valid date.");
      return;
    }
    try {
      onSubmit({
        type,
        amountCents: dollarsToCents(amountDollars),
        description,
        categoryId: showsCategory && categoryId ? categoryId : null,
        transactionDate: date,
      });
      setAmountDollars(null);
      setDescription("");
      setCategoryId("");
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save that entry.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="Add transaction">
      <h2 className="font-display text-xl text-light">Add transaction</h2>

      <div className="mt-4 space-y-4">
        <SegmentedControl
          options={TX_TYPES}
          value={type}
          onChange={(next) => {
            setType(next);
            setCategoryId("");
          }}
          ariaLabel="Transaction type"
        />

        <MoneyField
          label="Amount"
          value={amountDollars}
          onChange={setAmountDollars}
          onEnter={submit}
        />

        <div>
          <label htmlFor="budget-tx-description" className="mb-2 block text-base font-medium text-light">
            Description
          </label>
          <input
            id="budget-tx-description"
            type="text"
            className="input"
            maxLength={160}
            value={description}
            placeholder={type === "income" ? "Paycheck" : "Groceries at the co-op"}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {showsCategory && (
          <div>
            <label htmlFor="budget-tx-category" className="mb-2 block text-base font-medium text-light">
              Category{type === "expense" ? "" : " (optional)"}
            </label>
            <select
              id="budget-tx-category"
              className="input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">
                {type === "expense" ? "Choose a category…" : "Uncategorized"}
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="budget-tx-date" className="mb-2 block text-base font-medium text-light">
            Date
          </label>
          <input
            id="budget-tx-date"
            type="date"
            className="input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-crimson">{error}</p>}

        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={submit}>
            Save entry
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Edit-plan modal                                                     */
/* ------------------------------------------------------------------ */

function EditPlanModal({
  open,
  onClose,
  ledger,
  period,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  ledger: BudgetLedgerState;
  period: BudgetPeriod;
  onSave: (planned: Map<string, number>, reserveCents: number) => void;
}) {
  const expenseCategories = ledger.categories.filter(
    (c) => c.categoryType === "expense" && !c.isArchived,
  );

  // Drafts are dollars (MoneyField's unit); converted to cents on save only.
  const [draft, setDraft] = useState<Map<string, number | null>>(new Map());
  const [reserveDollars, setReserveDollars] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = new Map<string, number | null>();
    for (const c of expenseCategories) {
      const allocation = ledger.allocations.find(
        (a) => a.budgetPeriodId === period.id && a.categoryId === c.id,
      );
      next.set(c.id, allocation ? centsToDollars(allocation.plannedCents) : null);
    }
    setDraft(next);
    setReserveDollars(
      period.goalReserveCents > 0 ? centsToDollars(period.goalReserveCents) : null,
    );
    // Rebuilding from the ledger on every open is the point; the category
    // list is derived from the same ledger snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function save() {
    const planned = new Map<string, number>();
    for (const [categoryId, dollars] of draft) {
      planned.set(categoryId, dollars === null ? 0 : dollarsToCents(dollars));
    }
    onSave(planned, reserveDollars === null ? 0 : dollarsToCents(reserveDollars));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      label="Edit budget plan"
      panelClassName="glass w-full max-w-lg p-6 sm:p-8 max-h-[85vh] overflow-y-auto"
    >
      <h2 className="font-display text-xl text-light">
        Plan for {monthLabel(period)}
      </h2>
      <p className="mt-2 text-sm text-dim">
        Planned amounts per category. Leave a category empty for no plan —
        spending there is shown as unplanned, not judged.
      </p>

      <div className="mt-4 space-y-3">
        {expenseCategories.map((c) => (
          <MoneyField
            key={c.id}
            label={c.name}
            value={draft.get(c.id) ?? null}
            onChange={(v) => setDraft((prev) => new Map(prev).set(c.id, v))}
          />
        ))}
      </div>

      <div className="mt-6 border-t border-white/10 pt-4">
        <MoneyField
          label="Goal reserve"
          hint="Cash you are intentionally setting aside for goals this month. It reduces free cash, not spending."
          value={reserveDollars}
          onChange={setReserveDollars}
        />
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary btn-sm" onClick={save}>
          Save plan
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Goal modal                                                          */
/* ------------------------------------------------------------------ */

function GoalModal({
  open,
  onClose,
  goal,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  goal: SavingsGoal | null;
  onSave: (input: GoalInput) => void;
}) {
  const [name, setName] = useState("");
  const [goalType, setGoalType] = useState<SavingsGoal["goalType"]>("emergency_reserve");
  const [targetDollars, setTargetDollars] = useState<number | null>(null);
  const [currentDollars, setCurrentDollars] = useState<number | null>(null);
  const [monthlyDollars, setMonthlyDollars] = useState<number | null>(null);
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName(goal?.name ?? "");
    setGoalType(goal?.goalType ?? "emergency_reserve");
    setTargetDollars(goal ? centsToDollars(goal.targetAmountCents) : null);
    setCurrentDollars(goal ? centsToDollars(goal.currentAmountCents) : null);
    setMonthlyDollars(
      goal ? centsToDollars(goal.plannedMonthlyContributionCents) : null,
    );
    setTargetDate(goal?.targetDate ?? "");
    setError(null);
  }, [open, goal]);

  function save() {
    if (!name.trim()) {
      setError("Name the goal.");
      return;
    }
    if (targetDollars === null || targetDollars <= 0) {
      setError("Set a target above zero.");
      return;
    }
    try {
      onSave({
        name,
        goalType,
        targetAmountCents: dollarsToCents(targetDollars),
        currentAmountCents: dollarsToCents(currentDollars ?? 0),
        plannedMonthlyContributionCents: dollarsToCents(monthlyDollars ?? 0),
        targetDate: /^\d{4}-\d{2}-\d{2}$/.test(targetDate) ? targetDate : null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the goal.");
    }
  }

  return (
    <Modal open={open} onClose={onClose} label="Savings goal">
      <h2 className="font-display text-xl text-light">
        {goal ? "Edit savings goal" : "Set a savings goal"}
      </h2>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="budget-goal-name" className="mb-2 block text-base font-medium text-light">
            Name
          </label>
          <input
            id="budget-goal-name"
            type="text"
            className="input"
            maxLength={80}
            value={name}
            placeholder="Emergency reserve"
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="budget-goal-type" className="mb-2 block text-base font-medium text-light">
            Type
          </label>
          <select
            id="budget-goal-type"
            className="input"
            value={goalType}
            onChange={(e) => setGoalType(e.target.value as SavingsGoal["goalType"])}
          >
            {GOAL_TYPES.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        <MoneyField label="Target amount" value={targetDollars} onChange={setTargetDollars} />
        <MoneyField
          label="Current balance"
          hint="What you have set aside for this goal today."
          value={currentDollars}
          onChange={setCurrentDollars}
        />
        <MoneyField
          label="Planned monthly contribution"
          value={monthlyDollars}
          onChange={setMonthlyDollars}
        />

        <div>
          <label htmlFor="budget-goal-date" className="mb-2 block text-base font-medium text-light">
            Target date (optional)
          </label>
          <input
            id="budget-goal-date"
            type="date"
            className="input"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-crimson">{error}</p>}

        <div className="flex justify-end gap-3">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary btn-sm" onClick={save}>
            Save goal
          </button>
        </div>
      </div>
    </Modal>
  );
}
