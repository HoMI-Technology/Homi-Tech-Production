"use client";

import { useEffect } from "react";
import Link from "next/link";
import { PageFrame } from "@/components/operate/PageFrame";

/**
 * Credit health error boundary — recovers the credit surface itself.
 */
export default function CreditError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[homi] /credit error", error.digest ?? "", error);
  }, [error]);

  return (
    <PageFrame width="content" density="spacious" role="personal">
      <div className="mx-auto max-w-lg py-8 text-center">
        <h1 className="type-h2">Credit health didn&apos;t load</h1>
        <p className="mt-3 text-dim">
          Not you — us. Your saved credit inputs are intact. Try again, or head back to the
          dashboard.
        </p>
        {error.digest ? (
          <p className="score-numeral mt-2 text-xs text-dim/60">ref {error.digest}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <Link href="/dashboard" className="btn btn-ghost">
            Dashboard
          </Link>
        </div>
      </div>
    </PageFrame>
  );
}
