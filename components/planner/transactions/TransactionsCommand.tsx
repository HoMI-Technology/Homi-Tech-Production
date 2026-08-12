/**
 * Track · Transactions — the searchable ledger list.
 *
 * Production's transaction UX was calendar-first only: to find something you
 * had to know roughly when it happened, and there was no way to act on several
 * rows at once. This is the list view — search, filter, sort, multi-select,
 * bulk recategorise and bulk delete.
 *
 * All derivation lives in transactions-derive.ts so the behaviour is unit
 * tested; this file is presentation and store wiring only.
 */

"use client";

import { useMemo, useState } from "react";
import { Search, Trash2, X, ArrowUpDown } from "lucide-react";
import { usePlannerStore } from "@/lib/planner/store";
import { categoryLabel } from "@/lib/planner/calendar";
import { formatCurrency } from "@/lib/tools/format";
import { COLORS } from "@/lib/brand";
import type { CategoryId, TransactionType } from "@/lib/planner/types";
import EmptyState from "@/components/planner/ui/EmptyState";
import {
  DEFAULT_FILTER,
  filterTransactions,
  isFiltered,
  summarize,
  type SortKey,
} from "@/components/planner/transactions/transactions-derive";

const EXPENSE_CATEGORIES: CategoryId[] = [
  "housing",
  "food",
  "transport",
  "utilities",
  "health",
  "entertainment",
  "shopping",
  "debt",
  "other",
];
const INCOME_CATEGORIES: CategoryId[] = ["salary", "freelance", "investments", "other"];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "date-desc", label: "Newest" },
  { key: "date-asc", label: "Oldest" },
  { key: "amount-desc", label: "Largest" },
  { key: "amount-asc", label: "Smallest" },
];

export function TransactionsCommand() {
  const transactions = usePlannerStore((s) => s.transactions);
  const updateTransaction = usePlannerStore((s) => s.updateTransaction);
  const deleteTransaction = usePlannerStore((s) => s.deleteTransaction);

  const [filter, setFilter] = useState(DEFAULT_FILTER);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => filterTransactions(transactions, filter), [transactions, filter]);
  const totals = useMemo(() => summarize(rows), [rows]);
  const filtered = isFiltered(filter);

  const categories = filter.type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const allVisibleSelected = rows.length > 0 && rows.every((t) => selected.has(t.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllVisible() {
    setSelected(allVisibleSelected ? new Set() : new Set(rows.map((t) => t.id)));
  }

  function bulkDelete() {
    for (const id of selected) deleteTransaction(id);
    setSelected(new Set());
  }

  function bulkRecategorise(category: CategoryId) {
    for (const id of selected) updateTransaction(id, { category });
    setSelected(new Set());
  }

  return (
    <section aria-label="Transactions">
      {/* Totals reflect what is on screen, not the whole ledger. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label={filtered ? "Matching" : "Transactions"} value={String(totals.count)} />
        <Tile label="Income" value={formatCurrency(totals.income)} accent={COLORS.emerald} />
        <Tile label="Spending" value={formatCurrency(totals.expense)} accent={COLORS.crimson} />
        <Tile
          label="Net"
          value={formatCurrency(totals.net)}
          accent={totals.net >= 0 ? COLORS.emerald : COLORS.crimson}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="relative flex min-w-[14rem] flex-1 items-center">
          <Search size={14} aria-hidden className="pointer-events-none absolute left-3 text-dim" />
          <input
            type="search"
            value={filter.query}
            onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
            placeholder="Search notes, category or amount…"
            aria-label="Search transactions"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2 pl-9 pr-3 text-sm text-light outline-none transition-colors placeholder:text-dim/70 focus:border-cyan/40"
          />
        </label>

        <Segmented
          label="Type"
          value={filter.type}
          onChange={(type) => setFilter((f) => ({ ...f, type, category: null }))}
          options={[
            { value: null, label: "All" },
            { value: "income" as TransactionType, label: "Income" },
            { value: "expense" as TransactionType, label: "Spending" },
          ]}
        />

        <select
          aria-label="Filter by category"
          value={filter.category ?? ""}
          onChange={(e) =>
            setFilter((f) => ({ ...f, category: (e.target.value || null) as CategoryId | null }))
          }
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-light outline-none focus:border-cyan/40"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {categoryLabel(c)}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5">
          <ArrowUpDown size={14} aria-hidden className="text-dim" />
          <select
            aria-label="Sort transactions"
            value={filter.sort}
            onChange={(e) => setFilter((f) => ({ ...f, sort: e.target.value as SortKey }))}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-light outline-none focus:border-cyan/40"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {filtered && (
          <button
            type="button"
            onClick={() => setFilter(DEFAULT_FILTER)}
            className="rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-dim transition-colors hover:border-cyan/30 hover:text-light"
          >
            Clear filters
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-cyan/25 bg-cyan/[0.06] px-3 py-2">
          <span className="eyebrow text-cyan">{selected.size} selected</span>
          <select
            aria-label="Recategorise selected"
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) bulkRecategorise(e.target.value as CategoryId);
              e.target.value = "";
            }}
            className="rounded-lg border border-white/[0.08] bg-navy/60 px-2.5 py-1.5 text-sm text-light outline-none focus:border-cyan/40"
          >
            <option value="">Recategorise to…</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={bulkDelete}
            className="inline-flex items-center gap-1.5 rounded-lg border border-crimson/30 px-2.5 py-1.5 text-sm text-crimson transition-colors hover:bg-crimson/10"
          >
            <Trash2 size={13} aria-hidden />
            Delete
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            aria-label="Clear selection"
            className="ml-auto inline-flex items-center gap-1 text-sm text-dim transition-colors hover:text-light"
          >
            <X size={13} aria-hidden />
            Clear
          </button>
        </div>
      )}

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              <th scope="col" className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  onChange={toggleAllVisible}
                  aria-label="Select all visible transactions"
                  className="accent-cyan"
                />
              </th>
              <th scope="col" className="eyebrow px-3 py-2.5 text-left text-dim">
                Date
              </th>
              <th scope="col" className="eyebrow px-3 py-2.5 text-left text-dim">
                Description
              </th>
              <th scope="col" className="eyebrow px-3 py-2.5 text-left text-dim">
                Category
              </th>
              <th scope="col" className="eyebrow px-3 py-2.5 text-right text-dim">
                Amount
              </th>
              <th scope="col" className="w-10 px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className="border-b border-white/[0.04] last:border-0">
                <td className="px-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggle(t.id)}
                    aria-label={`Select ${t.note ?? categoryLabel(t.category)}`}
                    className="accent-cyan"
                  />
                </td>
                <td className="score-numeral px-3 py-2.5 text-dim">{t.date}</td>
                <td className="px-3 py-2.5 text-light">{t.note ?? "—"}</td>
                <td className="px-3 py-2.5 text-dim">{categoryLabel(t.category)}</td>
                <td
                  className="num-money score-numeral px-3 py-2.5 text-right"
                  style={{ color: t.type === "income" ? COLORS.emerald : COLORS.light }}
                >
                  {t.type === "income" ? "+" : "−"}
                  {formatCurrency(t.amount, { decimals: 2 })}
                </td>
                <td className="px-3 py-2.5">
                  <button
                    type="button"
                    onClick={() => deleteTransaction(t.id)}
                    aria-label={`Delete ${t.note ?? categoryLabel(t.category)}`}
                    className="text-dim transition-colors hover:text-crimson"
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && (
          <EmptyState
            compact
            illustration={!filtered}
            line={
              filtered
                ? "Nothing matches those filters."
                : "No transactions yet — your ledger starts empty."
            }
            caption={
              filtered
                ? "Clear filters to see every entry again."
                : "Add a real income or expense. Sample numbers are for education only."
            }
            actionLabel={filtered ? "Clear filters" : undefined}
            onAction={filtered ? () => setFilter(DEFAULT_FILTER) : undefined}
          />
        )}
      </div>
    </section>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <p className="eyebrow text-dim">{label}</p>
      <p
        className="num score-numeral mt-1.5 text-lg text-light"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </p>
    </div>
  );
}

function Segmented<T extends string | null>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex rounded-xl border border-white/[0.08] bg-white/[0.03] p-0.5"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.label}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={
              active
                ? "rounded-lg bg-cyan/15 px-3 py-1.5 text-sm font-medium text-cyan"
                : "rounded-lg px-3 py-1.5 text-sm text-dim transition-colors hover:text-light"
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
