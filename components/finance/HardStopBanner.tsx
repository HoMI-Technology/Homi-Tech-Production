"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";
import { COLORS, withAlpha } from "@/lib/brand";
import type { AssessmentResult } from "@/lib/scoring/engine";

/**
 * Hard-stop crimson banner — only rendered while hardStops.length > 0.
 * Protective copy adapted to the finance surface AssessmentResult shape.
 */
export function HardStopBanner({ result }: { result: AssessmentResult }) {
  const show = result.hardStops.length > 0;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="hard-stops"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
          className="overflow-hidden"
        >
          <div className="rounded-2xl border border-crimson/30 bg-crimson/10 p-5 backdrop-blur-sm">
            <div className="flex items-center gap-2.5">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full text-crimson"
                style={{ background: withAlpha(COLORS.crimson, 0.15) }}
              >
                <ShieldAlert size={16} />
              </span>
              <h2 className="font-display text-lg font-semibold text-light">
                A red line, not a rejection.
              </h2>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {result.hardStops.map((stop) => (
                <li key={stop.code} className="flex gap-2.5 text-sm leading-relaxed text-light/90">
                  <span
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: COLORS.crimson }}
                  />
                  {stop.message}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
