"use client";

import { useEffect } from "react";
import { markEntrancePlayed } from "./entrance-state";

/** Total choreography length — flag the session as played once it resolves. */
const SEQUENCE_MS = 2600;

/**
 * Drives the one-time dashboard entrance. The inline boot script has already
 * stamped the container "play" or "instant" pre-paint; this flips "play" → "go"
 * after hydration (CSS handles the per-stage stagger via --stage-delay) and
 * marks the session so client-side returns render instantly. Renders nothing.
 */
export function EntranceConductor({ containerId }: { containerId: string }) {
  useEffect(() => {
    const el = document.getElementById(containerId);
    if (!el) return;

    if (el.dataset.entrance !== "play") {
      markEntrancePlayed();
      return;
    }

    // Double-rAF: guarantee the "play" (hidden) state painted before the
    // transition to "go" starts, so the stagger actually animates.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        el.dataset.entrance = "go";
      });
    });
    const done = window.setTimeout(markEntrancePlayed, SEQUENCE_MS);

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(done);
    };
  }, [containerId]);

  return null;
}
