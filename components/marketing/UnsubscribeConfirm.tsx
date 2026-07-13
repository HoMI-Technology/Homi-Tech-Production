"use client";

import { useState } from "react";

/**
 * Confirms an email opt-out. The one-click List-Unsubscribe header already lets
 * mail clients unsubscribe without this page; this is the human-facing path when
 * someone clicks the footer link, with an explicit confirm so a mis-click on a
 * pre-fetched link doesn't silently opt them out.
 */
export function UnsubscribeConfirm({ email, token }: { email: string; token: string }) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function confirm() {
    setStatus("loading");
    try {
      const res = await fetch(
        `/api/unsubscribe?e=${encodeURIComponent(email)}&t=${encodeURIComponent(token)}`,
        { method: "POST" },
      );
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="mt-4 text-sm leading-relaxed text-dim">
        You&rsquo;re unsubscribed. You won&rsquo;t receive further marketing emails from HōMI.
        Essential account emails (like password resets) may still be sent.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-sm leading-relaxed text-dim">
        Unsubscribe <span className="text-light">{email}</span> from HōMI marketing emails?
      </p>
      <button
        type="button"
        onClick={confirm}
        disabled={status === "loading"}
        className="btn btn-ghost mt-5"
      >
        {status === "loading" ? "Working…" : "Confirm unsubscribe"}
      </button>
      {status === "error" && (
        <p className="mt-3 text-xs text-dim">Something didn&rsquo;t connect. Please try again.</p>
      )}
    </div>
  );
}
