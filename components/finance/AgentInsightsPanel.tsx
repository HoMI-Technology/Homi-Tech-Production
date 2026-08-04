"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { AgentId } from "@/lib/agents/registry";

export interface FinanceInsight {
  id: string;
  agentId: AgentId;
  type: "signal" | "nudge" | "goal-suggestion" | "step";
  title: string;
  body: string;
  severity?: "emerald" | "yellow" | "amber" | "crimson";
  action?: { label: string; href: string };
}

const INSIGHTS_KEY = "homi-finance-insights";

const SEVERITY_CLASS: Record<
  NonNullable<FinanceInsight["severity"]>,
  { border: string; bg: string; text: string }
> = {
  emerald: { border: "border-emerald/30", bg: "bg-emerald/8", text: "text-emerald" },
  yellow: { border: "border-yellow/30", bg: "bg-yellow/8", text: "text-yellow" },
  amber: { border: "border-amber/30", bg: "bg-amber/8", text: "text-amber" },
  crimson: { border: "border-crimson/30", bg: "bg-crimson/8", text: "text-crimson" },
};

function loadInsights(): FinanceInsight[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(INSIGHTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveInsights(insights: FinanceInsight[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(INSIGHTS_KEY, JSON.stringify(insights));
  } catch {
    // localStorage may be unavailable; insights are best-effort ephemeral.
  }
}

/**
 * Ephemeral agent insights panel. Agents can suggest actions during chat;
 * users pin the ones they want to keep on their dashboard. Stored in
 * localStorage for now; Phase 3 will make them durable server-side.
 */
export function AgentInsightsPanel({ insights: injected }: { insights?: FinanceInsight[] }) {
  const [insights, setInsights] = useState<FinanceInsight[]>(() => injected ?? loadInsights());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!injected) setInsights(loadInsights());
  }, [injected]);

  function dismiss(id: string) {
    setInsights((prev) => {
      const next = prev.filter((i) => i.id !== id);
      saveInsights(next);
      return next;
    });
  }

  if (!mounted || insights.length === 0) return null;

  return (
    <section className="glass p-5 sm:p-6" aria-label="Agent insights">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-cyan">From your agents</p>
          <h2 className="mt-1 font-display text-xl font-semibold text-light">Insights to act on</h2>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
          {insights.map((insight) => {
            const sev = insight.severity ? SEVERITY_CLASS[insight.severity] : null;
            return (
              <motion.article
                key={insight.id}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className={`relative rounded-xl border p-4 ${sev ? `${sev.border} ${sev.bg}` : "border-slate-surface/60 bg-navy/30"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[0.6rem] font-bold uppercase tracking-wide text-dim">
                    {insight.agentId}
                  </span>
                  <button
                    type="button"
                    onClick={() => dismiss(insight.id)}
                    className="shrink-0 rounded-md p-1 text-dim hover:bg-navy/50 hover:text-light"
                    aria-label={`Dismiss ${insight.title}`}
                  >
                    <CloseIcon />
                  </button>
                </div>
                <h3 className={`mt-2 text-sm font-semibold leading-snug ${sev ? sev.text : "text-light"}`}>
                  {insight.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-light/80">{insight.body}</p>
                {insight.action && (
                  <a
                    href={insight.action.href}
                    className="mt-3 inline-block text-xs font-semibold text-cyan hover:underline"
                  >
                    {insight.action.label} →
                  </a>
                )}
              </motion.article>
            );
          })}
        </AnimatePresence>
      </div>
    </section>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
