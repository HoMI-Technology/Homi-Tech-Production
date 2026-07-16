"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const CONSENT_KEY = "homi:consent";

/** Fixed-bottom consent bar. Renders nothing until mounted (avoids hydration mismatch) and nothing once accepted. */
export function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [accepted, setAccepted] = useState(true);

  useEffect(() => {
    // Hold back until the landing cinematic has finished (8s) so the
    // banner never competes with the first impression. Elsewhere the
    // sequence flag is already set, so the delay collapses to ~0.
    const seen =
      typeof window !== "undefined" && window.sessionStorage.getItem("homi:hero-seen") === "1";
    const delay = seen || window.location.pathname !== "/" ? 400 : 9000;
    const t = setTimeout(() => {
      setMounted(true);
      try {
        setAccepted(window.localStorage.getItem(CONSENT_KEY) === "1");
      } catch {
        setAccepted(true);
      }
    }, delay);
    return () => clearTimeout(t);
  }, []);

  if (!mounted || accepted) return null;

  function accept() {
    try {
      window.localStorage.setItem(CONSENT_KEY, "1");
    } catch {
      // Storage unavailable — still dismiss for this session.
    }
    setAccepted(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-4 pb-4">
      <div className="glass mx-auto flex max-w-2xl flex-col items-center gap-3 p-4 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-sm text-light">
          HōMI uses only essential cookies to keep you signed in. No trackers. No ad tech.{" "}
          <Link href="/legal/cookies" className="underline hover:text-cyan">
            Cookie policy
          </Link>
          .
        </p>
        <button onClick={accept} className="btn btn-primary shrink-0 !px-4 !py-2 text-sm">
          Accept
        </button>
      </div>
    </div>
  );
}
