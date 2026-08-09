"use client";

import { useState } from "react";
import type { AssessmentInputs } from "@/lib/scoring";
import { track } from "@/lib/analytics";

/**
 * Anonymous share-card creation for /results (no account required — this is
 * the top-of-funnel's shareable exit). Sends raw inputs; the server recomputes
 * the score, so the card is unforgeable. Defaults to the journey card; the
 * numeric score appears only when the user ticks the reveal box.
 */
export function ShareShadowButton({ inputs }: { inputs: AssessmentInputs }) {
  const [open, setOpen] = useState(false);
  const [revealScore, setRevealScore] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleCreate() {
    setStatus("loading");
    try {
      const res = await fetch("/api/shadow-shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs, revealScore }),
      });
      const json = (await res.json().catch(() => null)) as { url?: string } | null;
      if (!res.ok || !json?.url) {
        setStatus("error");
        return;
      }
      setUrl(json.url);
      setStatus("done");
      track("share_created", { kind: "shadow", reveal: revealScore ? 1 : 0 });
    } catch {
      setStatus("error");
    }
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the URL is visible for manual copy.
    }
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>
        Share your journey
      </button>
    );
  }

  return (
    <div className="glass w-full max-w-md p-5 text-left">
      {status !== "done" ? (
        <>
          <p className="text-sm font-semibold text-light">Share your readiness journey</p>
          <p className="mt-1 text-xs leading-relaxed text-dim">
            Creates a link with your three pillars and direction — no names, no numbers you typed,
            nothing to sign up for. Expires in 30 days.
          </p>
          <label className="mt-3 flex items-start gap-2 text-xs text-dim">
            <input
              type="checkbox"
              checked={revealScore}
              onChange={(e) => setRevealScore(e.target.checked)}
              className="mt-0.5"
            />
            <span>Also show my score and verdict on the card</span>
          </label>
          {status === "error" && (
            <p className="mt-2 text-xs text-crimson">
              Couldn&rsquo;t create the link right now. Try again in a moment.
            </p>
          )}
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCreate}
              disabled={status === "loading"}
            >
              {status === "loading" ? "Creating…" : "Create link"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-light">Your share link is live</p>
          <code className="input mt-3 block overflow-x-auto whitespace-nowrap font-mono text-xs text-light">
            {url}
          </code>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn btn-primary btn-sm" onClick={handleCopy}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
