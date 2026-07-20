"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/** Fires the share_viewed occurrence event once per page view. */
export function ShareViewPing({ kind }: { kind: string }) {
  useEffect(() => {
    track("share_viewed", { kind });
  }, [kind]);
  return null;
}
