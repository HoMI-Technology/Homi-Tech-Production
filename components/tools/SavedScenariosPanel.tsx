"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { COLORS } from "@/lib/brand";
import { formatCurrency, formatMonths } from "@/lib/tools/format";
import { segmentedSelectionClasses } from "@/components/ui/SegmentedControl";
import { getLens } from "@/lib/tools/registry";
import { useCfm } from "@/hooks/use-cfm";
import {
  loadLocalScenarios,
  deleteLocalScenario,
  scenarioDrift,
  compareScenarios,
  evaluateScenario,
  type ToolScenario,
} from "@/lib/tools/scenarios";

interface ServerRow {
  id: string;
  name: string;
  lens_id: string;
  inputs: Record<string, number>;
  cfm_snapshot: ToolScenario["cfmSnapshot"];
  created_at: string;
}

function fromServerRow(row: ServerRow): ToolScenario {
  return {
    id: row.id,
    name: row.name,
    lensId: row.lens_id,
    inputs: row.inputs,
    cfmSnapshot: row.cfm_snapshot,
    savedAt: row.created_at,
    origin: "server",
  };
}

function formatCell(value: number | null, unit: "currency" | "months" | "percent"): string {
  if (value === null) return "—";
  if (unit === "currency") return formatCurrency(value);
  if (unit === "months") return formatMonths(value);
  return `${Math.round(value)}%`;
}

/**
 * Saved scenarios — the comparison surface, now a section of the canonical
 * /scenarios page (Decision D2: /tools/scenarios merged into Scenario
 * Studio). Two futures, side by side, evaluated deterministically against
 * the numbers each was saved with. Staleness is displayed, never silently
 * refreshed. Deep-linkable as /scenarios#saved.
 */
export function SavedScenariosPanel() {
  const { cfm, hydrated } = useCfm();
  const [scenarios, setScenarios] = useState<ToolScenario[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const local = loadLocalScenarios();
      // Paint local rows before the signed-in sync. BUILD-SAFE / anonymous
      // GET /api/tools/scenarios can stall on an inert Supabase URL.
      if (!cancelled) {
        setScenarios(local);
        setLoaded(true);
      }
      try {
        const res = await fetch("/api/tools/scenarios");
        if (!res.ok) return;
        const data = (await res.json()) as { scenarios: ServerRow[] };
        const server = data.scenarios.map(fromServerRow);
        const serverIds = new Set(server.map((s) => s.id));
        const merged = [...server, ...local.filter((s) => !serverIds.has(s.id))];
        if (!cancelled) setScenarios(merged);
      } catch {
        // offline: local already painted
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Honor the /scenarios#saved deep link (the old /tools/scenarios redirect
  // target) — the section mounts async, so scroll once content is ready.
  useEffect(() => {
    if (!hydrated || !loaded) return;
    if (typeof window !== "undefined" && window.location.hash === "#saved") {
      document.getElementById("saved")?.scrollIntoView();
    }
  }, [hydrated, loaded]);

  const byLens = useMemo(() => {
    const groups = new Map<string, ToolScenario[]>();
    for (const s of scenarios) {
      const list = groups.get(s.lensId) ?? [];
      list.push(s);
      groups.set(s.lensId, list);
    }
    return groups;
  }, [scenarios]);

  const pair = useMemo(() => {
    const [aId, bId] = selected;
    const a = scenarios.find((s) => s.id === aId);
    const b = scenarios.find((s) => s.id === bId);
    return a && b && a.lensId === b.lensId ? ([a, b] as const) : null;
  }, [selected, scenarios]);

  const comparison = useMemo(() => (pair ? compareScenarios(pair[0], pair[1]) : null), [pair]);

  function toggleSelect(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev.slice(-1), id],
    );
  }

  async function remove(scenario: ToolScenario) {
    if (scenario.origin === "local") {
      deleteLocalScenario(scenario.id);
    } else {
      try {
        await fetch(`/api/tools/scenarios/${scenario.id}`, { method: "DELETE" });
      } catch {
        // keep the row visible if the delete didn't land
        return;
      }
    }
    setScenarios((prev) => prev.filter((s) => s.id !== scenario.id));
    setSelected((prev) => prev.filter((x) => x !== scenario.id));
  }

  return (
    <section id="saved" aria-labelledby="saved-scenarios" className="scroll-mt-24">
      <p className="eyebrow">Decision Lab</p>
      <h2 id="saved-scenarios" className="mt-1 font-display text-2xl text-light md:text-3xl">
        Saved scenarios
      </h2>
      <p className="mt-2 max-w-2xl text-dim">
        Futures you named and kept. Pick two from the same tool to compare them — every number
        recomputed deterministically, evaluated against the numbers each was saved with.
      </p>

      {(!hydrated || !loaded) && (
        <p className="mt-6 text-sm text-dim">Loading your saved futures…</p>
      )}

      {hydrated && loaded && scenarios.length === 0 && (
        <div className="glass mt-8 p-8 text-center">
          <p className="text-light">No saved futures yet.</p>
          <p className="mt-2 text-sm text-dim">
            Open a tool, set the numbers that matter, and hit{" "}
            <span className="text-light">Save as scenario</span>.
          </p>
          <Link
            href="/money/decide"
            className="mt-4 inline-block text-sm font-medium text-cyan hover:underline"
          >
            Open Money · Decide →
          </Link>
        </div>
      )}

      {hydrated &&
        loaded &&
        [...byLens.entries()].map(([lensId, list]) => {
          const lens = getLens(lensId);
          return (
            <section key={lensId} className="mt-10" aria-labelledby={`scenarios-${lensId}`}>
              <h3 id={`scenarios-${lensId}`} className="font-display text-lg text-light">
                <span
                  aria-hidden
                  className="mr-2 inline-block h-2 w-2 rounded-full align-middle"
                  style={{ background: lens?.accent ?? COLORS.cyan }}
                />
                {lens?.name ?? lensId}
                <span className="ml-2 text-sm font-normal text-dim">{list.length} saved</span>
              </h3>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {list.map((scenario) => {
                  const drift = scenarioDrift(scenario, cfm);
                  const isSelected = selected.includes(scenario.id);
                  const evaluation = evaluateScenario(scenario);
                  return (
                    <div
                      key={scenario.id}
                      className={`glass p-5 transition-colors ${isSelected ? "panel-focus" : ""}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-light">{scenario.name}</p>
                          <p className="mt-0.5 text-xs text-dim">
                            {new Date(scenario.savedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                            {scenario.origin === "local" ? " · this browser only" : ""}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => remove(scenario)}
                          aria-label={`Delete ${scenario.name}`}
                          className="rounded p-1 text-dim transition-colors hover:text-crimson"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
                          </svg>
                        </button>
                      </div>

                      {evaluation.monthlyCost !== null && (
                        <p className="score-numeral mt-3 text-xl font-bold text-cyan">
                          {formatCurrency(evaluation.monthlyCost)}
                          <span className="ml-1 text-xs font-normal text-dim">/mo</span>
                        </p>
                      )}

                      {drift.length > 0 && (
                        <p className="mt-3 rounded-lg border border-yellow/30 bg-yellow/5 p-2 text-xs leading-relaxed text-dim">
                          Saved when your{" "}
                          {drift
                            .map((d) => `${d.label} was ${formatCurrency(d.from)}`)
                            .join(" and ")}{" "}
                          — it's since changed. Refresh it in the tool to re-anchor.
                        </p>
                      )}

                      {/* A genuine toggle (two scenarios selectable), so it keeps
                          aria-pressed — not radio semantics — while sharing the
                          canonical segmented selected style. */}
                      <button
                        type="button"
                        onClick={() => toggleSelect(scenario.id)}
                        aria-pressed={isSelected}
                        className={`mt-4 w-full rounded-lg px-3 py-2 text-sm font-medium ${segmentedSelectionClasses(isSelected)}`}
                      >
                        {isSelected ? "Selected for comparison" : "Compare this"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

      {comparison && pair && (
        <section className="mt-10" aria-labelledby="scenario-comparison">
          <h3 id="scenario-comparison" className="font-display text-lg text-light">
            {pair[0].name} <span className="text-dim">vs</span> {pair[1].name}
          </h3>
          <div className="glass mt-4 overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-surface/60 text-left text-xs text-dim">
                  <th className="p-4 font-medium">Metric</th>
                  <th className="p-4 font-medium">{pair[0].name}</th>
                  <th className="p-4 font-medium">{pair[1].name}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.key} className="border-b border-slate-surface/40 last:border-0">
                    <td className="p-4 text-dim">{row.label}</td>
                    {(["a", "b"] as const).map((side) => (
                      <td
                        key={side}
                        className={`score-numeral p-4 ${
                          row.better === side ? "font-bold text-emerald" : "text-light"
                        }`}
                      >
                        {formatCell(row[side], row.unit)}
                        {row.better === side ? " ✓" : ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-dim/70">
            Each scenario is evaluated against the numbers it was saved with — drift is shown on the
            cards above, never blended in silently. Educational math, not advice.
          </p>
        </section>
      )}
    </section>
  );
}
