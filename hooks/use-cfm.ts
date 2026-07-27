/**
 * useCfm — client hook for the Canonical Financial Model.
 *
 * Reads are mount-only (mirroring the prefill pattern): the CFM hydrates
 * once on mount and never fights live slider edits afterward. Returns
 * null until mounted so SSR and first paint render identical fallback
 * markup — no hydration mismatch.
 */

"use client";

import { useEffect, useState } from "react";
import {
  buildCfm,
  loadToolsOverlay,
  type CanonicalFinancialModel,
  type ToolsOverlay,
} from "@/lib/tools/cfm";

export interface CfmState {
  /** The user's real model, or null when no finance data is saved
   * (the honesty gate — fall back to illustrative defaults). */
  cfm: CanonicalFinancialModel | null;
  /** Lens-overlay fields regardless of finance-save state. */
  overlay: ToolsOverlay;
  /** False during SSR and first paint, true after mount hydration. */
  hydrated: boolean;
}

export function useCfm(): CfmState {
  const [state, setState] = useState<CfmState>({ cfm: null, overlay: {}, hydrated: false });

  useEffect(() => {
    setState({ cfm: buildCfm(), overlay: loadToolsOverlay(), hydrated: true });
  }, []);

  return state;
}
