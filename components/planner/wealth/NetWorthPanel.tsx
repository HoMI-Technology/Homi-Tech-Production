"use client";

/* ------------------------------------------------------------------ */
/* NetWorthPanel — net-worth stack card (planner spec §6).              */
/*                                                                      */
/* Assets vs liabilities tiles, big total net worth, other-assets and   */
/* debts lists with add/edit/delete, plus runway + DTI gauges from      */
/* lib/planner/derived (financialReality). Demo parity: net worth       */
/* $72,098.56 · assets $96,698.56 · liabilities $24,600.00 · runway     */
/* 5.2 mo · DTI 3%.                                                     */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, Scale, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/planner/ui/ConfirmDialog";
import { financialReality } from "@/lib/planner/derived";
import type { NetWorthItem, NetWorthKind } from "@/lib/planner/types";
import { formatCurrency, formatPercent } from "@/lib/tools/format";
import { usePlannerStore } from "@/lib/planner/store";
import { netWorthStack } from "./wealth-derive";

const inputCls =
  "w-full rounded-xl border border-white/[0.08] bg-navyLight/80 px-3 py-2 text-sm text-light outline-none transition-colors focus:border-cyan/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-label">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Item form (add + edit)                                              */
/* ------------------------------------------------------------------ */

interface ItemFormState {
  kind: NetWorthKind;
  name: string;
  amount: string;
  note: string;
}

function itemFormFrom(item: NetWorthItem | null): ItemFormState {
  return {
    kind: item?.kind ?? "asset",
    name: item?.name ?? "",
    amount: item ? String(item.amount) : "",
    note: item?.note ?? "",
  };
}

function ItemForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ItemFormState;
  submitLabel: string;
  onSubmit: (form: ItemFormState) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const amount = Number(form.amount);
  const valid = form.name.trim().length > 0 && Number.isFinite(amount) && amount >= 0;

  return (
    <form
      className="mt-4 rounded-2xl border border-cyan/15 bg-navyLight/70 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSubmit(form);
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Kind">
          <div className="flex gap-2">
            {(["asset", "liability"] as NetWorthKind[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setForm((f) => ({ ...f, kind: k }))}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  form.kind === k
                    ? k === "asset"
                      ? "border-emerald/40 bg-emerald/10 text-emerald"
                      : "border-yellow/40 bg-yellow/10 text-yellow"
                    : "border-white/[0.08] text-dim hover:bg-white/[0.06] hover:text-light"
                }`}
              >
                {k === "asset" ? "Asset" : "Debt"}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Name">
          <input
            className={inputCls}
            placeholder={form.kind === "asset" ? "e.g. Home equity" : "e.g. Auto loan"}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </Field>
        <Field label={form.kind === "asset" ? "Value" : "Balance"}>
          <input
            className={inputCls}
            inputMode="decimal"
            placeholder="0.00"
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
          />
        </Field>
        <Field label="Note (optional)">
          <input
            className={inputCls}
            placeholder="e.g. 2019 Honda CR-V"
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-medium text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
        >
          Cancel
        </button>
        <motion.button
          type="submit"
          disabled={!valid}
          whileHover={valid ? { scale: 1.02 } : undefined}
          whileTap={valid ? { scale: 0.97 } : undefined}
          className="rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitLabel}
        </motion.button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Item row                                                            */
/* ------------------------------------------------------------------ */

function ItemRow({
  item,
  onEdit,
  onDelete,
}: {
  item: NetWorthItem;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const asset = item.kind === "asset";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-navyLight/50 p-3.5"
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-light">{item.name}</p>
        {item.note && <p className="mt-0.5 text-xs text-dim">{item.note}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <p
          className={`font-display text-sm font-semibold tnum ${
            asset ? "text-emerald" : "text-yellow"
          }`}
        >
          {formatCurrency(item.amount, { decimals: 2 })}
        </p>
        <button
          type="button"
          onClick={onEdit}
          aria-label={`Edit ${item.name}`}
          className="rounded-xl p-2 text-dim transition-colors hover:bg-white/[0.06] hover:text-light"
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete ${item.name}`}
          className="rounded-xl p-2 text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* NetWorthPanel                                                       */
/* ------------------------------------------------------------------ */

export function NetWorthPanel() {
  const accounts = usePlannerStore((s) => s.accounts);
  const holdings = usePlannerStore((s) => s.holdings);
  const netWorthItems = usePlannerStore((s) => s.netWorthItems);
  const transactions = usePlannerStore((s) => s.transactions);
  const bills = usePlannerStore((s) => s.bills);
  const addNetWorthItem = usePlannerStore((s) => s.addNetWorthItem);
  const updateNetWorthItem = usePlannerStore((s) => s.updateNetWorthItem);
  const deleteNetWorthItem = usePlannerStore((s) => s.deleteNetWorthItem);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NetWorthItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<NetWorthItem | null>(null);

  const stack = useMemo(
    () => netWorthStack(accounts, holdings, netWorthItems),
    [accounts, holdings, netWorthItems],
  );
  const reality = useMemo(
    () => financialReality(transactions, accounts, bills),
    [transactions, accounts, bills],
  );

  const runwayLabel = Number.isFinite(reality.runwayMonths)
    ? `${reality.runwayMonths.toFixed(1)} mo`
    : "∞";
  const netWorthUp = stack.netWorth >= 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.12, ease: "easeOut" }}
      className="card-chrome p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
            <Scale size={16} />
          </span>
          <div>
            <h3 className="font-display text-lg tracking-tight text-light">
              Net worth
            </h3>
            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-dim">
              Cash + portfolio + other assets minus debts — same stack as HōMI Finance Command.
            </p>
          </div>
        </div>
        <motion.button
          type="button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => {
            setEditing(null);
            setFormOpen((v) => !v);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
        >
          <Plus size={14} />
          Add item
        </motion.button>
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label">Total net worth</p>
          <p
            className={`mt-1 font-display text-3xl font-bold tnum ${
              netWorthUp ? "text-emerald" : "text-crimson"
            }`}
          >
            {formatCurrency(stack.netWorth, { decimals: 2 })}
          </p>
        </div>
        <div className="flex gap-2.5">
          <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-2.5">
            <p className="text-label">Runway</p>
            <p
              className={`mt-0.5 font-display text-sm font-semibold tnum ${
                reality.temps.runway === "emerald"
                  ? "text-emerald"
                  : reality.temps.runway === "crimson"
                    ? "text-crimson"
                    : "text-yellow"
              }`}
            >
              {runwayLabel}
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-navyLight/60 px-3.5 py-2.5">
            <p className="text-label">DTI</p>
            <p
              className={`mt-0.5 font-display text-sm font-semibold tnum ${
                reality.temps.dti === "emerald"
                  ? "text-emerald"
                  : reality.temps.dti === "crimson"
                    ? "text-crimson"
                    : "text-yellow"
              }`}
            >
              {formatPercent(reality.dti, 0)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-white/[0.06] bg-navyLight/50 p-4">
          <p className="text-label">Assets</p>
          <p className="mt-1 font-display text-xl font-semibold tnum text-emerald">
            {formatCurrency(stack.assets, { decimals: 2 })}
          </p>
          <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(stack.assetsFraction * 100)}%` }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-emerald shadow-glow-emerald"
            />
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {stack.assetLines.map((line) => (
              <div key={line.label} className="flex items-center justify-between text-sm">
                <span className="text-dim">{line.label}</span>
                <span className="font-display text-xs tnum text-light">
                  {formatCurrency(line.value, { decimals: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-navyLight/50 p-4">
          <p className="text-label">Liabilities</p>
          <p className="mt-1 font-display text-xl font-semibold tnum text-yellow">
            {formatCurrency(stack.liabilities, { decimals: 2 })}
          </p>
          <div className="mt-2.5 h-[6px] overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div
              initial={{ width: 0 }}
              animate={{
                width: `${Math.round((1 - stack.assetsFraction) * 100)}%`,
              }}
              transition={{ duration: 0.7, ease: "easeOut" }}
              className="h-full rounded-full bg-yellow"
            />
          </div>
          <div className="mt-3 flex flex-col gap-1.5">
            {stack.liabilityLines.map((line) => (
              <div key={line.label} className="flex items-center justify-between text-sm">
                <span className="text-dim">{line.label}</span>
                <span className="font-display text-xs tnum text-light">
                  {formatCurrency(line.value, { decimals: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {formOpen && !editing && (
        <ItemForm
          initial={itemFormFrom(null)}
          submitLabel="Save item"
          onSubmit={(form) => {
            addNetWorthItem({
              kind: form.kind,
              name: form.name.trim(),
              amount: Number(form.amount),
              note: form.note.trim() || undefined,
            });
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
        />
      )}

      <div className="mt-5 grid items-start gap-4 md:grid-cols-2">
        <div>
          <p className="text-label">Other assets</p>
          <div className="mt-2 flex flex-col gap-2">
            {stack.otherAssets.map((item) =>
              editing?.id === item.id ? (
                <ItemForm
                  key={item.id}
                  initial={itemFormFrom(item)}
                  submitLabel="Save changes"
                  onSubmit={(form) => {
                    updateNetWorthItem(item.id, {
                      kind: form.kind,
                      name: form.name.trim(),
                      amount: Number(form.amount),
                      note: form.note.trim() || undefined,
                    });
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <ItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => {
                    setFormOpen(false);
                    setEditing(item);
                  }}
                  onDelete={() => setConfirmDelete(item)}
                />
              ),
            )}
            {stack.otherAssets.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-5 text-center text-xs text-dim">
                No other assets — add a home, vehicle, or reserve.
              </p>
            )}
          </div>
        </div>
        <div>
          <p className="text-label">Debts</p>
          <div className="mt-2 flex flex-col gap-2">
            {stack.manualDebts.map((item) =>
              editing?.id === item.id ? (
                <ItemForm
                  key={item.id}
                  initial={itemFormFrom(item)}
                  submitLabel="Save changes"
                  onSubmit={(form) => {
                    updateNetWorthItem(item.id, {
                      kind: form.kind,
                      name: form.name.trim(),
                      amount: Number(form.amount),
                      note: form.note.trim() || undefined,
                    });
                    setEditing(null);
                  }}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <ItemRow
                  key={item.id}
                  item={item}
                  onEdit={() => {
                    setFormOpen(false);
                    setEditing(item);
                  }}
                  onDelete={() => setConfirmDelete(item)}
                />
              ),
            )}
            {stack.manualDebts.length === 0 && (
              <p className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-5 text-center text-xs text-dim">
                No manual debts on record — nothing owed is a strong position.
              </p>
            )}
          </div>
        </div>
      </div>

      <p className="mt-5 flex items-start gap-2 border-t border-white/[0.06] pt-4 text-2xs leading-relaxed text-dim">
        <Scale size={13} className="mt-0.5 shrink-0" />
        Bank cash and portfolio market value roll in automatically. Credit card balances on linked
        accounts count as liabilities.
      </p>

      <ConfirmDialog
        open={confirmDelete !== null}
        title={confirmDelete?.kind === "asset" ? "Remove asset?" : "Remove debt?"}
        body={
          confirmDelete
            ? `${confirmDelete.name} (${formatCurrency(confirmDelete.amount, { decimals: 2 })}) will be removed from the net-worth stack. Totals update live.`
            : ""
        }
        confirmLabel="Remove"
        onConfirm={() => {
          if (confirmDelete) deleteNetWorthItem(confirmDelete.id);
        }}
        onClose={() => setConfirmDelete(null)}
      />
    </motion.section>
  );
}

export default NetWorthPanel;
