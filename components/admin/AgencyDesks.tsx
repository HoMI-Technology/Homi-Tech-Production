"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";

export type DeskTab = {
  id: string;
  label: string;
  /** Short CEO label under the tab */
  hint: string;
};

const TABS: DeskTab[] = [
  { id: "desk-strategy", label: "Strategy", hint: "Scorecard · GTM" },
  { id: "desk-content", label: "Content", hint: "Studio · captions" },
  { id: "desk-calendar", label: "Calendar", hint: "30-day themes" },
  { id: "desk-audience", label: "Audience", hint: "Insights" },
  { id: "desk-email", label: "Email", hint: "Drip · campaigns" },
  { id: "desk-performance", label: "Performance", hint: "Posts · CSV" },
  { id: "desk-competitive", label: "Competitive", hint: "Intel" },
  { id: "desk-publish", label: "Publish", hint: "Webhooks" },
  { id: "desk-guardrails", label: "Guardrails", hint: "Claim law" },
  { id: "desk-library", label: "Library", hint: "Brand SoT" },
];

/**
 * Tabbed agent desks — only one heavy desk mounts content at a time via CSS
 * (all panels stay mounted for state, inactive ones are hidden).
 * Hash deep-links: #desk-content etc.
 */
export function AgencyDesks({
  panels,
}: {
  panels: Record<string, ReactNode>;
}) {
  const [active, setActive] = useState("desk-content");

  const select = useCallback((id: string) => {
    setActive(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
  }, []);

  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (hash && TABS.some((t) => t.id === hash)) setActive(hash);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  return (
    <section className="mt-10" aria-label="Agent desks">
      <div className="mb-4">
        <p className="text-3xs font-semibold uppercase tracking-wide text-cyan">Agent desks</p>
        <h2 className="mt-1 font-display text-xl font-medium text-light">
          Work the desk. Approve before it ships.
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-dim">
          Each tab is an agent seat. AI drafts stay claim-stripped. You are CEO — publish only what
          you would put your name on.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Agency desks"
        className="flex gap-1 overflow-x-auto pb-2 scrollbar-thin"
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              id={`tab-${tab.id}`}
              className={`shrink-0 rounded-lg border px-3 py-2 text-left transition-colors ${
                isActive
                  ? "border-cyan/40 bg-cyan/10 text-light"
                  : "border-white/5 bg-white/[0.02] text-dim hover:border-white/15 hover:text-light"
              }`}
              onClick={() => select(tab.id)}
            >
              <span className="block text-sm font-semibold">{tab.label}</span>
              <span className="block text-3xs opacity-80">{tab.hint}</span>
            </button>
          );
        })}
      </div>

      {TABS.map((tab) => (
        <div
          key={tab.id}
          id={tab.id}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={active !== tab.id}
          className="mt-4 scroll-mt-[calc(var(--nav-offset)+3.5rem)]"
        >
          {panels[tab.id] ?? (
            <p className="glass p-8 text-center text-sm text-dim">Desk not configured.</p>
          )}
        </div>
      ))}
    </section>
  );
}
