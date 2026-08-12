"use client";

import { useEffect, useId, useState } from "react";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { COLORS } from "@/lib/brand";
import {
  COMPETITOR_LOG_KEY,
  COMPETITOR_LOG_MAX,
  COMPETITOR_TAGS,
  COMPETITOR_URLS_KEY,
  COMPETITOR_URL_SLOTS,
  parseStoredCompetitorLog,
  templateCompetitorAnalysis,
  type CompetitorAnalysis,
  type CompetitorPost,
  type CompetitorTag,
} from "@/lib/admin/marketing-agency";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function emptyDraft(): { account: string; date: string; hook: string; impressions: string; tags: CompetitorTag[] } {
  return { account: "", date: todayIso(), hook: "", impressions: "", tags: [] };
}

function readUrls(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(COMPETITOR_URLS_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return Array(COMPETITOR_URL_SLOTS).fill("");
    return Array.from(
      { length: COMPETITOR_URL_SLOTS },
      (_, i) => (typeof parsed[i] === "string" ? (parsed[i] as string) : ""),
    );
  } catch {
    return Array(COMPETITOR_URL_SLOTS).fill("");
  }
}

/**
 * Competitor content pulse — logged by hand, on purpose.
 *
 * LinkedIn does not permit scraping, and a tool that quietly did it anyway would
 * be a liability rather than an advantage. So the accounts list is a bookmark
 * list, and the posts are what the operator actually read. Fifty entries is
 * plenty: the pattern is visible long before the log is full.
 */
export function CompetitorPulse() {
  const fieldId = useId();

  const [urls, setUrls] = useState<string[]>(() => Array(COMPETITOR_URL_SLOTS).fill(""));
  const [log, setLog] = useState<CompetitorPost[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [showAccounts, setShowAccounts] = useState(false);
  const [savedUrls, setSavedUrls] = useState(false);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [source, setSource] = useState<"model" | "template" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUrls(readUrls());
    try {
      setLog(parseStoredCompetitorLog(window.localStorage.getItem(COMPETITOR_LOG_KEY)));
    } catch {
      setLog([]);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(COMPETITOR_LOG_KEY, JSON.stringify(log));
    } catch {
      // Private mode / quota — the log still works for this session.
    }
  }, [log, hydrated]);

  function saveUrls() {
    try {
      window.localStorage.setItem(COMPETITOR_URLS_KEY, JSON.stringify(urls.map((u) => u.trim())));
      setSavedUrls(true);
      window.setTimeout(() => setSavedUrls(false), 1600);
    } catch {
      setError("This browser refused to store the accounts list.");
    }
  }

  function toggleTag(tag: CompetitorTag) {
    setDraft((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter((t) => t !== tag) : [...prev.tags, tag],
    }));
  }

  function logPost() {
    const hook = draft.hook.trim();
    if (!hook) {
      setError("Paste the hook — the first line is the part worth logging.");
      return;
    }
    const impressions = Number.parseInt(draft.impressions.replace(/[,\s]/g, ""), 10);
    const entry: CompetitorPost = {
      id: crypto.randomUUID(),
      account: draft.account.trim().slice(0, 80),
      date: draft.date,
      hook: hook.slice(0, 400),
      tags: draft.tags,
      impressions: Number.isFinite(impressions) && impressions >= 0 ? impressions : undefined,
    };
    setLog((prev) => [entry, ...prev].slice(0, COMPETITOR_LOG_MAX));
    setDraft(emptyDraft());
    setError(null);
  }

  async function analyse() {
    if (log.length === 0) {
      setError("Log at least one competitor post first.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/marketing-ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "competitor_analysis",
          posts: log.slice(0, COMPETITOR_LOG_MAX).map((post) => ({
            account: post.account,
            hook: post.hook,
            tags: post.tags,
            impressions: post.impressions,
          })),
        }),
      });
      const data = (await response.json()) as Partial<CompetitorAnalysis> & {
        source?: "model" | "template";
        error?: string;
      };
      if (!response.ok || !data.patterns) {
        setAnalysis(templateCompetitorAnalysis(log));
        setSource("template");
        return;
      }
      setAnalysis({
        patterns: data.patterns,
        gaps: data.gaps ?? [],
        recommendations: data.recommendations ?? [],
      });
      setSource(data.source ?? "template");
    } catch {
      setAnalysis(templateCompetitorAnalysis(log));
      setSource("template");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass mt-8 p-6">
      <SectionHeader
        eyebrow="Agency"
        title="Competitor pulse"
        subtitle="What the rest of the category is posting, logged by hand. Nothing is scraped."
        action={
          <div className="flex items-center gap-2">
            {source && (
              <span className="rounded-full border border-white/10 px-2.5 py-1 text-3xs font-semibold uppercase tracking-wide text-dim">
                {source === "model" ? "Model" : "Template"}
              </span>
            )}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setShowAccounts(!showAccounts)}
            >
              {showAccounts ? "Hide accounts" : "Accounts"}
            </button>
          </div>
        }
      />

      {showAccounts && (
        <div className="mt-5 space-y-2">
          {urls.map((url, i) => (
            <label key={i} className="block text-xs text-dim" htmlFor={`${fieldId}-url-${i}`}>
              <span className="sr-only">Account {i + 1}</span>
              <input
                id={`${fieldId}-url-${i}`}
                className="w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 font-mono text-xs text-light"
                value={url}
                spellCheck={false}
                placeholder={`https://www.linkedin.com/in/… (${i + 1} of ${COMPETITOR_URL_SLOTS})`}
                onChange={(e) =>
                  setUrls((prev) => prev.map((v, j) => (j === i ? e.target.value.slice(0, 300) : v)))
                }
              />
            </label>
          ))}
          <button type="button" className="btn btn-ghost btn-sm" onClick={saveUrls}>
            {savedUrls ? "Saved" : "Save accounts"}
          </button>
        </div>
      )}

      {/* Log form */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-account`}>
          Account
          <input
            id={`${fieldId}-account`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.account}
            placeholder="Who posted it"
            onChange={(e) => setDraft({ ...draft, account: e.target.value.slice(0, 80) })}
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-date`}>
          Post date
          <input
            id={`${fieldId}-date`}
            type="date"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.date}
            onChange={(e) => setDraft({ ...draft, date: e.target.value })}
          />
        </label>
        <label className="block text-xs text-dim lg:col-span-2" htmlFor={`${fieldId}-hook`}>
          Hook
          <input
            id={`${fieldId}-hook`}
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.hook}
            placeholder="The first line of their post"
            onChange={(e) => setDraft({ ...draft, hook: e.target.value.slice(0, 400) })}
          />
        </label>
        <label className="block text-xs text-dim" htmlFor={`${fieldId}-impressions`}>
          Impressions (optional)
          <input
            id={`${fieldId}-impressions`}
            inputMode="numeric"
            className="mt-1 w-full rounded-lg border border-white/10 bg-slate-surface px-3 py-2 text-sm text-light"
            value={draft.impressions}
            placeholder="estimate"
            onChange={(e) => setDraft({ ...draft, impressions: e.target.value })}
          />
        </label>
        <div className="text-xs text-dim sm:col-span-2 lg:col-span-3">
          Topic tags
          <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Topic tags">
            {COMPETITOR_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={draft.tags.includes(tag)}
                className={
                  draft.tags.includes(tag) ? "btn btn-primary btn-sm" : "btn btn-ghost btn-sm"
                }
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn btn-primary btn-sm" onClick={logPost}>
          Log competitor post
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={analyse}
          disabled={loading || log.length === 0}
        >
          {loading ? "Reading" : "Analyse patterns"}
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => {
            setLog([]);
            setAnalysis(null);
            setSource(null);
          }}
          disabled={log.length === 0}
        >
          Clear log
        </button>
        <span className="text-xs text-dim">
          {log.length} of {COMPETITOR_LOG_MAX} logged · stays in this browser
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-crimson">
          {error}
        </p>
      )}

      {log.length > 0 && (
        <div className="mt-5 max-h-72 overflow-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-3xs uppercase tracking-wide text-dim">
                <th className="pb-2 pr-3 font-medium">Account</th>
                <th className="pb-2 pr-3 font-medium">Date</th>
                <th className="pb-2 pr-3 font-medium">Hook</th>
                <th className="pb-2 pr-3 font-medium">Tags</th>
                <th className="pb-2 text-right font-medium">Impr.</th>
              </tr>
            </thead>
            <tbody>
              {log.map((post) => (
                <tr key={post.id} className="border-b border-white/5">
                  <td className="py-2 pr-3 whitespace-nowrap text-light">{post.account || "—"}</td>
                  <td className="py-2 pr-3 whitespace-nowrap text-dim">{post.date || "—"}</td>
                  <td className="max-w-80 py-2 pr-3 text-dim">
                    <span className="line-clamp-2">{post.hook}</span>
                  </td>
                  <td className="py-2 pr-3 font-mono text-3xs text-cyan">
                    {post.tags.join(" · ") || "—"}
                  </td>
                  <td className="score-numeral py-2 text-right text-dim">
                    {post.impressions === undefined ? "—" : post.impressions.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {analysis && (
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          <div>
            <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
              What is working for them
            </p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-dim">
              {analysis.patterns.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden style={{ color: COLORS.amber }}>
                    →
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
              Gaps you can own
            </p>
            <ul className="mt-2 space-y-2 text-xs leading-relaxed text-dim">
              {analysis.gaps.map((line) => (
                <li key={line} className="flex gap-2">
                  <span aria-hidden style={{ color: COLORS.emerald }}>
                    →
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-3xs font-semibold uppercase tracking-wide text-dim">
              Your next 3 posts
            </p>
            <ul className="mt-2 space-y-1.5">
              {analysis.recommendations.map((line) => (
                <li key={line}>
                  {/* A full navigation on purpose: the studio reads its prefill
                      from the query string on mount. */}
                  <a
                    href={`/admin/marketing?studio_topic=${encodeURIComponent(line)}&studio_tone=authority`}
                    className="glass-hover block rounded-lg border border-white/5 px-3 py-2 text-xs text-light"
                  >
                    {line}
                    <span className="ml-2 text-3xs text-cyan">Write it →</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
