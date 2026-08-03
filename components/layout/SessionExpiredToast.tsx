"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Session-expiry toast. Mounted only for signed-in users (the (product)
 * layout gates on the server-read session), so any same-origin `/api/*`
 * response of 401 means the session died mid-visit — middleware only
 * covers full page loads, so without this an expired session surfaces as
 * silent per-widget request failures. Wraps `window.fetch` to observe
 * response statuses; the patch never alters requests or responses and is
 * restored on unmount. Shows once per mount, offering a sign-in link that
 * returns to the current page via the sign-in page's `next` param.
 */
export function SessionExpiredToast() {
  const [visible, setVisible] = useState(false);
  const pathname = usePathname();

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

  if (!visible) return null;

  return (
    <div
      role="alert"
      // Priority signal: lower-priority fixed surfaces (ImpactToast) suppress
      // themselves while any [data-priority-notice] element is in the DOM.
      data-priority-notice="session-expired"
      className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div className="glass flex flex-wrap items-center gap-4 p-4 sm:flex-nowrap">
        <p className="text-sm text-light">Your session ended. Sign in to keep going.</p>
        <div className="flex items-center gap-2">
          <Link
            href={`/auth/sign-in?next=${encodeURIComponent(pathname)}`}
            className="btn btn-primary !px-4 !py-2 text-sm"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => setVisible(false)}
            aria-label="Dismiss"
            className="btn btn-ghost !px-3 !py-2 text-sm"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
