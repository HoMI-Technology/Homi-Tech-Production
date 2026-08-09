"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type ToastVariant = "success" | "error" | "warning";
export type ToastPlacement = "top-right" | "bottom-center";
export type ToastRole = "alert" | "status";

/**
 * Why a toast left the screen. "suppressed" means a higher-priority toast at
 * the same placement displaced it (the successor to the old
 * [data-priority-notice] DOM-attribute protocol).
 */
export type ToastDismissReason = "timeout" | "manual" | "suppressed";

/**
 * Custom toast body. The render-prop form receives the system's dismiss
 * callback so bespoke cards (ImpactToast, SessionExpiredToast) can keep their
 * own dismiss controls and aria-labels.
 */
export type ToastContent = ReactNode | ((dismiss: () => void) => ReactNode);

export interface ToastItem {
  id: string;
  message?: string;
  content?: ToastContent;
  variant: ToastVariant;
  /** Auto-dismiss window in ms; null keeps the toast until dismissed. */
  duration: number | null;
  placement: ToastPlacement;
  role: ToastRole;
  /** Higher priority suppresses lower at the same placement while visible. */
  priority: number;
  /** Hover/focus pauses the auto-dismiss timer (ImpactToast parity). */
  pauseOnHover: boolean;
  /** Card class override for custom-content toasts. */
  className?: string;
  onDismiss?: (reason: ToastDismissReason) => void;
}

/** Floor on resume-after-pause so a toast never vanishes mid-glance. */
const MIN_RESUME_MS = 400;

/**
 * Auto-dismiss with pause banking: pausing stores the remaining time and
 * resuming restarts from what was left (never under MIN_RESUME_MS). A new
 * toast instance always starts with its full window — replacement creates a
 * fresh component, so a replaced toast cannot inherit a shrunken window.
 */
function useToastTimer(duration: number | null, paused: boolean, onTimeout: () => void): void {
  const remainingRef = useRef(duration ?? 0);
  const onTimeoutRef = useRef(onTimeout);
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);
  useEffect(() => {
    if (duration === null || paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => onTimeoutRef.current(), remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current = Math.max(
        MIN_RESUME_MS,
        remainingRef.current - (Date.now() - startedAt),
      );
    };
  }, [duration, paused]);
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
        <path
          d="M6 6L14 14M14 6L6 14"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 6V10M10 14H10.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function renderContent(toast: ToastItem, dismiss: () => void): ReactNode {
  return typeof toast.content === "function" ? toast.content(dismiss) : toast.content;
}

/** Standard stacked toast card (top-right queue). */
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string, reason: ToastDismissReason) => void;
}) {
  const { id, message, variant, duration, role, pauseOnHover } = toast;
  const styles = variantStyles[variant];
  const [paused, setPaused] = useState(false);

  useToastTimer(duration, paused, () => onDismiss(id, "timeout"));

  const pauseHandlers = pauseOnHover
    ? {
        onMouseEnter: () => setPaused(true),
        onMouseLeave: () => setPaused(false),
        onFocus: () => setPaused(true),
        onBlur: () => setPaused(false),
      }
    : {};

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      aria-atomic={role === "status" ? "true" : undefined}
      className={`glass flex items-center gap-3 px-4 py-3 pr-3 ${styles.glow} border ${styles.border} min-w-[280px] max-w-[420px]`}
      {...pauseHandlers}
    >
      {toast.content !== undefined ? (
        renderContent(toast, () => onDismiss(id, "manual"))
      ) : (
        <>
          <span className={`shrink-0 ${styles.icon}`}>
            <ToastIcon variant={variant} />
          </span>
          <span className="text-sm text-light">{message}</span>
        </>
      )}
      <button
        onClick={() => onDismiss(id, "manual")}
        aria-label="Dismiss"
        className="ml-auto shrink-0 rounded-md p-1 text-dim/70 transition-colors hover:bg-slate-surface hover:text-light"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <path
            d="M3 3L11 11M11 3L3 11"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </motion.div>
  );
}

/**
 * Bottom-center toast (session/security notices, Path progress). The fixed
 * wrapper carries the live-region role and the pause handlers, matching the
 * pre-consolidation ImpactToast DOM so screen readers and tests see the same
 * surface. Each instance is portaled by ToastProvider as a direct child of
 * document.body — ancestor will-change wrappers can never un-fix it.
 *
 * Bottom offset — narrow viewports: the toast spans nearly full width, so it
 * must clear the Companion launcher (h-14 at bottom-6 right-6) — same
 * clearance formula as the Companion panel. From sm up the centered max-w-md
 * card cannot reach the right corner, so it returns to the bottom baseline.
 */
export function BottomCenterToast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string, reason: ToastDismissReason) => void;
}) {
  const { id, role, duration, pauseOnHover } = toast;
  const [paused, setPaused] = useState(false);

  useToastTimer(duration, paused, () => onDismiss(id, "timeout"));

  const dismiss = () => onDismiss(id, "manual");
  const pauseHandlers = pauseOnHover
    ? {
        onMouseEnter: () => setPaused(true),
        onMouseLeave: () => setPaused(false),
        onFocus: () => setPaused(true),
        onBlur: () => setPaused(false),
      }
    : {};

  return (
    <div
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      aria-atomic={role === "status" ? "true" : undefined}
      className="fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] z-[var(--z-toast)] flex justify-center px-4 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
      {...pauseHandlers}
    >
      <div
        className={
          toast.className ?? "glass flex max-w-md flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
        }
      >
        {toast.content !== undefined ? (
          renderContent(toast, dismiss)
        ) : (
          <>
            <p className="text-sm text-light">{toast.message}</p>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="btn btn-ghost btn-sm shrink-0"
            >
              Dismiss
            </button>
          </>
        )}
      </div>
    </div>
  );
}
