"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { ThresholdCompass } from "@/components/brand/ThresholdCompass";

/**
 * Route-segment error boundary. Renders inside the root layout, so the
 * navy field and fonts are preserved. Calm, honest, recoverable.
 */
export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side logs capture the stack; client log aids local debugging.
    console.error("[homi] route error", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <ThresholdCompass size={140} animated={false} />
      <h1 className="mt-8 text-3xl font-black text-light">Something slipped.</h1>
      <p className="mt-3 max-w-md text-dim">
        Not you — us. Your data is safe, and nothing was lost. Try again, or head back
        to steady ground.
      </p>
      {error.digest && (
        <p className="score-numeral mt-2 text-xs text-dim/60">ref {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-ghost">
          Back home
        </Link>
      </div>
    </main>
  );
}
