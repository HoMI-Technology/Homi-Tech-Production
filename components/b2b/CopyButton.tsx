"use client";

import { useState } from "react";

/** Copies `value` to the clipboard and shows a brief confirmation state. */
export function CopyButton({
  value,
  label = "Copy link",
  copiedLabel = "Copied",
  className = "",
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — fail silently, link text remains selectable.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`btn btn-ghost btn-sm ${className}`}
      aria-live="polite"
    >
      {copied ? (
        <>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 10.5l4 4 8-9" />
          </svg>
          {copiedLabel}
        </>
      ) : (
        <>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="7" y="7" width="10" height="10" rx="1.5" />
            <path d="M4 13V4.5A1.5 1.5 0 0 1 5.5 3H13" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}
