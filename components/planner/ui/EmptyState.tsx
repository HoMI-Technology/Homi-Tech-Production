"use client";

import { motion } from "framer-motion";

/** Planner empty state — serif-italic line + optional CTA. */
export default function EmptyState({
  line = "Nothing here yet — your readiness starts with one entry.",
  caption,
  actionLabel,
  onAction,
  illustration = false,
  compact = false,
}: {
  line?: string;
  caption?: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: boolean;
  compact?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`flex flex-col items-center justify-center text-center ${compact ? "py-8" : "py-14"}`}
    >
      {illustration && (
        <div
          className={`rounded-full border border-dashed border-line bg-slate-surface/40 ${compact ? "h-16 w-16" : "h-24 w-24"}`}
          aria-hidden
        />
      )}
      <p
        className={`font-display italic text-light/90 ${compact ? "mt-3 text-lg" : "mt-5 text-xl"}`}
      >
        {line}
      </p>
      {caption && <p className="mt-1.5 max-w-sm text-sm text-dim">{caption}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-5 rounded-xl bg-cyan px-4 py-2 text-sm font-semibold text-navy"
        >
          {actionLabel}
        </button>
      )}
    </motion.div>
  );
}
