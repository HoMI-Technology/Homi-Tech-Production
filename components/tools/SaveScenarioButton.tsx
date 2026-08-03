/**
 * SaveScenarioButton — name this future, keep it.
 *
 * Saves the lens's current inputs + a CFM snapshot (the staleness anchor).
 * Signed-in users sync to the server (tier-capped, honestly 402'd);
 * anonymous users get the local "browser only" store, cap one — the same
 * degraded-but-honest contract as the rest of the product.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { useCfm } from "@/hooks/use-cfm";
import {
  saveLocalScenario,
  snapshotFromCfm,
  type ToolScenario,
} from "@/lib/tools/scenarios";

type SaveState =
  | { kind: "idle" }
  | { kind: "naming" }
  | { kind: "saving" }
  | { kind: "saved"; scenario: ToolScenario; server: boolean; note: string | null }
  | { kind: "capped"; message: string };

interface ServerRow {
  id: string;
  name: string;
  lens_id: string;
  inputs: Record<string, number>;
  cfm_snapshot: ToolScenario["cfmSnapshot"];
  created_at: string;
}

export function SaveScenarioButton({
  lensId,
  getInputs,
}: {
  lensId: string;
  /** Evaluated at click time so the latest slider values are saved. */
  getInputs: () => Record<string, number>;
}) {
  const { cfm, hydrated } = useCfm();
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [name, setName] = useState("");

  if (!hydrated) return null;

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || state.kind === "saving") return;
    setState({ kind: "saving" });
    const inputs = getInputs();
    const cfmSnapshot = snapshotFromCfm(cfm);

    try {
      const res = await fetch("/api/tools/scenarios", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          lensId,
          inputs,
          cfmSnapshot,
          clientUpdatedAt: Date.now(),
        }),
      });

      if (res.status === 401) {
        // Anonymous: local store, honestly labeled.
        const { scenario, replaced } = saveLocalScenario({ name: trimmed, lensId, inputs, cfmSnapshot });
        track("scenario_saved", { lens: lensId, origin: "local" });
        setState({
          kind: "saved",
          scenario,
          server: false,
          note: replaced ? "Saved in this browser — it replaced your previous local scenario." : "Saved in this browser only.",
        });
        return;
      }

      if (res.status === 402) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setState({
          kind: "capped",
          message: data.error ?? "Your plan's scenario limit is reached.",
        });
        return;
      }

      if (!res.ok) throw new Error(`save failed: ${res.status}`);

      const data = (await res.json()) as { scenario: ServerRow };
      const scenario: ToolScenario = {
        id: data.scenario.id,
        name: data.scenario.name,
        lensId: data.scenario.lens_id,
        inputs: data.scenario.inputs,
        cfmSnapshot: data.scenario.cfm_snapshot,
        savedAt: data.scenario.created_at,
        origin: "server",
      };
      track("scenario_saved", { lens: lensId, origin: "server" });
      setState({ kind: "saved", scenario, server: true, note: null });
    } catch {
      // Network failure: keep the scenario locally rather than losing it.
      const { scenario } = saveLocalScenario({ name: trimmed, lensId, inputs, cfmSnapshot });
      setState({
        kind: "saved",
        scenario,
        server: false,
        note: "Couldn't reach the server — saved in this browser for now.",
      });
    }
  }

  if (state.kind === "saved") {
    return (
      <div className="rounded-lg border border-emerald/40 bg-emerald/5 p-3 text-sm">
        <p className="text-emerald">
          Saved as <span className="font-semibold">{state.scenario.name}</span>.
          {state.note ? <span className="text-dim"> {state.note}</span> : null}
        </p>
        <Link href="/scenarios#saved" className="mt-1 inline-block text-xs font-medium text-cyan hover:underline">
          Open saved scenarios →
        </Link>
      </div>
    );
  }

  if (state.kind === "capped") {
    return (
      <div className="rounded-lg border border-yellow/40 bg-yellow/5 p-3 text-sm">
        <p className="text-dim">{state.message}</p>
        <Link href="/pricing" className="mt-1 inline-block text-xs font-medium text-cyan hover:underline">
          See plans →
        </Link>
      </div>
    );
  }

  if (state.kind === "naming" || state.kind === "saving") {
    return (
      <div className="flex gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setState({ kind: "idle" });
          }}
          maxLength={60}
          placeholder="Name it — e.g. House at $420k"
          aria-label="Scenario name"
          className="input flex-1 !py-2 text-sm"
        />
        <button
          type="button"
          onClick={save}
          disabled={!name.trim() || state.kind === "saving"}
          className="btn btn-primary !px-3 !py-2 text-sm disabled:opacity-50"
        >
          {state.kind === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setState({ kind: "naming" })}
      className="w-full rounded-lg border border-white/10 px-4 py-2.5 text-sm font-medium text-dim transition-colors hover:border-cyan/30 hover:text-cyan"
    >
      Save as scenario
    </button>
  );
}
