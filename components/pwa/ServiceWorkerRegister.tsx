"use client";

import { useEffect } from "react";

/**
 * Registers the PWA service worker (public/sw.js) once the page has loaded.
 * Registration is deferred to the `load` event so it never competes with
 * hydration or LCP-critical requests.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
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
