"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { AnimatePresence } from "framer-motion";
import { Toast, type ToastItem, type ToastVariant } from "./Toast";

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
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
 * Lightweight toast notification system using React Context + Framer Motion.
 * Mount once at the app root (inside layout.tsx), then call `useToast()`
 * from any client component to show success / error / warning toasts.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "success", duration = 4000) => {
      const id = generateToastId();
      setToasts((prev) => [...prev, { id, message, variant, duration }]);
    },
    []
  );

  const success = useCallback(
    (message: string, duration?: number) => show(message, "success", duration),
    [show]
  );
  const error = useCallback(
    (message: string, duration?: number) => show(message, "error", duration),
    [show]
  );
  const warning = useCallback(
    (message: string, duration?: number) => show(message, "warning", duration),
    [show]
  );

  const value = useMemo(
    () => ({ show, success, error, warning, dismiss }),
    [show, success, error, warning, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — fixed top-right, responsive padding */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed right-0 top-0 z-[100] flex flex-col items-end gap-2 p-4 sm:p-6"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
