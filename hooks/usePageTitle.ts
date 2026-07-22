"use client";

import { useEffect } from "react";

/**
 * Updates document.title for multi-step flows (assessment, wizards).
 * Restores the previous title on unmount.
 */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
