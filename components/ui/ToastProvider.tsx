"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence } from "framer-motion";
import {
  BottomCenterToast,
  Toast,
  type ToastContent,
  type ToastDismissReason,
  type ToastItem,
  type ToastPlacement,
  type ToastRole,
  type ToastVariant,
} from "./Toast";

/**
 * Shared priority scale. Higher-priority toasts suppress lower-priority ones
 * at the same placement while visible — this replaces the old
 * [data-priority-notice] DOM-attribute + MutationObserver protocol.
 */
export const TOAST_PRIORITY = {
  /** Routine feedback: saves, Path progress, informational notices. */
  base: 0,
  /** Session/security notices — always outrank routine feedback. */
  security: 100,
} as const;

export interface ToastOptions {
  message?: string;
  /** Custom card body; the render-prop form receives the dismiss callback. */
  content?: ToastContent;
  variant?: ToastVariant;
  /** ms until auto-dismiss (default 4000); null keeps the toast until dismissed. */
  duration?: number | null;
  placement?: ToastPlacement;
  role?: ToastRole;
  priority?: number;
  pauseOnHover?: boolean;
  /** Card class override for custom-content toasts. */
  className?: string;
  /** Fired when the system removes the toast (timeout/manual/suppressed). */
  onDismiss?: (reason: ToastDismissReason) => void;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  /**
   * Full-control toast entry point. Returns the toast id, or null when a
   * higher-priority toast at the same placement is visible (the caller's
   * toast is suppressed and never displayed).
   */
  notify: (options: ToastOptions) => string | null;
  /**
   * Remove a toast. reason defaults to "manual" (fires the toast's onDismiss);
   * pass null to retract silently — for controllers replacing or unmounting
   * their own toast, where side effects must not run.
   */
  dismiss: (id: string, reason?: ToastDismissReason | null) => void;
  /** Would a toast at this priority/placement currently be suppressed? */
  isSuppressed: (priority: number, placement: ToastPlacement) => boolean;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToastContext() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToastContext must be used within a ToastProvider");
  }
  return ctx;
}

let toastIdCounter = 0;

function generateToastId() {
  return `toast-${++toastIdCounter}-${Date.now().toString(36)}`;
}

/**
 * Unified toast system using React Context + Framer Motion. Mount once at the
 * app root (inside layout.tsx), then call `useToast()` from any client
 * component. Supports two placements (stacked top-right queue and single
 * bottom-center notices), per-toast role/duration/pause, and priority
 * suppression. Both containers portal to document.body as belt-and-braces
 * against ancestor containing blocks (e.g. a transient will-change on the
 * page-transition wrapper), with z pinned to the shared var(--z-toast) scale.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Ref mirror so notify/dismiss/isSuppressed can read synchronously — notify
  // must return the suppression verdict in the same tick it is called.
  const toastsRef = useRef<ToastItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const commit = useCallback((next: ToastItem[]) => {
    toastsRef.current = next;
    setToasts(next);
  }, []);

  const dismiss = useCallback(
    (id: string, reason: ToastDismissReason | null = "manual") => {
      const target = toastsRef.current.find((t) => t.id === id);
      if (!target) return;
      commit(toastsRef.current.filter((t) => t.id !== id));
      if (reason) target.onDismiss?.(reason);
    },
    [commit],
  );

  const isSuppressed = useCallback(
    (priority: number, placement: ToastPlacement) =>
      toastsRef.current.some((t) => t.placement === placement && t.priority > priority),
    [],
  );

  const notify = useCallback(
    (options: ToastOptions): string | null => {
      const placement = options.placement ?? "top-right";
      const priority = options.priority ?? TOAST_PRIORITY.base;
      const current = toastsRef.current;
      // A visible higher-priority toast at this placement suppresses arrivals…
      if (current.some((t) => t.placement === placement && t.priority > priority)) {
        return null;
      }
      // …and a higher-priority arrival displaces visible lower-priority toasts.
      const outranked = current.filter((t) => t.placement === placement && t.priority < priority);
      const id = generateToastId();
      const item: ToastItem = {
        id,
        message: options.message,
        content: options.content,
        variant: options.variant ?? "success",
        duration: options.duration === undefined ? 4000 : options.duration,
        placement,
        role: options.role ?? "alert",
        priority,
        pauseOnHover: options.pauseOnHover ?? false,
        className: options.className,
        onDismiss: options.onDismiss,
      };
      commit([...current.filter((t) => !outranked.includes(t)), item]);
      for (const t of outranked) t.onDismiss?.("suppressed");
      return id;
    },
    [commit],
  );

  const show = useCallback(
    (message: string, variant: ToastVariant = "success", duration = 4000) => {
      notify({ message, variant, duration });
    },
    [notify],
  );

  const success = useCallback(
    (message: string, duration?: number) => show(message, "success", duration),
    [show],
  );
  const error = useCallback(
    (message: string, duration?: number) => show(message, "error", duration),
    [show],
  );
  const warning = useCallback(
    (message: string, duration?: number) => show(message, "warning", duration),
    [show],
  );

  const value = useMemo(
    () => ({ show, success, error, warning, notify, dismiss, isSuppressed }),
    [show, success, error, warning, notify, dismiss, isSuppressed],
  );

  const topRight = toasts.filter((t) => t.placement === "top-right");
  const bottomCenter = toasts.filter((t) => t.placement === "bottom-center");

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Portal after mount only: the server renders nothing here, and toasts
          can only be enqueued client-side, so hydration always matches. */}
      {mounted
        ? createPortal(
            <>
              {/* Stacked queue — fixed top-right, responsive padding */}
              <div
                role="region"
                aria-label="Notifications"
                className="fixed right-0 top-0 z-[var(--z-toast)] flex flex-col items-end gap-2 p-4 sm:p-6"
              >
                <AnimatePresence mode="popLayout">
                  {topRight.map((toast) => (
                    <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
                  ))}
                </AnimatePresence>
              </div>
              {/* Bottom-center notices — each wrapper is a direct child of
                  document.body so the live-region element itself escapes any
                  ancestor containing block. */}
              {bottomCenter.map((toast) => (
                <BottomCenterToast key={toast.id} toast={toast} onDismiss={dismiss} />
              ))}
            </>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}
