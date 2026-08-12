"use client";

import { useState } from "react";
import { COLORS } from "@/lib/brand";
import {
  buildScorecardMarkdown,
  templateScorecardSummary,
  type ScorecardMetrics,
} from "@/lib/admin/marketing-agency";

export type SundayScorecardClientProps = {
  metrics: ScorecardMetrics;
  /** True when ANTHROPIC_API_KEY is configured (hasAnthropic() on the server). */
  aiEnabled: boolean;
};

/**
 * The interactive half of the Sunday scorecard: assemble, copy, and (optionally)
 * ask the model what the week actually means.
 *
 * The markdown is built in the browser rather than on the server so the
 * week-ending stamp is the operator's Sunday, not the server's UTC day. Every
 * number in it arrived as a server prop — nothing here re-queries.
 */
export function SundayScorecardClient({ metrics, aiEnabled }: SundayScorecardClientProps) {
  const [markdown, setMarkdown] = useState("");
  const [summary, setSummary] = useState<string | null>(null);
  const [source, setSource] = useState<"model" | "template" | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summaryInput = {
    activationsLast7: metrics.activationsLast7,
    accountsLast7: metrics.accountsLast7,
    waitlistLast7: metrics.waitlistLast7,
    mrrCents: metrics.mrrCents,
    topChannel: metrics.channels[0]?.label ?? "",
  };

  function generate() {
    setMarkdown(buildScorecardMarkdown(metrics, new Date()));
    setCopied(false);
    setError(null);
  }

  async function copyScorecard() {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Clipboard blocked by the browser — select the scorecard and copy it manually.");
    }
  }

  async function aiSummary() {
    if (!aiEnabled) {
      setSummary(templateScorecardSummary(summaryInput).summary);
      setSource("template");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/marketing-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "scorecard_summary", metrics: summaryInput }),
      });
      const data = (await response.json()) as {
        summary?: string;
        source?: "model" | "template";
        error?: string;
      };
      if (!response.ok || !data.summary) {
        setError(data.error ?? "Could not read the week right now.");
        return;
      }
      setSummary(data.summary);
      setSource(data.source ?? "template");
    } catch {
      setError("Could not reach the summary service.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary btn-sm" onClick={generate}>
          {markdown ? "Rebuild scorecard" : "Generate scorecard"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={copyScorecard}
          disabled={!markdown}
        >
          {copied ? "Copied" : "Copy scorecard"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={aiSummary} disabled={loading}>
          {loading ? "Reading the week" : "AI summary"}
        </button>
        {source && (
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
            {source === "model" ? "Model" : "Template"}
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-crimson">
          {error}
        </p>
      )}

      {summary && (
        <div
          className="mt-4 rounded-lg border p-4"
          style={{ borderColor: `${COLORS.emerald}26`, background: `${COLORS.emerald}0d` }}
        >
          <p className="text-3xs font-semibold uppercase tracking-wide text-emerald">
            What the week actually says
          </p>
          <p className="mt-2 text-sm leading-relaxed text-light">{summary}</p>
        </div>
      )}

      {markdown && (
        <textarea
          readOnly
          aria-label="Weekly scorecard markdown"
          className="mt-4 min-h-96 w-full rounded-lg border border-white/10 bg-navy/40 px-3 py-2 font-mono text-3xs text-light"
          value={markdown}
          spellCheck={false}
        />
      )}
    </div>
  );
}
