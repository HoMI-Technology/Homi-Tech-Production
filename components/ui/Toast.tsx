"use client";

import { motion } from "framer-motion";
import { useEffect } from "react";

export type ToastVariant = "success" | "error" | "warning";

export interface ToastItem {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

const variantStyles: Record<ToastVariant, { border: string; icon: string; glow: string }> = {
  success: {
    border: "border-emerald/30",
    icon: "text-emerald",
    glow: "shadow-[0_0_24px_-6px_rgba(52,211,153,0.35)]",
  },
  error: {
    border: "border-crimson/30",
    icon: "text-crimson",
    glow: "shadow-[0_0_24px_-6px_rgba(242,72,34,0.35)]",
  },
  warning: {
    border: "border-amber/30",
    icon: "text-amber",
    glow: "shadow-[0_0_24px_-6px_rgba(250,182,51,0.35)]",
  },
};

function ToastIcon({ variant }: { variant: ToastVariant }) {
  if (variant === "success") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path
          d="M4 10.5L8 14.5L16 6.5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (variant === "error") {
    return (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M6 6L14 14M14 6L6 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 6V10M10 14H10.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const { id, message, variant, duration = 4000 } = toast;
  const styles = variantStyles[variant];

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      role="alert"
      className={`glass flex items-center gap-3 px-4 py-3 pr-3 ${styles.glow} border ${styles.border} min-w-[280px] max-w-[420px]`}
    >
      <span className={`shrink-0 ${styles.icon}`}>
        <ToastIcon variant={variant} />
      </span>
      <span className="text-sm text-light">{message}</span>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        className="ml-auto shrink-0 rounded-md p-1 text-dim/70 transition-colors hover:bg-slate-surface hover:text-light"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </motion.div>
  );
}
