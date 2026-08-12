"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageFrame } from "@/components/operate/PageFrame";

/**
 * Personal dashboard error boundary — recoverable operate chrome.
 */
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[homi] /dashboard error", error.digest ?? "", error);
  }, [error]);

  return (
    <PageFrame role="personal" density="compact">
      <div className="mx-auto max-w-lg py-10 text-center">
        <h1 className="type-h2">Your dashboard didn&apos;t load</h1>
        <p className="mt-3 text-dim">
          Not you — us. Your readiness data is safe. Try again, or open a quieter surface while we
          recover.
        </p>
        {error.digest ? (
          <p className="score-numeral mt-2 text-xs text-dim/60">ref {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/assessment" className="btn btn-ghost">
            Assessment
          </Link>
          <Link href="/money" className="btn btn-ghost">
            Money
          </Link>
        </div>
      </div>
    </PageFrame>
  );
}
