"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

/**
 * Share button for a saved (server-side) assessment.
 * Signed-in users with an assessmentId can generate a copyable share link.
 * Anonymous users (or no id yet) see a "Sign in to share" prompt instead.
 */
export function ShareScoreButton({ assessmentId }: { assessmentId?: string | null }) {
  const [checkedAuth, setCheckedAuth] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function checkAuth() {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (active) setSignedIn(Boolean(data?.user));
      } catch {
        if (active) setSignedIn(false);
      } finally {
        if (active) setCheckedAuth(true);
      }
    }
    checkAuth();
    return () => {
      active = false;
    };
  }, []);

  if (!checkedAuth) return null;

  if (!signedIn || !assessmentId) {
    return (
      <Link href="/auth/sign-up" className="btn btn-ghost">
        Sign in to share
      </Link>
    );
  }

  async function handleShare() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shares", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assessmentId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not create a share link.");
        return;
      }
      setUrl(data.url);
      track("share_created");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — the link is still visible for manual copy.
    }
  }

  if (url) {
    return (
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <input readOnly value={url} className="input text-sm sm:w-72" onFocus={(e) => e.currentTarget.select()} />
        <button onClick={handleCopy} className="btn btn-primary shrink-0 btn-sm">
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button onClick={handleShare} disabled={loading} className="btn btn-ghost disabled:opacity-60">
        {loading ? "Creating link…" : "Share your score"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-crimson">
          {error}
        </p>
      )}
    </div>
  );
}
