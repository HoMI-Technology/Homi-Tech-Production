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
  type RefObject,
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

/**
 * Visible stack limits per placement (F.6(e) — ecosystem norm is
 * stack-with-limit; sonner defaults visibleToasts=3). Excess arrivals wait in
 * the deferred queue and promote when a slot opens.
 */
export const TOAST_MAX_VISIBLE: Record<ToastPlacement, number> = {
  "top-right": 3,
  "bottom-center": 1,
};

/** Hard cap on deferred toasts per placement before the oldest is dropped. */
export const TOAST_MAX_QUEUED = 5;

/** Radix-aligned viewport hotkey so keyboard users can reach toasts (F.6(c)). */
export const TOAST_VIEWPORT_HOTKEY = "F8";

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
   * Full-control toast entry point. Returns the toast id. When a higher-
   * priority toast (or a full visible stack) blocks immediate display, the
   * toast is queued and promoted when a slot opens — it is not dropped.
   * Returns null only when the deferred queue is at capacity and this arrival
   * itself had to be rejected after evicting could not make room.
   */
  notify: (options: ToastOptions) => string | null;
  /**
   * Remove a toast. reason defaults to "manual" (fires the toast's onDismiss);
   * pass null to retract silently — for controllers replacing or unmounting
   * their own toast, where side effects must not run. Also removes queued
   * (not-yet-visible) toasts.
   */
  dismiss: (id: string, reason?: ToastDismissReason | null) => void;
  /** Is a higher-priority toast currently visible at this placement? */
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

function announceTextOf(item: Pick<ToastItem, "message" | "role" | "placement">): string {
  // Custom-content toasts have no stable string; key on role+placement so a
  // rapid re-show of the same controller still bumps announceSeq.
  return item.message ?? `${item.placement}:${item.role}`;
}

/**
 * Unified toast system using React Context + Framer Motion. Mount once at the
 * app root (inside layout.tsx), then call `useToast()` from any client
 * component. Supports two placements (stacked top-right queue and single
 * bottom-center notices), per-toast role/duration/pause, priority deferral
 * with stack limits, persistent live-region viewports, F8 focus, and
 * document-blur timer pause. Both containers portal to document.body as
 * belt-and-braces against ancestor containing blocks, with z pinned to the
 * shared var(--z-toast) scale.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [queue, setQueue] = useState<ToastItem[]>([]);
  // Ref mirrors so notify/dismiss/isSuppressed can read synchronously — notify
  // must return the suppression/queue verdict in the same tick it is called.
  const toastsRef = useRef<ToastItem[]>([]);
  const queueRef = useRef<ToastItem[]>([]);
  const lastAnnounceRef = useRef<Partial<Record<ToastPlacement, string>>>({});
  const [mounted, setMounted] = useState(false);
  const topRightViewportRef = useRef<HTMLDivElement>(null);
  const bottomCenterViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const commitVisible = useCallback((next: ToastItem[]) => {
    toastsRef.current = next;
    setToasts(next);
  }, []);

  const commitQueue = useCallback((next: ToastItem[]) => {
    queueRef.current = next;
    setQueue(next);
  }, []);

  const buildItem = useCallback((options: ToastOptions, id: string): ToastItem => {
    const placement = options.placement ?? "top-right";
    const role = options.role ?? "alert";
    const message = options.message;
    const text = announceTextOf({ message, role, placement });
    const prev = lastAnnounceRef.current[placement];
    const announceSeq = prev === text ? (Date.now() & 0xffff) + 1 : 0;
    lastAnnounceRef.current[placement] = text;
    return {
      id,
      message,
      content: options.content,
      variant: options.variant ?? "success",
      duration: options.duration === undefined ? 4000 : options.duration,
      placement,
      role,
      priority: options.priority ?? TOAST_PRIORITY.base,
      pauseOnHover: options.pauseOnHover ?? false,
      className: options.className,
      announceSeq,
      onDismiss: options.onDismiss,
    };
  }, []);

  /**
   * After a dismiss or displacement, pull deferred toasts into visible slots
   * while respecting priority (never under a higher-priority visible toast)
   * and per-placement visible caps.
   */
  const promoteQueue = useCallback(
    (visible: ToastItem[], deferred: ToastItem[]): { visible: ToastItem[]; deferred: ToastItem[] } => {
      let nextVisible = visible.slice();
      const nextDeferred: ToastItem[] = [];
      // Preserve FIFO order within the deferred queue.
      for (const item of deferred) {
        const higherVisible = nextVisible.some(
          (t) => t.placement === item.placement && t.priority > item.priority,
        );
        const visibleCount = nextVisible.filter((t) => t.placement === item.placement).length;
        if (!higherVisible && visibleCount < TOAST_MAX_VISIBLE[item.placement]) {
          nextVisible = [...nextVisible, item];
        } else {
          nextDeferred.push(item);
        }
      }
      return { visible: nextVisible, deferred: nextDeferred };
    },
    [],
  );

  const enqueueDeferred = useCallback((item: ToastItem, deferred: ToastItem[]): ToastItem[] => {
    const samePlacement = deferred.filter((t) => t.placement === item.placement);
    const others = deferred.filter((t) => t.placement !== item.placement);
    let kept = samePlacement;
    if (kept.length >= TOAST_MAX_QUEUED) {
      const dropped = kept[0];
      kept = kept.slice(1);
      // Hard drop — queue capacity exceeded. Controllers hear "suppressed".
      dropped.onDismiss?.("suppressed");
    }
    return [...others, ...kept, item];
  }, []);

  const dismiss = useCallback(
    (id: string, reason: ToastDismissReason | null = "manual") => {
      const visibleTarget = toastsRef.current.find((t) => t.id === id);
      const queuedTarget = queueRef.current.find((t) => t.id === id);
      const target = visibleTarget ?? queuedTarget;
      if (!target) return;

      const nextVisible = toastsRef.current.filter((t) => t.id !== id);
      const nextDeferred = queueRef.current.filter((t) => t.id !== id);
      const promoted = promoteQueue(nextVisible, nextDeferred);
      commitVisible(promoted.visible);
      commitQueue(promoted.deferred);
      if (reason) target.onDismiss?.(reason);
    },
    [commitVisible, commitQueue, promoteQueue],
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
      const deferred = queueRef.current;
      const id = generateToastId();
      const item = buildItem(options, id);

      // Higher-priority visible toast → defer (F.6(e)), do not drop.
      if (current.some((t) => t.placement === placement && t.priority > priority)) {
        commitQueue(enqueueDeferred(item, deferred));
        return id;
      }

      // Higher-priority arrival displaces visible lower-priority toasts into
      // the deferred queue (not onDismiss — they will reappear when the
      // suppressor leaves). Controllers keep their held ids.
      const outranked = current.filter((t) => t.placement === placement && t.priority < priority);
      let nextVisible = current.filter((t) => !outranked.includes(t));
      let nextDeferred = deferred.slice();
      for (const t of outranked) {
        nextDeferred = enqueueDeferred(t, nextDeferred);
      }

      const visibleCount = nextVisible.filter((t) => t.placement === placement).length;
      if (visibleCount >= TOAST_MAX_VISIBLE[placement]) {
        // Stack full at this priority band — queue the arrival.
        nextDeferred = enqueueDeferred(item, nextDeferred);
        commitVisible(nextVisible);
        commitQueue(nextDeferred);
        return id;
      }

      nextVisible = [...nextVisible, item];
      const promoted = promoteQueue(nextVisible, nextDeferred);
      commitVisible(promoted.visible);
      commitQueue(promoted.deferred);
      return id;
    },
    [buildItem, commitVisible, commitQueue, enqueueDeferred, promoteQueue],
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

  // F.6(c): F8 focuses the toast viewport so keyboard users can reach
  // dismiss/action controls before auto-dismiss.
  useEffect(() => {
    if (!mounted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== TOAST_VIEWPORT_HOTKEY) return;
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target =
        bottomCenter.length > 0
          ? bottomCenterViewportRef.current
          : topRight.length > 0
            ? topRightViewportRef.current
            : null;
      if (!target) return;
      event.preventDefault();
      target.focus();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mounted, topRight.length, bottomCenter.length]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Portal after mount only: the server renders nothing here, and toasts
          can only be enqueued client-side, so hydration always matches. */}
      {mounted
        ? createPortal(
            <>
              {/*
                F.6(a): persistent live-region viewports — always mounted, even
                with zero toasts, so assistive tech is already watching before
                content arrives. tabIndex={-1} supports the F8 focus hotkey.
              */}
              <ToastViewport
                viewportRef={topRightViewportRef}
                label="Notifications"
                className="fixed right-0 top-0 z-[var(--z-toast)] flex flex-col items-end gap-2 p-4 sm:p-6"
              >
                <AnimatePresence mode="popLayout">
                  {topRight.map((toast) => (
                    <Toast
                      key={`${toast.id}-${toast.announceSeq}`}
                      toast={toast}
                      onDismiss={dismiss}
                    />
                  ))}
                </AnimatePresence>
              </ToastViewport>
              {/*
                Bottom-center viewport stays fixed to the viewport as a direct
                body child. Narrow viewports: clear the Companion launcher
                (h-14 at bottom-6 right-6). From sm up the centered max-w-md
                card cannot reach the right corner, so it returns to baseline.
              */}
              <ToastViewport
                viewportRef={bottomCenterViewportRef}
                label="Priority notices"
                className="fixed inset-x-0 bottom-[max(5.5rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] z-[var(--z-toast)] flex flex-col items-center gap-2 px-4 sm:bottom-[calc(1.5rem+env(safe-area-inset-bottom,0px))]"
              >
                {bottomCenter.map((toast) => (
                  <BottomCenterToast
                    key={`${toast.id}-${toast.announceSeq}`}
                    toast={toast}
                    onDismiss={dismiss}
                  />
                ))}
              </ToastViewport>
              {/* Test/probe seam for deferred-queue assertions (visually empty). */}
              <div data-toast-queued-count={queue.length} hidden />
            </>,
            document.body,
          )
        : null}
    </ToastContext.Provider>
  );
}

function ToastViewport({
  viewportRef,
  label,
  className,
  children,
}: {
  viewportRef: RefObject<HTMLDivElement | null>;
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      ref={viewportRef}
      role="region"
      aria-label={label}
      tabIndex={-1}
      className={`${className} outline-none focus-visible:ring-2 focus-visible:ring-cyan/50`}
    >
      {children}
    </div>
  );
}
