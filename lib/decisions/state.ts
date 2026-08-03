/**
 * Decision Rehearsal state — local-first persistence for simulation inputs.
 *
 * The Decisions page reconstructs its inputs from defaults on every load,
 * which loses the user's context when they navigate away. This module keeps
 * the last set of inputs in localStorage so the rehearsal resumes where they
 * left it. Reads are synchronous/local-first; writes happen only in response
 * to explicit user edits (the same honesty rule as the tools overlay).
 *
 * SSR-safe: all storage access is window-guarded.
 */

import { DEFAULT_SIMULATION_INPUTS, type SimulationInputs } from "./simulate";

const STORAGE_KEY = "homi:decision:inputs";

/** Load saved decision inputs, falling back to defaults. SSR-safe. */
export function loadDecisionInputs(): SimulationInputs {
  if (typeof window === "undefined") return DEFAULT_SIMULATION_INPUTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SIMULATION_INPUTS;
    const parsed = JSON.parse(raw) as Partial<SimulationInputs>;
    if (!parsed || typeof parsed !== "object") return DEFAULT_SIMULATION_INPUTS;
    return { ...DEFAULT_SIMULATION_INPUTS, ...pickNumericFields(parsed) };
  } catch {
    return DEFAULT_SIMULATION_INPUTS;
  }
}

/** Save decision inputs to localStorage. SSR-safe no-op on the server. */
export function saveDecisionInputs(inputs: SimulationInputs): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pickNumericFields(inputs)));
  } catch {
    // Storage unavailable — the page still works for this session.
  }
}

/** Keep only the expected numeric fields so corrupted storage can't grow. */
function pickNumericFields(parsed: Partial<SimulationInputs>): Partial<SimulationInputs> {
  const keys: (keyof SimulationInputs)[] = [
    "homePrice",
    "downPaymentSaved",
    "monthlySavings",
    "rent",
    "rate",
    "appreciation",
    "rentIncrease",
  ];
  const result: Partial<SimulationInputs> = {};
  for (const key of keys) {
    const value = parsed[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      result[key] = value;
    }
  }
  return result;
}
