"use client";

import { useEffect, type RefObject } from "react";

/**
 * Tabbable elements a modal focus trap cycles through. Deliberately lenient
 * (no offsetParent/visibility probing): jsdom reports offsetParent as null for
 * everything, and the trap only ever runs inside a small dialog panel where
 * hidden-but-focusable content is not a real pattern.
 */
export const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/** Focusable descendants of `container`, in DOM order. */
export function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.getAttribute("aria-hidden") !== "true",
  );
}

/**
 * useFocusTrap — keeps Tab / Shift+Tab cycling inside `ref` while `active`.
 *
 * Boundary-only interception: mid-panel tabbing is left to the browser; only
 * a Tab off the last element (or Shift+Tab off the first, or focus escaping
 * the panel entirely) is redirected back inside. Escape handling and focus
 * return stay with the caller (see components/ui/Modal.tsx).
 */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      // A layer above this trap (e.g. a palette stacked over the modal) that
      // already consumed the event owns it — never double-handle.
      if (e.defaultPrevented) return;
      if (e.key !== "Tab") return;
      const container = ref.current;
      if (!container) return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const current = document.activeElement;
      const inside = current instanceof HTMLElement && container.contains(current);
      if (e.shiftKey) {
        if (!inside || current === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (!inside || current === last) {
        e.preventDefault();
        first.focus();
      }
    }
    // Capture phase so the trap wins even if an inner widget stops propagation.
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [ref, active]);
}
