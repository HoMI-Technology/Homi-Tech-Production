import { useToastContext } from "@/components/ui/ToastProvider";

/**
 * Convenience hook to show toast notifications from any client component.
 *
 * @example
 * const toast = useToast();
 * toast.success("Saved!");
 * toast.error("Something went wrong.");
 * toast.warning("Heads up — session expiring soon.");
 *
 * Full-control toasts (placement, role, priority, pause-on-hover, custom
 * content) go through `toast.notify(options)` — see ToastOptions in
 * components/ui/ToastProvider.tsx.
 */
export function useToast() {
  return useToastContext();
}
