"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  checkLiveScoreTriggers,
  scoreTriggerSignature,
  type ScoreRelevantChange,
} from "@/lib/finance/live-update";
import { loadLocalResult } from "@/lib/assessment/storage";

/**
 * Dismissal record for the band-change prompt, keyed by the signature of the
 * change it dismissed (lib/finance/live-update.ts). A dismissed change never
 * re-prompts; a NEW band crossing — or a fresh assessment — produces a new
 * signature and prompts again.
 */
const DISMISS_KEY = "homi:score-trigger-dismissed";

function listMetrics(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

/**
 * Dashboard nudge shown when the finance numbers have crossed a scoring band
 * since the last assessment (DTI 28/36/43%, emergency fund 1/3/6 months,
 * savings rate 5/10/20%). Purely a re-check prompt: it never recomputes or
 * displays a score — the CTA goes to the quick re-check flow, and the real
 * number only ever comes from /api/scoring.
 *
 * Renders nothing until the client-side check runs, so SSR and first paint
 * match (no hydration flash).
 */
export function ScoreChangePrompt() {
  const [pending, setPending] = useState<{
    change: ScoreRelevantChange;
    signature: string;
  } | null>(null);

  useEffect(() => {
    const change = checkLiveScoreTriggers();
    if (!change?.changed) return;
    const assessedAt = loadLocalResult()?.completedAt ?? "";
    const signature = scoreTriggerSignature(change, assessedAt);
    try {
      if (window.localStorage.getItem(DISMISS_KEY) === signature) return;
    } catch {
      // Storage unavailable — show the prompt; dismissal just won't persist.
    }
    setPending({ change, signature });
  }, []);

  if (!pending) return null;

  const { change, signature } = pending;
  const moved = listMetrics(change.changes.map((c) => c.label));
  const improved = change.changes.every((c) => c.direction === "improved");
  const worsened = change.changes.every((c) => c.direction === "worsened");

  function dismiss() {
    try {
      window.localStorage.setItem(DISMISS_KEY, signature);
    } catch {
      // Storage full or disabled — the prompt simply returns next visit.
    }
    setPending(null);
  }

  return (
    <div
      className="mt-5 rounded-xl border border-cyan/35 bg-cyan/5 px-4 py-3"
      role="status"
      data-score-change-prompt=""
    >
      <p className="text-3xs font-bold uppercase tracking-[0.14em] text-cyan">
        Re-check signal
      </p>
      <p className="mt-2 text-sm text-light">
        Your financial picture changed — {moved} moved to a new scoring band
        {improved ? " (for the better)" : worsened ? " (in a tougher direction)" : ""}.
        Quick re-check?
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link href="/assessment?mode=quick" className="btn btn-primary btn-sm">
          Quick re-check
        </Link>
        <button type="button" onClick={dismiss} className="btn btn-ghost btn-sm">
          Not now
        </button>
      </div>
    </div>
  );
}
