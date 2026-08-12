"use client";

import { useEffect, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { RankedBars } from "@/components/admin/RankedBars";
import { COLORS, VERDICT_META, type VerdictKey } from "@/lib/brand";
import { templateInsight } from "@/lib/admin/marketing-agency";

export type AudienceInsightsProps = {
  /** Completed assessments by verdict, from the page's server query. */
  verdictCounts: Record<VerdictKey, number>;
  /** First-touch signup channels, already ranked and coloured by the page. */
  channelRows: { label: string; count: number; color?: string }[];
  /** Waitlist interest tags, already ranked by the page. */
  interestCounts: { interest: string; count: number }[];
  /** True when ANTHROPIC_API_KEY is configured (hasAnthropic() on the server). */
  aiEnabled: boolean;
};

/**
 * The richer read of who is actually showing up: what they want, how ready
 * they are, and where they came from — each with the decision it implies.
 *
 * A client component even though every number arrives as a server prop: the
 * plain-language blurb comes from /api/admin/marketing-ai, which needs the
 * caller's session cookie. Without a key configured the same deterministic
 * summary the endpoint would have returned is computed locally, so the callout
 * is never an empty box.
 */
export function AudienceInsights({
  verdictCounts,
  channelRows,
  interestCounts,
  aiEnabled,
}: AudienceInsightsProps) {
  const [insight, setInsight] = useState<string | null>(null);
  const [source, setSource] = useState<"model" | "template" | null>(null);
  const [loading, setLoading] = useState(aiEnabled);
  const [error, setError] = useState<string | null>(null);

  const verdictTotal = Object.values(verdictCounts).reduce((sum, n) => sum + n, 0);
  const readyPct =
    verdictTotal > 0 ? Math.round(((verdictCounts.READY ?? 0) / verdictTotal) * 100) : 0;
  const buildingPct =
    verdictTotal > 0
      ? Math.round((((verdictCounts.BUILD_FIRST ?? 0) + (verdictCounts.NOT_YET ?? 0)) / verdictTotal) * 100)
      : 0;
  const totalInterest = interestCounts.reduce((sum, i) => sum + i.count, 0);
  const topChannel = channelRows[0];
  const channelTotal = channelRows.reduce((sum, c) => sum + c.count, 0);
  const topChannelPct =
    topChannel && channelTotal > 0 ? Math.round((topChannel.count / channelTotal) * 100) : 0;

  useEffect(() => {
    if (!aiEnabled) {
      setInsight(
        templateInsight({
          verdictCounts,
          channelCounts: channelRows.map((c) => ({ label: c.label, count: c.count })),
          interestCounts,
        }).insight,
      );
      setSource("template");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch("/api/admin/marketing-ai", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "audience_insight",
        verdictCounts,
        channelCounts: channelRows.map((c) => ({ label: c.label, count: c.count })),
        interestCounts,
      }),
    })
      .then(async (response) => {
        const data = (await response.json()) as {
          insight?: string;
          source?: "model" | "template";
          error?: string;
        };
        if (cancelled) return;
        if (!response.ok || !data.insight) {
          setError(data.error ?? "Could not read the audience right now.");
          return;
        }
        setInsight(data.insight);
        setSource(data.source ?? "template");
      })
      .catch(() => {
        if (!cancelled) setError("Could not reach the insight service.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // These props come from the server render and keep their identity across
    // this island's own re-renders, so the effect runs once per page load —
    // one AI call, not one per state change.
  }, [aiEnabled, verdictCounts, channelRows, interestCounts]);

  const verdictRows = (Object.keys(VERDICT_META) as VerdictKey[])
    .map((key) => ({
      label: VERDICT_META[key].label,
      count: verdictCounts[key] ?? 0,
      color: VERDICT_META[key].color,
    }))
    .filter((row) => row.count > 0);

  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="Audience insights"
        subtitle="Who is showing up, how ready they are, and what that means for next week."
        action={
          source ? (
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
              {source === "model" ? "Model" : "Template"}
            </span>
          ) : null
        }
      />

      {/* Plain-language callout */}
      <div
        className="mt-5 rounded-lg border p-4"
        style={{ borderColor: `${COLORS.cyan}26`, background: `${COLORS.cyan}0d` }}
      >
        <p className="text-3xs font-semibold uppercase tracking-wide text-cyan">
          What this means next week
        </p>
        {loading ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-dim">
            <span
              aria-hidden
              className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
            />
            Reading the audience…
          </p>
        ) : error ? (
          <p role="alert" className="mt-2 text-sm text-crimson">
            {error}
          </p>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-light">{insight}</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div>
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
            What your audience wants
          </p>
          <div className="mt-4">
            <RankedBars
              rows={interestCounts.map((i) => ({ label: i.interest, count: i.count }))}
              total={totalInterest || undefined}
              emptyLabel="No interest tags captured yet."
            />
          </div>
          {interestCounts[0] && (
            <p className="mt-4 text-xs text-dim">
              <span className="text-light">{interestCounts[0].interest}</span> leads demand — write
              the next guide against it.
            </p>
          )}
        </div>

        <div>
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
            How ready they are
          </p>
          <div className="mt-4">
            <RankedBars
              rows={verdictRows}
              total={verdictTotal || undefined}
              emptyLabel="No completed assessments yet."
            />
          </div>
          {verdictTotal > 0 && (
            <p className="mt-4 text-xs text-dim">
              <span className="score-numeral text-light">{readyPct}%</span> scored{" "}
              {VERDICT_META.READY.label} —{" "}
              {readyPct >= 40
                ? "message to urgency and next steps."
                : `${buildingPct}% are still building, so lead with the Build First path.`}
            </p>
          )}
        </div>

        <div>
          <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
            Where they come from
          </p>
          <div className="mt-4">
            <RankedBars
              rows={channelRows}
              total={channelTotal || undefined}
              emptyLabel="No channel data yet."
            />
          </div>
          {topChannel && (
            <p className="mt-4 text-xs text-dim">
              <span className="capitalize text-light">{topChannel.label}</span> is your #1 channel at{" "}
              <span className="score-numeral">{topChannelPct}%</span> —{" "}
              {topChannel.label === "direct"
                ? "which means the links are not tagged. Stamp every founder post with UTMs."
                : "stay the course before opening a second surface."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
