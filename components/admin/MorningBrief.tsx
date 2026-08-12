"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type MorningBriefMetrics = {
  uniqueActivated7d: number;
  completions7d: number;
  accountsLast7: number;
  cohortRate7d: number | null;
  waitlistTotal: number;
  pendingApprovals: number;
  resendConfigured: boolean;
  topChannel: string;
};

/**
 * CEO morning brief — 3 sentences + one decision. Template-safe if AI fails.
 */
export function MorningBrief({ metrics }: { metrics: MorningBriefMetrics }) {
  const [brief, setBrief] = useState<string | null>(null);
  const [decision, setDecision] = useState<string | null>(null);
  const [href, setHref] = useState("#approval-queue");
  const [source, setSource] = useState<"model" | "template" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/admin/marketing-ai", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action: "morning_brief", metrics }),
        });
        const data = (await res.json()) as {
          brief?: string;
          decision?: string;
          decision_href?: string;
          source?: "model" | "template";
        };
        if (cancelled) return;
        if (data.brief && data.decision) {
          setBrief(data.brief);
          setDecision(data.decision);
          setHref(data.decision_href || "#approval-queue");
          setSource(data.source ?? "template");
        }
      } catch {
        if (!cancelled) {
          setBrief("Could not load brief — open the approval queue and Proof section manually.");
          setDecision("Review fleet status and clear anything blocked.");
          setHref("#approval-queue");
          setSource("template");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // metrics object is stable enough for mount; intentional once-per-page-load brief
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="glass mt-6 border border-cyan/25 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-3xs font-semibold uppercase tracking-wide text-cyan">
          Morning brief
        </p>
        {source && (
          <span className="font-mono text-3xs text-dim">
            {loading ? "…" : source === "model" ? "AI" : "template"}
          </span>
        )}
      </div>
      {loading ? (
        <p className="mt-3 text-sm text-dim">Loading brief…</p>
      ) : (
        <>
          <p className="mt-3 text-sm leading-relaxed text-light">{brief}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-white/10 bg-navy/50 px-3 py-2.5">
            <p className="text-3xs font-semibold uppercase tracking-wide text-amber">
              One decision
            </p>
            <p className="flex-1 text-sm text-light">{decision}</p>
            {href.startsWith("/") ? (
              <Link href={href} className="btn btn-primary btn-sm shrink-0">
                Go
              </Link>
            ) : (
              <a href={href} className="btn btn-primary btn-sm shrink-0">
                Go
              </a>
            )}
          </div>
        </>
      )}
    </div>
  );
}
