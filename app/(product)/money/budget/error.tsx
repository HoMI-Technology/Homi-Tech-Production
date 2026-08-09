"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Track-mode error boundary — keeps Money chrome recoverable when planner
 * throws (hooks order, corrupt local path, chart edge cases).
 */
export default function MoneyBudgetError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[homi] /money/budget error", error.digest ?? "", error);
  }, [error]);

  function clearLocalPlanner() {
    try {
      window.localStorage.removeItem("homi-planner-v1");
    } catch {
      // ignore
    }
    reset();
    window.location.assign("/money/budget");
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="type-h2">Something slipped in Track.</h1>
      <p className="mt-3 text-dim">
        Not you — us. Your account is fine. Money on this device may need a local reset if the error
        keeps returning.
      </p>
      {error.digest ? (
        <p className="score-numeral mt-2 text-xs text-dim/60">ref {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <button type="button" onClick={clearLocalPlanner} className="btn btn-ghost">
          Reset local planner
        </button>
        <Link href="/money" className="btn btn-ghost">
          Back to Money Stand
        </Link>
      </div>
    </div>
  );
}
