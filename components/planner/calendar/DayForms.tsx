"use client";

/* Decision calendar — DayInspector inline forms (add bill / log spend). */

import { useState } from "react";
import { cn } from "@/lib/planner/cn";
import { usePlannerStore } from "@/lib/planner/store";
import type { ExpenseCategory } from "@/lib/planner/types";
import { categoryLabel, shortDateLabel } from "@/lib/planner/calendar";
import { EXPENSE_CATEGORIES, FIELD_LABEL, INPUT_CLASS, SELECT_CLASS, SUBCARD } from "./shared";

function CategorySelect({
  value,
  onChange,
  defaultValue,
}: {
  value: ExpenseCategory | "";
  onChange: (c: ExpenseCategory) => void;
  defaultValue: ExpenseCategory;
}) {
  return (
    <select
      className={SELECT_CLASS}
      value={value || defaultValue}
      onChange={(e) => onChange(e.target.value as ExpenseCategory)}
    >
      {EXPENSE_CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {categoryLabel(c)}
        </option>
      ))}
    </select>
  );
}

function AmountInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <input
      className={cn(INPUT_CLASS, "font-display tabular-nums")}
      inputMode="decimal"
      placeholder="0.00"
      value={value}
      onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ""))}
    />
  );
}

export function AddBillForm({
  dateISO,
  accountId,
  onSaved,
}: {
  dateISO: string;
  accountId?: string;
  onSaved: () => void;
}) {
  const addBill = usePlannerStore((s) => s.addBill);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("utilities");
  const parsed = Number(amount);

  const save = () => {
    if (!name.trim() || !(parsed > 0)) return;
    addBill({
      name: name.trim(),
      amount: Number(parsed.toFixed(2)),
      category,
      dueDate: dateISO,
      frequency: "monthly",
      autopay: false,
      source: "manual",
      accountId,
    });
    setName("");
    setAmount("");
    onSaved();
  };

  return (
    <div className={cn(SUBCARD, "mt-3 p-3")}>
      <label className={FIELD_LABEL} htmlFor="cal-bill-name">
        Name
      </label>
      <input
        id="cal-bill-name"
        className={INPUT_CLASS}
        placeholder="e.g. Car payment"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className={FIELD_LABEL} htmlFor="cal-bill-amount">
            Amount
          </label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="cal-bill-category">
            Category
          </label>
          <CategorySelect value={category} onChange={setCategory} defaultValue="utilities" />
        </div>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={!name.trim() || !(parsed > 0)}
        className="mt-3 w-full rounded-lg bg-cyan py-2.5 text-sm font-semibold text-navy transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        Save bill on {shortDateLabel(dateISO)}
      </button>
    </div>
  );
}

export function LogSpendForm({
  dateISO,
  accountId,
  onSaved,
}: {
  dateISO: string;
  accountId?: string;
  onSaved: () => void;
}) {
  const addTransaction = usePlannerStore((s) => s.addTransaction);
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const parsed = Number(amount);

  const save = () => {
    if (!(parsed > 0)) return;
    addTransaction({
      type: "expense",
      amount: Number(parsed.toFixed(2)),
      category,
      note: note.trim() || categoryLabel(category),
      date: dateISO,
      source: "manual",
      accountId,
    });
    setNote("");
    setAmount("");
    onSaved();
  };

  return (
    <div className={cn(SUBCARD, "mt-3 p-3")}>
      <label className={FIELD_LABEL} htmlFor="cal-spend-note">
        Note
      </label>
      <input
        id="cal-spend-note"
        className={INPUT_CLASS}
        placeholder="What did you spend on?"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <label className={FIELD_LABEL} htmlFor="cal-spend-amount">
            Amount
          </label>
          <AmountInput value={amount} onChange={setAmount} />
        </div>
        <div>
          <label className={FIELD_LABEL} htmlFor="cal-spend-category">
            Category
          </label>
          <CategorySelect value={category} onChange={setCategory} defaultValue="food" />
        </div>
      </div>
      <button
        type="button"
        onClick={save}
        disabled={!(parsed > 0)}
        className="mt-3 w-full rounded-lg bg-cyan py-2.5 text-sm font-semibold text-navy transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
      >
        Log spend on {shortDateLabel(dateISO)}
      </button>
    </div>
  );
}
