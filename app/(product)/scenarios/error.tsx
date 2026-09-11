"use client";

import { useEffect } from "react";
import Link from "next/link";
import { V4_SHELL_HOME_HREF, V4_SHELL_PATH_HREF } from "@/lib/layout/v4-shell";

/**
 * Compare v4 error boundary. Quiet recover — no operate PageFrame, no /dashboard.
 */
export default function CompareV4Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[homi] /scenarios error", error.digest ?? "", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <h1 className="type-h2">Compare didn&apos;t load</h1>
      <p className="mt-3 text-dim">
        Not you — us. Educational templates are intact. Try again, or open Path.
      </p>
      {error.digest ? (
        <p className="score-numeral mt-2 text-xs text-dim/60">ref {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-ghost shadow-none">
          Try again
        </button>
        <Link href={V4_SHELL_PATH_HREF} className="btn btn-ghost shadow-none">
          Path
        </Link>
        <Link href={V4_SHELL_HOME_HREF} className="btn btn-ghost shadow-none">
          Home
        </Link>
      </div>
    </div>
  );
}
