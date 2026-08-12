"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { COLORS } from "@/lib/brand";
import {
  PLATFORMS,
  POST_SNIPPET_LENGTH,
  bestPerformingId,
  performanceTotals,
  platformMeta,
  postSnippet,
  type PostPerformanceRow,
  type SocialPlatform,
} from "@/lib/admin/marketing-agency";

type Draft = {
  platform: SocialPlatform;
  campaign: string;
  snippet: string;
  postedAt: string;
  impressions: string;
  clicks: string;
  completions: string;
  notes: string;
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): Draft {
  return {
    platform: "linkedin",
    campaign: "",
    snippet: "",
    postedAt: todayIso(),
    impressions: "",
    clicks: "",
    completions: "",
    notes: "",
  };
}

/** "" → null so a blank field stays unknown rather than becoming a zero. */
function optionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number.parseInt(trimmed.replace(/[,\s]/g, ""), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function cell(value: number | null): string {
  return value === null ? "—" : value.toLocaleString();
}

/**
 * The ledger that closes the loop: what was published, and what it did.
 *
 * Rows live in post_performance_log rather than localStorage — unlike the
 * calendar, this is the record you compare quarters against, so it has to
 * survive a browser. Every metric column is optional, because an operator who
 * has impressions today and clicks tomorrow should log the row today.
 */
export function PostPerformanceTracker() {
  const fieldId = useId();

  const [rows, setRows] = useState<PostPerformanceRow[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/post-performance");
      const data = (await response.json()) as { rows?: PostPerformanceRow[]; error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not load logged posts.");
        return;
      }
      setRows(data.rows ?? []);
      setError(null);
    } catch {
      setError("Could not reach the performance log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // The studio links here with the campaign it just stamped. Read from
  // window rather than useSearchParams so this island never forces the page
  // into a Suspense bailout at build time.
  useEffect(() => {
    try {
      const campaign = new URLSearchParams(window.location.search).get("log_campaign");
      if (campaign) setDraft((prev) => ({ ...prev, campaign: campaign.slice(0, 120) }));
    } catch {
      // No search params to read — the form just starts empty.
    }
  }, []);

  async function save() {
    const campaign = draft.campaign.trim();
    const snippet = postSnippet(draft.snippet);
    if (!campaign || !snippet) {
      setError("A campaign tag and a snippet of the post are both required.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/post-performance", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          platform: draft.platform,
          utm_campaign: campaign,
          utm_source: platformMeta(draft.platform).utmSource,
          post_snippet: snippet,
          posted_at: draft.postedAt,
          impressions: optionalInt(draft.impressions),
          clicks: optionalInt(draft.clicks),
          completions: optionalInt(draft.completions),
          notes: draft.notes.trim() ? draft.notes.trim().slice(0, 500) : null,
        }),
      });
      const data = (await response.json()) as { row?: PostPerformanceRow; error?: string };
      if (!response.ok || !data.row) {
        setError(data.error ?? "Could not save that row.");
        return;
      }
      setRows((prev) => [data.row as PostPerformanceRow, ...prev]);
      setDraft(emptyDraft());
    } catch {
      setError("Could not reach the performance log.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    // Optimistic: the row disappears immediately and comes back on failure.
    const previous = rows;
    setRows((prev) => prev.filter((row) => row.id !== id));
    try {
      const response = await fetch(`/api/admin/post-performance?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        setRows(previous);
        setError("Could not delete that row.");
      }
    } catch {
      setRows(previous);
      setError("Could not reach the performance log.");
    }
  }

  const totals = performanceTotals(rows);
  const bestId = bestPerformingId(rows);

  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="Post performance"
        subtitle="What you published and what it did. Manual entry — the platforms do not hand this over."
        action={
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
            {rows.length} logged
          </span>
        }
      />

      {/* Log form */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-platform`}>
          Platform
          <select
            id={`${fieldId}-platform`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.platform}
            onChange={(e) => setDraft({ ...draft, platform: e.target.value as SocialPlatform })}
          >
            {PLATFORMS.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-campaign`}>
          UTM campaign
          <input
            id={`${fieldId}-campaign`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 font-mono text-xs text-light"
            value={draft.campaign}
            spellCheck={false}
            placeholder="w1_founder_why"
            onChange={(e) => setDraft({ ...draft, campaign: e.target.value.slice(0, 120) })}
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-date`}>
          Posted on
          <input
            id={`${fieldId}-date`}
            type="date"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.postedAt}
            onChange={(e) => setDraft({ ...draft, postedAt: e.target.value })}
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-snippet`}>
          Post snippet
          <input
            id={`${fieldId}-snippet`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.snippet}
            placeholder="First line of the post"
            onChange={(e) =>
              setDraft({ ...draft, snippet: e.target.value.slice(0, POST_SNIPPET_LENGTH) })
            }
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-impressions`}>
          Impressions
          <input
            id={`${fieldId}-impressions`}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.impressions}
            placeholder="optional"
            onChange={(e) => setDraft({ ...draft, impressions: e.target.value })}
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-clicks`}>
          Clicks
          <input
            id={`${fieldId}-clicks`}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.clicks}
            placeholder="optional"
            onChange={(e) => setDraft({ ...draft, clicks: e.target.value })}
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-completions`}>
          Completions
          <input
            id={`${fieldId}-completions`}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.completions}
            placeholder="attributed"
            onChange={(e) => setDraft({ ...draft, completions: e.target.value })}
          />
        </label>
        <label className="block text-xs text-dim sm:col-span-2 lg:col-span-1" htmlFor={`${fieldId}-notes`}>
          Notes
          <textarea
            id={`${fieldId}-notes`}
            className="mt-1 min-h-10 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.notes}
            placeholder="What you would do differently"
            onChange={(e) => setDraft({ ...draft, notes: e.target.value.slice(0, 500) })}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={saving}>
          {saving ? "Saving" : "Log this post"}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
          Refresh
        </button>
        <span className="text-xs text-dim">
          Completions are assessment completions attributed to this campaign.
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-crimson">
          {error}
        </p>
      )}

      {/* Ledger */}
      <div className="mt-6 overflow-x-auto">
        {loading ? (
          <p className="py-8 text-center text-sm text-dim">Loading logged posts…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-dim">
            Nothing logged yet. Log the first post above and the summary fills in.
          </p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 text-3xs uppercase tracking-wide text-dim">
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Platform</th>
                <th className="pb-2 pr-3 font-medium">Campaign</th>
                <th className="pb-2 pr-3 text-right font-medium">Impr.</th>
                <th className="pb-2 pr-3 text-right font-medium">Clicks</th>
                <th className="pb-2 pr-3 text-right font-medium">Compl.</th>
                <th className="pb-2 pr-3 font-medium">Notes</th>
                <th className="pb-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const isBest = row.id === bestId;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-white/5"
                    style={
                      isBest
                        ? { background: `${COLORS.cyan}0f`, boxShadow: `inset 2px 0 0 ${COLORS.cyan}` }
                        : undefined
                    }
                  >
                    <td className="py-2 pr-3 whitespace-nowrap text-light">{row.posted_at}</td>
                    <td className="py-2 pr-3 text-xs text-dim">
                      {platformMeta(row.platform as SocialPlatform).label}
                      {isBest && (
                        <span
                          className="ml-2 rounded-full border px-1.5 py-0.5 text-3xs font-semibold uppercase tracking-wide"
                          style={{ borderColor: `${COLORS.cyan}66`, color: COLORS.cyan }}
                        >
                          Best
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono text-3xs text-cyan">{row.utm_campaign}</td>
                    <td className="score-numeral py-2 pr-3 text-right text-xs text-light">
                      {cell(row.impressions)}
                    </td>
                    <td className="score-numeral py-2 pr-3 text-right text-xs text-light">
                      {cell(row.clicks)}
                    </td>
                    <td className="score-numeral py-2 pr-3 text-right text-xs text-light">
                      {cell(row.completions)}
                    </td>
                    <td className="max-w-48 py-2 pr-3 text-xs text-dim">
                      <span className="line-clamp-2">{row.notes || row.post_snippet}</span>
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        className="text-3xs text-crimson hover:underline"
                        onClick={() => void remove(row.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="text-3xs uppercase tracking-wide text-dim">
                <td className="pt-3 pr-3" colSpan={3}>
                  Totals · avg CTR {totals.ctr === null ? "—" : `${totals.ctr}%`}
                </td>
                <td className="score-numeral pt-3 pr-3 text-right text-xs text-light">
                  {totals.impressions.toLocaleString()}
                </td>
                <td className="score-numeral pt-3 pr-3 text-right text-xs text-light">
                  {totals.clicks.toLocaleString()}
                </td>
                <td
                  className="score-numeral pt-3 pr-3 text-right text-xs"
                  style={{ color: COLORS.emerald }}
                >
                  {totals.completions.toLocaleString()}
                </td>
                <td className="pt-3" colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
