/**
 * useCfm — client hook for the Canonical Financial Model.
 *
 * Reads are mount-only (mirroring the prefill pattern): the CFM hydrates
 * once on mount and never fights live slider edits afterward. Returns
 * null until mounted so SSR and first paint render identical fallback
 * markup — no hydration mismatch.
 *
 * The overlay is also reconciled with the server copy on mount so
 * lens-derived values follow the user across devices (audit T2.6).
 */

"use client";

import { useEffect, useState } from "react";
import {
  buildCfm,
  loadToolsOverlay,
  pullToolsOverlay,
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
    let cancelled = false;
    // Hydrate immediately from localStorage so first paint is instant...
    setState({ cfm: buildCfm(), overlay: loadToolsOverlay(), hydrated: true });
    // ...then reconcile with the server copy in the background.
    void pullToolsOverlay().then((overlay) => {
      if (cancelled || !overlay) return;
      setState((prev) => ({ ...prev, overlay }));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
