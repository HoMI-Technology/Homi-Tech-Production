"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { TOAST_PRIORITY, useToastContext } from "@/components/ui/ToastProvider";

/**
 * Session-expiry toast. Mounted only for signed-in users (the (product)
 * layout gates on the server-read session), so any same-origin `/api/*`
 * response of 401 means the session died mid-visit — middleware only
 * covers full page loads, so without this an expired session surfaces as
 * silent per-widget request failures. Wraps `window.fetch` to observe
 * response statuses; the patch never alters requests or responses and is
 * restored on unmount. Shows once per mount, offering a sign-in link that
 * returns to the current page via the sign-in page's `next` param.
 *
 * Presentation is delegated to the unified toast system (task 3.2):
 * bottom-center, role="alert", persistent until dismissed, and
 * TOAST_PRIORITY.security — the toast system suppresses lower-priority
 * bottom-center toasts (ImpactToast's Path progress) while this is visible,
 * replacing the old [data-priority-notice] DOM-attribute protocol.
 */
export function SessionExpiredToast() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();
  const toast = useToastContext();

  useEffect(() => {
    const original = window.fetch;
    let shown = false;

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const response = await original(...args);
      try {
        const input = args[0];
        const raw =
          typeof input === "string" ? input : input instanceof Request ? input.url : input.href;
        const url = new URL(raw, window.location.origin);
        if (
          !shown &&
          response.status === 401 &&
          url.origin === window.location.origin &&
          url.pathname.startsWith("/api/")
        ) {
          shown = true;
          setVisible(true);
        }
      } catch {
        // Observation must never break the caller's request.
      }
      return response;
    };

    return () => {
      window.fetch = original;
    };
  }, []);

  // Declarative sync into the toast system: while expired, exactly one
  // persistent bottom-center alert exists. The cleanup retracts silently
  // (pathname changes re-issue the toast with a fresh sign-in target;
  // unmount removes it); a user dismissal flows back through onDismiss.
  useEffect(() => {
    if (!visible) return;
    const id = toast.notify({
      placement: "bottom-center",
      role: "alert",
      priority: TOAST_PRIORITY.security,
      duration: null,
      className: "glass flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap",
      onDismiss: () => setVisible(false),
      content: (dismissToast) => (
        <>
          <p className="text-sm text-light">Your session ended. Sign in to keep going.</p>
          <div className="flex items-center gap-2">
            <Link
              href={`/auth/sign-in?next=${encodeURIComponent(pathname)}`}
              className="btn btn-primary btn-sm"
            >
              Sign in
            </Link>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss"
              className="btn btn-ghost btn-sm"
            >
              Dismiss
            </button>
          </div>
        </>
      ),
    });
    if (id === null) return;
    return () => {
      toast.dismiss(id, null);
    };
  }, [visible, pathname, toast]);

  return null;
}
