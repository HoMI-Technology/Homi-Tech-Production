"use client";

import { useEffect } from "react";
import Link from "next/link";
import { V4_SHELL_ASSESS_HREF } from "@/lib/layout/v4-shell";

/**
 * Home v4 error boundary. Quiet recover — no operate PageFrame, no /dashboard.
 */
export default function HomeV4Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[homi] /home error", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <h1 className="type-h2">Home didn&apos;t load</h1>
      <p className="mt-3 text-dim">
        Not you — us. Your last read is intact. Try again, or take a new assessment.
      </p>
      {error.digest ? (
        <p className="score-numeral mt-2 text-xs text-dim/60">ref {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-ghost shadow-none">
          Try again
        </button>
        <Link href={V4_SHELL_ASSESS_HREF} className="btn btn-ghost shadow-none">
          Assess
        </Link>
        <Link href="/money" className="btn btn-ghost shadow-none">
          Money
        </Link>
      </div>
    </div>
  );
}
