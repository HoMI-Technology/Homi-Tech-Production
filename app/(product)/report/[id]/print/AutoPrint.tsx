"use client";

import { useEffect } from "react";

/** Fires the browser print dialog shortly after mount, unless ?noprint=1 is set. */
export function AutoPrint({ skip }: { skip: boolean }) {
  useEffect(() => {
    if (skip) return;
    const t = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(t);
  }, [skip]);

  return null;
}
