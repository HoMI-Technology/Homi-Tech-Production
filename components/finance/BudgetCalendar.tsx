"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { COLORS } from "@/lib/brand";
import { useFinanceDashboard } from "@/hooks/use-finance-dashboard";
import { formatCurrency } from "@/lib/tools/format";

/**
 * Simplified budget calendar for v2. Shows posted transactions by date only;
 * bill due dates are intentionally deferred to Phase 3.
 */
export function BudgetCalendar() {
  const { recentTransactions, ready, loading } = useFinanceDashboard();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const { year, month, days, transactionsByDate } = useMemo(() => {
    const now = new Date();
    now.setMonth(now.getMonth() + monthOffset);
    const y = now.getFullYear();
    const m = now.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const lastDate = new Date(y, m + 1, 0).getDate();
    const mm = String(m + 1).padStart(2, "0");

    const byDate = new Map<string, typeof recentTransactions>();
    for (const tx of recentTransactions) {
      if (!tx.date.startsWith(`${y}-${mm}`)) continue;
      const list = byDate.get(tx.date) ?? [];
      list.push(tx);
      byDate.set(tx.date, list);
    }

    return {
      year: y,
      month: m,
      days: Array.from({ length: lastDate }, (_, i) => i + 1),
      transactionsByDate: byDate,
    };
  }, [recentTransactions, monthOffset]);

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <section className="glass p-5 sm:p-6" aria-busy="true">
        <div className="h-64 animate-pulse rounded-lg bg-slate-surface/40" />
      </section>
    );
  }

  const selectedTransactions = selectedDate ? transactionsByDate.get(selectedDate) ?? [] : [];

  return (
    <div className="space-y-6">
      <section className="glass p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan">Calendar</p>
            <h2 className="mt-1 font-display text-xl font-semibold text-light">Cash in motion</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setMonthOffset((o) => o - 1)}
              aria-label="Previous month"
            >
              <ChevronLeftIcon />
            </button>
            <span className="min-w-[10rem] text-center text-sm text-light">{monthLabel}</span>
            <button
              type="button"
              className="btn btn-ghost btn-xs"
              onClick={() => setMonthOffset((o) => o + 1)}
              aria-label="Next month"
            >
              <ChevronRightIcon />
            </button>
          </div>
        </div>

        {!ready ? (
          <p className="mt-6 text-sm text-dim">Add a transaction to see your cash calendar.</p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-dim">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">
              {Array.from({ length: new Date(year, month, 1).getDay() }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {days.map((day) => {
                const dateOnly = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayTxs = transactionsByDate.get(dateOnly) ?? [];
                const income = dayTxs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
                const expense = dayTxs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
                const selected = selectedDate === dateOnly;
                return (
                  <button
                    key={dateOnly}
                    type="button"
                    onClick={() => setSelectedDate(selected ? null : dateOnly)}
                    className={`relative flex aspect-square flex-col items-center justify-start rounded-lg border p-1 transition-colors ${
                      selected
                        ? "border-cyan/50 bg-cyan/10"
                        : "border-slate-surface/40 hover:border-cyan/30 hover:bg-navy/40"
                    }`}
                  >
                    <span className="text-[11px] text-dim">{day}</span>
                    <div className="mt-auto flex gap-0.5">
                      {income > 0 && (
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: COLORS.cyan }} />
                      )}
                      {expense > 0 && (
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: COLORS.crimson }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-dim">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: COLORS.cyan }} />
                Income
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full" style={{ backgroundColor: COLORS.crimson }} />
                Expense
              </span>
            </div>
          </>
        )}
      </section>

      <AnimatePresence>
        {selectedDate && selectedTransactions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="glass p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-dim">
              {new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <div className="mt-3 space-y-2">
              {selectedTransactions.map((tx) => (
                <div
                  key={tx.description + tx.date + tx.amount}
                  className="flex items-center justify-between rounded-lg border border-slate-surface/40 bg-navy/30 px-3 py-2"
                >
                  <div>
                    <p className="text-sm text-light">{tx.description}</p>
                    <p className="text-xs text-dim">{tx.category}</p>
                  </div>
                  <span
                    className={`score-numeral text-sm ${
                      tx.type === "expense" ? "text-crimson" : "text-cyan"
                    }`}
                  >
                    {tx.type === "expense" ? "−" : "+"}
                    {formatCurrency(tx.amount)}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChevronLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
