"use client";

import { useEffect } from "react";
import Link from "next/link";
import { V4_SHELL_HOME_HREF } from "@/lib/layout/v4-shell";
import { V4_MONEY_CONNECT_HREF } from "@/lib/v4/money-workspace";

/**
 * Money v4 error boundary. Quiet recover — no operate PageFrame, no /dashboard.
 */
export default function MoneyV4Error({
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
    <div className="mx-auto max-w-lg px-4 py-10 text-center">
      <h1 className="type-h2">Money didn&apos;t load</h1>
      <p className="mt-3 text-dim">
        Not you — us. Live account rows are intact. Try again, or reconnect.
      </p>
      {error.digest ? (
        <p className="score-numeral mt-2 text-xs text-dim/60">ref {error.digest}</p>
      ) : null}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="btn btn-ghost shadow-none">
          Try again
        </button>
        <Link href={V4_MONEY_CONNECT_HREF} className="btn btn-ghost shadow-none">
          Connect accounts
        </Link>
        <Link href={V4_SHELL_HOME_HREF} className="btn btn-ghost shadow-none">
          Home
        </Link>
      </div>
    </div>
  );
}
