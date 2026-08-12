"use client";

import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { COLORS } from "@/lib/brand";
import type { AssessmentResult } from "@/lib/scoring/public";

/**
 * Warnings banner — amber, slim, canon protective tone.
 * Only rendered while warnings.length > 0.
 */
export function WarningsBanner({ result }: { result: AssessmentResult }) {
  const show = result.warnings.length > 0;
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          key="warnings"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 28 }}
          className="overflow-hidden"
        >
          <div className="flex flex-col gap-2 rounded-2xl border border-amber/30 bg-amber/10 px-5 py-3.5 backdrop-blur-sm">
            {result.warnings.map((warning) => (
              <div
                key={warning.code}
                className="flex items-start gap-2.5 text-sm leading-relaxed text-light/90"
              >
                <TriangleAlert
                  size={15}
                  className="mt-0.5 shrink-0"
                  style={{ color: COLORS.amber }}
                />
                {warning.message}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
