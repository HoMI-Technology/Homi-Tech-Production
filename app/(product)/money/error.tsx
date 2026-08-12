"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageFrame } from "@/components/operate/PageFrame";

/**
 * Money root error boundary — subscription/settings can keep parent loading;
 * this recovers the Money Stand surface itself.
 */
export default function MoneyError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[homi] /money error", error.digest ?? "", error);
  }, [error]);

  return (
    <PageFrame width="content" density="spacious" role="personal">
      <div className="mx-auto max-w-lg py-8 text-center">
        <h1 className="type-h2">Money didn&apos;t load</h1>
        <p className="mt-3 text-dim">
          Not you — us. Your accounts and numbers are intact. Try again, or jump to a specific Money
          surface.
        </p>
        {error.digest ? (
          <p className="score-numeral mt-2 text-xs text-dim/60">ref {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/money/budget" className="btn btn-ghost">
            Budget
          </Link>
          <Link href="/money/decide" className="btn btn-ghost">
            Decide
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
        </div>
      </div>
    </PageFrame>
  );
}
