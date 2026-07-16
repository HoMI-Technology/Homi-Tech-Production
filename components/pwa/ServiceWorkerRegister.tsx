"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (public/sw.js) once the page has loaded.
 * Registration is deferred to the `load` event so it never competes with
 * hydration or LCP-critical requests.
 *
 * Production-only: `next dev` and `next start` share the localhost:3000
 * origin, so a worker registered by a local production build would serve
 * cached prod /_next/static chunks into the dev server (stale code, broken
 * HMR). In dev we therefore actively unregister any leftover worker and
 * purge its caches instead of registering.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()))
        .catch(() => {});
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) =>
            Promise.all(keys.filter((k) => k.startsWith("homi-")).map((k) => caches.delete(k))),
          )
          .catch(() => {});
      }
      return;
    }

    const register = () => {
      // updateViaCache: "none" makes the browser bypass the HTTP cache when
      // checking sw.js for updates, so a misconfigured CDN can't pin an old
      // worker for hours.
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).catch(() => {
        // Non-fatal: the app works without offline support.
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
