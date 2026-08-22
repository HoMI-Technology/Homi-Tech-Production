"use client";

import { useEffect } from "react";

/**
 * Hash-open island for /admin/marketing (marketing-command-center-v2 rev 3).
 * Native hash scroll does not open closed <details> / collapsed zones, so on
 * mount and on hashchange we: open the target if it is a <details>, open any
 * ancestor <details> (e.g. #approval-queue or #desk-content inside #create),
 * open a direct-child <details> (e.g. the #claim panel), then scroll the
 * section root into view. Focus is never moved. Renders nothing.
 */
export function MarketingHashOpen() {
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const el = document.getElementById(hash);
      if (!el) return;

      if (el instanceof HTMLDetailsElement) el.open = true;
      let parent = el.parentElement;
      while (parent) {
        if (parent instanceof HTMLDetailsElement) parent.open = true;
        parent = parent.parentElement;
      }
      const childDetails = el.querySelector("details");
      if (childDetails) childDetails.open = true;

      el.scrollIntoView({ block: "start" });
    };

    apply();
    window.addEventListener("hashchange", apply);
    return () => window.removeEventListener("hashchange", apply);
  }, []);

  return null;
}
