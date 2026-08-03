"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Distinct failed-to-load state. A transient query error must never wear the
 * empty state's clothes — telling a user with two years of history "you
 * haven't taken your assessment yet" is the fastest way to lose their trust.
 */
export function LoadErrorPanel({
  title = "This section didn't load",
  body = "Something went wrong on our side — your data is safe. Try again in a moment.",
  compact = false,
}: {
  title?: string;
  body?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <div
      role="alert"
      className={`rounded-2xl border border-crimson/25 bg-crimson/5 ${compact ? "p-5" : "p-8"}`}
    >
      <h3 className="font-semibold text-light">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-dim">{body}</p>
      <button
        type="button"
        className="btn btn-ghost mt-4 !px-4 !py-2 text-sm"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          router.refresh();
          window.setTimeout(() => setBusy(false), 1500);
        }}
      >
        {busy ? "Retrying…" : "Retry"}
      </button>
    </div>
  );
}
