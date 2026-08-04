"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { FinanceSignal } from "@/lib/advisor/fallback";

type Severity = FinanceSignal["severity"];

const SEVERITY_CLASS: Record<
  Severity,
  { border: string; bg: string; text: string; dot: string }
> = {
  emerald: {
    border: "border-emerald/30",
    bg: "bg-emerald/8",
    text: "text-emerald",
    dot: "bg-emerald",
  },
  yellow: {
    border: "border-yellow/30",
    bg: "bg-yellow/8",
    text: "text-yellow",
    dot: "bg-yellow",
  },
  amber: {
    border: "border-amber/30",
    bg: "bg-amber/8",
    text: "text-amber",
    dot: "bg-amber",
  },
  crimson: {
    border: "border-crimson/30",
    bg: "bg-crimson/8",
    text: "text-crimson",
    dot: "bg-crimson",
  },
};

/**
 * Horizontal scrollable strip of actionable finance signals. Each card shows
 * severity, a clear title, an honest body, and a single action. The all-clear
 * signal cannot be dismissed — it exists to confirm the user is on track.
 */
export function SignalsStrip({
  signals,
  onAction,
  onDismiss,
  refreshKey,
}: {
  signals: FinanceSignal[];
  onAction: (signal: FinanceSignal) => void;
  onDismiss: (id: string) => void;
  refreshKey?: string | number | null;
}) {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (refreshKey == null || refreshKey === "") return;
    setPulse(true);
    const t = window.setTimeout(() => setPulse(false), 1400);
    return () => window.clearTimeout(t);
  }, [refreshKey]);

  if (!signals.length) return null;

  return (
    <section
      className={["space-y-2.5", pulse ? "opacity-90" : ""].filter(Boolean).join(" ")}
      aria-label="Live finance signals"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-dim">
          Always-on signals
          {pulse ? <span className="ml-2 text-cyan">· refreshed</span> : null}
        </p>
        <p className="text-[0.65rem] text-dim">
          {signals.length} active · stress · cash · path
        </p>
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {signals.map((s, i) => {
          const sev = SEVERITY_CLASS[s.severity];
          return (
            <motion.article
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`min-w-[17rem] max-w-[21rem] shrink-0 rounded-xl border p-3.5 ${sev.border} ${sev.bg}`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${sev.dot}`}
                  aria-hidden
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className={`text-sm font-semibold leading-snug ${sev.text}`}>
                      {s.title}
                    </h3>
                    {s.id !== "all-clear" && (
                      <button
                        type="button"
                        className="shrink-0 rounded-md p-1 text-dim hover:bg-navy/40 hover:text-light"
                        aria-label={`Dismiss ${s.title}`}
                        onClick={() => onDismiss(s.id)}
                      >
                        <CloseIcon />
                      </button>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-light/80">{s.body}</p>
                  <button
                    type="button"
                    className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-slate-surface/60 bg-navy/55 px-3 text-xs font-semibold text-cyan transition-colors hover:border-cyan/40 hover:bg-navy/70"
                    onClick={() => onAction(s)}
                  >
                    {s.id === "all-clear" ? "Keep going" : "Take action"}
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}
