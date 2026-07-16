"use client";

import { useEffect, useState } from "react";

/**
 * Renders the copyright year without going stale on statically prerendered
 * pages: the server (or build) supplies the initial value so hydration
 * matches, then the client corrects it if the calendar has since rolled over.
 */
export function CopyrightYear({ initial }: { initial: number }) {
  const [year, setYear] = useState(initial);
  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);
  return <>{year}</>;
}
