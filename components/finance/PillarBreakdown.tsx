"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { COLORS, PILLARS } from "@/lib/brand";
import { withAlpha } from "@/lib/brand";
import type { AssessmentResult } from "@/lib/scoring/engine";
import { toScoreResult, type PillarKey } from "./readiness-types";

const PILLAR_COLOR: Record<PillarKey, string> = {
  financial: COLORS.cyan,
  emotional: COLORS.emerald,
  timing: COLORS.yellow,
};

const PILLAR_ORDER: PillarKey[] = ["financial", "emotional", "timing"];

/**
 * Pillar breakdown card — three animated pillar bars plus the collapsible
 * "See the math" sub-factor disclosure.
 */
export function PillarBreakdown({ result }: { result: AssessmentResult }) {
  const [showMath, setShowMath] = useState(false);
  const scoreResult = toScoreResult(result);

  return (
    <div className="glass flex h-full flex-col p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-dim">
          Pillar Breakdown
        </span>
        <span className="text-xs font-semibold uppercase tracking-widest text-dim">
          Points earned
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-5">
        {PILLAR_ORDER.map((key, i) => {
          const pillar = scoreResult.pillars[key];
          const color = PILLAR_COLOR[key];
          const meta = PILLARS.find((p) => p.key === key)!;
          const frac = pillar.max > 0 ? pillar.total / pillar.max : 0;

          return (
            <div key={key}>
              <div className="flex items-baseline justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-light">{meta.name}</p>
                  <p className="mt-0.5 truncate text-xs text-dim">{meta.question}</p>
                </div>
                <AnimatedNumber
                  value={pillar.total}
                  format={(n) => `${Math.round(n)} / ${pillar.max}`}
                  className="shrink-0 font-mono text-sm tabular-nums text-light"
                />
              </div>
              <div className="mt-2 h-[6px] overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${frac * 100}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 120,
                    damping: 26,
                    delay: 0.1 + i * 0.06,
                  }}
                  className="h-full rounded-full"
                  style={{
                    backgroundColor: color,
                    boxShadow: `0 0 10px ${withAlpha(color, 0.4)}`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* "See the math" disclosure */}
      <button
        type="button"
        onClick={() => setShowMath((v) => !v)}
        className="mt-5 flex w-fit items-center gap-1.5 text-xs font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
        aria-expanded={showMath}
      >
        <ChevronDown
          size={14}
          className={`transition-transform duration-200 ${showMath ? "rotate-180" : ""}`}
        />
        {showMath ? "Hide the math" : "See the math"}
      </button>

      <AnimatePresence initial={false}>
        {showMath && (
          <motion.div
            key="math"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 28 }}
            className="overflow-hidden"
          >
            <div className="mt-4 flex flex-col gap-5 border-t border-white/[0.06] pt-4">
              {PILLAR_ORDER.map((key) => {
                const pillar = scoreResult.pillars[key];
                const color = PILLAR_COLOR[key];
                const meta = PILLARS.find((p) => p.key === key)!;

                return (
                  <div key={key}>
                    <p
                      className="text-xs font-semibold uppercase tracking-widest"
                      style={{ color }}
                    >
                      {meta.name}
                    </p>
                    <div className="mt-2.5 flex flex-col gap-2.5">
                      {pillar.factors.map((f) => {
                        const frac = f.max > 0 ? f.pts / f.max : 0;
                        return (
                          <div key={f.key} className="flex items-center gap-3">
                            <span className="w-32 shrink-0 truncate text-xs text-dim">
                              {f.label}
                            </span>
                            <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${frac * 100}%` }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="h-full rounded-full"
                                style={{ backgroundColor: color }}
                              />
                            </div>
                            <span className="w-14 shrink-0 text-right font-mono text-xs tabular-nums text-dim">
                              {f.pts} / {f.max}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PillarBreakdown;
