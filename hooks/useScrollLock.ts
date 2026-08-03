"use client";

import { useEffect } from "react";

/**
 * useScrollLock — y-only body scroll lock for overlays (extracted from the
 * pattern HeaderShell's mobile-menu effect established).
 *
 * Locks vertical scroll only. Never sets overflow-x:hidden on body — that
 * kills position:sticky for the homepage AlignmentScene pin stage; the x axis
 * gets `clip` instead.
 *
 * Module-level refcount: multiple overlays (modal + command palette, stacked
 * dialogs) can hold the lock at once, and out-of-order release — the
 * first-acquired overlay closing before the second — must NOT unlock the body
 * early. The original inline values are captured once on the 0→1 transition
 * and restored only when the last holder releases (1→0), so nesting order
 * never matters and the restore-original contract still holds.
 */

let lockCount = 0;
let prevOverflowY = "";
let prevOverflowX = "";

function acquireScrollLock(): void {
  if (lockCount === 0) {
    prevOverflowY = document.body.style.overflowY;
    prevOverflowX = document.body.style.overflowX;
    document.body.style.overflowY = "hidden";
    document.body.style.overflowX = "clip";
  }
  lockCount += 1;
}

function releaseScrollLock(): void {
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflowY = prevOverflowY;
    document.body.style.overflowX = prevOverflowX;
  }
}

export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    acquireScrollLock();
    return releaseScrollLock;
  }, [active]);
}
