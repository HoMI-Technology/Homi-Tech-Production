"use client";

import { useId, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { COLORS } from "@/lib/brand";
import {
  parseLinkedInAnalytics,
  templateAnalyticsSummary,
  topPostsBy,
  type AnalyticsPost,
  type AnalyticsSummary,
} from "@/lib/admin/marketing-agency";

const MAX_CSV_CHARS = 200_000;
/** The endpoint caps top_posts at 30; sending more is rejected as a 400. */
const MAX_TOP_POSTS = 30;

/**
 * Read a LinkedIn post-analytics export and say what it means.
 *
 * Parsing happens in the browser — the CSV never leaves the machine except as
 * the handful of top rows sent for the narrative, which is the smallest slice
 * that can support the conclusion. The raw table stays collapsed because it is
 * evidence, not the answer.
 */
export function LinkedInAnalyticsImport() {
  const fieldId = useId();

  const [csv, setCsv] = useState("");
  const [posts, setPosts] = useState<AnalyticsPost[]>([]);
  const [result, setResult] = useState<AnalyticsSummary | null>(null);
  const [source, setSource] = useState<"model" | "template" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  async function analyse() {
    const parsed = parseLinkedInAnalytics(csv);
    setPosts(parsed);

    if (parsed.length === 0) {
      setResult(null);
      setSource(null);
      setError("No rows parsed. Paste the export including the row that names “Post title”.");
      return;
    }

    setLoading(true);
    setError(null);

    // The union of the three leaderboards, deduped — a post that wins on reach
    // and a post that wins on CTR are both evidence, and often not the same post.
    const candidates = [
      ...topPostsBy(parsed, "impressions"),
      ...topPostsBy(parsed, "ctr"),
      ...topPostsBy(parsed, "clicks"),
    ];
    const seen = new Set<string>();
    const topPosts = candidates
      .filter((post) => {
        if (seen.has(post.title)) return false;
        seen.add(post.title);
        return true;
      })
      .slice(0, MAX_TOP_POSTS)
      .map((p) => ({
        title: p.title,
        impressions: p.impressions,
        ctr: p.ctr,
        clicks: p.clicks,
      }));

    try {
      const response = await fetch("/api/admin/marketing-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "analytics_summary", top_posts: topPosts }),
      });
      const data = (await response.json()) as Partial<AnalyticsSummary> & {
        source?: "model" | "template";
        error?: string;
      };
      if (!response.ok || !data.summary) {
        // The parse succeeded, so fall back locally rather than showing nothing.
        setResult(templateAnalyticsSummary(parsed));
        setSource("template");
        return;
      }
      setResult({
        summary: data.summary,
        recommended_hooks: data.recommended_hooks ?? [],
        content_gaps: data.content_gaps ?? [],
      });
      setSource(data.source ?? "template");
    } catch {
      setResult(templateAnalyticsSummary(parsed));
      setSource("template");
    } finally {
      setLoading(false);
    }
  }

  const byImpressions = topPostsBy(posts, "impressions", MAX_TOP_POSTS);

  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="LinkedIn analytics import"
        subtitle="Paste the post-analytics export. Parsing happens in this browser."
        action={
          source ? (
            <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
              {source === "model" ? "Model" : "Template"}
            </span>
          ) : null
        }
      />

      <label className="mt-5 block text-xs text-dim" htmlFor={`${fieldId}-csv`}>
        Paste your LinkedIn post analytics CSV here
        <textarea
          id={`${fieldId}-csv`}
          className="mt-1 min-h-32 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 font-mono text-3xs text-light"
          value={csv}
          spellCheck={false}
          placeholder="Post title,Published date,Impressions,Unique impressions,Clicks,Likes,Comments,Shares,CTR,Engagement rate"
          onChange={(e) => setCsv(e.target.value.slice(0, MAX_CSV_CHARS))}
        />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={analyse}
          disabled={loading || csv.trim().length === 0}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
              />
              Reading
            </span>
          ) : (
            "Analyse"
          )}
        </button>
        {posts.length > 0 && (
          <span className="text-xs text-dim">
            {posts.length} post{posts.length === 1 ? "" : "s"} parsed
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-crimson">
          {error}
        </p>
      )}

      {result && (
        <div className="mt-5 space-y-4">
          <div
            className="rounded-lg border p-4"
            style={{ borderColor: `${COLORS.cyan}26`, background: `${COLORS.cyan}0d` }}
          >
            <p className="text-3xs font-semibold uppercase tracking-wide text-cyan">
              What is working
            </p>
            <p className="mt-2 text-sm leading-relaxed text-light">{result.summary}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-3xs font-semibold uppercase tracking-wide text-dim">Winning hooks</p>
              {result.recommended_hooks.length === 0 ? (
                <p className="mt-2 text-xs text-dim">No angles returned.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {result.recommended_hooks.map((hook) => (
                    <li key={hook}>
                      {/* A full navigation on purpose: the studio reads its
                          prefill from the query string on mount. */}
                      <a
                        href={`/admin/marketing?studio_topic=${encodeURIComponent(hook)}&studio_tone=hook`}
                        className="glass-hover block rounded-lg border border-white/5 px-3 py-2 text-xs text-light"
                      >
                        {hook}
                        <span className="ml-2 text-3xs text-cyan">Write it →</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <p className="text-3xs font-semibold uppercase tracking-wide text-dim">Content gaps</p>
              {result.content_gaps.length === 0 ? (
                <p className="mt-2 text-xs text-dim">No gaps returned.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-xs leading-relaxed text-dim">
                  {result.content_gaps.map((gap) => (
                    <li key={gap} className="flex gap-2">
                      <span aria-hidden style={{ color: COLORS.amber }}>
                        →
                      </span>
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {posts.length > 0 && (
        <div className="mt-5 border-t border-white/5 pt-4">
          <button
            type="button"
            className="text-3xs uppercase tracking-wide text-dim hover:underline"
            aria-expanded={showRaw}
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? "Hide parsed rows" : `Show ${posts.length} parsed rows`}
          </button>
          {showRaw && (
            <div className="mt-3 max-h-80 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-3xs uppercase tracking-wide text-dim">
                    <th className="pb-2 pr-3 font-medium">Post</th>
                    <th className="pb-2 pr-3 font-medium">Date</th>
                    <th className="pb-2 pr-3 text-right font-medium">Impressions</th>
                    <th className="pb-2 text-right font-medium">CTR</th>
                  </tr>
                </thead>
                <tbody>
                  {byImpressions.map((post, i) => (
                    <tr key={`${post.title}-${i}`} className="border-b border-white/5">
                      <td className="max-w-80 py-2 pr-3 text-dim">
                        <span className="line-clamp-1">{post.title}</span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap text-dim">{post.date || "—"}</td>
                      <td className="score-numeral py-2 pr-3 text-right text-dim">
                        {post.impressions.toLocaleString()}
                      </td>
                      <td className="score-numeral py-2 text-right text-dim">{post.ctr}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
