"use client";

import { useEffect } from "react";

/**
 * useScrollLock — y-only body scroll lock for overlays (extracted from the
 * pattern HeaderShell's mobile-menu effect established).
 *
 * Locks vertical scroll only. Never sets overflow-x:hidden on body — that
 * kills position:sticky for the homepage AlignmentScene pin stage; the x axis
 * gets `clip` instead. Previous inline values are captured and restored on
 * release so sequential locks unwind cleanly.
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const prevOverflowY = document.body.style.overflowY;
    const prevOverflowX = document.body.style.overflowX;
    document.body.style.overflowY = "hidden";
    document.body.style.overflowX = "clip";
    return () => {
      document.body.style.overflowY = prevOverflowY;
      document.body.style.overflowX = prevOverflowX;
    };
  }, [active]);
}
