"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type ToastVariant = "success" | "error" | "warning";
export type ToastPlacement = "top-right" | "bottom-center";
export type ToastRole = "alert" | "status";

/**
 * Why a toast left the screen. "suppressed" means a higher-priority toast at
 * the same placement displaced it out of the queue entirely (hard drop when
 * the deferred queue is at capacity), not a temporary deferral.
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
  /**
   * Bumped when the same announcement text repeats so screen readers re-read
   * the live region (F.6(d)).
   */
  announceSeq: number;
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

/**
 * WCAG 2.2.1: pause time limits when the user leaves the window, not only on
 * hover. `document.hidden` covers tab switches; window blur/focus covers
 * focus moving to another app while the tab stays visible.
 *
 * Event-driven (not document.hasFocus() polling): jsdom reports hasFocus()
 * as false by default, which would permanently freeze every toast timer.
 */
export function useDocumentPause(): boolean {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const pause = () => setPaused(true);
    const resume = () => setPaused(document.hidden);
    const onVisibility = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", pause);
    window.addEventListener("focus", resume);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", pause);
      window.removeEventListener("focus", resume);
    };
  }, []);
  return paused;
}

function useToastPause(pauseOnHover: boolean): {
  paused: boolean;
  pauseHandlers: {
    onMouseEnter?: () => void;
    onMouseLeave?: () => void;
    onFocus?: () => void;
    onBlur?: () => void;
  };
} {
  const documentPaused = useDocumentPause();
  const [hoverPaused, setHoverPaused] = useState(false);
  const paused = documentPaused || (pauseOnHover && hoverPaused);
  const pauseHandlers = pauseOnHover
    ? {
        onMouseEnter: () => setHoverPaused(true),
        onMouseLeave: () => setHoverPaused(false),
        onFocus: () => setHoverPaused(true),
        onBlur: () => setHoverPaused(false),
      }
    : {};
  return { paused, pauseHandlers };
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

/**
 * Framer belt-and-braces (F.6): willChange only while the card is moving —
 * set on every variant target that needs compositing, cleared via
 * transitionEnd when the enter spring settles. onAnimationComplete is the
 * fallback if transitionEnd is skipped (upstream regressions: motion #2317,
 * 12.31.1 changelog). Exported for the structural unit contract.
 */
export const toastMotionVariants = {
  initial: { opacity: 0, y: -20, scale: 0.95, willChange: "transform, opacity" },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transitionEnd: { willChange: "auto" },
  },
  exit: { opacity: 0, x: 40, scale: 0.95, willChange: "transform, opacity" },
};

/** Standard stacked toast card (top-right queue). */
export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string, reason: ToastDismissReason) => void;
}) {
  const { id, message, variant, duration, role, pauseOnHover, announceSeq } = toast;
  const styles = variantStyles[variant];
  const { paused, pauseHandlers } = useToastPause(pauseOnHover);
  const nodeRef = useRef<HTMLDivElement | null>(null);

  useToastTimer(duration, paused, () => onDismiss(id, "timeout"));

  return (
    <motion.div
      ref={nodeRef}
      layout
      variants={toastMotionVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      onAnimationComplete={() => {
        // Fallback when transitionEnd does not fire: dissolve the containing
        // block so position:fixed descendants elsewhere stay viewport-pinned.
        if (nodeRef.current) nodeRef.current.style.willChange = "auto";
      }}
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      aria-atomic={role === "status" ? "true" : undefined}
      data-announce-seq={announceSeq}
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
          <span className="text-sm text-light">
            {/* Alternating nbsp forces SR re-announce of identical copy (F.6(d)). */}
            {message}
            {announceSeq > 0 ? (announceSeq % 2 === 0 ? "\u00A0" : "\u200B") : null}
          </span>
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
 * Bottom-center toast card. Positioning lives on the persistent viewport in
 * ToastProvider (F.6(a)); this card only owns role/live-region semantics and
 * pause handlers so the viewport can stay mounted with or without children.
 */
export function BottomCenterToast({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: string, reason: ToastDismissReason) => void;
}) {
  const { id, role, duration, pauseOnHover, announceSeq, message } = toast;
  const { paused, pauseHandlers } = useToastPause(pauseOnHover);

  useToastTimer(duration, paused, () => onDismiss(id, "timeout"));

  const dismiss = () => onDismiss(id, "manual");

  return (
    <div
      role={role}
      aria-live={role === "status" ? "polite" : undefined}
      aria-atomic={role === "status" ? "true" : undefined}
      data-announce-seq={announceSeq}
      className="w-full max-w-md"
      {...pauseHandlers}
    >
      <div
        className={
          toast.className ?? "glass flex max-w-md flex-wrap items-center gap-3 p-4 sm:flex-nowrap"
        }
      >
        {toast.content !== undefined ? (
          <>
            {/* sr-only tick re-announces custom-content repeats without changing the card. */}
            {announceSeq > 0 ? (
              <span className="sr-only">{announceSeq % 2 === 0 ? "\u00A0" : "\u200B"}</span>
            ) : null}
            {renderContent(toast, dismiss)}
          </>
        ) : (
          <>
            <p className="text-sm text-light">
              {message}
              {announceSeq > 0 ? (announceSeq % 2 === 0 ? "\u00A0" : "\u200B") : null}
            </p>
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
