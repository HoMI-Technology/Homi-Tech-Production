"use client";

/* ------------------------------------------------------------------ */
/* BrokerPanel — brokerage feeds card (planner spec §6).                */
/*                                                                      */
/* Connected brokers with brokers.ts metadata, connect / disconnect /   */
/* sync demo flows. Demo brokerage — production swaps in SnapTrade /    */
/* Plaid Investments. Reads usePlannerStore directly.                   */
/* ------------------------------------------------------------------ */

import { useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Link2, RefreshCw, Unlink } from "lucide-react";
import ConfirmDialog from "@/components/planner/ui/ConfirmDialog";
import { BROKERS, brokerMeta } from "@/lib/planner/brokers";
import type { BrokerConnection } from "@/lib/planner/types";
import { formatCurrency } from "@/lib/tools/format";
import { usePlannerStore } from "@/lib/planner/store";
import { formatSyncStamp } from "../banking/banking-derive";

function BrokerRow({
  broker,
  holdingsCount,
  onUnlink,
}: {
  broker: BrokerConnection;
  holdingsCount: number;
  onUnlink: () => void;
}) {
  const meta = brokerMeta(broker.institution);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-navyLight/50 p-3.5"
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-3xs font-bold text-navy"
        style={{ backgroundColor: meta.color }}
      >
        {meta.short}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-light">{broker.name}</p>
        <p className="mt-0.5 text-xs text-dim">
          ••••{broker.mask} · {holdingsCount} holding
          {holdingsCount === 1 ? "" : "s"} · {formatSyncStamp(broker.lastSyncedAt)}
        </p>
      </div>
      <p className="num-money shrink-0 font-display text-sm font-semibold tnum text-cyan">
        {formatCurrency(broker.marketValue, { decimals: 2 })}
      </p>
      <button
        type="button"
        onClick={onUnlink}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl px-2 py-2 text-xs text-dim transition-colors hover:bg-crimson/10 hover:text-crimson"
      >
        <Unlink size={14} />
        Unlink
      </button>
    </motion.div>
  );
}

export function BrokerPanel() {
  const brokers = usePlannerStore((s) => s.brokers);
  const holdings = usePlannerStore((s) => s.holdings);
  const brokerLinkStatus = usePlannerStore((s) => s.brokerLinkStatus);
  const lastBrokerSyncAt = usePlannerStore((s) => s.lastBrokerSyncAt);
  const connectBroker = usePlannerStore((s) => s.connectBroker);
  const disconnectBroker = usePlannerStore((s) => s.disconnectBroker);
  const syncBrokers = usePlannerStore((s) => s.syncBrokers);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmBroker, setConfirmBroker] = useState<BrokerConnection | null>(null);

  const connecting = brokerLinkStatus === "connecting";
  const portfolioMv = holdings.reduce((sum, h) => sum + h.shares * h.price, 0);
  const linkedIds = new Set(brokers.map((b) => b.institution));

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="card-chrome p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-cyan/20 bg-cyan/10 text-cyan">
            <Briefcase size={16} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-light">Brokerage feeds</h3>
            <p className="mt-0.5 max-w-md text-xs leading-relaxed text-dim">
              Demo brokerage — production swaps in SnapTrade / Plaid Investments.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {brokers.length > 0 && (
            <button
              type="button"
              disabled={connecting}
              onClick={() => void syncBrokers()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 py-2 text-sm text-dim transition-colors hover:bg-white/[0.06] hover:text-light disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw size={14} className={connecting ? "animate-spin" : ""} />
              {connecting ? "Syncing…" : "Sync investments"}
            </button>
          )}
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setPickerOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy shadow-glow-cyan"
          >
            <Link2 size={14} />
            Link broker
          </motion.button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
        <div>
          <p className="text-label">Portfolio MV</p>
          <p className="num-money mt-0.5 font-display text-base font-semibold tnum text-cyan">
            {formatCurrency(portfolioMv, { decimals: 2 })}
          </p>
        </div>
        <div>
          <p className="text-label">Linked brokers</p>
          <p className="num mt-0.5 font-display text-base font-semibold tnum text-light">
            {brokers.length}
          </p>
        </div>
        <div>
          <p className="text-label">Last sync</p>
          <p className="mt-0.5 font-display text-base font-semibold tnum text-light">
            {formatSyncStamp(lastBrokerSyncAt)}
          </p>
        </div>
      </div>

      {pickerOpen && (
        <div className="mt-4 rounded-2xl border border-cyan/15 bg-navyLight/70 p-4">
          <p className="text-label">Choose a brokerage</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {BROKERS.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={busy || linkedIds.has(b.id)}
                onClick={async () => {
                  setBusy(true);
                  await connectBroker(b.id);
                  setBusy(false);
                  setPickerOpen(false);
                }}
                className="flex items-center gap-2.5 rounded-xl border border-white/[0.08] px-3 py-2.5 text-left text-sm text-light transition-colors hover:border-cyan/40 hover:bg-cyan/[0.06] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-display text-3xs font-bold text-navy"
                  style={{ backgroundColor: b.color }}
                >
                  {b.short}
                </span>
                {b.label}
                {linkedIds.has(b.id) && (
                  <span className="ml-auto text-3xs uppercase tracking-wide text-dim">linked</span>
                )}
              </button>
            ))}
          </div>
          <p className="mt-3 text-2xs leading-relaxed text-dim">
            Demo brokerage — production swaps in SnapTrade / Plaid Investments.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2.5">
        {brokers.map((b) => (
          <BrokerRow
            key={b.id}
            broker={b}
            holdingsCount={holdings.filter((h) => h.brokerId === b.institution).length}
            onUnlink={() => setConfirmBroker(b)}
          />
        ))}
        {brokers.length === 0 && !pickerOpen && (
          <div className="rounded-2xl border border-dashed border-white/[0.12] px-4 py-8 text-center">
            <p className="font-serif text-lg italic text-light/90">
              No broker linked — holdings stay manual until a feed connects.
            </p>
            <p className="mt-1 text-xs text-dim">
              Demo open-brokerage link — positions land in your portfolio ledger.
            </p>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmBroker !== null}
        title="Unlink broker?"
        body={
          confirmBroker
            ? `${confirmBroker.name} ••••${confirmBroker.mask} will be disconnected. Holdings imported from it are removed; manual positions stay.`
            : ""
        }
        confirmLabel="Unlink"
        onConfirm={() => {
          if (confirmBroker) disconnectBroker(confirmBroker.id);
        }}
        onClose={() => setConfirmBroker(null)}
      />
    </motion.section>
  );
}

export default BrokerPanel;
