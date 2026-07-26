/**
 * useLensPrefill — the mount-only CFM seed for lens pages.
 *
 * One hook replaces the per-page boilerplate: on mount it resolves the
 * lens's input seeds from the CFM via the registry contract, applies them
 * through the page's setters, records which inputs were seeded (those
 * render the "your numbers" tag), and exposes the raw finance state for
 * pages that compute impact deltas.
 *
 * Mount-only by design — it never fights live edits afterward. Pages keep
 * their illustrative defaults (and show no tags) when nothing is saved.
 */

"use client";

import { useEffect, useState } from "react";
import { buildCfm } from "@/lib/tools/cfm";
import { getLens, resolveLensSeeds } from "@/lib/tools/registry";
import { useCfm } from "@/hooks/use-cfm";
import {
  loadFinanceState,
  hasSavedFinanceState,
  type FinanceState,
} from "@/lib/finance/store";

export interface LensPrefillState {
  /** Input keys seeded from the CFM — pass to fields as source="yours". */
  prefilled: Set<string>;
  /** The raw finance state when saved (deltas inputs), else null. */
  finance: FinanceState | null;
  /** Lens overlay fields regardless of finance-save state. */
  overlay: ReturnType<typeof useCfm>["overlay"];
  /** False during SSR and first paint. */
  hydrated: boolean;
  /** Mark keys as user-confirmed after an explicit write-back. */
  markAll: (keys: string[]) => void;
}

export function useLensPrefill(
  lensId: string,
  apply: (key: string, value: number) => void,
): LensPrefillState {
  const [prefilled, setPrefilled] = useState<Set<string>>(new Set());
  const [finance, setFinance] = useState<FinanceState | null>(null);
  const { overlay, hydrated } = useCfm();

  useEffect(() => {
    const lens = getLens(lensId);
    if (!lens) return;
    if (hasSavedFinanceState()) setFinance(loadFinanceState());
    const cfm = buildCfm();
    if (!cfm) return;
    const seeds = resolveLensSeeds(lens, cfm);
    const keys = Object.keys(seeds);
    if (keys.length === 0) return;
    for (const key of keys) apply(key, seeds[key]);
    setPrefilled(new Set(keys));
    // apply is a per-page dispatcher over stable setState functions; it
    // intentionally runs once on mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    prefilled,
    finance,
    overlay,
    hydrated,
    markAll: (keys: string[]) => setPrefilled(new Set(keys)),
  };
}
