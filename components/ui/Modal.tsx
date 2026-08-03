"use client";

/**
 * Modal — shared dialog primitive (task 3.5).
 *
 * Portals to document.body: the root ClientProviders page-transition wrapper
 * holds will-change:transform while a route transition runs, which makes it
 * the containing block for fixed descendants — a fixed overlay rendered in
 * place pins to the page, not the viewport (same rationale as ImpactToast).
 *
 * Behavior contract:
 * - role="dialog" + aria-modal, named via aria-labelledby (preferred) or
 *   aria-label
 * - focus trap (Tab / Shift+Tab cycle, boundary-only — hooks/useFocusTrap)
 * - Escape closes; focus returns to the pre-open trigger on close
 * - y-only body scroll lock (hooks/useScrollLock — never overflow-x:hidden,
 *   which kills position:sticky pin stages)
 * - backdrop click-to-close (opt out via closeOnBackdrop={false} for
 *   destructive flows)
 * - stacks at var(--z-modal); entrance matches ShortcutHelp's fade + spring
 *   and is reduced-motion-safe via useReducedMotion
 */

import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useFocusTrap, getFocusable } from "@/hooks/useFocusTrap";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** id of the element inside the panel that titles the dialog (preferred). */
  labelledBy?: string;
  /** Accessible name fallback when no visible heading exists. */
  label?: string;
  /** Clicking the backdrop closes the dialog. Default true. */
  closeOnBackdrop?: boolean;
  /** Focused on open; falls back to the first focusable, then the panel. */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** Panel chrome — defaults to the settings-modal glass card. */
  panelClassName?: string;
  /** Backdrop paint — defaults to the repo-standard navy/80 blur. */
  backdropClassName?: string;
}

export function Modal({
  open,
  onClose,
  children,
  labelledBy,
  label,
  closeOnBackdrop = true,
  initialFocusRef,
  panelClassName = "glass w-full max-w-md p-6 sm:p-8",
  backdropClassName = "bg-navy/80 backdrop-blur-sm",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useScrollLock(open);
  useFocusTrap(panelRef, open);

  // Initial focus in, focus return out. The pre-open activeElement is captured
  // when `open` flips true and restored by the cleanup when it flips false.
  useEffect(() => {
    if (!open) return;
    const previous =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const target =
      initialFocusRef?.current ?? (panel ? getFocusable(panel)[0] : undefined) ?? panel;
    target?.focus();
    return () => {
      previous?.focus();
    };
  }, [open, initialFocusRef]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      // defaultPrevented = a higher layer (e.g. CommandPalette over this
      // modal) already consumed this Escape — one layer closes per press.
      if (e.key === "Escape" && !e.defaultPrevented) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Client-only portal; SSR renders nothing (open is client-state-driven).
  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reducedMotion ? {} : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
        >
          <div
            className={`absolute inset-0 ${backdropClassName}`}
            aria-hidden="true"
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            aria-label={labelledBy ? undefined : label}
            tabIndex={-1}
            initial={reducedMotion ? {} : { opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, scale: 0.96, y: 10 }}
            transition={reducedMotion ? {} : { type: "spring", stiffness: 400, damping: 30 }}
            className={`relative ${panelClassName}`}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
