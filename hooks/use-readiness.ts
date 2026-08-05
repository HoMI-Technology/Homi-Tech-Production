/**
 * useReadinessAnchors — loads the simulator baseline + anchors for the
 * readiness band. Mount-only, SSR-safe. Null when the user has no saved
 * finance state (the band shows nothing rather than a verdict on air).
 *
 * The simulator (and the scoring engine it wraps) is dynamic-imported only
 * when finance state exists. Public Lighthouse routes never have that state,
 * so this keeps the §11 script budget from shipping ~scoring into every
 * tools page that merely *can* show a readiness band.
 */

"use client";

import { useEffect, useState } from "react";
import type { SimulatorAnchors, SimulatorBaseline } from "@/lib/simulator";
import { hasSavedFinanceState, loadFinanceState } from "@/lib/finance/store";
import { loadLocalResult } from "@/lib/assessment/storage";

export interface ReadinessContext {
  baseline: SimulatorBaseline;
  anchors: SimulatorAnchors;
}

export function useReadinessAnchors(): ReadinessContext | null {
  const [ctx, setCtx] = useState<ReadinessContext | null>(null);

  useEffect(() => {
    if (!hasSavedFinanceState()) return;
    let cancelled = false;
    void import("@/lib/simulator").then(({ seedBaseline, deriveAnchors }) => {
      if (cancelled) return;
      const baseline = seedBaseline(null, loadFinanceState());
      const stored = loadLocalResult();
      const anchors = deriveAnchors(
        stored
          ? {
              emotional_score: stored.result.emotional.total,
              timing_score: stored.result.timing.total,
              inputs: stored.inputs as unknown as Record<string, unknown>,
            }
          : null,
      );
      setCtx({ baseline, anchors });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return ctx;
}
