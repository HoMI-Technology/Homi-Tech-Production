"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  loadSaveStatus,
  recordSaveStatus,
  statusFromResponse,
  subscribeSaveStatus,
  type AssessmentSaveStatus,
} from "@/lib/assessment/save-status";
import { attachServerId, loadLocalResult } from "@/lib/assessment/storage";

/**
 * Surfaces how the background POST /api/assessments actually resolved
 * (Plans.md F.12). Renders nothing for saved / pending / anonymous (401 —
 * local-only is the expected anonymous experience). Shows the honest state
 * for the two silent-loss cases: free-tier 402 (upgrade path) and 400/500/
 * network (retry from the locally stored result).
 */
export function SaveStatusBanner() {
  const [status, setStatus] = useState<AssessmentSaveStatus | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    setStatus(loadSaveStatus());
    return subscribeSaveStatus(setStatus);
  }, []);

  if (
    !status ||
    status.outcome === "saved" ||
    status.outcome === "pending" ||
    status.outcome === "unauthenticated"
  ) {
    return null;
  }

  async function handleRetry() {
    const stored = loadLocalResult();
    if (!stored || retrying) return;
    setRetrying(true);
    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputs: stored.inputs,
          kind: stored.kind,
          // F.12 residual: retry must not silently default non-home verticals to home_buying.
          ...(stored.decisionType ? { decisionType: stored.decisionType } : {}),
        }),
        keepalive: true,
      });
      recordSaveStatus(statusFromResponse(res.status));
      if (res.ok) {
        const data = (await res.json().catch(() => null)) as { id?: string } | null;
        if (data?.id) attachServerId(data.id);
      }
    } catch {
      recordSaveStatus("failed");
    } finally {
      setRetrying(false);
    }
  }

  if (status.outcome === "locked") {
    return (
      <div
        className="glass mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
        role="status"
      >
        <p className="text-sm text-light">
          <span className="font-semibold text-cyan">Saved on this device only.</span>{" "}
          <span className="text-dim">
            Your free plan includes one completed assessment per decision. Upgrade to save this
            result to your account and re-score this decision as your numbers change.
          </span>
        </p>
        <Link href="/pricing" className="btn btn-primary shrink-0 text-sm">
          See plans
        </Link>
      </div>
    );
  }

  return (
    <div
      className="glass mb-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
      role="status"
    >
      <p className="text-sm text-light">
        <span className="font-semibold text-cyan">Saved on this device</span>{" "}
        <span className="text-dim">— but we couldn&apos;t save this result to your account.</span>
      </p>
      <button
        type="button"
        onClick={handleRetry}
        disabled={retrying}
        className="btn btn-primary shrink-0 text-sm"
      >
        {retrying ? "Retrying…" : "Try again"}
      </button>
    </div>
  );
}
