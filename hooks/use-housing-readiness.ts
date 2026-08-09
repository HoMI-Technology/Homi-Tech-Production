/**
 * Debounced housing readiness band via POST /api/simulator (Plans.md 6.4).
 * Keeps the scoring engine out of the client module graph.
 */

"use client";

import { useEffect, useState } from "react";
import type { HousingImpactOptions, ReadinessImpact } from "@/lib/tools/readiness-impact";
import { fetchSimulatorBatch } from "@/lib/simulator/client";
import { useReadinessAnchors } from "@/hooks/use-readiness";

const DEBOUNCE_MS = 250;

/**
 * Returns the magnitude-only readiness impact for a housing hypothetical.
 * Null when the user has no saved finance baseline or the API fails soft.
 */
export function useHousingReadinessImpact(
  opts: HousingImpactOptions | null,
): ReadinessImpact | null {
  const ctx = useReadinessAnchors();
  const [impact, setImpact] = useState<ReadinessImpact | null>(null);

  const obligation = opts?.monthlyObligation;
  const upfront = opts?.upfrontCost ?? 0;
  const replaced = opts?.replacedRentMonthly ?? 0;

  useEffect(() => {
    if (!ctx || opts == null || obligation == null || !Number.isFinite(obligation)) {
      setImpact(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchSimulatorBatch({
        baseline: ctx.baseline,
        anchorAssessment: ctx.anchorAssessment,
        include: {
          current: false,
          simulated: false,
          rank: false,
          anchors: false,
          housing: {
            monthlyObligation: obligation,
            upfrontCost: upfront,
            replacedRentMonthly: replaced,
          },
        },
      })
        .then((res) => {
          if (!cancelled) setImpact(res.housing ?? null);
        })
        .catch(() => {
          if (!cancelled) setImpact(null);
        });
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [ctx, obligation, upfront, replaced, opts]);

  return impact;
}
// note: `opts` null-check only; obligation/upfront/replaced are the numeric deps
